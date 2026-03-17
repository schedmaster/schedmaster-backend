const transporter = require('../lib/mailer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const enviarPropuesta = async (req, res) => {

  try {

    const { correo, horarioId, dias } = req.body;

    if (!correo || !horarioId || !dias || dias.length === 0) {
      return res.status(400).json({
        message: "Faltan datos para enviar la propuesta"
      });
    }

    //  buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: {
        correo: correo
      }
    });

    if (!usuario) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    //  buscar inscripción pendiente
    const inscripcion = await prisma.inscripcion.findFirst({
      where: {
        id_usuario: usuario.id_usuario,
        estado: "pendiente"
      }
    });

    if (!inscripcion) {
      return res.status(404).json({
        message: "No se encontró una inscripción pendiente"
      });
    }

    //  obtener horario
    const horario = await prisma.horario.findUnique({
      where: {
        id_horario: parseInt(horarioId)
      }
    });

    if (!horario) {
      return res.status(404).json({
        message: "Horario no encontrado"
      });
    }

    const horaInicio = horario.hora_inicio.substring(11,16);
    const horaFin = horario.hora_fin.substring(11,16);

    //  obtener días
    const diasDB = await prisma.dia.findMany({
      where: {
        id_dia: {
          in: dias.map(Number)
        }
      }
    });

    const diasTexto = diasDB.map(d => d.nombre).join(', ');

    //  cancelar propuestas pendientes anteriores
    await prisma.propuesta.updateMany({
      where: {
        id_inscripcion: inscripcion.id_inscripcion,
        estado: "pendiente"
      },
      data: {
        estado: "cancelada"
      }
    });

    //  crear propuesta
    const propuesta = await prisma.propuesta.create({
      data: {
        id_inscripcion: inscripcion.id_inscripcion,
        id_horario: parseInt(horarioId),
        id_usuario: usuario.id_usuario,
        estado: "pendiente"
      }
    });

    //  guardar días
    await prisma.propuestaDia.createMany({
      data: dias.map(d => ({
        id_propuesta: propuesta.id_propuesta,
        id_dia: parseInt(d)
      }))
    });

    //actualizar inscripción
    await prisma.inscripcion.update({
      where: {
        id_inscripcion: inscripcion.id_inscripcion
      },
      data: {
        estado: "propuesta_enviada"
      }
    });

    //correo
    const html = `
      <div style="font-family: Arial; max-width:600px; margin:auto;">

        <h2 style="color:#2563eb;">Propuesta de horario - Gimnasio</h2>

        <p>
          Hemos revisado tu solicitud de inscripción al gimnasio.
        </p>

        <p>
          Te proponemos el siguiente horario disponible:
        </p>

        <table style="border-collapse: collapse; width:100%; margin-top:15px;">
          <tr style="background:#f3f4f6;">
            <th style="padding:10px;border:1px solid #ddd;">Horario</th>
            <th style="padding:10px;border:1px solid #ddd;">Días</th>
          </tr>

          <tr>
            <td style="padding:10px;border:1px solid #ddd;">
              ${horaInicio} - ${horaFin}
            </td>

            <td style="padding:10px;border:1px solid #ddd;">
              ${diasTexto}
            </td>
          </tr>
        </table>

        <p style="margin-top:20px;">
          Para confirmar o rechazar esta propuesta, ingresa a la plataforma con tu usuario y contraseña.
        </p>

        <a href="http://localhost:3000/login"
        style="
        background:#2563eb;
        color:white;
        padding:12px 18px;
        text-decoration:none;
        border-radius:6px;
        display:inline-block;
        margin-top:15px;
        ">
        Entrar a la plataforma
        </a>

        <p style="color:#6b7280;font-size:13px;margin-top:20px;">
          Sistema de gestión del gimnasio
        </p>

      </div>
    `;

    await transporter.sendMail({
      from: `"Sistema Gimnasio" <${process.env.MAIL_USER}>`,
      to: correo,
      subject: "Propuesta de horario para inscripción",
      html: html
    });

    res.json({
      message: "Propuesta enviada correctamente"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error enviando propuesta"
    });

  }

};



const obtenerPropuestaUsuario = async (req, res) => {

  try {

    const { id_usuario } = req.params;

    const propuesta = await prisma.propuesta.findFirst({
      where: {
        id_usuario: parseInt(id_usuario),
        estado: "pendiente"
      },
      include: {
        horario: true,
        dias: {
          include: {
            dia: true
          }
        }
      },
      orderBy: {
        id_propuesta: "desc"
      }
    });

    if (!propuesta) {
      return res.json(null);
    }

    res.json(propuesta);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error obteniendo propuesta"
    });

  }

};



const aceptarPropuesta = async (req, res) => {

  try {

    const { id_propuesta } = req.body;

    if (!id_propuesta) {
      return res.status(400).json({
        message: "id_propuesta requerido"
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {

      const propuesta = await tx.propuesta.findUnique({
        where: {
          id_propuesta: parseInt(id_propuesta)
        }
      });

      if (!propuesta) {
        throw new Error("Propuesta no encontrada");
      }

      // aceptar propuesta
      await tx.propuesta.update({
        where: {
          id_propuesta: propuesta.id_propuesta
        },
        data: {
          estado: "aceptada",
          fecha_respuesta: new Date()
        }
      });

      // rechazar otras propuestas
      await tx.propuesta.updateMany({
        where: {
          id_inscripcion: propuesta.id_inscripcion,
          NOT: {
            id_propuesta: propuesta.id_propuesta
          }
        },
        data: {
          estado: "rechazada"
        }
      });

      // aprobar inscripción
      const inscripcion = await tx.inscripcion.update({
        where: {
          id_inscripcion: propuesta.id_inscripcion
        },
        data: {
          estado: "aprobado",
          fecha_decision: new Date(),
          id_horario: propuesta.id_horario
        }
      });

      // activar usuario
      await tx.usuario.update({
        where: {
          id_usuario: propuesta.id_usuario
        },
        data: {
          activo: true
        }
      });

      return inscripcion;

    });

    res.status(200).json({
      message: "Propuesta aceptada e inscripción aprobada correctamente",
      inscripcion: resultado
    });

  } catch (error) {

    console.error("Error al aceptar propuesta:", error);

    res.status(500).json({
      message: "Error al aceptar la propuesta"
    });

  }

};


module.exports = {
  enviarPropuesta,
  obtenerPropuestaUsuario,
  aceptarPropuesta
};