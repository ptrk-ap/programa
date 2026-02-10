const fs = require("fs");
const caminhoCsv = "../src/data/entidades/programa.csv";

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

        // Carrega CSV uma única vez
        this.programas = this.carregarCsv(caminhoCsv);

        // Índice por código (O(1))
        this.mapaPorCodigo = new Map(
            this.programas.map(p => [p.codigo, p])
        );
    }

    /**
     * Lê CSV e transforma em objetos
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
                /^\d{4}$/.test(item.codigo) &&
                item.descricao
            );
    }

    /**
     * Extrai programas de uma frase
     */
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

            // Código elegível de programa
            const elegivel =
                codigo.startsWith("0") ||
                numero < 1000 ||
                numero === 9999;

            if (!elegivel) {
                existeCodigoInvalido = true;
                continue;
            }

            // Se o contexto fala explicitamente de ação, ignora programa
            if (temAcao) continue;

            const programa = this.mapaPorCodigo.get(codigo);

            if (programa && !encontrados.has(codigo)) {
                resultados.push({
                    codigo: programa.codigo,
                    descricao: programa.descricao,
                    //origem: "codigo"
                });
                encontrados.add(codigo);
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        // Se houver ação explícita ou código inválido, não tenta descrição
        if (temAcao || existeCodigoInvalido) {
            return resultados;
        }

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

            if (percentual >= 0.7) {
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
