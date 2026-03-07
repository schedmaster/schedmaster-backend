const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* Crear convocatoria (Periodo) */
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

/* Obtener convocatorias */
exports.obtenerPeriodos = async (req, res) => {
  try {
    const periodos = await prisma.periodo.findMany({
      orderBy: { id_periodo: 'desc' }
    });

    res.json(periodos);

  } catch (error) {
    res.status(500).json({ error: "Error al obtener convocatorias" });
  }
};