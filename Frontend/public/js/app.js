import { initDrawer, abrirDrawer, actualizarBadge } from './carrito-desplegable.js'

import { API_BASE } from './config.js'

// ── API ──────────────────────────────────────────────────────────────────────

async function fetchProductos() {
  const res = await fetch(`${API_BASE}/api/productos`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function adaptarProducto(p) {
  return {
    id:            p.id,
    agricultor_id: p.agricultor_id,
    name:          p.nombre          ?? 'Producto sin nombre',
    price:         p.precio_por_kg   ?? 0,
    stars:         Math.round(p.agricultores?.valoracion_media ?? 0),
    reviews:       0,
    seller:        p.agricultores?.nombre_finca  ?? 'Agricultor',
    category:      p.categoria                   ?? 'Otros',
    season:        p.disponible ? 'Disponible' : 'Sin stock',
    origin:        p.agricultores?.localizacion  ?? 'España',
    image:         p.foto_url ?? null
  }
}



function createNavigation() {
  const header = document.getElementById('header')

  const navContainer = document.createElement('div')
  navContainer.className = 'nav-container'

  const navMenu = document.createElement('nav')
  navMenu.className = 'nav-menu'

  const navLeft = document.createElement('div')
  navLeft.className = 'nav-left'

  const logoLink = document.createElement('a')
  logoLink.href = '#home'
  logoLink.className = 'logo-link'
  const logoImg = document.createElement('img')
  logoImg.src = '/assets/img/logofarmerhand.png'
  logoImg.alt = 'Logo FarmerHand'
  logoImg.className = 'logo'
  logoLink.appendChild(logoImg)

  const navLinks = document.createElement('div')
  navLinks.className = 'nav-links'
  navLinks.id = 'navLinks'

  const links = [
    { href: '/pages/catalogo.html',    text: 'TIENDA' },
    { href: '/pages/catalogo.html',    text: 'EN TEMPORADA' },
    { href: '/pages/adopciones.html',  text: 'ADOPTA UN ÁRBOL' },
    { href: '/index.html#about',       text: 'QUIENES SOMOS' },
    { href: '/index.html#contact',     text: 'CONTACTO' }
  ]

  links.forEach(link => {
    const a = document.createElement('a')
    a.href = link.href
    a.textContent = link.text
    navLinks.appendChild(a)
  })

  const usuarioNav = JSON.parse(localStorage.getItem('usuario'))
  if (usuarioNav?.rol === 'agricultor') {
    const panelLink = document.createElement('a')
    panelLink.href = '/pages/panel-agricultor.html'
    panelLink.textContent = 'MI PANEL'
    navLinks.appendChild(panelLink)
  } else {
    const hazteLink = document.createElement('a')
    hazteLink.textContent = 'HAZTE AGRICULTOR'
    hazteLink.style.cursor = 'pointer'
    hazteLink.href = usuarioNav
      ? '/pages/solicitud-agricultor.html'
      : '/pages/login.html?returnTo=agricultor'
    navLinks.appendChild(hazteLink)
  }

  navLeft.appendChild(logoLink)
  navLeft.appendChild(navLinks)

  const menuIcons = document.createElement('div')
  menuIcons.className = 'menu-icons'

  const usuario = JSON.parse(localStorage.getItem('usuario'))
  if (usuario) {
    const userInfo = document.createElement('div')
    userInfo.className = 'nav-user-info'
    userInfo.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer;'

    const rutas = { admin: '/pages/panel-admin.html', agricultor: '/pages/panel-agricultor.html', consumidor: '/pages/panel-consumidor.html' }
    const userLabel = document.createElement('a')
    userLabel.className = 'nav-user-label'
    userLabel.href = rutas[usuario.rol] || '/pages/login.html'
    userLabel.textContent = `${usuario.nombre} · ${usuario.rol}`
    userLabel.style.cssText = 'font-size:13px; color:#2d5016; font-weight:600; text-decoration:none; border-bottom:2px solid #7cb342; padding-bottom:1px;'

    const btnLogout = document.createElement('button')
    btnLogout.textContent = 'Salir'
    btnLogout.style.cssText = 'background:none; border:1px solid #2d5016; color:#2d5016; padding:3px 10px; border-radius:6px; font-size:12px; cursor:pointer;'
    btnLogout.addEventListener('click', () => {
      if (!confirm('¿Seguro que quieres cerrar sesión?')) return
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.replace('/index.html')
    })

    userInfo.appendChild(userLabel)
    userInfo.appendChild(btnLogout)
    menuIcons.appendChild(userInfo)
  } else {
    const loginIcon = document.createElement('span')
    loginIcon.className = 'material-symbols-outlined login-icon'
    loginIcon.textContent = 'person'
    loginIcon.title = 'Iniciar sesión'
    loginIcon.style.cursor = 'pointer'
    loginIcon.addEventListener('click', () => window.location.href = '/pages/login.html')
    menuIcons.appendChild(loginIcon)
  }

  const carritoGuardado = JSON.parse(localStorage.getItem('carrito') ?? '[]')
  const totalItems = carritoGuardado.reduce((sum, i) => sum + i.cantidad, 0)

  const cartWrapper = document.createElement('div')
  cartWrapper.style.cssText = 'position:relative; display:inline-flex; cursor:pointer;'
  cartWrapper.title = 'Ver carrito'
  cartWrapper.addEventListener('click', () => abrirDrawer())

  const cartIcon = document.createElement('span')
  cartIcon.className = 'material-symbols-outlined cart'
  cartIcon.textContent = 'shopping_cart'
  cartWrapper.appendChild(cartIcon)

  const badge = document.createElement('span')
  badge.id = 'fh-cart-badge'
  badge.textContent = totalItems
  badge.style.cssText = `
    position:absolute; top:-6px; right:-8px;
    background:#e53935; color:white;
    border-radius:50%; font-size:10px;
    width:16px; height:16px; font-style:normal;
    display:${totalItems > 0 ? 'flex' : 'none'};
    align-items:center; justify-content:center;
    pointer-events:none;
  `
  cartWrapper.appendChild(badge)
  menuIcons.appendChild(cartWrapper)

  const burger = document.createElement('div')
  burger.className = 'burger'
  burger.id = 'burger'
  for (let i = 0; i < 3; i++) burger.appendChild(document.createElement('span'))
  menuIcons.appendChild(burger)

  navMenu.appendChild(navLeft)
  navMenu.appendChild(menuIcons)
  navContainer.appendChild(navMenu)
  header.appendChild(navContainer)
}

// ── HERO ─────────────────────────────────────────────────────────────────────

function createHeroSection() {
  const app = document.getElementById('app')
  const container = document.createElement('div')
  container.className = 'container'

  const heroSection = document.createElement('section')
  heroSection.className = 'hero-section'

  const h1 = document.createElement('h1')
  h1.textContent = 'De la Huerta a tus Manos'

  const p = document.createElement('p')
  p.textContent = 'Productos frescos y locales de la huerta a tu hogar'

  heroSection.appendChild(h1)
  heroSection.appendChild(p)
  container.appendChild(heroSection)
  app.appendChild(container)
  return container
}

// ── SECCIÓN PRODUCTOS ─────────────────────────────────────────────────────────

function createProductsSection(container) {
  const productsSection = document.createElement('section')
  productsSection.className = 'products-section'

  const filtersBar = document.createElement('div')
  filtersBar.className = 'filters-bar'

  const filterPills = document.createElement('div')
  filterPills.className = 'filter-pills'
  filterPills.id = 'filterPills'
  filtersBar.appendChild(filterPills)

  const productsWrapper = document.createElement('div')
  productsWrapper.className = 'products-wrapper'
  productsWrapper.id = 'productsWrapper'

  productsSection.appendChild(filtersBar)
  productsSection.appendChild(productsWrapper)
  container.appendChild(productsSection)
}

// ── FILTROS ───────────────────────────────────────────────────────────────────

function createFilters() {
  const filterPills = document.getElementById('filterPills')

  const categories = [
    { value: '',         label: 'Todas' },
    { value: 'Verduras', label: 'Verduras' },
    { value: 'Frutas',   label: 'Frutas' },
    { value: 'Lacteos',  label: 'Lácteos' },
    { value: 'Aceites',  label: 'Aceites' },
  ]

  categories.forEach(({ value, label }) => {
    const pill = document.createElement('button')
    pill.className = 'pill' + (value === '' ? ' active' : '')
    pill.dataset.value = value
    pill.textContent = label
    filterPills.appendChild(pill)
  })
}

function setupFilters(productosBase = []) {
  const pills = document.querySelectorAll('.pill')

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'))
      pill.classList.add('active')

      const category = pill.dataset.value
      const filtered = category
        ? productosBase.filter(p => p.category === category)
        : productosBase

      renderProducts(filtered)
    })
  })
}

