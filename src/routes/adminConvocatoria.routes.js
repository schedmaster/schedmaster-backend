const express = require('express');
const router = express.Router();

const periodoController = require('../controllers/adminConvocatoria.controller');

/* rutas */
router.post('/', periodoController.crearPeriodo);
router.get('/', periodoController.obtenerPeriodos);

module.exports = router;