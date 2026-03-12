const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
    database: process.env.DB_NAME || "siafic"
  },
  pool: { min: 2, max: 10 }
});

module.exports = knex;

