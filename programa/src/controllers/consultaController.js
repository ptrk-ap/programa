
const OrcamentoService = require("../services/entidades/OrcamentoService");
const ExtratorTermosService = require("../services/entidades/ExtratorTermosService");
const Splitservice = require("../services/entidades/splitService");
const filtroService = require("../services/filtros/filtroService");
const QueryService = require("../services/query/queryService");
const queryService = new QueryService();
//const pool = require("../database/connection");
const FormatterService = require("../services/entidades/formatterService");


async function consulta(req, res, next) {
    const consultaFrase = req.body.frase;

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


        //quebra a frase em pedaços
        const divisor = Splitservice.quebrarFrase(fraseProcessada);
        console.log(parametrosEncontrados);

        //procura filtros nos pedaços
        const filtros = filtroService.processarFiltros(divisor);

        /*
         const { sql, params } = queryService.buildQuery(parametrosEncontrados, filtros);
        console.log(sql, params);

        //executar conulta sql
        const [rows] = await pool.execute(sql, params);

        //formatar resultado para reais
        const resultadoFormatado = FormatterService.formatarResultado(rows);
           
        return res.json(resultadoFormatado);
        */

        //gerar sql

        return res.json(filtros);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    consulta

};
