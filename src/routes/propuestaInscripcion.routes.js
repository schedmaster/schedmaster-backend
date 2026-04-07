const express = require('express');
const router = express.Router();
const propuestaController = require('../controllers/propuestaInscripcion.controller');

// 1. Enviar propuesta (Admin -> Alumno)
router.post('/propuesta-inscripcion', propuestaController.enviarPropuesta);

// 2. Obtener propuesta pendiente del alumno
router.get('/usuario/:id_usuario', propuestaController.obtenerPropuestaUsuario);

// 3. Aceptar propuesta (Alumno -> Sistema)
router.post('/aceptar', propuestaController.aceptarPropuesta);

// 4. Rechazar propuesta (Alumno -> Sistema)
router.post('/rechazar', propuestaController.rechazarPropuesta);

module.exports = router;