const express = require('express');
const router = express.Router();
const controller = require('../controllers/listaEspera.controller');

router.post('/', controller.registrarCorreo);

module.exports = router;