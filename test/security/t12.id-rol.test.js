/**
 * T12 — RBAC + id_rol hardcoded default on POST /api/usuarios/crear
 * Verifica que el endpoint:
 *  1. Rechaza peticiones sin token (401)
 *  2. Rechaza tokens con rol estudiante (403)
 *  3. IGNORA un `id_rol` enviado en el body (forzado a 1 = ROL_USUARIO_DEFAULT)
 *     — protege contra escalada de privilegios.
 *
 * Commit que valida este test: b4491d8 fix(T12)
 */
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { app } = require('../../server');
const prisma = require('../../prisma/client');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET no configurado en .env');

const ROL_ESTUDIANTE = 1;
const ROL_ENTRENADOR = 3;
const ROL_USUARIO_DEFAULT = 1;

function makeToken(id_usuario, id_rol) {
  return jwt.sign({ id_usuario, id_rol }, SECRET, { expiresIn: '8h' });
}

describe('T12 — RBAC + id_rol forzado a ROL_USUARIO_DEFAULT', () => {
  const createdIds = [];

  afterAll(async () => {
    // Cleanup: borra usuarios creados durante las pruebas
    for (const id of createdIds) {
      await prisma.usuario.delete({ where: { id_usuario: id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('GET /api/usuarios sin token → 401', async () => {
    const res = await request(app).get('/api/usuarios');
    expect(res.status).toBe(401);
  });

  test('GET /api/usuarios con rol estudiante (1) → 403', async () => {
    const token = makeToken(1, ROL_ESTUDIANTE);
    const res = await request(app)
      .get('/api/usuarios')
      .set('authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('POST /api/usuarios/crear sin token → 401', async () => {
    const res = await request(app)
      .post('/api/usuarios/crear')
      .send({ nombre: 'X', apellido_paterno: 'Y', correo: 'x@y.com', contrasena: 'Test1234!' });
    expect(res.status).toBe(401);
  });

  test('POST /api/usuarios/crear con rol estudiante (1) → 403', async () => {
    const token = makeToken(1, ROL_ESTUDIANTE);
    const res = await request(app)
      .post('/api/usuarios/crear')
      .set('authorization', `Bearer ${token}`)
      .send({ nombre: 'X', apellido_paterno: 'Y', correo: 'x@y.com', contrasena: 'Test1234!' });
    expect(res.status).toBe(403);
  });

  test('POST /api/usuarios/crear con entrenador (3) + id_rol=4 en body → 200, id_rol=1 (ignorado)', async () => {
    const token = makeToken(1, ROL_ENTRENADOR);
    const correoUnico = `t12-test-${Date.now()}@test.com`;

    const res = await request(app)
      .post('/api/usuarios/crear')
      .set('authorization', `Bearer ${token}`)
      .send({
        nombre: 'TestT12',
        apellido_paterno: 'Escalada',
        correo: correoUnico,
        contrasena: 'Test1234!',
        id_rol: 4, // intento de escalada — debe ser ignorado
      });

    expect(res.status).toBe(200);
    expect(res.body.id_rol).toBe(ROL_USUARIO_DEFAULT);

    // Confirma en BD
    const enBd = await prisma.usuario.findUnique({ where: { correo: correoUnico } });
    expect(enBd).not.toBeNull();
    expect(enBd.id_rol).toBe(ROL_USUARIO_DEFAULT);

    if (enBd) createdIds.push(enBd.id_usuario);
  });

  test('POST /api/usuarios/crear con entrenador (3) sin id_rol en body → 200, id_rol=1', async() => {
    const token = makeToken(1, ROL_ENTRENADOR);
    const correoUnico = `t12-clean-${Date.now()}@test.com`;

    const res = await request(app)
      .post('/api/usuarios/crear')
      .set('authorization', `Bearer ${token}`)
      .send({
        nombre: 'TestT12Clean',
        apellido_paterno: 'Normal',
        correo: correoUnico,
        contrasena: 'Test1234!',
      });

    expect(res.status).toBe(200);
    expect(res.body.id_rol).toBe(ROL_USUARIO_DEFAULT);

    if (res.body.id_usuario) createdIds.push(res.body.id_usuario);
  });
});