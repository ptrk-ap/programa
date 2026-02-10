const fs = require("fs");
const caminhoCsv = "../src/data/entidades/acao.csv";

/**
 * Normaliza texto para comparação
 */
function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Escapa caracteres especiais para uso seguro em RegExp
 */
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class AcaoService {

    constructor() {
        // Carrega CSV uma única vez
        this.acoes = this.carregarCsv(caminhoCsv);

        // Índice por código (O(1))
        this.mapaPorCodigo = new Map(
            this.acoes.map(a => [a.codigo, a])
        );
    }

    /**
     * Lê CSV e transforma em objetos
     * (UTF-8 correto desde a origem)
     */
    carregarCsv(caminho) {
        const conteudo = fs.readFileSync(caminho, "utf8");

        return conteudo
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(1) // remove cabeçalho
            .map(linha => {
                const partes = linha.split(",");
                const codigo = partes[0];
                const descricao = partes.slice(1).join(",");

                return {
                    codigo: (codigo || "").trim(),
                    descricao: (descricao || "").trim()
                };
            })
            .filter(item =>
                /^\d{4}$/.test(item.codigo) &&
                item.descricao
            );
    }

    /**
     * Extrai ações de uma frase
     */
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);
        const temPrograma = /\bprograma\b/.test(textoNormalizado);

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO
        // -------------------------------

        const codigos = frase.match(/\b\d{4}\b/g) || [];

        for (const codigo of codigos) {
            if (temPrograma) continue;

            const acao = this.mapaPorCodigo.get(codigo);

            if (acao && !encontrados.has(codigo)) {
                resultados.push({
                    codigo: acao.codigo,
                    descricao: acao.descricao
                });
                encontrados.add(codigo);
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        if (temPrograma) {
            return resultados;
        }

        for (const acao of this.acoes) {
            if (encontrados.has(acao.codigo)) continue;

            const palavras = normalize(acao.descricao)
                .split(" ")
                .filter(p => p.length > 3);

            if (palavras.length === 0) continue;

            const matches = palavras.filter(p =>
                new RegExp(`\\b${escapeRegex(p)}\\b`).test(textoNormalizado)
            );

            // 🔥 Critério: 50% das palavras
            const percentual = matches.length / palavras.length;

            if (percentual >= 0.7) {
                resultados.push({
                    codigo: acao.codigo,
                    descricao: acao.descricao
                });
                encontrados.add(acao.codigo);
            }
        }

        return resultados;
    }
}

module.exports = AcaoService;
