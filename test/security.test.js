const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { startServer, allowedOrigins, prisma: serverPrisma } = require('../server');
const appPrisma = require('../prisma/client');

describe('security hardening', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = startServer(0);
    await new Promise(resolve => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise(resolve => server.close(resolve));
    await Promise.all([
      serverPrisma.$disconnect(),
      appPrisma.$disconnect()
    ]);
  });

  it('exposes healthcheck with hardening headers', async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'http://localhost:3000' }
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('strict-transport-security'), /max-age=15552000/);
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(response.headers.get('x-powered-by'), null);
  });

  it('keeps allowed origins explicit', () => {
    assert.equal(allowedOrigins.has('http://localhost:3000'), true);
    assert.equal(allowedOrigins.has('https://attacker.example'), false);
  });
});
