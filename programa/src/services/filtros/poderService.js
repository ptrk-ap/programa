const fs = require("fs");
const caminhoCsv = "../src/data/entidades/poder.csv";
const { resolverPercentualMinimo } = require("../../utils/sensibilidadeMatcher");

const PERCENTUAL_PADRAO = 0.7;

const REGRAS_SENSIBILIDADE = [
    { palavra: "poder", percentual: 0.5 }
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
 * Remove zeros à esquerda
 * Permite aceitar 01 ou 1
 */
function normalizarCodigo(codigo) {
    return String(parseInt(codigo, 10));
}

/**
 * Service responsável por:
 * - carregar o CSV de poderes
 * - manter os dados em memória
 * - extrair poderes a partir de uma frase
 *
 * REGRA ESPECIAL:
 * - só permite busca por CÓDIGO se a frase contiver "poder"
 */
class PoderService {

    constructor() {

        this.poderes = this.carregarCsv(caminhoCsv);

        // Índice por código normalizado
        this.mapaPorCodigo = new Map(
            this.poderes.map(p => [
                normalizarCodigo(p.codigo),
                p
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
            .slice(1)
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
     * Extrai poderes de uma frase
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

        // 🔐 Só permite código se mencionar "poder"
        const permiteBuscaPorCodigo = textoNormalizado.includes("poder");

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO (CONDICIONAL)
        // -------------------------------
        if (permiteBuscaPorCodigo) {

            const codigos = frase.match(/\b\d{1,2}\b/g) || [];

            for (const codigoBruto of codigos) {

                const codigoNormalizado = normalizarCodigo(codigoBruto);

                const poder = this.mapaPorCodigo.get(codigoNormalizado);

                if (poder && !encontrados.has(codigoNormalizado)) {

                    resultados.push({
                        codigo: poder.codigo,
                        descricao: poder.descricao
                    });

                    encontrados.add(codigoNormalizado);
                }
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const poder of this.poderes) {

            if (encontrados.has(normalizarCodigo(poder.codigo))) continue;

            const palavras = normalize(poder.descricao)
                .split(" ")
                .filter(p => p.length > 3);

            if (!palavras.length) continue;

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            const percentual = matches.length / palavras.length;

            if (percentual >= percentualMinimo) {

                resultados.push({
                    codigo: poder.codigo,
                    descricao: poder.descricao
                });

                encontrados.add(normalizarCodigo(poder.codigo));
            }
        }

        return resultados;
    }
}

module.exports = PoderService;
