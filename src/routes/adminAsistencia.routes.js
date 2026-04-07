const express = require("express");
const router = express.Router();
const multer = require("multer");
const adminAsistenciaController = require("../controllers/adminAsistencia.controller");

// Configuración de almacenamiento para los archivos de asistencia
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  }
});

const upload = multer({ storage });

/* ==========================
   RUTAS DEL MÓDULO
========================== */

// Obtener datos para la tabla principal
router.get("/admin", adminAsistenciaController.getAsistenciasAdmin);

// Registrar o actualizar asistencia
router.post("/registrar", adminAsistenciaController.registrarAsistencia);

// Subir archivo PDF/Excel y generar hash
router.post(
  "/upload-and-hash",
  upload.single("archivo"),
  adminAsistenciaController.uploadAndHash
);

// Ver historial de archivos
router.get("/historico", adminAsistenciaController.obtenerHistorico);

// Generar reporte de estadísticas
router.get("/reporte", adminAsistenciaController.getReporteEstadisticas);

// Obtener las métricas y datos para el Dashboard
router.get("/dashboard-stats", adminAsistenciaController.getDashboardStats);

module.exports = router;