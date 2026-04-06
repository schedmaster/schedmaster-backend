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
