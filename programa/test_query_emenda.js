require('dotenv').config();
const EmendaService = require('./src/services/filtros/emendaService');
const FiltroService = require('./src/services/filtros/filtroService');
const QueryService = require('./src/services/query/queryService');
const ExtratorTermosService = require('./src/services/entidades/ExtratorTermosService');
const OrcamentoService = require('./src/services/entidades/OrcamentoService');
const Splitservice = require('./src/services/entidades/splitService');

async function runTest() {
    const frase = "dotação inicial da emenda AQUISIÇÃO DE EQUIPAMENTOS DE FISIOTERAPIA em 2024";
    console.log(`\n== Frase: "${frase}" ==\n`);

    // Simula o fluxo completo do controller
    const fraseProcessada = OrcamentoService.traduzirParaTermosSql(frase);
    const parametrosEncontrados = ExtratorTermosService.identificarParametros(fraseProcessada);
    const divisor = Splitservice.quebrarFrase(fraseProcessada);

    console.log("Parâmetros encontrados:", parametrosEncontrados);
    console.log("Divisor (partes da frase):", divisor);

    const filtros = await FiltroService.processarFiltros(divisor);
    console.log("\nFiltros extraídos:");
    console.log(JSON.stringify(filtros, null, 2));

    const anosQuery = FiltroService.resolverAnos(filtros);
    console.log("\nAnos resolvidos:", anosQuery);

    // Monta e imprime a query
    const queryService = new QueryService();
    try {
        const { sql, params } = queryService.buildQuery(parametrosEncontrados, filtros, anosQuery);
        console.log("\nSQL gerado:");
        console.log(sql);
        console.log("\nParams:", params);

        const rows = await queryService.executar(sql, params);
        console.log(`\nResultados (${rows.length} linhas):`);
        console.log(JSON.stringify(rows.slice(0, 5), null, 2));
    } catch (e) {
        console.error("\nErro ao montar/executar query:", e.message);
    }

    process.exit(0);
}

runTest();
