const express = require('express')
const supabase = require('../config/supabase')
const verificarToken = require('../middleware/auth')
const authorize      = require('../middleware/authorize')

function validarFotoUrl(url){
  if (!url) return true
  try {
    const parsed = new URL(url)
    const dominiosPermitidos = [
      'supabase.co',
      'supabase.in',
      'proyect-dom-farmerhand.vercel.app'
 ]
  return (
    ['https:'].includes(parsed.protocol) && dominiosPermitidos.some(d => parsed.hostname.endsWith(d))
  )
} catch {
  return false
}
  }


const router = express.Router()

// POST /api/productos
router.post('/', verificarToken, authorize('agricultor'), async (req, res) => {
  const { nombre, descripcion, precio_por_kg, categoria, tiempo_envio, envio_refrigerado } = req.body

  if (!nombre || !precio_por_kg) {
    return res.status(400).json({ error: 'Nombre y precio por kg son obligatorios' })
  }

  if (typeof nombre !== 'string' || nombre.trim().length > 100) {
    return res.status(400).json({ error: 'Nombre inválido (máximo 100 caracteres)' })
  }

  if (req.body.foto_url && !validarFotoUrl(req.body.foto_url)) {
    return res.status(400).json({error: 'URL de imagen no permitida'})  
  }

  const precioNum = Number(precio_por_kg)
  if (isNaN(precioNum) || precioNum <= 0 || precioNum > 9999) {
    return res.status(400).json({ error: 'El precio por kg debe ser un número entre 0 y 9999' })
  }

  const { data: agricultor } = await supabase
    .from('agricultores')
    .select('id, estado')
    .eq('usuario_id', req.usuario.id)
    .maybeSingle()

  if (!agricultor || agricultor.estado !== 'aprobado') {
    return res.status(403).json({ error: 'Tu perfil de agricultor no esta aprobado' })
  }

  const { data, error } = await supabase
    .from('productos')
    .insert([{
      agricultor_id: agricultor.id,
      nombre,
      descripcion,
      precio_por_kg,
      categoria,
      tiempo_envio,
      envio_refrigerado: envio_refrigerado || false,
      disponible: true
    }])
    .select()

  if (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }

  res.status(201).json({ mensaje: 'Producto creado correctamente', producto: data[0] })
})

// GET /api/productos
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('productos')
    .select('*, agricultores (nombre_finca, localizacion, valoracion_media)')
    .eq('disponible', true)

  if (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }

  res.json(data)
})

// GET /api/productos/mis-productos
router.get('/mis-productos', verificarToken, authorize('agricultor'), async (req, res) => {
  const { data: agricultor } = await supabase
    .from('agricultores')
    .select('id')
    .eq('usuario_id', req.usuario.id)
    .maybeSingle()

  if (!agricultor) {
    return res.status(404).json({ error: 'No tienes perfil de agricultor' })
  }

  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('agricultor_id', agricultor.id)

  if (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }

  res.json(data)
})

// PATCH /api/productos/:id

router.patch('/:id', verificarToken, authorize('agricultor'), async (req, res) => {
  const { id } = req.params

  // Verificar que el agricultor sea dueño del producto
  const { data: agricultor } = await supabase
    .from('agricultores')
    .select('id')
    .eq('usuario_id', req.usuario.id)
    .maybeSingle()

  if (!agricultor) {
    return res.status(403).json({ error: 'No tienes perfil de agricultor' })
  }

  const { data: producto } = await supabase
    .from('productos')
    .select('id')
    .eq('id', id)
    .eq('agricultor_id', agricultor.id)
    .maybeSingle()

  if (!producto) {
    return res.status(403).json({ error: 'No tienes permiso para editar este producto' })
  }
  if (req.body.foto_url && !validarFotoUrl(req.body.foto_url)) {
    return res.status(400).json({ error: 'URL de imagen no permitida'})
  }

  // Filtrar solo los campos que el agricultor puede editar
  const { nombre, descripcion, precio_por_kg, categoria, tiempo_envio, envio_refrigerado, disponible } = req.body
  const campos = Object.fromEntries(
    Object.entries({ nombre, descripcion, precio_por_kg, categoria, tiempo_envio, envio_refrigerado, disponible })
      .filter(([_, v]) => v !== undefined)
  )

  // Actualizar en Supabase solo los campos válidos
  const { data, error } = await supabase
    .from('productos')
    .update(campos)
    .eq('id', id)
    .select('id,nombre,precio_por_kg,descripcion,categoria,tiempo_envio,envio_refrigerado,disponible')

  if (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }

  res.json({ mensaje: 'Producto actualizado', producto: data[0] })
})
// DELETE /api/productos/:id
router.delete('/:id', verificarToken, authorize('agricultor'), async (req, res) => {
  const { id } = req.params

  const { data: agricultor } = await supabase
    .from('agricultores')
    .select('id')
    .eq('usuario_id', req.usuario.id)
    .maybeSingle()

  if (!agricultor) {
    return res.status(403).json({ error: 'No tienes perfil de agricultor' })
  }

  const { data: producto } = await supabase
    .from('productos')
    .select('id')
    .eq('id', id)
    .eq('agricultor_id', agricultor.id)
    .maybeSingle()

  if (!producto) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este producto' })
  }

  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)

  if (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }

  res.json({ mensaje: 'Producto eliminado correctamente' })
})

