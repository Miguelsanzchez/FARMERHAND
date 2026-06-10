const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS
  }
})

module.exports = transporter
