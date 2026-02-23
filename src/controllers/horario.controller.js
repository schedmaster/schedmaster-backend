// controllers/horario.controller.js
const prisma = require('../../prisma/client');

exports.getHorarios = async (req, res) => {
  try {
    const horarios = await prisma.horario.findMany({
      include: {
        periodo: true
      },
      orderBy: { dia_semana: 'asc' }
    });

    res.json(horarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo horarios' });
  }
};