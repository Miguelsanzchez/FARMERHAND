import { initDrawer, abrirDrawer, actualizarBadge } from './carrito-desplegable.js'

import { API_BASE } from './config.js'

document.addEventListener('DOMContentLoaded', () => {
  initDrawer()
  setupNav()
  setupCarousel()
  actualizarBadge()
  cargarDestacados()

  document.getElementById('comunidad-form')?.addEventListener('submit', e => {
    e.preventDefault()
    alert('¡Te has inscrito a la Comunidad! 🎉')
    e.target.reset()
  })
})

// ── NAVEGACIÓN ────────────────────────────────────────────────

function setupNav() {
  document.getElementById('nav-carrito')?.addEventListener('click', abrirDrawer)

  const usuario = JSON.parse(localStorage.getItem('usuario'))
  const navUsuarioEl = document.getElementById('nav-usuario')
  if (navUsuarioEl) {
    if (usuario) {
      const rutas = { admin: '/pages/panel-admin.html', agricultor: '/pages/panel-agricultor.html', consumidor: '/pages/panel-consumidor.html' }
      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'display:flex; align-items:center; gap:8px;'

      const link = document.createElement('a')
      link.href = rutas[usuario.rol] || '/pages/login.html'
      link.textContent = `${usuario.nombre} · ${usuario.rol}`
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
    const usuario = JSON.parse(localStorage.getItem('usuario'))
    hazteLink.href = usuario
      ? '/pages/solicitud-agricultor.html'
      : '/pages/login.html?returnTo=agricultor'
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

// ── CARRUSEL ──────────────────────────────────────────────────

function setupCarousel() {
  const slides = document.querySelectorAll('.carousel-slide')
  if (slides.length < 2) return
  let current = 0
  setInterval(() => {
    slides[current].classList.remove('active')
    current = (current + 1) % slides.length
    slides[current].classList.add('active')
  }, 4000)
}

// ── PRODUCTOS DESTACADOS ──────────────────────────────────────

async function cargarDestacados() {
  const grid = document.getElementById('destacados-grid')
  if (!grid) return

  grid.innerHTML = '<p style="text-align:center;color:#aaa;padding:32px 0;">Cargando productos...</p>'

  try {
    const res = await fetch(`${API_BASE}/api/productos`)
    if (!res.ok) throw new Error()

    const data     = await res.json()
    const primeros = data.slice(0, 3)

    if (!primeros.length) {
      grid.innerHTML = '<p style="text-align:center;color:#888;padding:32px 0;">No hay productos disponibles en este momento.</p>'
      return
    }

    grid.innerHTML = primeros.map(p => {
      const imagen   = p.foto_url ?? ''
      const nombre   = p.nombre ?? 'Producto'
      const precio   = Number(p.precio_por_kg ?? 0).toFixed(2)
      const categoria = p.categoria ?? 'Otros'
      const finca    = p.agricultores?.nombre_finca ?? 'Agricultor'
      const lugar    = p.agricultores?.localizacion ?? 'España'

      return `
        <article class="product-card">
          <div class="product-image">
            <img
              src="${imagen}"
              alt="${nombre}"
            />
            <div class="product-badge">${categoria}</div>
          </div>
          <div class="product-content">
            <h3 class="product-title">${nombre}</h3>
            <p class="product-origin">📍 ${lugar}</p>
            <p class="product-seller">👨‍🌾 ${finca}</p>
            <div class="product-price">
              <span class="price">€${precio}</span>
              <span class="unit"> / kg</span>
            </div>
            <a href="/pages/catalogo.html"
               class="add-to-cart-btn"
               style="display:block;text-align:center;text-decoration:none;line-height:1.5;">
              Ver en catálogo
            </a>
          </div>
        </article>`
    }).join('')

  } catch {
    grid.innerHTML = '<p style="text-align:center;color:#888;padding:32px 0;">No hay productos disponibles en este momento.</p>'
  }
}
