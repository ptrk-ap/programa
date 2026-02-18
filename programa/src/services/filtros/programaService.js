const fs = require("fs");
const caminhoCsv = "../src/data/entidades/programa.csv";
const { resolverPercentualMinimo } = require("../../utils/sensibilidadeMatcher");

const PERCENTUAL_PADRAO = 0.7;

// 🔥 Regra apenas para a palavra "programa"
const REGRAS_SENSIBILIDADE = [
    { palavra: "programa", percentual: 0.5 }
];

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

class ProgramaService {

    constructor() {
        this.programas = this.carregarCsv(caminhoCsv);

        this.mapaPorCodigo = new Map(
            this.programas.map(p => [p.codigo, p])
        );
    }

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
                /^\d{4}$/.test(item.codigo) &&
                item.descricao
            );
    }

    extrair(frase) {
        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);
        const temAcao = /\bacao\b/.test(textoNormalizado);

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO
        // -------------------------------

        const codigos = frase.match(/\b\d{4}\b/g) || [];
        let existeCodigoInvalido = false;

        for (const codigo of codigos) {
            const numero = Number(codigo);

            const elegivel =
                codigo.startsWith("0") ||
                numero < 1000 ||
                numero === 9999;

            if (!elegivel) {
                existeCodigoInvalido = true;
                continue;
            }

            if (temAcao) continue;

            const programa = this.mapaPorCodigo.get(codigo);

            if (programa && !encontrados.has(codigo)) {
                resultados.push({
                    codigo: programa.codigo,
                    descricao: programa.descricao
                });
                encontrados.add(codigo);
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        if (temAcao || existeCodigoInvalido) {
            return resultados;
        }

        // 🔥 Aplicação da sensibilidade dinâmica
        const percentualMinimo = resolverPercentualMinimo(
            textoNormalizado,
            PERCENTUAL_PADRAO,
            REGRAS_SENSIBILIDADE
        );

        for (const programa of this.programas) {
            if (encontrados.has(programa.codigo)) continue;

            const palavras = normalize(programa.descricao)
                .split(" ")
                .filter(p => p.length > 3);

            if (palavras.length === 0) continue;

            const matches = palavras.filter(p =>
                new RegExp(`\\b${p}\\b`).test(textoNormalizado)
            );

            const percentual = matches.length / palavras.length;

            if (percentual >= percentualMinimo) {
                resultados.push({
                    codigo: programa.codigo,
                    descricao: programa.descricao
                });
                encontrados.add(programa.codigo);
            }
        }

        return resultados;
    }
}

module.exports = ProgramaService;
