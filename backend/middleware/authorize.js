function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso' })
    }
    next()
  }
}

module.exports = authorize
