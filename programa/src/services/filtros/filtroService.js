// Importação dos serviços de entidades
const NaturezaService = require("./naturezaService");
const FonteService = require("./fonteService");
const UgService = require("./ugService");
const UoService = require("./uoService");
const ProgramaService = require("./programaService");
const AcaoService = require("./acaoService");
const ElementoService = require("./elementoService");
const GrupoDespesaService = require("./grupodespesaService");
const CategoriaDespesaService = require("./categoriadespesaService");
const FuncaoService = require("./funcaoService");
const OdsService = require("./odsService");
const EixoService = require("./eixoService");
const PoderService = require("./poderService");
const EmendaService = require("./emendaService");
const ContratoService = require("./contratoService");
const ConvenioDespesaService = require("./conveniodespesaService");
const ConvenioReceitaService = require("./convenioreceitaService");

class FiltroService {
    constructor() {
        // Instanciamos os serviços uma única vez no construtor
        this.services = {
            natureza_despesa: new NaturezaService(),
            fonte: new FonteService(),
            unidade_gestora: new UgService(),
            unidade_orcamentaria: new UoService(),
            programa: new ProgramaService(),
            acao: new AcaoService(),
            elemento_despesa: new ElementoService(),
            grupo_despesa: new GrupoDespesaService(),
            categoria_despesa: new CategoriaDespesaService(),
            funcao: new FuncaoService(),
            ods: new OdsService(),
            eixo: new EixoService(),
            poder: new PoderService(),
            emenda: new EmendaService(),
            contrato: new ContratoService(),
            convenio_despesa: new ConvenioDespesaService(),
            convenio_receita: new ConvenioReceitaService()
        };
    }

    /**
     * Analisa o array vindo do SplitService e retorna um objeto com os filtros encontrados.
     * @param {string[]} partesFrase - Array gerado pelo SplitService.
     * @returns {Object} - Objeto contendo os resultados de cada entidade.
     */
    processarFiltros(partesFrase) {
        const filtrosEncontrados = {
            natureza_despesa: [],
            fonte: [],
            unidade_gestora: [],
            unidade_orcamentaria: [],
            programa: [],
            acao: [],
            elemento_despesa: [],
            grupo_despesa: [],
            categoria_despesa: [],
            funcao: [],
            ods: [],
            eixo: [],
            poder: [],
            emenda: [],
            contrato: [],
            convenio_despesa: [],
            convenio_receita: []
        };

        // Percorre cada pedaço da frase que foi quebrado pelo SplitService
        partesFrase.forEach(trecho => {

            // Tenta extrair dados de cada serviço para o trecho atual
            const resNat = this.services.natureza_despesa.extrair(trecho);
            const resFon = this.services.fonte.extrair(trecho);
            const resUg = this.services.unidade_gestora.extrair(trecho);
            const resUo = this.services.unidade_orcamentaria.extrair(trecho);
            const resProg = this.services.programa.extrair(trecho);
            const resAcao = this.services.acao.extrair(trecho);
            const resElem = this.services.elemento_despesa.extrair(trecho);
            const resGrupoDespesa = this.services.grupo_despesa.extrair(trecho);
            const resCategoriaDespesa = this.services.categoria_despesa.extrair(trecho);
            const resFuncao = this.services.funcao.extrair(trecho);
            const resOds = this.services.ods.extrair(trecho);
            const resEixo = this.services.eixo.extrair(trecho);
            const resPoder = this.services.poder.extrair(trecho);
            const resEmenda = this.services.emenda.extrair(trecho);
            const resContrato = this.services.contrato.extrair(trecho);
            const resConvenioDespesa = this.services.convenio_despesa.extrair(trecho);
            const resConvenioReceita = this.services.convenio_receita.extrair(trecho);

            // Se o service retornar dados (assumindo que retorna array vazio se não achar nada)
            if (resNat?.length) filtrosEncontrados.natureza_despesa.push(...resNat);
            if (resFon?.length) filtrosEncontrados.fonte.push(...resFon);
            if (resUg?.length) filtrosEncontrados.unidade_gestora.push(...resUg);
            if (resUo?.length) filtrosEncontrados.unidade_orcamentaria.push(...resUo);
            if (resProg?.length) filtrosEncontrados.programa.push(...resProg);
            if (resAcao?.length) filtrosEncontrados.acao.push(...resAcao);
            if (resElem?.length) filtrosEncontrados.elemento_despesa.push(...resElem);
            if (resGrupoDespesa?.length) filtrosEncontrados.grupo_despesa.push(...resGrupoDespesa);
            if (resCategoriaDespesa?.length) filtrosEncontrados.categoria_despesa.push(...resCategoriaDespesa);
            if (resFuncao?.length) filtrosEncontrados.funcao.push(...resFuncao);
            if (resOds?.length) filtrosEncontrados.ods.push(...resOds);
            if (resEixo?.length) filtrosEncontrados.eixo.push(...resEixo);
            if (resPoder?.length) filtrosEncontrados.poder.push(...resPoder);
            if (resEmenda?.length) filtrosEncontrados.emenda.push(...resEmenda);
            if (resContrato?.length) filtrosEncontrados.contrato.push(...resContrato);
            if (resConvenioDespesa?.length) filtrosEncontrados.convenio_despesa.push(...resConvenioDespesa);
            if (resConvenioReceita?.length) filtrosEncontrados.convenio_receita.push(...resConvenioReceita);
        });

        // Remove propriedades com arrays vazios
        const apenasNaoVazios = Object.fromEntries(
            Object.entries(filtrosEncontrados)
                .filter(([_, valor]) => Array.isArray(valor) && valor.length > 0)
        );

        return apenasNaoVazios;

    }
}

module.exports = new FiltroService();