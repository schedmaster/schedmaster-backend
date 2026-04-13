require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// 🔹 Importar rutas
const authRoutes = require('./src/routes/auth.routes');
const catalogoRoutes = require('./src/routes/catalogo.routes');
const horarioRoutes = require('./src/routes/horario.routes');
const listaEsperaRoutes = require('./src/routes/listaEspera.routes');
const inscripcionRoutes = require('./src/routes/inscripcion.routes');
const adminAsistenciaRoutes = require("./src/routes/adminAsistencia.routes");
const periodoRoutes = require('./src/routes/adminConvocatoria.routes');
const propuestaRoutes = require('./src/routes/propuestaInscripcion.routes'); 
const adminUsuarioRoutes = require('./src/routes/adminUsuario.routes'); 

const app = express();
const prisma = new PrismaClient();

// ==========================================
// Middlewares
// ==========================================

// Configuración de CORS más explícita para evitar el "Failed to fetch"
const allowedOrigins = [
  'http://localhost:3000',
  'https://schedmaster-frontend.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    console.log("🌍 Origin recibido:", origin);

    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
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

// Logger simple: Te avisará en la terminal qué ruta están picando
app.use((req, res, next) => {
  console.log(`📡 Petición recibida: ${req.method} ${req.url}`);
  next();
});

// ==========================================
// Rutas principales
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/lista-espera', listaEsperaRoutes);
app.use('/api/inscripciones', inscripcionRoutes);

// 🔹 AQUÍ ESTABA EL DETALLE: Cambiamos el nombre para que coincida con el frontend
app.use('/api/asistencias', adminAsistenciaRoutes);

app.use('/api/admin-convocatoria', periodoRoutes);
app.use('/api/propuestas', propuestaRoutes);
app.use('/api/usuarios', adminUsuarioRoutes);

app.use('/uploads', express.static('uploads'));

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
const anuncioRoutes = require('./src/routes/anuncio.routes');

app.use('/api/anuncios', anuncioRoutes);

// SOLO esto (sin volver a declarar express)
app.use('/imagenes', express.static('public/imagenes'));

const neuronaRoutes = require('./src/routes/neurona.routes')
app.use('/api/neurona', neuronaRoutes)
// ==========================================
// Puerto y Encendido
// ==========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
  🚀 SchedMaster Backend listo!
  🌍 URL: http://localhost:${PORT}
  🛠️  CORS habilitado para puerto 3000
  `);
});