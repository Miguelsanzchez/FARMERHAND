 const express  = require('express')
  const router   = express.Router()
  const bcrypt   = require('bcrypt')
  const jwt      = require('jsonwebtoken')
  const supabase = require('../config/supabase')
  const transporter = require('../config/email')
  const crypto = require('crypto')

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
      
  const verification_token = crypto.randomBytes(32).toString('hex')
            const token_expira_en  = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const { data, error } = await supabase
          .from('usuarios')
          .insert([{
            nombre: nombre.trim(),
            email: email.trim().toLowerCase(),
            password_hash,
            rol: 'consumidor',
            verification_token,
            token_expira_en,
            email_verificado: false
          
          }])
          .select()
          .single()

     if (error) {
        if (error.code === '23505')
            return res.status(400).json({ error: 'El email ya esta registrado' })
        return res.status(500).json({ error: 'Error al crear el usuario'})
     }

     const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; 
     const enlace = `${FRONTEND_URL}/pages/verificar-email.html?token=${verification_token}`
     

     try {
        await transporter.sendMail({
            from:  '"FarmerHand" <farmerhand.app@gmail.com>',
            to: data.email,
            subject: 'Verifica tu cuenta en FarmerHand',
            html: `
             <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;">
                       <h2 style="color:#2d5016;">¡Hola, ${data.nombre}!</h2>
                       <p>Haz clic para verificar tu cuenta. El enlace caduca en 24 horas.</p>
                       <a href="${enlace}"
                          style="display:inline-block;margin:24px 0;padding:14px 28px;
                                 background:#2d5016;color:#fff;border-radius:8px;
                                 text-decoration:none;font-weight:600;">
                           Verificar mi cuenta
                       </a>
                       <p style="color:#999;font-size:12px;">Si no creaste esta cuenta, ignora este mensaje.</p>
                   </div>
                   `
  })

        } catch (emailErr) {
         console.error('Error enviando email:', emailErr.message)    
          }
     return res.status(201).json({ mensaje: 'Cuenta creada exitosamente.Revisa tu email para verificar tu cuenta.'})
     })



     // GET /API/auth/verify-email?token=...
     router.get('/verificar-email', async (req, res) => {
        const { token } = req.query
        
        if (!token)
            return res.status(400).json({ error: 'Token requerido'})

        const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id, email_verificado, token_expira_en')
        .eq('verification_token',token)
        .maybeSingle()

        if (error)
            return res.status(500).json({ error: 'Error interno del servidor'})
        if (!usuario)
            return res.status(400).json({ error: 'Enlace inválido o ya utilizado' })

        if (usuario.email_verificado)
            return res.status(400).json ({ error: 'Esta cuenta ya esta verificada'})

        if (new Date() > new Date(usuario.token_expira_en))
            return res.status(400).json({ error: 'El enlace ha caducado. Registrarte de nuevo.' })

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
            email_verificado: true,
            verification_token: null,
            token_expira_en: null
        })
        .eq('id', usuario.id)

        if (updateError)
        return res.status(500).json({ error: 'Error al verificar la cuenta'})
     
        return res.json({ mensaje: 'Email verificado correctamente. Ya puedes iniciar sesión.'})
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
      if (!data.email_verificado)
        return res.status(403).json({ error: 'Debes verificar tu email antes de entrar. Revisa tu bandeja de entrada.'})

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