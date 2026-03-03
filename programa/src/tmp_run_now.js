
const path = require("path");
const OrcamentoService = require("./services/entidades/OrcamentoService");
const ExtratorTermosService = require("./services/entidades/ExtratorTermosService");
const SplitService = require("./services/entidades/splitService");
const filtroService = require("./services/filtros/filtroService");
const QueryService = require("./services/query/queryService");
const pool = require("./database/connection");

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
