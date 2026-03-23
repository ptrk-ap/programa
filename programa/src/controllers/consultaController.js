
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
        console.log("divisor: " + divisor);

        // Procura filtros nos pedaços
        const filtros = await filtroService.processarFiltros(divisor);
        console.log(filtros);

        // Extrai os anos para a query eliminando duplicados
        const anosQuery = filtros.ano && filtros.ano.length > 0
            ? [...new Set(filtros.ano.map(a => a.codigo))]
            : [filtroService.services.ano.getAnoPadrao()];

        // Monta a query multi-ano
        const { sql, params } = queryService.buildQuery(parametrosEncontrados, filtros, anosQuery);
        //console.log(sql, params);

        //executar conulta sql
        const [rows] = await knex.raw(sql, params);

        //formatar resultado para reais
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
        //next(err);
        return res.json("Desculpe, não entendi. você poderia reformular sua pergunta? lembre-se de usar sempre termos técnicos e formais em consultas contabeis ");
    }
}

module.exports = {
    consulta

};
