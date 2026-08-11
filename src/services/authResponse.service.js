const jwt = require('jsonwebtoken');

function buildLoginResponse(user) {
  const usuarioSeguro = { ...user };
  delete usuarioSeguro.contrasena;

  // ✅ FIX T12 / T4: se firma un JWT con id_usuario e id_rol para que el
  // backend pueda verificar identidad y rol en cada request, en vez de
  // confiar en el objeto "usuario" que el frontend guarda en localStorage.
  const token = jwt.sign(
    { id_usuario: user.id_usuario, id_rol: user.id_rol },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  if (user.id_rol === 3 || user.id_rol === 4) {
    return {
      status: user.activo ? 'approved' : 'pending',
      usuario: usuarioSeguro,
      token
    };
  }

  const ultimaInscripcion = user.inscripciones
    ?.sort((a, b) => new Date(b.fecha_inscripcion) - new Date(a.fecha_inscripcion))[0];

  const estadoInscripcion = ultimaInscripcion ? ultimaInscripcion.estado : 'pendiente';

  const propuestaAprobada = ultimaInscripcion?.propuestas?.find(
    (propuesta) => propuesta.estado === 'aprobado'
  );

  return {
    status: estadoInscripcion === 'aprobado' ? 'approved' : 'pending',
    usuario: {
      ...usuarioSeguro,
      estadoInscripcion,
      ultimaInscripcion,
      propuestaAprobada
    },
    token
  };
}

module.exports = {
  buildLoginResponse
};