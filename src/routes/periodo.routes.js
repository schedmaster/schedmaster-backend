const express = require('express');
const router = express.Router();
const periodoController = require('../controllers/periodo.controller');

// Esta ruta responderá cuando Next.js pregunte por /api/periodos
router.get('/', periodoController.obtenerPeriodos);

module.exports = router;