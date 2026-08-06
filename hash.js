const bcrypt = require('bcrypt');

async function generarHash() {
  const password = process.argv[2] || process.env.HASH_PASSWORD;

  if (!password) {
    throw new Error('Proporciona la contrasena por argumento o HASH_PASSWORD.');
  }

  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
}

generarHash().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
