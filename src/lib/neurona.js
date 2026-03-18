//“La neurona calcula una combinación ponderada de las asistencias y faltas del usuario, 
// y mediante una función sigmoide transforma ese resultado en un valor entre 0 y 1, 
// el cual representa la probabilidad de aceptación.”



// Función de activación sigmoide
// Convierte cualquier número en un valor entre 0 y 1
// Esto permite interpretar el resultado como una probabilidad
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x))
}

// Función principal de la neurona
// Recibe como entrada las asistencias y faltas del usuario
function evaluarUsuario({ asistencias, faltas = 0 }) {

  // Pesos de la neurona:
  // w1: impacto de las asistencias (positivo → más asistencias = mejor)
  // w2: impacto de las faltas (negativo → más faltas = peor)
  // b: sesgo (bias), ajusta el nivel de exigencia de la neurona
  const w1 = 0.8
  const w2 = -0.6
  const b  = -1

  // Suma ponderada:
  // Se multiplica cada entrada por su peso y se suman los resultados
  // Esto representa la "combinación" de los factores del usuario
  const suma = (asistencias * w1) + (faltas * w2) + b

  // Aplicación de la función sigmoide:
  // Convierte la suma en un valor entre 0 y 1
  // Este valor representa la probabilidad de aceptación
  const score = sigmoid(suma)

  // Retorna el resultado final de la neurona
  return score
}

// Exportamos la función para poder usarla en otros archivos (por ejemplo, controllers)
module.exports = {
  evaluarUsuario
}