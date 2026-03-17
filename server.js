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

const app = express();
const prisma = new PrismaClient();

// ==========================================
// Middlewares
// ==========================================

// Configuración de CORS más explícita para evitar el "Failed to fetch"
app.use(cors({
  origin: 'http://localhost:3000', // El puerto de tu Next.js
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
app.use("/api/admin-asistencia", adminAsistenciaRoutes);
app.use('/api/admin-convocatoria', periodoRoutes);
app.use('/api/propuestas', propuestaRoutes); 

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