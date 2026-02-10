const fs = require("fs");
const caminhoCsv = "../src/data/entidades/funcao.csv";

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
 * - carregar o CSV de funções
 * - manter os dados em memória
 * - extrair funções a partir de uma frase
 *
 * REGRA ESPECIAL:
 * - só permite busca por CÓDIGO se a frase contiver a palavra "funcao"
 */
class FuncaoService {

    constructor() {
        this.funcoes = this.carregarCsv(caminhoCsv);

        // Índice por código
        this.mapaPorCodigo = new Map(
            this.funcoes.map(f => [f.codigo, f])
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
     * Extrai funções de uma frase
     */
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);

        // -------------------------------
        // 🔐 REGRA: permite código?
        // -------------------------------
        const permiteBuscaPorCodigo = textoNormalizado.includes("funcao");

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO (CONDICIONAL)
        // -------------------------------
        if (permiteBuscaPorCodigo) {
            // aceita 1 ou 2 dígitos isolados
            const codigos = frase.match(/\b\d{1,2}\b/g) || [];

            for (const codigo of codigos) {
                const funcao = this.mapaPorCodigo.get(codigo);

                if (funcao && !encontrados.has(codigo)) {
                    resultados.push({
                        codigo: funcao.codigo,
                        descricao: funcao.descricao
                    });
                    encontrados.add(codigo);
                }
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const funcao of this.funcoes) {
            if (encontrados.has(funcao.codigo)) continue;

            const palavras = normalize(funcao.descricao)
                .split(" ")
                .filter(p => p.length > 3);

            if (!palavras.length) continue;

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            const percentual = matches.length / palavras.length;

            if (percentual >= 0.7) {
                resultados.push({
                    codigo: funcao.codigo,
                    descricao: funcao.descricao
                });
                encontrados.add(funcao.codigo);
            }
        }

        return resultados;
    }
}

module.exports = FuncaoService;
