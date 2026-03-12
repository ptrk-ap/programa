const { ENTITY_COLUMNS, HIERARCHY_LEVEL } = require("./QueryConfig");

/**
 * Formata os valores vindos da busca.
 * Para 'credor', extrai apenas o código para busca por LIKE.
 * Para demais entidades, mantém o padrão "codigo - descricao".
 */
function toEntityValues(arr = [], entidade = "") {
    return arr
        .map(i => {
            const codigo = String(i.codigo).trim();
            const descricao = String(i.descricao || "").trim();

            if (entidade === "credor") {
                return codigo;
            }

            return descricao ? `${codigo} - ${descricao}` : codigo;
        })
        .filter(Boolean);
}

/**
 * Recebe filtrosEncontrados brutos e retorna apenas os filtros válidos
 * com seus valores já formatados.
 */
function processFiltros(filtrosEncontrados = {}) {
    const filtrosValidos = {};

    for (const [entidade, arr] of Object.entries(filtrosEncontrados)) {
        if (
            ENTITY_COLUMNS.includes(entidade) &&
            Array.isArray(arr) &&
            arr.length > 0
        ) {
            const values = toEntityValues(arr, entidade);
            if (values.length > 0) {
                filtrosValidos[entidade] = values;
            }
        }
    }

    return filtrosValidos;
}

/**
 * Separa os filtros válidos em dois grupos:
 * - hierarquicos: poder, unidade_gestora, unidade_orcamentaria (usam OR entre níveis)
 * - independentes: demais entidades (usam AND entre si)
 */
function separateFiltros(filtrosValidos = {}) {
    const hierarquicos = {};
    const independentes = {};

    for (const [entidade, valores] of Object.entries(filtrosValidos)) {
        const nivel = HIERARCHY_LEVEL[entidade];
        if (nivel) {
            if (!hierarquicos[nivel]) hierarquicos[nivel] = {};
            hierarquicos[nivel][entidade] = valores;
        } else {
            independentes[entidade] = valores;
        }
    }

    return { hierarquicos, independentes };
}

module.exports = {
    toEntityValues,
    processFiltros,
    separateFiltros
};
