  import { getUsuario } from './auth.js'
  import { apiFetch } from './api.js'

window.addEventListener('pageshow', e => {
  if (e.persisted && !localStorage.getItem('token')) {
    window.location.replace('/pages/login.html')
  }
})

 function init() {
      const usuario = getUsuario()
      if (!usuario) {
          window.location.replace('/pages/login.html')
          return
      }

      cargarPedidos()
      cargarSolicitud()
      cargarPendientesValorar()   
      initStarsInput()            
  }

  // ── PEDIDOS ──
  async function cargarPedidos() {
      const contenedor = document.getElementById('tablaPedidos')
      contenedor.innerHTML = '<p class="empty-state">Cargando...</p>'

      try {
          const pedidos = await apiFetch('/api/pedidos/mis-pedidos')

          if (!pedidos.length) {
              contenedor.innerHTML = '<p class="empty-state">Aún no has realizado ningún pedido.</p>'
              return
          }

          contenedor.innerHTML = buildTablaPedidos(pedidos)
      } catch (err) {
          contenedor.innerHTML = `<p class="error-state">Error: ${err.message}</p>`
      }
  }

  function buildTablaPedidos(pedidos) {
      const filas = pedidos.map(p => {
          const productos = p.lineas_pedido
              ?.map(l => l.productos?.nombre ?? '—')
              .join(', ') ?? '—'

          return `
              <tr>
                  <td>${new Date(p.created_at).toLocaleDateString('es-ES')}</td>
                  <td>${productos}</td>
                  <td>€${parseFloat(p.total).toFixed(2)}</td>
                  <td>${p.direccion_envio}</td>
                  <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
              </tr>
          `
      }).join('')

      return `
          <table>
              <thead>
                  <tr>
                      <th>Fecha</th>
                      <th>Productos</th>
                      <th>Total</th>
                      <th>Dirección de envío</th>
                      <th>Estado</th>
                  </tr>
              </thead>
              <tbody>${filas}</tbody>
          </table>
      `
  }

  // ── SOLICITUD AGRICULTOR ──
  async function cargarSolicitud() {
      const usuario = getUsuario()
      const esAgricultor = usuario?.rol === 'agricultor'
      if (esAgricultor) {
          const seccion = document.getElementById('seccionSolicitud')?.closest('section')
          if (seccion) seccion.style.display = 'none'
          return
      }

      const contenedor = document.getElementById('seccionSolicitud')
      contenedor.innerHTML = '<p class="empty-state">Cargando...</p>'

      try {
          const solicitud = await apiFetch('/api/agricultores/mi-solicitud')
          contenedor.innerHTML = renderSolicitud(solicitud)

          if (!solicitud || solicitud.estado === 'rechazado') {
              document.getElementById('formSolicitud')
                  ?.addEventListener('submit', enviarSolicitud)
          }
      } catch (err) {
          contenedor.innerHTML = `<p class="error-state">Error: ${err.message}</p>`
      }
  }

  function renderSolicitud(solicitud) {
      if (!solicitud) {
          return `
              <p>Únete como agricultor y empieza a vender tus productos directamente a consumidores.</p>
              ${formSolicitudHTML()}
          `
      }

      if (solicitud.estado === 'pendiente') {
          return `
              <p><span class="badge badge-pendiente">En revisión</span>
              Tu solicitud está siendo revisada por el equipo de FarmerHand.</p>
              <p class="empty-state">Finca: ${solicitud.nombre_finca} · ${solicitud.localizacion}</p>
          `
      }

      if (solicitud.estado === 'rechazado') {
          return `
              <p><span class="badge badge-rechazado">No aprobada</span>
              Tu solicitud anterior no fue aprobada. Puedes volver a solicitarlo.</p>
              ${formSolicitudHTML()}
          `
      }

      return '' // aprobado → ya es agricultor, no debería estar en este panel
  }

  function formSolicitudHTML() {
      return `
          <form id="formSolicitud" style="margin-top:1rem;">
              <div class="input-group">
                  <label for="nombre_finca">Nombre de la finca *</label>
                  <input type="text" id="nombre_finca" required placeholder="Ej: Huerta El Olivo" />
              </div>
              <div class="input-group">
                  <label for="localizacion">Localización *</label>
                  <input type="text" id="localizacion" required placeholder="Ej: Murcia, España" />
              </div>
              <div class="input-group">
                  <label for="descripcion">Descripción (opcional)</label>
                  <textarea id="descripcion" rows="3" placeholder="Cuéntanos sobre tu finca..."></textarea>
              </div>
              <p id="errorSolicitud" class="error-msg" hidden></p>
              <button type="submit" class="btn btn-primary">Enviar solicitud</button>
          </form>
      `
  }

  async function enviarSolicitud(e) {
      e.preventDefault()
      const errorEl = document.getElementById('errorSolicitud')
      const btn = e.target.querySelector('button[type="submit"]')

      const payload = {
          nombre_finca: document.getElementById('nombre_finca').value.trim(),
          localizacion:  document.getElementById('localizacion').value.trim(),
          descripcion:   document.getElementById('descripcion').value.trim()
      }

      btn.disabled = true
      btn.textContent = 'Enviando...'

      try {
          await apiFetch('/api/agricultores/alta', {
              method: 'POST',
              body: JSON.stringify(payload)
          })
          cargarSolicitud() // recargar para mostrar estado "pendiente"
      } catch (err) {
          errorEl.textContent = err.message
          errorEl.hidden = false
          btn.disabled = false
          btn.textContent = 'Enviar solicitud'
      }
  }

   // ── VALORACIONES ──

  async function cargarPendientesValorar() {                                                                                                                  
    const contenedor = document.getElementById('seccionValoraciones')
    contenedor.innerHTML = '<p class="empty-state">Cargando...</p>'                                                                                           
                                                                                                                                                            
    try {                                                                                                                                                     
      const [pedidos, yaValorados] = await Promise.all([                                                                                                    
        apiFetch('/api/pedidos/mis-pedidos'),                                                                                                                 
        apiFetch('/api/valoraciones/mis-valoraciones')
      ])                                                                                                                                                      
                                                                                                                                                              
      const pedidosValorados = new Set(yaValorados)                                                                                                           
      const pendientes = pedidos.filter(p =>                                                                                                                  
        p.estado === 'entregado' && !pedidosValorados.has(p.id)                                                                                               
      )                                                                                                                                                       
                                          
      if (!pendientes.length) {                                                                                                                               
        contenedor.innerHTML = '<p class="empty-state">No tienes pedidos pendientes de valorar.</p>'                                                          
        return                                
      }                                                                                                                                                       
                                                                                                                                                            
      contenedor.innerHTML = `                                                                                                                                
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${pendientes.map(p => {                                                                                                                             
            const agricultorId = p.lineas_pedido?.[0]?.agricultor_id ?? ''                                                                                  
            const productos = p.lineas_pedido?.map(l => l.productos?.nombre ?? '—').join(', ') ?? '—'
            const fecha = new Date(p.created_at).toLocaleDateString('es-ES')                                                                                  
            return `                          
              <div style="display:flex;justify-content:space-between;align-items:center;                                                                      
                padding:12px 16px;background:#f9fdf6;border:1px solid #e0edd8;border-radius:8px;">                                                            
                <div>                                                                                                                                         
                  <span style="font-size:14px;color:#333;font-weight:600;">${fecha}</span>                                                                    
                  <span style="font-size:13px;color:#666;margin-left:10px;">${productos}</span>                                                               
                </div>                                                                                                                                        
                <button class="btn btn-secondary btn-sm btn-valorar"                                                                                          
                  data-pedido="${p.id}"                                                                                                                       
                  data-agricultor="${agricultorId}"                                                                                                           
                  data-titulo="Pedido del ${fecha}">⭐ Valorar</button>                                                                                       
              </div>`                                                                                                                                         
          }).join('')}                                                                                                                                      
        </div>`                                                                                                                                               
                                                                                                                                                              
      contenedor.querySelectorAll('.btn-valorar').forEach(btn =>                                                                                              
        btn.addEventListener('click', () =>                                                                                                                   
          abrirModalValoracion(btn.dataset.pedido, btn.dataset.agricultor, btn.dataset.titulo)                                                              
        )                                                                                                                                                     
      )                                   
    } catch (err) {                                                                                                                                           
      contenedor.innerHTML = `<p class="error-state">Error: ${err.message}</p>`                                                                               
    }                                         
  }                                                                                                                                                           
                                                                                                                                                            
  function abrirModalValoracion(pedidoId, agricultorId, titulo) {                                                                                             
    document.getElementById('valoracionPedidoId').value = pedidoId
    document.getElementById('valoracionAgricultorId').value = agricultorId                                                                                    
    document.getElementById('valoracionTitulo').textContent = titulo                                                                                        
    document.getElementById('valoracionPuntuacion').value = ''
    document.getElementById('valoracionComentario').value = ''
    document.getElementById('valoracionError').style.display = 'none'
    document.querySelectorAll('#starsInput span').forEach(s => {
      s.classList.remove('active')
      s.textContent = '☆'
    })
    const btnSubmit = document.querySelector('#formValoracion button[type="submit"]')
    if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = 'Enviar valoración' }
    document.getElementById('modalValoracion').classList.add('active')                                                                                        
  }                                           
                                                                                                                                                              
   function initStarsInput() {
    const spans    = document.querySelectorAll('#starsInput span')
    const input    = document.getElementById('valoracionPuntuacion')
    const modal    = document.getElementById('modalValoracion')
    const btnCerrar = document.getElementById('btnCerrarValoracion')
    const form     = document.getElementById('formValoracion')

    if (!spans.length || !input || !modal || !btnCerrar || !form) {
      console.warn('initStarsInput: elementos del modal no encontrados')
      return
    }

    function pintar(valor) {
      spans.forEach(s => {
        const activa = parseInt(s.dataset.val) <= valor
        s.classList.toggle('active', activa)
        s.textContent = activa ? '★' : '☆'
      })
    }

    spans.forEach(span => {
      span.addEventListener('click', () => {
        input.value = span.dataset.val
        pintar(parseInt(span.dataset.val))
      })
      span.addEventListener('mouseover', () => {
        pintar(parseInt(span.dataset.val))
      })
      span.addEventListener('mouseout', () => {
        pintar(parseInt(input.value) || 0)
      })
    })

    btnCerrar.addEventListener('click', () => modal.classList.remove('active'))

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active')
    })

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const pedidoId     = document.getElementById('valoracionPedidoId').value
      const agricultorId = document.getElementById('valoracionAgricultorId').value
      const puntuacion   = parseInt(input.value)
      const comentario   = document.getElementById('valoracionComentario').value.trim()
      const errorEl      = document.getElementById('valoracionError')
      const btn          = e.target.querySelector('button[type="submit"]')

      if (!puntuacion) {
        errorEl.textContent = 'Selecciona una puntuación.'
        errorEl.style.display = 'block'
        return
      }

      btn.disabled = true
      btn.textContent = 'Enviando...'

      try {
        await apiFetch('/api/valoraciones', {
          method: 'POST',
          body: JSON.stringify({ agricultor_id: agricultorId, pedido_id: pedidoId, puntuacion, comentario })
        })
        modal.classList.remove('active')
        cargarPendientesValorar()
      } catch (err) {
        errorEl.textContent = err.message
        errorEl.style.display = 'block'
        btn.disabled = false
        btn.textContent = 'Enviar valoración'
      }
    })
  }
        document.addEventListener('DOMContentLoaded', init)