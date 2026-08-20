const crypto = require('node:crypto');

const CLOUDINARY_UPLOAD_URL = cloudName =>
  `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

function getCloudinaryConfig() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (cloudinaryUrl) {
    try {
      const parsedUrl = new URL(cloudinaryUrl);
      return {
        cloudName: parsedUrl.hostname,
        apiKey: parsedUrl.username,
        apiSecret: parsedUrl.password,
        folder: process.env.CLOUDINARY_FOLDER || 'schedmaster',
      };
    } catch (error) {
      throw new Error('CLOUDINARY_URL no tiene un formato valido.');
    }
  }

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'schedmaster',
  };
}

function requireCloudinaryConfig() {
  const config = getCloudinaryConfig();

  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    throw new Error('Faltan variables de entorno de Cloudinary.');
  }

  return config;
}

function signUploadParams(params, apiSecret) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${payload}${apiSecret}`)
    .digest('hex');
}

async function uploadAnnouncementImage(file) {
  const { cloudName, apiKey, apiSecret, folder } = requireCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    folder,
    timestamp,
  };

  const formData = new FormData();
  formData.append(
    'file',
    new Blob([file.buffer], { type: file.mimetype }),
    file.originalname
  );
  formData.append('api_key', apiKey);
  formData.append('folder', folder);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signUploadParams(paramsToSign, apiSecret));

  const response = await fetch(CLOUDINARY_UPLOAD_URL(cloudName), {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.error?.message || 'No se pudo subir la imagen a Cloudinary.';
    throw new Error(message);
  }

  return {
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
  };
}

module.exports = {
  uploadAnnouncementImage,
};
