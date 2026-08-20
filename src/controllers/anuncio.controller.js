const { PrismaClient } = require('@prisma/client');
const { uploadAnnouncementImage } = require('../services/cloudinary.service');

const prisma = new PrismaClient();

exports.crearAnuncio = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      prioridad,
      fecha_publicacion,
      activo
    } = req.body;

    const uploadedImage = req.file
      ? await uploadAnnouncementImage(req.file)
      : null;

    const nuevo = await prisma.anuncio.create({
      data: {
        titulo,
        descripcion,
        prioridad,
        fotografia: uploadedImage?.secureUrl || null,
        fecha_publicacion: fecha_publicacion
          ? new Date(fecha_publicacion)
          : new Date(),
        activo: activo ?? true
      }
    });

    res.status(201).json(nuevo);
  } catch (error) {
    console.error('ERROR CREATE ANUNCIO:', error);
    res.status(500).json({
      message: 'Error al crear anuncio',
      details: error.message
    });
  }
};

exports.obtenerAnuncios = async (req, res) => {
  try {
    const anuncios = await prisma.anuncio.findMany({
      orderBy: { id: 'desc' }
    });

    res.json(anuncios);
  } catch (error) {
    console.error('ERROR GET ANUNCIOS:', error);
    res.status(500).json({ message: 'Error al obtener anuncios' });
  }
};

exports.eliminarAnuncio = async (req, res) => {
  try {
    const { id } = req.params;

    const eliminado = await prisma.anuncio.deleteMany({
      where: {
        id: Number(id)
      }
    });

    if (eliminado.count === 0) {
      return res.status(404).json({ message: 'No existe el anuncio' });
    }

    res.json({ message: 'Anuncio eliminado correctamente' });
  } catch (error) {
    console.error('ERROR DELETE ANUNCIO:', error);
    res.status(500).json({ message: 'Error al eliminar anuncio' });
  }
};

exports.actualizarAnuncio = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, prioridad } = req.body;
    const uploadedImage = req.file
      ? await uploadAnnouncementImage(req.file)
      : null;

    const actualizado = await prisma.anuncio.update({
      where: {
        id: Number(id)
      },
      data: {
        titulo,
        descripcion,
        prioridad,
        fotografia: uploadedImage?.secureUrl || undefined
      }
    });

    res.json(actualizado);
  } catch (error) {
    console.error('ERROR UPDATE ANUNCIO:', error);
    res.status(500).json({
      message: 'Error al actualizar anuncio',
      details: error.message
    });
  }
};
