const prisma = require('../../prisma/client');

exports.obtenerPendientes = async (req, res) => {
  try {
    const inscripciones = await prisma.inscripcion.findMany({
      where: {
        estado: 'pendiente' 
      },
      include: {
        usuario: true,
        horario: true,
        diasSeleccionados: { // 👈 ¡AQUÍ ESTABA EL ERROR! Ahora usa el nombre correcto
          include: {
            dia: true
          }
        }
      }
    });

    res.status(200).json(inscripciones);
  } catch (error) {
    console.error('Error al obtener inscripciones:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.aceptarInscripcion = async (req, res) => {
  try {
    const { id_inscripcion } = req.body; 
    
    const insc = await prisma.inscripcion.update({
      where: { id_inscripcion: parseInt(id_inscripcion) },
      data: { estado: 'aprobado' },
      include: { usuario: true }
    });

    await prisma.usuario.update({
      where: { id_usuario: insc.id_usuario },
      data: { activo: true }
    });

    res.status(200).json({ message: 'Inscripción aprobada exitosamente' });
  } catch (error) {
    console.error('Error al aceptar:', error);
    res.status(500).json({ message: 'Error al aceptar la inscripción' });
  }
};

exports.rechazarInscripcion = async (req, res) => {
  try {
    const { id_inscripcion } = req.body;
    
    await prisma.inscripcion.update({
      where: { id_inscripcion: parseInt(id_inscripcion) },
      data: { estado: 'rechazado' }
    });

    res.status(200).json({ message: 'Inscripción rechazada' });
  } catch (error) {
    console.error('Error al rechazar:', error);
    res.status(500).json({ message: 'Error al rechazar la inscripción' });
  }
};