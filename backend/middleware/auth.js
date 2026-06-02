const jwt = require ('jsonwebtoken')

function verificarToken (req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]

 if (!token){
    return res.status(401).json ({ error: 'Token requerido'})
 }

 try {
    const decoded = jwt.verify(token,process.env.JWT_SECRET)
    req.usuario = decoded
    next()

 } catch (error) {
    return res.status(401).json({ error: 'Token invalido o expirado'})
 }
}

module.exports = verificarToken