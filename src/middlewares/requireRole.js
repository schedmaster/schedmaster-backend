// ✅ FIX T12: restringe una ruta a ciertos id_rol. Debe usarse SIEMPRE
// después de authMiddleware, ya que depende de req.user.
// Uso: requireRole(4) o requireRole([3, 4])
function requireRole(idsPermitidos) {
  const permitidos = Array.isArray(idsPermitidos) ? idsPermitidos : [idsPermitidos];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!permitidos.includes(req.user.id_rol)) {
      return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
    }

    next();
  };
}

module.exports = requireRole;
