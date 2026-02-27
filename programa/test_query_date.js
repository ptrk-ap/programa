const QueryService = require('./src/services/query/queryService');
const queryService = new QueryService();

const mockFiltros = {
    periodo: [
        {
            data_inicio: '2026-01-01',
            data_fim: '2026-01-31',
            trecho_encontrado: 'janeiro'
        }
    ],
    unidade_gestora: [
        { codigo: '123', descricao: 'UG TESTE' }
    ]
};

const camposSolicitados = ['despesas_pagas', 'unidade_gestora'];

try {
    const { sql, params } = queryService.buildQuery(camposSolicitados, mockFiltros);
    console.log('SQL Gerado:');
    console.log(sql);
    console.log('\nParâmetros:');
    console.log(params);

    if (sql.includes('`ordem_bancaria` BETWEEN ? AND ?')) {
        console.log('\n✅ TESTE PASSOU: Coluna ordem_bancaria encontrada com BETWEEN.');
    } else {
        console.log('\n❌ TESTE FALHOU: Coluna ordem_bancaria NÃO encontrada ou sem BETWEEN.');
    }
} catch (error) {
    console.error('Erro no teste:', error.message);
}
