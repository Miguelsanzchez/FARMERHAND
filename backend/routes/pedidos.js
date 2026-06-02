const express = require('express')
const supabase = require('../config/supabase')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const verificarToken = require('../middleware/auth')
const authorize = require('../middleware/authorize')

const router = express.Router()

// ─────────────────────────────────────────────
// POST /api/pedidos (FLUJO ÚNICO FINAL)
// ─────────────────────────────────────────────
router.post('/', verificarToken, authorize('consumidor', 'agricultor'), async (req, res) => {
  try {
    const { direccion_envio, items, stripe_payment_id } = req.body || {}

    if (!direccion_envio || !items || !items.length) {
      return res.status(400).json({ error: 'Dirección de envío e items son obligatorios' })
    }

    if (!stripe_payment_id) {
      return res.status(400).json({ error: 'stripe_payment_id es obligatorio' })
    }

    // ── Verificar pago en Stripe ─────────────────────────────
    let paymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(stripe_payment_id)
    } catch (err) {
      return res.status(400).json({ error: 'stripe_payment_id inválido o no encontrado en Stripe' })
    }

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: `El pago no está confirmado (estado Stripe: ${paymentIntent.status})`
      })
    }

    // ── Evitar duplicados ─────────────────────────────────────
    const { data: pedidoExistente } = await supabase
      .from('pedidos')
      .select('id')
      .eq('stripe_payment_id', stripe_payment_id)
      .maybeSingle()

    if (pedidoExistente) {
      return res.status(409).json({ error: 'Este pago ya fue procesado anteriormente' })
    }

    // ── Calcular totales ──────────────────────────────────────
    const total = items.reduce((sum, i) => sum + i.precio_unidad * i.cantidad, 0)
    const comision = parseFloat((total * 0.05).toFixed(2))

    // ── Crear pedido ──────────────────────────────────────────
    const { data: pedido, error: errorPedido } = await supabase
      .from('pedidos')
      .insert([{
        consumidor_id: req.usuario.id,
        total,
        comision,
        estado: 'confirmado', // antes 'pagado'
        direccion_envio,
        stripe_payment_id
      }])
      .select()
      .single()

    if (errorPedido) {
      return res.status(400).json({ error: errorPedido.message })
    }

    // ── Crear líneas de pedido ────────────────────────────────
    const lineas = items.map(i => ({
      pedido_id: pedido.id,
      producto_id: i.producto_id,
      opcion_caja_id: i.opcion_caja_id || null,
      agricultor_id: i.agricultor_id,
      cantidad: i.cantidad,
      precio_unidad: i.precio_unidad
    }))

    const { error: errorLineas } = await supabase
      .from('lineas_pedido')
      .insert(lineas)

    if (errorLineas) {
      return res.status(400).json({ error: errorLineas.message })
    }

    console.log('✔ Pedido creado:', pedido.id)

    res.status(201).json({
      mensaje: 'Pedido creado correctamente',
      pedido
    })

  } catch (err) {
    console.error('Error en POST /api/pedidos:', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})


// ─────────────────────────────────────────────
// GET /api/pedidos/mis-pedidos
// ─────────────────────────────────────────────
router.get('/mis-pedidos', verificarToken, authorize('consumidor', 'agricultor'), async (req, res) => {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, lineas_pedido(*, productos(nombre))')
    .eq('consumidor_id', req.usuario.id)
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })

  res.json(data)
})


// ─────────────────────────────────────────────
// GET /api/pedidos/recibidos (agricultor)
// ─────────────────────────────────────────────
router.get('/recibidos', verificarToken, authorize('agricultor'), async (req, res) => {

  const { data: agricultor } = await supabase
    .from('agricultores')
    .select('id')
    .eq('usuario_id', req.usuario.id)
    .single()

  if (!agricultor) {
    return res.status(404).json({ error: 'No tienes perfil de agricultor' })
  }

  const { data, error } = await supabase
    .from('lineas_pedido')
    .select(`
      *,
      pedidos(estado, direccion_envio, created_at, consumidor_id),
      productos(nombre)
    `)
    .eq('agricultor_id', agricultor.id)
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })

  const consumidorIds = [...new Set(
    data.map(l => l.pedidos?.consumidor_id).filter(Boolean)
  )]

  let usuariosMap = {}

  if (consumidorIds.length) {
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id, nombre, email')
      .in('id', consumidorIds)

    usuariosMap = Object.fromEntries((usuarios || []).map(u => [u.id, u]))
  }

  const resultado = data.map(l => ({
    ...l,
    pedidos: l.pedidos
      ? { ...l.pedidos, usuarios: usuariosMap[l.pedidos.consumidor_id] ?? null }
      : null
  }))

  res.json(resultado)
})


// ─────────────────────────────────────────────
// PATCH /api/pedidos/:id/estado
// ─────────────────────────────────────────────
router.patch('/:id/estado', verificarToken, authorize('agricultor'), async (req, res) => {
  const { id } = req.params
  const { estado } = req.body

  const estadosValidos = ['confirmado', 'enviado', 'entregado']

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({
      error: `Estado no válido. Usa: ${estadosValidos.join(', ')}`
    })
  }

  const { data: agricultor } = await supabase
    .from('agricultores')
    .select('id')
    .eq('usuario_id', req.usuario.id)
    .single()

  if (!agricultor) {
    return res.status(404).json({ error: 'No tienes perfil de agricultor' })
  }

  const { data: linea } = await supabase
    .from('lineas_pedido')
    .select('id')
    .eq('pedido_id', id)
    .eq('agricultor_id', agricultor.id)
    .limit(1)

  if (!linea || linea.length === 0) {
    return res.status(403).json({ error: 'No tienes permiso para actualizar este pedido' })
  }

  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  res.json({ mensaje: 'Estado actualizado', pedido: data })
})

module.exports = router