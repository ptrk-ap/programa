const OrcamentoService = require('./src/services/entidades/OrcamentoService');
const ExtratorTermosService = require('./src/services/entidades/ExtratorTermosService');

const frase = "quanto foi despesas pagas com obras e instalações";

console.log("Frase original:", frase);

const fraseProcessada = OrcamentoService.traduzirParaTermosSql(frase);
console.log("Frase processada:", fraseProcessada);

const parametrosEncontrados = ExtratorTermosService.identificarParametros(fraseProcessada);
console.log("Parâmetros encontrados:", parametrosEncontrados);

if (parametrosEncontrados.includes('despesa_paga')) {
    console.log("SUCESSO: despesa_paga encontrada!");
} else {
    console.log("FALHA: despesa_paga NÃO encontrada.");
}
