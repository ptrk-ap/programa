const { ENTITY_COLUMNS, VALUE_COLUMNS } = require("./QueryConfig");
const { validateFields, validateValueFields, validateEntities } = require("./QueryValidator");
const { processFiltros, separateFiltros } = require("./FilterProcessor");
const { buildSelectAndGroupBy, buildWhere, buildOrderBy } = require("./QueryBuilder");
const knex = require("../../database/connection");

class QueryService {
    buildQuery(camposSolicitados = [], filtrosEncontrados = {}, anos = [2026]) {
        if (!Array.isArray(anos)) anos = [anos];

        // 1. Validação dos campos solicitados
        validateFields(camposSolicitados);

        const entidadesSolicitadas = camposSolicitados.filter(c => ENTITY_COLUMNS.includes(c));
        const valoresSolicitados   = camposSolicitados.filter(c => VALUE_COLUMNS.includes(c));

        validateValueFields(valoresSolicitados);

        // 2. Processamento dos filtros
        const filtrosValidos = processFiltros(filtrosEncontrados);

        // 2.1 Identifica entidades que possuem ao menos um filtro inclusivo (não-exclusão)
        // para que não agrupemos acidentalmente por uma entidade que apenas foi excluída
        const entidadesFiltradasInclusivas = Object.keys(filtrosValidos).filter(entidade => {
            const valores = filtrosValidos[entidade];
            // valores é um array de { valor, excluir }
            return valores.some(v => v.excluir === false || v.excluir === undefined);
        });

        // 3. Entidades finais (solicitadas + filtradas inclusivas)
        const entidadesFinais = new Set([
            ...entidadesSolicitadas,
            ...entidadesFiltradasInclusivas
        ]);

        validateEntities(entidadesFinais);

        // 4. Separação hierárquicos x independentes
        const { hierarquicos, independentes } = separateFiltros(filtrosValidos);

        // 5. Montagem das cláusulas SQL
        const { selectParts, groupByParts } = buildSelectAndGroupBy(entidadesFinais, valoresSolicitados);
        const { whereClause, params: baseParams } = buildWhere(hierarquicos, independentes, filtrosEncontrados);
        const orderClause = buildOrderBy(entidadesFinais, selectParts);

        // 5.1 Prepara listagem bruta para as subqueries do formato UNION
        const rawColumns = new Set();
        for (const entidade of entidadesFinais) {
            if (entidade === "agrupamento_mensal") {
                rawColumns.add("ordem_bancaria");
            } else {
                rawColumns.add(entidade);
            }
        }
        for (const val of valoresSolicitados) {
            rawColumns.add(val);
        }
        
        // Se a query for apenas COUNT ou similar e não tiver columns, garantimos um literal
        const rawSelectList = rawColumns.size > 0 
            ? Array.from(rawColumns).map(c => `\`${c}\``).join(", ")
            : "1 AS dummy";

        // 5.2 Monta o UNION iterando os anos
        const unionQueries = [];
        const finalParams = [];

        for (const anoLoop of anos) {
            const tempTable = `\`execucao${anoLoop}\``;
            unionQueries.push(`SELECT ${rawSelectList} FROM ${tempTable} ${whereClause}`);
            finalParams.push(...baseParams);
        }

        const joinedUnions = unionQueries.join("\n                UNION ALL\n                ");

        // 6. SQL final: Aplica agregação GROUP e ORDER sobre a tabela unida resultante.
        const sql = `
            SELECT ${selectParts.join(", ")}
            FROM (
                ${joinedUnions}
            ) AS base
            ${groupByParts.length > 0 ? `GROUP BY ${groupByParts.join(", ")}` : ""}
            ${orderClause}
            LIMIT 100
        `.trim().replace(/\s+/g, ' ');

        return { sql, params: finalParams };
    }

    /**
     * Executa a query SQL montada pelo buildQuery no banco de dados.
     *
     * @param {string}  sql    - Query SQL com placeholders.
     * @param {Array}   params - Parâmetros para substituição.
     * @returns {Promise<Array>} - Array de linhas retornadas.
     */
    async executar(sql, params) {
        const [rows] = await knex.raw(sql, params);
        return rows;
    }
}

module.exports = QueryService;
