require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  🚀 SchedMaster Backend listo!\n  🌍 URL: http://localhost:${PORT}\n  🛠️  CORS habilitado para puerto 3000\n  `);
  });
}

module.exports = app;