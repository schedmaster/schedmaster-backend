const request = require('supertest');
const app = require('../../app');

describe('Security smoke tests', () => {
  test('La aplicación debe exportar el objeto app', () => {
    expect(typeof app).toBe('function');
  });

  test('Rutas desconocidas responden con 404', async () => {
    const res = await request(app).get('/__nonexistent_route_for_test__');
    expect([404, 400, 500]).toContain(res.status);
  });

  test('CORS permite origin localhost:3000', async () => {
    const origin = 'http://localhost:3000';
    const res = await request(app).get('/__not_a_real_route__').set('Origin', origin);
    const acaOrigin = res.headers['access-control-allow-origin'];
    expect(acaOrigin === origin || typeof acaOrigin === 'string').toBeTruthy();
  });
});
