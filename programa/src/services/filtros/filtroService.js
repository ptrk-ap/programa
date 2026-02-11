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

class FiltroService {
    constructor() {
        // Instanciamos os serviços uma única vez no construtor
        this.services = {
            natureza: new NaturezaService(),
            fonte: new FonteService(),
            unidade_gestora: new UgService(),
            unidade_orcamentaria: new UoService(),
            programa: new ProgramaService(),
            acao: new AcaoService(),
            elemento: new ElementoService(),
            grupo_despesa: new GrupoDespesaService(),
            categoria_despesa: new CategoriaDespesaService(),
            funcao: new FuncaoService(),
            ods: new OdsService(),
            eixo: new EixoService(),
            poder: new PoderService(),
            emenda: new EmendaService()
        };
    }

    /**
     * Analisa o array vindo do SplitService e retorna um objeto com os filtros encontrados.
     * @param {string[]} partesFrase - Array gerado pelo SplitService.
     * @returns {Object} - Objeto contendo os resultados de cada entidade.
     */
    processarFiltros(partesFrase) {
        const filtrosEncontrados = {
            natureza: [],
            fonte: [],
            unidade_gestora: [],
            unidade_orcamentaria: [],
            programa: [],
            acao: [],
            elemento: [],
            grupo_despesa: [],
            categoria_despesa: [],
            funcao: [],
            ods: [],
            eixo: [],
            poder: [],
            emenda: []
        };

        // Percorre cada pedaço da frase que foi quebrado pelo SplitService
        partesFrase.forEach(trecho => {

            // Tenta extrair dados de cada serviço para o trecho atual
            const resNat = this.services.natureza.extrair(trecho);
            const resFon = this.services.fonte.extrair(trecho);
            const resUg = this.services.unidade_gestora.extrair(trecho);
            const resUo = this.services.unidade_orcamentaria.extrair(trecho);
            const resProg = this.services.programa.extrair(trecho);
            const resAcao = this.services.acao.extrair(trecho);
            const resElem = this.services.elemento.extrair(trecho);
            const resGrupoDespesa = this.services.grupo_despesa.extrair(trecho);
            const resCategoriaDespesa = this.services.categoria_despesa.extrair(trecho);
            const resFuncao = this.services.funcao.extrair(trecho);
            const resOds = this.services.ods.extrair(trecho);
            const resEixo = this.services.eixo.extrair(trecho);
            const resPoder = this.services.poder.extrair(trecho);
            const resEmenda = this.services.emenda.extrair(trecho);

            // Se o service retornar dados (assumindo que retorna array vazio se não achar nada)
            if (resNat?.length) filtrosEncontrados.natureza.push(...resNat);
            if (resFon?.length) filtrosEncontrados.fonte.push(...resFon);
            if (resUg?.length) filtrosEncontrados.unidade_gestora.push(...resUg);
            if (resUo?.length) filtrosEncontrados.unidade_orcamentaria.push(...resUo);
            if (resProg?.length) filtrosEncontrados.programa.push(...resProg);
            if (resAcao?.length) filtrosEncontrados.acao.push(...resAcao);
            if (resElem?.length) filtrosEncontrados.elemento.push(...resElem);
            if (resGrupoDespesa?.length) filtrosEncontrados.grupo_despesa.push(...resGrupoDespesa);
            if (resCategoriaDespesa?.length) filtrosEncontrados.categoria_despesa.push(...resCategoriaDespesa);
            if (resFuncao?.length) filtrosEncontrados.funcao.push(...resFuncao);
            if (resOds?.length) filtrosEncontrados.ods.push(...resOds);
            if (resEixo?.length) filtrosEncontrados.eixo.push(...resEixo);
            if (resPoder?.length) filtrosEncontrados.poder.push(...resPoder);
            if (resEmenda?.length) filtrosEncontrados.emenda.push(...resEmenda);
        });

        return filtrosEncontrados;
    }
}

module.exports = new FiltroService();