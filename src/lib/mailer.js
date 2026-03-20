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

module.exports = transporter;