const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando la siembra de SchedMaster...');

  // 🔹 ROLES (Con IDs fijos para que coincidan con tu frontend)
  await prisma.rol.createMany({
    data: [
      { id_rol: 1, nombre_rol: 'estudiante', descripcion: 'Alumnos inscritos en la institución' },
      { id_rol: 2, nombre_rol: 'docente', descripcion: 'Profesores activos' },
      { id_rol: 3, nombre_rol: 'entrenador', descripcion: 'Administrador del módulo de gimnasio' },
      { id_rol: 4, nombre_rol: 'administrador_general', descripcion: 'Rol con acceso total al sistema' }
    ],
    skipDuplicates: true
  })
  console.log('✅ Roles inyectados');

  // 🔹 DIVISIONES (Con IDs fijos porque las carreras dependen de estos números)
  await prisma.division.createMany({
    data: [
      { id_division: 1, nombre_division: 'División de Tecnologías de la Información', siglas: 'DTAI' },
      { id_division: 2, nombre_division: 'División de Mecatrónica', siglas: 'DMEC' },
      { id_division: 3, nombre_division: 'División de Industrial', siglas: 'DIND' },
      { id_division: 4, nombre_division: 'División Económico Administrativa', siglas: 'DEA' },
      { id_division: 5, nombre_division: 'División Ambiental y Energía', siglas: 'DAE' }
    ],
    skipDuplicates: true
  })
  console.log('✅ Divisiones inyectadas');

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
      { nombre_carrera: 'Maestría en Dirección Logística y Cadena de Suministro Sostenible', modalidad: null, id_division: 3 },
      { nombre_carrera: 'Maestría en Economía Circular', modalidad: null, id_division: 5 }
    ],
    skipDuplicates: true
  })
  console.log('✅ Carreras inyectadas');

  // 🔹 DIAS DE LA SEMANA (Con IDs fijos)
  await prisma.dia.createMany({
    data: [
      { id_dia: 1, nombre: 'Lunes' },
      { id_dia: 2, nombre: 'Martes' },
      { id_dia: 3, nombre: 'Miércoles' },
      { id_dia: 4, nombre: 'Jueves' },
      { id_dia: 5, nombre: 'Viernes' }
    ],
    skipDuplicates: true
  })
  console.log('✅ Días inyectados');

  // 🔹 USUARIO ADMIN
  await prisma.usuario.upsert({
    where: { correo: 'schedmasteruteq@gmail.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido_paterno: 'General',
      apellido_materno: 'Sistema',
      correo: 'schedmasteruteq@gmail.com',
      contrasena: '$2b$10$zeMxbmo87RvxdD1AGEzuGujxu7sQwxq/LxI/mxo8G3aQmzQ..xUrO',
      cuatrimestre: 1,
      id_rol: 4
    }
  })

  // 🔹 USUARIO ADMIN 2
await prisma.usuario.upsert({
  where: { correo: 'herrera.roxy23@gmail.com' },
  update: {},
  create: {
    nombre: 'Admin2',
    apellido_paterno: 'General',
    apellido_materno: 'Sistema',
    correo: 'herrera.roxy23@gmail.com',
    contrasena: '$2b$10$zeMxbmo87RvxdD1AGEzuGujxu7sQwxq/LxI/mxo8G3aQmzQ..xUrO',
    cuatrimestre: 1,
    id_rol: 4
  }
})

// 🔹 USUARIO ADMIN 3
await prisma.usuario.upsert({
  where: { correo: 'ricardorg261205@gmail.com' },
  update: {},
  create: {
    nombre: 'Admin3',
    apellido_paterno: 'General',
    apellido_materno: 'Sistema',
    correo: 'ricardorg261205@gmail.com',
    contrasena: '$2b$10$zeMxbmo87RvxdD1AGEzuGujxu7sQwxq/LxI/mxo8G3aQmzQ..xUrO',
    cuatrimestre: 1,
    id_rol: 4
  }
})

// 🔹 USUARIO ADMIN 4
await prisma.usuario.upsert({
  where: { correo: 'schedmasteruteq+3@gmail.com' },
  update: {},
  create: {
    nombre: 'Admin4',
    apellido_paterno: 'General',
    apellido_materno: 'Sistema',
    correo: 'schedmasteruteq+3@gmail.com',
    contrasena: '$2b$10$zeMxbmo87RvxdD1AGEzuGujxu7sQwxq/LxI/mxo8G3aQmzQ..xUrO',
    cuatrimestre: 1,
    id_rol: 4
  }
})

// 🔹 USUARIO ADMIN 5
await prisma.usuario.upsert({
  where: { correo: 'schedmasteruteq+4@gmail.com' },
  update: {},
  create: {
    nombre: 'Admin5',
    apellido_paterno: 'General',
    apellido_materno: 'Sistema',
    correo: 'schedmasteruteq+4@gmail.com',
    contrasena: '$2b$10$zeMxbmo87RvxdD1AGEzuGujxu7sQwxq/LxI/mxo8G3aQmzQ..xUrO',
    cuatrimestre: 1,
    id_rol: 4
  }
})
  console.log('✅ Administrador creado');

  // 🔹 USUARIO ENTRENADOR (Necesario para abrir convocatorias)
  const hashEntrenador = await bcrypt.hash('gym123', 10);
  const entrenador = await prisma.usuario.upsert({
    where: { correo: 'entrenador@uteq.edu.mx' },
    update: {},
    create: {
      nombre: 'Roberto',
      apellido_paterno: 'Entrenador',
      apellido_materno: 'UTEQ',
      correo: 'entrenador@uteq.edu.mx',
      contrasena: hashEntrenador,
      cuatrimestre: 1,
      id_rol: 3
    }
  });

  // 🔹 CONVOCATORIA (PERIODO) ACTIVA
  const periodoExistente = await prisma.periodo.findFirst({ where: { estado: 'activo' } });
  if (!periodoExistente) {
    await prisma.periodo.create({
      data: {
        nombre_periodo: 'Enero - Abril 2026',
        fecha_inicio_inscripcion: new Date('2026-01-01'),
        fecha_fin_inscripcion: new Date('2026-04-30'),
        fecha_inicio_actividades: new Date('2026-01-15'),
        fecha_fin_periodo: new Date('2026-04-30'),
        estado: 'activo',
        id_entrenador: entrenador.id_usuario
      }
    });
    console.log('✅ Periodo activo (Convocatoria) creado');
  }
}

main()
  .then(() => console.log('🎉 Seed ejecutado correctamente y BD lista para usarse!'))
  .catch(e => console.error('❌ Error en el Seed:', e))
  .finally(async () => {
    await prisma.$disconnect()
  })