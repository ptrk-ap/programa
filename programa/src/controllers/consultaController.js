
const OrcamentoService = require("../services/entidades/OrcamentoService");
const ExtratorTermosService = require("../services/entidades/ExtratorTermosService");
const Splitservice = require("../services/entidades/splitService");
const filtroService = require("../services/filtros/filtroService");
const QueryService = require("../services/query/queryService");
const queryService = new QueryService();
const knex = require("../database/connection");
const FormatterService = require("../services/entidades/formatterService");




async function consulta(req, res, next) {
    const consultaFrase = req.body.frase;
    let aux = '';

    if (!consultaFrase || typeof consultaFrase !== "string") {
        return res.status(400).json({
            erro: "Campo 'frase' é obrigatório"
        });
    }

    try {
        //traduzir especificos para termos do banco: unidade gestora -> unidade_gestora
        const fraseProcessada = OrcamentoService.traduzirParaTermosSql(consultaFrase);



        //identifica e lista os campos do relatorio presente na frase
        const parametrosEncontrados = ExtratorTermosService.identificarParametros(fraseProcessada);

        //quebra a frase em pedaços usando os termos do banco como marcador
        const divisor = Splitservice.quebrarFrase(fraseProcessada);


        // Procura filtros nos pedaços
        const filtros = await filtroService.processarFiltros(divisor);
        // console.log(filtros);

        // --- VALIDAÇÕES DE REQUISITOS BÁSICOS ---

        // 1. Verificação de dotação ou despesas (obrigatório ao menos um)
        const termosObrigatorios = [
            "dotacao_inicial",
            "despesas_empenhadas",
            "despesas_liquidadas",
            "despesas_pagas",
            "despesas_exercicio_pagas"
        ];
        const temDespesaOuDotacao = parametrosEncontrados.some(p => termosObrigatorios.includes(p));

        if (!temDespesaOuDotacao) {
            return res.status(400).json({
                erro: "Requisição incompleta",
                mensagem: "Para que o sistema funcione, é obrigatório informar ao menos uma dessas despesas (Empenhada, Liquidada, Paga ou do Exercício) ou a Dotação Inicial."
            });
        }

        // 2. Verificação de categorias ou filtros (obrigatório ao menos um)
        const categoriasObrigatorias = [
            "unidade_gestora", "fonte", "natureza_despesa", "programa", "acao",
            "unidade_orcamentaria", "elemento_despesa", "grupo_despesa",
            "categoria_despesa", "funcao", "ods", "eixo", "poder", "emenda",
            "contrato", "convenio_despesa", "convenio_receita", "credor", "agrupamento_mensal"
        ];
        const temCategoria = parametrosEncontrados.some(p => categoriasObrigatorias.includes(p));

        // O sistema não deve considerar 'ano' ou 'ordem_bancaria' como filtros suficientes para o contexto
        const chavesFiltroValidos = Object.keys(filtros).filter(f => f !== "ano" && f !== "ordem_bancaria");
        const temFiltro = chavesFiltroValidos.length > 0;

        if (!temCategoria && !temFiltro) {
            return res.json({
                mensagem: "Consulta muito genérica. Para obter resultados, informe ao menos uma categoria (ex: Órgão, Programa) ou filtro específico.",
                resultado: []
            });
        }

        // --- FIM DAS VALIDAÇÕES ---

        // Extrai os anos para a query eliminando duplicados
        const anosQuery = filtros.ano && filtros.ano.length > 0
            ? [...new Set(filtros.ano.map(a => a.codigo))]
            : [filtroService.services.ano.getAnoPadrao()];
        // Monta a query multi-ano
        const { sql, params } = queryService.buildQuery(parametrosEncontrados, filtros, anosQuery);
        // console.log(sql, params);

        // Executar consulta SQL
        const [rows] = await knex.raw(sql, params);

        // Formatar resultado para reais
        const resultadoFormatado = FormatterService.formatarResultado(rows);

        let periodosTexto = [];
        if (filtros.ordem_bancaria && filtros.ordem_bancaria.length > 0) {
            periodosTexto = filtros.ordem_bancaria.map(ob => `${ob.data_inicio} a ${ob.data_fim}`);
        } else {
            // Formatação mais legível para os anos completos
            periodosTexto = anosQuery.map(a => `Exercício de ${a}`);
        }

        aux = `Valores correspondentes ao período: ${periodosTexto.join(', ')}`;

        const resposta = {
            mensagem: aux,
            resultado: resultadoFormatado
        }

        return res.json(resposta);

    } catch (err) {
        console.error("Erro no ConsultaController:", err);
        return res.status(500).json({
            erro: "Erro interno no servidor",
            mensagem: "Desculpe, não entendi sua solicitação. Você poderia reformular sua pergunta? Lembre-se de usar termos técnicos e formais em consultas contábeis.",
            detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}

module.exports = {
    consulta

};
