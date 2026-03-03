
const path = require("path");
const fs = require("fs");

// Fix for relative paths in services (they expect to find ../src/data/...)
// By running from 'src/services/filtros', the path '../src/data/...' resolves to 'src/services/src/data/...' (WRONG)
// They actually seem to expect being run from a context where '../src/data' exists.
// Let's force the CWD to the project root and then fix the require.
const projectRoot = path.join(__dirname, "..");
process.chdir(projectRoot);

const OrcamentoService = require("./src/services/entidades/OrcamentoService");
const ExtratorTermosService = require("./src/services/entidades/ExtratorTermosService");
const SplitService = require("./src/services/entidades/splitService");
const filtroService = require("./src/services/filtros/filtroService");
const QueryService = require("./src/services/query/queryService");
const pool = require("./src/database/connection");

async function run() {
    const frase = "despesas pagas na seplan em maio de 2024";
    try {
        const fraseProcessada = OrcamentoService.traduzirParaTermosSql(frase);
        const parametrosEncontrados = ExtratorTermosService.identificarParametros(fraseProcessada);
        const divisor = SplitService.quebrarFrase(fraseProcessada);
        const filtros = await filtroService.processarFiltros(divisor);
        const queryService = new QueryService();
        const { sql, params } = queryService.buildQuery(parametrosEncontrados, filtros);

        console.log("SQL_START");
        console.log(sql);
        console.log("SQL_END");

        console.log("PARAMS_START");
        console.log(JSON.stringify(params));
        console.log("PARAMS_END");

        const [rows] = await pool.execute(sql, params);
        console.log("RESULT_START");
        console.log(JSON.stringify(rows));
        console.log("RESULT_END");
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
