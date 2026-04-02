const prisma = require('../../prisma/client')
const { evaluarUsuario } = require('../lib/neurona')

// ==========================================
// HELPER — verificar lugares disponibles
// ==========================================
const verificarLugares = async (id_horario, diasIds, client = prisma) => {

  const horario = await client.horario.findUnique({
    where: { id_horario: parseInt(id_horario) }
  })

  if (!horario) throw new Error('Horario no encontrado')

  let minimoDisponible = Infinity

  for (const id_dia of diasIds) {

    const ocupados = await client.inscripcion.count({
      where: {
        id_horario: parseInt(id_horario),
        estado: 'aprobado',
        diasSeleccionados: {
          some: { id_dia: parseInt(id_dia) }
        }
      }
    })

    const disponibles = horario.capacidad_maxima - ocupados  // ← corregido

    if (disponibles < minimoDisponible) minimoDisponible = disponibles

  }

  return {
    disponibles: minimoDisponible,
    capacidad: horario.capacidad_maxima                      // ← corregido
  }

}

// ==========================================
// 1. OBTENER TODAS LAS INSCRIPCIONES PENDIENTES
// ==========================================
exports.obtenerPendientes = async (req, res) => {
  try {

    const inscripcionesPendientes = await prisma.inscripcion.findMany({
      where: { estado: 'pendiente' },
      include: {
        usuario: { include: { asistencias: true } },
        horario: true,
        diasSeleccionados: { include: { dia: true } }
      }
    })

    const datosFormateados = inscripcionesPendientes.map(insc => {

      const asistencias = insc.usuario.asistencias || []
      const asistidas = asistencias.filter(a => a.asistio).length
      const faltas = asistencias.length - asistidas

      let score = null
      let prioridadCalculada = 'normal'

      if (asistencias.length > 0) {
        score = evaluarUsuario({ asistencias: asistidas, faltas })
        if (score >= 0.8) prioridadCalculada = 'alta'
        else if (score >= 0.5) prioridadCalculada = 'media'
        else prioridadCalculada = 'baja'
      }

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
        score: score !== null ? Number(score.toFixed(3)) : null,
        asistencias: asistidas,
        faltas,
        estado: insc.estado,

        horario: {
          id_horario: insc.horario?.id_horario ?? null,
          hora_inicio: insc.horario?.hora_inicio ?? null,
          hora_fin: insc.horario?.hora_fin ?? null
        },

        diasSeleccionados: insc.diasSeleccionados.map(d => ({
          dia: {
            id_dia: d.dia.id_dia,
            nombre: d.dia.nombre
          }
        }))
      }

    })

    res.status(200).json(datosFormateados)

  } catch (error) {
    console.error('Error al obtener inscripciones:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// ==========================================
// 2. APROBAR UNA INSCRIPCIÓN PENDIENTE
// ==========================================
exports.aceptarInscripcion = async (req, res) => {
  try {

    const { id_inscripcion } = req.body

    if (!id_inscripcion) {
      return res.status(400).json({ message: 'id_inscripcion requerido' })
    }

    const inscripcion = await prisma.inscripcion.findUnique({
      where: { id_inscripcion: parseInt(id_inscripcion) },
      include: {
        diasSeleccionados: { include: { dia: true } }
      }
    })

    if (!inscripcion) {
      return res.status(404).json({ message: 'Inscripción no encontrada' })
    }

    if (!inscripcion.id_horario) {
      return res.status(400).json({ message: 'La inscripción no tiene horario asignado' })
    }

    // ✅ Verificar capacidad antes de aprobar
    const diasIds = inscripcion.diasSeleccionados.map(d => d.dia.id_dia)
    const { disponibles } = await verificarLugares(inscripcion.id_horario, diasIds)

    if (disponibles <= 0) {
      return res.status(409).json({
        message: 'Los lugares en este horario han sido cubiertos',
        disponibles: 0
      })
    }

    const inscripcionActualizada = await prisma.inscripcion.update({
      where: { id_inscripcion: parseInt(id_inscripcion) },
      data: { estado: 'aprobado', fecha_decision: new Date() },
      include: { usuario: true }
    })

    await prisma.usuario.update({
      where: { id_usuario: inscripcionActualizada.usuario.id_usuario },
      data: { activo: true }
    })

    res.status(200).json({
      message: 'Inscripción aprobada correctamente',
      disponibles: disponibles - 1
    })

  } catch (error) {
    console.error('Error al aprobar inscripción:', error)
    res.status(500).json({ message: 'Error al aprobar la inscripción' })
  }
}

// ==========================================
// 3. RECHAZAR UNA INSCRIPCIÓN PENDIENTE
// ==========================================
exports.rechazarInscripcion = async (req, res) => {
  try {

    const { id_inscripcion } = req.body

    if (!id_inscripcion) {
      return res.status(400).json({ message: 'id_inscripcion requerido' })
    }

    await prisma.inscripcion.update({
      where: { id_inscripcion: parseInt(id_inscripcion) },
      data: { estado: 'rechazado', fecha_decision: new Date() }
    })

    res.status(200).json({ message: 'Inscripción rechazada correctamente' })

  } catch (error) {
    console.error('Error al rechazar inscripción:', error)
    res.status(500).json({ message: 'Error al rechazar la inscripción' })
  }
}

// ==========================================
// 4. CONSULTAR LUGARES DISPONIBLES
// ==========================================
exports.lugaresDisponibles = async (req, res) => {
  try {

    const { id_horario, id_dia } = req.query

    if (!id_horario || !id_dia) {
      return res.status(400).json({ message: 'Faltan parámetros: id_horario e id_dia' })
    }

    const { disponibles, capacidad } = await verificarLugares(id_horario, [id_dia])

    res.status(200).json({ disponibles, capacidad })

  } catch (error) {
    console.error('Error al consultar lugares:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}