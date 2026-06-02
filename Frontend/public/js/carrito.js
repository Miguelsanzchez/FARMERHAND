import { estaAutenticado, getUsuario } from './auth.js'
import { apiFetch } from './api.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── GESTIÓN DEL CARRITO (localStorage) ──

export function getCarrito() {
    return JSON.parse(localStorage.getItem('carrito') ?? '[]')
}

export function guardarCarrito(items) {
    localStorage.setItem('carrito', JSON.stringify(items))
}

export function añadirAlCarrito(producto) {
    const carrito = getCarrito()
    const existente = carrito.find(i => i.producto_id === producto.producto_id)

    if (existente) {
        existente.cantidad++
    } else {
        carrito.push({ ...producto, cantidad: 1 })
    }

    guardarCarrito(carrito)
}

export function getTotalCarrito() {
    return getCarrito().reduce((sum, i) => sum + i.precio_unidad * i.cantidad, 0)
}

export function contarItems() {
    return getCarrito().reduce((sum, i) => sum + i.cantidad, 0)
}

// ── PÁGINA DEL CARRITO ──

function init() {
    if (estaAutenticado() && getUsuario()?.rol === 'admin') {
        window.location.replace('/pages/panel-admin.html')
        return
    }

    const carritoLimpio = getCarrito().filter(i => UUID_REGEX.test(i.producto_id))
    guardarCarrito(carritoLimpio)

    if (!document.getElementById('card-element')) return

    renderCarrito()

    document.getElementById('btnTramitar')?.addEventListener('click', () => {
        window.location.href = '/pages/login.html?returnTo=carrito'
    })

    if (!estaAutenticado()) return

    const stripe = window.Stripe('pk_test_51TGQw70lqcMUELNH6acCWjNq0q5cBsD2hHKq6Oc7kQIdq27JvF3GPSxqFhsO47yoOamNlwxDqvaZEoajjQgFY4hO00Uue40aRr')

    const elements = stripe.elements()

    const cardElement = elements.create('card', {
        hidePostalCode: true,
        style: {
            base: {
                fontSize: '16px',
                color: '#32325d',
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                '::placeholder': { color: '#aab7c4' }
            },
            invalid: { color: '#e53935' }
        }
    })

    cardElement.mount('#card-element')

    cardElement.on('change', e => {
        document.getElementById('card-errors').textContent = e.error ? e.error.message : ''
    })

    document.getElementById('btnConfirmarPedido')
        ?.addEventListener('click', () => confirmarPedido(stripe, cardElement))
}

// ── RENDER CARRITO ──

function renderCarrito() {
    const carrito = getCarrito()
    const lista = document.getElementById('listaCarrito')
    const resumen = document.getElementById('resumenPedido')
    const seccionCheckout = document.getElementById('seccionCheckout')
    const msgLogin = document.getElementById('msgLogin')
    const seccionTramitar = document.getElementById('seccionTramitar')

    const auth = estaAutenticado()
    const user = getUsuario()

    if (!carrito.length) {
        lista.innerHTML = '<p class="empty-state">Tu carrito está vacío.</p>'
        resumen.innerHTML = ''
        if (seccionCheckout) seccionCheckout.style.display = 'none'
        if (seccionTramitar) seccionTramitar.style.display = 'none'
        if (msgLogin) msgLogin.style.display = 'none'
        return
    }

    lista.innerHTML = carrito.map(item => `
        <div class="carrito-item">
            <div class="item-info">
                <p>${item.nombre}</p>
                <p>€${item.precio_unidad.toFixed(2)} / kg</p>
            </div>
            <div class="item-cantidad">
                <button class="btn-cantidad" data-id="${item.producto_id}" data-accion="restar">−</button>
                <span>${item.cantidad}</span>
                <button class="btn-cantidad" data-id="${item.producto_id}" data-accion="sumar">+</button>
            </div>
        </div>
    `).join('')

    lista.querySelectorAll('.btn-cantidad').forEach(btn => {
        btn.addEventListener('click', () =>
            cambiarCantidad(btn.dataset.id, btn.dataset.accion)
        )
    })

    const total = getTotalCarrito()
    const comision = total * 0.05

    resumen.innerHTML = `
        <div>Subtotal: €${total.toFixed(2)}</div>
        <div>Comisión: €${comision.toFixed(2)}</div>
        <div><strong>Total: €${(total + comision).toFixed(2)}</strong></div>
    `

    // Checkout visible para cualquier usuario autenticado
    const puedeVerCheckout = auth

    if (puedeVerCheckout) {
        if (seccionTramitar) seccionTramitar.style.display = 'none'
        if (seccionCheckout) seccionCheckout.style.display = 'block'
        if (msgLogin) msgLogin.style.display = 'none'
    } else {
        if (seccionTramitar) seccionTramitar.style.display = 'block'
        if (seccionCheckout) seccionCheckout.style.display = 'none'
        if (msgLogin) msgLogin.style.display = 'block'
    }
}

// ── CANTIDAD ──

function cambiarCantidad(productoId, accion) {
    const carrito = getCarrito()
    const idx = carrito.findIndex(i => i.producto_id === productoId)
    if (idx === -1) return

    if (accion === 'sumar') {
        carrito[idx].cantidad++
    } else {
        carrito[idx].cantidad--
        if (carrito[idx].cantidad <= 0) carrito.splice(idx, 1)
    }

    guardarCarrito(carrito)
    renderCarrito()
}

// ── PEDIDO ──

function leerDireccion() {
    const calle = document.getElementById('calle').value.trim()
    const numero = document.getElementById('numero').value.trim()
    const ciudad = document.getElementById('ciudad').value.trim()
    const codigoPostal = document.getElementById('codigoPostal').value.trim()
    const pais = document.getElementById('pais').value.trim()

    if (!calle || !numero || !ciudad || !codigoPostal || !pais) return null

    return `${calle} ${numero}, ${codigoPostal} ${ciudad}, ${pais}`
}

async function confirmarPedido(stripe, cardElement) {
    const direccion = leerDireccion()
    if (!direccion) {
        alert('Por favor, completa todos los campos de la dirección de envío.')
        return
    }

    const btn = document.getElementById('btnConfirmarPedido')
    btn.disabled = true
    btn.textContent = 'Procesando...'

    const carrito = getCarrito()

    try {
        
        const total = carrito.reduce((sum, i) => {
            return sum + (i.precio_unidad * i.cantidad)
        }, 0)

        const { clientSecret } = await apiFetch('/api/pagos/crear-intent', {
            method: 'POST',
            body: JSON.stringify({
                amount: Math.round(total * 100)
            })
        })

        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: { card: cardElement }
        })

        if (error) {
            document.getElementById('card-errors').textContent = error.message
            btn.disabled = false
            btn.textContent = 'Confirmar y pagar'
            return
        }

        await apiFetch('/api/pedidos', {
            method: 'POST',
            body: JSON.stringify({
                direccion_envio: direccion,
                items: carrito.map(i => ({
                    producto_id: i.producto_id,
                    agricultor_id: i.agricultor_id,
                    cantidad: i.cantidad,
                    precio_unidad: i.precio_unidad
                })),
                stripe_payment_id: paymentIntent.id
            })
        })

        guardarCarrito([])

        alert('¡Pago realizado correctamente! Puedes ver el estado en tu panel.')
        window.location.href = '/pages/panel-consumidor.html'

    } catch (err) {
        console.error('Error al confirmar pedido:', err)
        alert(`Error al procesar el pedido: ${err.message}`)
        btn.disabled = false
        btn.textContent = 'Confirmar y pagar'
    }
}
document.addEventListener('DOMContentLoaded', init)