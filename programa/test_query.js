const OrcamentoService = require("./src/services/entidades/OrcamentoService");
const ExtratorTermosService = require("./src/services/entidades/ExtratorTermosService");
const Splitservice = require("./src/services/entidades/splitService");
const filtroService = require("./src/services/filtros/filtroService");
const QueryService = require("./src/services/query/queryService");
const queryService = new QueryService();

async function runTest() {
    const consultaFrase = "despesas pagas na seplan no primeiro trimestre de 2024";
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
    console.log("SQL:", sql);
    console.log("Params:", params);

    const rows = await queryService.executar(sql, params);
    console.log("Rows count:", rows.length);
}

runTest().catch(console.error);
