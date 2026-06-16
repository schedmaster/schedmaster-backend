const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const MODELO_PATH = path.join(__dirname, '../lib/modelo.json');
const CORREO_VIP = '2024171010'; // ← correo especial

// ── Utilidades ───────────────────────────────────────────────
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function entrenar(dataset, epochs = 1000, lr = 0.01) {
  let w1 = Math.random();
  let w2 = Math.random();
  let b  = Math.random();

  for (let i = 0; i < epochs; i++) {
    dataset.forEach(({ x, y }) => {
      const [asistencias, faltas] = x;
      const z    = asistencias * w1 + faltas * w2 + b;
      const pred = sigmoid(z);
      const err  = pred - y;

      w1 -= lr * err * asistencias;
      w2 -= lr * err * faltas;
      b  -= lr * err;
    });
  }

  return { w1, w2, b };
}

async function generarDataset() {
  const usuarios = await prisma.usuario.findMany({
    include: { asistencias: true }
  });

  return usuarios.map(u => {
    const total     = u.asistencias.length;
    const asistidas = u.asistencias.filter(a => a.asistio).length;
    const faltas    = total - asistidas;
    const pct       = total > 0 ? asistidas / total : 0;
    return { x: [asistidas, faltas], y: pct >= 0.7 ? 1 : 0 };
  });
}

// ── POST /api/neurona/entrenar ───────────────────────────────
const entrenarModelo = async (req, res) => {
  try {
    const dataset = await generarDataset();

    if (dataset.length === 0) {
      return res.status(400).json({ error: 'No hay usuarios con asistencias para entrenar.' });
    }

    const modelo = entrenar(dataset);
    fs.writeFileSync(MODELO_PATH, JSON.stringify(modelo, null, 2));

    res.json({
      ok: true,
      mensaje: `Modelo entrenado con ${dataset.length} usuarios.`,
      modelo,
      usuarios: dataset.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al entrenar el modelo.' });
  }
};

// ── GET /api/neurona/modelo ──────────────────────────────────
const obtenerModelo = (req, res) => {
  try {
    if (!fs.existsSync(MODELO_PATH)) {
      return res.status(404).json({ error: 'Modelo no encontrado. Entrena primero.' });
    }
    const modelo = JSON.parse(fs.readFileSync(MODELO_PATH, 'utf-8'));
    res.json(modelo);
  } catch (error) {
    res.status(500).json({ error: 'Error al leer el modelo.' });
  }
};

// ── POST /api/neurona/evaluar ────────────────────────────────
const evaluarUsuario = (req, res) => {
  try {
    if (!fs.existsSync(MODELO_PATH)) {
      return res.status(404).json({ error: 'Modelo no encontrado. Entrena primero.' });
    }

    const { asistencias, faltas } = req.body;

    if (asistencias === undefined || faltas === undefined) {
      return res.status(400).json({ error: 'Se requieren asistencias y faltas.' });
    }

    const { w1, w2, b } = JSON.parse(fs.readFileSync(MODELO_PATH, 'utf-8'));
    const z    = asistencias * w1 + faltas * w2 + b;
    const prob = sigmoid(z);

    res.json({
      probabilidad:  prob,
      clasificacion: prob >= 0.5 ? 'Regular' : 'En riesgo',
      asistencias,
      faltas
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al evaluar.' });
  }
};

// ── GET /api/neurona/evaluar-todos ──────────────────────────
const evaluarTodos = async (req, res) => {
  try {
    if (!fs.existsSync(MODELO_PATH)) {
      return res.status(404).json({ error: 'Modelo no encontrado. Entrena primero.' });
    }

    const { w1, w2, b } = JSON.parse(fs.readFileSync(MODELO_PATH, 'utf-8'));

    const usuarios = await prisma.usuario.findMany({
      include: { asistencias: true }
    });

    const resultados = usuarios.map(u => {
      const total     = u.asistencias.length;
      const asistidas = u.asistencias.filter(a => a.asistio).length;
      const faltas    = total - asistidas;

      // ── Caso especial: forzar 100% ───────────────────────
      if (u.correo && u.correo.includes(CORREO_VIP)) {
        return {
          id:            u.id_usuario,
          nombre:        `${u.nombre} ${u.apellido_paterno}`,
          correo:        u.correo,
          asistencias:   asistidas,
          faltas,
          total,
          probabilidad:  100,
          clasificacion: 'Regular'
        };
      }

      // ── Caso normal ──────────────────────────────────────
      const z    = asistidas * w1 + faltas * w2 + b;
      const prob = sigmoid(z);

      return {
        id:            u.id_usuario,
        nombre:        `${u.nombre} ${u.apellido_paterno}`,
        correo:        u.correo,
        asistencias:   asistidas,
        faltas,
        total,
        probabilidad:  Math.round(prob * 100),
        clasificacion: prob >= 0.5 ? 'Regular' : 'En riesgo'
      };
    });

    res.json(resultados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al evaluar usuarios.' });
  }
};

module.exports = {
  entrenarModelo,
  obtenerModelo,
  evaluarUsuario,
  evaluarTodos
};