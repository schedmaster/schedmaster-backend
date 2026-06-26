const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("node:path");
const adminAsistenciaController = require("../controllers/adminAsistencia.controller");

const ASISTENCIA_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);
const ALLOWED_FILE_EXTENSIONS = new Set([".pdf", ".xls", ".xlsx", ".csv"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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
========================== */

router.get("/admin", adminAsistenciaController.getAsistenciasAdmin);
router.post("/registrar", adminAsistenciaController.registrarAsistencia);

router.post(
  "/upload-and-hash",
  upload.single("archivo"),
  adminAsistenciaController.uploadAndHash
);

router.get("/historico", adminAsistenciaController.obtenerHistorico);
router.get("/reporte", adminAsistenciaController.getReporteEstadisticas);
router.get("/dashboard-stats", adminAsistenciaController.getDashboardStats);

module.exports = router;