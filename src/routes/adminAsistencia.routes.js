const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("node:path");
const adminAsistenciaController = require("../controllers/adminAsistencia.controller");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/requireRole");

const ASISTENCIA_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);
const ALLOWED_FILE_EXTENSIONS = new Set([".pdf", ".xls", ".xlsx", ".csv"]);

const storage = multer.diskStorage({
  Destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}_${baseName}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const isAllowedType = ALLOWED_FILE_TYPES.has(file.mimetype);
  const isAllowedExtension = ALLOWED_FILE_EXTENSIONS.has(extension);

  if (!isAllowedType || !isAllowedExtension) {
    return cb(new Error("Solo se permiten archivos PDF, Excel o CSV."));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: ASISTENCIA_UPLOAD_LIMIT_BYTES,
    files: 1,
  },
});

/* ==========================
   RUTAS DEL MODULO
========================= */

// ✅ FIX T4: todas las rutas de asistencia ahora requieren JWT válido
// (authMiddleware). La ruta /registrar deriva id_registrado_por de la
// sesión en lugar de aceptarlo del cliente, evitando suplantación de identidad.
const ROL_ENTRENADOR = 3;
const ROL_ADMIN_GENERAL = 4;

router.get("/admin", authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), adminAsistenciaController.getAsistenciasAdmin);
router.post("/registrar", authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), adminAsistenciaController.registrarAsistencia);

router.post(
  "/upload-and-hash",
  authMiddleware,
  requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]),
  upload.single("archivo"),
  adminAsistenciaController.uploadAndHash
);

router.get("/historico", authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), adminAsistenciaController.obtenerHistorico);
router.get("/reporte", authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), adminAsistenciaController.getReporteEstadisticas);
router.get("/dashboard-stats", authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), adminAsistenciaController.getDashboardStats);

module.exports = router;
