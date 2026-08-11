const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const ROL_ENTRENADOR = 3;
const ROL_ADMIN_GENERAL = 4;

const {
  obtenerUsuariosFiltrados,
  toggleUsuario,
  editarUsuario,
  crearUsuario,
  obtenerBitacora,
  agregarBitacora,
} = require('../controllers/adminUsuario.controller');

// ✅ FIX T12: todas las rutas de administración de usuarios ahora requieren
// un JWT válido (authMiddleware) y rol entrenador o admin general
// (requireRole). Antes no tenían ninguna protección.

// Usuarios
router.get('/',              authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), obtenerUsuariosFiltrados);
router.post('/crear',        authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), crearUsuario);
router.put('/editar',        authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), editarUsuario);
router.put('/toggle',        authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), toggleUsuario);        // activa Y desactiva

// Bitácora
router.get('/bitacora/:id_usuario',  authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), obtenerBitacora);
router.post('/bitacora',             authMiddleware, requireRole([ROL_ENTRENADOR, ROL_ADMIN_GENERAL]), agregarBitacora);

module.exports = router;
