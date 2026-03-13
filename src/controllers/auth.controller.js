const prisma = require('../../prisma/client');
const bcrypt = require('bcrypt');
const { generateRSAKeyPair, decryptAESKeyWithRSA, decryptWithAES } = require('../lib/cryptoHelper');
const { saveKey, consumeKey } = require('../lib/keyStore');

/**
 * REGISTRO DE USUARIO
 */
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
      dias_seleccionados
    } = req.body;

    const correoNormalizado = correo.toLowerCase().trim();

    const existe = await prisma.usuario.findUnique({ where: { correo: correoNormalizado } });
    if (existe) return res.status(400).json({ message: 'El correo ya está registrado' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.$transaction(async (tx) => {
      const rol = parseInt(id_rol);

      // Activo automático solo para entrenador y admin
      const activoAutomatico = rol === 3 || rol === 4;

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
          id_rol: rol,
          activo: activoAutomatico
        }
      });

      // Solo estudiantes y docentes crean inscripción
      if (rol === 1 || rol === 2) {
        const periodoActivo = await tx.periodo.findFirst({ where: { estado: 'activo' }, select: { id_periodo: true } });
        if (!periodoActivo) throw new Error('No existe un periodo activo');

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

        if (dias_seleccionados && dias_seleccionados.length > 0) {
          await tx.inscripcionDia.createMany({
            data: dias_seleccionados.map(id_dia => ({
              id_inscripcion: inscripcion.id_inscripcion,
              id_dia: parseInt(id_dia)
            }))
          });
        }
      }

      return user;
    });

    const { contrasena: _, ...usuarioSeguro } = nuevoUsuario;

    res.status(201).json({
      message: 'Usuario registrado correctamente.',
      usuario: usuarioSeguro
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


/**
 * OBTENER CLAVE PÚBLICA RSA
 */
exports.getPublicKey = (req, res) => {
  try {
    const { publicKey, privateKey } = generateRSAKeyPair();
    const keyId = saveKey(privateKey);
    return res.json({ keyId, publicKey });
  } catch (error) {
    console.error('Error generando par RSA:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};


/**
 * LOGIN
 */
exports.login = async (req, res) => {
  try {
    const { keyId, encryptedKey, iv, encryptedData } = req.body;
    if (!keyId || !encryptedKey || !iv || !encryptedData) {
      return res.status(400).json({ message: 'Payload de login incompleto o sin cifrar' });
    }

    const privateKey = consumeKey(keyId);
    if (!privateKey) return res.status(401).json({ message: 'Clave de sesión inválida o expirada' });

    let aesKey;
    try { aesKey = decryptAESKeyWithRSA(privateKey, encryptedKey); }
    catch { return res.status(400).json({ message: 'No se pudo descifrar la clave de sesión' }); }

    let credenciales;
    try { credenciales = decryptWithAES(aesKey, iv, encryptedData); }
    catch { return res.status(400).json({ message: 'No se pudieron descifrar las credenciales' }); }

    const { correo, password } = credenciales;
    if (!correo || !password) return res.status(400).json({ message: 'Correo y contraseña son requeridos' });

    const normalizedEmail = correo.toLowerCase().trim();

    const user = await prisma.usuario.findUnique({
      where: { correo: normalizedEmail },
      include: { inscripciones: true }
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const match = await bcrypt.compare(password, user.contrasena);
    if (!match) return res.status(401).json({ message: 'Contraseña incorrecta' });

    const { contrasena: _, ...usuarioSeguro } = user;

    // 🔹 Entrenador o administrador → acceso directo
    if (user.id_rol === 3 || user.id_rol === 4) {
      return res.json({
        status: user.activo ? 'approved' : 'pending',
        usuario: usuarioSeguro
      });
    }

    // 🔹 Estudiante o docente → validar última inscripción
    const ultimaInscripcion = user.inscripciones
      .sort((a, b) => new Date(b.fecha_inscripcion) - new Date(a.fecha_inscripcion))[0];

    let estadoInscripcion = ultimaInscripcion ? ultimaInscripcion.estado : 'pendiente';

    return res.json({
      status: estadoInscripcion === 'aprobado' ? 'approved' : 'pending',
      usuario: { ...usuarioSeguro, estadoInscripcion }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};