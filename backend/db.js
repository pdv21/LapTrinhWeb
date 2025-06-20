// db.js
const mssql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE || 'GameStore',
  port:   parseInt(process.env.DB_PORT, 10) || 1433,
  options: { encrypt: true, trustServerCertificate: true },
};

// Kết nối pool và export
const poolPromise = mssql
  .connect(dbConfig)
  .then(pool => {
    console.log('✅ SQL Connected');
    return pool;
  })
  .catch(err => {
    console.error('❌ SQL Connection Error:', err);
    process.exit(1);
  });

module.exports = { mssql, poolPromise };
