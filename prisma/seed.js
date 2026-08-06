const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const truthy = value => ['1', 'true', 'yes'].includes(String(value || '').toLowerCase());
const shouldSeedPrivilegedUsers = truthy(process.env.SEED_PRIVILEGED_USERS);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta configurar ${name} para sembrar usuarios privilegiados.`);
  }
  return value;
}

async function seedCatalogs() {
  await prisma.rol.createMany({
    data: [
      { id_rol: 1, nombre_rol: 'estudiante', descripcion: 'Alumnos inscritos en la institucion' },
      { id_rol: 2, nombre_rol: 'docente', descripcion: 'Profesores activos' },
      { id_rol: 3, nombre_rol: 'entrenador', descripcion: 'Administrador del modulo de gimnasio' },
      { id_rol: 4, nombre_rol: 'administrador_general', descripcion: 'Rol con acceso total al sistema' }
    ],
    skipDuplicates: true
  });

  await prisma.division.createMany({
    data: [
      { id_division: 1, nombre_division: 'Division Industrial', siglas: 'DIND' },
      { id_division: 2, nombre_division: 'Division de Tecnologias de la Informacion', siglas: 'DTI' },
      { id_division: 3, nombre_division: 'Division Economico-Administrativa', siglas: 'DEA' },
      { id_division: 4, nombre_division: 'Division Quimica, Ambiental y Salud', siglas: 'DQAS' },
      { id_division: 5, nombre_division: 'Division de Idiomas y Educacion', siglas: 'DIE' }
    ],
    skipDuplicates: true
  });

  await prisma.carrera.createMany({
    data: [
      { nombre_carrera: 'Mantenimiento Industrial', modalidad: 'Intensiva', id_division: 1 },
      { nombre_carrera: 'Mecatronica (Automatizacion)', modalidad: 'Intensiva', id_division: 1 },
      { nombre_carrera: 'Mecatronica (Sistemas de Manufactura)', modalidad: 'Intensiva', id_division: 1 },
      { nombre_carrera: 'Ingenieria Industrial', modalidad: 'Intensiva', id_division: 1 },
      { nombre_carrera: 'Ingenieria Mecanica', modalidad: 'Intensiva', id_division: 1 },
      { nombre_carrera: 'Mecanica Automotriz (Sistemas Automotrices)', modalidad: 'Intensiva', id_division: 1 },
      { nombre_carrera: 'Mecanica Automotriz (Diseno y Manufactura)', modalidad: 'Intensiva', id_division: 1 },
      { nombre_carrera: 'Procesos Productivos (Manufactura)', modalidad: 'Intensiva', id_division: 1 },
      { nombre_carrera: 'Procesos Productivos (Plasticos)', modalidad: 'Intensiva', id_division: 1 },
      { nombre_carrera: 'Desarrollo de Software Multiplataforma', modalidad: 'Intensiva', id_division: 2 },
      { nombre_carrera: 'Infraestructura de Redes Digitales (Ciberseguridad)', modalidad: 'Intensiva', id_division: 2 },
      { nombre_carrera: 'Entornos Virtuales y Negocios Digitales', modalidad: 'Intensiva', id_division: 2 },
      { nombre_carrera: 'Inteligencia Artificial', modalidad: 'Intensiva', id_division: 2 },
      { nombre_carrera: 'Ciencia de Datos', modalidad: 'Intensiva', id_division: 2 },
      { nombre_carrera: 'Administracion (Capital Humano)', modalidad: 'Intensiva', id_division: 3 },
      { nombre_carrera: 'Desarrollo de Negocios (Mercadotecnia)', modalidad: 'Intensiva', id_division: 3 },
      { nombre_carrera: 'Contaduria', modalidad: 'Intensiva', id_division: 3 },
      { nombre_carrera: 'Logistica (Cadena de Suministro)', modalidad: 'Intensiva', id_division: 3 },
      { nombre_carrera: 'Logistica (Transporte y Movilidad)', modalidad: 'Intensiva', id_division: 3 },
      { nombre_carrera: 'Tecnologia Ambiental (Sustentabilidad)', modalidad: 'Intensiva', id_division: 4 },
      { nombre_carrera: 'Nanotecnologia', modalidad: 'Intensiva', id_division: 4 },
      { nombre_carrera: 'Quimica Industrial', modalidad: 'Intensiva', id_division: 4 },
      { nombre_carrera: 'Energias Renovables (Energia Turbo Solar)', modalidad: 'Intensiva', id_division: 4 },
      { nombre_carrera: 'Agricultura Sustentable y Protegida', modalidad: 'Intensiva', id_division: 4 },
      { nombre_carrera: 'Licenciatura en Educacion', modalidad: 'Intensiva', id_division: 5 },
      { nombre_carrera: 'Ensenanza del Idioma Ingles', modalidad: 'Intensiva', id_division: 5 }
    ],
    skipDuplicates: true
  });

  await prisma.dia.createMany({
    data: [
      { id_dia: 1, nombre: 'Lunes' },
      { id_dia: 2, nombre: 'Martes' },
      { id_dia: 3, nombre: 'Miercoles' },
      { id_dia: 4, nombre: 'Jueves' },
      { id_dia: 5, nombre: 'Viernes' }
    ],
    skipDuplicates: true
  });
}

async function seedPrivilegedUsers() {
  if (!shouldSeedPrivilegedUsers) {
    console.log('Usuarios privilegiados omitidos: define SEED_PRIVILEGED_USERS=true y credenciales por entorno si los necesitas.');
    return null;
  }

  const adminEmail = requireEnv('SEED_ADMIN_EMAIL');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');
  const trainerEmail = requireEnv('SEED_TRAINER_EMAIL');
  const trainerPassword = requireEnv('SEED_TRAINER_PASSWORD');

  await prisma.usuario.upsert({
    where: { correo: adminEmail },
    update: {},
    create: {
      nombre: process.env.SEED_ADMIN_NAME || 'Admin',
      apellido_paterno: process.env.SEED_ADMIN_LASTNAME || 'General',
      apellido_materno: process.env.SEED_ADMIN_SECOND_LASTNAME || 'Sistema',
      correo: adminEmail,
      contrasena: await bcrypt.hash(adminPassword, 10),
      cuatrimestre: 1,
      id_rol: 4
    }
  });

  const trainer = await prisma.usuario.upsert({
    where: { correo: trainerEmail },
    update: {},
    create: {
      nombre: process.env.SEED_TRAINER_NAME || 'Entrenador',
      apellido_paterno: process.env.SEED_TRAINER_LASTNAME || 'UTEQ',
      apellido_materno: process.env.SEED_TRAINER_SECOND_LASTNAME || 'Sistema',
      correo: trainerEmail,
      contrasena: await bcrypt.hash(trainerPassword, 10),
      cuatrimestre: 1,
      id_rol: 3
    }
  });

  console.log('Usuarios privilegiados sembrados desde variables de entorno.');
  return trainer;
}

async function seedActivePeriod(trainer) {
  const existingPeriod = await prisma.periodo.findFirst({ where: { estado: 'activo' } });
  if (existingPeriod) return;

  if (!trainer) {
    console.log('Periodo activo omitido porque no se sembro entrenador privilegiado.');
    return;
  }

  await prisma.periodo.create({
    data: {
      nombre_periodo: process.env.SEED_PERIOD_NAME || 'Enero - Abril 2026',
      fecha_inicio_inscripcion: new Date(process.env.SEED_PERIOD_ENROLLMENT_START || '2026-01-01'),
      fecha_fin_inscripcion: new Date(process.env.SEED_PERIOD_ENROLLMENT_END || '2026-04-30'),
      fecha_inicio_actividades: new Date(process.env.SEED_PERIOD_ACTIVITY_START || '2026-01-15'),
      fecha_fin_periodo: new Date(process.env.SEED_PERIOD_END || '2026-04-30'),
      estado: 'activo',
      id_entrenador: trainer.id_usuario
    }
  });

  console.log('Periodo activo creado desde configuracion segura.');
}

async function main() {
  console.log('Iniciando la siembra de SchedMaster...');
  await seedCatalogs();
  const trainer = await seedPrivilegedUsers();
  await seedActivePeriod(trainer);
}

main()
  .then(() => console.log('Seed ejecutado correctamente.'))
  .catch(error => {
    console.error('Error en el seed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
