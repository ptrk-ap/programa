const fs = require("fs");
const path = require("path");
const caminhoCsv = path.join(__dirname, "..", "..", "data", "entidades", "emenda.csv");
const { resolverPercentualMinimo } = require("../../utils/sensibilidadeMatcher");

const PERCENTUAL_PADRAO = 0.7;

const REGRAS_SENSIBILIDADE = [
    { palavra: "emenda", percentual: 0.5 }
];

/**
 * Normaliza texto:
 * - lowercase
 * - remove acentos
 * - remove pontuação
 */
function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-z0-9\s]/gi, "")   // remove pontuação
        .trim();
}

class EmendaService {

    constructor() {
        // Carrega CSV uma única vez
        this.emendas = this.carregarCsv(caminhoCsv);

        // Índice por código normalizado — O(1)
        this.mapaPorCodigo = new Map(
            this.emendas.map(e => [normalize(e.codigo), e])
        );

        // Índice invertido por token de descrição — evita loop O(N) na busca
        // token → [emenda, ...]
        this.indiceDescricao = new Map();

        // Tokens pré-computados por emenda — usados para calcular o threshold
        // Filtro: p.length > 2 (critério original da emenda)
        this.tokensPorEmenda = new Map();

        for (const emenda of this.emendas) {
            const tokens = normalize(emenda.descricao)
                .split(/\s+/)
                .filter(p => p.length > 2);

            this.tokensPorEmenda.set(emenda.codigo, tokens);

            for (const token of tokens) {
                if (!this.indiceDescricao.has(token)) {
                    this.indiceDescricao.set(token, []);
                }
                this.indiceDescricao.get(token).push(emenda);
            }
        }
    }

    carregarCsv(caminho) {
        const conteudo = fs.readFileSync(caminho, "utf8");

        return conteudo
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(1)
            .map(linha => {
                const primeiraVirgula = linha.indexOf(",");
                const codigo = linha.substring(0, primeiraVirgula);
                const descricao = linha.substring(primeiraVirgula + 1);

                return {
                    codigo: (codigo || "").trim(),
                    descricao: (descricao || "").replace(/^"|"$/g, "").trim()
                };
            })
            .filter(item =>
                item.codigo &&
                item.descricao &&
                item.codigo !== "-" &&
                item.descricao !== "-"
            );
    }

    /**
     * Encontra o menor trecho contíguo da frase original que abrange
     * as palavras-chave encontradas.
     *
     * Complexidade: O(N) — uma única passagem pelos tokens da frase.
     */
    _extrairTrechoDescricao(fraseOriginal, palavrasMatch) {
        if (palavrasMatch.length === 0) return fraseOriginal;

        const setMatch = new Set(palavrasMatch);
        const tokensOriginais = fraseOriginal.split(/\s+/);

        let inicio = -1;
        let fim = -1;

        for (let i = 0; i < tokensOriginais.length; i++) {
            const tokenNorm = normalize(tokensOriginais[i]);

            if (setMatch.has(tokenNorm)) {
                if (inicio === -1) inicio = i;
                fim = i;
            }
        }

        if (inicio === -1) return fraseOriginal;

        return tokensOriginais.slice(inicio, fim + 1).join(" ");
    }

    /**
     * Extrai emendas de uma frase:
     * 1. Por código (CONDICIONAL) — O(tokens da frase)
     * 2. Por descrição             — O(tokens × hits) via índice invertido
     */
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);

        const percentualDescricao = resolverPercentualMinimo(
            textoNormalizado,
            PERCENTUAL_PADRAO,
            REGRAS_SENSIBILIDADE
        );

        // ─────────────────────────────────────────
        // 1️⃣  BUSCA POR CÓDIGO (CONDICIONAL)
        // ─────────────────────────────────────────
        // 🔐 Só permite busca por código se "emenda" estiver explícito
        const permiteCodigo = textoNormalizado.includes("emenda");

        if (permiteCodigo) {
            const tokensFraseArr = textoNormalizado.split(/\s+/);

            for (const token of tokensFraseArr) {
                const emenda = this.mapaPorCodigo.get(token);

                if (emenda && !encontrados.has(emenda.codigo)) {
                    resultados.push({
                        codigo: emenda.codigo,
                        descricao: emenda.descricao,
                        trecho_encontrado: emenda.codigo
                    });
                    encontrados.add(emenda.codigo);
                }
            }
        }

        // ─────────────────────────────────────────
        // 2️⃣  BUSCA POR DESCRIÇÃO via índice invertido
        // ─────────────────────────────────────────

        // Conjunto de tokens relevantes da frase (len > 2)
        const tokensFrase = new Set(
            textoNormalizado.split(/\s+/).filter(p => p.length > 2)
        );

        // Conta quantos tokens de cada emenda aparecem na frase
        const contagem = new Map(); // codigo → número de hits

        for (const token of tokensFrase) {
            const candidatos = this.indiceDescricao.get(token);
            if (!candidatos) continue;

            for (const emenda of candidatos) {
                if (encontrados.has(emenda.codigo)) continue;
                contagem.set(emenda.codigo, (contagem.get(emenda.codigo) || 0) + 1);
            }
        }

        // Aplica threshold percentual
        for (const [codigo, hits] of contagem) {
            const palavrasTotais = this.tokensPorEmenda.get(codigo);
            const percentual = hits / palavrasTotais.length;

            if (percentual >= percentualDescricao) {
                const emenda = this.emendas.find(e => e.codigo === codigo);
                const matchedTokens = palavrasTotais.filter(p => tokensFrase.has(p));

                resultados.push({
                    codigo: emenda.codigo,
                    descricao: emenda.descricao,
                    trecho_encontrado: this._extrairTrechoDescricao(frase, matchedTokens)
                });
                encontrados.add(codigo);
            }
        }

        return resultados;
    }
}

module.exports = EmendaService;
