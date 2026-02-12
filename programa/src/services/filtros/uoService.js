const fs = require("fs");
const caminhoCsv = "../src/data/entidades/unidade_orcamentaria.csv";

/**
 * Normaliza texto para comparação:
 * - lowercase
 * - remove acentos
 * - trim
 */
function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

class UnidadeOrcamentariaService {

    constructor() {

        // Carrega CSV uma única vez
        this.unidades = this.carregarCsv(caminhoCsv);

        // Índice por código (O(1))
        this.mapaPorCodigo = new Map(
            this.unidades.map(u => [u.codigo, u])
        );
    }

    /**
     * Lê CSV e transforma em objetos
     */
    carregarCsv(caminho) {
        const conteudo = fs.readFileSync(caminho, "latin1");

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
                item.codigo &&
                item.descricao &&
                /^\d{5}$/.test(item.codigo)
            );
    }

    /**
     * Extrai unidades orçamentárias de uma frase:
     * 1. Código (5 dígitos)
     * 2. Descrição (fallback)
     */
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO
        // -------------------------------

        const codigos = frase.match(/\b\d{5}\b/g) || [];

        for (const codigo of codigos) {
            const unidade = this.mapaPorCodigo.get(codigo);

            if (unidade && !encontrados.has(codigo)) {
                resultados.push({
                    codigo: unidade.codigo,
                    descricao: unidade.descricao,
                    //origem: "codigo"
                });
                encontrados.add(codigo);
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const unidade of this.unidades) {
            if (encontrados.has(unidade.codigo)) continue;

            const palavras = normalize(unidade.descricao)
                .split(" ")
                .filter(p =>
                    p.length > 3 &&
                    p !== "estado" // 🔥 ignora somente essa palavra
                );

            if (!palavras.length) continue;

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            // Critério: 60% das palavras relevantes
            const percentual = matches.length / palavras.length;

            if (percentual >= 0.6) {
                resultados.push({
                    codigo: unidade.codigo,
                    descricao: unidade.descricao
                });
                encontrados.add(unidade.codigo);
            }
        }

        return resultados;
    }
}

module.exports = UnidadeOrcamentariaService;
