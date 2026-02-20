class QueryService {
    constructor() {
        this.table = "execucao";

        // Hierarquia oficial (campos que usam lógica de OR/AND hierárquico)
        this.HIERARCHY_LEVEL = {
            poder: 1,
            unidade_gestora: 2,
            unidade_orcamentaria: 3
        };

        this.ENTITY_COLUMNS = [
            "poder",
            "unidade_gestora",
            "unidade_orcamentaria",
            "eixo",
            "programa",
            "acao",
            "ods",
            "emenda",
            "funcao",
            "categoria_despesa",
            "grupo_despesa",
            "elemento_despesa",
            "natureza_despesa",
            "fonte",
            "convenio_receita",
            "convenio_despesa",
            "contrato",
            "credor"
        ];

        this.VALUE_COLUMNS = [
            "dotacao_inicial",
            "despesas_empenhadas",
            "despesas_liquidadas",
            "despesas_exercicio_pagas",
            "despesas_pagas"
        ];

        this.ALL_ALLOWED = new Set([
            ...this.ENTITY_COLUMNS,
            ...this.VALUE_COLUMNS
        ]);
    }

    _quoteIdent(name) {
        return `\`${name}\``;
    }

    /**
     * Formata os valores vindos da busca.
     * Se for 'credor', extrai apenas o código para busca por LIKE.
     */
    _toEntityValues(arr = [], entidade = "") {
        return arr
            .map(i => {
                const codigo = String(i.codigo).trim();
                const descricao = String(i.descricao || "").trim();

                // Regra solicitada: Para credor, buscar apenas pelo código
                if (entidade === "credor") {
                    return codigo;
                }

                // Para as demais entidades, mantém o padrão "codigo - descricao"
                return descricao ? `${codigo} - ${descricao}` : codigo;
            })
            .filter(Boolean);
    }

    _validateFields(fields = []) {
        const invalid = fields.filter(f => !this.ALL_ALLOWED.has(f));
        if (invalid.length) {
            throw new Error(`Campos inválidos: ${invalid.join(", ")}`);
        }
    }

    buildQuery(camposSolicitados = [], filtrosEncontrados = {}) {
        this._validateFields(camposSolicitados);

        const entidadesSolicitadas = camposSolicitados.filter(c =>
            this.ENTITY_COLUMNS.includes(c)
        );

        const valoresSolicitados = camposSolicitados.filter(c =>
            this.VALUE_COLUMNS.includes(c)
        );

        if (valoresSolicitados.length === 0) {
            throw new Error("É obrigatório informar ao menos um campo de valor.");
        }

        // -------------------------------
        // PROCESSA FILTROS
        // -------------------------------
        const filtrosValidos = {};
        for (const [entidade, arr] of Object.entries(filtrosEncontrados)) {
            if (
                this.ENTITY_COLUMNS.includes(entidade) &&
                Array.isArray(arr) &&
                arr.length > 0
            ) {
                const values = this._toEntityValues(arr, entidade);
                if (values.length > 0) {
                    filtrosValidos[entidade] = values;
                }
            }
        }

        // -------------------------------
        // DEFINE ENTIDADES FINAIS
        // -------------------------------
        const entidadesFinais = new Set([
            ...entidadesSolicitadas,
            ...Object.keys(filtrosValidos)
        ]);

        if (entidadesFinais.size === 0) {
            throw new Error("É obrigatório informar ao menos uma entidade.");
        }

        // -------------------------------
        // SELECT + GROUP BY
        // -------------------------------
        const selectParts = [];
        const groupByParts = [];

        for (const entidade of this.ENTITY_COLUMNS) {
            if (entidadesFinais.has(entidade)) {
                selectParts.push(this._quoteIdent(entidade));
                groupByParts.push(this._quoteIdent(entidade));
            }
        }

        for (const val of valoresSolicitados) {
            selectParts.push(
                `SUM(${this._quoteIdent(val)}) AS ${this._quoteIdent(`soma_${val}`)}`
            );
        }

        // -------------------------------
        // CONSTRUÇÃO DO WHERE
        // -------------------------------
        const params = [];
        const hierarquicos = {};
        const independentes = {};

        for (const [entidade, valores] of Object.entries(filtrosValidos)) {
            const nivel = this.HIERARCHY_LEVEL[entidade];
            if (nivel) {
                if (!hierarquicos[nivel]) hierarquicos[nivel] = {};
                hierarquicos[nivel][entidade] = valores;
            } else {
                independentes[entidade] = valores;
            }
        }

        // Blocos Hierárquicos (Poder, UG, UO)
        const blocosHierarquicos = [];
        for (const nivel of Object.keys(hierarquicos)) {
            const entidadesNivel = hierarquicos[nivel];
            const partes = [];
            for (const [entidade, valores] of Object.entries(entidadesNivel)) {
                const placeholders = valores.map(() => "?").join(", ");
                partes.push(`${this._quoteIdent(entidade)} IN (${placeholders})`);
                params.push(...valores);
            }
            blocosHierarquicos.push(`(${partes.join(" AND ")})`);
        }

        // Filtros Independentes (Fonte, Credor, Ação, etc.)
        const partesIndependentes = [];
        for (const [entidade, valores] of Object.entries(independentes)) {
            if (entidade === "credor") {
                // MODIFICAÇÃO AQUI:
                // Aplicamos COLLATE utf8mb4_general_ci para ignorar acentos/cedilha
                // E usamos LIKE para permitir a frase normatizada
                const likes = valores.map(() =>
                    `${this._quoteIdent(entidade)} COLLATE utf8mb4_general_ci LIKE ?`
                ).join(" OR ");

                partesIndependentes.push(`(${likes})`);

                // Adicionamos o wildcard % para buscar a frase em qualquer parte do nome
                params.push(...valores.map(v => `%${v}%`));
            } else {
                // Lógica padrão IN para os demais
                const placeholders = valores.map(() => "?").join(", ");
                partesIndependentes.push(`${this._quoteIdent(entidade)} IN (${placeholders})`);
                params.push(...valores);
            }
        }

        let whereClause = "";
        if (blocosHierarquicos.length > 0 && partesIndependentes.length > 0) {
            whereClause = `WHERE (${blocosHierarquicos.join(" OR ")}) AND ${partesIndependentes.join(" AND ")}`;
        } else if (blocosHierarquicos.length > 0) {
            whereClause = `WHERE ${blocosHierarquicos.join(" OR ")}`;
        } else if (partesIndependentes.length > 0) {
            whereClause = `WHERE ${partesIndependentes.join(" AND ")}`;
        }

        // -------------------------------
        // ORDENAÇÃO DINÂMICA
        // -------------------------------
        let orderClause = "";
        if (entidadesFinais.has("credor")) {
            const prioridadeOrdenacao = [
                "soma_despesas_empenhadas",
                "soma_despesas_liquidadas",
                "soma_despesas_pagas",
                "soma_despesas_exercicio_pagas"
            ];

            const camposDisponiveis = prioridadeOrdenacao.filter(campo =>
                selectParts.some(p => p.includes(`AS \`${campo}\``))
            );

            if (camposDisponiveis.length > 0) {
                orderClause = `ORDER BY ${camposDisponiveis.map(c => `\`${c}\` DESC`).join(", ")}`;
            }
        }

        // -------------------------------
        // SQL FINAL
        // -------------------------------
        const sql = `
            SELECT ${selectParts.join(", ")}
            FROM ${this._quoteIdent(this.table)}
            ${whereClause}
            GROUP BY ${groupByParts.join(", ")}
            ${orderClause}
            LIMIT 100
        `.trim().replace(/\s+/g, ' '); // Limpa espaços extras

        return { sql, params };
    }
}

module.exports = QueryService;















