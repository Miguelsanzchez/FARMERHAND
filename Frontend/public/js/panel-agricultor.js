
import { getUsuario } from './auth.js'
import { apiFetch } from './api.js'

// ── Estado global ───────────────────────────────────────────────────────────
const POR_PAGINA = 10

// Productos
let todosProductos     = []
let productosFiltrados = []
let paginaProductos    = 1

// Pedidos
let todosPedidos     = []
let pedidosFiltrados = []
let paginaActual     = 1

// ── Init ────────────────────────────────────────────────────────────────────

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
  if (usuario.rol !== 'agricultor') {
    const destino = { consumidor: '/pages/panel-consumidor.html', admin: '/pages/panel-admin.html' }
    window.location.replace(destino[usuario.rol] || '/pages/login.html')
    return
  }

  document.getElementById('btnNuevoProducto').addEventListener('click', abrirModalNuevo)
  document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal)
  document.getElementById('formProducto').addEventListener('submit', guardarProducto)
  document.getElementById('btnAddCaja').addEventListener('click', () => addCajaRow())

  // Filtros de productos
  document.getElementById('productoBuscador').addEventListener('input',       aplicarFiltrosProductos)
  document.getElementById('productoCategoria').addEventListener('change',     aplicarFiltrosProductos)
  document.getElementById('productoDisponibilidad').addEventListener('change',aplicarFiltrosProductos)
  document.getElementById('btnLimpiarProductos').addEventListener('click',    limpiarFiltrosProductos)

  // Filtros de pedidos
  document.getElementById('filtroBuscador').addEventListener('input',   aplicarFiltros)
  document.getElementById('filtroProducto').addEventListener('input',   aplicarFiltros)
  document.getElementById('filtroEstado').addEventListener('change',    aplicarFiltros)
  document.getElementById('filtroDesde').addEventListener('change',     aplicarFiltros)
  document.getElementById('filtroHasta').addEventListener('change',     aplicarFiltros)
  document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros)

  cargarProductos()
  cargarPedidos()
}

// ── PRODUCTOS ────────────────────────────────────────────────────────────────

async function cargarProductos() {
  const contenedor = document.getElementById('tablaProductos')
  contenedor.innerHTML = '<p class="empty-state">Cargando...</p>'
  try {
    todosProductos = await apiFetch('/api/productos/mis-productos')
    aplicarFiltrosProductos()
  } catch (err) {
    contenedor.innerHTML = `<p class="error-state">Error: ${err.message}</p>`
  }
}

function aplicarFiltrosProductos() {
  const q    = document.getElementById('productoBuscador').value.toLowerCase().trim()
  const cat  = document.getElementById('productoCategoria').value
  const disp = document.getElementById('productoDisponibilidad').value

  productosFiltrados = todosProductos.filter(p => {
    if (cat  && p.categoria !== cat) return false
    if (disp === '1' && !p.disponible) return false
    if (disp === '0' &&  p.disponible) return false
    if (q && !p.nombre.toLowerCase().includes(q) && !(p.categoria ?? '').toLowerCase().includes(q)) return false
    return true
  })

  paginaProductos = 1
  renderProductos()
}

function limpiarFiltrosProductos() {
  document.getElementById('productoBuscador').value      = ''
  document.getElementById('productoCategoria').value     = ''
  document.getElementById('productoDisponibilidad').value = ''
  aplicarFiltrosProductos()
}

function renderProductos() {
  const contenedor = document.getElementById('tablaProductos')
  const contador   = document.getElementById('productosContador')

  contador.textContent = productosFiltrados.length
    ? `${productosFiltrados.length} producto${productosFiltrados.length !== 1 ? 's' : ''}`
    : ''

  if (!productosFiltrados.length) {
    contenedor.innerHTML = todosProductos.length
      ? '<p class="empty-state">Sin resultados. Prueba otros filtros.</p>'
      : '<p class="empty-state">No tienes productos aún. Añade el primero.</p>'
    document.getElementById('paginacionProductos').innerHTML = ''
    return
  }

  const totalPags = Math.ceil(productosFiltrados.length / POR_PAGINA)
  if (paginaProductos > totalPags) paginaProductos = totalPags

  const inicio  = (paginaProductos - 1) * POR_PAGINA
  const pagina  = productosFiltrados.slice(inicio, inicio + POR_PAGINA)

  contenedor.innerHTML = buildTablaProductos(pagina)
  contenedor.querySelectorAll('.btn-editar').forEach(btn =>
    btn.addEventListener('click', () => abrirModalEditar(JSON.parse(btn.dataset.producto)))
  )
  contenedor.querySelectorAll('.btn-eliminar').forEach(btn =>
    btn.addEventListener('click', () => eliminarProducto(btn.dataset.id))
  )
  contenedor.querySelectorAll('.toggle-disponible').forEach(chk =>
    chk.addEventListener('change', () => toggleDisponible(chk.dataset.id, chk.checked))
  )

  renderPaginacionProductos(totalPags)
}