// ── GRID DE PRODUCTOS ─────────────────────────────────────────────────────────

function createProductsWrapper() {
  const productsWrapper = document.getElementById('productsWrapper')

  const h2 = document.createElement('h2')
  h2.textContent = 'Catálogo de Productos'

  const seasonalInfo = document.createElement('div')
  seasonalInfo.className = 'seasonal-info'
  const p = document.createElement('p')
  p.textContent = 'Lo mejor del campo directo a tus manos'
  seasonalInfo.appendChild(p)

  const productsGrid = document.createElement('div')
  productsGrid.className = 'products-grid'
  productsGrid.id = 'productsGrid'

  productsWrapper.appendChild(h2)
  productsWrapper.appendChild(seasonalInfo)
  productsWrapper.appendChild(productsGrid)
}

function renderProducts(productsToRender = []) {
  const productsGrid = document.getElementById('productsGrid')
  productsGrid.innerHTML = ''

  if (!productsToRender.length) {
    productsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 0;color:#888;">
        <p style="font-size:16px;">No hay productos disponibles en este momento.</p>
      </div>`
    return
  }

  productsToRender.forEach(product => {
    productsGrid.appendChild(createProductCard(product))
  })
}

function createProductCard(product) {
  const productCard = document.createElement('article')
  productCard.className = 'product-card'

  const productImage = document.createElement('div')
  productImage.className = 'product-image'

  const img = document.createElement('img')
  if (product.image) img.src = product.image
  img.alt = product.name ?? 'Producto'

  const badge = document.createElement('div')
  badge.className = 'product-badge'
  badge.textContent = product.category ?? 'Otros'

  productImage.appendChild(img)
  productImage.appendChild(badge)

  const productContent = document.createElement('div')
  productContent.className = 'product-content'

  const title = document.createElement('h3')
  title.className = 'product-title'
  title.textContent = product.name ?? 'Producto sin nombre'

  const seasonTag = document.createElement('div')
  seasonTag.className = 'product-season-tag'
  seasonTag.textContent = product.season ?? ''

  const origin = document.createElement('p')
  origin.className = 'product-origin'
  origin.textContent = `📍 ${product.origin ?? 'España'}`

  const seller = document.createElement('p')
  seller.className = 'product-seller'
  seller.textContent = `👨‍🌾 ${product.seller ?? 'Agricultor'}`

  const rating = createProductRating(product)

  const priceContainer = document.createElement('div')
  priceContainer.className = 'product-price'

  const price = document.createElement('span')
  price.className = 'price'
  price.textContent = `€${Number(product.price ?? 0).toFixed(2)}`

  const unit = document.createElement('span')
  unit.className = 'unit'
  unit.textContent = ' / kg'

  priceContainer.appendChild(price)
  priceContainer.appendChild(unit)

  const addToCartBtn = document.createElement('button')
  addToCartBtn.className = 'add-to-cart-btn'
  addToCartBtn.textContent = '🛒 Añadir al Carrito'
  addToCartBtn.onclick = () => addToCart(product)

  productContent.appendChild(title)
  productContent.appendChild(seasonTag)
  productContent.appendChild(origin)
  productContent.appendChild(seller)
  productContent.appendChild(rating)
  productContent.appendChild(priceContainer)
  productContent.appendChild(addToCartBtn)

  productCard.appendChild(productImage)
  productCard.appendChild(productContent)

  return productCard
}

function createProductRating(product) {
  const rating = document.createElement('div')
  rating.className = 'product-rating'

  const stars = document.createElement('div')
  stars.className = 'stars'
  stars.innerHTML = generateStars(product.stars ?? 0)

  const reviews = document.createElement('span')
  reviews.className = 'reviews'
  reviews.textContent = product.reviews ? `(${product.reviews} valoraciones)` : ''

  rating.appendChild(stars)
  rating.appendChild(reviews)
  return rating
}

function generateStars(rating) {
  let html = ''
  for (let i = 1; i <= 5; i++) {
    html += i <= rating
      ? '<span class="star filled">★</span>'
      : '<span class="star">☆</span>'
  }
  return html
}

// ── CARRITO ───────────────────────────────────────────────────────────────────

async function addToCart(producto) {
  if (!producto.id) {
    alert('Este producto no está disponible para compra en este momento.')
    return
  }

  try {
    const res   = await fetch(`${API_BASE}/api/productos/${producto.id}/cajas`)
    const cajas = await res.json()
    if (Array.isArray(cajas) && cajas.length > 0) {
      mostrarSelectorCajas(producto, cajas)
      return
    }
  } catch (_) { /* sin conexión → usar caja por defecto */ }

  const precioBase = producto.price ?? producto.precio_por_kg ?? 0
  mostrarSelectorCajas(producto, [
    { id: 'default-1kg', kg: 1, precio_total: precioBase, descuento: 0 }
  ])
}

function mostrarSelectorCajas(producto, cajas) {
  document.getElementById('fh-cajas-modal')?.remove()

  const nombre  = producto.name ?? producto.nombre ?? 'Producto'
  const overlay = document.createElement('div')
  overlay.id    = 'fh-cajas-modal'
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,.5);
    z-index:9999; display:flex; align-items:center; justify-content:center;
  `
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px;max-width:400px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2);">
      <h3 style="margin:0 0 6px;color:#2d5016;font-size:18px;">${nombre}</h3>
      <p style="margin:0 0 18px;color:#666;font-size:14px;">Selecciona el tamaño de caja:</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        ${cajas.map(c => `
          <label style="display:flex;align-items:center;gap:12px;padding:12px 16px;
            border:2px solid #e0e0e0;border-radius:8px;cursor:pointer;transition:border-color .15s;">
            <input type="radio" name="fh-caja" value="${c.id}"
              data-kg="${c.kg}" data-precio="${Number(c.precio_total) || 0}"
              style="accent-color:#7cb342;width:16px;height:16px;">
            <span>
              <strong>${c.kg} kg</strong> —
              <span style="color:#2d6a4f;font-weight:700;">€${Number(c.precio_total).toFixed(2)}</span>
              ${c.descuento > 0
                ? `<span style="background:#e8f5e8;color:#2d6a4f;font-size:11px;
                    padding:2px 6px;border-radius:4px;margin-left:6px;">${c.descuento}% dto</span>`
                : ''}
              <br><small style="color:#aaa;">€${(c.precio_total / c.kg).toFixed(2)}/kg</small>
            </span>
          </label>`).join('')}
      </div>
      <div style="display:flex;gap:10px;">
        <button id="fh-cajas-cancel" style="flex:1;padding:12px;background:#f0f0f0;
          border:none;border-radius:8px;cursor:pointer;font-size:15px;">Cancelar</button>
        <button id="fh-cajas-ok" style="flex:2;padding:12px;background:#2d6a4f;
          color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:600;">
          Añadir al carrito</button>
      </div>
    </div>`

  document.body.appendChild(overlay)

  overlay.querySelectorAll('input[name="fh-caja"]').forEach(r =>
    r.addEventListener('change', () => {
      overlay.querySelectorAll('label').forEach(l => l.style.borderColor = '#e0e0e0')
      r.closest('label').style.borderColor = '#7cb342'
    })
  )

  document.getElementById('fh-cajas-cancel').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  document.getElementById('fh-cajas-ok').addEventListener('click', () => {
    const sel = overlay.querySelector('input[name="fh-caja"]:checked')
    if (!sel) { alert('Selecciona una opción.'); return }

    import('./carrito.js').then(({ añadirAlCarrito }) => {
      añadirAlCarrito({
        producto_id:    producto.id,
        agricultor_id:  producto.agricultor_id ?? null,
        nombre:         `${nombre} (${Number(sel.dataset.kg)}kg)`,
        precio_unidad:  Number(sel.dataset.precio),
        nombre_opcion:  `Caja ${sel.dataset.kg}kg`,
        opcion_caja_id: sel.value
      })
      actualizarBadge()
      overlay.remove()
      mostrarToast(`${nombre} añadido al carrito`)
    })
  })
}

function mostrarToast(mensaje) {
  const t = document.createElement('div')
  t.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#2d5016;color:#fff;padding:12px 24px;border-radius:8px;
    font-size:14px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,.2);
    transition:opacity .3s ease;
  `
  t.textContent = mensaje
  document.body.appendChild(t)
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300) }, 2500)
}

// ── SECCIONES ESTÁTICAS ───────────────────────────────────────────────────────

function createSubscriptionSection() {
  const app = document.getElementById('app')

  const subscriptionSection = document.createElement('div')
  subscriptionSection.className = 'subscription-section'

  const subscriptionCards = document.createElement('div')
  subscriptionCards.className = 'subscription-cards'

  const card1 = document.createElement('div')
  card1.className = 'subscription-card'

  const text1 = document.createElement('div')
  text1.className = 'text'

  const h2 = document.createElement('h2')
  h2.textContent = 'Suscripción a fruta ecológica de temporada'

  const p1 = document.createElement('p')
  p1.textContent = 'Recibe cada mes una caja con las 3 frutas que mejor estén de todas las fincas que visitan nuestro equipo de ingenieros agrónomos.'

  const btn1 = document.createElement('button')
  btn1.textContent = 'Ver la caja de este mes'
  btn1.className = 'btn'
  btn1.onclick = () => alert('Mostrando la caja de este mes')

  const img1 = document.createElement('img')
  img1.src = '/assets/img/fruta-ecologica.jpeg'
  img1.alt = 'Caja de frutas ecológicas'

  text1.appendChild(h2)
  text1.appendChild(p1)
  text1.appendChild(btn1)
  card1.appendChild(text1)
  card1.appendChild(img1)

  const card2 = document.createElement('div')
  card2.className = 'subscription-card'

  const text2 = document.createElement('div')
  text2.className = 'text'

  const h3 = document.createElement('h3')
  h3.textContent = 'Adopta un árbol con tu nombre'

  const p2 = document.createElement('p')
  p2.textContent = 'Empieza una relación que da frutos. Cuando adoptas no solo recibes fruta fresca a lo largo de toda la temporada, sino que permites que el agricultor se planifique mejor y reciba unos ingresos más justos.'

  const btn2 = document.createElement('button')
  btn2.textContent = 'Adopta un árbol'
  btn2.className = 'btn'
  btn2.onclick = () => alert('¡Gracias por adoptar un árbol! 🌳')

  const img2 = document.createElement('img')
  img2.src = '/assets/img/adopta-un-arbol.jpeg'
  img2.alt = 'Árbol adoptado con tu nombre'

  text2.appendChild(h3)
  text2.appendChild(p2)
  text2.appendChild(btn2)
  card2.appendChild(text2)
  card2.appendChild(img2)

  subscriptionCards.appendChild(card1)
  subscriptionCards.appendChild(card2)
  subscriptionSection.appendChild(subscriptionCards)
  app.appendChild(subscriptionSection)
}

function createCommunitySection() {
  const app = document.getElementById('app')

  const communitySection = document.createElement('div')
  communitySection.className = 'community-section'

  const container = document.createElement('div')
  container.className = 'suscription-container'

  const h2 = document.createElement('h2')
  h2.textContent = 'Únete a la Comunidad'

  const p = document.createElement('p')
  p.textContent = 'Recibe noticias de nuestros agricultores y de los productos que crecen en sus campos'

  const form = document.createElement('form')
  form.className = 'subs-form'

  function crearInputGroup(labelText, inputId, type, placeholder, required = false) {
    const div = document.createElement('div')
    div.className = 'input-group' + (type === 'email' ? ' email' : '')

    const label = document.createElement('label')
    label.textContent = labelText
    label.htmlFor = inputId

    const input = document.createElement('input')
    input.type = type
    input.id = inputId
    input.placeholder = placeholder
    if (required) input.required = true

    div.appendChild(label)
    div.appendChild(input)
    return div
  }

  form.appendChild(crearInputGroup('Nombre', 'nombre', 'text', 'Nombre', true))
  form.appendChild(crearInputGroup('Apellido', 'apellido', 'text', 'Apellidos (Opcional)'))
  form.appendChild(crearInputGroup('Correo Electrónico', 'email', 'email', 'Correo Electrónico', true))

  const divButton = document.createElement('div')
  divButton.className = 'button-group'
  const btnForm = document.createElement('button')
  btnForm.type = 'submit'
  btnForm.textContent = 'Inscríbete'
  btnForm.className = 'btn'
  divButton.appendChild(btnForm)
  form.appendChild(divButton)

  const divCheckbox = document.createElement('div')
  divCheckbox.className = 'checkbox-group'
  const checkboxLabel = document.createElement('label')
  checkboxLabel.className = 'checkbox-label'
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.required = true
  const linkCondiciones = document.createElement('a')
  linkCondiciones.href = '#'
  linkCondiciones.textContent = 'condiciones'
  linkCondiciones.className = 'link'
  const linkPrivacidad = document.createElement('a')
  linkPrivacidad.href = '#'
  linkPrivacidad.textContent = 'políticas de privacidad'
  linkPrivacidad.className = 'link'
  checkboxLabel.appendChild(checkbox)
  checkboxLabel.appendChild(document.createTextNode('He leído y acepto las '))
  checkboxLabel.appendChild(linkCondiciones)
  checkboxLabel.appendChild(document.createTextNode(' y las '))
  checkboxLabel.appendChild(linkPrivacidad)
  checkboxLabel.appendChild(document.createTextNode('.'))
  divCheckbox.appendChild(checkboxLabel)

  form.addEventListener('submit', e => { e.preventDefault(); alert('¡Te has inscrito a la Comunidad! 🎉'); form.reset() })

  container.appendChild(h2)
  container.appendChild(p)
  container.appendChild(form)
  container.appendChild(divCheckbox)
  communitySection.appendChild(container)
  app.appendChild(communitySection)
}

function createFooter() {
  const footer = document.getElementById('footer')
  const p1 = document.createElement('p')
  p1.innerHTML = '&copy; 2025 FarmerHand - De la huerta a tus manos 🌱'
  const p2 = document.createElement('p')
  p2.textContent = 'Conectando agricultores con consumidores'
  footer.appendChild(p1)
  footer.appendChild(p2)
}


// ── MENÚ MÓVIL ────────────────────────────────────────────────────────────────

function configurarMenuMovil() {
  const hamburguesa = document.getElementById('burger')
  const enlacesNav  = document.getElementById('navLinks')
  if (!hamburguesa || !enlacesNav) return
  hamburguesa.addEventListener('click', () => {
    hamburguesa.classList.toggle('active')
    enlacesNav.classList.toggle('active')
  })
}


// ── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  createNavigation()
  initDrawer()
  const container = createHeroSection()
  createProductsSection(container)
  createFilters()
  createProductsWrapper()
  createSubscriptionSection()
  createCommunitySection()
  createFooter()
  configurarMenuMovil()

  try {
    const data      = await fetchProductos()
    const productos = data.map(adaptarProducto)
    renderProducts(productos)
    setupFilters(productos)
  } catch {
    renderProducts([])
    setupFilters([])
  }
})
