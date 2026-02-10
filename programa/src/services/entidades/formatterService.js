class FormatterService {

    // 🔒 Campos de valor conhecidos do relatório
    static CAMPOS_DE_VALOR = [
        "soma_dotacao_inicial",
        "soma_despesas_empenhadas",
        "soma_despesas_liquidadas",
        "soma_despesas_pagas",
        "soma_despesas_exercicio_pagas"
    ];

    /**
     * Formata número para Real (R$)
     */
    static toReal(valor) {
        if (valor === null || valor === undefined || valor === "") {
            return "R$ 0,00";
        }

        const numero = Number(valor);

        if (isNaN(numero)) {
            return "R$ 0,00";
        }

        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(numero);
    }

    /**
     * Formata automaticamente todos os campos de valor presentes
     * no resultado SQL
     * @param {Array<Object>} rows
     */
    static formatarResultado(rows = []) {
        return rows.map(row => {
            const novo = { ...row };

            for (const campo of FormatterService.CAMPOS_DE_VALOR) {
                if (campo in novo) {
                    novo[campo] = FormatterService.toReal(novo[campo]);
                }
            }

            return novo;
        });
    }
}

module.exports = FormatterService;
