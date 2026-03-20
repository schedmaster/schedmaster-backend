const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const transporter = require('../lib/mailer');


/* =========================
   1. Crear convocatoria nueva (POST)
==========================*/
exports.crearPeriodo = async (req, res) => {
  try {
    const {
      nombre_periodo,
      fecha_inicio_inscripcion,
      fecha_fin_inscripcion,
      fecha_inicio_actividades,
      fecha_fin_periodo,
      estado,
      id_entrenador
    } = req.body;

    const nuevoPeriodo = await prisma.periodo.create({
      data: {
        nombre_periodo,
        fecha_inicio_inscripcion: new Date(fecha_inicio_inscripcion),
        fecha_fin_inscripcion: new Date(fecha_fin_inscripcion),
        fecha_inicio_actividades: new Date(fecha_inicio_actividades),
        fecha_fin_periodo: new Date(fecha_fin_periodo),
        estado,
        id_entrenador
      }
    });

    if (estado === 'activo') {

      const lista = await prisma.listaEspera.findMany({
        where: { estado: 'pendiente' }
      });

      await Promise.all(
        lista.map(usuario => {

          const html = `
            <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; border:1px solid #e5e7eb; padding:20px; border-radius:12px;">
              
              <h2 style="color:#2563eb; margin-bottom:10px;">
                📢 Nueva Convocatoria Disponible
              </h2>

              <p style="color:#374151;">Hola <strong>${usuario.correo}</strong> 👋,</p>

              <p style="color:#374151;">
                Se ha abierto una nueva convocatoria en 
                <strong>SchedMaster UTEQ</strong>.
              </p>

              <div style="background:#f3f4f6; padding:15px; border-radius:8px; margin:20px 0;">
                <p style="margin:0; color:#111827;">
                  📅 <strong>Periodo:</strong> ${nombre_periodo}
                </p>
                <p style="margin:0; color:#111827;">
                  📝 Ya puedes realizar tu inscripción dentro de la plataforma.
                </p>
              </div>

              <p style="color:#374151;">
                No pierdas tu lugar y completa tu registro lo antes posible.
              </p>

              <div style="text-align:center; margin-top:25px;">
                <a href="http://localhost:3000/register"
                  style="
                    background:#2563eb;
                    color:white;
                    padding:12px 20px;
                    text-decoration:none;
                    border-radius:6px;
                    display:inline-block;
                    font-weight:bold;
                  ">
                  Registrarme ahora
                </a>
              </div>

              <p style="margin-top:30px; font-size:12px; color:#9ca3af; text-align:center;">
                Este mensaje fue enviado automáticamente por SchedMaster.
              </p>

            </div>
          `;

          return transporter.sendMail({
            from: `"SchedMaster UTEQ" <${process.env.EMAIL_USER}>`,
            to: usuario.correo,
            subject: '📢 Nueva convocatoria disponible',
            html: html
          });

        })
      );

      console.log(`📧 Correos enviados: ${lista.length}`);

      await prisma.listaEspera.updateMany({
        where: { estado: 'pendiente' },
        data: { estado: 'notificado' }
      });
    }

    res.status(201).json(nuevoPeriodo);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear la convocatoria" });
  }
};


/* =========================
   2. Obtener convocatorias con Auto-Cierre (GET)
==========================*/
exports.obtenerPeriodos = async (req, res) => {
  try {
    const hoy = new Date();

    await prisma.periodo.updateMany({
      where: {
        estado: 'activo',
        fecha_fin_inscripcion: { lt: hoy }
      },
      data: { estado: 'inactivo' }
    });

    const periodos = await prisma.periodo.findMany({
      orderBy: { id_periodo: 'desc' }
    });

    res.json(periodos);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener convocatorias" });
  }
};


/* =========================
   3. Actualizar convocatoria existente (PUT)
==========================*/
exports.actualizarPeriodo = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nombre_periodo,
      fecha_inicio_inscripcion,
      fecha_fin_inscripcion,
      fecha_inicio_actividades,
      fecha_fin_periodo,
      estado,
      id_entrenador
    } = req.body;

    const periodoActualizado = await prisma.periodo.update({
      where: { id_periodo: parseInt(id) },
      data: {
        nombre_periodo,
        fecha_inicio_inscripcion: new Date(fecha_inicio_inscripcion),
        fecha_fin_inscripcion: new Date(fecha_fin_inscripcion),
        fecha_inicio_actividades: new Date(fecha_inicio_actividades),
        fecha_fin_periodo: new Date(fecha_fin_periodo),
        estado,
        id_entrenador
      }
    });
    if (estado === 'activo') {

      const lista = await prisma.listaEspera.findMany({
        where: { estado: 'pendiente' }
      });

      await Promise.all(
        lista.map(usuario => {

          const html = `
            <h2>📢 Nueva convocatoria disponible</h2>
            <p>Ya puedes registrarte en SchedMaster.</p>
          `;

          return transporter.sendMail({
            from: `"SchedMaster UTEQ" <${process.env.EMAIL_USER}>`,
            to: usuario.correo,
            subject: '📢 Nueva convocatoria disponible',
            html: html
          });

        })
      );

      await prisma.listaEspera.updateMany({
        where: { estado: 'pendiente' },
        data: { estado: 'notificado' }
      });
    }

    res.json(periodoActualizado);

  } catch (error) {
    console.error("Error al actualizar en Prisma:", error);
    res.status(500).json({ error: "Error al actualizar la convocatoria" });
  }
};