function renderPaginacionProductos(totalPags) {
  const el = document.getElementById('paginacionProductos')
  if (totalPags <= 1) { el.innerHTML = ''; return }

  const botones = []
  botones.push(`<button class="pag-btn" data-pag="${paginaProductos - 1}" ${paginaProductos === 1 ? 'disabled' : ''}>‹</button>`)
  for (let i = 1; i <= totalPags; i++) {
    botones.push(`<button class="pag-btn ${i === paginaProductos ? 'pag-activa' : ''}" data-pag="${i}">${i}</button>`)
  }
  botones.push(`<button class="pag-btn" data-pag="${paginaProductos + 1}" ${paginaProductos === totalPags ? 'disabled' : ''}>›</button>`)

  el.innerHTML = botones.join('')
  el.querySelectorAll('.pag-btn:not([disabled])').forEach(btn =>
    btn.addEventListener('click', () => {
      paginaProductos = parseInt(btn.dataset.pag)
      renderProductos()
      document.getElementById('tablaProductos').scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  )
}

function buildTablaProductos(productos) {
  const filas = productos.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.categoria ?? '—'}</td>
      <td>€${parseFloat(p.precio_por_kg).toFixed(2)}</td>
      <td>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" class="toggle-disponible" data-id="${p.id}" ${p.disponible ? 'checked' : ''} />
          <span class="badge badge-${p.disponible ? 'disponible' : 'agotado'}">
            ${p.disponible ? 'Disponible' : 'Agotado'}
          </span>
        </label>
      </td>
      <td>
        <a class="btn btn-secondary btn-sm"
           href="/pages/producto-detalle.html?id=${p.id}">Ver</a>
        <button class="btn btn-secondary btn-sm btn-editar"
          data-producto='${JSON.stringify(p).replace(/'/g, "&#39;")}'>Editar</button>
        <button class="btn btn-danger btn-sm btn-eliminar" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>`).join('')

  return `
    <table>
      <thead><tr>
        <th>Nombre</th><th>Categoría</th><th>€/kg</th><th>Disponibilidad</th><th>Acciones</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>`
}

async function guardarProducto(e) {
  e.preventDefault()
  const id = document.getElementById('productoId').value

  const payload = {
    nombre:        document.getElementById('nombre').value.trim(),
    descripcion:   document.getElementById('descripcion').value.trim(),
    precio_por_kg: parseFloat(document.getElementById('precio_por_kg').value),
    categoria:     document.getElementById('categoria').value,
    tiempo_envio:  parseInt(document.getElementById('tiempo_envio').value) || null
  }

  try {
    let productoId = id
    if (id) {
      await apiFetch(`/api/productos/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    } else {
      const nuevo = await apiFetch('/api/productos', { method: 'POST', body: JSON.stringify(payload) })
      productoId = nuevo.producto?.id ?? nuevo.id
    }

    const cajas = getCajasDelFormulario()
    if (id) {
      try { await apiFetch(`/api/productos/${productoId}/cajas`, { method: 'DELETE' }) } catch (_) {}
    }
    for (const caja of cajas) {
      try {
        await apiFetch(`/api/productos/${productoId}/cajas`, {
          method: 'POST',
          body: JSON.stringify(caja)
        })
      } catch (err) {
        console.warn('Caja no guardada:', err.message)
      }
    }

    cerrarModal()
    await cargarProductos()
  } catch (err) {
    alert(`Error al guardar: ${err.message}`)
  }
}

async function eliminarProducto(id) {
  if (!confirm('¿Seguro que quieres eliminar este producto?')) return
  try {
    await apiFetch(`/api/productos/${id}`, { method: 'DELETE' })
    cargarProductos()
  } catch (err) {
    alert(`Error al eliminar: ${err.message}`)
  }
}

async function toggleDisponible(id, disponible) {
  try {
    await apiFetch(`/api/productos/${id}`, { method: 'PATCH', body: JSON.stringify({ disponible }) })
    cargarProductos()
  } catch (err) {
    alert(`Error: ${err.message}`)
  }
}

// ── CAJAS ────────────────────────────────────────────────────────────────────

