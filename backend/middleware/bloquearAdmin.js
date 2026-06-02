function bloquearAdmin(req, res, next) {
  if (req.usuario?.rol === 'admin') {
    return res.status(403).json({ error: 'Los administradores no pueden realizar compras' })
  }
  next()
}

module.exports = bloquearAdmin
