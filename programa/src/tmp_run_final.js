
const OrcamentoService = require("./services/entidades/OrcamentoService");
const ExtratorTermosService = require("./services/entidades/ExtratorTermosService");
const SplitService = require("./services/entidades/splitService");
const filtroService = require("./services/filtros/filtroService");
const QueryService = require("./services/query/queryService");
const pool = require("./database/connection");

async function runQuery(frase) {
    console.log(`\n--- FRASE: "${frase}" ---`);
    try {
        const fraseProcessada = OrcamentoService.traduzirParaTermosSql(frase);
        const parametrosEncontrados = ExtratorTermosService.identificarParametros(fraseProcessada);
        const divisor = SplitService.quebrarFrase(fraseProcessada);
        const filtros = await filtroService.processarFiltros(divisor);
        const queryService = new QueryService();
        const { sql, params } = queryService.buildQuery(parametrosEncontrados, filtros);

        console.log("SQL:");
        console.log(sql);
        console.log("PARAMS:", JSON.stringify(params));

        const [rows] = await pool.execute(sql, params);
        console.log("RESULTADO:");
        console.log(JSON.stringify(rows));
    } catch (err) {
        console.error("ERRO:", err.message);
    }
}

async function main() {
    await runQuery("despesas pagas na seplan em maio de 2024");
    await runQuery("despesas pagas na seplan em maio e junho de 2024");
    await pool.end();
}

main();