function getCajasDelFormulario() {
  return [...document.querySelectorAll('.caja-row')].map(row => ({
    kg:           parseFloat(row.querySelector('.caja-kg').value),
    precio_total: parseFloat(row.querySelector('.caja-precio').value),
    descuento:    parseFloat(row.querySelector('.caja-descuento').value) || 0
  })).filter(c => !isNaN(c.kg) && !isNaN(c.precio_total) && c.kg > 0 && c.precio_total > 0)
}

function addCajaRow(kg = '', precio = '', descuento = '') {
  const row = document.createElement('div')
  row.className = 'caja-row'
  row.innerHTML = `
    <input type="number" placeholder="ej: 3" min="0.1" step="0.1" class="caja-kg" value="${kg}">
    <input type="number" placeholder="ej: 8.50" min="0.01" step="0.01" class="caja-precio" value="${precio}">
    <input type="number" placeholder="ej: 10" min="0" max="100" class="caja-descuento" value="${descuento}">
    <button type="button" class="btn-remove-caja" title="Eliminar">✕</button>
  `
  row.querySelector('.btn-remove-caja').addEventListener('click', () => {
    row.remove()
    actualizarHeaderCajas()
  })
  document.getElementById('cajasContainer').appendChild(row)
  actualizarHeaderCajas()
}

function actualizarHeaderCajas() {
  const header = document.getElementById('cajasHeader')
  const hayFilas = document.querySelectorAll('.caja-row').length > 0
  if (header) header.style.display = hayFilas ? 'grid' : 'none'
}

function limpiarCajas() {
  document.getElementById('cajasContainer').innerHTML = ''
  actualizarHeaderCajas()
}

async function cargarCajasExistentes(productoId) {
  try {
    const cajas = await apiFetch(`/api/productos/${productoId}/cajas`)
    cajas.forEach(c => addCajaRow(c.kg, c.precio_total, c.descuento))
  } catch (_) {}
}

// ── MODAL ────────────────────────────────────────────────────────────────────

function abrirModalNuevo() {
  document.getElementById('modalTitulo').textContent = 'Nuevo Producto'
  document.getElementById('formProducto').reset()
  document.getElementById('productoId').value = ''
  limpiarCajas()
  document.getElementById('modalProducto').classList.add('active')
}

function abrirModalEditar(producto) {
  document.getElementById('modalTitulo').textContent = 'Editar Producto'
  document.getElementById('productoId').value    = producto.id
  document.getElementById('nombre').value        = producto.nombre
  document.getElementById('descripcion').value   = producto.descripcion ?? ''
  document.getElementById('precio_por_kg').value = producto.precio_por_kg
  document.getElementById('categoria').value     = producto.categoria ?? ''
  document.getElementById('tiempo_envio').value  = producto.tiempo_envio ?? ''
  limpiarCajas()
  cargarCajasExistentes(producto.id)
  document.getElementById('modalProducto').classList.add('active')
}

function cerrarModal() {
  document.getElementById('modalProducto').classList.remove('active')
}

// ── PEDIDOS — carga, filtros y paginación ────────────────────────────────────

async function cargarPedidos() {
  const contenedor = document.getElementById('tablaPedidos')
  contenedor.innerHTML = '<p class="empty-state">Cargando...</p>'
  try {
    todosPedidos = await apiFetch('/api/pedidos/recibidos')
    aplicarFiltros()
  } catch (err) {
    contenedor.innerHTML = `<p class="error-state">Error: ${err.message}</p>`
  }
}

