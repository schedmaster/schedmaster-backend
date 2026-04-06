const prisma = require('../../prisma/client');
const bcrypt = require('bcrypt');
const { generateRSAKeyPair, decryptAESKeyWithRSA, decryptWithAES } = require('../lib/cryptoHelper');
const { saveKey, consumeKey } = require('../lib/keyStore');
const {
  createLogin2FAChallenge,
  verifyLogin2FAChallenge,
  resendLogin2FACode
} = require('../services/twoFactorAuth.service');

function esContrasenaValida(password) {
  if (typeof password !== 'string') return false;

  const tieneLongitudMinima = password.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneNumeroOSimbolo = /[0-9]|[^A-Za-z0-9]/.test(password);

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
    // Validar correo institucional
if (!correoNormalizado.endsWith('@uteq.edu.mx')) {
  return res.status(400).json({
    message: 'Solo se permiten correos institucionales (@uteq.edu.mx)'
  });
}

    if (!esContrasenaValida(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número o símbolo especial'
      });
    }

    // 🔍 Buscar si el correo ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { correo: correoNormalizado }
    });

    // ❌ Si existe y está activo → rechazar
    if (usuarioExistente && usuarioExistente.activo) {
      return res.status(400).json({ message: 'El correo ya está registrado y en uso' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.$transaction(async (tx) => {
      const rol = parseInt(id_rol);
      const activoAutomatico = rol === 3 || rol === 4;

      let user;

      if (usuarioExistente && !usuarioExistente.activo) {
        // ♻️ Usuario inactivo → actualizar datos y reactivar
        user = await tx.usuario.update({
          where: { correo: correoNormalizado },
          data: {
            nombre,
            apellido_paterno,
            apellido_materno,
            contrasena: hashedPassword,
            id_carrera: id_carrera ? parseInt(id_carrera) : null,
            id_division: id_division ? parseInt(id_division) : null,
            cuatrimestre: cuatrimestre ? parseInt(cuatrimestre) : 1,
            id_rol: rol,
            activo: activoAutomatico || (rol === 1 || rol === 2)
          }
        });

        console.log(`♻️ Usuario reactivado: ${correoNormalizado}`);

      } else {
        // 🆕 Usuario nuevo
        user = await tx.usuario.create({
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
      }

      // Solo estudiantes y docentes crean inscripción
      if (rol === 1 || rol === 2) {
        const periodoActivo = await tx.periodo.findFirst({
          where: { estado: 'activo' },
          select: { id_periodo: true }
        });

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

        // 🧠 Evaluar con neurona solo si es usuario reactivado con historial
        if (usuarioExistente && !usuarioExistente.activo) {
          const { evaluarUsuario } = require('../lib/neurona');

          const todasAsistencias = await tx.asistencia.findMany({
            where: { id_usuario: user.id_usuario }
          });

          const asistidas = todasAsistencias.filter(a => a.asistio).length;
          const faltas = todasAsistencias.length - asistidas;

          if (todasAsistencias.length > 0) {
            const score = evaluarUsuario({ asistencias: asistidas, faltas });
            const prioridad = score >= 0.8 ? 'alta' : score >= 0.5 ? 'media' : 'baja';

            // Actualizar prioridad siempre
            await tx.inscripcion.update({
              where: { id_inscripcion: inscripcion.id_inscripcion },
              data: { prioridad }
            });

            // Auto-aprobar si score alto
            if (score >= 0.8) {
              await tx.inscripcion.update({
                where: { id_inscripcion: inscripcion.id_inscripcion },
                data: {
                  estado: 'aprobado',
                  fecha_decision: new Date()
                }
              });

              console.log(`🧠 Auto-aprobado por neurona (score: ${score.toFixed(3)}): ${correoNormalizado}`);
            }
          }
        }
      }

      return user;
    });

    const { contrasena: _, ...usuarioSeguro } = nuevoUsuario;
    const esReactivado = !!(usuarioExistente && !usuarioExistente.activo);

    res.status(201).json({
      message: esReactivado
        ? 'Usuario reactivado e inscrito correctamente.'
        : 'Usuario registrado correctamente.',
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