import { getUsuario } from './auth.js'
import { apiFetch }  from './api.js'

async function init() {
  const usuario = getUsuario()
  if (!usuario || usuario.rol !== 'agricultor') {
    window.location.href = 'login.html'
    return
  }

  const params     = new URLSearchParams(window.location.search)
  const productoId = params.get('id')

  if (!productoId) {
    document.getElementById('cardProducto').innerHTML =
      '<p class="error-state">No se proporcionó ID de producto.</p>'
    return
  }

  await Promise.all([
    cargarProducto(productoId),
    cargarPedidos(productoId),
  ])
}

// ── Info del producto ────────────────────────────────────────────────────────

async function cargarProducto(id) {
  const card = document.getElementById('cardProducto')
  try {
    const productos = await apiFetch('/api/productos/mis-productos')
    const p = productos.find(x => x.id === id)

    if (!p) {
      card.innerHTML = '<p class="error-state">Producto no encontrado o no te pertenece.</p>'
      return
    }

    document.title = `${p.nombre} — FarmerHand`

    card.innerHTML = `
      <div class="detalle-producto">
        ${p.foto_url
          ? `<img src="${p.foto_url}" alt="${p.nombre}" class="detalle-foto" />`
          : '<div class="detalle-foto-placeholder">Sin imagen</div>'}

        <div class="detalle-info">
          <div class="card-header" style="margin-bottom:16px;">
            <h2>${p.nombre}</h2>
            <span class="badge badge-${p.disponible ? 'disponible' : 'agotado'}">
              ${p.disponible ? 'Disponible' : 'Agotado'}
            </span>
          </div>

          <div class="detalle-grid">
            <div class="detalle-campo">
              <span class="detalle-label">Categoría</span>
              <span>${p.categoria ?? '—'}</span>
            </div>
            <div class="detalle-campo">
              <span class="detalle-label">Precio por kg</span>
              <span class="detalle-precio">€${parseFloat(p.precio_por_kg).toFixed(2)}</span>
            </div>
            <div class="detalle-campo">
              <span class="detalle-label">Tiempo de envío</span>
              <span>${p.tiempo_envio ? `${p.tiempo_envio} días` : '—'}</span>
            </div>
            <div class="detalle-campo detalle-campo-wide">
              <span class="detalle-label">Descripción</span>
              <span>${p.descripcion ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>`
  } catch (err) {
    card.innerHTML = `<p class="error-state">Error al cargar producto: ${err.message}</p>`
  }
}

// ── Pedidos que contienen este producto ──────────────────────────────────────

async function cargarPedidos(productoId) {
  const contenedor = document.getElementById('detallePedidos')
  const contador   = document.getElementById('detallePedidosContador')

  try {
    const todos  = await apiFetch('/api/pedidos/recibidos')
    const lineas = todos.filter(l => l.producto_id === productoId)

    if (!lineas.length) {
      contador.textContent = '0 pedidos'
      contenedor.innerHTML = '<p class="empty-state">Este producto aún no tiene pedidos.</p>'
      return
    }

    // Métricas rápidas
    const totalUnidades = lineas.reduce((s, l) => s + l.cantidad, 0)
    const totalEuros    = lineas.reduce((s, l) => s + l.cantidad * parseFloat(l.precio_unidad), 0)
    contador.textContent = `${lineas.length} línea${lineas.length !== 1 ? 's' : ''} · ${totalUnidades} ud. · €${totalEuros.toFixed(2)} facturado`

    const filas = lineas.map(l => {
      const fecha   = l.pedidos?.created_at
        ? new Date(l.pedidos.created_at).toLocaleDateString('es-ES') : '—'
      const cliente = l.pedidos?.usuarios?.nombre ?? l.pedidos?.usuarios?.email
        ?? l.pedidos?.consumidor_id?.slice(0, 8) ?? '—'
      const estado  = l.pedidos?.estado ?? '—'

      return `
        <tr>
          <td><code class="pedido-id" title="${l.pedido_id}">#${l.pedido_id.slice(0, 8)}</code></td>
          <td>${fecha}</td>
          <td>${l.cantidad}</td>
          <td>€${parseFloat(l.precio_unidad).toFixed(2)}</td>
          <td>€${(l.cantidad * parseFloat(l.precio_unidad)).toFixed(2)}</td>
          <td class="td-cliente">${cliente}</td>
          <td><span class="badge badge-${estado}">${estado}</span></td>
          <td>${l.pedidos?.direccion_envio ?? '—'}</td>
        </tr>`
    }).join('')

    contenedor.innerHTML = `
      <table>
        <thead><tr>
          <th>Pedido</th><th>Fecha</th><th>Cantidad</th>
          <th>Precio/u</th><th>Total línea</th><th>Cliente</th><th>Estado</th><th>Dirección</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>`

  } catch (err) {
    contenedor.innerHTML = `<p class="error-state">Error al cargar pedidos: ${err.message}</p>`
  }
}

document.addEventListener('DOMContentLoaded', init)
