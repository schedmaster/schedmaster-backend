const prisma = require('../../prisma/client');

exports.getDivisiones = async (req, res) => {
  try {
    const divisiones = await prisma.division.findMany({
      select: {
        id_division: true,
        siglas: true,
        nombre_division: true
      }
    })

    res.json(divisiones)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error obteniendo divisiones' })
  }
}

exports.getCarrerasByDivision = async (req, res) => {
  try {
    const id_division = parseInt(req.params.id_division)

    const carreras = await prisma.carrera.findMany({
      where: { id_division },
      select: {
        id_carrera: true,
        nombre_carrera: true
      }
    })

    res.json(carreras)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error obteniendo carreras' })
  }
}