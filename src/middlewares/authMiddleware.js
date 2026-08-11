const jwt = require('jsonwebtoken');

// ✅ FIX T12 / T4: valida que la petición traiga un JWT válido antes de
// llegar al controller. Sin esto, cualquiera podía llamar rutas de
// administración sin ninguna sesión.
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id_usuario: payload.id_usuario, id_rol: payload.id_rol };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

module.exports = authMiddleware;
