 const express = require('express')      
  const supabase = require('../config/supabase')                                                                                                              
  const verificarToken = require('../middleware/auth')
  const authorize      = require('../middleware/authorize')                                                                                                         
                                                                                                                                                              
  const router = express.Router()                                                                                                                           
                                                                                                                                                              
  // POST /api/valoraciones                                                                                                                                   
  router.post('/', verificarToken, authorize('consumidor', 'agricultor'), async (req, res) => {                                                                          
    const { agricultor_id, pedido_id, puntuacion, comentario } = req.body                                                                                     
                                                                                                                                                            
    if (!agricultor_id || !pedido_id || !puntuacion || puntuacion < 1 || puntuacion > 5) {
      return res.status(400).json({ error: 'agricultor_id, pedido_id y puntuacion (1-5) son obligatorios' })
    }                                                                                                                                                         
                                                                                                                                                              
    // Verificar que el pedido pertenece al consumidor y está entregado                                                                                       
    const { data: pedido } = await supabase                                                                                                                   
      .from('pedidos')                                                                                                                                      
      .select('id, estado')                                                                                                                                   
      .eq('id', pedido_id)                                                                                                                                  
      .eq('consumidor_id', req.usuario.id)                                                                                                                    
      .maybeSingle()                                                                                                                                        
                                                                                                                                                              
    if (!pedido) return res.status(403).json({ error: 'Pedido no encontrado' })
    if (pedido.estado !== 'entregado') return res.status(400).json({ error: 'Solo puedes valorar pedidos entregados' })                                       
                                                                                                                                                            
    // Verificar no duplicado                                                                                                                                 
    const { data: existente } = await supabase
      .from('valoraciones')                                                                                                                                   
      .select('id')                                                                                                                                         
      .eq('consumidor_id', req.usuario.id)                                                                                                                    
      .eq('pedido_id', pedido_id)                                                                                                                             
      .maybeSingle()
                                                                                                                                                              
    if (existente) return res.status(409).json({ error: 'Ya has valorado este pedido' })                                                                    

    // Insertar                                                                                                                                               
    const { data, error } = await supabase
      .from('valoraciones')                                                                                                                                   
      .insert([{                                                                                                                                            
        consumidor_id: req.usuario.id,
        agricultor_id,                                                                                                                                        
        pedido_id,
        puntuacion,                                                                                                                                           
        comentario: comentario || null                                                                                                                      
      }])                                     
      .select()                           
      .single()
                                                                                                                                                              
    if (error) return res.status(400).json({ error: error.message })
                                                                                                                                                              
    // Actualizar valoracion_media del agricultor                                                                                                           
    const { data: vals } = await supabase 
      .from('valoraciones')
      .select('puntuacion')                                                                                                                                   
      .eq('agricultor_id', agricultor_id)
                                                                                                                                                              
    if (vals?.length) {                                                                                                                                     
      const media = vals.reduce((s, v) => s + v.puntuacion, 0) / vals.length
      await supabase                                                                                                                                          
        .from('agricultores')             
        .update({ valoracion_media: parseFloat(media.toFixed(2)) })                                                                                           
        .eq('id', agricultor_id)                                                                                                                              
    }                                         
                                                                                                                                                              
    res.status(201).json({ mensaje: 'Valoración enviada', valoracion: data })                                                                               
  })                                                                                                                                                          
   
  // GET /api/valoraciones/mis-valoraciones — pedido_ids ya valorados                                                                                         
  router.get('/mis-valoraciones', verificarToken, authorize('consumidor', 'agricultor'), async (req, res) => {                                                         
    const { data, error } = await supabase    
      .from('valoraciones')                                                                                                                                   
      .select('pedido_id')
      .eq('consumidor_id', req.usuario.id)                                                                                                                    
                                                                                                                                                            
    if (error) return res.status(400).json({ error: error.message })                                                                                          
    res.json((data ?? []).map(v => v.pedido_id))                                                                                                              
  })                                          
                                                                                                                                                              
  module.exports = router                                                                                                                                   
                                                                 