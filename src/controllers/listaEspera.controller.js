const prisma = require('../../prisma/client');

exports.registrarCorreo = async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ message: 'Correo requerido' });
    }

    // verificar si hay periodo activo
    const periodoActivo = await prisma.periodo.findFirst({
      where: { estado: 'activo' }
    });

    if (periodoActivo) {
  return res.status(409).json({
    message: 'convocatoria_activa',
    periodo: periodoActivo
  });
}

    // verificar duplicado
    const existe = await prisma.listaEspera.findUnique({
      where: { correo }
    });

    if (existe) {
      return res.status(400).json({
        message: 'Este correo ya está en la lista de espera'
      });
    }

    const registro = await prisma.listaEspera.create({
      data: { correo }
    });

    res.status(201).json({
      message: 'Correo registrado en lista de espera',
      data: registro
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

exports.getConvocatoriaActiva = async (req, res) => {
  try {
    const periodoActivo = await prisma.periodo.findFirst({
      where: { estado: 'activo' }
    });

    if (!periodoActivo) {
      return res.json({ activa: false });
    }

    return res.json({
      activa: true,
      periodo: periodoActivo
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};