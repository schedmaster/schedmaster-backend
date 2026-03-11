const prisma = require('../../prisma/client');

exports.obtenerPendientes = async (req, res) => {
  try {
    // CORRECCIÓN: Buscamos inactivos y le pedimos a Prisma su historial de asistencias
    const usuariosPendientes = await prisma.usuario.findMany({
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

    // Formateamos los datos y calculamos la prioridad inteligentemente
    const datosFormateados = usuariosPendientes.map(user => {
      
      // LÓGICA DE PRIORIDAD:
      // Contamos cuántas asistencias tiene registradas. Si no tiene historial, es 0.
      const totalAsistencias = user.asistencias ? user.asistencias.length : 0;
      
      // Si tiene más de 3 asistencias, es cliente frecuente (Alta). Si no, es esporádico (Baja).
      const prioridadCalculada = totalAsistencias > 3 ? 'alta' : 'baja';

      return {
        id: user.id_usuario,
        nombre: user.nombre,
        apellido_paterno: user.apellido_paterno,
        apellido_materno: user.apellido_materno,
        correo: user.correo,
        rol: 'estudiante', 
        division: 'DTAI', 
        carrera: 'Ingeniería',
        cuatrimestre: user.cuatrimestre ? user.cuatrimestre.toString() : '1',
        prioridad: prioridadCalculada, // La prioridad ahora se calcula sola
        registro: 'Reciente'
      };
    });

    res.status(200).json(datosFormateados);
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