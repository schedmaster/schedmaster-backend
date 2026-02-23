const express = require('express');
const router = express.Router();

const horarioController = require('../controllers/horario.controller');

// GET horarios
router.get('/', horarioController.getHorarios);

module.exports = router;