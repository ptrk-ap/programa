/**
 * ExtratorTermosService - Identifica quais chaves padronizadas estão presentes na frase.
 */
class ExtratorTermosService {
    constructor() {
        // Lista das chaves que queremos identificar
        this.chavesConfiguradas = [
            "unidade_gestora",
            "fonte",
            "natureza",
            "programa",
            "acao",
            "unidade_orcamentaria",
            "dotacao_inicial",
            "despesas_empenhadas",
            "despesas_pagas",
            "elemento",
            "grupo_despesa",
            "despesas_exercicio_pagas"
        ];
    }

    /**
     * Analisa a frase e retorna um array com as chaves encontradas.
     * @param {string} textoNormatizado - A frase já processada pelo OrcamentoService.
     * @returns {string[]} - Array com as chaves detectadas (ex: ['fonte', 'acao']).
     */
    identificarParametros(textoNormatizado) {
        if (!textoNormatizado) return [];

        // Filtramos a lista de chaves, retornando apenas as que existem no texto
        return this.chavesConfiguradas.filter(chave => {
            // Usamos uma Regex com Word Boundary (\b) para garantir que
            // "despesa_paga" não seja confundido com "despesa_exercicio_paga"
            const regex = new RegExp(`\\b${chave}\\b`, 'g');
            return regex.test(textoNormatizado);
        });
    }
}

module.exports = new ExtratorTermosService();