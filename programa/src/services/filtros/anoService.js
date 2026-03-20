class AnoService {
    constructor() {
        this.anoPadrao = new Date().getFullYear();
    }

    /**
     * Extrai o ano da frase.
     * Retorna um objeto com o ano encontrado e o trecho para remoção em cascata.
     * @param {string} frase 
     * @returns {Promise<Array>}
     */
    async extrair(frase) {
        if (!frase) return [];

        const anoAtual = new Date().getFullYear();
        const anosValidos = [];
        for (let a = 2024; a <= anoAtual; a++) {
            anosValidos.push(a);
        }

        const anosExtraidos = new Set();
        const retornos = [];

        // 1. Procurar por intervalos explícitos
        // Ex: "2024 a 2026", "2024 ate 2026", "entre 2024 e 2026", "2024 - 2026"
        const regexIntervalo = /\b(20\d{2})\b\s*(?:a|ate|até|e|-)\s*\b(20\d{2})\b/gi;
        const fraseSemIntervalos = frase.replace(regexIntervalo, (match, ano1, ano2) => {
            const a1 = parseInt(ano1);
            const a2 = parseInt(ano2);

            const min = Math.max(2024, Math.min(a1, a2));
            const max = Math.min(anoAtual, Math.max(a1, a2));

            for (let a = min; a <= max; a++) {
                if (!anosExtraidos.has(a)) {
                    anosExtraidos.add(a);
                    retornos.push({
                        codigo: a,
                        descricao: `Ano ${a}`,
                        trecho_encontrado: match
                    });
                }
            }
            return " "; // Remove para não re-avaliar
        });

        // 2. Regex para isolados no restante da frase
        const regexStr = `\\b(${anosValidos.join('|')})\\b`;
        const regexAno = new RegExp(regexStr, 'g');
        const matches = [...fraseSemIntervalos.matchAll(regexAno)];

        for (const m of matches) {
            const ano = parseInt(m[0]);
            if (!anosExtraidos.has(ano)) {
                anosExtraidos.add(ano);
                retornos.push({
                    codigo: ano,
                    descricao: `Ano ${ano}`,
                    trecho_encontrado: m[0]
                });
            }
        }

        return retornos;
    }

    getAnoPadrao() {
        return this.anoPadrao;
    }
}

module.exports = AnoService;
