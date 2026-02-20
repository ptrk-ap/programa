const fs = require("fs");
const caminhoCsv = "../src/data/entidades/natureza_despesa.csv";
const { resolverPercentualMinimo } = require("../../utils/sensibilidadeMatcher");
const PERCENTUAL_PADRAO = 0.7;
const REGRAS_SENSIBILIDADE = [
    { palavra: "natureza_despesa", percentual: 0.5 }
];
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
 * - carregar o CSV de naturezas
 * - manter os dados em memória
 * - extrair naturezas de despesa a partir de uma frase
 */
class NaturezaService {

    constructor() {

        // Carrega o CSV uma única vez ao iniciar o serviço
        this.naturezas = this.carregarCsv(caminhoCsv);

        // Cria um índice por código para busca rápida (O(1))
        this.mapaPorCodigo = new Map(
            this.naturezas.map(n => [n.codigo, n])
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
     * Extrai naturezas de uma frase:
     * 1. Busca códigos explícitos
     * 2. Busca descrições (fallback com critério percentual)
     * 3. Permite múltiplos resultados
     */
    extrair(frase) {
        const resultados = [];
        const encontrados = new Set(); // evita duplicidade


        // -------------------------------
        // 1️⃣ BUSCA POR CÓDIGO
        // -------------------------------

        // Regex: 6 dígitos, com 3º dígito diferente de zero
        const codigos = frase.match(/\b\d{2}[1-9]\d{3}\b/g) || [];

        for (const codigo of codigos) {
            const natureza = this.mapaPorCodigo.get(codigo);

            if (natureza && !encontrados.has(codigo)) {
                resultados.push({
                    codigo: natureza.codigo,
                    descricao: natureza.descricao,
                    trecho_encontrado: codigo
                });
                encontrados.add(codigo);
            }
        }

        // -------------------------------
        // 2️⃣ BUSCA POR DESCRIÇÃO
        // -------------------------------

        const textoNormalizado = normalize(frase);
        const percentualMinimo = resolverPercentualMinimo(
            textoNormalizado,
            PERCENTUAL_PADRAO,
            REGRAS_SENSIBILIDADE
        );

        for (const natureza of this.naturezas) {
            // Se já foi encontrada pelo código, ignora
            if (encontrados.has(natureza.codigo)) continue;

            // Divide a descrição em palavras relevantes
            const palavras = normalize(natureza.descricao)
                .split(" ")
                .filter(p => p.length > 3 || p === "nao");

            if (!palavras.length) continue;

            // Conta quantas palavras aparecem na frase
            const matches = palavras.filter(p =>
                textoNormalizado.includes(p)
            );

            // ✅ MESMO CRITÉRIO PERCENTUAL (≥ 60%)
            const percentual = matches.length / palavras.length;

            if (percentual >= percentualMinimo) {
                // Para descrição, o "trecho encontrado" pode ser complexo. 
                // Retornamos a frase original enviada para este service, 
                // mas idealmente poderíamos tentar identificar o range das palavras.
                // Como FiltroService vai remover esse trecho, usamos a frase inteira se der match substancial.
                resultados.push({
                    codigo: natureza.codigo,
                    descricao: natureza.descricao,
                    trecho_encontrado: frase // Se deu match na descrição, consideramos o trecho todo
                });
                encontrados.add(natureza.codigo);
            }
        }

        return resultados;
    }
}

module.exports = NaturezaService;
