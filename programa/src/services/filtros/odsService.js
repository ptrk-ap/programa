const fs = require("fs");
const caminhoCsv = "../src/data/entidades/ods.csv";
const { resolverPercentualMinimo } = require("../../utils/sensibilidadeMatcher");

const PERCENTUAL_PADRAO = 0.7;

const REGRAS_SENSIBILIDADE = [
    { palavra: "ods", percentual: 0.5 }
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
 * Service responsável por:
 * - carregar o CSV de ODS
 * - manter os dados em memória
 * - extrair ODS a partir de uma frase
 *
 * REGRA ESPECIAL:
 * - só permite busca por CÓDIGO se a frase contiver "ods"
 */
class OdsService {

    constructor() {
        this.odsList = this.carregarCsv(caminhoCsv);

        // Índice por código
        this.mapaPorCodigo = new Map(
            this.odsList.map(o => [o.codigo, o])
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
     * Extrai ODS de uma frase
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

        // -------------------------------
        // 🔐 REGRA: permite código?
        // -------------------------------
        const permiteBuscaPorCodigo = textoNormalizado.includes("ods");

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO (CONDICIONAL)
        // -------------------------------
        if (permiteBuscaPorCodigo) {
            // aceita 1 ou 2 dígitos isolados (0 a 17)
            const codigos = frase.match(/\b\d{1,2}\b/g) || [];

            for (const codigo of codigos) {
                const ods = this.mapaPorCodigo.get(codigo);

                if (ods && !encontrados.has(codigo)) {
                    resultados.push({
                        codigo: ods.codigo,
                        descricao: ods.descricao
                    });
                    encontrados.add(codigo);
                }
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const ods of this.odsList) {
            if (encontrados.has(ods.codigo)) continue;

            const palavras = normalize(ods.descricao)
                .split(" ")
                .filter(p => p.length > 3);

            if (!palavras.length) continue;

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            const percentual = matches.length / palavras.length;

            if (percentual >= percentualMinimo) {
                resultados.push({
                    codigo: ods.codigo,
                    descricao: ods.descricao
                });
                encontrados.add(ods.codigo);
            }
        }

        return resultados;
    }
}

module.exports = OdsService;
