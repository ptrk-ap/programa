const fs = require("fs");
const path = require("path");
const caminhoCsv = path.join(__dirname, "..", "..", "data", "entidades", "fonte.csv");

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

class FonteService {

    constructor() {

        // Carrega CSV uma única vez
        this.fontes = this.carregarCsv(caminhoCsv);

        // Índice por código (O(1))
        this.mapaPorCodigo = new Map(
            this.fontes.map(f => [f.codigo, f])
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
                const [codigo, descricao] = linha.split(",");

                return {
                    codigo: (codigo || "").trim(),
                    descricao: (descricao || "").trim()
                };
            })
            // 🔥 FILTRO CRÍTICO
            .filter(item =>
                /^\d{3}$/.test(item.codigo) &&
                item.descricao
            );
    }

    /**
     * Extrai fontes de uma frase:
     * 1. Código
     * 2. Descrição (fallback)
     */
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO
        // -------------------------------

        const codigos = frase.match(/\b\d{3}\b/g) || [];

        for (const codigo of codigos) {
            const fonte = this.mapaPorCodigo.get(codigo);

            if (fonte && !encontrados.has(codigo)) {
                resultados.push({
                    codigo: fonte.codigo,
                    descricao: fonte.descricao,
                    trecho_encontrado: codigo
                });
                encontrados.add(codigo);
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const fonte of this.fontes) {
            if (encontrados.has(fonte.codigo)) continue;

            const palavras = normalize(fonte.descricao)
                .split(" ")
                .filter(p => p.length > 3 || p === "nao");

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            // Critério: 50% das palavras relevantes
            const percentual = matches.length / palavras.length;

            if (percentual >= 0.7) {
                resultados.push({
                    codigo: fonte.codigo,
                    descricao: fonte.descricao,
                    trecho_encontrado: frase
                });
                encontrados.add(fonte.codigo);
            }
        }

        return resultados;
    }
}

module.exports = FonteService;
