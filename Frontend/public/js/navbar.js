import { logout } from './auth.js'

function renderNavbar() {
  const navEl = document.getElementById('fh-navbar')
  if (!navEl) return

  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
  if (!usuario || !localStorage.getItem('token')) {
    window.location.replace('/pages/login.html')
    return
  }

  const esAgricultor = usuario.rol === 'agricultor'
  const esAdmin      = usuario.rol === 'admin'
  const pagina       = window.location.pathname.split('/').pop()

  function link(href, label) {
    const nombre = href.split('/').pop().split('#')[0]
    const active = nombre === pagina ? ' fh-nav-active' : ''
    return `<a href="${href}" class="fh-nav-link${active}">${label}</a>`
  }

  navEl.innerHTML = `
    <nav class="fh-nav">
      <div class="fh-nav-left">
        <a href="/index.html" class="fh-nav-logo-link">
          <img src="/assets/img/logofarmerhand.png" alt="FarmerHand" class="fh-nav-logo-img" />
        </a>
        ${!esAdmin ? link('/pages/catalogo.html', 'Tienda') : ''}
        
        ${!esAdmin && !esAgricultor ? link('/pages/panel-consumidor.html', 'Mis pedidos') : ''}
        ${esAgricultor ? link('/pages/panel-agricultor.html', 'Panel agricultor') : ''}
        ${esAgricultor ? `<a href="/pages/panel-agricultor.html#pedidos-recibidos" class="fh-nav-link">Pedidos recibidos</a>` : ''}
        ${esAgricultor ? link('/pages/panel-consumidor.html', 'Pedidos realizados') : ''}
        ${esAdmin ? link('/pages/panel-admin.html', 'Admin') : ''}
      </div>
      <div class="fh-nav-right">
        <span id="infoUsuario" class="fh-nav-usuario">${usuario.nombre}</span>
        <button id="btnLogout" class="fh-btn-logout">Cerrar sesión</button>
      </div>
    </nav>
  `

  document.getElementById('btnLogout').addEventListener('click', logout)
}

renderNavbar()
