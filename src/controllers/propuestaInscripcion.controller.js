const transporter = require('../lib/mailer');
const prisma = require('../../prisma/client'); // Uso del cliente centralizado

const enviarPropuesta = async (req, res) => {
  try {
    const { correo, horarioId, dias } = req.body;

    if (!correo || !horarioId || !dias || dias.length === 0) {
      return res.status(400).json({ message: "Faltan datos para enviar la propuesta" });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({ where: { correo } });
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

    // Buscar inscripción pendiente
    const inscripcion = await prisma.inscripcion.findFirst({
      where: { id_usuario: usuario.id_usuario, estado: "pendiente" }
    });
    if (!inscripcion) return res.status(404).json({ message: "No hay inscripción pendiente" });

    // Buscar horario
    const horario = await prisma.horario.findUnique({ where: { id_horario: parseInt(horarioId) } });
    if (!horario) return res.status(404).json({ message: "Horario no encontrado" });

    // Formatear horas
    const horaInicio = horario.hora_inicio;
    const horaFin = horario.hora_fin;

    // Obtener nombres de días
    const diasDB = await prisma.dia.findMany({
      where: { id_dia: { in: dias.map(Number) } }
    });
    const diasTexto = diasDB.map(d => d.nombre).join(', ');

    // Cancelar propuestas anteriores
    await prisma.propuesta.updateMany({
      where: { id_inscripcion: inscripcion.id_inscripcion, estado: "pendiente" },
      data: { estado: "cancelada" }
    });

    // Crear la nueva propuesta
    const propuesta = await prisma.propuesta.create({
      data: {
        id_inscripcion: inscripcion.id_inscripcion,
        id_horario: parseInt(horarioId),
        id_usuario: usuario.id_usuario,
        estado: "pendiente"
      }
    });

    // Guardar los días de la propuesta
    await prisma.propuestaDia.createMany({
      data: dias.map(d => ({
        id_propuesta: propuesta.id_propuesta,
        id_dia: parseInt(d)
      }))
    });

    // Actualizar estado de inscripción
    await prisma.inscripcion.update({
      where: { id_inscripcion: inscripcion.id_inscripcion },
      data: { estado: "propuesta_enviada" }
    });

    // Diseño del correo
    const html = `
      <div style="font-family: Arial; max-width:600px; margin:auto; border:1px solid #eee; padding:20px; border-radius:10px;">
        <h2 style="color:#2563eb;">Propuesta de Horario - SchedMaster UTEQ</h2>
        <p>Hola <strong>${usuario.nombre}</strong>, hemos revisado tu solicitud.</p>
        <p>Te proponemos el siguiente horario:</p>
        <div style="background:#f3f4f6; padding:15px; border-radius:8px; margin:20px 0;">
          <p><strong>Horario:</strong> ${horaInicio} - ${horaFin}</p>
          <p><strong>Días:</strong> ${diasTexto}</p>
        </div>
        <p>Para confirmar, inicia sesión en la plataforma:</p>
        <a href="http://localhost:3000/login" style="background:#2563eb; color:white; padding:12px 20px; text-decoration:none; border-radius:5px; display:inline-block;">Entrar a SchedMaster</a>
      </div>
    `;

    await transporter.sendMail({
      from: `"SchedMaster UTEQ" <${process.env.MAIL_USER}>`,
      to: correo,
      subject: "Propuesta de horario para tu inscripción",
      html: html
    });

    res.json({ message: "Propuesta enviada correctamente" });

  } catch (error) {
    console.error("❌ Error en enviarPropuesta:", error);
    res.status(500).json({ message: "Error enviando propuesta" });
  }
};

const obtenerPropuestaUsuario = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const propuesta = await prisma.propuesta.findFirst({
      where: { id_usuario: parseInt(id_usuario), estado: "pendiente" },
      include: { horario: true, dias: { include: { dia: true } } },
      orderBy: { id_propuesta: "desc" }
    });
    res.json(propuesta || null);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo propuesta" });
  }
};

const aceptarPropuesta = async (req, res) => {
  try {
    const { id_propuesta } = req.body;
    await prisma.$transaction(async (tx) => {
      const propuesta = await tx.propuesta.findUnique({ where: { id_propuesta: parseInt(id_propuesta) } });
      if (!propuesta) throw new Error("Propuesta no encontrada");

      // Aceptar propuesta
      await tx.propuesta.update({
        where: { id_propuesta: propuesta.id_propuesta },
        data: { estado: "aceptada", fecha_respuesta: new Date() }
      });

      // Aprobar inscripción y asignar horario
      await tx.inscripcion.update({
        where: { id_inscripcion: propuesta.id_inscripcion },
        data: { 
          estado: "aprobado", 
          fecha_decision: new Date(), 
          id_horario: propuesta.id_horario 
        }
      });

      // Activar al usuario
      await tx.usuario.update({
        where: { id_usuario: propuesta.id_usuario },
        data: { activo: true }
      });
    });

    res.json({ message: "Inscripción finalizada con éxito" });
  } catch (error) {
    console.error("❌ Error en aceptarPropuesta:", error);
    res.status(500).json({ message: "Error al aceptar propuesta" });
  }
};

module.exports = { enviarPropuesta, obtenerPropuestaUsuario, aceptarPropuesta };