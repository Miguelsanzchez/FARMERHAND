import { getUsuario } from './auth.js'
  import { apiFetch } from './api.js'

window.addEventListener('pageshow', e => {
  if (e.persisted && !localStorage.getItem('token')) {
    window.location.replace('/pages/login.html')
  }
})

  function init() {
      const usuario = getUsuario()
      if (!usuario || usuario.rol !== 'admin') {
          window.location.replace('/pages/login.html')
          return
      }

      cargarMetricas()
      cargarSolicitudes()
      cargarUsuarios()
  }
async function cargarMetricas() {
      try {                                                                                                                                                    
          const m = await apiFetch('/api/admin/metricas')                                                                                                            

          document.getElementById('m-usuarios').textContent     = m.total_usuarios                                                                             
          document.getElementById('m-agricultores').textContent = m.total_agricultores
          document.getElementById('m-pedidos').textContent      = m.total_pedidos                                                                              
          document.getElementById('m-ingresos').textContent     = `€${Number(m.ingresos_totales).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`       
          document.getElementById('m-solicitudes').textContent  = m.solicitudes_pendientes
                                                                                                                                                               
          if (m.solicitudes_pendientes > 0) {                                                                                                                
              document.getElementById('card-solicitudes').style.borderTopColor = '#e53935'                                                                     
          }
      } catch (err) {                                                                                                                                          
          console.error('[métricas] ERROR:', err)                                                                                                            
          // Muestra el error en el panel directamente                                                                                                         
          document.querySelectorAll('.metrica-valor').forEach(el => el.textContent = '!')                                                                    
          document.getElementById('m-usuarios').textContent = err.message
      }                                                                                                                                                        
  }

  async function cargarSolicitudes() {
      const contenedor = document.getElementById('tablaSolicitudes')
      contenedor.innerHTML = '<p class="empty-state">Cargando...</p>'

      try {
          const solicitudes = await apiFetch('/api/admin/solicitudes')

          if (!solicitudes.length) {
              contenedor.innerHTML = '<p class="empty-state">No hay solicitudes pendientes.</p>'
              return
          }

          contenedor.innerHTML = buildTablaSolicitudes(solicitudes)

          contenedor.querySelectorAll('.btn-aprobar').forEach(btn =>
              btn.addEventListener('click', () => gestionarSolicitud(btn.dataset.id, 'aprobado'))
          )
          contenedor.querySelectorAll('.btn-rechazar').forEach(btn =>
              btn.addEventListener('click', () => gestionarSolicitud(btn.dataset.id, 'rechazado'))
          )
      } catch (err) {
          contenedor.innerHTML = `<p class="error-state">Error: ${err.message}</p>`
      }
  }

  function buildTablaSolicitudes(solicitudes) {
      const filas = solicitudes.map(s => `
          <tr>
              <td>${s.usuarios?.nombre ?? '—'}</td>
              <td>${s.usuarios?.email ?? '—'}</td>
              <td>${s.nombre_finca ?? '—'}</td>
              <td>${s.localizacion ?? '—'}</td>
              <td><span class="badge badge-pendiente">pendiente</span></td>
              <td>
                  <button class="btn-aprobar" data-id="${s.id}">Aprobar</button>
                  <button class="btn-rechazar" data-id="${s.id}">Rechazar</button>
              </td>
          </tr>
      `).join('')

      return `
          <table>
              <thead>
                  <tr>
                      <th>Nombre</th><th>Email</th><th>Finca</th>
                      <th>Localización</th><th>Estado</th><th>Acciones</th>
                  </tr>
              </thead>
              <tbody>${filas}</tbody>
          </table>
      `
  }

  async function gestionarSolicitud(id, estado) {
      try {
          await apiFetch(`/api/admin/solicitudes/${id}`, {
              method: 'PATCH',
              body: JSON.stringify({ estado })
          })
          cargarMetricas()
          cargarSolicitudes()
          cargarUsuarios()
      } catch (err) {
          alert(`Error: ${err.message}`)
      }
  }

  async function cargarUsuarios() {
      const contenedor = document.getElementById('tablaUsuarios')
      contenedor.innerHTML = '<p class="empty-state">Cargando...</p>'

      try {
          const usuarios = await apiFetch('/api/admin/usuarios')

          if (!usuarios.length) {
              contenedor.innerHTML = '<p class="empty-state">No hay usuarios registrados.</p>'
              return
          }

          contenedor.innerHTML = buildTablaUsuarios(usuarios)
      } catch (err) {
          contenedor.innerHTML = `<p class="error-state">Error: ${err.message}</p>`
      }
  }

  function buildTablaUsuarios(usuarios) {
      const filas = usuarios.map(u => `
          <tr>
              <td>${u.nombre}</td>
              <td>${u.email}</td>
              <td><span class="badge badge-${u.rol}">${u.rol}</span></td>
              <td>${new Date(u.created_at).toLocaleDateString('es-ES')}</td>
          </tr>
      `).join('')

      return `
          <table>
              <thead>
                  <tr>
                      <th>Nombre</th><th>Email</th><th>Rol</th><th>Fecha registro</th>
                  </tr>
              </thead>
              <tbody>${filas}</tbody>
          </table>
      `
  }

  document.addEventListener('DOMContentLoaded', init)