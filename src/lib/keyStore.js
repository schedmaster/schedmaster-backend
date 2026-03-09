/**
 * keyStore.js
 * Almacén en memoria para pares de claves RSA temporales.
 * Cada entrada vive un máximo de KEY_TTL_MS milisegundos.
 * El keyId se invalida tras su primer uso (consumo único).
 */

const { randomUUID } = require('node:crypto');

// Tiempo de vida de cada clave: 5 minutos
const KEY_TTL_MS = 5 * 60 * 1000;

// Map principal: keyId → { privateKey, expiresAt }
const store = new Map();

/**
 * Guarda una clave privada en el store y devuelve el keyId asignado.
 * @param {string} privateKey - Clave privada RSA en formato PEM
 * @returns {string} keyId único (UUID v4)
 */
function saveKey(privateKey) {
  const keyId = randomUUID();
  store.set(keyId, {
    privateKey,
    expiresAt: Date.now() + KEY_TTL_MS
  });
  return keyId;
}

/**
 * Recupera y elimina la clave privada asociada al keyId (uso único).
 * Retorna null si no existe o si ya expiró.
 * @param {string} keyId
 * @returns {string|null} privateKey PEM o null
 */
function consumeKey(keyId) {
  const entry = store.get(keyId);

  // Clave no encontrada
  if (!entry) return null;

  // Clave expirada — eliminar y rechazar
  if (Date.now() > entry.expiresAt) {
    store.delete(keyId);
    return null;
  }

  // Consumo único: se elimina antes de retornar
  store.delete(keyId);
  return entry.privateKey;
}

/**
 * Limpieza periódica de entradas expiradas para evitar acumulación en memoria.
 * Se ejecuta cada minuto de forma automática.
 */
setInterval(() => {
  const now = Date.now();
  for (const [keyId, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(keyId);
    }
  }
}, 60 * 1000);

module.exports = { saveKey, consumeKey };
