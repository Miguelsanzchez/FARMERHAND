 const express  = require('express')
  const router   = express.Router()
  const bcrypt   = require('bcrypt')
  const jwt      = require('jsonwebtoken')
  const supabase = require('../config/supabase')
  const transporter = require('../config/email')

  // POST /api/auth/registro
  router.post('/registro', async (req, res) => {
      const { nombre, email, password } = req.body

      if (!nombre?.trim() || !email?.trim() || !password) {
          return res.status(400).json({ error: 'Todos los campos son obligatorios' })
      }

      if (nombre.trim().length > 100) {
          return res.status(400).json({ error: 'El nombre no puede superar 100 caracteres' })
      }

      if (email.trim().length > 255) {
          return res.status(400).json({ error: 'El email no puede superar 255 caracteres' })
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
          return res.status(400).json({ error: 'El formato del email no es válido' })
      }

      if (password.length < 6) {
          return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
      }

      const password_hash = await bcrypt.hash(password, 10)

      const { data, error } = await supabase
          .from('usuarios')
          .insert([{
              nombre: nombre.trim(),
              email:  email.trim().toLowerCase(),
              password_hash,
              rol: 'consumidor'
          }])
          .select()
          .single()

      if (error) {
          if (error.code === '23505') {
              return res.status(400).json({ error: 'El email ya está registrado' })
          }
          return res.status(500).json({ error: 'Error al crear el usuario' })
      }

      const token = jwt.sign(
          { id: data.id, rol: data.rol },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
      )

      const { password_hash: _, ...usuarioSeguro } = data

      transporter.sendMail({
        from:'"FarmerHand" <farmerhand.app@gmail.com>',
        to: data.email,
        subject: '¡Bienvenido a FarmerHand!',
        html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
              <h2 style="color:#2d5016;">¡Hola, ${data.nombre}!</h2>
              <p>Tu cuenta en <strong>FarmerHand</strong> ha sido creada correctamente.</p>
              <p>Ya puedes explorar productos frescos directamente de agricultores locales.</p>
              <a href="https://farmerhand.vercel.app" 
                 style="display:inline-block;margin-top:16px;padding:12px 24px;
                 background:#2d5016;color:#fff;border-radius:8px;text-decoration:none;">
                Ir a FarmerHand
              </a>
              <p style="margin-top:32px;color:#999;font-size:12px;">
                Si no creaste esta cuenta, ignora este mensaje.
              </p>
            </div>
          `

      }).catch(err => console.error('Email error:', err.message))
      

      
      return res.status(201).json({ token, usuario: usuarioSeguro })
  })

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
      const { email, password } = req.body

      if (!email?.trim() || !password) {
          return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
      }

      const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle()

      if (error) {
          return res.status(500).json({ error: 'Error al buscar el usuario' })
      }

      if (!data) {
          return res.status(401).json({ error: 'Email o contraseña incorrectos' })
      }

      const passwordValida = await bcrypt.compare(password, data.password_hash)

      if (!passwordValida) {
          return res.status(401).json({ error: 'Email o contraseña incorrectos' })
      }

      let token
      try {
          token = jwt.sign(
              { id: data.id, rol: data.rol },
              process.env.JWT_SECRET,
              { expiresIn: '7d' }
          )
      } catch {
          return res.status(500).json({ error: 'Error al generar el token de sesión' })
      }

      const { password_hash, ...usuarioSeguro } = data
      return res.json({ token, usuario: usuarioSeguro })
  })

  module.exports = router