const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USUARIO_SELECT = {
  id_usuario: true,
  nombre: true,
  apellido_paterno: true,
  apellido_materno: true
};

function normalizarEjercicios(ejercicios) {
  if (!Array.isArray(ejercicios)) return [];

  return ejercicios
    .map((ej, index) => ({
      nombre_ejercicio: String(ej?.nombre_ejercicio || '').trim(),
      series: ej?.series !== undefined && ej.series !== null && ej.series !== ''
        ? Number(ej.series)
        : null,
      repeticiones: ej?.repeticiones ? String(ej.repeticiones).trim() : null,
      descanso_segundos: ej?.descanso_segundos !== undefined && ej.descanso_segundos !== null && ej.descanso_segundos !== ''
        ? Number(ej.descanso_segundos)
        : null,
      notas: ej?.notas ? String(ej.notas).trim() : null,
      orden: index
    }))
    .filter(ej => ej.nombre_ejercicio.length > 0);
}

/* =========================
   COMUNIDAD: RUTINAS ORIGINALES (creadas, no tomadas)
=========================*/
exports.obtenerRutinasComunidad = async (req, res) => {
  try {
    const rutinas = await prisma.rutina.findMany({
      where: { id_rutina_origen: null },
      orderBy: { fecha_creacion: 'desc' },
      include: {
        usuario: { select: USUARIO_SELECT },
        _count: { select: { ejercicios: true, copias: true } }
      }
    });

    res.json(rutinas);
  } catch (error) {
    console.error('Error al obtener rutinas de la comunidad:', error);
    res.status(500).json({ message: 'Error al obtener rutinas' });
  }
};

/* =========================
   MIS RUTINAS (propias + tomadas)
=========================*/
exports.obtenerRutinasPorUsuario = async (req, res) => {
  try {
    const { id_usuario } = req.params;

    const rutinas = await prisma.rutina.findMany({
      where: { id_usuario: Number(id_usuario) },
      orderBy: { fecha_creacion: 'desc' },
      include: {
        usuario: { select: USUARIO_SELECT },
        ejercicios: { orderBy: { orden: 'asc' } },
        origen: { include: { usuario: { select: USUARIO_SELECT } } }
      }
    });

    res.json(rutinas);
  } catch (error) {
    console.error('Error al obtener rutinas del usuario:', error);
    res.status(500).json({ message: 'Error al obtener tus rutinas' });
  }
};

/* =========================
   DETALLE DE UNA RUTINA
=========================*/
exports.obtenerRutinaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const rutina = await prisma.rutina.findUnique({
      where: { id_rutina: Number(id) },
      include: {
        usuario: { select: USUARIO_SELECT },
        ejercicios: { orderBy: { orden: 'asc' } },
        _count: { select: { copias: true } }
      }
    });

    if (!rutina) {
      return res.status(404).json({ message: 'La rutina no existe' });
    }

    res.json(rutina);
  } catch (error) {
    console.error('Error al obtener la rutina:', error);
    res.status(500).json({ message: 'Error al obtener la rutina' });
  }
};

/* =========================
   CREAR RUTINA
=========================*/
exports.crearRutina = async (req, res) => {
  try {
    const { id_usuario, nombre, descripcion, ejercicios } = req.body;

    if (!id_usuario || !nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: 'Falta el usuario o el nombre de la rutina' });
    }

    const ejerciciosLimpios = normalizarEjercicios(ejercicios);
    if (ejerciciosLimpios.length === 0) {
      return res.status(400).json({ message: 'Agrega al menos un ejercicio a la rutina' });
    }

    const nueva = await prisma.rutina.create({
      data: {
        id_usuario: Number(id_usuario),
        nombre: String(nombre).trim(),
        descripcion: descripcion ? String(descripcion).trim() : null,
        ejercicios: { create: ejerciciosLimpios }
      },
      include: {
        usuario: { select: USUARIO_SELECT },
        ejercicios: { orderBy: { orden: 'asc' } }
      }
    });

    res.status(201).json(nueva);
  } catch (error) {
    console.error('Error al crear la rutina:', error);
    res.status(500).json({ message: 'Error al crear la rutina' });
  }
};

/* =========================
   ACTUALIZAR RUTINA
=========================*/
exports.actualizarRutina = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, ejercicios } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre de la rutina es obligatorio' });
    }

    const ejerciciosLimpios = normalizarEjercicios(ejercicios);
    if (ejerciciosLimpios.length === 0) {
      return res.status(400).json({ message: 'Agrega al menos un ejercicio a la rutina' });
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      await tx.rutinaEjercicio.deleteMany({ where: { id_rutina: Number(id) } });

      return tx.rutina.update({
        where: { id_rutina: Number(id) },
        data: {
          nombre: String(nombre).trim(),
          descripcion: descripcion ? String(descripcion).trim() : null,
          ejercicios: { create: ejerciciosLimpios }
        },
        include: {
          usuario: { select: USUARIO_SELECT },
          ejercicios: { orderBy: { orden: 'asc' } }
        }
      });
    });

    res.json(actualizada);
  } catch (error) {
    console.error('Error al actualizar la rutina:', error);
    res.status(500).json({ message: 'Error al actualizar la rutina' });
  }
};

/* =========================
   ELIMINAR RUTINA
=========================*/
exports.eliminarRutina = async (req, res) => {
  try {
    const { id } = req.params;

    const eliminada = await prisma.rutina.deleteMany({
      where: { id_rutina: Number(id) }
    });

    if (eliminada.count === 0) {
      return res.status(404).json({ message: 'No existe la rutina' });
    }

    res.json({ message: 'Rutina eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar la rutina:', error);
    res.status(500).json({ message: 'Error al eliminar la rutina' });
  }
};

/* =========================
   TOMAR RUTINA (copia a "Mis rutinas")
=========================*/
exports.tomarRutina = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario } = req.body;

    if (!id_usuario) {
      return res.status(400).json({ message: 'Falta el usuario que toma la rutina' });
    }

    const original = await prisma.rutina.findUnique({
      where: { id_rutina: Number(id) },
      include: { ejercicios: { orderBy: { orden: 'asc' } } }
    });

    if (!original) {
      return res.status(404).json({ message: 'La rutina no existe' });
    }

    const copia = await prisma.rutina.create({
      data: {
        id_usuario: Number(id_usuario),
        nombre: original.nombre,
        descripcion: original.descripcion,
        id_rutina_origen: original.id_rutina,
        ejercicios: {
          create: original.ejercicios.map(ej => ({
            nombre_ejercicio: ej.nombre_ejercicio,
            series: ej.series,
            repeticiones: ej.repeticiones,
            descanso_segundos: ej.descanso_segundos,
            notas: ej.notas,
            orden: ej.orden
          }))
        }
      },
      include: {
        usuario: { select: USUARIO_SELECT },
        ejercicios: { orderBy: { orden: 'asc' } }
      }
    });

    res.status(201).json(copia);
  } catch (error) {
    console.error('Error al tomar la rutina:', error);
    res.status(500).json({ message: 'Error al tomar la rutina' });
  }
};
