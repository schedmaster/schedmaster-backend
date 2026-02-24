require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// 🔹 Importar rutas
const authRoutes = require('./src/routes/auth.routes');
const catalogoRoutes = require('./src/routes/catalogo.routes');
const horarioRoutes = require('./src/routes/horario.routes');
const listaEsperaRoutes = require('./src/routes/listaEspera.routes');

const app = express();
const prisma = new PrismaClient();

//Middlewares
app.use(cors());
app.use(express.json());

// rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/lista-espera', listaEsperaRoutes);

//Ruta de prueba
app.get('/test', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({ take: 5 });
    res.json({ message: 'Conexión exitosa', usuarios });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error de conexión', error });
  }
});

//Puerto
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});