const prisma = require('../../prisma/client')

// obtener todas las inscripciones pendientes para que el admin pueda aprobar o rechazar
exports.obtenerPendientes = async (req, res) => {
  try {

    // buscar inscripciones con estado pendiente
    const inscripcionesPendientes = await prisma.inscripcion.findMany({
      where: {
        estado: 'pendiente'
      },
      include: {
        usuario: {
          include: {
            asistencias: true
          }
        },
        horario: true,
        diasSeleccionados: {
          include: {
            dia: true
          }
        }
      }
    })

    // formatear datos para el frontend
    const datosFormateados = inscripcionesPendientes.map(insc => {

      // calcular número de asistencias del usuario
      const totalAsistencias = insc.usuario.asistencias
        ? insc.usuario.asistencias.length
        : 0

      // determinar prioridad automáticamente
      const prioridadCalculada = totalAsistencias > 3 ? 'alta' : 'baja'

      return {
        id_inscripcion: insc.id_inscripcion,

        usuario: {
          id_usuario: insc.usuario.id_usuario,
          nombre: insc.usuario.nombre,
          apellido_paterno: insc.usuario.apellido_paterno,
          apellido_materno: insc.usuario.apellido_materno,
          correo: insc.usuario.correo,
          id_rol: insc.usuario.id_rol
        },

        prioridad: prioridadCalculada,
        estado: insc.estado,

        // formatear horario para el frontend
        horario: {
          hora_inicio: insc.horario.hora_inicio
            ? insc.horario.hora_inicio.toTimeString().slice(0, 5)
            : null,
          hora_fin: insc.horario.hora_fin
            ? insc.horario.hora_fin.toTimeString().slice(0, 5)
            : null
        },

        // enviar días exactamente como el frontend los espera
        diasSeleccionados: insc.diasSeleccionados
      }
    })

    res.status(200).json(datosFormateados)

  } catch (error) {
    console.error('error al obtener inscripciones:', error)
    res.status(500).json({
      message: 'error interno del servidor'
    })
  }
}


// aprobar una inscripción pendiente
exports.aceptarInscripcion = async (req, res) => {
  try {

    const { id_inscripcion } = req.body

    if (!id_inscripcion) {
      return res.status(400).json({
        message: 'id_inscripcion requerido'
      })
    }

    // actualizar estado de inscripción
    const inscripcionActualizada = await prisma.inscripcion.update({
      where: {
        id_inscripcion: parseInt(id_inscripcion)
      },
      data: {
        estado: 'aprobado',
        fecha_decision: new Date()
      },
      include: {
        usuario: true
      }
    })

    // activar usuario en el sistema
    await prisma.usuario.update({
      where: {
        id_usuario: inscripcionActualizada.usuario.id_usuario
      },
      data: {
        activo: true
      }
    })

    res.status(200).json({
      message: 'inscripción aprobada correctamente'
    })

  } catch (error) {
    console.error('error al aprobar inscripción:', error)
    res.status(500).json({
      message: 'error al aprobar la inscripción'
    })
  }
}


// rechazar una inscripción pendiente
exports.rechazarInscripcion = async (req, res) => {
  try {

    const { id_inscripcion } = req.body

    if (!id_inscripcion) {
      return res.status(400).json({
        message: 'id_inscripcion requerido'
      })
    }

    // actualizar estado de inscripción
    await prisma.inscripcion.update({
      where: {
        id_inscripcion: parseInt(id_inscripcion)
      },
      data: {
        estado: 'rechazado',
        fecha_decision: new Date()
      }
    })

    res.status(200).json({
      message: 'inscripción rechazada correctamente'
    })

  } catch (error) {
    console.error('error al rechazar inscripción:', error)
    res.status(500).json({
      message: 'error al rechazar la inscripción'
    })
  }
}