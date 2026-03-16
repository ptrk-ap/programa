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
const PeriodoService = require("./dateService");
const AnoService = require("./anoService");

class FiltroService {
    constructor() {
        // Instanciamos os serviços uma única vez no construtor
        this.services = {
            ano: new AnoService(),
            ordem_bancaria: new PeriodoService(),
            unidade_gestora: new UgService(),
            natureza_despesa: new NaturezaService(),
            fonte: new FonteService(),
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
     * Grupos de entidades que devem ser processados em paralelo sobre o mesmo trecho.
     * Todas as entidades dentro de um grupo recebem o trecho original simultaneamente,
     * sem que uma remova do trecho o que a outra ainda precisa ler.
     *
     * Entidades fora destes grupos seguem o fluxo padrão em cascata.
     */
    static GRUPOS_PARALELOS = [
        ["unidade_gestora", "unidade_orcamentaria"],
    ];

    /**
     * Analisa as partes da frase e retorna um objeto com os filtros encontrados.
     * Entidades em GRUPOS_PARALELOS são processadas simultaneamente sobre o mesmo
     * trecho; as demais seguem o fluxo cascata (cada serviço recebe o trecho já
     * reduzido pelos anteriores).
     *
     * @param {string[]} partesFrase - Array gerado pelo SplitService.
     * @returns {Promise<Object>} - Objeto contendo os resultados filtrados.
     */
    async processarFiltros(partesFrase) {
        // Inicializa o objeto de resultados baseado nas chaves dos serviços
        const filtrosEncontrados = {};
        Object.keys(this.services).forEach(chave => {
            filtrosEncontrados[chave] = [];
        });

        // Monta um Set com todas as entidades que fazem parte de algum grupo paralelo,
        // para excluí-las do loop cascata principal
        const entidadesParalelas = new Set(FiltroService.GRUPOS_PARALELOS.flat());

        for (let trecho of partesFrase) {

            // ── 1. Processamento em CASCATA (serviços que não pertencem a grupos paralelos) ──
            for (const [entidade, service] of Object.entries(this.services)) {
                // Entidades paralelas são tratadas separadamente; pula aqui
                if (entidadesParalelas.has(entidade)) continue;

                // Se o trecho ficou vazio (tudo foi removido por serviços anteriores), encerra
                if (!trecho || trecho.trim().length === 0) break;

                try {
                    let resultados;
                    if (entidade === "ordem_bancaria") {
                        // Passa o ano encontrado (ou o padrão) como referência para o DateService
                        const anoFiltro = filtrosEncontrados.ano && filtrosEncontrados.ano.length > 0
                            ? filtrosEncontrados.ano[0].codigo
                            : this.services.ano.getAnoPadrao();
                        resultados = await service.extrair(trecho, anoFiltro);
                    } else {
                        resultados = await service.extrair(trecho);
                    }

                    if (resultados && resultados.length > 0) {
                        filtrosEncontrados[entidade].push(...resultados);

                        // Lógica de cascata: remove do trecho o que foi reconhecido
                        resultados.forEach(res => {
                            if (res.trecho_encontrado) {
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

            // ── 2. Processamento em PARALELO (grupos declarados em GRUPOS_PARALELOS) ──
            // Cada grupo recebe o mesmo trecho (já reduzido pelo bloco cascata acima).
            // Dentro do grupo, todos os serviços rodam simultaneamente via Promise.all.
            for (const grupo of FiltroService.GRUPOS_PARALELOS) {
                if (!trecho || trecho.trim().length === 0) break;

                // Dispara todos os serviços do grupo ao mesmo tempo sobre o mesmo trecho
                const resultadosGrupo = await Promise.all(
                    grupo.map(async entidade => {
                        try {
                            const resultados = await this.services[entidade].extrair(trecho);
                            return { entidade, resultados: resultados ?? [] };
                        } catch (error) {
                            console.error(`Erro ao extrair [${entidade}] no trecho "${trecho}":`, error);
                            return { entidade, resultados: [] };
                        }
                    })
                );

                // Consolida os resultados e aplica a remoção de cascata após o grupo inteiro ter rodado
                for (const { entidade, resultados } of resultadosGrupo) {
                    if (resultados.length > 0) {
                        filtrosEncontrados[entidade].push(...resultados);

                        resultados.forEach(res => {
                            if (res.trecho_encontrado) {
                                const trechoEscapado = res.trecho_encontrado.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                                const regex = new RegExp(trechoEscapado, "gi");
                                trecho = trecho.replace(regex, " ").trim();
                            }
                        });
                    }
                }
            }
        }

        // Remove duplicatas e chaves com arrays vazios
        const resultadoFinal = {};

        for (const [entidade, lista] of Object.entries(filtrosEncontrados)) {
            if (lista.length > 0) {
                // Filtra duplicatas pelo código (único por entidade).
                // Para 'ordem_bancaria', que não possui código, mantém todos os itens.
                const idsUnicos = new Set();
                resultadoFinal[entidade] = lista.filter(item => {
                    if (entidade === "ordem_bancaria") return true;
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