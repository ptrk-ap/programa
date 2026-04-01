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
            const incluir = valores.filter(v => !v.excluir);
            const excluir = valores.filter(v => v.excluir);
            
            const partesEntidade = [];
            
            if (incluir.length > 0) {
                const likes = incluir.map(() => `${quoteIdent(entidade)} LIKE ?`).join(" OR ");
                partesEntidade.push(`(${likes})`);
                params.push(...incluir.map(v => `${v.valor}%`));
            }
            
            if (excluir.length > 0) {
                const notLikes = excluir.map(() => `${quoteIdent(entidade)} NOT LIKE ?`).join(" AND ");
                partesEntidade.push(`(${notLikes})`);
                params.push(...excluir.map(v => `${v.valor}%`));
            }
            
            if (partesEntidade.length > 0) {
                partes.push(`(${partesEntidade.join(" AND ")})`);
            }
        }

        blocosHierarquicos.push(`(${partes.join(" AND ")})`);
    }

    // Filtros independentes
    for (const [entidade, valores] of Object.entries(independentes)) {
        if (entidade === "credor") {
            const incluir = valores.filter(v => !v.excluir);
            const excluir = valores.filter(v => v.excluir);
            
            if (incluir.length > 0) {
                const likes = incluir.map(() => `${quoteIdent(entidade)} COLLATE utf8mb4_general_ci LIKE ?`).join(" OR ");
                partesIndependentes.push(`(${likes})`);
                params.push(...incluir.map(v => `%${v.valor}%`));
            }
            if (excluir.length > 0) {
                const notLikes = excluir.map(() => `${quoteIdent(entidade)} COLLATE utf8mb4_general_ci NOT LIKE ?`).join(" AND ");
                partesIndependentes.push(`(${notLikes})`);
                params.push(...excluir.map(v => `%${v.valor}%`));
            }

        } else if (entidade === "ordem_bancaria") {
            const dateBlocks = [];
            const excludeBlocks = [];
            const arrOriginal = filtrosEncontrados[entidade] || [];

            for (const p of arrOriginal) {
                if (p.excluir) {
                    excludeBlocks.push(`\`ordem_bancaria\` NOT BETWEEN ? AND ?`);
                    params.push(p.data_inicio, p.data_fim);
                } else {
                    dateBlocks.push(`\`ordem_bancaria\` BETWEEN ? AND ?`);
                    params.push(p.data_inicio, p.data_fim);
                }
            }

            if (dateBlocks.length > 0) {
                partesIndependentes.push(`(${dateBlocks.join(" OR ")})`);
            }
            if (excludeBlocks.length > 0) {
                partesIndependentes.push(`(${excludeBlocks.join(" AND ")})`);
            }

        } else {
            const incluir = valores.filter(v => !v.excluir);
            const excluir = valores.filter(v => v.excluir);
            
            if (incluir.length > 0) {
                const likes = incluir.map(() => `${quoteIdent(entidade)} LIKE ?`).join(" OR ");
                partesIndependentes.push(`(${likes})`);
                params.push(...incluir.map(v => `${v.valor}%`));
            }
            if (excluir.length > 0) {
                const notLikes = excluir.map(() => `${quoteIdent(entidade)} NOT LIKE ?`).join(" AND ");
                partesIndependentes.push(`(${notLikes})`);
                params.push(...excluir.map(v => `${v.valor}%`));
            }
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
