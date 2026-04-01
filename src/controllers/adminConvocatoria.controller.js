const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* =========================
   CREAR PERIODO
=========================*/
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

    const nuevo = await prisma.periodo.create({
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

    res.status(201).json(nuevo);

  } catch (error) {
    console.error('❌ Error crearPeriodo:', error);
    res.status(500).json({ message: 'Error al crear convocatoria' });
  }
};


/* =========================
   OBTENER PERIODOS
=========================*/
exports.obtenerPeriodos = async (req, res) => {
  try {
    const { q } = req.query;

    const where = {};

    if (q && String(q).trim() !== '') {
      const textoBusqueda = String(q).trim();
      const posibleId = parseInt(textoBusqueda, 10);

      where.OR = [
        { nombre_periodo: { contains: textoBusqueda } }
      ];

      if (!Number.isNaN(posibleId)) {
        where.OR.push({ id_periodo: posibleId });
      }
    }

    const periodos = await prisma.periodo.findMany({
      where,
      orderBy: { id_periodo: 'desc' }
    });

    res.json(periodos);

  } catch (error) {
    console.error('❌ Error obtenerPeriodos:', error);
    res.status(500).json({ message: 'Error al obtener convocatorias' });
  }
};


/* =========================
   ACTUALIZAR PERIODO
=========================*/
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

    // 🔍 Obtener estado anterior
    const periodoAntes = await prisma.periodo.findUnique({
      where: { id_periodo: parseInt(id) }
    });

    if (!periodoAntes) {
      return res.status(404).json({ message: 'Periodo no encontrado' });
    }

    // ✏️ Actualizar periodo
    const actualizado = await prisma.periodo.update({
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

    // 🔴 Si el periodo pasa a inactivo → desactivar usuarios inscritos
    if (periodoAntes.estado !== 'inactivo' && estado === 'inactivo') {
      setTimeout(async () => {
        try {
          const inscripciones = await prisma.inscripcion.findMany({
            where: { id_periodo: parseInt(id) },
            select: { id_usuario: true }
          });

          const idsUsuarios = inscripciones.map(i => i.id_usuario);

          if (idsUsuarios.length > 0) {
            await prisma.usuario.updateMany({
              where: {
                id_usuario: { in: idsUsuarios },
                id_rol: { in: [1, 2] }
              },
              data: { activo: false }
            });

            console.log(`🔴 ${idsUsuarios.length} usuarios desactivados por cierre de periodo ${id}`);
          }
        } catch (err) {
          console.error('❌ Error desactivando usuarios:', err);
        }
      }, 0);
    }

    // 📧 Si el periodo pasa a activo → notificar lista de espera
    if (periodoAntes.estado !== 'activo' && estado === 'activo') {
      setTimeout(async () => {
        try {
          const { sendConvocatoriaActivaEmail } = require('../lib/mailer');

          const pendientes = await prisma.listaEspera.findMany({
            where: { estado: 'pendiente' }
          });

          console.log(`📧 Enviando a ${pendientes.length} correos`);

          if (pendientes.length > 0) {
            await Promise.all(
              pendientes.map(usuario =>
                sendConvocatoriaActivaEmail({
                  to: usuario.correo,
                  periodo: actualizado
                })
              )
            );

            await prisma.listaEspera.updateMany({
              where: { estado: 'pendiente' },
              data: { estado: 'notificado' }
            });

            console.log('✅ Correos enviados y actualizados');
          }
        } catch (err) {
          console.error('❌ Error enviando correos:', err);
        }
      }, 0);
    }

    // ✅ Respuesta siempre
    res.json(actualizado);

  } catch (error) {
    console.error('❌ Error actualizarPeriodo:', error);
    res.status(500).json({ message: 'Error al actualizar convocatoria' });
  }
};