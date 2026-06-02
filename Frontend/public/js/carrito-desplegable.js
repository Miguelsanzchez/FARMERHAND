 import { getCarrito, guardarCarrito, getTotalCarrito, contarItems } from './carrito.js'
  import { apiFetch } from './api.js'
  import { estaAutenticado, getUsuario } from './auth.js'                                                                                                               
                                                                                                                                                            
  const STRIPE_PK = 'pk_test_51TGQw70lqcMUELNH6acCWjNq0q5cBsD2hHKq6Oc7kQIdq27JvF3GPSxqFhsO47yoOamNlwxDqvaZEoajjQgFY4hO00Uue40aRr'                           
                                                                                                                                                            
  function getFechaEntrega() {                                                                                                                              
    const d = new Date()                                                                                                                                    
    d.setDate(d.getDate() + 5)                                                                                                                            
    return d.toLocaleDateString('es-ES')                                                                                                                    
  }                                                                                                                                                       
                                                                                                                                                            
  function loadStripe() {                                                                                                                                 
    return new Promise(resolve => {                                                                                                                         
      if (window.Stripe) return resolve()
      const s = document.createElement('script')                                                                                                            
      s.src = 'https://js.stripe.com/v3/'                                                                                                                 
      s.onload = resolve                                                                                                                                  
      document.head.appendChild(s)                                                                                                                          
    })
  }                                                                                                                                                         
                                                                                                                                                          
  // ── BADGE ──────────────────────────────────────────────────                                                                                          

  export function actualizarBadge() {                                                                                                                       
    const badge = document.getElementById('fh-cart-badge')
    if (!badge) return                                                                                                                                      
    const n = contarItems()                                                                                                                                 
    badge.textContent = n                                                                                                                                 
    badge.style.display = n > 0 ? 'flex' : 'none'                                                                                                           
  }                                                                                                                                                       
                                                                                                                                                          
  // ── DRAWER ─────────────────────────────────────────────────                                                                                            
   
  export function abrirDrawer() {                                                                                                                           
    document.getElementById('fh-overlay')?.classList.add('fh-visible')                                                                                    
    document.getElementById('fh-drawer')?.classList.add('fh-open')                                                                                        
    renderDrawer()                            
  }                                       
                                                                                                                                                            
  function cerrarDrawer() {                                                                                                                                 
    document.getElementById('fh-overlay')?.classList.remove('fh-visible')                                                                                   
    document.getElementById('fh-drawer')?.classList.remove('fh-open')                                                                                       
  }                                                                                                                                                       
                                                                                                                                                          
  function renderDrawer() {                                                                                                                                 
    const carrito = getCarrito()
    const items = document.getElementById('fh-drawer-items')                                                                                                
    const footer = document.getElementById('fh-drawer-footer')                                                                                            
    const fecha = getFechaEntrega()                                                                                                                       

    if (!carrito.length) {                                                                                                                                  
      items.innerHTML = `
        <div class="fh-drawer-empty">                                                                                                                       
          <span class="material-symbols-outlined">shopping_cart</span>                                                                                    
          <p>Tu carrito está vacío</p>                                                                                                                    
          <a href="/index.html">Ver productos</a>                                                                                                           
        </div>`                           
      footer.innerHTML = ''                                                                                                                                 
      return                                                                                                                                                
    }                                                                                                                                                     
                                                                                                                                                            
    items.innerHTML = carrito.map(item => `                                                                                                               
      <div class="fh-drawer-item">                                                                                                                          
        <div class="fh-item-info">
          <p class="fh-item-nombre">${item.nombre}</p>                                                                                                      
          <p class="fh-item-precio">€${(item.precio_unidad * item.cantidad).toFixed(2)}</p>                                                               
          <p class="fh-item-detalle">${item.cantidad} × ${item.nombre_opcion ?? 'Unidad'}</p>                                                             
          <p class="fh-item-entrega">Entrega estimada: ${fecha}</p>
        </div>                                                                                                                                              
        <div class="fh-item-qty">         
          <button class="fh-qty-btn" data-id="${item.producto_id}" data-accion="restar">−</button>                                                          
          <span>${item.cantidad}</span>                                                                                                                     
          <button class="fh-qty-btn" data-id="${item.producto_id}" data-accion="sumar">+</button>                                                           
        </div>                                                                                                                                              
      </div>`).join('')                                                                                                                                     
                                                                                                                                                          
    items.querySelectorAll('.fh-qty-btn').forEach(btn =>                                                                                                    
      btn.addEventListener('click', () => cambiarCantidad(btn.dataset.id, btn.dataset.accion))                                                            
    )                                                                                                                                                       
                                          
    const total = getTotalCarrito()                                                                                                                         
    const comision = total * 0.05                                                                                                                           
                                                                                                                                                          
    footer.innerHTML = `                                                                                                                                    
      <div class="fh-drawer-resumen">                                                                                                                     
        <div class="fh-resumen-row"><span>Subtotal</span><span>€${total.toFixed(2)}</span></div>                                                            
        <div class="fh-resumen-row"><span>Comisión (5%)</span><span>€${comision.toFixed(2)}</span></div>
        <div class="fh-resumen-row fh-resumen-total"><span>Total</span><span>€${(total + comision).toFixed(2)}</span></div>                                 
      </div>                                                                                                                                                
      <button id="fh-btn-tramitar" class="fh-btn-primary fh-btn-full">Tramitar pedido →</button>`                                                         
                                                                                                                                                            
    document.getElementById('fh-btn-tramitar').addEventListener('click', () => {
      cerrarDrawer()
      abrirCheckout()
    })                                                                                                                                                    
  }                                                                                                                                                         
                                                                                                                                                          
  function cambiarCantidad(id, accion) {                                                                                                                  
    const carrito = getCarrito()          
    const idx = carrito.findIndex(i => i.producto_id === id)
    if (idx === -1) return                                                                                                                                  
    accion === 'sumar' ? carrito[idx].cantidad++ : carrito[idx].cantidad--
    if (carrito[idx].cantidad <= 0) carrito.splice(idx, 1)                                                                                                  
    guardarCarrito(carrito)                                                                                                                               
    actualizarBadge()                                                                                                                                     
    renderDrawer()                                                                                                                                          
  }                                                                                                                                                         
                                                                                                                                                            
  // ── CHECKOUT MODAL ─────────────────────────────────────────                                                                                            
                                                                                                                                                            
  function abrirCheckout() {
    if (!estaAutenticado()) {
      window.location.href = '/pages/login.html?returnTo=carrito'
      return
    }
    if (getUsuario()?.rol === 'admin') {
      window.location.replace('/pages/panel-admin.html')
      return
    }
    document.getElementById('fh-checkout').classList.add('fh-visible')
    irAPaso(1)
  }                                                                                                                                                         
                                          
  function cerrarCheckout() {                                                                                                                               
    document.getElementById('fh-checkout').classList.remove('fh-visible')                                                                                   
  }
                                                                                                                                                            
  function irAPaso(n) {                                                                                                                                   
    document.getElementById('fh-paso-1').style.display = n === 1 ? 'block' : 'none'
    document.getElementById('fh-paso-2').style.display = n === 2 ? 'block' : 'none'
    document.getElementById('fh-checkout-titulo').textContent =
      n === 1 ? 'Dirección de envío' : 'Pago seguro'
  }                                                                                                                                                         
                                                                                                                                                            
  // ── PAGO ───────────────────────────────────────────────────                                                                                            
                                                                                                                                                            
  let stripe = null                                                                                                                                       
  let cardEl = null                                                                                                                                         
                                                                                                                                                          
  async function irAlPago() {
    const nombre    = document.getElementById('fh-nombre').value.trim()
    const direccion = document.getElementById('fh-dir').value.trim()                                                                                        
    const ciudad    = document.getElementById('fh-ciudad').value.trim()                                                                                   
    const cp        = document.getElementById('fh-cp').value.trim()
    const telefono  = document.getElementById('fh-tel').value.trim()                                                                                        
                                              
    if (!nombre || !direccion || !ciudad || !cp || !telefono) {                                                                                             
      document.getElementById('fh-addr-err').textContent = 'Completa todos los campos.'                                                                   
      return                                                                                                                                                
    }                                                                                                                                                     
    document.getElementById('fh-addr-err').textContent = ''                                                                                                 
    localStorage.setItem('direccion_envio', `${nombre} — ${direccion}, ${cp} ${ciudad} (Tel: ${telefono})`)                                                 
                                              
    irAPaso(2)                                                                                                                                              
                                                                                                                                                          
    const carrito = getCarrito()                                                                                                                            
    const total = getTotalCarrito()       
    document.getElementById('fh-pago-resumen').innerHTML = `                                                                                                
      <div class="fh-pago-lista">                                                                                                                           
        ${carrito.map(i => `                  
          <div class="fh-pago-item">                                                                                                                        
            <span>${i.nombre} <em>×${i.cantidad}</em></span>                                                                                              
            <span>€${(i.precio_unidad * i.cantidad).toFixed(2)}</span>                                                                                      
          </div>`).join('')}                  
      </div>                                                                                                                                                
      <div class="fh-pago-total">Total: <strong>€${(total * 1.05).toFixed(2)}</strong></div>`                                                               
                                                                                                                                                            
    await loadStripe()                                                                                                                                      
    if (!stripe) stripe = window.Stripe(STRIPE_PK)                                                                                                          
                                                                                                                                                            
    const elements = stripe.elements()    
    cardEl = elements.create('card', {                                                                                                                      
      hidePostalCode: true,                                                                                                                                 
      style: {                            
        base: { fontSize: '16px', color: '#32325d', '::placeholder': { color: '#aab7c4' } },                                                                
        invalid: { color: '#e53935' }                                                                                                                       
      }                                   
    })                                                                                                                                                      
    document.getElementById('fh-card-el').innerHTML = ''                                                                                                    
    cardEl.mount('#fh-card-el')               
    cardEl.on('change', e => {                                                                                                                              
      document.getElementById('fh-card-err').textContent = e.error?.message ?? ''                                                                         
    })                                                                                                                                                      
  }                                       
                                                                                                                                                            
  async function procesarPago() {
    const btn = document.getElementById('fh-btn-pagar')                                                                                                     
    btn.disabled = true
    btn.textContent = 'Procesando...'                                                                                                                       
    document.getElementById('fh-card-err').textContent = ''                                                                                               

    const carrito = getCarrito()                                                                                                                            
                                          
    try {                                                                                                                                                   
      const totalConComision = Math.round(getTotalCarrito() * 1.05 * 100)
      const { clientSecret } = await apiFetch('/api/pagos/crear-intent', {
        method: 'POST',
        body: JSON.stringify({ amount: totalConComision })
      })                                                                                                                                                  
                                                                                                                                                            
     const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: { card: cardEl }
})

