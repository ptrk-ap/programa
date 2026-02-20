const pool = require("../../database/connection");
const fs = require("fs");
const path = require("path");

// ===== Carrega Dicionário =====
const credorDict = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../data/entidades/credor.json"), "utf-8")
);

const SOBRENOMES = new Set(credorDict.sobrenomes.map(s => s.toUpperCase()));
const CNPJ_TERMOS = new Set(credorDict.cnpj_termos.map(t => t.toUpperCase()));

// ===== Stopwords =====
const STOPWORDS = new Set([
    "unidade_gestora", "fonte", "natureza_despesa", "programa", "acao",
    "unidade_orcamentaria", "elemento_despesa", "grupo_despesa",
    "categoria_despesa", "funcao", "dotacao_inicial", "despesas_empenhadas",
    "despesas_liquidadas", "despesas_pagas", "despesas_exercicio_pagas",
    "ods", "eixo", "poder", "emenda", "contrato", "convenio_despesa",
    "convenio_receita", "a", "ante", "apos", "ate", "com", "contra", "de",
    "desde", "em", "entre", "para", "por", "perante", "sem", "sobre"
]);

function prepararTermo(text) {
    return text
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/Ç/g, "C")
        .trim();
}

class CredorService {

    async extrair(frase) {
        const fraseNormalizada = prepararTermo(frase);

        // ============================================================
        // 1️⃣ PRIORIDADE: CPF ou CNPJ (Busca exata por código)
        // ============================================================
        const numerosNaFrase = fraseNormalizada.match(/\b\d{11}\b|\b\d{14}\b/g) || [];

        if (numerosNaFrase.length > 0) {
            const placeholders = numerosNaFrase.map(() => "?").join(", ");
            const [rows] = await pool.execute(
                `SELECT codigo, descricao FROM credor 
                 WHERE codigo IN (${placeholders}) 
                 LIMIT 10`,
                numerosNaFrase
            );

            if (rows.length > 0) {
                return rows.map(r => ({
                    codigo: r.codigo,
                    descricao: r.descricao,
                    trecho_encontrado: r.codigo
                }));
            }
        }

        // ============================================================
        // 2️⃣ PREPARAÇÃO DOS TERMOS TEXTUAIS
        // ============================================================
        const palavras = fraseNormalizada.split(/\s+/);

        const termosValidos = palavras.filter(t =>
            t.length > 2 &&
            !STOPWORDS.has(t.toLowerCase())
        );

        const temPalavraCredor = termosValidos.includes("CREDOR");

        // Remove a palavra 'CREDOR' para não buscar por ela no banco
        const termosParaBusca = termosValidos.filter(t => t !== "CREDOR");

        // Verificação por dicionário
        const temSobrenome = termosParaBusca.some(t => SOBRENOMES.has(t));
        const temTermoCnpj = termosParaBusca.some(t => CNPJ_TERMOS.has(t));

        // ============================================================
        // 3️⃣ BUSCA TEXTUAL (Caso tenha a trigger 'CREDOR' ou termos conhecidos)
        // ============================================================
        if (temPalavraCredor || temSobrenome || temTermoCnpj) {

            if (termosParaBusca.length === 0) return [];

            /**
             * SOLUÇÃO PARA DELMA CARMO CAMARAO:
             * Usamos LIKE com COLLATE para ignorar acentos do banco (ex: Camarão).
             * O AND garante que TODOS os termos (Delma, Carmo, Camarao) estejam na descrição.
             */
            const condicoes = termosParaBusca
                .map(() => "(descricao COLLATE utf8mb4_general_ci) LIKE ?")
                .join(" AND ");

            const params = termosParaBusca.map(t => `%${t}%`);

            const [rows] = await pool.execute(
                `SELECT codigo, descricao FROM credor 
                 WHERE ${condicoes} 
                 LIMIT 10`,
                params
            );

            return rows.map(r => ({
                codigo: r.codigo,
                descricao: r.descricao,
                trecho_encontrado: frase
            }));
        }

        return [];
    }
}

module.exports = CredorService;