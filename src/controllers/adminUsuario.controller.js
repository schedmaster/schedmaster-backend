const prisma = require('../../prisma/client');
const bcrypt = require('bcrypt');

// ==========================================
// OBTENER USUARIOS
// ==========================================
exports.obtenerUsuariosFiltrados = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        OR: [
          { rol: { nombre_rol: { in: ['administrador_general', 'entrenador'] } } },
          {
            AND: [
              { rol: { nombre_rol: { in: ['docente', 'estudiante'] } } },
              { inscripciones: { some: { estado: 'aprobado' } } }
            ]
          }
        ]
      },
      include: { rol: true, carrera: true }
    });
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// ==========================================
// TOGGLE ACTIVO / INACTIVO
// ==========================================
exports.toggleUsuario = async (req, res) => {
  try {
    const { id_usuario } = req.body;
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: parseInt(id_usuario) }
    });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    const actualizado = await prisma.usuario.update({
      where: { id_usuario: parseInt(id_usuario) },
      data: { activo: !usuario.activo }
    });
    res.json({ message: actualizado.activo ? 'Usuario activado' : 'Usuario desactivado', activo: actualizado.activo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al cambiar estado del usuario' });
  }
};

// ==========================================
// EDITAR USUARIO
// ==========================================
exports.editarUsuario = async (req, res) => {
  try {
    const { id_usuario, nombre, apellido_paterno, apellido_materno, correo, id_rol, id_carrera } = req.body;
    const usuario = await prisma.usuario.update({
      where: { id_usuario: parseInt(id_usuario) },
      data: {
        nombre,
        apellido_paterno,
        apellido_materno,
        correo,
        id_rol: parseInt(id_rol),
        ...(id_carrera !== undefined && { id_carrera: id_carrera ? parseInt(id_carrera) : null })
      }
    });
    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al editar usuario' });
  }
};

// ==========================================
// CREAR USUARIO (solo entrenador / admin general)
// ==========================================
exports.crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, correo, contrasena, id_rol } = req.body;

    if (!nombre || !apellido_paterno || !correo || !contrasena || !id_rol) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const existe = await prisma.usuario.findUnique({ where: { correo } });
    if (existe) return res.status(409).json({ message: 'Ya existe un usuario con ese correo' });

    const contrasenaHash = await bcrypt.hash(contrasena, 10);

    const nuevo = await prisma.usuario.create({
      data: {
        nombre,
        apellido_paterno,
        apellido_materno: apellido_materno || '',
        correo,
        contrasena: contrasenaHash,
        id_rol: parseInt(id_rol),
        activo: true
      }
    });
    res.json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
};

// ==========================================
// BITÁCORA — OBTENER ENTRADAS
// ==========================================
exports.obtenerBitacora = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const entradas = await prisma.bitacoraEntrada.findMany({
      where: { id_usuario: parseInt(id_usuario) },
      orderBy: { fecha: 'desc' }
    });
    res.json(entradas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener bitácora' });
  }
};

// ==========================================
// BITÁCORA — AGREGAR ENTRADA
// ==========================================
exports.agregarBitacora = async (req, res) => {
  try {
    const { id_usuario, texto, autor_nombre } = req.body;
    if (!id_usuario || !texto) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    const entrada = await prisma.bitacoraEntrada.create({
      data: {
        id_usuario: parseInt(id_usuario),
        autor_nombre: autor_nombre || 'Admin',
        texto
      }
    });
    res.json(entrada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al agregar entrada de bitácora' });
  }
};