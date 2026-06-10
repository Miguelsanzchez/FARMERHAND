const https = require('https')

function parseFrom(from) {
  const nameMatch = from.match(/^"([^"]+)"/)
  const emailMatch = from.match(/<([^>]+)>/)
  return {
    name: nameMatch ? nameMatch[1] : 'FarmerHand',
    email: emailMatch ? emailMatch[1] : from
  }
}

const transporter = {
  sendMail({ from, to, subject, html }) {
    const sender = parseFrom(from)
    const body = JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html
    })

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'Content-Length': Buffer.byteLength(body)
        }
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data)
          else reject(new Error(`Brevo API ${res.statusCode}: ${data}`))
        })
      })

      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }
}

module.exports = transporter
