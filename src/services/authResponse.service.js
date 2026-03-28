function buildLoginResponse(user) {
  const { contrasena: _, ...usuarioSeguro } = user;

  if (user.id_rol === 3 || user.id_rol === 4) {
    return {
      status: user.activo ? 'approved' : 'pending',
      usuario: usuarioSeguro
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
    }
  };
}

module.exports = {
  buildLoginResponse
};
