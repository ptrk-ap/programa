const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "siafic",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// teste de conexão inicial
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conectado ao MySQL com sucesso");
    connection.release();
  } catch (err) {
    console.error("❌ Erro ao conectar no MySQL");
    console.error(err.message);
    process.exit(1);

  }
})();

module.exports = pool;