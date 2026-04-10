const OrcamentoService = require("./src/services/entidades/OrcamentoService");
const ExtratorTermosService = require("./src/services/entidades/ExtratorTermosService");
const Splitservice = require("./src/services/entidades/splitService");
const filtroService = require("./src/services/filtros/filtroService");
const QueryService = require("./src/services/query/queryService");
const queryService = new QueryService();

async function runTest() {
    const consultaFrase = "despesas pagas na seplan por dia em dezembro de 2025";
    console.log("Original:", consultaFrase);

    const fraseProcessada = OrcamentoService.traduzirParaTermosSql(consultaFrase);
    console.log("Processada:", fraseProcessada);

    const parametrosEncontrados = ExtratorTermosService.identificarParametros(fraseProcessada);
    console.log("Parametros:", parametrosEncontrados);

    const divisor = Splitservice.quebrarFrase(fraseProcessada);
    console.log("Divisor:", divisor);

    const filtros = await filtroService.processarFiltros(divisor);
    console.log("Filtros:", JSON.stringify(filtros, null, 2));

    const anosQuery = filtroService.resolverAnos(filtros);
    console.log("Anos Query:", anosQuery);

    const { sql, params } = queryService.buildQuery(parametrosEncontrados, filtros, anosQuery);
    console.log("\nSQL gerado:\in", sql);
    console.log("\nParams:", params);

    console.log("\nExecutando query...\n");
    const rows = await queryService.executar(sql, params);

    if (rows.length === 0) {
        console.log("Nenhum resultado encontrado para este período/filtro.");
    } else {
        console.table(rows);
        console.log(`\nTotal de dias com registros: ${rows.length}`);
    }
}

runTest().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