function aplicarFiltros() {
  const q          = document.getElementById('filtroBuscador').value.toLowerCase().trim()
  const qProd      = document.getElementById('filtroProducto').value.toLowerCase().trim()
  const estado     = document.getElementById('filtroEstado').value
  const desdeStr   = document.getElementById('filtroDesde').value
  const hastaStr   = document.getElementById('filtroHasta').value
  const desde      = desdeStr ? new Date(desdeStr) : null
  const hasta      = hastaStr ? new Date(hastaStr + 'T23:59:59') : null

  pedidosFiltrados = todosPedidos.filter(l => {
    if (estado && l.pedidos?.estado !== estado) return false

    if (desde || hasta) {
      const fecha = l.pedidos?.created_at ? new Date(l.pedidos.created_at) : null
      if (!fecha) return false
      if (desde && fecha < desde) return false
      if (hasta && fecha > hasta) return false
    }

    if (qProd && !(l.productos?.nombre ?? '').toLowerCase().includes(qProd)) return false

    if (q) {
      const haystack = [
        l.pedido_id,
        l.pedidos?.usuarios?.nombre,
        l.pedidos?.usuarios?.email,
        l.pedidos?.direccion_envio,
      ].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })

  paginaActual = 1
  renderPedidos()
}

function limpiarFiltros() {
  document.getElementById('filtroBuscador').value  = ''
  document.getElementById('filtroProducto').value  = ''
  document.getElementById('filtroEstado').value    = ''
  document.getElementById('filtroDesde').value     = ''
  document.getElementById('filtroHasta').value     = ''
  aplicarFiltros()
}

function renderPedidos() {
  const contenedor = document.getElementById('tablaPedidos')
  const contador   = document.getElementById('pedidosContador')

  contador.textContent = pedidosFiltrados.length
    ? `${pedidosFiltrados.length} resultado${pedidosFiltrados.length !== 1 ? 's' : ''}`
    : ''

  if (!pedidosFiltrados.length) {
    contenedor.innerHTML = '<p class="empty-state">No hay pedidos que coincidan con los filtros.</p>'
    document.getElementById('paginacion').innerHTML = ''
    return
  }

  const totalPags = Math.ceil(pedidosFiltrados.length / POR_PAGINA)
  if (paginaActual > totalPags) paginaActual = totalPags

  const inicio = (paginaActual - 1) * POR_PAGINA
  const pagina = pedidosFiltrados.slice(inicio, inicio + POR_PAGINA)

  contenedor.innerHTML = buildTablaPedidos(pagina)
  contenedor.querySelectorAll('.select-estado').forEach(sel =>
    sel.addEventListener('change', () => actualizarEstado(sel.dataset.id, sel.value))
  )

  renderPaginacion(totalPags)
}

function buildTablaPedidos(lineas) {
  const filas = lineas.map(l => {
    const fecha   = l.pedidos?.created_at
      ? new Date(l.pedidos.created_at).toLocaleDateString('es-ES') : '—'
    const cliente = l.pedidos?.usuarios?.nombre ?? l.pedidos?.usuarios?.email
      ?? l.pedidos?.consumidor_id?.slice(0, 8) ?? '—'
    const estado  = l.pedidos?.estado ?? 'pendiente'

    return `
      <tr>
        <td><code class="pedido-id" title="${l.pedido_id}">#${l.pedido_id.slice(0,8)}</code></td>
        <td>${fecha}</td>
        <td>${l.productos?.nombre ?? '—'}</td>
        <td>${l.cantidad}</td>
        <td>€${parseFloat(l.precio_unidad).toFixed(2)}</td>
        <td class="td-cliente" title="${l.pedidos?.usuarios?.email ?? ''}">${cliente}</td>
        <td><span class="badge badge-${estado}">${estado}</span></td>
        <td>
          <select class="select-estado" data-id="${l.pedido_id}">
            <option value="confirmado" ${estado === 'confirmado' ? 'selected' : ''}>Confirmado</option>
            <option value="enviado"    ${estado === 'enviado'    ? 'selected' : ''}>Enviado</option>
            <option value="entregado"  ${estado === 'entregado'  ? 'selected' : ''}>Entregado</option>
          </select>
        </td>
      </tr>`
  }).join('')

  return `
    <table>
      <thead><tr>
        <th>Pedido</th><th>Fecha</th><th>Producto</th><th>Cant.</th>
        <th>Precio/u</th><th>Cliente</th><th>Estado</th><th>Cambiar estado</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>`
}

function renderPaginacion(totalPags) {
  const el = document.getElementById('paginacion')
  if (totalPags <= 1) { el.innerHTML = ''; return }

  const botones = []

  botones.push(`
    <button class="pag-btn" data-pag="${paginaActual - 1}"
      ${paginaActual === 1 ? 'disabled' : ''}>‹</button>`)

  for (let i = 1; i <= totalPags; i++) {
    botones.push(`
      <button class="pag-btn ${i === paginaActual ? 'pag-activa' : ''}"
        data-pag="${i}">${i}</button>`)
  }

  botones.push(`
    <button class="pag-btn" data-pag="${paginaActual + 1}"
      ${paginaActual === totalPags ? 'disabled' : ''}>›</button>`)

  el.innerHTML = botones.join('')
  el.querySelectorAll('.pag-btn:not([disabled])').forEach(btn =>
    btn.addEventListener('click', () => {
      paginaActual = parseInt(btn.dataset.pag)
      renderPedidos()
      document.getElementById('tablaPedidos').scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  )
}

async function actualizarEstado(pedidoId, estado) {
  try {
    await apiFetch(`/api/pedidos/${pedidoId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado })
    })
    // Actualiza el estado en memoria para no recargar toda la lista
    todosPedidos.forEach(l => {
      if (l.pedido_id === pedidoId && l.pedidos) l.pedidos.estado = estado
    })
    aplicarFiltros()
  } catch (err) {
    alert(`Error al actualizar estado: ${err.message}`)
    cargarPedidos()
  }
}

document.addEventListener('DOMContentLoaded', init)
