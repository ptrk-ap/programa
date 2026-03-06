class AnoService {
    constructor() {
        this.anosSuportados = [2024, 2025, 2026];
        this.anoPadrao = 2026;
    }

    /**
     * Extrai o ano da frase.
     * Retorna um objeto com o ano encontrado e o trecho para remoção em cascata.
     * @param {string} frase 
     * @returns {Promise<Array>}
     */
    async extrair(frase) {
        if (!frase) return [];

        // Regex para capturar anos de 4 dígitos
        const regexAno = /\b(2024|2025|2026)\b/g;
        const matches = [...frase.matchAll(regexAno)];

        if (matches.length > 0) {
            // Retorna o primeiro ano encontrado
            const ano = parseInt(matches[0][0]);
            return [{
                codigo: ano,
                descricao: `Ano ${ano}`,
                trecho_encontrado: matches[0][0]
            }];
        }

        return [];
    }

    getAnoPadrao() {
        return this.anoPadrao;
    }
}

module.exports = AnoService;
