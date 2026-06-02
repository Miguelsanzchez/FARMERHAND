import { initDrawer, abrirDrawer, actualizarBadge } from './carrito-desplegable.js'

import { API_BASE } from './config.js'

const CATEGORIAS = [
  { nombre: 'Verduras', imagen: '/assets/img/verduras.png' },
  { nombre: 'Frutas',   imagen: '/assets/img/fruta.png' },
  { nombre: 'Lacteos',  imagen: '/assets/img/productos-lacteos.png' },
  { nombre: 'Aceites',  imagen: '/assets/img/aceite-de-oliva.png' },
]

let adopcionesData  = []
let categoriaActiva = null

document.addEventListener('DOMContentLoaded', async () => {
  initDrawer()
  setupNav()
  actualizarBadge()
  renderCategorias()
  await cargarAdopciones()
  setupBuscador()
})

// ── NAVEGACIÓN ────────────────────────────────────────────────

function setupNav() {
  document.getElementById('nav-carrito')?.addEventListener('click', abrirDrawer)

  const u = JSON.parse(localStorage.getItem('usuario'))
  const navUsuarioEl = document.getElementById('nav-usuario')
  if (navUsuarioEl) {
    const r = { admin: '/pages/panel-admin.html', agricultor: '/pages/panel-agricultor.html', consumidor: '/pages/panel-consumidor.html' }
    if (u) {
      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'display:flex; align-items:center; gap:8px;'

      const link = document.createElement('a')
      link.href = r[u.rol] || '/pages/login.html'
      link.textContent = `${u.nombre} · ${u.rol}`
      link.style.cssText = 'font-size:13px; color:#2d5016; font-weight:600; text-decoration:none; border-bottom:2px solid #7cb342; padding-bottom:1px;'

      const btnLogout = document.createElement('button')
      btnLogout.textContent = 'Salir'
      btnLogout.style.cssText = 'background:none; border:1px solid #2d5016; color:#2d5016; padding:3px 10px; border-radius:6px; font-size:12px; cursor:pointer;'
      btnLogout.addEventListener('click', () => {
        if (!confirm('¿Seguro que quieres cerrar sesión?')) return
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        window.location.replace('/index.html')
      })

      wrapper.appendChild(link)
      wrapper.appendChild(btnLogout)
      navUsuarioEl.replaceWith(wrapper)
    } else {
      navUsuarioEl.addEventListener('click', () => window.location.href = '/pages/login.html')
    }
  }

  const hazteLink = document.getElementById('nav-hazte')
  if (hazteLink) {
    const u = JSON.parse(localStorage.getItem('usuario'))
    hazteLink.href = u ? '/pages/solicitud-agricultor.html' : '/pages/login.html?returnTo=agricultor'
  }

  const burger   = document.getElementById('burger')
  const navLinks = document.getElementById('navLinks')
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('active')
      navLinks.classList.toggle('active')
    })
  }
}

// ── API ───────────────────────────────────────────────────────

async function cargarAdopciones() {
  try {
    const res = await fetch(`${API_BASE}/api/adopciones`)
    if (!res.ok) throw new Error()
    adopcionesData = await res.json()
  } catch {
    adopcionesData = []
  }
  renderAdopciones(adopcionesData)
}

// ── CATEGORÍAS ────────────────────────────────────────────────

function renderCategorias() {
  const container = document.getElementById('categorias-list')
  if (!container) return

  container.innerHTML = CATEGORIAS.map(c => `
    <button class="cat-chip" data-cat="${c.nombre}">
      <img
        src="${c.imagen}"
        alt="${c.nombre}"
        />
      <span>${c.nombre}</span>
    </button>
  `).join('')

  container.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat
      if (categoriaActiva === cat) {
        categoriaActiva = null
        container.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'))
      } else {
        categoriaActiva = cat
        container.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
      }
      aplicarFiltros()
    })
  })
}

// ── FILTROS ───────────────────────────────────────────────────

function aplicarFiltros() {
  const q = document.getElementById('buscador')?.value.toLowerCase().trim() || ''
  let lista = adopcionesData
  if (categoriaActiva) lista = lista.filter(a => a.categoria === categoriaActiva)
  if (q) lista = lista.filter(a =>
    (a.nombre     ?? '').toLowerCase().includes(q) ||
    (a.agricultor ?? '').toLowerCase().includes(q) ||
    (a.tipo       ?? '').toLowerCase().includes(q)
  )
  renderAdopciones(lista)
}

function setupBuscador() {
  document.getElementById('buscador')?.addEventListener('input', aplicarFiltros)
}

// ── RENDER ────────────────────────────────────────────────────

function renderAdopciones(lista) {
  const grid      = document.getElementById('adopciones-grid')
  const noResults = document.getElementById('no-results')
  const contador  = document.getElementById('contador')

  if (contador) contador.textContent = `${lista.length} producto${lista.length !== 1 ? 's' : ''}`

  if (!lista.length) {
    if (grid) grid.innerHTML = ''
    if (noResults) noResults.style.display = 'block'
    return
  }

  if (noResults) noResults.style.display = 'none'

  grid.innerHTML = lista.map(a => {
    const imagen  = a.imagen ?? ''
    const precio  = Number(a.precio ?? 0).toFixed(2).replace('.', ',')
    const badge   = a.badge ?? ''
    const color   = a.badgeColor ?? '#7cb342'

    return `
      <article class="ad-card">
        <div class="ad-img">
          <img
            src="${imagen}"
            alt="${a.nombre ?? 'Adopción'}"
          />
        </div>
        <div class="ad-body">
          <p class="ad-tipo">${a.tipo ?? ''}</p>
          <h3 class="ad-nombre">${a.nombre ?? 'Sin nombre'}</h3>
          <span class="ad-badge" style="background:${color}20;color:${color};">
            <span class="ad-dot" style="background:${color}"></span>${badge}
          </span>
          <p class="ad-agricultor">${a.bandera ?? '🌿'} ${a.agricultor ?? ''}</p>
          <p class="ad-cajas">📦 ${a.cajas ?? ''}</p>
          <div class="ad-footer">
            <span class="ad-desde">Desde <strong>${precio} €</strong></span>
            <button class="ad-btn" onclick="alert('¡Próximamente! 🌳')">Adoptar</button>
          </div>
        </div>
      </article>`
  }).join('')
}
