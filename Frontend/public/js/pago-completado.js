import { API_BASE as BASE_URL } from './config.js'
const token = localStorage.getItem('token')

const params = new URLSearchParams(window.location.search)
const paymentIntentId = params.get('payment_intent')
const estado = params.get('redirect_status')

async function confirmarPedido() {
  if (estado !== 'succeeded') {
    document.getElementById('titulo').textContent = 'Pago fallido'
    document.getElementById('descripcion').textContent =
      'No se pudo procesar el pago.'
    return
  }

  const carrito = JSON.parse(localStorage.getItem('carrito') || '[]')
  const direccion = localStorage.getItem('direccion_envio') || 'Sin dirección'

  if (!carrito.length || !paymentIntentId) {
    document.getElementById('titulo').textContent = 'Pago recibido'
    document.getElementById('descripcion').textContent =
      'Pago procesado correctamente.'
    return
  }

  try {
    const resp = await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        direccion_envio: direccion,
        stripe_payment_id: paymentIntentId,
        items: carrito
      })
    })

    if (resp.ok) {
      localStorage.removeItem('carrito')
      localStorage.removeItem('direccion_envio')

      document.getElementById('titulo').textContent = '¡Pedido confirmado!'
      document.getElementById('descripcion').textContent =
        'Tu pedido ha sido registrado.'
    } else {
      const err = await resp.json()

      document.getElementById('titulo').textContent =
        'Pago recibido con error'

      document.getElementById('descripcion').textContent =
        err.error || 'Error al crear pedido.'
    }
  } catch (e) {
    document.getElementById('titulo').textContent = 'Pago recibido'
    document.getElementById('descripcion').textContent =
      'Pago correcto pero error de conexión.'
  }
}

document.addEventListener('DOMContentLoaded', confirmarPedido)