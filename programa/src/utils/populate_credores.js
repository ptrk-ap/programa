require("dotenv").config();
const knex = require("../database/connection");

async function populateCredores() {
    console.log("== Criando tabela e populando 'credores' a partir de execucao2024, execucao2025 e execucao2026 ==\n");

    try {
        // 1. Criar tabela se não existir
        await knex.raw(`
            CREATE TABLE IF NOT EXISTS credores (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                codigo VARCHAR(50) NOT NULL,
                descricao TEXT,
                PRIMARY KEY (id),
                UNIQUE KEY uq_credores_codigo (codigo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Tabela 'credores' verificada/criada.");

        // 2. Busca valores DISTINCT de credor das duas tabelas
        console.log("Buscando valores distintos de credor...");

        const [rows2024] = await knex.raw("SELECT DISTINCT credor FROM `execucao2024` WHERE credor IS NOT NULL AND credor != ''");
        const [rows2025] = await knex.raw("SELECT DISTINCT credor FROM `execucao2025` WHERE credor IS NOT NULL AND credor != ''");
        const [rows2026] = await knex.raw("SELECT DISTINCT credor FROM `execucao2026` WHERE credor IS NOT NULL AND credor != ''");

        console.log(`  execucao2024: ${rows2024.length} registros distintos`);
        console.log(`  execucao2025: ${rows2025.length} registros distintos`);
        console.log(`  execucao2026: ${rows2026.length} registros distintos`);

        // 3. Combina e deduplica pelo valor bruto do campo
        const valoresBrutos = new Set();
        [...rows2024, ...rows2025, ...rows2026].forEach(r => {
            if (r.credor && r.credor.trim() && r.credor.trim() !== "- - -") {
                valoresBrutos.add(r.credor.trim());
            }
        });

        console.log(`\nTotal único (combinado): ${valoresBrutos.size} credores brutos\n`);

        // 4. Faz o parse de "CODIGO - DESCRICAO"
        function parsearCreador(valorBruto) {
            const idxTraco = valorBruto.indexOf(" - ");
            if (idxTraco === -1) {
                return { codigo: valorBruto.trim(), descricao: "" };
            }
            const codigo = valorBruto.substring(0, idxTraco).trim();
            const descricao = valorBruto.substring(idxTraco + 3).trim();
            return { codigo, descricao };
        }

        // 5. Mapear por código para garantir unicidade
        // Se houver códigos duplicados com descrições diferentes, pegamos a mais longa/completa
        const mapaCredores = new Map();
        for (const valorBruto of valoresBrutos) {
            const { codigo, descricao } = parsearCreador(valorBruto);
            if (!codigo) continue;

            const existente = mapaCredores.get(codigo);
            if (!existente || descricao.length > existente.length) {
                mapaCredores.set(codigo, descricao);
            }
        }

        console.log(`Registros após deduplicação por código: ${mapaCredores.size}`);

        // 6. Verificar o que já existe no banco
        const existentesNoBanco = await knex("credores").select("codigo");
        const codigosNoBanco = new Set(existentesNoBanco.map(c => c.codigo));

        const novos = [];
        for (const [codigo, descricao] of mapaCredores.entries()) {
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

        // 7. Insere em lotes de 100
        const BATCH_SIZE = 100;
        let inseridos = 0;

        for (let i = 0; i < novos.length; i += BATCH_SIZE) {
            const lote = novos.slice(i, i + BATCH_SIZE);
            await knex("credores").insert(lote);
            inseridos += lote.length;
            process.stdout.write(`\r  Inserindo... ${inseridos}/${novos.length}`);
        }

        console.log(`\n\n✅ Concluído! ${inseridos} novos registros inseridos na tabela 'credores'.`);
    } catch (err) {
        console.error("\n❌ Erro durante o processo:", err.message);
    } finally {
        await knex.destroy();
    }
}

populateCredores();
