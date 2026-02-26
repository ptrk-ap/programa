const dateService = require('./src/services/filtros/dateService');

const frases = [
    "2 de fevereiro a 3 de maio",
    "de dezembro ate janeiro de 2026",
    "fevereiro a março de 2024",
    "dezembro a janeiro"
];

frases.forEach(frase => {
    const resultado = dateService.extrair(frase);
    console.log(`Frase: "${frase}"`);
    console.log(`Resultado: ${JSON.stringify(resultado)}`);
    console.log('---');
});
