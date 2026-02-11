const fs = require("fs");
const caminhoCsv = "../src/data/entidades/eixo.csv";
const { resolverPercentualMinimo } = require("../../utils/sensibilidadeMatcher");

const PERCENTUAL_PADRAO = 0.5;

const REGRAS_SENSIBILIDADE = [
    { palavra: "eixo", percentual: 0.5 }
];

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
 * Remove zeros à esquerda do código
 * Permite aceitar 01 ou 1, 02 ou 2, etc.
 */
function normalizarCodigo(codigo) {
    return String(parseInt(codigo, 10));
}

/**
 * Service responsável por:
 * - carregar o CSV de eixos
 * - manter os dados em memória
 * - extrair eixos a partir de uma frase
 *
 * REGRA ESPECIAL:
 * - só permite busca por CÓDIGO se a frase contiver "eixo"
 */
class EixoService {

    constructor() {

        this.eixos = this.carregarCsv(caminhoCsv);

        // Índice por código normalizado (remove zero à esquerda)
        this.mapaPorCodigo = new Map(
            this.eixos.map(e => [
                normalizarCodigo(e.codigo),
                e
            ])
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
     * Extrai eixos de uma frase
     */
    extrair(frase) {

        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);

        const percentualMinimo = resolverPercentualMinimo(
            textoNormalizado,
            PERCENTUAL_PADRAO,
            REGRAS_SENSIBILIDADE
        );

        // 🔐 Permite busca por código somente se mencionar "eixo"
        const permiteBuscaPorCodigo = textoNormalizado.includes("eixo");

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO (CONDICIONAL)
        // -------------------------------
        if (permiteBuscaPorCodigo) {

            // aceita 1 ou 2 dígitos isolados
            const codigos = frase.match(/\b\d{1,2}\b/g) || [];

            for (const codigoBruto of codigos) {

                const codigoNormalizado = normalizarCodigo(codigoBruto);

                const eixo = this.mapaPorCodigo.get(codigoNormalizado);

                if (eixo && !encontrados.has(codigoNormalizado)) {

                    resultados.push({
                        codigo: eixo.codigo, // mantém formato original
                        descricao: eixo.descricao
                    });

                    encontrados.add(codigoNormalizado);
                }
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const eixo of this.eixos) {

            if (encontrados.has(normalizarCodigo(eixo.codigo))) continue;

            const palavras = normalize(eixo.descricao)
                .split(" ")
                .filter(p => p.length > 3);

            if (!palavras.length) continue;

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            const percentual = matches.length / palavras.length;

            if (percentual >= percentualMinimo) {

                resultados.push({
                    codigo: eixo.codigo,
                    descricao: eixo.descricao
                });

                encontrados.add(normalizarCodigo(eixo.codigo));
            }
        }

        return resultados;
    }
}

module.exports = EixoService;
