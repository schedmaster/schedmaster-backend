const prisma = require('../../prisma/client')

// 🧠 importar neurona
const { evaluarUsuario } = require('../lib/neurona')

// ==========================================
// 1. OBTENER TODAS LAS INSCRIPCIONES PENDIENTES
// ==========================================
exports.obtenerPendientes = async (req, res) => {
  try {
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

    // =========================
    // 🧠 PASO 1: calcular scores
    // =========================
    const conScore = inscripcionesPendientes.map(insc => {
      const asistencias = insc.usuario.asistencias || []

      const asistidas = asistencias.filter(a => a.asistio).length
      const faltas = asistencias.length - asistidas

      const score = evaluarUsuario({
        asistencias: asistidas,
        faltas: faltas
      })

      return {
        ...insc,
        score,
        asistidas,
        faltas
      }
    })

    // =========================
    // 🧠 PASO 2: agrupar por horario
    // =========================
    const grupos = {}

    conScore.forEach(insc => {
      const key = insc.id_horario
      if (!grupos[key]) grupos[key] = []
      grupos[key].push(insc)
    })

    // =========================
    // 🧠 PASO 3: auto-aprobar por grupo
    // =========================
    for (const horarioId in grupos) {
      const grupo = grupos[horarioId]

      // ordenar por score (mejores primero)
      grupo.sort((a, b) => b.score - a.score)

      const capacidad = grupo[0].horario.capacidad_maxima
      const limiteAuto = Math.max(capacidad - 2, 0)

      // contar ya aprobados
      const yaAprobados = await prisma.inscripcion.count({
        where: {
          id_horario: parseInt(horarioId),
          estado: 'aprobado'
        }
      })

      let disponibles = limiteAuto - yaAprobados

      for (let i = 0; i < grupo.length; i++) {
        if (disponibles <= 0) break

        const insc = grupo[i]

        // solo auto-aprobar si score alto
        if (insc.score >= 0.8) {
          await prisma.inscripcion.update({
            where: {
              id_inscripcion: insc.id_inscripcion
            },
            data: {
              estado: 'aprobado',
              fecha_decision: new Date()
            }
          })

          // activar usuario
          await prisma.usuario.update({
            where: {
              id_usuario: insc.usuario.id_usuario
            },
            data: {
              activo: true
            }
          })

          disponibles--
        }
      }
    }

    // =========================
    // 🧾 PASO 4: devolver datos
    // =========================
    const datosFormateados = conScore.map(insc => {
      let prioridadCalculada = 'baja'

      if (insc.score >= 0.8) prioridadCalculada = 'alta'
      else if (insc.score >= 0.5) prioridadCalculada = 'media'

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
        score: Number(insc.score.toFixed(3)),
        asistencias: insc.asistidas,
        faltas: insc.faltas,

        estado: insc.estado,

        horario: {
          hora_inicio: insc.horario ? insc.horario.hora_inicio : null,
          hora_fin: insc.horario ? insc.horario.hora_fin : null
        },

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