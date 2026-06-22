require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./src/prismaClient');

// Rutas
const authRoutes = require('./src/routes/auth.routes');
const catalogoRoutes = require('./src/routes/catalogo.routes');
const horarioRoutes = require('./src/routes/horario.routes');
const listaEsperaRoutes = require('./src/routes/listaEspera.routes');
const inscripcionRoutes = require('./src/routes/inscripcion.routes');
const adminAsistenciaRoutes = require("./src/routes/adminAsistencia.routes");
const periodoRoutes = require('./src/routes/adminConvocatoria.routes');
const propuestaRoutes = require('./src/routes/propuestaInscripcion.routes');
const adminUsuarioRoutes = require('./src/routes/adminUsuario.routes');
const anuncioRoutes = require('./src/routes/anuncio.routes');
const neuronaRoutes = require('./src/routes/neurona.routes');

const app = express();

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'https://schedmaster-frontend.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || (typeof origin === 'string' && origin.endsWith('.vercel.app'))) {
      callback(null, origin);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`📡 Petición recibida: ${req.method} ${req.url}`);
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/lista-espera', listaEsperaRoutes);
app.use('/api/inscripciones', inscripcionRoutes);
app.use('/api/periodos', require('./src/routes/periodo.routes'));
app.use('/api/asistencias', adminAsistenciaRoutes);
app.use('/api/admin-convocatoria', periodoRoutes);
app.use('/api/propuestas', propuestaRoutes);
app.use('/api/usuarios', adminUsuarioRoutes);
app.use('/api/anuncios', anuncioRoutes);
app.use('/api/neurona', neuronaRoutes);

app.use('/uploads', express.static('uploads'));
app.use('/imagenes', express.static('public/imagenes'));

// Ruta de prueba de DB
app.get('/test-db', async (req, res) => {
  try {
    const totalUsuarios = await prisma.usuario.count();
    res.json({ message: 'Conexión a MySQL exitosa', usuariosEnSistema: totalUsuarios });
  } catch (error) {
    console.error("❌ Error en test-db:", error);
    res.status(500).json({ message: 'Error de conexión', details: error.message });
  }
});

module.exports = app;
