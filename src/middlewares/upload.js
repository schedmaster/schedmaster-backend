const multer = require('multer');
const path = require('node:path');

const IMAGE_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: 'public/imagenes/',

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const isAllowedType = ALLOWED_IMAGE_TYPES.has(file.mimetype);
  const isAllowedExtension = ALLOWED_IMAGE_EXTENSIONS.has(extension);

  if (!isAllowedType || !isAllowedExtension) {
    return cb(new Error('Solo se permiten imagenes JPG, PNG o WebP.'));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: IMAGE_UPLOAD_LIMIT_BYTES,
    files: 1,
  },
});

module.exports = upload;