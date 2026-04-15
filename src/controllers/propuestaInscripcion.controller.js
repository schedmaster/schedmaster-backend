const { sendMail } = require('../lib/mailer')
const prisma = require('../../prisma/client')

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

    const disponibles = horario.capacidad_maxima - ocupados

    if (disponibles < minimoDisponible) minimoDisponible = disponibles

  }

  return {
    disponibles: minimoDisponible,
    capacidad: horario.capacidad_maxima
  }

}

// ==========================================
// 1. ENVIAR PROPUESTA
// ==========================================
const enviarPropuesta = async (req, res) => {
  try {

    const { correo, horarioId, dias } = req.body

    if (!correo || !horarioId || !dias || dias.length === 0) {
      return res.status(400).json({ message: 'Faltan datos para enviar la propuesta' })
    }

    const usuario = await prisma.usuario.findUnique({ where: { correo } })
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' })

    const inscripcion = await prisma.inscripcion.findFirst({
      where: { id_usuario: usuario.id_usuario, estado: 'pendiente' }
    })
    if (!inscripcion) return res.status(404).json({ message: 'No hay inscripción pendiente' })

    const horario = await prisma.horario.findUnique({
      where: { id_horario: parseInt(horarioId) }
    })
    if (!horario) return res.status(404).json({ message: 'Horario no encontrado' })

    // ✅ Verificar capacidad antes de enviar
    const { disponibles } = await verificarLugares(horarioId, dias)

    if (disponibles <= 0) {
      return res.status(409).json({
        message: 'Los lugares en este horario han sido cubiertos',
        disponibles: 0
      })
    }

    const diasDB = await prisma.dia.findMany({
      where: { id_dia: { in: dias.map(Number) } }
    })
    const diasTexto = diasDB.map(d => d.nombre).join(', ')

    await prisma.propuesta.updateMany({
      where: { id_inscripcion: inscripcion.id_inscripcion, estado: 'pendiente' },
      data: { estado: 'cancelada' }
    })

    const propuesta = await prisma.propuesta.create({
      data: {
        id_inscripcion: inscripcion.id_inscripcion,
        id_horario: parseInt(horarioId),
        id_usuario: usuario.id_usuario,
        estado: 'pendiente'
      }
    })

    await prisma.propuestaDia.createMany({
      data: dias.map(d => ({
        id_propuesta: propuesta.id_propuesta,
        id_dia: parseInt(d)
      }))
    })

    await prisma.inscripcion.update({
      where: { id_inscripcion: inscripcion.id_inscripcion },
      data: { estado: 'propuesta_enviada' }
    })

    // 🚀 BUG #1 SOLUCIONADO: Usando /pending para evitar logins innecesarios
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://schedmaster-frontend.vercel.app';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; border:1px solid #eee; padding:20px; border-radius:10px; color: #333;">
        <h2 style="color:#2563eb;">Propuesta de Horario - SchedMaster UTEQ</h2>
        <p>Hola <strong>${usuario.nombre}</strong>,</p>
        <p>Hemos revisado tu solicitud y te proponemos el siguiente horario para tus entrenamientos:</p>
        <div style="background:#f3f4f6; padding:15px; border-radius:8px; margin:20px 0; border-left: 5px solid #2563eb;">
          <p style="margin: 5px 0;"><strong>Horario:</strong> ${horario.hora_inicio.substring(0,5)} - ${horario.hora_fin.substring(0,5)}</p>
          <p style="margin: 5px 0;"><strong>Días:</strong> ${diasTexto}</p>
        </div>
        <p>Para aceptar o rechazar esta propuesta, por favor revisa los detalles en la plataforma:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/pending"
             style="background:#2563eb; color:white; padding:14px 25px; text-decoration:none; border-radius:5px; display:inline-block; font-weight: bold;">
            Ver mi propuesta
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador: <br> ${FRONTEND_URL}/pending</p>
      </div>
    `

    await sendMail({
      from: process.env.MAIL_FROM || "SchedMaster <onboarding@resend.dev>",
      to: correo,
      subject: 'Propuesta de horario para tu inscripción',
      html
    })

    res.json({
      message: 'Propuesta enviada correctamente',
      disponibles: disponibles - 1
    })

  } catch (error) {
    console.error('❌ Error en enviarPropuesta:', error)
    res.status(500).json({ message: 'Error enviando propuesta' })
  }
}

// ==========================================
// 2. OBTENER PROPUESTA DEL USUARIO
// ==========================================
const obtenerPropuestaUsuario = async (req, res) => {
  try {
    const { id_usuario } = req.params
    const propuesta = await prisma.propuesta.findFirst({
      where: { id_usuario: parseInt(id_usuario), estado: 'pendiente' },
      include: { horario: true, dias: { include: { dia: true } } },
      orderBy: { id_propuesta: 'desc' }
    })
    res.json(propuesta || null)
  } catch (error) {
    console.error('❌ Error en obtenerPropuestaUsuario:', error)
    res.status(500).json({ message: 'Error obteniendo propuesta' })
  }
}

// ==========================================
// 3. ACEPTAR PROPUESTA
// ==========================================
const aceptarPropuesta = async (req, res) => {
  try {
    const { id_propuesta } = req.body
    await prisma.$transaction(async (tx) => {
      const propuesta = await tx.propuesta.findUnique({
        where: { id_propuesta: parseInt(id_propuesta) },
        include: { dias: true }
      })

      if (!propuesta) throw new Error('Propuesta no encontrada')

      const diasIds = propuesta.dias.map(d => d.id_dia)
      const { disponibles } = await verificarLugares(propuesta.id_horario, diasIds, tx)

      if (disponibles <= 0) {
        const err = new Error('Los lugares en este horario han sido cubiertos')
        err.code = 'SIN_LUGARES'
        throw err
      }

      await tx.propuesta.update({
        where: { id_propuesta: propuesta.id_propuesta },
        data: { estado: 'aceptada', fecha_respuesta: new Date() }
      })

      await tx.inscripcion.update({
        where: { id_inscripcion: propuesta.id_inscripcion },
        data: {
          estado: 'aprobado',
          fecha_decision: new Date(),
          id_horario: propuesta.id_horario
        }
      })

      await tx.usuario.update({
        where: { id_usuario: propuesta.id_usuario },
        data: { activo: true }
      })
    })
    res.json({ message: 'Inscripción finalizada con éxito' })
  } catch (error) {
    if (error.code === 'SIN_LUGARES') {
      return res.status(409).json({
        message: 'Los lugares en este horario han sido cubiertos',
        disponibles: 0
      })
    }
    console.error('❌ Error en aceptarPropuesta:', error)
    res.status(500).json({ message: 'Error al aceptar propuesta' })
  }
}

const rechazarPropuesta = async (req, res) => {
  try {
    const { id_propuesta } = req.body
    if (!id_propuesta) {
      return res.status(400).json({ message: 'id_propuesta requerido' })
    }
    await prisma.$transaction(async (tx) => {
      const propuesta = await tx.propuesta.findUnique({
        where: { id_propuesta: parseInt(id_propuesta) }
      })
      if (!propuesta) throw new Error('Propuesta no encontrada')
      await tx.propuesta.update({
        where: { id_propuesta: propuesta.id_propuesta },
        data: { estado: 'rechazada', fecha_respuesta: new Date() }
      })
      await tx.inscripcion.update({
        where: { id_inscripcion: propuesta.id_inscripcion },
        data: {
          estado: 'rechazado',
          fecha_decision: new Date()
        }
      })
    })
    res.json({ message: 'Propuesta rechazada correctamente' })
  } catch (error) {
    console.error('❌ Error en rechazarPropuesta:', error)
    res.status(500).json({ message: 'Error al rechazar propuesta' })
  }
}

module.exports = { enviarPropuesta, obtenerPropuestaUsuario, aceptarPropuesta, rechazarPropuesta }