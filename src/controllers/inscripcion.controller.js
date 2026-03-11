const prisma = require('../../prisma/client');
exports.obtenerPendientes = async (req, res) => {
  try {

    const pendientes = await prisma.inscripcion.findMany({
      where: {
        estado: 'pendiente'
      },
      include: {
        usuario: {
          include: {
            asistencias: true
          }
        }
      }
    });

    const datosFormateados = pendientes.map(insc => {

      const user = insc.usuario;

      // 🔹 LÓGICA DE PRIORIDAD
      const totalAsistencias = user.asistencias ? user.asistencias.length : 0;

      const prioridadCalculada = totalAsistencias > 3 ? 'alta' : 'baja';

      return {
        id: insc.id_inscripcion,
        nombre: user.nombre,
        apellido_paterno: user.apellido_paterno,
        apellido_materno: user.apellido_materno,
        correo: user.correo,
        rol: 'estudiante',
        division: 'DTAI',
        carrera: 'Ingeniería',
        cuatrimestre: user.cuatrimestre ? user.cuatrimestre.toString() : '1',
        prioridad: prioridadCalculada,
        registro: insc.fecha_inscripcion
      };

    });

    res.status(200).json(datosFormateados);

  } catch (error) {
    console.error('Error al obtener pendientes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.aceptarInscripcion = async (req, res) => {
  try {
    const { id } = req.body;
    
    // Al aceptar, le cambiamos el activo a 'true'
    await prisma.usuario.update({
      where: { id_usuario: parseInt(id) },
      data: { activo: true }
    });

    res.status(200).json({ message: 'Usuario aprobado exitosamente' });
  } catch (error) {
    console.error('Error al aceptar:', error);
    res.status(500).json({ message: 'Error al aceptar la inscripción' });
  }
};

exports.rechazarInscripcion = async (req, res) => {
  try {
    const { id } = req.body;
    
    // Al rechazar, eliminamos ese registro de prueba
    await prisma.usuario.delete({
      where: { id_usuario: parseInt(id) }
    });

    res.status(200).json({ message: 'Usuario rechazado' });
  } catch (error) {
    console.error('Error al rechazar:', error);
    res.status(500).json({ message: 'Error al rechazar la inscripción' });
  }
};