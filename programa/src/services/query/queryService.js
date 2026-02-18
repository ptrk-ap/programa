class QueryService {
    constructor() {

        this.table = "execucao";

        // Hierarquia oficial
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
            "contrato"
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

    _toEntityValues(arr = []) {
        return arr
            .map(i => `${String(i.codigo).trim()} - ${String(i.descricao).trim()}`)
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
                const values = this._toEntityValues(arr);
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
        // CONSTRUÇÃO DO WHERE COM HIERARQUIA
        // -------------------------------

        const params = [];

        const hierarquicos = {};
        const independentes = {};

        for (const [entidade, valores] of Object.entries(filtrosValidos)) {

            const nivel = this.HIERARCHY_LEVEL[entidade];

            if (nivel) {
                if (!hierarquicos[nivel]) {
                    hierarquicos[nivel] = {};
                }
                hierarquicos[nivel][entidade] = valores;
            } else {
                independentes[entidade] = valores;
            }
        }

        const blocosHierarquicos = [];

        for (const nivel of Object.keys(hierarquicos)) {

            const entidadesNivel = hierarquicos[nivel];
            const partes = [];

            for (const [entidade, valores] of Object.entries(entidadesNivel)) {

                const placeholders = valores.map(() => "?").join(", ");
                partes.push(
                    `${this._quoteIdent(entidade)} IN (${placeholders})`
                );

                params.push(...valores);
            }

            blocosHierarquicos.push(`(${partes.join(" AND ")})`);
        }

        const partesIndependentes = [];

        for (const [entidade, valores] of Object.entries(independentes)) {

            const placeholders = valores.map(() => "?").join(", ");

            partesIndependentes.push(
                `${this._quoteIdent(entidade)} IN (${placeholders})`
            );

            params.push(...valores);
        }

        let whereClause = "";

        if (blocosHierarquicos.length > 0 && partesIndependentes.length > 0) {

            whereClause =
                "WHERE (" +
                blocosHierarquicos.join(" OR ") +
                ") AND " +
                partesIndependentes.join(" AND ");

        } else if (blocosHierarquicos.length > 0) {

            whereClause =
                "WHERE " + blocosHierarquicos.join(" OR ");

        } else if (partesIndependentes.length > 0) {

            whereClause =
                "WHERE " + partesIndependentes.join(" AND ");
        }

        // -------------------------------
        // SQL FINAL
        // -------------------------------

        const sql = `
            SELECT ${selectParts.join(", ")}
            FROM ${this._quoteIdent(this.table)}
            ${whereClause}
            GROUP BY ${groupByParts.join(", ")}
            LIMIT 100
        `.trim();

        return { sql, params };
    }
}

module.exports = QueryService;
