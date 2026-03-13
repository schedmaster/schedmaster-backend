const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {

  // 🔹 ROLES
  await prisma.rol.createMany({
    data: [
      {
        nombre_rol: 'estudiante',
        descripcion: 'Alumnos inscritos en la institución que pueden registrarse, seleccionar horario y participar en el programa de gimnasio'
      },
      {
        nombre_rol: 'docente',
        descripcion: 'Profesores activos que pueden registrarse y participar en el programa de gimnasio'
      },
      {
        nombre_rol: 'entrenador',
        descripcion: 'Administrador del módulo de gimnasio encargado de configurar periodos, horarios, cupos y validar usuarios'
      },
      {
        nombre_rol: 'administrador_general',
        descripcion: 'Rol con acceso total al sistema, gestión completa de usuarios, configuraciones y módulos'
      }
    ],
    skipDuplicates: true
  })

  // 🔹 DIVISIONES
  await prisma.division.createMany({
    data: [
      { nombre_division: 'División de Tecnologías de la Información', siglas: 'DTAI' },
      { nombre_division: 'División de Mecatrónica', siglas: 'DMEC' },
      { nombre_division: 'División de Industrial', siglas: 'DIND' },
      { nombre_division: 'División Económico Administrativa', siglas: 'DEA' },
      { nombre_division: 'División Ambiental y Energía', siglas: 'DAE' }
    ],
    skipDuplicates: true
  })

  // 🔹 CARRERAS
  await prisma.carrera.createMany({
    data: [
      { nombre_carrera: 'Ingeniería Mecatrónica', modalidad: 'Intensiva y Mixta', id_division: 2 },
      { nombre_carrera: 'Ingeniería en Tecnologías de la Información e Innovación Digital', modalidad: null, id_division: 1 },
      { nombre_carrera: 'Ingeniería en Energía y Desarrollo Sostenible', modalidad: null, id_division: 5 },
      { nombre_carrera: 'Ingeniería Ambiental y Sustentabilidad', modalidad: null, id_division: 5 },
      { nombre_carrera: 'Agricultura Sustentable y Protegida', modalidad: null, id_division: 5 },
      { nombre_carrera: 'Licenciatura en Administración', modalidad: null, id_division: 4 },
      { nombre_carrera: 'Licenciatura en Negocios y Mercadotecnia', modalidad: null, id_division: 4 },
      { nombre_carrera: 'Ingeniería en Logística', modalidad: null, id_division: 3 },
      { nombre_carrera: 'Licenciatura en Contaduría', modalidad: 'Vespertina y Mixta', id_division: 4 },
      { nombre_carrera: 'Ingeniería en Mantenimiento Industrial', modalidad: null, id_division: 3 },
      { nombre_carrera: 'Ingeniería en Nanotecnología', modalidad: null, id_division: 5 },
      { nombre_carrera: 'Ingeniería Industrial', modalidad: null, id_division: 3 },
      { nombre_carrera: 'Ingeniería Mecánica', modalidad: null, id_division: 2 },
      { nombre_carrera: 'Ingeniería Mecánica Automotriz', modalidad: null, id_division: 2 },
      { nombre_carrera: 'Ingeniería en Microelectrónica y Semiconductores', modalidad: null, id_division: 2 },
      { nombre_carrera: 'Licenciatura en Educación en Enseñanza del Idioma Inglés', modalidad: null, id_division: 4 },
      { nombre_carrera: 'Maestría en Ingeniería para la Manufactura Inteligente en Competencias Profesionales', modalidad: null, id_division: 3 },
      { nombre_carrera: 'Maestría en Dirección Logística y Cadena de Suministro Sostenible en Competencias Profesionales', modalidad: null, id_division: 3 },
      { nombre_carrera: 'Maestría en Economía Circular', modalidad: null, id_division: 5 }
    ],
    skipDuplicates: true
  })

  // 🔹 USUARIO ADMIN
await prisma.usuario.upsert({
  where: { correo: 'admin@uteq.edu.mx' },
  update: {},
  create: {
    nombre: 'Admin',
    apellido_paterno: 'General',
    apellido_materno: 'Sistema',
    correo: 'admin@uteq.edu.mx',
    contrasena: '$2b$10$zeMxbmo87RvxdD1AGEzuGujxu7sQwxq/LxI/mxo8G3aQmzQ..xUrO',
    cuatrimestre: 1,
    id_rol: 4
  }
})

  // 🔹 DIAS DE LA SEMANA
await prisma.dia.createMany({
  data: [
    { nombre: 'Lunes' },
    { nombre: 'Martes' },
    { nombre: 'Miércoles' },
    { nombre: 'Jueves' },
    { nombre: 'Viernes' }
  ],
  skipDuplicates: true
})
}

main()
  .then(() => console.log('🌱 Seed ejecutado correctamente'))
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })