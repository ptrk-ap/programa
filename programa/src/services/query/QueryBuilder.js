const { ENTITY_COLUMNS, ORDER_PRIORITY } = require("./QueryConfig");

function quoteIdent(name) {
    return `\`${name}\``;
}

/**
 * Monta as partes do SELECT e GROUP BY com base nas entidades e valores solicitados.
 */
function buildSelectAndGroupBy(entidadesFinais, valoresSolicitados) {
    const selectParts = [];
    const groupByParts = [];

    for (const entidade of ENTITY_COLUMNS) {
        if (!entidadesFinais.has(entidade)) continue;

        if (entidade === "agrupamento_mensal") {
            selectParts.push(`MONTH(ordem_bancaria) AS mes`);
            groupByParts.push(`mes`);
        } else if (entidade !== "ordem_bancaria") {
            selectParts.push(quoteIdent(entidade));
            groupByParts.push(quoteIdent(entidade));
        }
    }

    for (const val of valoresSolicitados) {
        selectParts.push(
            `SUM(${quoteIdent(val)}) AS ${quoteIdent(`soma_${val}`)}`
        );
    }

    return { selectParts, groupByParts };
}

/**
 * Monta a cláusula WHERE a partir dos blocos hierárquicos e independentes.
 * Retorna { whereClause, params }.
 */
function buildWhere(hierarquicos, independentes, filtrosEncontrados) {
    const params = [];
    const blocosHierarquicos = [];
    const partesIndependentes = [];

    // Blocos hierárquicos: OR entre níveis, AND dentro do mesmo nível
    for (const nivel of Object.keys(hierarquicos)) {
        const entidadesNivel = hierarquicos[nivel];
        const partes = [];

        for (const [entidade, valores] of Object.entries(entidadesNivel)) {
            const placeholders = valores.map(() => "?").join(", ");
            partes.push(`${quoteIdent(entidade)} IN (${placeholders})`);
            params.push(...valores);
        }

        blocosHierarquicos.push(`(${partes.join(" AND ")})`);
    }

    // Filtros independentes
    for (const [entidade, valores] of Object.entries(independentes)) {
        if (entidade === "credor") {
            const likes = valores
                .map(() => `${quoteIdent(entidade)} COLLATE utf8mb4_general_ci LIKE ?`)
                .join(" OR ");

            partesIndependentes.push(`(${likes})`);
            params.push(...valores.map(v => `%${v}%`));

        } else if (entidade === "ordem_bancaria") {
            const dateBlocks = [];
            const arrOriginal = filtrosEncontrados[entidade];

            for (const p of arrOriginal) {
                dateBlocks.push(`\`ordem_bancaria\` BETWEEN ? AND ?`);
                params.push(p.data_inicio, p.data_fim);
            }

            if (dateBlocks.length > 0) {
                partesIndependentes.push(`(${dateBlocks.join(" OR ")})`);
            }

        } else {
            const likes = valores
                .map(() => `${quoteIdent(entidade)} LIKE ?`)
                .join(" OR ");

            partesIndependentes.push(`(${likes})`);
            params.push(...valores.map(v => `${v}%`));
        }
    }

    // Monta a cláusula WHERE final
    let whereClause = "";
    if (blocosHierarquicos.length > 0 && partesIndependentes.length > 0) {
        whereClause = `WHERE (${blocosHierarquicos.join(" OR ")}) AND ${partesIndependentes.join(" AND ")}`;
    } else if (blocosHierarquicos.length > 0) {
        whereClause = `WHERE ${blocosHierarquicos.join(" OR ")}`;
    } else if (partesIndependentes.length > 0) {
        whereClause = `WHERE ${partesIndependentes.join(" AND ")}`;
    }

    return { whereClause, params };
}

/**
 * Monta a cláusula ORDER BY com base nas entidades finais e campos do SELECT.
 */
function buildOrderBy(entidadesFinais, selectParts) {
    let orderClause = "";

    if (entidadesFinais.has("credor")) {
        const camposDisponiveis = ORDER_PRIORITY.filter(campo =>
            selectParts.some(p => p.includes(`AS \`${campo}\``))
        );

        if (camposDisponiveis.length > 0) {
            orderClause = `ORDER BY ${camposDisponiveis.map(c => `\`${c}\` DESC`).join(", ")}`;
        }
    }

    if (entidadesFinais.has("agrupamento_mensal")) {
        orderClause = orderClause
            ? `${orderClause}, \`mes\` ASC`
            : `ORDER BY \`mes\` ASC`;
    }

    return orderClause;
}

module.exports = {
    buildSelectAndGroupBy,
    buildWhere,
    buildOrderBy
};
