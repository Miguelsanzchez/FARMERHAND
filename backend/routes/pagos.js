const express = require('express')
const rateLimit = require('express-rate-limit')
const router = express.Router()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const verificarToken = require('../middleware/auth')
const authorize = require('../middleware/authorize')

const pagosLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes de pago. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
})

// POST /api/pagos/webhook
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    let event

    try {
      const signature = req.headers['stripe-signature']
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Webhook error:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    if (event.type === 'payment_intent.succeeded') {
      console.log('Pago exitoso:', event.data.object.id)
    }

    res.json({ received: true })
  }
)

// POST /api/pagos/crear-intent
router.post('/crear-intent',
  pagosLimiter,
  verificarToken,
  authorize('consumidor', 'agricultor'),
  async (req, res) => {
    try {
      const amount = Math.round(Number(req.body?.amount || 0))

      if (amount <= 0) {
        return res.status(400).json({ error: 'El importe debe ser mayor que 0' })
      }

      if (amount > 1_000_000) {
        return res.status(400).json({ error: 'El importe supera el límite permitido' })
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'eur'
      })

      res.json({ clientSecret: paymentIntent.client_secret })

    } catch (err) {
      console.error('Error creando PaymentIntent:', err.message)
      res.status(500).json({ error: 'Error al procesar el pago' })
    }
  }
)

module.exports = router
