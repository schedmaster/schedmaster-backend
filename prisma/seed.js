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
    { id_division: 1, nombre_division: 'División Industrial', siglas: 'DIND' },
    { id_division: 2, nombre_division: 'División de Tecnologías de la Información', siglas: 'DTI' },
    { id_division: 3, nombre_division: 'División Económico-Administrativa', siglas: 'DEA' },
    { id_division: 4, nombre_division: 'División Química, Ambiental y Salud', siglas: 'DQAS' },
    { id_division: 5, nombre_division: 'División de Idiomas y Educación', siglas: 'DIE' }
  ],
  skipDuplicates: true
})
  console.log('✅ Divisiones inyectadas');

 // 🔹 CARRERAS
await prisma.carrera.createMany({
  data: [

    // DIVISIÓN INDUSTRIAL
    { nombre_carrera: 'Mantenimiento Industrial', modalidad: 'Intensiva', id_division: 1 },
    { nombre_carrera: 'Mecatrónica (Automatización)', modalidad: 'Intensiva', id_division: 1 },
    { nombre_carrera: 'Mecatrónica (Sistemas de Manufactura)', modalidad: 'Intensiva', id_division: 1 },
    { nombre_carrera: 'Ingeniería Industrial', modalidad: 'Intensiva', id_division: 1 },
    { nombre_carrera: 'Ingeniería Mecánica', modalidad: 'Intensiva', id_division: 1 },
    { nombre_carrera: 'Mecánica Automotriz (Sistemas Automotrices)', modalidad: 'Intensiva', id_division: 1 },
    { nombre_carrera: 'Mecánica Automotriz (Diseño y Manufactura)', modalidad: 'Intensiva', id_division: 1 },
    { nombre_carrera: 'Procesos Productivos (Manufactura)', modalidad: 'Intensiva', id_division: 1 },
    { nombre_carrera: 'Procesos Productivos (Plásticos)', modalidad: 'Intensiva', id_division: 1 },

    // DIVISIÓN TECNOLOGÍAS DE LA INFORMACIÓN
    { nombre_carrera: 'Desarrollo de Software Multiplataforma', modalidad: 'Intensiva', id_division: 2 },
    { nombre_carrera: 'Infraestructura de Redes Digitales (Ciberseguridad)', modalidad: 'Intensiva', id_division: 2 },
    { nombre_carrera: 'Entornos Virtuales y Negocios Digitales', modalidad: 'Intensiva', id_division: 2 },
    { nombre_carrera: 'Inteligencia Artificial', modalidad: 'Intensiva', id_division: 2 },
    { nombre_carrera: 'Ciencia de Datos', modalidad: 'Intensiva', id_division: 2 },

    // DIVISIÓN ECONÓMICO ADMINISTRATIVA
    { nombre_carrera: 'Administración (Capital Humano)', modalidad: 'Intensiva', id_division: 3 },
    { nombre_carrera: 'Desarrollo de Negocios (Mercadotecnia)', modalidad: 'Intensiva', id_division: 3 },
    { nombre_carrera: 'Contaduría', modalidad: 'Intensiva', id_division: 3 },
    { nombre_carrera: 'Logística (Cadena de Suministro)', modalidad: 'Intensiva', id_division: 3 },
    { nombre_carrera: 'Logística (Transporte y Movilidad)', modalidad: 'Intensiva', id_division: 3 },

    // DIVISIÓN QUÍMICA AMBIENTAL Y SALUD
    { nombre_carrera: 'Tecnología Ambiental (Sustentabilidad)', modalidad: 'Intensiva', id_division: 4 },
    { nombre_carrera: 'Nanotecnología', modalidad: 'Intensiva', id_division: 4 },
    { nombre_carrera: 'Química Industrial', modalidad: 'Intensiva', id_division: 4 },
    { nombre_carrera: 'Energías Renovables (Energía Turbo Solar)', modalidad: 'Intensiva', id_division: 4 },
    { nombre_carrera: 'Agricultura Sustentable y Protegida', modalidad: 'Intensiva', id_division: 4 },

    // DIVISIÓN IDIOMAS Y EDUCACIÓN
    { nombre_carrera: 'Licenciatura en Educación', modalidad: 'Intensiva', id_division: 5 },
    { nombre_carrera: 'Enseñanza del Idioma Inglés', modalidad: 'Intensiva', id_division: 5 }

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
  where: { correo: 'pazk703@gmail.com' },
  update: {},
  create: {
    nombre: 'Admin4',
    apellido_paterno: 'General',
    apellido_materno: 'Sistema',
    correo: 'pazk703@gmail.com',
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