if (error) {
  document.getElementById('fh-card-err').textContent = error.message
  btn.disabled = false
  btn.textContent = 'Pagar ahora'
  return
}

if (!paymentIntent || paymentIntent.status !== "succeeded") {
  document.getElementById('fh-card-err').textContent = 'El pago no se ha completado'
  btn.disabled = false
  btn.textContent = 'Pagar ahora'
  return
}


await apiFetch('/api/pedidos', {
  method: 'POST',
  body: JSON.stringify({
    direccion_envio: localStorage.getItem('direccion_envio') ?? 'Sin especificar',
    stripe_payment_id: paymentIntent.id,
    items: carrito.map(i => ({
      producto_id: i.producto_id,
      agricultor_id: i.agricultor_id,
      cantidad: i.cantidad,
      precio_unidad: i.precio_unidad
    }))
  })
})

      guardarCarrito([])                                                                                                                                  
      actualizarBadge()                   
      cerrarCheckout()
      document.getElementById('fh-exito').classList.add('fh-visible')                                                                                       
                                              
    } catch (err) {                                                                                                                                         
      document.getElementById('fh-card-err').textContent = `Error: ${err.message}`                                                                        
      btn.disabled = false                                                                                                                                  
      btn.textContent = 'Pagar ahora'
    }                                                                                                                                                       
  }                                                                                                                                                       

  // ── INIT ───────────────────────────────────────────────────                                                                                            
  
  export function initDrawer() {                                                                                                                            
    document.body.insertAdjacentHTML('beforeend', `                                                                                                       
      <!-- Overlay oscuro -->                 
      <div id="fh-overlay" class="fh-overlay"></div>
                                              
      <!-- Drawer lateral -->                                                                                                                               
      <div id="fh-drawer" class="fh-drawer">
        <div class="fh-drawer-header">                                                                                                                      
          <h2>Tu carrito</h2>                                                                                                                             
          <button id="fh-drawer-close" class="fh-icon-btn">✕</button>                                                                                       
        </div>                                                                                                                                            
        <div id="fh-drawer-items" class="fh-drawer-items"></div>
        <div id="fh-drawer-footer" class="fh-drawer-footer"></div>                                                                                          
      </div>                                                                                                                                                
                                                                                                                                                            
      <!-- Modal checkout -->                                                                                                                               
      <div id="fh-checkout" class="fh-modal-overlay">                                                                                                       
        <div class="fh-modal">
          <div class="fh-modal-header">                                                                                                                     
            <h2 id="fh-checkout-titulo">Dirección de envío</h2>                                                                                           
            <button id="fh-checkout-close" class="fh-icon-btn">✕</button>
          </div>                                                                                                                                            
                                          
          <!-- Paso 1: dirección -->                                                                                                                        
          <div id="fh-paso-1">                                                                                                                              
            <div class="fh-form-group">
              <label>Nombre completo</label>                                                                                                                
              <input type="text" id="fh-nombre" placeholder="María García López" />                                                                       
            </div>                            
            <div class="fh-form-group">   
              <label>Dirección</label>
              <input type="text" id="fh-dir" placeholder="Calle Mayor 24, 2ºB" />                                                                           
            </div>
            <div class="fh-form-row">                                                                                                                       
              <div class="fh-form-group">                                                                                                                 
                <label>Ciudad</label>     
                <input type="text" id="fh-ciudad" placeholder="Madrid" />
              </div>                                                                                                                                        
              <div class="fh-form-group">     
                <label>Código postal</label>                                                                                                                
                <input type="text" id="fh-cp" placeholder="28001" maxlength="5" />                                                                        
              </div>                                                                                                                                        
            </div>
            <div class="fh-form-group">                                                                                                                     
              <label>Teléfono</label>                                                                                                                     
              <input type="tel" id="fh-tel" placeholder="612 345 678" />
            </div>                                                                                                                                          
            <p id="fh-addr-err" class="fh-err"></p>
            <button id="fh-btn-continuar" class="fh-btn-primary fh-btn-full">Continuar al pago →</button>                                                   
          </div>                                                                                                                                            
                                          
          <!-- Paso 2: pago -->                                                                                                                             
          <div id="fh-paso-2" style="display:none">                                                                                                         
            <div id="fh-pago-resumen" class="fh-pago-resumen"></div>
            <div class="fh-form-group" style="margin-top:16px">                                                                                             
              <label>Datos de tarjeta</label>                                                                                                             
              <div id="fh-card-el" class="fh-card-el"></div>                                                                                                
              <p id="fh-card-err" class="fh-err"></p>                                                                                                       
            </div>                            
            <div class="fh-pago-actions">                                                                                                                   
              <button id="fh-btn-volver" class="fh-btn-secondary">← Volver</button>                                                                       
              <button id="fh-btn-pagar" class="fh-btn-primary">Pagar ahora</button>                                                                         
            </div>                                                                                                                                        
          </div>                                                                                                                                            
        </div>                                                                                                                                              
      </div>
                                                                                                                                                            
      <!-- Modal éxito -->                                                                                                                                
      <div id="fh-exito" class="fh-modal-overlay">
        <div class="fh-modal fh-modal-exito">                                                                                                               
          <div class="fh-exito-icon">✅</div> 
          <h2>¡Pedido confirmado!</h2>                                                                                                                      
          <p>Tu pago se ha procesado correctamente.</p>                                                                                                   
          <div class="fh-exito-btns">                                                                                                                       
            <a href="/pages/panel-consumidor.html" class="fh-btn-primary">Ver mis pedidos</a>
            <button id="fh-exito-cerrar" class="fh-btn-secondary">Seguir comprando</button>                                                                 
          </div>                                                                                                                                            
        </div>                            
      </div>                                                                                                                                                
    `)                                                                                                                                                      
                                                                                                                                                            
    document.getElementById('fh-overlay').addEventListener('click', cerrarDrawer)                                                                           
    document.getElementById('fh-drawer-close').addEventListener('click', cerrarDrawer)                                                                    
    document.getElementById('fh-checkout-close').addEventListener('click', cerrarCheckout)
    document.getElementById('fh-btn-continuar').addEventListener('click', irAlPago)                                                                         
    document.getElementById('fh-btn-pagar').addEventListener('click', procesarPago)
    document.getElementById('fh-btn-volver').addEventListener('click', () => irAPaso(1))                                                                    
    document.getElementById('fh-exito-cerrar').addEventListener('click', () =>                                                                              
      document.getElementById('fh-exito').classList.remove('fh-visible')
    )                                                                                                                                                       
    document.addEventListener('keydown', e => {                                                                                                             
      if (e.key !== 'Escape') return                                                                                                                        
      cerrarDrawer()                                                                                                                                        
      cerrarCheckout()                                                                                                                                      
      document.getElementById('fh-exito')?.classList.remove('fh-visible')                                                                                 
    })                                                                                                                                                      
  }