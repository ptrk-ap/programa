const { ENTITY_COLUMNS, VALUE_COLUMNS } = require("./QueryConfig");
const { validateFields, validateValueFields, validateEntities } = require("./QueryValidator");
const { processFiltros, separateFiltros } = require("./FilterProcessor");
const { buildSelectAndGroupBy, buildWhere, buildOrderBy } = require("./QueryBuilder");

class QueryService {
    buildQuery(camposSolicitados = [], filtrosEncontrados = {}, ano = 2026) {
        const tableName = `\`execucao${ano}\``;

        // 1. Validação dos campos solicitados
        validateFields(camposSolicitados);

        const entidadesSolicitadas = camposSolicitados.filter(c => ENTITY_COLUMNS.includes(c));
        const valoresSolicitados   = camposSolicitados.filter(c => VALUE_COLUMNS.includes(c));

        validateValueFields(valoresSolicitados);

        // 2. Processamento dos filtros
        const filtrosValidos = processFiltros(filtrosEncontrados);

        // 3. Entidades finais (solicitadas + filtradas)
        const entidadesFinais = new Set([
            ...entidadesSolicitadas,
            ...Object.keys(filtrosValidos)
        ]);

        validateEntities(entidadesFinais);

        // 4. Separação hierárquicos x independentes
        const { hierarquicos, independentes } = separateFiltros(filtrosValidos);

        // 5. Montagem das cláusulas SQL
        const { selectParts, groupByParts } = buildSelectAndGroupBy(entidadesFinais, valoresSolicitados);
        const { whereClause, params }        = buildWhere(hierarquicos, independentes, filtrosEncontrados);
        const orderClause                    = buildOrderBy(entidadesFinais, selectParts);

        // 6. SQL final
        const sql = `
            SELECT ${selectParts.join(", ")}
            FROM ${tableName}
            ${whereClause}
            GROUP BY ${groupByParts.join(", ")}
            ${orderClause}
            LIMIT 100
        `.trim().replace(/\s+/g, ' ');

        return { sql, params };
    }
}

module.exports = QueryService;
