const express = require('express');
const router = express.Router();

const periodoController = require('../controllers/adminConvocatoria.controller');

/* rutas */
router.post('/', periodoController.crearPeriodo);
router.get('/', periodoController.obtenerPeriodos);
router.post('/:id/notificar', periodoController.notificarConvocatoriaActiva);

// AGREGA ESTA LÍNEA: Ruta para actualizar una convocatoria existente
router.put('/:id', periodoController.actualizarPeriodo);

module.exports = router;
