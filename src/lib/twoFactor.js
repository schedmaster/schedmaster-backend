const crypto = require('node:crypto');

const CODE_TTL_MINUTES = parseInt(process.env.TWO_FA_CODE_TTL_MINUTES || '2', 10);
const MAX_ATTEMPTS = parseInt(process.env.TWO_FA_MAX_ATTEMPTS || '5', 10);
const MAX_SENDS = parseInt(process.env.TWO_FA_MAX_SENDS || '3', 10);
const RESEND_COOLDOWN_SECONDS = parseInt(process.env.TWO_FA_RESEND_COOLDOWN_SECONDS || '60', 10);

function normalizeCode(code) {
  return String(code || '').trim();
}

function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashVerificationCode(code) {
  const secret = process.env.TWO_FA_CODE_SECRET || '';
  return crypto.createHash('sha256').update(`${normalizeCode(code)}.${secret}`, 'utf8').digest('hex');
}

function verifyCodeAgainstHash(candidateCode, expectedHash) {
  const candidateHash = hashVerificationCode(candidateCode);
  const left = Buffer.from(candidateHash, 'hex');
  const right = Buffer.from(expectedHash, 'hex');

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function expirationDateFromNow() {
  return new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
}

module.exports = {
  CODE_TTL_MINUTES,
  MAX_ATTEMPTS,
  MAX_SENDS,
  RESEND_COOLDOWN_SECONDS,
  generateVerificationCode,
  hashVerificationCode,
  verifyCodeAgainstHash,
  expirationDateFromNow
};
