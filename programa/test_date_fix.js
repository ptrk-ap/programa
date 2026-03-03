
const PeriodoService = require("./src/services/filtros/dateService");

function test() {
    const service = new PeriodoService();
    const cases = [
        "maio e junho de 2024",
        "janeiro de 2024, fevereiro e março",
        "primeiro e segundo bimestre de 2024",
        "maio ate junho de 2024"
    ];

    cases.forEach(frase => {
        console.log(`\n--- Frase: "${frase}" ---`);
        const resultados = service.extrair(frase);
        console.log(JSON.stringify(resultados, null, 2));

        const todos2024 = resultados.every(r => r.data_inicio.startsWith("2024"));
        if (todos2024) {
            console.log("✅ SUCESSO: Todos em 2024.");
        } else {
            console.log("❌ FALHA: Ano incorreto detectado.");
        }
    });
}

test();
