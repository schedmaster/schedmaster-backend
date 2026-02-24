const express = require('express');
const router = express.Router();

const horarioController = require('../controllers/horario.controller'); // 👈 ESTA LÍNEA FALTA

router.get('/', horarioController.getHorarios);
router.get('/:id/dias', horarioController.getDiasPorHorario);

module.exports = router;