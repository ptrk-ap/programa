const fs = require("fs");
const path = require("path");
const caminhoCsv = path.join(__dirname, "..", "..", "data", "entidades", "grupo_despesa.csv");

/**
 * Normaliza texto para comparação:
 * - lowercase
 * - remove acentos
 * - facilita match com input do usuário
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
 * - carregar o CSV de grupos de despesa
 * - manter os dados em memória
 * - extrair grupos de despesa a partir de uma frase
 *
 * REGRA ESPECIAL:
 * - só permite busca por CÓDIGO se a frase contiver "grupo_despesa"
 */
class GrupoDespesaService {

    constructor() {

        // Carrega o CSV uma única vez ao iniciar o serviço
        this.grupos = this.carregarCsv(caminhoCsv);

        // Índice por código para busca rápida (O(1))
        this.mapaPorCodigo = new Map(
            this.grupos.map(g => [g.codigo, g])
        );
    }

    /**
     * Lê o arquivo CSV e transforma em matriz de objetos
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
            // 🔥 FILTRO CRÍTICO
            .filter(item =>
                item.codigo &&
                item.descricao &&
                item.codigo !== "-" &&
                item.descricao !== "-"
            );
    }

    /**
     * Extrai grupos de despesa de uma frase:
     * 1. Busca por código (CONDICIONAL)
     * 2. Busca por descrição (fallback com critério percentual)
     * 3. Permite múltiplos resultados
     */
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set(); // evita duplicidade

        const textoNormalizado = normalize(frase);

        // -------------------------------
        // 🔐 REGRA: permite busca por código?
        // -------------------------------
        const permiteBuscaPorCodigo = textoNormalizado.includes("grupo_despesa");

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO (CONDICIONAL)
        // -------------------------------
        if (permiteBuscaPorCodigo) {
            // Aceita SOMENTE um dígito isolado (ex: "1", "3", "9")
            const codigos = frase.match(/\b\d\b/g) || [];

            for (const codigo of codigos) {
                const grupo = this.mapaPorCodigo.get(codigo);

                if (grupo && !encontrados.has(codigo)) {
                    resultados.push({
                        codigo: grupo.codigo,
                        descricao: grupo.descricao,
                        trecho_encontrado: codigo
                    });
                    encontrados.add(codigo);
                }
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const grupo of this.grupos) {
            if (encontrados.has(grupo.codigo)) continue;

            const palavras = normalize(grupo.descricao)
                .split(" ")
                .filter(p => p.length > 3);

            if (!palavras.length) continue;

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            // Critério percentual (≥ 60%)
            const percentual = matches.length / palavras.length;

            if (percentual >= 0.6) {
                resultados.push({
                    codigo: grupo.codigo,
                    descricao: grupo.descricao,
                    trecho_encontrado: frase
                });
                encontrados.add(grupo.codigo);
            }
        }

        return resultados;
    }
}

module.exports = GrupoDespesaService;
