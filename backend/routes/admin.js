const express    = require('express')
  const supabase   = require('../config/supabase')
  const verificarToken = require('../middleware/auth')
  const authorize      = require('../middleware/authorize')
                                                                                                                                                            
  const router = express.Router()                                                                                                                           
                                                                                                                                                            
  // ── Helpers Supabase ──────────────────────────────────────                                                                                             
  function safeCount(result, nombre) {                                                                                                                    
    if (result.error) console.error(`[admin/${nombre}]`, result.error.message)                                                                              
    return result.count ?? 0                                                                                                                                
  }
                                                                                                                                                            
  function safeData(result, nombre) {                                                                                                                     
    if (result.error) console.error(`[admin/${nombre}]`, result.error.message)
    return result.data ?? []
  }                                                                                                                                                         
   
  // ── GET /api/admin/metricas ───────────────────────────────                                                                                             
  router.get('/metricas', verificarToken, authorize('admin'), async (req, res) => {                                                                    
    try {
      const [rUsuarios, rAgricultores, rPedidos, rSolicitudes, rPagados] = await Promise.all([                                                              
        supabase.from('usuarios').select('*', { count: 'exact', head: true }),
        supabase.from('agricultores').select('*', { count: 'exact', head: true }).eq('estado', 'aprobado'),                                                 
        supabase.from('pedidos').select('*', { count: 'exact', head: true }),                                                                             
        supabase.from('agricultores').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),                                                
        supabase.from('pedidos').select('total').eq('estado', 'pagado')
      ])                                                                                                                                                    
                                                                                                                                                          
      const pagados        = safeData(rPagados, 'pagados')                                                                                                  
      const ingresos_totales = pagados.reduce((sum, p) => sum + Number(p.total ?? 0), 0)                                                                  
                                                                                                                                                            
      res.json({                                                                                                                                          
        total_usuarios:         safeCount(rUsuarios,      'usuarios'),
        total_agricultores:     safeCount(rAgricultores,  'agricultores'),                                                                                  
        total_pedidos:          safeCount(rPedidos,       'pedidos'),
        ingresos_totales:       parseFloat(ingresos_totales.toFixed(2)),                                                                                    
        solicitudes_pendientes: safeCount(rSolicitudes,   'solicitudes')                                                                                  
      })                                                                                                                                                    
    } catch (err) {
      console.error('[admin/metricas] error crítico:', err.message)                                                                                         
      res.status(500).json({ error: 'Error al obtener métricas' })                                                                                        
    }                                                                                                                                                       
  })                                                                                                                                                      
                                                                                                                                                            
  // ── GET /api/admin/solicitudes ────────────────────────────
  router.get('/solicitudes', verificarToken, authorize('admin'), async (req, res) => {                                                                   
    const { data, error } = await supabase                                                                                                                
      .from('agricultores')                                                                                                                                 
      .select('*, usuarios(nombre, email)')
      .eq('estado', 'pendiente')                                                                                                                            
                                                                                                                                                            
    if (error) return res.status(400).json({ error: error.message })
    res.json(data ?? [])                                                                                                                                    
  })                                                                                                                                                        
                                          
  // ── PATCH /api/admin/solicitudes/:id ─────────────────────                                                                                              
  router.patch('/solicitudes/:id', verificarToken, authorize('admin'), async (req, res) => {                                                             
    const { id }     = req.params             
    const { estado } = req.body                                                                                                                             
                                                                                                                                                          
    if (!['aprobado', 'rechazado'].includes(estado)) {                                                                                                      
      return res.status(400).json({ error: 'Estado debe ser aprobado o rechazado' })
    }                                                                                                                                                       
                                                                                                                                                            
    const { data, error } = await supabase
      .from('agricultores')                                                                                                                                 
      .update({ estado })                                                                                                                                 
      .eq('id', id)                                                                                                                                         
      .select()                                                                                                                                           
                                          
    if (error)               return res.status(400).json({ error: error.message })
    if (!data || !data.length) return res.status(404).json({ error: 'Solicitud no encontrada' })                                                            
                                              
    if (estado === 'aprobado') {                                                                                                                            
      const { error: errorRol } = await supabase                                                                                                          
        .from('usuarios')                                                                                                                                   
        .update({ rol: 'agricultor' })    
        .eq('id', data[0].usuario_id)                                                                                                                       
                                                                                                                                                            
      if (errorRol) {
        return res.status(500).json({ error: 'Aprobado pero rol no actualizado: ' + errorRol.message })                                                     
      }                                                                                                                                                   
    }                                                                                                                                                       
                                                                                                                                                          
    res.json({ mensaje: `Solicitud ${estado} correctamente`, agricultor: data[0] })                                                                         
  })                                      
                                                                                                                                                            
  // ── GET /api/admin/usuarios ───────────────────────────────                                                                                             
  router.get('/usuarios', verificarToken, authorize('admin'), async (req, res) => {
    const { data, error } = await supabase                                                                                                                  
      .from('usuarios')                                                                                                                                     
      .select('id, nombre, email, rol, created_at')
      .order('created_at', { ascending: false })                                                                                                            
                                                                                                                                                          
    if (error) return res.status(400).json({ error: error.message })
    res.json(data ?? [])                                                                                                                                    
  })                                          
                                                                                                                                                            
  module.exports = router                                                              