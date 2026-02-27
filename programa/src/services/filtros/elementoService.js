const fs = require("fs");
const path = require("path");
const caminhoCsv = path.join(__dirname, "..", "..", "data", "entidades", "elemento.csv");

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
 * - carregar o CSV de elementos de despesa
 * - manter os dados em memória
 * - extrair elementos de despesa a partir de uma frase
 *
 * REGRA ESPECIAL:
 * - só permite busca por CÓDIGO se a frase contiver "elemento_despesa"
 */
class ElementoService {

    constructor() {

        // Carrega o CSV uma única vez ao iniciar o serviço
        this.elementos = this.carregarCsv(caminhoCsv);

        // Cria um índice por código para busca rápida (O(1))
        this.mapaPorCodigo = new Map(
            this.elementos.map(e => [e.codigo, e])
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
     * Extrai elementos de despesa de uma frase:
     * 1. Busca por código (CONDICIONAL)
     * 2. Busca por descrição (fallback)
     * 3. Permite múltiplos resultados
     */
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set(); // evita duplicidade

        const textoNormalizado = normalize(frase);

        // -------------------------------
        // 🔐 REGRA: permite busca por código?
        // -------------------------------
        const permiteBuscaPorCodigo =
            textoNormalizado.includes("elemento");

        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO (CONDICIONAL)
        // -------------------------------
        if (permiteBuscaPorCodigo) {
            // Aceita SOMENTE dois dígitos isolados (ex: "05")
            const codigos = frase.match(/\b\d{2}\b/g) || [];

            for (const codigo of codigos) {
                const elemento = this.mapaPorCodigo.get(codigo);

                if (elemento && !encontrados.has(codigo)) {
                    resultados.push({
                        codigo: elemento.codigo,
                        descricao: elemento.descricao,
                        trecho_encontrado: codigo
                    });
                    encontrados.add(codigo);
                }
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        for (const elemento of this.elementos) {
            // Se já foi encontrado pelo código, ignora
            if (encontrados.has(elemento.codigo)) continue;

            const palavras = normalize(elemento.descricao)
                .split(" ")
                .filter(p => p.length > 3);

            if (!palavras.length) continue;

            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            const percentual = matches.length / palavras.length;

            if (percentual >= 0.7) {
                resultados.push({
                    codigo: elemento.codigo,
                    descricao: elemento.descricao,
                    trecho_encontrado: frase
                });
                encontrados.add(elemento.codigo);
            }
        }

        return resultados;
    }
}

module.exports = ElementoService;
