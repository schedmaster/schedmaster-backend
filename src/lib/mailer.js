require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

transporter.verify((error) => {
  if (error) console.log("❌ Error Mailer:", error);
  else console.log("✅ Servidor de correo oficial listo");
});

async function sendLogin2FACodeEmail({ to, name, code, ttlMinutes }) {
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

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject: `${appName} - Codigo de verificacion`,
    text: [
      `Hola ${name || ''},`,
      '',
      `Tu codigo de verificacion es: ${code}`,
      `Este codigo expira en ${ttlMinutes} minutos.`,
      '',
      'Si no solicitaste este inicio de sesion, ignora este mensaje.'
    ].join('\n'),
    html
  });
}

module.exports = transporter;
module.exports.sendLogin2FACodeEmail = sendLogin2FACodeEmail;