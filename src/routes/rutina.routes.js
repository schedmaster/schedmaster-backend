const express = require('express');
const router = express.Router();

const rutinaController = require('../controllers/rutina.controller');

// GET /api/rutinas -> comunidad (rutinas originales creadas por alumnos)
router.get('/', rutinaController.obtenerRutinasComunidad);

// GET /api/rutinas/usuario/:id_usuario -> "Mis rutinas"
router.get('/usuario/:id_usuario', rutinaController.obtenerRutinasPorUsuario);

// GET /api/rutinas/:id -> detalle de una rutina
router.get('/:id', rutinaController.obtenerRutinaPorId);

// POST /api/rutinas -> crear rutina
router.post('/', rutinaController.crearRutina);

// POST /api/rutinas/:id/tomar -> copiar una rutina de la comunidad a "Mis rutinas"
router.post('/:id/tomar', rutinaController.tomarRutina);

// PUT /api/rutinas/:id -> editar rutina
router.put('/:id', rutinaController.actualizarRutina);

// DELETE /api/rutinas/:id -> eliminar rutina
router.delete('/:id', rutinaController.eliminarRutina);

module.exports = router;
