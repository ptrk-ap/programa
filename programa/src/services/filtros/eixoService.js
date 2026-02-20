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
 * - trim
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

class EixoService {

    constructor() {

        this.eixos = this.carregarCsv(caminhoCsv);

        // Índice por código normalizado
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
     * Extrai eixos de uma frase
     *
     * 🔒 REGRA:
     * Só executa busca se a palavra "eixo"
     * estiver explicitamente presente na frase.
     */
    extrair(frase) {

        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);

        // 🔐 Se não mencionar explicitamente "eixo", não busca nada
        if (!/\beixo\b/.test(textoNormalizado)) {
            return [];
        }

        const percentualMinimo = resolverPercentualMinimo(
            textoNormalizado,
            PERCENTUAL_PADRAO,
            REGRAS_SENSIBILIDADE
        );

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO
        // -------------------------------

        const codigos = frase.match(/\b\d{1,2}\b/g) || [];

        for (const codigoBruto of codigos) {

            const codigoNormalizado = normalizarCodigo(codigoBruto);

            const eixo = this.mapaPorCodigo.get(codigoNormalizado);

            if (eixo && !encontrados.has(codigoNormalizado)) {

                resultados.push({
                    codigo: eixo.codigo,
                    descricao: eixo.descricao,
                    trecho_encontrado: codigoBruto
                });

                encontrados.add(codigoNormalizado);
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const eixo of this.eixos) {

            const codigoNormalizado = normalizarCodigo(eixo.codigo);

            if (encontrados.has(codigoNormalizado)) continue;

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
                    descricao: eixo.descricao,
                    trecho_encontrado: frase
                });

                encontrados.add(codigoNormalizado);
            }
        }

        return resultados;
    }
}

module.exports = EixoService;
