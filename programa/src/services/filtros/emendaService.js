const fs = require("fs");
const caminhoCsv = "../src/data/entidades/emenda.csv";
const { resolverPercentualMinimo } = require("../../utils/sensibilidadeMatcher");

const PERCENTUAL_PADRAO = 0.7;

const REGRAS_SENSIBILIDADE = [
    { palavra: "emenda", percentual: 0.5 }
];

/**
 * Normaliza texto:
 * - lowercase
 * - remove acentos
 * - remove pontuação
 */
function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-z0-9\s]/gi, "")   // remove pontuação
        .trim();
}

class EmendaService {

    constructor() {
        this.emendas = this.carregarCsv(caminhoCsv);
    }

    carregarCsv(caminho) {

        const conteudo = fs.readFileSync(caminho, "utf8");

        return conteudo
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(1)
            .map(linha => {

                const primeiraVirgula = linha.indexOf(",");
                const codigo = linha.substring(0, primeiraVirgula);
                const descricao = linha.substring(primeiraVirgula + 1);

                return {
                    codigo: (codigo || "").trim(),
                    descricao: (descricao || "").replace(/^"|"$/g, "").trim()
                };
            })
            .filter(item =>
                item.codigo &&
                item.descricao &&
                item.codigo !== "-" &&
                item.descricao !== "-"
            );
    }

    extrair(frase) {

        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);

        const percentualDescricao = resolverPercentualMinimo(
            textoNormalizado,
            PERCENTUAL_PADRAO,
            REGRAS_SENSIBILIDADE
        );

        // 🔐 Só permite busca por código se "emenda" estiver explícito
        const permiteCodigo = textoNormalizado.includes("emenda");

        for (const emenda of this.emendas) {

            if (encontrados.has(emenda.codigo)) continue;

            // ===============================
            // 1️⃣ MATCH EXATO DE CÓDIGO
            // ===============================
            if (permiteCodigo) {

                const codigoNormalizado = normalize(emenda.codigo);

                // quebra a frase em tokens
                const tokensFrase = textoNormalizado.split(/\s+/);

                const codigoEncontrado = tokensFrase.some(token =>
                    token === codigoNormalizado
                );

                if (codigoEncontrado) {
                    resultados.push({
                        codigo: emenda.codigo,
                        descricao: emenda.descricao,
                        trecho_encontrado: emenda.codigo // ou o token exato
                    });

                    encontrados.add(emenda.codigo);
                    continue;
                }
            }

            // ===============================
            // 2️⃣ MATCH POR DESCRIÇÃO
            // ===============================

            const palavras = normalize(emenda.descricao)
                .split(" ")
                .filter(p => p.length > 2);

            if (!palavras.length) continue;

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            const percentualCalculado =
                matches.length / palavras.length;

            if (percentualCalculado >= percentualDescricao) {

                resultados.push({
                    codigo: emenda.codigo,
                    descricao: emenda.descricao,
                    trecho_encontrado: frase
                });

                encontrados.add(emenda.codigo);
            }
        }

        return resultados;
    }
}

module.exports = EmendaService;
