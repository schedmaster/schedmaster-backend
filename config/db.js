const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '26R12R05g',
  database: 'schedmaster',
});

module.exports = pool;
