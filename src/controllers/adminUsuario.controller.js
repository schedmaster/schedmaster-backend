const prisma = require('../../prisma/client');

// ==========================================
// OBTENER USUARIOS
// ==========================================
exports.obtenerUsuariosFiltrados = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
  where: {
    OR: [
      {
        rol: {
          nombre_rol: {
            in: ['administrador_general', 'entrenador']
          }
        }
      },
      {
        AND: [
          {
            rol: {
              nombre_rol: {
                in: ['docente', 'estudiante']
              }
            }
          },
          {
            inscripciones: {
              some: {
                estado: 'aprobado' // 🔥 importante
              }
            }
          }
        ]
      }
    ]
  },
  include: {
    rol: true,
    carrera: true
  }
});

    res.json(usuarios);

  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// ==========================================
// ELIMINAR (LÓGICO)
// ==========================================
exports.eliminarUsuario = async (req, res) => {
  try {

    const { id_usuario } = req.body;

    await prisma.usuario.update({
      where: { id_usuario },
      data: { activo: false }
    });

    res.json({ message: 'Usuario desactivado correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

// ==========================================
// EDITAR USUARIO
// ==========================================
exports.editarUsuario = async (req, res) => {
  try {

    const {
      id_usuario,
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      id_rol,
      id_carrera
    } = req.body;

    const usuario = await prisma.usuario.update({
      where: { id_usuario },
      data: {
        nombre,
        apellido_paterno,
        apellido_materno,
        correo,
        id_rol,
        id_carrera
      }
    });

    res.json(usuario);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al editar usuario' });
  }
};

exports.crearUsuario = async (req, res) => {
  try {
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      id_rol
    } = req.body;

    // ⚠️ contraseña temporal (puedes mejorar luego)
    const contrasena = "123456";

    const nuevo = await prisma.usuario.create({
      data: {
        nombre,
        apellido_paterno,
        apellido_materno,
        correo,
        contrasena,
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