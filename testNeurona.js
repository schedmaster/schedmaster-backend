const { evaluarUsuario } = require('./src/lib/neurona')


// casos de prueba
const casos = [
  { asistencias: 0, faltas: 0 },
  { asistencias: 2, faltas: 1 },
  { asistencias: 5, faltas: 0 },
  { asistencias: 8, faltas: 2 }
]

casos.forEach((caso, index) => {
  const resultado = evaluarUsuario(caso)

  console.log(`Caso ${index + 1}`)
  console.log(`Asistencias: ${caso.asistencias}, Faltas: ${caso.faltas}`)
  console.log(`Score: ${resultado.toFixed(4)}`)
  console.log('------------------------')
})