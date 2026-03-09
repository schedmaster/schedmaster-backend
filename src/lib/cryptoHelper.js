/**
 * cryptoHelper.js
 * Utilidades criptográficas para el esquema híbrido RSA + AES.
 * Usa exclusivamente el módulo nativo 'node:crypto' de Node.js.
 *
 * Flujo general:
 *  1. El servidor genera un par RSA-2048 y expone la clave pública.
 *  2. El cliente genera una clave AES-256 + IV aleatorio, cifra las
 *     credenciales con AES-CBC y cifra la clave AES con RSA-OAEP.
 *  3. El servidor descifra la clave AES con su clave privada RSA y
 *     luego descifra las credenciales con AES-CBC.
 */

const crypto = require('node:crypto');

/**
 * Genera un par de claves RSA de 2048 bits.
 * Padding: OAEP con SHA-256 (más seguro que PKCS#1 v1.5).
 *
 * @returns {{ publicKey: string, privateKey: string }} Claves en formato PEM
 */
function generateRSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  return { publicKey, privateKey };
}

/**
 * Descifra la clave AES que el cliente cifró con la clave pública RSA.
 *
 * @param {string} privateKeyPem - Clave privada RSA en formato PEM
 * @param {string} encryptedKeyB64 - Clave AES cifrada en Base64
 * @returns {Buffer} Clave AES en texto plano (32 bytes para AES-256)
 */
function decryptAESKeyWithRSA(privateKeyPem, encryptedKeyB64) {
  const encryptedKeyBuffer = Buffer.from(encryptedKeyB64, 'base64');

  // OAEP-SHA256 coincide con el padding que debe usar el cliente
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    encryptedKeyBuffer
  );

  return aesKey;
}

/**
 * Descifra los datos cifrados con AES-256-CBC.
 *
 * @param {Buffer} aesKey  - Clave AES de 32 bytes
 * @param {string} ivB64   - IV de 16 bytes en Base64
 * @param {string} dataB64 - Datos cifrados en Base64
 * @returns {object} Objeto JSON descifrado (p. ej. { correo, password })
 */
function decryptWithAES(aesKey, ivB64, dataB64) {
  const iv             = Buffer.from(ivB64, 'base64');
  const encryptedData  = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ]);

  // Se espera que el cliente haya enviado un JSON serializado
  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = { generateRSAKeyPair, decryptAESKeyWithRSA, decryptWithAES };
