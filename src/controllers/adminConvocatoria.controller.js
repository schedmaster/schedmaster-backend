const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendConvocatoriaActivaEmail } = require('../lib/mailer');

function parseRequiredDate(value, fieldName) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} es requerida y debe ser una fecha valida`);
    error.statusCode = 400;
    throw error;
  }

  return date;
}

async function resolveEntrenadorId(idEntrenador) {
  const parsedId = Number.parseInt(idEntrenador, 10);

  if (Number.isInteger(parsedId) && parsedId > 0) {
    const usuario = await prisma.usuario.findFirst({
      where: {
        id_usuario: parsedId,
        activo: true,
        id_rol: { in: [3, 4] }
      },
      select: { id_usuario: true }
    });

    if (usuario) return usuario.id_usuario;
  }

  const fallback = await prisma.usuario.findFirst({
    where: {
      activo: true,
      id_rol: { in: [3, 4] }
    },
    orderBy: { id_usuario: 'asc' },
    select: { id_usuario: true }
  });

  if (!fallback) {
    const error = new Error('No existe un entrenador o administrador activo para asociar la convocatoria');
    error.statusCode = 400;
    throw error;
  }

  return fallback.id_usuario;
}

async function sendListaEsperaConvocatoria(periodo) {
  const pendientes = await prisma.listaEspera.findMany({
    where: { estado: 'pendiente' }
  });

  console.log(`📧 Enviando a ${pendientes.length} correos`);

  if (pendientes.length === 0) {
    return { pendientes: 0, notificados: 0, fallidos: 0 };
  }

  const resultados = await Promise.all(
    pendientes.map(async (usuario) => {
      const result = await sendConvocatoriaActivaEmail({
        to: usuario.correo,
        periodo
      });

      return result ? usuario.id_lista : null;
    })
  );

  const idsNotificados = resultados.filter(Boolean);

  if (idsNotificados.length > 0) {
    await prisma.listaEspera.updateMany({
      where: { id_lista: { in: idsNotificados } },
      data: { estado: 'notificado' }
    });
  }

  const resumen = {
    pendientes: pendientes.length,
    notificados: idsNotificados.length,
    fallidos: pendientes.length - idsNotificados.length
  };

  console.log(`✅ ${resumen.notificados} correos enviados y actualizados`);
  return resumen;
}

function notifyListaEsperaConvocatoria(periodo) {
  setTimeout(async () => {
    try {
      await sendListaEsperaConvocatoria(periodo);
    } catch (err) {
      console.error('❌ Error enviando correos:', err);
    }
  }, 0);
}

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

    const entrenadorId = await resolveEntrenadorId(id_entrenador);

    const nuevo = await prisma.periodo.create({
      data: {
        nombre_periodo,
        fecha_inicio_inscripcion: parseRequiredDate(fecha_inicio_inscripcion, 'fecha_inicio_inscripcion'),
        fecha_fin_inscripcion: parseRequiredDate(fecha_fin_inscripcion, 'fecha_fin_inscripcion'),
        fecha_inicio_actividades: parseRequiredDate(fecha_inicio_actividades, 'fecha_inicio_actividades'),
        fecha_fin_periodo: parseRequiredDate(fecha_fin_periodo, 'fecha_fin_periodo'),
        estado,
        id_entrenador: entrenadorId
      }
    });

    if (estado === 'activo') {
      notifyListaEsperaConvocatoria(nuevo);
    }

    res.status(201).json(nuevo);

  } catch (error) {
    console.error('❌ Error crearPeriodo:', error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Error al crear convocatoria' });
  }
};


/* =========================
   OBTENER PERIODOS
=========================*/
exports.obtenerPeriodos = async (req, res) => {
  try {
    const { q, estado } = req.query;

    const where = {};

    const estadoNormalizado = String(estado || '').trim().toLowerCase();
    if (['activo', 'inactivo'].includes(estadoNormalizado)) {
      where.estado = estadoNormalizado;
    }

    if (q && String(q).trim() !== '') {
      const textoBusqueda = String(q).trim();
      const posibleId = Number.parseInt(textoBusqueda, 10);

      where.OR = [
        { nombre_periodo: { contains: textoBusqueda, mode: 'insensitive' } }
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
      where: { id_periodo: Number.parseInt(id) }
    });

    if (!periodoAntes) {
      return res.status(404).json({ message: 'Periodo no encontrado' });
    }

    const entrenadorId = await resolveEntrenadorId(id_entrenador || periodoAntes.id_entrenador);

    // ✏️ Actualizar periodo
    const actualizado = await prisma.periodo.update({
      where: { id_periodo: Number.parseInt(id) },
      data: {
        nombre_periodo,
        fecha_inicio_inscripcion: parseRequiredDate(fecha_inicio_inscripcion, 'fecha_inicio_inscripcion'),
        fecha_fin_inscripcion: parseRequiredDate(fecha_fin_inscripcion, 'fecha_fin_inscripcion'),
        fecha_inicio_actividades: parseRequiredDate(fecha_inicio_actividades, 'fecha_inicio_actividades'),
        fecha_fin_periodo: parseRequiredDate(fecha_fin_periodo, 'fecha_fin_periodo'),
        estado,
        id_entrenador: entrenadorId
      }
    });

    // 🔴 Si el periodo pasa a inactivo → desactivar usuarios inscritos
    if (periodoAntes.estado !== 'inactivo' && estado === 'inactivo') {
      setTimeout(async () => {
        try {
          const inscripciones = await prisma.inscripcion.findMany({
            where: { id_periodo: Number.parseInt(id) },
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
      notifyListaEsperaConvocatoria(actualizado);
    }

    // ✅ Respuesta siempre
    res.json(actualizado);

  } catch (error) {
    console.error('❌ Error actualizarPeriodo:', error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Error al actualizar convocatoria' });
  }
};

/* =========================
   NOTIFICAR LISTA DE ESPERA
=========================*/
exports.notificarConvocatoriaActiva = async (req, res) => {
  try {
    const { id } = req.params;
    const idPeriodo = Number.parseInt(id, 10);

    if (!Number.isInteger(idPeriodo) || idPeriodo <= 0) {
      return res.status(400).json({ message: 'id de convocatoria invalido' });
    }

    const periodo = await prisma.periodo.findUnique({
      where: { id_periodo: idPeriodo }
    });

    if (!periodo) {
      return res.status(404).json({ message: 'Convocatoria no encontrada' });
    }

    if (periodo.estado !== 'activo') {
      return res.status(409).json({ message: 'Solo se puede notificar una convocatoria activa' });
    }

    const resumen = await sendListaEsperaConvocatoria(periodo);

    return res.json({
      message: `Notificacion enviada a ${resumen.notificados} correo(s) pendiente(s)`,
      ...resumen
    });
  } catch (error) {
    console.error('❌ Error notificarConvocatoriaActiva:', error);
    return res.status(500).json({ message: 'Error al notificar la convocatoria activa' });
  }
};
