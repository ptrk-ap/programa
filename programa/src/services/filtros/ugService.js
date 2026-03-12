const fs = require("fs");
const path = require("path");
const caminhoCsv = path.join(__dirname, "..", "..", "data", "entidades", "unidade_gestora.csv");

/**
 * Palavras ignoradas na busca
 */
const STOPWORDS = new Set([
    "estado",
    "estadual"
]);

/**
 * Normaliza texto para comparação:
 * - lowercase
 * - remove acentos
 * - remove pontuação
 * - trim
 */
function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, "")
        .trim();
}

/**
 * Remove stopwords do texto já normalizado
 */
function removeStopwords(text) {
    return text
        .split(/\s+/)
        .filter(p => !STOPWORDS.has(p))
        .join(" ");
}

class UnidadeGestoraService {

    constructor() {

        // Carrega CSV uma única vez
        this.unidades = this.carregarCsv(caminhoCsv);

        // Índice por código (O(1))
        this.mapaPorCodigo = new Map(
            this.unidades.map(u => [u.codigo, u])
        );

        // Índice por mnemônico (case-insensitive)
        this.mapaPorMnemonico = new Map(
            this.unidades.map(u => [normalize(u.mnemonico), u])
        );
    }

    /**
     * Lê CSV e transforma em objetos
     */
    carregarCsv(caminho) {
        const conteudo = fs.readFileSync(caminho, "utf8");

        return conteudo
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(1) // remove cabeçalho
            .map(linha => {
                const [codigo, mnemonico, descricao] = linha.split(",");

                return {
                    codigo: (codigo || "").trim(),
                    mnemonico: (mnemonico || "").trim(),
                    descricao: (descricao || "").trim()
                };
            })
            .filter(item =>
                item.codigo &&
                item.mnemonico &&
                item.descricao &&
                /^\d{2}0\d{3}$/.test(item.codigo)
            );
    }

    /**
     * Extrai unidades gestoras de uma frase:
     * 1. Código
     * 2. Mnemônico
     * 3. Descrição (fallback)
     */
    /**
 * Encontra o menor trecho contíguo da frase original
 * que contém a maior parte das palavras-chave da descrição.
 */
    _extrairTrechoDescricao(fraseOriginal, palavrasDescricao) {
        const tokensOriginais = fraseOriginal.split(/\s+/);
        const tokensNorm = tokensOriginais.map(t => normalize(t));
        const setDescricao = new Set(palavrasDescricao);

        let melhorTrecho = fraseOriginal;
        let melhorScore = 0;
        let melhorTamanho = tokensOriginais.length;

        // Testa todas as janelas de tamanho crescente
        for (let tamanho = 1; tamanho <= tokensOriginais.length; tamanho++) {
            for (let inicio = 0; inicio + tamanho <= tokensOriginais.length; inicio++) {
                const janelaNorm = tokensNorm.slice(inicio, inicio + tamanho);
                const janelaOriginal = tokensOriginais.slice(inicio, inicio + tamanho);

                const hits = janelaNorm.filter(t => setDescricao.has(removeStopwords(t))).length;
                const score = hits / palavrasDescricao.length;

                // Prefere maior cobertura; em empate, prefere janela menor
                if (
                    score > melhorScore ||
                    (score === melhorScore && tamanho < melhorTamanho)
                ) {
                    melhorScore = score;
                    melhorTamanho = tamanho;
                    melhorTrecho = janelaOriginal.join(" ");
                }
            }
        }

        return melhorTrecho;
    }
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set();

        // 🔥 Remove stopwords também da frase digitada
        const textoNormalizado = removeStopwords(normalize(frase));

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO
        // -------------------------------

        const codigos = frase.match(/\b\d{2}0\d{3}\b/g) || [];

        for (const codigo of codigos) {
            const unidade = this.mapaPorCodigo.get(codigo);

            if (unidade && !encontrados.has(codigo)) {
                resultados.push({
                    codigo: unidade.codigo,
                    descricao: unidade.descricao,
                    trecho_encontrado: codigo
                });
                encontrados.add(codigo);
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR MNEMÔNICO
        // -------------------------------

        const tokens = textoNormalizado.split(/\s+/);

        for (const token of tokens) {
            const unidade = this.mapaPorMnemonico.get(token);

            if (unidade && !encontrados.has(unidade.codigo)) {
                resultados.push({
                    codigo: unidade.codigo,
                    descricao: unidade.descricao,
                    trecho_encontrado: token
                });
                encontrados.add(unidade.codigo);
            }
        }

        // -------------------------------
        // 3️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const unidade of this.unidades) {
            if (encontrados.has(unidade.codigo)) continue;

            const palavras = removeStopwords(normalize(unidade.descricao))
                .split(/\s+/)
                .filter(p => p.length > 3);

            if (palavras.length === 0) continue;

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            const percentual = matches.length / palavras.length;

            if (percentual >= 0.6) {
                resultados.push({
                    codigo: unidade.codigo,
                    descricao: unidade.descricao,
                    trecho_encontrado: this._extrairTrechoDescricao(frase, palavras) // 👈 mudança
                });
                encontrados.add(unidade.codigo);
            }
        }

        return resultados;
    }
}

module.exports = UnidadeGestoraService;
