const prisma = require('../../prisma/client');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
  try {
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      password,
      id_carrera,
      id_division,
      cuatrimestre,
      id_rol,
      id_horario,
      dias_seleccionados // 👈 NUEVO
    } = req.body;

    const correoNormalizado = correo.toLowerCase().trim();

    const existe = await prisma.usuario.findUnique({
      where: { correo: correoNormalizado }
    });

    if (existe) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.$transaction(async (tx) => {

      // 1️⃣ crear usuario
      const user = await tx.usuario.create({
        data: {
          nombre,
          apellido_paterno,
          apellido_materno,
          correo: correoNormalizado,
          contrasena: hashedPassword,
          id_carrera: id_carrera ? parseInt(id_carrera) : null,
          id_division: id_division ? parseInt(id_division) : null,
          cuatrimestre: cuatrimestre ? parseInt(cuatrimestre) : 1,
          id_rol: parseInt(id_rol)
        }
      });

      // 2️⃣ periodo activo
      const periodoActivo = await tx.periodo.findFirst({
        where: { estado: 'activo' },
        select: { id_periodo: true }
      });

      if (!periodoActivo) {
        throw new Error('No existe un periodo activo');
      }

      // 3️⃣ crear inscripción
      const inscripcion = await tx.inscripcion.create({
        data: {
          usuario: { connect: { id_usuario: user.id_usuario } },
          horario: { connect: { id_horario: parseInt(id_horario) } },
          periodo: { connect: { id_periodo: periodoActivo.id_periodo } },
          fecha_inscripcion: new Date(),
          estado: 'pendiente',
          prioridad: 'normal'
        }
      });

      // 🟢 4️⃣ guardar días seleccionados
      if (dias_seleccionados && dias_seleccionados.length > 0) {
        await tx.inscripcionDia.createMany({
          data: dias_seleccionados.map(id_dia => ({
            id_inscripcion: inscripcion.id_inscripcion,
            id_dia: parseInt(id_dia)
          }))
        });
      }

      return user;
    });

    res.status(201).json({
      message: 'Usuario registrado correctamente. En espera de aprobación.',
      usuario: nuevoUsuario
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
    }

    const normalizedEmail = correo.toLowerCase().trim();

    const user = await prisma.usuario.findUnique({
      where: { correo: normalizedEmail },
      include: {
        inscripciones: true // traemos todas las inscripciones
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const match = await bcrypt.compare(password, user.contrasena);

    if (!match) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Revisar la última inscripción (por fecha de inscripción)
    const ultimaInscripcion = user.inscripciones
      .sort((a, b) => new Date(b.fecha_inscripcion) - new Date(a.fecha_inscripcion))[0];

    const estado = ultimaInscripcion?.estado;

    const ROLES_SIN_APROBACION = [3, 4]; // roles que no requieren aprobación

    if (!ROLES_SIN_APROBACION.includes(user.id_rol)) {
      // Si no tiene inscripción o no está aprobado, va a pending
      if (!estado || estado !== 'aprobado') {
        return res.json({ status: 'pending', usuario: user });
      }
    }

    // Si pasa todas las verificaciones, está aprobado
    return res.json({ status: 'approved', usuario: user });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};