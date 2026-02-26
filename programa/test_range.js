const dateService = require('./src/services/filtros/dateService');

const frases = [
    "despesas pagas na seplan de janeiro a março",
    "janeiro a março",
    "de janeiro até março"
];

frases.forEach(frase => {
    const resultado = dateService.extrair(frase);
    console.log(`Frase: "${frase}"`);
    console.log(`Resultado: ${JSON.stringify(resultado)}`);
    console.log('---');
});
