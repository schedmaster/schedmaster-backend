const express = require('express');
const router = express.Router();

const {
  obtenerUsuariosFiltrados,
  toggleUsuario,
  editarUsuario,
  crearUsuario,
  obtenerBitacora,
  agregarBitacora,
} = require('../controllers/adminUsuario.controller');

// Usuarios
router.get('/',              obtenerUsuariosFiltrados);
router.post('/crear',        crearUsuario);
router.put('/editar',        editarUsuario);
router.put('/toggle',        toggleUsuario);        // activa Y desactiva

// Bitácora
router.get('/bitacora/:id_usuario',  obtenerBitacora);
router.post('/bitacora',             agregarBitacora);

module.exports = router;
