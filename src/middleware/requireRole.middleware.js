function requireRole(role) {
  return function (req, res, next) {

    if (!req.user) {
      return res.status(401).json({
        message: "Authentication gerekli"
      })
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        message: "Bu işlem için yetkiniz yok"
      })
    }

    next()
  }
}

module.exports = requireRole