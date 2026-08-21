require("dotenv").config();

const DISABLE_MAILER = ['1', 'true', 'yes'].includes(String(process.env.DISABLE_MAILER || '').toLowerCase());

function parseEmailAddress(value) {
  if (!value) return null;

  const input = String(value).trim();
  const match = input.match(/^(.*?)\s*<([^<>]+)>$/);

  if (match) {
    return {
      name: match[1].replace(/^["']|["']$/g, '').trim(),
      email: match[2].trim()
    };
  }

  return { email: input };
}

function buildBrevoSender(from) {
  const parsedFrom = parseEmailAddress(from);

  return {
    name: parsedFrom?.name || process.env.MAIL_FROM_NAME || "SchedMaster",
    email: parsedFrom?.email || process.env.MAIL_FROM_EMAIL || "no-reply@example.invalid"
  };
}

async function sendMail({ from, to, subject, text, html }) {
  try {
    if (DISABLE_MAILER) {
      console.log(`Correo omitido para ${to}`);
      return null;
    }

    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY no configurada');
    }

    const payload = {
      sender: buildBrevoSender(from),
      to: [{ email: to }],
      subject,
      ...(html ? { htmlContent: html } : { textContent: text || '' })
    };

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      console.log("Correo enviado correctamente", data.messageId || '');
      return data;
    }

    const err = await res.json().catch(() => ({}));
    console.log("Error Mailer Brevo:", err);
    return null;
  } catch (error) {
    console.log("Error Mailer Brevo:", error);
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(value) {
  return String(value || '').substring(0, 5);
}

function getDiasTexto(diasSeleccionados = []) {
  const dias = diasSeleccionados
    .map(diaSeleccionado => diaSeleccionado.dia?.nombre)
    .filter(Boolean);

  return dias.length > 0 ? dias.join(', ') : 'No especificados';
}

async function sendInscripcionDecisionEmail({ to, name, status, horario, diasSeleccionados }) {
  if (DISABLE_MAILER) {
    console.log(`Correo de decision omitido para ${to}`);
    return;
  }

  const appName = process.env.APP_NAME || "SchedMaster";
  const isApproved = status === 'aprobado';
  const safeName = escapeHtml(name || 'usuario');
  const safeDias = escapeHtml(getDiasTexto(diasSeleccionados));
  const safeInicio = escapeHtml(formatTime(horario?.hora_inicio));
  const safeFin = escapeHtml(formatTime(horario?.hora_fin));
  const frontendUrl = process.env.FRONTEND_URL || 'https://schedmaster-frontend.vercel.app';

  const title = isApproved
    ? 'Tu horario fue aprobado'
    : 'Tu solicitud de horario fue rechazada';
  const highlightColor = isApproved ? '#16a34a' : '#dc2626';
  const intro = isApproved
    ? 'Tu inscripcion fue aprobada. Ya puedes ingresar al sistema para consultar tu acceso y actividades.'
    : 'Tu solicitud no pudo ser aprobada en esta ocasion. Si necesitas apoyo, contacta al equipo del gimnasio.';
  const subject = isApproved
    ? `${appName} - Horario aprobado`
    : `${appName} - Horario rechazado`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;padding:20px;border-radius:10px;color:#333;">
      <h2 style="color:${highlightColor};margin-top:0;">${title} - ${appName}</h2>
      <p>Hola <strong>${safeName}</strong>,</p>
      <p>${intro}</p>
      <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:20px 0;border-left:5px solid ${highlightColor};">
        <p style="margin:5px 0;"><strong>Horario solicitado:</strong> ${safeInicio} - ${safeFin}</p>
        <p style="margin:5px 0;"><strong>Dias:</strong> ${safeDias}</p>
      </div>
      <div style="text-align:center;margin:30px 0;">
        <a href="${frontendUrl}/login"
           style="background:#2563eb;color:white;padding:14px 25px;text-decoration:none;border-radius:5px;display:inline-block;font-weight:bold;">
          Ir al sistema
        </a>
      </div>
    </div>
  `;

  await sendMail({
    to,
    subject,
    text: [
      `Hola ${name || 'usuario'},`,
      '',
      intro,
      `Horario solicitado: ${formatTime(horario?.hora_inicio)} - ${formatTime(horario?.hora_fin)}`,
      `Dias: ${getDiasTexto(diasSeleccionados)}`,
      '',
      `Ingresa al sistema: ${frontendUrl}/login`
    ].join('\n'),
    html
  });
}

async function sendListaEsperaConfirmacionEmail({ to }) {
  if (DISABLE_MAILER) {
    console.log(`Correo de confirmacion de lista de espera omitido para ${to}`);
    return null;
  }

  const appName = process.env.APP_NAME || "SchedMaster";
  const frontendUrl = process.env.FRONTEND_URL || 'https://schedmaster-frontend.vercel.app';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;padding:20px;border-radius:10px;color:#333;">
      <h2 style="color:#2563eb;margin-top:0;">Confirmacion de registro - ${appName}</h2>
      <p>Hola,</p>
      <p>Recibimos tu correo correctamente. Te notificaremos cuando se active una nueva convocatoria en la plataforma.</p>
      <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:20px 0;border-left:5px solid #2563eb;">
        <p style="margin:5px 0;"><strong>Correo registrado:</strong> ${escapeHtml(to)}</p>
      </div>
      <div style="text-align:center;margin:30px 0;">
        <a href="${frontendUrl}"
           style="background:#2563eb;color:white;padding:14px 25px;text-decoration:none;border-radius:5px;display:inline-block;font-weight:bold;">
          Ir a SchedMaster
        </a>
      </div>
    </div>
  `;

  return sendMail({
    to,
    subject: `${appName} - Confirmacion de lista de espera`,
    text: [
      'Hola,',
      '',
      'Recibimos tu correo correctamente.',
      'Te notificaremos cuando se active una nueva convocatoria en la plataforma.',
      '',
      `Correo registrado: ${to}`,
      `SchedMaster: ${frontendUrl}`
    ].join('\n'),
    html
  });
}

async function sendLogin2FACodeEmail({ to, name, code, ttlMinutes }) {
  if (DISABLE_MAILER) {
    console.log(`âš ï¸ Correo 2FA omitido para ${to}`);
    return;
  }

  const appName = process.env.APP_NAME || "SchedMaster";
  const safeName = name || "usuario";
  const safeCode = String(code || '').trim();
  const safeTtl = Number(ttlMinutes) || 10;

  const html = `
    <div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5eaf1;">
        <tr>
          <td style="background:linear-gradient(135deg,#234d7b 0%,#00a4e0 100%);padding:26px 28px;color:#ffffff;">
            <h1 style="margin:0;font-size:24px;line-height:1.2;">${appName}</h1>
            <p style="margin:8px 0 0;font-size:14px;opacity:0.92;">Verificacion de inicio de sesion</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 14px;font-size:16px;color:#22303f;">Hola <strong>${safeName}</strong>,</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4d5f73;">
              Recibimos una solicitud para iniciar sesion en tu cuenta. Usa este codigo de verificacion:
            </p>
            <div style="margin:0 0 18px;padding:18px 12px;border-radius:14px;background:#f0f8ff;border:1px dashed #7cc8e7;text-align:center;">
              <div style="font-size:12px;font-weight:700;letter-spacing:1.2px;color:#1e4f73;text-transform:uppercase;margin-bottom:8px;">Codigo de verificacion</div>
              <div style="font-size:38px;font-weight:800;letter-spacing:9px;color:#0b3555;line-height:1;">${safeCode}</div>
            </div>
            <p style="margin:0 0 12px;font-size:14px;color:#4d5f73;">
              Este codigo expira en <strong>${safeTtl} minutos</strong> y solo se puede usar una vez.
            </p>
            <p style="margin:0;font-size:13px;color:#71859a;line-height:1.6;">
              Si no solicitaste este acceso, puedes ignorar este mensaje.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  await sendMail({
    to,
    subject: `${appName} - Codigo de verificacion`,
    text: [
      `Hola ${safeName},`,
      '',
      `Tu codigo de verificacion es: ${safeCode}`,
      `Este codigo expira en ${safeTtl} minutos.`,
      '',
      'Si no solicitaste este inicio de sesion, ignora este mensaje.'
    ].join('\n'),
    html
  });
}

async function sendConvocatoriaActivaEmail({ to, periodo }) {
  try {
    if (DISABLE_MAILER) {
      console.log(`âš ï¸ Correo de convocatoria omitido para ${to}`);
      return;
    }

    const appName = process.env.APP_NAME || "SchedMaster";

    const html = `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:20px;font-family:Arial;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #ddd;">
              <tr>
                <td style="background:#2563eb;color:#ffffff;padding:20px;text-align:center;">
                  <h2 style="margin:0;">Nueva Convocatoria</h2>
                  <p style="margin:5px 0 0;">${appName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px;">
                  <p style="font-size:16px;">Se ha abierto un nuevo periodo:</p>
                  <table width="100%" cellpadding="10" cellspacing="0" style="background:#f3f4f6;border-radius:8px;margin:15px 0;">
                    <tr><td><strong>${periodo.nombre_periodo}</strong></td></tr>
                    <tr><td><b>Inicio:</b> ${new Date(periodo.fecha_inicio_inscripcion).toLocaleDateString()}</td></tr>
                    <tr><td><b>Fin:</b> ${new Date(periodo.fecha_fin_inscripcion).toLocaleDateString()}</td></tr>
                  </table>
                  <p>Puedes ingresar al sistema para registrarte.</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                    <tr>
                      <td align="center">
                        <a href="${process.env.FRONTEND_URL || 'https://schedmaster-frontend.vercel.app'}/register"
                           style="background:#2563eb;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:5px;display:inline-block;">
                          Registrarme
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background:#f9fafb;text-align:center;padding:10px;font-size:12px;color:#777;">
                  Â© 2026 ${appName}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const result = await sendMail({
      to,
      subject: `${appName} - Convocatoria abierta`,
      html
    });

    console.log("âœ… Correo de convocatoria enviado");
    return result;
  } catch (error) {
    console.error("âŒ Error enviando correo:", error);
    return null;
  }
}

module.exports.sendLogin2FACodeEmail = sendLogin2FACodeEmail;
module.exports.sendConvocatoriaActivaEmail = sendConvocatoriaActivaEmail;
module.exports.sendInscripcionDecisionEmail = sendInscripcionDecisionEmail;
module.exports.sendListaEsperaConfirmacionEmail = sendListaEsperaConfirmacionEmail;
module.exports.sendMail = sendMail;
