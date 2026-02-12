// queryService.js
class QueryService {
    constructor() {
        this.table = "execucao";

        // 🔥 Hierarquia oficial das entidades
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
            "elemento",
            "natureza",
            "fonte",
            "convenio_receita",
            "convenio_despesa",
            "contrato",
            "emenda"

        ];

        this.VALUE_COLUMNS = [
            "dotacao_inicial",
            "despesas_empenhadas",
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
        // Processa filtros
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

        // Entidades finais = solicitadas + filtradas
        const entidadesFinais = new Set([
            ...entidadesSolicitadas,
            ...Object.keys(filtrosValidos)
        ]);

        if (entidadesFinais.size === 0) {
            throw new Error(
                "É obrigatório informar ao menos uma entidade (nos campos ou nos filtros)."
            );
        }

        // -------------------------------
        // SELECT e GROUP BY (ordem hierárquica)
        // -------------------------------

        const selectParts = [];
        const groupByParts = [];

        for (const entidade of this.ENTITY_COLUMNS) {
            if (entidadesFinais.has(entidade)) {
                selectParts.push(this._quoteIdent(entidade));
                groupByParts.push(this._quoteIdent(entidade));
            }
        }

        // Campos de valor sempre depois
        for (const val of valoresSolicitados) {
            selectParts.push(
                `SUM(${this._quoteIdent(val)}) AS ${this._quoteIdent(`soma_${val}`)}`
            );
        }

        // -------------------------------
        // WHERE
        // -------------------------------

        const whereParts = [];
        const params = [];

        for (const entidade of this.ENTITY_COLUMNS) {
            if (!filtrosValidos[entidade]) continue;

            const values = filtrosValidos[entidade];
            const placeholders = values.map(() => "?").join(", ");

            whereParts.push(
                `${this._quoteIdent(entidade)} IN (${placeholders})`
            );
            params.push(...values);
        }

        // -------------------------------
        // SQL FINAL
        // -------------------------------

        const sql = `
            SELECT ${selectParts.join(", ")}
            FROM ${this._quoteIdent(this.table)}
            ${whereParts.length ? "WHERE " + whereParts.join(" AND ") : ""}
            GROUP BY ${groupByParts.join(", ")}
            LIMIT 20
        `.trim();

        return { sql, params };
    }
}

module.exports = QueryService;
