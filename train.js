const prisma = require('./prisma/client')
const fs = require('fs')

// -----------------------------
// Función sigmoide
// -----------------------------
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x))
}

// -----------------------------
// Entrenamiento
// -----------------------------
function entrenar(dataset, epochs = 1000, lr = 0.01) {
  let w1 = Math.random()
  let w2 = Math.random()
  let b = Math.random()

  for (let i = 0; i < epochs; i++) {
    dataset.forEach(({ x, y }) => {
      const [asistencias, faltas] = x

      const z = (asistencias * w1) + (faltas * w2) + b
      const pred = sigmoid(z)

      const error = pred - y

      const dw1 = error * asistencias
      const dw2 = error * faltas
      const db = error

      w1 -= lr * dw1
      w2 -= lr * dw2
      b  -= lr * db
    })
  }

  return { w1, w2, b }
}

// -----------------------------
// Obtener datos reales
// -----------------------------
async function generarDataset() {
  const usuarios = await prisma.usuario.findMany({
    include: {
      asistencias: true
    }
  })

  const dataset = usuarios.map(u => {
    const total = u.asistencias.length
    const asistidas = u.asistencias.filter(a => a.asistio).length
    const faltas = total - asistidas

    const porcentaje = total > 0 ? asistidas / total : 0

    // 🎯 etiqueta (puedes ajustar esto)
    const label = porcentaje >= 0.7 ? 1 : 0

    return {
      x: [asistidas, faltas],
      y: label
    }
  })

  return dataset
}

// -----------------------------
// MAIN
// -----------------------------
async function main() {
  console.log('📊 Generando dataset...')

  const dataset = await generarDataset()

  console.log(`Usuarios para entrenamiento: ${dataset.length}`)

  console.log('🧠 Entrenando neurona...')

  const modelo = entrenar(dataset)

  console.log('✅ Modelo entrenado:')
  console.log(modelo)

  // Guardar modelo
  fs.writeFileSync(
    './src/lib/modelo.json',
    JSON.stringify(modelo, null, 2)
  )

  console.log('💾 Modelo guardado en src/lib/modelo.json')

  process.exit()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})