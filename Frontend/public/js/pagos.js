import { API_BASE as BASE_URL } from './config.js'
const STRIPE_PK = 'pk_test_51TGQw70lqcMUELNH6acCWjNq0q5cBsD2hHKq6Oc7kQIdq27JvF3GPSxqFhsO47yoOamNlwxDqvaZEoajjQgFY4hO00Uue40aRr'

const token = localStorage.getItem('token')
if (!token) window.location.replace('/pages/login.html')

window.addEventListener('pageshow', e => {
  if (e.persisted && !localStorage.getItem('token')) {
    window.location.replace('/pages/login.html')
  }
})

const carrito = JSON.parse(localStorage.getItem('carrito') || '[]')

const total = carrito.reduce((s, i) => s + i.precio_unidad * i.cantidad, 0)
const totalConComision = (total * 1.05).toFixed(2)

document.getElementById('resumen').innerHTML = `
  <strong>Productos:</strong> ${carrito.length}<br>
  <strong>Total:</strong> €${totalConComision}
`

const stripe = Stripe(STRIPE_PK)
let elements
let paymentIntentId = null

async function iniciarPago() {
  const items = carrito.map(i => ({
    producto_id: i.producto_id,
    cantidad: i.cantidad
  }))

  const resp = await fetch(`${BASE_URL}/api/pagos/crear-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ items, amount: Math.round(parseFloat(totalConComision) * 100) })
  })

  const data = await resp.json()

  if (!resp.ok) {
    document.getElementById('mensaje-error').textContent = data.error
    return
  }

  paymentIntentId = data.paymentIntentId

  elements = stripe.elements({ clientSecret: data.clientSecret })
  const paymentElement = elements.create('payment')
  paymentElement.mount('#payment-element')
}

iniciarPago()

document.getElementById('form-pago').addEventListener('submit', async (e) => {
  e.preventDefault()

  const btn = document.getElementById('btn-pagar')
  btn.disabled = true
  btn.textContent = 'Procesando...'

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: window.location.origin + '/pages/pago-completo.html'
    },
    redirect: 'if_required'
  })

  if (error) {
    document.getElementById('mensaje-error').textContent = error.message
    btn.disabled = false
    btn.textContent = 'Pagar ahora'
    return
  }

  if (!paymentIntent || paymentIntent.status !== 'succeeded') {
    document.getElementById('mensaje-error').textContent = 'El pago no se ha completado'
    btn.disabled = false
    btn.textContent = 'Pagar ahora'
    return
  }

  // 👇 CREAR PEDIDO EN TU BACKEND (CLAVE)
  try {
    await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stripe_payment_id: paymentIntent.id,
        direccion_envio: 'Desde flujo pagos',
        items: carrito.map(i => ({
          producto_id: i.producto_id,
          agricultor_id: i.agricultor_id,
          cantidad: i.cantidad,
          precio_unidad: i.precio_unidad
        }))
      })
    })

    localStorage.removeItem('carrito')
    window.location.href = '/pages/pago-completo.html'

  } catch (err) {
    document.getElementById('mensaje-error').textContent = err.message
    btn.disabled = false
    btn.textContent = 'Pagar ahora'
  }
})