/**
 * Functional test — T12 + T4 fixes
 * Verifies RBAC middleware and server-derived id_registrado_por.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { app, startServer } = require('../server');
const prisma = require('../prisma/client');

const SECRET = process.env.JWT_SECRET;
const ROL_ENTRENADOR = 3;
const ROL_ADMIN = 4;
const ROL_ESTUDIANTE = 1;

function makeToken(id_usuario, id_rol) {
  return jwt.sign({ id_usuario, id_rol }, SECRET, { expiresIn: '8h' });
}

async function run() {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const results = [];

  // ========================
  // T12: /api/usuarios (crear)
  // ========================

  // 1. No token → 401
  let res = await fetch(`${base}/api/usuarios`, { method: 'GET' });
  results.push({ test: 'T12 GET /api/usuarios sin token', expected: 401, actual: res.status, pass: res.status === 401 });

  // 2. Token con rol estudiante (1) → 403
  const tokenEstudiante = makeToken(1, ROL_ESTUDIANTE);
  res = await fetch(`${base}/api/usuarios`, {
    method: 'GET',
    headers: { authorization: `Bearer ${tokenEstudiante}` }
  });
  results.push({ test: 'T12 GET /api/usuarios con rol estudiante', expected: 403, actual: res.status, pass: res.status === 403 });

  // 3. Token con rol entrenador (3) + id_rol=4 en body → 201 pero id_rol debe ser 1 (default)
  const tokenEntrenador = makeToken(1, ROL_ENTRENADOR);
  const emailUnico = `t12-test-${Date.now()}@test.com`;
  res = await fetch(`${base}/api/usuarios/crear`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenEntrenador}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      nombre: 'Test',
      apellido_paterno: 'T12',
      correo: emailUnico,
      contrasena: 'Test1234!',
      id_rol: 4  // INTENTO DE ESCALACION — debe ser ignorado
    })
  });
  const body12 = res.status === 200 ? await res.json() : null;
  const rolAsignado = body12 ? body12.id_rol : null;
  results.push({
    test: 'T12 POST /api/usuarios/crear con id_rol=4 en body (entrenador)',
    expected: '200 + id_rol=1 (default, no 4)',
    actual: `${res.status} + id_rol=${rolAsignado}`,
    pass: res.status === 200 && rolAsignado === 1
  });

  // Cleanup: delete the created user
  if (body12 && body12.id_usuario) {
    await prisma.usuario.delete({ where: { id_usuario: body12.id_usuario } }).catch(() => {});
  }

  // ========================
  // T4: /api/asistencias/registrar
  // ========================

  // 4. No token → 401
  res = await fetch(`${base}/api/asistencias/registrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id_usuario: 1, id_inscripcion: 1, id_horario: 1, asistio: true })
  });
  results.push({ test: 'T4 POST /api/asistencias/registrar sin token', expected: 401, actual: res.status, pass: res.status === 401 });

  // 5. Token con rol estudiante (1) → 403
  res = await fetch(`${base}/api/asistencias/registrar`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenEstudiante}`, 'content-type': 'application/json' },
    body: JSON.stringify({ id_usuario: 1, id_inscripcion: 1, id_horario: 1, asistio: true, id_registrado_por: 999 })
  });
  results.push({ test: 'T4 POST /api/asistencias/registrar con rol estudiante', expected: 403, actual: res.status, pass: res.status === 403 });

  // 6. Token con rol entrenador (3) + id_registrado_por=999 en body → 200, pero id_registrado_por debe ser 1 (del token)
  const tokenT4 = makeToken(1, ROL_ENTRENADOR);
  res = await fetch(`${base}/api/asistencias/registrar`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenT4}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      id_usuario: 1,
      id_inscripcion: 1,
      id_horario: 1,
      asistio: true,
      id_registrado_por: 999  // INTENTO DE SUPLANTACION — debe ser ignorado
    })
  });
  const bodyT4 = res.status === 200 ? await res.json() : null;
  const registradoPor = bodyT4 && bodyT4.asistencia ? bodyT4.asistencia.id_registrado_por : null;
  results.push({
    test: 'T4 POST /api/asistencias/registrar con id_registrado_por=999 en body (entrenador)',
    expected: '200 + id_registrado_por=1 (del token, no 999)',
    actual: `${res.status} + id_registrado_por=${registradoPor}`,
    pass: res.status === 200 && registradoPor === 1
  });

  // Cleanup: delete the asistencia created in test 6
  if (bodyT4 && bodyT4.asistencia && bodyT4.asistencia.id_asistencia) {
    await prisma.asistencia.delete({ where: { id_asistencia: bodyT4.asistencia.id_asistencia } }).catch(() => {});
  }

  // Print results
  console.log('\n========== RESULTADOS ==========\n');
  let allPass = true;
  for (const r of results) {
    const status = r.pass ? '✅ PASS' : '❌ FAIL';
    if (!r.pass) allPass = false;
    console.log(`${status} | ${r.test}`);
    console.log(`  Expected: ${r.expected}`);
    console.log(`  Actual:   ${r.actual}`);
  }
  console.log(`\n${allPass ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ ALGUNAS PRUEBAS FALLARON'}`);

  server.close();
  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

run().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
