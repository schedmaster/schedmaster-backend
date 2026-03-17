require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.log("Error con el servidor de correo:", error);
  } else {
    console.log(" Servidor de correo listo");
  }
});

module.exports = transporter;