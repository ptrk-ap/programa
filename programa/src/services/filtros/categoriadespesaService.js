const fs = require("fs");
const caminhoCsv = "../src/data/entidades/categoria_despesa.csv";

/**
 * Normaliza texto para comparação:
 * - lowercase
 * - remove acentos
 */
function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Service responsável por:
 * - carregar o CSV de categorias de despesa
 * - manter os dados em memória
 * - extrair categorias de despesa a partir de uma frase
 *
 * REGRA ESPECIAL:
 * - só permite busca por CÓDIGO se a frase contiver "categoria_despesa"
 */
class CategoriaDespesaService {

    constructor() {
        this.categorias = this.carregarCsv(caminhoCsv);

        // Índice por código (O(1))
        this.mapaPorCodigo = new Map(
            this.categorias.map(c => [c.codigo, c])
        );
    }

    /**
     * Lê o CSV e transforma em objetos
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
            .filter(item =>
                item.codigo &&
                item.descricao &&
                item.codigo !== "-" &&
                item.descricao !== "-"
            );
    }

    /**
     * Extrai categorias de despesa de uma frase:
     * 1. Busca por código (CONDICIONAL)
     * 2. Busca por descrição (fallback)
     */
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);

        // -------------------------------
        // 🔐 REGRA: permite busca por código?
        // -------------------------------
        const permiteBuscaPorCodigo =
            textoNormalizado.includes("categoria_despesa");

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO (CONDICIONAL)
        // -------------------------------
        if (permiteBuscaPorCodigo) {
            // Aceita SOMENTE um dígito isolado
            const codigos = frase.match(/\b\d\b/g) || [];

            for (const codigo of codigos) {
                const categoria = this.mapaPorCodigo.get(codigo);

                if (categoria && !encontrados.has(codigo)) {
                    resultados.push({
                        codigo: categoria.codigo,
                        descricao: categoria.descricao
                    });
                    encontrados.add(codigo);
                }
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const categoria of this.categorias) {
            if (encontrados.has(categoria.codigo)) continue;

            const palavras = normalize(categoria.descricao)
                .split(" ")
                .filter(p => p.length > 3);

            if (!palavras.length) continue;

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            const percentual = matches.length / palavras.length;

            if (percentual >= 0.7) {
                resultados.push({
                    codigo: categoria.codigo,
                    descricao: categoria.descricao
                });
                encontrados.add(categoria.codigo);
            }
        }

        return resultados;
    }
}

module.exports = CategoriaDespesaService;
