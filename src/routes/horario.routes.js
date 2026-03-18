const express = require('express');
const router = express.Router();
const horarioController = require('../controllers/horario.controller'); 

// ==========================================
// RUTAS PARA LEER DATOS (GET)
// ==========================================
// Trae todos los horarios para llenar la tabla
router.get('/', horarioController.getHorarios);

// ==========================================
// RUTAS PARA MODIFICAR DATOS (POST, PUT, DELETE)
// ==========================================

// Crear un nuevo horario (POST)
router.post('/crear', horarioController.createHorario);

// Editar un horario existente (PUT)
router.put('/editar/:id', horarioController.updateHorario);

// Eliminar un horario de la base de datos (DELETE)
// Nota: Cambié esto para que coincida con tu controlador que usa deleteHorario
router.delete('/eliminar/:id', horarioController.deleteHorario);

module.exports = router;