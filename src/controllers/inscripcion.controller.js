const prisma = require('../../prisma/client')

// ==========================================
// 1. OBTENER TODAS LAS INSCRIPCIONES PENDIENTES
// ==========================================
exports.obtenerPendientes = async (req, res) => {
  try {
    // Buscar inscripciones con estado pendiente
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

    // Formatear datos para el frontend
    const datosFormateados = inscripcionesPendientes.map(insc => {
      // Calcular número de asistencias del usuario
      const totalAsistencias = insc.usuario.asistencias ? insc.usuario.asistencias.length : 0

      // Determinar prioridad automáticamente
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

        // 🟢 Corrección: Enviamos la hora directa como texto (String)
        horario: {
          hora_inicio: insc.horario ? insc.horario.hora_inicio : null,
          hora_fin: insc.horario ? insc.horario.hora_fin : null
        },

        // Enviar días exactamente como el frontend los espera
        diasSeleccionados: insc.diasSeleccionados
      }
    })

    res.status(200).json(datosFormateados)

  } catch (error) {
    console.error('Error al obtener inscripciones:', error)
    res.status(500).json({
      message: 'Error interno del servidor'
    })
  }
}

// ==========================================
// 2. APROBAR UNA INSCRIPCIÓN PENDIENTE
// ==========================================
exports.aceptarInscripcion = async (req, res) => {
  try {
    const { id_inscripcion } = req.body

    if (!id_inscripcion) {
      return res.status(400).json({
        message: 'id_inscripcion requerido'
      })
    }

    // Actualizar estado de inscripción
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

    // Activar usuario en el sistema
    await prisma.usuario.update({
      where: {
        id_usuario: inscripcionActualizada.usuario.id_usuario
      },
      data: {
        activo: true
      }
    })

    res.status(200).json({
      message: 'Inscripción aprobada correctamente'
    })

  } catch (error) {
    console.error('Error al aprobar inscripción:', error)
    res.status(500).json({
      message: 'Error al aprobar la inscripción'
    })
  }
}

// ==========================================
// 3. RECHAZAR UNA INSCRIPCIÓN PENDIENTE
// ==========================================
exports.rechazarInscripcion = async (req, res) => {
  try {
    const { id_inscripcion } = req.body

    if (!id_inscripcion) {
      return res.status(400).json({
        message: 'id_inscripcion requerido'
      })
    }

    // Actualizar estado de inscripción
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
      message: 'Inscripción rechazada correctamente'
    })

  } catch (error) {
    console.error('Error al rechazar inscripción:', error)
    res.status(500).json({
      message: 'Error al rechazar la inscripción'
    })
  }
}