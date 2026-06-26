const prisma = require('../../prisma/client');
const bcrypt = require('bcrypt');
const { generateRSAKeyPair, decryptAESKeyWithRSA, decryptWithAES } = require('../lib/cryptoHelper');
const { saveKey, consumeKey } = require('../lib/keyStore');
const { buildLoginResponse } = require('../services/authResponse.service');
const { evaluarUsuario } = require('../lib/neurona');
const {
  createLogin2FAChallenge,
  verifyLogin2FAChallenge,
  resendLogin2FACode
} = require('../services/twoFactorAuth.service');

const DISABLE_LOGIN_2FA = ['1', 'true', 'yes'].includes(String(process.env.DISABLE_LOGIN_2FA || '').toLowerCase());

async function getLoginResponseForUser(userId) {
  const user = await prisma.usuario.findUnique({
    where: { id_usuario: userId },
    include: {
      carrera: true,
      division: true,
      inscripciones: {
        include: {
          horario: {
            include: {
              periodo: true
            }
          },
          propuestas: {
            include: {
              dias: {
                include: {
                  dia: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  return buildLoginResponse(user);
}

function esContrasenaValida(password) {
  if (typeof password !== 'string') return false;

  const tieneLongitudMinima = password.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneNumeroOSimbolo = /\d|[^A-Za-z0-9]/.test(password);

  return tieneLongitudMinima && tieneMayuscula && tieneNumeroOSimbolo;
}

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
function toOptionalInt(value, fallback = null) {
  return value ? Number.parseInt(value) : fallback;
}

function isInscribableRole(rol) {
  return rol === 1 || rol === 2;
}

function getPrioridadByScore(score) {
  if (score >= 0.8) return 'alta';
  if (score >= 0.5) return 'media';
  return 'baja';
}

function buildUsuarioData(input, hashedPassword, rol, activo) {
  return {
    nombre: input.nombre,
    apellido_paterno: input.apellido_paterno,
    apellido_materno: input.apellido_materno,
    contrasena: hashedPassword,
    id_carrera: toOptionalInt(input.id_carrera),
    id_division: toOptionalInt(input.id_division),
    cuatrimestre: toOptionalInt(input.cuatrimestre, 1),
    id_rol: rol,
    activo
  };
}

async function saveUsuario(tx, input, correoNormalizado, usuarioExistente, hashedPassword, rol, activo) {
  const data = buildUsuarioData(input, hashedPassword, rol, activo);

  if (usuarioExistente?.activo === false) {
    return tx.usuario.update({
      where: { correo: correoNormalizado },
      data
    });
  }

  return tx.usuario.create({
    data: {
      ...data,
      correo: correoNormalizado
    }
  });
}

async function createPendingInscripcion(tx, userId, idHorario, diasSeleccionados = []) {
  const periodoActivo = await tx.periodo.findFirst({
    where: { estado: 'activo' },
    select: { id_periodo: true }
  });

  if (!periodoActivo) {
    throw new Error('No existe un periodo activo');
  }

  const inscripcion = await tx.inscripcion.create({
    data: {
      usuario: { connect: { id_usuario: userId } },
      horario: { connect: { id_horario: Number.parseInt(idHorario) } },
      periodo: { connect: { id_periodo: periodoActivo.id_periodo } },
      fecha_inscripcion: new Date(),
      estado: 'pendiente',
      prioridad: 'normal'
    }
  });

  if (diasSeleccionados.length === 0) {
    return inscripcion;
  }

  await tx.inscripcionDia.createMany({
    data: diasSeleccionados.map(idDia => ({
      id_inscripcion: inscripcion.id_inscripcion,
      id_dia: Number.parseInt(idDia)
    }))
  });

  return inscripcion;
}

async function updateInscripcionByHistory(tx, user, inscripcion, correoNormalizado) {
  const todasAsistencias = await tx.asistencia.findMany({
    where: { id_usuario: user.id_usuario }
  });

  if (todasAsistencias.length === 0) {
    return;
  }

  const asistidas = todasAsistencias.filter(asistencia => asistencia.asistio).length;
  const faltas = todasAsistencias.length - asistidas;
  const score = evaluarUsuario({ asistencias: asistidas, faltas });
  const prioridad = getPrioridadByScore(score);
  const shouldApprove = score >= 0.8;

  await tx.inscripcion.update({
    where: { id_inscripcion: inscripcion.id_inscripcion },
    data: {
      prioridad,
      ...(shouldApprove && { estado: 'aprobado', fecha_decision: new Date() })
    }
  });

  if (shouldApprove) {
    console.log(`Auto-aprobado por neurona (score: ${score.toFixed(3)}): ${correoNormalizado}`);
  }
}

async function createRegisteredUser(tx, input, correoNormalizado, usuarioExistente, hashedPassword) {
  const rol = Number.parseInt(input.id_rol);
  const activoAutomatico = rol === 3 || rol === 4;
  const activo = activoAutomatico || (usuarioExistente?.activo === false && isInscribableRole(rol));
  const user = await saveUsuario(tx, input, correoNormalizado, usuarioExistente, hashedPassword, rol, activo);

  if (!isInscribableRole(rol)) {
    return user;
  }

  const inscripcion = await createPendingInscripcion(tx, user.id_usuario, input.id_horario, input.dias_seleccionados);

  if (usuarioExistente?.activo === false) {
    await updateInscripcionByHistory(tx, user, inscripcion, correoNormalizado);
  }

  return user;
}

/**
 * REGISTRO DE USUARIO
 */
exports.register = async (req, res) => {
  try {
    const input = req.body;
    const correoNormalizado = input.correo.toLowerCase().trim();

    if (!correoNormalizado.endsWith('@uteq.edu.mx')) {
      return res.status(400).json({
        message: 'Solo se permiten correos institucionales (@uteq.edu.mx)'
      });
    }

    if (!esContrasenaValida(input.password)) {
      return res.status(400).json({
        message: 'La contrasena debe tener al menos 8 caracteres, una mayuscula y un numero o simbolo especial'
      });
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { correo: correoNormalizado }
    });

    if (usuarioExistente?.activo) {
      return res.status(400).json({ message: 'El correo ya esta registrado y en uso' });
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const nuevoUsuario = await prisma.$transaction(tx =>
      createRegisteredUser(tx, input, correoNormalizado, usuarioExistente, hashedPassword)
    );

    const usuarioSeguro = { ...nuevoUsuario };
    delete usuarioSeguro.contrasena;

    const esReactivado = usuarioExistente?.activo === false;
    const message = esReactivado
      ? 'Usuario reactivado e inscrito correctamente.'
      : 'Usuario registrado correctamente.';

    res.status(201).json({ message, usuario: usuarioSeguro });
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
    const { keyId, encryptedKey, iv, encryptedData } = req.body;

    if (!keyId || !encryptedKey || !iv || !encryptedData) {
      return res.status(400).json({ message: 'Payload de login incompleto o sin cifrar' });
    }

    const privateKey = consumeKey(keyId);
    if (!privateKey) {
      return res.status(401).json({ message: 'Clave de sesión inválida o expirada' });
    }

    let aesKey;
    try {
      aesKey = decryptAESKeyWithRSA(privateKey, encryptedKey);
    } catch {
      return res.status(400).json({ message: 'No se pudo descifrar la clave de sesión' });
    }

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
      select: {
        id_usuario: true,
        nombre: true,
        correo: true,
        contrasena: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const match = await bcrypt.compare(password, user.contrasena);
    if (!match) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    if (DISABLE_LOGIN_2FA) {
      const authResponse = await getLoginResponseForUser(user.id_usuario);

      if (!authResponse) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      return res.json(authResponse);
    }

    const challenge = await createLogin2FAChallenge(user);

    return res.json({
      requiresTwoFactor: true,
      message: 'Se envio un codigo de verificacion a tu correo.',
      twoFactorToken: challenge.challengeId,
      expiresInSeconds: challenge.expiresInSeconds
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { twoFactorToken, code } = req.body;

    if (!twoFactorToken || !code) {
      return res.status(400).json({ message: 'twoFactorToken y code son requeridos' });
    }

    const result = await verifyLogin2FAChallenge(twoFactorToken, code);

    if (result.status === 'verified') {
      return res.json(result.authResponse);
    }

    if (result.status === 'invalid_code') {
      return res.status(401).json({
        message: 'Codigo de verificacion incorrecto',
        remainingAttempts: result.remainingAttempts
      });
    }

    if (result.status === 'attempts_exceeded') {
      return res.status(429).json({ message: 'Numero maximo de intentos excedido' });
    }

    if (result.status === 'expired') {
      return res.status(410).json({ message: 'El codigo de verificacion expiro' });
    }

    if (result.status === 'consumed') {
      return res.status(409).json({ message: 'El codigo ya fue utilizado' });
    }

    if (result.status === 'user_not_found') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.status(400).json({ message: 'Reto 2FA invalido' });
  } catch (error) {
    console.error('Error verificando 2FA:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.resend2FA = async (req, res) => {
  try {
    const { twoFactorToken } = req.body;

    if (!twoFactorToken) {
      return res.status(400).json({ message: 'twoFactorToken es requerido' });
    }

    const result = await resendLogin2FACode(twoFactorToken);

    if (result.status === 'resent') {
      return res.json({
        message: 'Codigo reenviado al correo registrado',
        expiresInSeconds: result.expiresInSeconds
      });
    }

    if (result.status === 'cooldown') {
      return res.status(429).json({
        message: 'Espera antes de volver a solicitar un codigo',
        retryAfterSeconds: result.retryAfterSeconds
      });
    }

    if (result.status === 'max_sends_reached') {
      return res.status(429).json({ message: 'Numero maximo de reenvios alcanzado' });
    }

    if (result.status === 'expired') {
      return res.status(410).json({ message: 'El codigo de verificacion expiro' });
    }

    if (result.status === 'consumed') {
      return res.status(409).json({ message: 'El codigo ya fue utilizado' });
    }

    return res.status(400).json({ message: 'Reto 2FA invalido' });
  } catch (error) {
    console.error('Error reenviando 2FA:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.getPerfil = async (req, res) => {
  try {
    const { id_usuario } = req.params;

    if (!id_usuario || Number.isNaN(Number(id_usuario))) {
      return res.status(400).json({ message: 'id_usuario invalido' });
    }

    const user = await prisma.usuario.findUnique({
      where: { id_usuario: Number(id_usuario) },
      include: {
        carrera: true,
        division: true,
        inscripciones: {
          include: {
            horario: {
              include: {
                periodo: true,
                horarioDias: {
                  include: { dia: true }
                }
              }
            },
            diasSeleccionados: {
              include: { dia: true }
            },
            propuestas: {
              include: {
                dias: {
                  include: {
                    dia: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json(buildLoginResponse(user));
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};