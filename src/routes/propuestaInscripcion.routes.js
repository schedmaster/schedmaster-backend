const express = require('express');
const router = express.Router();

const propuestaController = require('../controllers/propuestaInscripcion.controller');

// Enviar propuesta
router.post(
  '/propuesta-inscripcion',
  propuestaController.enviarPropuesta
);

// Obtener propuesta del usuario
router.get(
  '/usuario/:id_usuario',
  propuestaController.obtenerPropuestaUsuario
);

// Aceptar propuesta (ESTA ES LA QUE TE FALTABA)
router.post(
  '/aceptar',
  propuestaController.aceptarPropuesta
);

module.exports = router;