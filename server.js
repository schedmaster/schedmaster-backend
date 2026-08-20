require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

app.disable('x-powered-by');
app.set('trust proxy', 1);

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", 'data:'],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "connect-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'none'"],
      "form-action": ["'self'"]
    }
  },
  hsts: {
    maxAge: 15552000,
    includeSubDomains: true
  },
  frameguard: { action: 'deny' },
  noSniff: true
}));

function logSecurityEvent(event, req, details = {}) {
  const safeDetails = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

  console.warn([
    '[security]',
    `event=${event}`,
    `method=${req.method}`,
    `path=${req.originalUrl || req.url}`,
    `ip=${req.ip}`,
    safeDetails
  ].filter(Boolean).join(' '));
}

app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      const event = req.path.startsWith('/api/auth/login') && res.statusCode === 401
        ? 'failed_login'
        : 'http_error';

      logSecurityEvent(event, req, { status: res.statusCode });
    }
  });

  next();
});

// CORS de compatibilidad total para despliegues (evita 500 por Origin inválido)
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  credentials: true
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));

// Logger simple: Te avisará en la terminal qué ruta están picando
app.use((req, res, next) => {
  console.log(`Petición recibida: ${req.method} ${req.url}`);
  next();
});

// ==========================================
// Rutas principales
// ==========================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'schedmaster-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/lista-espera', listaEsperaRoutes);
app.use('/api/inscripciones', inscripcionRoutes);
app.use('/api/periodos', require('./src/routes/periodo.routes'));
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
    res.json({ message: 'Conexión a PostgreSQL exitosa', usuariosEnSistema: totalUsuarios });
  } catch (error) {
    console.error("Error en test-db:", error);
    res.status(500).json({ message: 'Error de conexión', details: error.message });
  }
});
const anuncioRoutes = require('./src/routes/anuncio.routes');

app.use('/api/anuncios', anuncioRoutes);

// Imagenes publicas de anuncios. Se permite cross-origin porque el frontend
// corre en otro origen durante desarrollo y en despliegue.
app.use('/imagenes', express.static('public/imagenes', {
  setHeaders(res) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

const neuronaRoutes = require('./src/routes/neurona.routes')
app.use('/api/neurona', neuronaRoutes)

const rutinaRoutes = require('./src/routes/rutina.routes');
app.use('/api/rutinas', rutinaRoutes);
// ==========================================
// Puerto y Encendido
// ==========================================
function startServer(port = process.env.PORT || 3001) {
  return app.listen(port, () => {
    console.log(`
     SchedMaster Backend listo!
     URL: http://localhost:${port}
     CORS origins: ${Array.from(allowedOrigins).join(', ')}
    `);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, allowedOrigins, prisma };
