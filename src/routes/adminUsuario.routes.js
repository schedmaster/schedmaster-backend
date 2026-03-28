const express = require('express');
const router = express.Router();

const {
  obtenerUsuariosFiltrados,
  eliminarUsuario,
  editarUsuario
} = require('../controllers/adminUsuario.controller');

// GET
router.get('/', obtenerUsuariosFiltrados);

// PUT eliminar
router.put('/eliminar', eliminarUsuario);

// PUT editar
router.put('/editar', editarUsuario);

router.put('/', editarUsuario);

module.exports = router;