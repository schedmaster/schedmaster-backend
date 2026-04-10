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
// 1. OBTENER TODAS LAS INSCRIPCIONES PENDIENTES + GRAFICA
// ==========================================
exports.obtenerPendientes = async (req, res) => {
  try {

    const inscripcionesPendientes = await prisma.inscripcion.findMany({
      where: { estado: 'pendiente' },
      include: {
        usuario: {
          include: {
            asistencias: true
          }
        },
        
        horario: true,
        diasSeleccionados: { include: { dia: true } }
      }
    })

    const datosFormateados = inscripcionesPendientes.map(insc => {
  const totalAsistencias = insc.usuario.asistencias?.length || 0;
  const asistidas = insc.usuario.asistencias?.filter(a => a.asistio).length || 0;
  const faltas = totalAsistencias - asistidas;

  const score = totalAsistencias > 0 ? evaluarUsuario({ asistencias: asistidas, faltas }) : null;
  const prioridadCalculada = score !== null
    ? (score >= 0.8 ? 'alta' : score >= 0.5 ? 'media' : 'baja')
    : 'normal';

  return {
    id_inscripcion: insc.id_inscripcion,
    usuario: insc.usuario,
    prioridad: prioridadCalculada,
    score: score !== null ? Number(score.toFixed(3)) : null,
    asistencias: asistidas,
    faltas,
    estado: insc.estado,
    horario: {
      hora_inicio: insc.horario?.hora_inicio,
      hora_fin: insc.horario?.hora_fin
    },
    diasSeleccionados: insc.diasSeleccionados
  };
});

    // 🔥 GRAFICA CON DÍAS (sin romper nada)
const horarios = await prisma.horario.findMany({
  include: {
    inscripciones: {
      where: {
        estado: 'aprobado'
      },
      include: {
        diasSeleccionados: {
          include: {
            dia: true
          }
        }
      }
    },
    horarioDias: {
      include: {
        dia: true
      }
    }
  },
  orderBy: { hora_inicio: 'asc' }
})

const grafica = horarios.map(h => {

  // 🔥 días del horario (ej: Lunes, Miércoles)
  const diasHorario = h.horarioDias.map(hd => hd.dia.nombre);

  return diasHorario.map(dia => {

    // 🔥 contar SOLO los que eligieron ese día
    const ocupados = h.inscripciones.filter(insc =>
      insc.diasSeleccionados?.some(d => d.dia.nombre === dia)
    ).length;

    return {
      id_horario: h.id_horario,
      hora: h.hora_inicio,
      dia, // 🔥 ahora es un solo día
      ocupados,
      capacidad: h.capacidad_maxima,
      disponibles: h.capacidad_maxima - ocupados
    };
  });

}).flat(); // 🔥 IMPORTANTÍSIMO

    res.status(200).json({
      inscripciones: datosFormateados,
      grafica
    })

  } catch (error) {
    console.error('Error al obtener inscripciones:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}


// ==========================================
// 2. APROBAR
// ==========================================
exports.aceptarInscripcion = async (req, res) => {
  try {

    const { id_inscripcion } = req.body

    if (!id_inscripcion) {
      return res.status(400).json({ message: 'id_inscripcion requerido' })
    }

    const inscripcion = await prisma.inscripcion.update({
      where: { id_inscripcion: parseInt(id_inscripcion) },
      data: {
        estado: 'aprobado',
        fecha_decision: new Date()
      },
      include: { usuario: true }
    })

    await prisma.usuario.update({
      where: { id_usuario: inscripcion.usuario.id_usuario },
      data: { activo: true }
    })

    res.status(200).json({ message: 'Inscripción aprobada correctamente' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al aprobar' })
  }
}


// ==========================================
// 3. RECHAZAR
// ==========================================
exports.rechazarInscripcion = async (req, res) => {
  try {

    const { id_inscripcion } = req.body

    if (!id_inscripcion) {
      return res.status(400).json({ message: 'id_inscripcion requerido' })
    }

    await prisma.inscripcion.update({
      where: { id_inscripcion: parseInt(id_inscripcion) },
      data: {
        estado: 'rechazado',
        fecha_decision: new Date()
      }
    })

    res.status(200).json({ message: 'Inscripción rechazada correctamente' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al rechazar' })
  }
}