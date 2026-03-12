const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    // AUTO-CIERRE: Pasa a 'inactivo' las que ya vencieron su fecha de inscripción
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
    const { id } = req.params; // El ID que viene en la URL
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

    res.json(periodoActualizado);

  } catch (error) {
    console.error("Error al actualizar en Prisma:", error);
    res.status(500).json({ error: "Error al actualizar la convocatoria" });
  }
};