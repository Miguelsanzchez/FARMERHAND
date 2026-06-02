const express = require('express')
  const supabase = require('../config/supabase')
  const verificarToken = require('../middleware/auth')
  const authorize      = require('../middleware/authorize')

  const router = express.Router()

  // POST /api/agricultores/alta — solo consumidor o agricultor pueden solicitar
  router.post('/alta', verificarToken, authorize('consumidor', 'agricultor'), async (req, res) => {

      if (req.usuario.rol === 'agricultor') {
          return res.status(400).json({ error: 'Ya eres agricultor' })
      }

      const { nombre_finca, localizacion, descripcion, certificacion, foto_url, zonas_envio } = req.body

      if (!nombre_finca?.trim() || !localizacion?.trim()) {
          return res.status(400).json({ error: 'El nombre de la finca y localización son obligatorios' })
      }

      if (zonas_envio !== undefined && !Array.isArray(zonas_envio)) {
          return res.status(400).json({ error: 'zonas_envio debe ser un array' })
      }

      // Comprobar solicitud existente
      const { data: existing } = await supabase
          .from('agricultores')
          .select('id, estado')
          .eq('usuario_id', req.usuario.id)
          .maybeSingle()

      if (existing?.estado === 'aprobado') {
          return res.status(400).json({ error: 'Ya eres agricultor aprobado' })
      }
      if (existing?.estado === 'pendiente') {
          return res.status(400).json({ error: 'Ya tienes una solicitud pendiente de revisión' })
      }

      const payload = {
          nombre_finca,
          localizacion,
          descripcion,
          certificacion: certificacion || false,
          foto_url,
          zonas_envio,
          estado: 'pendiente'
      }

      let data, error

      if (existing?.estado === 'rechazado') {
          // Reutilizar fila rechazada en lugar de crear duplicado
          ;({ data, error } = await supabase
              .from('agricultores')
              .update(payload)
              .eq('id', existing.id)
              .select())
      } else {
          ;({ data, error } = await supabase
              .from('agricultores')
              .insert([{ usuario_id: req.usuario.id, ...payload }])
              .select())
      }

      if (error) return res.status(400).json({ error: error.message })

      res.status(201).json({ mensaje: 'Solicitud enviada correctamente', agricultor: data[0] })
  })

  // GET /api/agricultores/mi-solicitud
  router.get('/mi-solicitud', verificarToken, async (req, res) => {
      const { data, error } = await supabase
          .from('agricultores')
          .select('id, estado, nombre_finca, localizacion, created_at')
          .eq('usuario_id', req.usuario.id)
          .maybeSingle()

      if (error) return res.status(500).json({ error: error.message })
      res.json(data) // null si no hay solicitud
  })

  // GET /api/agricultores — lista pública de agricultores aprobados
  router.get('/', async (req, res) => {
      const { data, error } = await supabase
          .from('agricultores')
          .select('*')
          .eq('estado', 'aprobado')

      if (error) return res.status(400).json({ error: error.message })
      res.json(data)
  })

  module.exports = router