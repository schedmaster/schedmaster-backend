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
    console.error(error);
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
    console.error(error);
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

    res.json(actualizado);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar convocatoria' });
  }
};