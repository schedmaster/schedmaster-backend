const modelo = require('./modelo.json')

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x))
}

function evaluarUsuario({ asistencias, faltas }) {
  const { w1, w2, b } = modelo

  const z = (asistencias * w1) + (faltas * w2) + b

  return sigmoid(z)
}

module.exports = {
  evaluarUsuario
}