// POST /api/productos/:id/cajas
router.post('/:id/cajas', verificarToken, authorize('agricultor'), async (req, res) => {
  const { id } = req.params
  const { kg, precio_total, descuento } = req.body

  if (!kg || !precio_total) {
    return res.status(400).json({ error: 'kg y precio total son obligatorios' })
  }

  const kgNum = Number(kg)
  const precioNum = Number(precio_total)
  const descuentoNum = Number(descuento ?? 0)

  if (isNaN(kgNum) || kgNum <= 0 || kgNum > 999) {
    return res.status(400).json({ error: 'El peso debe ser un número entre 0 y 999 kg' })
  }

  if (isNaN(precioNum) || precioNum <= 0 || precioNum > 9999) {
    return res.status(400).json({ error: 'El precio total debe ser un número entre 0 y 9999' })
  }

  if (isNaN(descuentoNum) || descuentoNum < 0 || descuentoNum > 100) {
    return res.status(400).json({ error: 'El descuento debe estar entre 0 y 100' })
  }

  const { data: agricultor } = await supabase
    .from('agricultores')
    .select('id')
    .eq('usuario_id', req.usuario.id)
    .maybeSingle()

  if (!agricultor) {
    return res.status(403).json({ error: 'No tienes perfil de agricultor' })
  }

  const { data: producto } = await supabase
    .from('productos')
    .select('id')
    .eq('id', id)
    .eq('agricultor_id', agricultor.id)
    .maybeSingle()

  if (!producto) {
    return res.status(403).json({ error: 'No tienes permiso para editar este producto' })
  }

  const { data, error } = await supabase
    .from('opciones_caja')
    .insert([{ producto_id: id, kg, precio_total, descuento: descuento || 0 }])
    .select()

  if (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }

  res.status(201).json({ mensaje: 'Opcion de caja añadida', caja: data[0] })
})

// GET /api/productos/:id/cajas
router.get('/:id/cajas', async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('opciones_caja')
    .select('*')
    .eq('producto_id', id)

  if (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }

  res.json(data)
})


// DELETE /api/productos/:id/cajas  (borra todas las cajas del producto)
  router.delete('/:id/cajas', verificarToken, authorize('agricultor'), async (req, res) => {
    const { id } = req.params

    const { data: agricultor } = await supabase
      .from('agricultores')
      .select('id')
      .eq('usuario_id', req.usuario.id)
      .maybeSingle()

    if (!agricultor) return res.status(403).json({ error: 'No tienes perfil de agricultor' })

    const { data: producto } = await supabase
      .from('productos')
      .select('id')
      .eq('id', id)
      .eq('agricultor_id', agricultor.id)
      .maybeSingle()

    if (!producto) return res.status(403).json({ error: 'No tienes permiso para editar este producto' })

    const { error } = await supabase
      .from('opciones_caja')
      .delete()
      .eq('producto_id', id)

    if (error) return res.status(400).json({ error: error.message })

    res.json({ mensaje: 'Cajas eliminadas' })
  })




module.exports = router