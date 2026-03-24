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
     * Formata o campo credor:
     * - CNPJ (14 dígitos): mantém o número + descrição
     * - CPF  (11 dígitos): omite o número, exibe só a descrição
     * @param {string} credor  Ex: "72624679000109 - LOGUS SISTEMAS..."
     * @returns {string}
     */
    static formatarCredor(credor) {
        if (!credor || typeof credor !== "string") return credor;

        // Espera o padrão "NUMERO - DESCRICAO"
        const match = credor.match(/^(\d+)\s*-\s*(.+)$/);
        if (!match) return credor;

        const [, documento, descricao] = match;
        const digits = documento.replace(/\D/g, "");

        // CPF = 11 dígitos → omite o número
        if (digits.length === 11) {
            return descricao.trim();
        }

        // CNPJ = 14 dígitos (ou qualquer outro caso) → mantém como está
        return credor;
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

            if ("credor" in novo) {
                novo["credor"] = FormatterService.formatarCredor(novo["credor"]);
            }

            return novo;
        });
    }

    /**
     * Formata a mensagem de período para exibição na resposta da API.
     * - Se houver ordem_bancaria nos filtros, usa os intervalos de data.
     * - Caso contrário, usa os anos no formato "Exercício de AAAA".
     *
     * @param {Object}   filtros  - Objeto retornado pelo filtroService.
     * @param {number[]} anos     - Lista de anos resolvidos pela query.
     * @returns {string}
     */
    static formatarMensagemPeriodo(filtros, anos) {
        let periodosTexto;

        if (filtros.ordem_bancaria && filtros.ordem_bancaria.length > 0) {
            periodosTexto = filtros.ordem_bancaria.map(ob => `${ob.data_inicio} a ${ob.data_fim}`);
        } else {
            periodosTexto = anos.map(a => `Exercício de ${a}`);
        }

        return `Valores correspondentes ao período: ${periodosTexto.join(', ')}`;
    }
}

module.exports = FormatterService;