const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const app = express()

app.use(helmet())

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://proyect-dom-farmerhand.vercel.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Origen no permitido por CORS'))
  },
  credentials: true
}))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
})

// Raw body para webhook de Stripe — debe ir ANTES de express.json()
app.use('/api/pagos/webhook', express.raw({ type: 'application/json' }))

app.use(express.json())

const authRoutes         = require('./routes/auth')
const agricultoresRoutes = require('./routes/agricultores')
const adminRoutes        = require('./routes/admin')
const productosRoutes    = require('./routes/productos')
const pedidosRoutes      = require('./routes/pedidos')
const valoracionesRoutes = require('./routes/valoraciones')
const pagosRoutes        = require('./routes/pagos')

app.use('/api/pagos',        pagosRoutes)
app.use('/api/auth',         authLimiter, authRoutes)
app.use('/api/agricultores', agricultoresRoutes)
app.use('/api/admin',        adminRoutes)
app.use('/api/productos',    productosRoutes)
app.use('/api/pedidos',      pedidosRoutes)
app.use('/api/valoraciones', valoracionesRoutes)

const verificarToken = require('./middleware/auth')
app.get('/', (req, res) => res.json({ mensaje: 'FarmerHand API funcionando' }))
app.get('/api/protegida', verificarToken, (req, res) => {
  res.json({ mensaje: `Hola ${req.usuario.rol}, estás autenticado` })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`))
