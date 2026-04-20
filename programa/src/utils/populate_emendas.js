require("dotenv").config();
const knex = require("../database/connection");

async function populateEmendas() {
    console.log("== Criando tabela e populando 'emendas' a partir de execucao2024, execucao2025 e execucao2026 ==\n");

    try {
        // 0. Criar tabela se não existir
        await knex.raw(`
            CREATE TABLE IF NOT EXISTS emendas (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                codigo VARCHAR(20) NOT NULL,
                descricao TEXT,
                PRIMARY KEY (id),
                UNIQUE KEY uq_emendas_codigo (codigo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Tabela 'emendas' verificada/criada.");

        // 1. Busca valores DISTINCT de emenda das duas tabelas
        console.log("Buscando valores distintos de emenda...");

        const [rows2024] = await knex.raw("SELECT DISTINCT emenda FROM `execucao2024` WHERE emenda IS NOT NULL AND emenda != ''");
        const [rows2025] = await knex.raw("SELECT DISTINCT emenda FROM `execucao2025` WHERE emenda IS NOT NULL AND emenda != ''");
        const [rows2026] = await knex.raw("SELECT DISTINCT emenda FROM `execucao2026` WHERE emenda IS NOT NULL AND emenda != ''");

        console.log(`  execucao2024: ${rows2024.length} registros distintos`);
        console.log(`  execucao2025: ${rows2025.length} registros distintos`);
        console.log(`  execucao2026: ${rows2026.length} registros distintos`);

        // 2. Combina e deduplica pelo valor bruto do campo
        const valoresBrutos = new Set();
        [...rows2024, ...rows2025, ...rows2026].forEach(r => {
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

        // 4. Mapear por código para garantir unicidade
        // Se houver códigos duplicados com descrições diferentes, pegamos a descrição mais completa
        const mapaEmendas = new Map();
        for (const valorBruto of valoresBrutos) {
            const { codigo, descricao } = parsearEmenda(valorBruto);
            if (!codigo) continue;

            const existente = mapaEmendas.get(codigo);
            if (!existente || (descricao.length > existente.length)) {
                mapaEmendas.set(codigo, descricao);
            }
        }

        console.log(`Registros após deduplicação por código: ${mapaEmendas.size}`);

        // 5. Verificar o que já existe no banco
        const existentesNoBanco = await knex("emendas").select("codigo");
        const codigosNoBanco = new Set(existentesNoBanco.map(e => e.codigo));

        const novos = [];
        for (const [codigo, descricao] of mapaEmendas.entries()) {
            if (!codigosNoBanco.has(codigo)) {
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
    } catch (err) {
        console.error("\n❌ Erro durante o processo:", err.message);
    } finally {
        await knex.destroy();
    }
}

populateEmendas();
