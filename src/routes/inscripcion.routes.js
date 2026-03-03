// Archivo: src/routes/inscripcion.routes.js
const express = require('express');
const router = express.Router();
const inscripcionController = require('../controllers/inscripcion.controller');

// Rutas para /api/inscripciones/...
router.get('/pendientes', inscripcionController.obtenerPendientes);
router.put('/aceptar', inscripcionController.aceptarInscripcion);
router.put('/rechazar', inscripcionController.rechazarInscripcion);

module.exports = router;