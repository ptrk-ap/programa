const OrcamentoService = require("./src/services/entidades/OrcamentoService");
const ExtratorTermosService = require("./src/services/entidades/ExtratorTermosService");
const SplitService = require("./src/services/entidades/splitService");
const filtroService = require("./src/services/filtros/filtroService");
const QueryService = require("./src/services/query/queryService");
const queryService = new QueryService();

async function test() {
    const frase = "despesas pagas na seplan em maio de 2024";
    console.log("Frase original:", frase);

    const fraseProcessada = OrcamentoService.traduzirParaTermosSql(frase);
    console.log("Frase processada:", fraseProcessada);

    const parametrosEncontrados = ExtratorTermosService.identificarParametros(fraseProcessada);
    console.log("Parâmetros encontrados:", parametrosEncontrados);

    const divisor = SplitService.quebrarFrase(fraseProcessada);
    console.log("Divisor:", divisor);

    const filtros = await filtroService.processarFiltros(divisor);
    console.log("Filtros:", JSON.stringify(filtros, null, 2));

    const { sql, params } = queryService.buildQuery(parametrosEncontrados, filtros);
    console.log("\nSQL Gerado:");
    console.log(sql);
    console.log("\nParâmetros:");
    console.log(params);
}

test().catch(console.error);
