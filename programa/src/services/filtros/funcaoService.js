const fs = require("fs");
const caminhoCsv = "../src/data/entidades/funcao.csv";
const { resolverPercentualMinimo } = require("../../utils/sensibilidadeMatcher");

const PERCENTUAL_PADRAO = 0.7;

const REGRAS_SENSIBILIDADE = [
    { palavra: "funcao", percentual: 0.5 }
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
     * Extrai funções de uma frase
     * 🔒 Só executa se a palavra "funcao" estiver presente
     */
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set();

        const textoNormalizado = normalize(frase);

        // 🔐 REGRA GLOBAL: só permite qualquer busca se tiver "funcao"
        if (!textoNormalizado.includes("funcao")) {
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

            if (percentual >= percentualMinimo) {
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
