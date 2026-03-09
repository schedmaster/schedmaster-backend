const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth.controller');

// Entrega la clave pública RSA para cifrar las credenciales del login
router.get('/public-key', auth.getPublicKey);

router.post('/register', auth.register);
router.post('/login', auth.login);

module.exports = router;
