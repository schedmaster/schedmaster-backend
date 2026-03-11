const prisma = require('../../prisma/client');
const bcrypt = require('bcrypt');
const { generateRSAKeyPair, decryptAESKeyWithRSA, decryptWithAES } = require('../lib/cryptoHelper');
const { saveKey, consumeKey } = require('../lib/keyStore');

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

    const existe = await prisma.usuario.findUnique({
      where: { correo: correoNormalizado }
    });

    if (existe) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.$transaction(async (tx) => {

      //crear usuario
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
          id_rol: parseInt(id_rol),
          activo: false // 👈 EL CANDADO MÁGICO: Esto bloquea el acceso directo
        }
      });

      //periodo activo
      const periodoActivo = await tx.periodo.findFirst({
        where: { estado: 'activo' },
        select: { id_periodo: true }
      });

      if (!periodoActivo) {
        throw new Error('No existe un periodo activo');
      }

      //crear inscripción
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

      //guardar días seleccionados
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

    // Nunca exponer el hash de la contraseña en la respuesta
    const { contrasena: _, ...usuarioSeguro } = nuevoUsuario;

    res.status(201).json({
      message: 'Usuario registrado correctamente. En espera de aprobación.',
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
 * GET /auth/public-key
 * Genera un par RSA-2048 por sesión, guarda la clave privada en el keyStore
 * (TTL 5 min, uso único) y entrega la clave pública al cliente.
 * El cliente usará esta clave pública para cifrar la clave AES que protege
 * las credenciales antes de enviarlas por la red.
 */
exports.getPublicKey = (req, res) => {
  try {
    // Generar par RSA fresco para esta sesión
    const { publicKey, privateKey } = generateRSAKeyPair();

    // Persistir la clave privada en memoria con un ID único
    const keyId = saveKey(privateKey);

    return res.json({ keyId, publicKey });
  } catch (error) {
    console.error('Error generando par RSA:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * POST /auth/login
 * Recibe las credenciales cifradas con esquema híbrido RSA + AES-CBC.
 * Payload esperado:
 *  {
 *    keyId:         string   — ID de la clave privada en el store
 *    encryptedKey:  string   — Clave AES-256 cifrada con RSA-OAEP (Base64)
 *    iv:            string   — IV de 16 bytes usado en AES-CBC (Base64)
 *    encryptedData: string   — JSON { correo, password } cifrado con AES-CBC (Base64)
 *  }
 */
exports.login = async (req, res) => {
  try {
    const { keyId, encryptedKey, iv, encryptedData } = req.body;

    // Validar que lleguen todos los campos del esquema cifrado
    if (!keyId || !encryptedKey || !iv || !encryptedData) {
      return res.status(400).json({ message: 'Payload de login incompleto o sin cifrar' });
    }

    // Recuperar y consumir la clave privada (uso único — se elimina del store)
    const privateKey = consumeKey(keyId);

    if (!privateKey) {
      // keyId no existe, ya fue usado, o expiró (TTL 5 min)
      return res.status(401).json({ message: 'Clave de sesión inválida o expirada' });
    }

    // Descifrar la clave AES usando la clave privada RSA
    let aesKey;
    try {
      aesKey = decryptAESKeyWithRSA(privateKey, encryptedKey);
    } catch {
      return res.status(400).json({ message: 'No se pudo descifrar la clave de sesión' });
    }

    // Descifrar las credenciales con AES-256-CBC
    let credenciales;
    try {
      credenciales = decryptWithAES(aesKey, iv, encryptedData);
    } catch {
      return res.status(400).json({ message: 'No se pudieron descifrar las credenciales' });
    }

    const { correo, password } = credenciales;

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

    // Verificar contraseña contra el hash almacenado en BD (bcrypt, saltRounds=10)
    const match = await bcrypt.compare(password, user.contrasena);

    if (!match) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Nunca exponer el hash de la contraseña en la respuesta
    const { contrasena: _, ...usuarioSeguro } = user;

    // Revisar la última inscripción (por fecha de inscripción)
    const ultimaInscripcion = user.inscripciones
      .sort((a, b) => new Date(b.fecha_inscripcion) - new Date(a.fecha_inscripcion))[0];

    const estado = ultimaInscripcion?.estado;

    const ROLES_SIN_APROBACION = [3, 4]; // roles que no requieren aprobación

    if (!ROLES_SIN_APROBACION.includes(user.id_rol)) {
      // Si no tiene inscripción o no está aprobado, va a pending
      if (!estado || estado !== 'aprobado') {
        return res.json({ status: 'pending', usuario: usuarioSeguro });
      }
    }

    // Si pasa todas las verificaciones, está aprobado
    return res.json({ status: 'approved', usuario: usuarioSeguro });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};