const prisma = require('../../prisma/client');

exports.obtenerPeriodos = async (req, res) => {
  try {
    // Buscamos todas las convocatorias y las ordenamos de la más nueva a la más vieja
    const periodos = await prisma.periodo.findMany({
      orderBy: { id_periodo: 'desc' } 
    });
    
    res.json(periodos);
  } catch (error) {
    console.error("❌ Error al obtener periodos:", error);
    res.status(500).json({ message: "Error al obtener la lista de convocatorias" });
  }
};