/**
 * T9 — escapeHtml aplicado a usuario.nombre y diasTexto en el template
 * de email de enviarPropuesta. Verifica que NO se inyecte HTML crudo
 * del usuario (XSS almacenado, CWE-79).
 *
 * Estrategia: spy sobre `sendMail` para capturar el HTML, plantar un
 * usuario con nombre malicioso y un día con texto malicioso, llamar
 * al controller directamente, y verificar que el HTML capturado tiene
 * los caracteres escapados (&lt;script&gt;...) y NO contiene el tag
 * crudo <script>alert(1)</script>.
 *
 * Commit que valida este test: 5b98c21 fix(T9)
 */
const request = require('supertest');
const prisma = require('../../prisma/client');

// Spies — los definimos antes de importar el controller
const mailer = require('../../src/lib/mailer');

describe('T9 — escapeHtml en email de propuesta de inscripción', () => {
  let sendMailSpy;
  let usuarioMalicioso;
  let inscripcionPendiente;
  let horario;
  let diaMalicioso;

  beforeAll(async () => {
    // Spy: reemplaza sendMail real (que llama a Brevo) por uno que captura args
    sendMailSpy = jest.spyOn(mailer, 'sendMail').mockResolvedValue(true);

    // Datos maliciosos para verificar escape
    const XSS_NOMBRE = '<script>alert("xss-nombre")</script>';
    const XSS_DIA = '<img src=x onerror=alert("xss-dia")>';

    // Crea un usuario con nombre malicioso
    usuarioMalicioso = await prisma.usuario.create({
      data: {
        nombre: XSS_NOMBRE,
        apellido_paterno: 'TestXSS',
        apellido_materno: 'T9',
        correo: `t9-xss-${Date.now()}@test.com`,
        contrasena: 'x', // hash dummy
        id_rol: 1,
        activo: true,
      },
    });

    // Necesitamos un horario y un periodo para la inscripcion
    const periodo = await prisma.periodo.findFirst({ where: { estado: 'activo' } })
      || await prisma.periodo.findFirst();

    horario = await prisma.horario.findFirst();
    if (!horario) {
      throw new Error('No hay horarios en la BD de prueba — ejecuta prisma/seed.js');
    }
    if (!periodo) {
      throw new Error('No hay periodos en la BD de prueba — ejecuta prisma/seed.js');
    }

    // Crea inscripcion pendiente
    inscripcionPendiente = await prisma.inscripcion.create({
      data: {
        id_usuario: usuarioMalicioso.id_usuario,
        id_horario: horario.id_horario,
        id_periodo: periodo.id_periodo,
        estado: 'pendiente',
        prioridad: 'normal',
      },
    });

    // Crea (o reutiliza) un día con nombre malicioso
    const diaExistente = await prisma.dia.findFirst({ where: { nombre: XSS_DIA } });
    if (diaExistente) {
      diaMalicioso = diaExistente;
    } else {
      // A veces la secuencia de id_dia está desincronizada (autoincrement
      // apunta a un id que ya existe). Forzamos un id explícito alto.
      const maxIdDia = await prisma.dia.findFirst({ orderBy: { id_dia: 'desc' } });
      const safeId = (maxIdDia?.id_dia ?? 0) + 1000;
      diaMalicioso = await prisma.dia.create({
        data: { id_dia: safeId, nombre: XSS_DIA },
      });
    }
  });

  afterAll(async () => {
    // Cleanup — respetar orden de FKs
    if (inscripcionPendiente) {
      // Borra propuestaDias de las propuestas de esta inscripcion, luego las propuestas
      const propuestas = await prisma.propuesta.findMany({
        where: { id_inscripcion: inscripcionPendiente.id_inscripcion },
        select: { id_propuesta: true },
      });
      const ids = propuestas.map(p => p.id_propuesta);
      if (ids.length) {
        await prisma.propuestaDia.deleteMany({ where: { id_propuesta: { in: ids } } });
        await prisma.propuesta.deleteMany({ where: { id_inscripcion: inscripcionPendiente.id_inscripcion } });
      }
      await prisma.inscripcionDia.deleteMany({ where: { id_inscripcion: inscripcionPendiente.id_inscripcion } });
      await prisma.inscripcion.delete({ where: { id_inscripcion: inscripcionPendiente.id_inscripcion } }).catch(() => {});
    }
    if (usuarioMalicioso) {
      await prisma.usuario.delete({ where: { id_usuario: usuarioMalicioso.id_usuario } }).catch(() => {});
    }
    if (diaMalicioso) {
      await prisma.dia.delete({ where: { id_dia: diaMalicioso.id_dia } }).catch(() => {});
    }
    if (sendMailSpy) sendMailSpy.mockRestore();
    await prisma.$disconnect();
  });

  test('enviarPropuesta escapa <script> en usuario.nombre y <img onerror> en diasTexto', async () => {
    // Llama directamente al controller a través del endpoint HTTP
    // (la ruta POST /api/propuestas/propuesta-inscripcion NO requiere auth según routes.js)
    const { app } = require('../../server');
    const res = await request(app)
      .post('/api/propuestas/propuesta-inscripcion')
      .send({
        correo: usuarioMalicioso.correo,
        horarioId: horario.id_horario,
        dias: [diaMalicioso.id_dia],
      });

    // El controller debe haber llamado a sendMail al menos una vez
    expect(sendMailSpy).toHaveBeenCalled();
    const mailArgs = sendMailSpy.mock.calls[0][0];
    const html = mailArgs.html;

    // 1. NO debe contener el tag <script> crudo del nombre
    expect(html).not.toContain('<script>alert("xss-nombre")</script>');

    // 2. NO debe contener el <img onerror=> crudo del día
    expect(html).not.toMatch(/<img\s+src=x\s+onerror=alert/i);

    // 3. Debe contener las versiones ESCAPADAS
    expect(html).toContain('&lt;script&gt;alert(&quot;xss-nombre&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(&quot;xss-dia&quot;)&gt;');

    // El status puede ser 200/500 dependiendo de la BD de prueba, lo crítico es el HTML
    expect([200, 500]).toContain(res.status);
  });
});