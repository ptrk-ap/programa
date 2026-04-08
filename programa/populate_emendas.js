require("dotenv").config();
const knex = require("./src/database/connection");

async function populateEmendas() {
    console.log("== Populando tabela 'emendas' a partir de execucao2024 e execucao2025 ==\n");

    // 1. Busca valores DISTINCT de emenda das duas tabelas
    console.log("Buscando valores distintos de emenda...");

    const [rows2024] = await knex.raw("SELECT DISTINCT emenda FROM `execucao2024` WHERE emenda IS NOT NULL AND emenda != ''");
    const [rows2025] = await knex.raw("SELECT DISTINCT emenda FROM `execucao2025` WHERE emenda IS NOT NULL AND emenda != ''");

    console.log(`  execucao2024: ${rows2024.length} registros distintos`);
    console.log(`  execucao2025: ${rows2025.length} registros distintos`);

    // 2. Combina e deduplica pelo valor bruto do campo
    const valoresBrutos = new Set();
    [...rows2024, ...rows2025].forEach(r => {
        if (r.emenda) valoresBrutos.add(r.emenda.trim());
    });

    console.log(`\nTotal único (combinado): ${valoresBrutos.size} emendas\n`);

    // 3. Faz o parse de "CODIGO - DESCRICAO" para extrair os campos
    function parsearEmenda(valorBruto) {
        const idxTraco = valorBruto.indexOf(" - ");
        if (idxTraco === -1) {
            // Sem traço → tudo é código, sem descrição
            return { codigo: valorBruto.trim(), descricao: "" };
        }
        const codigo = valorBruto.substring(0, idxTraco).trim();
        const descricao = valorBruto.substring(idxTraco + 3).trim();
        return { codigo, descricao };
    }

    // 4. Carrega os códigos já existentes na tabela emendas para evitar duplicidade
    const existentes = await knex("emendas").select("codigo", "descricao");
    const chavesExistentes = new Set(
        existentes.map(e => `${(e.codigo || "").trim()}|${(e.descricao || "").trim()}`)
    );

    console.log(`Registros já existentes na tabela 'emendas': ${existentes.length}`);

    // 5. Filtra apenas os novos registros
    const novos = [];
    for (const valorBruto of valoresBrutos) {
        const { codigo, descricao } = parsearEmenda(valorBruto);
        const chave = `${codigo}|${descricao}`;
        if (!chavesExistentes.has(chave)) {
            novos.push({ codigo, descricao });
        }
    }

    console.log(`Novos registros a inserir: ${novos.length}\n`);

    if (novos.length === 0) {
        console.log("Nenhum registro novo. Tabela já está atualizada.");
        await knex.destroy();
        return;
    }

    // 6. Insere em lotes de 100
    const BATCH_SIZE = 100;
    let inseridos = 0;

    for (let i = 0; i < novos.length; i += BATCH_SIZE) {
        const lote = novos.slice(i, i + BATCH_SIZE);
        await knex("emendas").insert(lote);
        inseridos += lote.length;
        process.stdout.write(`\r  Inserindo... ${inseridos}/${novos.length}`);
    }

    console.log(`\n\n✅ Concluído! ${inseridos} novos registros inseridos na tabela 'emendas'.`);
    await knex.destroy();
}

populateEmendas().catch(err => {
    console.error("\n❌ Erro:", err.message);
    process.exit(1);
});
