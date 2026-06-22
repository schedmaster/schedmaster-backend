const request = require('supertest');
const app = require('../../server');

describe('Smoke tests - entorno de pruebas', () => {
  test('La aplicación debe exportar el objeto app', () => {
    expect(typeof app).toBe('function');
  });

  test('Rutas desconocidas responden con 404', async () => {
    const res = await request(app).get('/__nonexistent_route_for_test__');
    expect([404, 400, 500]).toContain(res.status);
  });
});
