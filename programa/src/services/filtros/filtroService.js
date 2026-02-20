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
const CredorService = require("./credorService"); // Novo serviço assíncrono

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
            convenio_receita: new ConvenioReceitaService(),
            credor: new CredorService() // Adicionado à lista de serviços
        };
    }

    /**
     * Analisa as partes da frase e retorna um objeto com os filtros encontrados.
     * Utiliza Promise.all para processar todos os serviços e trechos em paralelo.
     * * @param {string[]} partesFrase - Array gerado pelo SplitService.
     * @returns {Promise<Object>} - Objeto contendo os resultados filtrados.
     */
    async processarFiltros(partesFrase) {
        // Inicializa o objeto de resultados baseado nas chaves dos serviços
        const filtrosEncontrados = {};
        Object.keys(this.services).forEach(chave => {
            filtrosEncontrados[chave] = [];
        });

        // Para cada pedaço da frase, processamos os serviços em sequência (Cascata)
        for (let trecho of partesFrase) {

            // Percorre cada serviço para tentar extrair filtros do trecho atual
            for (const [entidade, service] of Object.entries(this.services)) {
                try {
                    // Se o trecho ficou vazio (tudo foi removido por serviços anteriores), pula
                    if (!trecho || trecho.trim().length === 0) break;

                    const resultados = await service.extrair(trecho);

                    if (resultados && resultados.length > 0) {
                        // Adiciona os resultados encontrados
                        filtrosEncontrados[entidade].push(...resultados);

                        // Lógica de Cascata: Remove do trecho o que foi reconhecido
                        resultados.forEach(res => {
                            if (res.trecho_encontrado) {
                                // Cria regex global e case-insensitive para remover o fragmento
                                // Escapa o trecho para evitar problemas com regex
                                const trechoEscapado = res.trecho_encontrado.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                                const regex = new RegExp(trechoEscapado, "gi");
                                trecho = trecho.replace(regex, " ").trim();
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Erro ao extrair [${entidade}] no trecho "${trecho}":`, error);
                }
            }
        }

        // Remove duplicatas de objetos (caso o mesmo item seja encontrado em trechos diferentes) 
        // e remove chaves que ficaram com arrays vazios
        const resultadoFinal = {};

        for (const [entidade, lista] of Object.entries(filtrosEncontrados)) {
            if (lista.length > 0) {
                // Filtra duplicatas baseadas no código (único para cada entidade)
                const idsUnicos = new Set();
                resultadoFinal[entidade] = lista.filter(item => {
                    if (idsUnicos.has(item.codigo)) return false;
                    idsUnicos.add(item.codigo);
                    return true;
                });
            }
        }

        return resultadoFinal;
    }
}

module.exports = new FiltroService();