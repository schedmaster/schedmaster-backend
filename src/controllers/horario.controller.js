// controllers/horario.controller.js
const prisma = require('../../prisma/client'); // igual que catalogo.controller.js

exports.getHorarios = async (req, res) => {
  try {
    const horarios = await prisma.horario.findMany({
      include: {
        horarioDias: { include: { dia: true } },
        periodo: true,
      },
      orderBy: { hora_inicio: 'asc' },
    });

    const mapped = horarios.map(h => ({
      id_horario: h.id_horario,
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin,
      tipo_actividad: h.tipo_actividad,
      capacidad_maxima: h.capacidad_maxima,
      dias_semana: h.horarioDias.map(hd => hd.dia.nombre).join(','),
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error obteniendo horarios:', error);
    res.status(500).json({ message: 'Error obteniendo horarios' });
  }
};

// GET /api/horarios/:id/dias
exports.getDiasPorHorario = async (req, res) => {
  try {
    const { id } = req.params;

    const dias = await prisma.horarioDia.findMany({
      where: { id_horario: Number(id) },
      include: {
        dia: true,
      },
    });

    res.json(dias.map(d => d.dia));
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo días' });
  }
};