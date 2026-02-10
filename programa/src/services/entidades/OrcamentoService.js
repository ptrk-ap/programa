/**
 * OrcamentoService - Gerencia a tradução de termos com prioridade para termos compostos.
 */
class OrcamentoService {
    constructor() {
        // IMPORTANTE: A ordem aqui não importa tanto quanto a lógica de ordenação 
        // que adicionei no método traduzirParaTermosSql.
        this.dicionario = {
            "unidade_gestora": ["unidade gestora", "ug", "gestora"],
            "fonte": ["fonte", "fonte de recurso", "origem do recurso"],
            "natureza": ["natureza", "natureza da despesa", "nd"],
            "programa": ["programa", "programa de governo"],
            "elemento": ["elemento de despesa", "elemento"],
            "grupo_despesa": ["grupo de despesa", "grupo"],
            "categoria_despesa": ["categoria de despesa", "categoria"],
            "funcao": ["funcao", "funcao de despesa", "funçoes de despesa", "funções", 'funcoes'],
            "acao": ["ação", "projeto atividade"],
            "unidade_orcamentaria": ["unidade orçamentária", "uo", "unidade orçamentaria"],
            "dotacao_inicial": ["dotação inicial"],
            "despesas_empenhadas": ["despesas empenhadas", "despesa empenhada", "empenhado", "empenhadas"],
            // Termo longo (específico)
            "despesas_exercicio_pagas": ["despesas do exercício pagas", "despesa do exercicio paga", "pago no exercicio", "pagos no exercicio"],
            // Termo curto (genérico)
            "despesas_pagas": ["despesas pagas", "despesa paga", "pago", "pagos"]
        };

        this._prepararDicionario();
    }

    _normalizar(str) {
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    _prepararDicionario() {
        for (const chave in this.dicionario) {
            this.dicionario[chave] = this.dicionario[chave].map(s => this._normalizar(s));
        }
    }

    /**
     * Traduz a frase, priorizando a substituição de termos mais longos.
     */
    traduzirParaTermosSql(texto) {
        if (!texto) return "";

        let textoProcessado = this._normalizar(texto);

        // Criamos uma lista de todos os sinônimos vinculados às suas chaves
        let todasAsSubstituicoes = [];
        for (const [chave, sinonimos] of Object.entries(this.dicionario)) {
            sinonimos.forEach(s => {
                todasAsSubstituicoes.push({ sinonimo: s, chave: chave });
            });
        }

        // O PULO DO GATO: Ordenamos os sinônimos pelo tamanho (length) de forma decrescente.
        // Isso garante que "pago no exercicio" seja processado ANTES de "pago".
        todasAsSubstituicoes.sort((a, b) => b.sinonimo.length - a.sinonimo.length);

        // Aplicamos as substituições na ordem da mais específica para a mais genérica
        todasAsSubstituicoes.forEach(item => {
            const pattern = `\\b${this._escaparRegExp(item.sinonimo)}\\b`;
            const regex = new RegExp(pattern, 'g');
            textoProcessado = textoProcessado.replace(regex, item.chave);
        });

        return textoProcessado;
    }

    _escaparRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

module.exports = new OrcamentoService();