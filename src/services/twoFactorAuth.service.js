const prisma = require('../../prisma/client');
const {
  CODE_TTL_MINUTES,
  MAX_ATTEMPTS,
  MAX_SENDS,
  RESEND_COOLDOWN_SECONDS,
  generateVerificationCode,
  hashVerificationCode,
  verifyCodeAgainstHash,
  expirationDateFromNow
} = require('../lib/twoFactor');
const { sendLogin2FACodeEmail } = require('../lib/mailer');
const { buildLoginResponse } = require('./authResponse.service');

async function invalidateActiveChallengesByUser(userId) {
  await prisma.loginChallenge2FA.updateMany({
    where: {
      id_usuario: userId,
      intent: 'login',
      consumed_at: null,
      expires_at: { gt: new Date() }
    },
    data: {
      consumed_at: new Date()
    }
  });
}

async function createLogin2FAChallenge(user) {
  const code = generateVerificationCode();

  await invalidateActiveChallengesByUser(user.id_usuario);

  const challenge = await prisma.loginChallenge2FA.create({
    data: {
      id_usuario: user.id_usuario,
      code_hash: hashVerificationCode(code),
      expires_at: expirationDateFromNow(),
      intent: 'login',
      max_attempts: MAX_ATTEMPTS,
      attempts: 0,
      send_count: 1,
      last_sent_at: new Date()
    }
  });

  await sendLogin2FACodeEmail({
    to: user.correo,
    name: user.nombre,
    code,
    ttlMinutes: CODE_TTL_MINUTES
  });

  return {
    challengeId: challenge.id,
    expiresInSeconds: CODE_TTL_MINUTES * 60
  };
}

async function resendLogin2FACode(challengeId) {
  const challenge = await prisma.loginChallenge2FA.findUnique({
    where: { id: challengeId },
    include: {
      usuario: {
        select: {
          id_usuario: true,
          nombre: true,
          correo: true
        }
      }
    }
  });

  if (!challenge || challenge.intent !== 'login') {
    return { status: 'invalid_challenge' };
  }

  if (challenge.consumed_at) {
    return { status: 'consumed' };
  }

  if (challenge.expires_at <= new Date()) {
    return { status: 'expired' };
  }

  if (challenge.send_count >= MAX_SENDS) {
    return { status: 'max_sends_reached' };
  }

  const secondsSinceLastSend = Math.floor((Date.now() - new Date(challenge.last_sent_at).getTime()) / 1000);
  if (secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
    return {
      status: 'cooldown',
      retryAfterSeconds: RESEND_COOLDOWN_SECONDS - secondsSinceLastSend
    };
  }

  const code = generateVerificationCode();

  await prisma.loginChallenge2FA.update({
    where: { id: challenge.id },
    data: {
      code_hash: hashVerificationCode(code),
      attempts: 0,
      send_count: challenge.send_count + 1,
      last_sent_at: new Date(),
      expires_at: expirationDateFromNow()
    }
  });

  await sendLogin2FACodeEmail({
    to: challenge.usuario.correo,
    name: challenge.usuario.nombre,
    code,
    ttlMinutes: CODE_TTL_MINUTES
  });

  return {
    status: 'resent',
    expiresInSeconds: CODE_TTL_MINUTES * 60
  };
}

async function verifyLogin2FAChallenge(challengeId, code) {
  const challenge = await prisma.loginChallenge2FA.findUnique({
    where: { id: challengeId }
  });

  if (!challenge || challenge.intent !== 'login') {
    return { status: 'invalid_challenge' };
  }

  if (challenge.consumed_at) {
    return { status: 'consumed' };
  }

  if (challenge.expires_at <= new Date()) {
    return { status: 'expired' };
  }

  if (challenge.attempts >= challenge.max_attempts) {
    return { status: 'attempts_exceeded' };
  }

  const isCodeValid = verifyCodeAgainstHash(code, challenge.code_hash);
  if (!isCodeValid) {
    const nextAttempts = challenge.attempts + 1;

    await prisma.loginChallenge2FA.update({
      where: { id: challenge.id },
      data: {
        attempts: nextAttempts,
        consumed_at: nextAttempts >= challenge.max_attempts ? new Date() : null
      }
    });

    return {
      status: nextAttempts >= challenge.max_attempts ? 'attempts_exceeded' : 'invalid_code',
      remainingAttempts: Math.max(challenge.max_attempts - nextAttempts, 0)
    };
  }

  await prisma.loginChallenge2FA.update({
    where: { id: challenge.id },
    data: {
      consumed_at: new Date()
    }
  });

  const user = await prisma.usuario.findUnique({
    where: { id_usuario: challenge.id_usuario },
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
    return { status: 'user_not_found' };
  }

  return {
    status: 'verified',
    authResponse: buildLoginResponse(user)
  };
}

module.exports = {
  createLogin2FAChallenge,
  resendLogin2FACode,
  verifyLogin2FAChallenge
};
