const express = require("express");
const cors = require("cors");
const errorHandler = require("./middlewares/errorHandler");
const consultaRoutes = require("./routes/consultaRoutes");

const app = express();

// CORS
app.use(cors({ origin: "*" }));

// JSON
app.use(express.json());

// rotas

app.use("/consultar", consultaRoutes);


// middleware de erro (sempre por último)
app.use(errorHandler);

module.exports = app;
