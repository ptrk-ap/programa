const OrcamentoService = require('./src/services/entidades/OrcamentoService');
const ExtratorTermosService = require('./src/services/entidades/ExtratorTermosService');
const Splitservice = require('./src/services/entidades/splitService');
const filtroService = require('./src/services/filtros/filtroService');
const QueryService = require('./src/services/query/queryService');
const queryService = new QueryService();

async function test() {
    const frase = "despesas pagas na seplan em janeiro de 2024";
    console.log("1. Frase original:", frase);

    const fraseProcessada = OrcamentoService.traduzirParaTermosSql(frase);
    console.log("2. Frase processada:", fraseProcessada);

    const parametrosEncontrados = ExtratorTermosService.identificarParametros(fraseProcessada);
    console.log("3. Parâmetros encontrados:", parametrosEncontrados);

    const divisor = Splitservice.quebrarFrase(fraseProcessada);
    console.log("4. Divisor (Split):", divisor);

    const filtros = await filtroService.processarFiltros(divisor);
    console.log("5. Filtros extraídos:", JSON.stringify(filtros, null, 2));

    if (filtros.periodo) {
        const { sql, params } = queryService.buildQuery(parametrosEncontrados, filtros);
        console.log("6. SQL Gerado:", sql);
        console.log("7. Parâmetros SQL:", params);
    } else {
        console.log("❌ ERRO: Filtro de período não foi extraído.");
    }
}

test();
