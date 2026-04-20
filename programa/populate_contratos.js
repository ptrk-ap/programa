require("dotenv").config();
const knex = require("./src/database/connection");

async function populateContratos() {
    console.log("== Criando tabela e populando 'contratos' a partir de execucao2024, execucao2025 e execucao2026 ==\n");

    try {
        // 1. Criar tabela se não existir
        await knex.raw(`
            CREATE TABLE IF NOT EXISTS contratos (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                codigo VARCHAR(20) NOT NULL,
                descricao TEXT,
                PRIMARY KEY (id),
                UNIQUE KEY uq_contratos_codigo (codigo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Tabela 'contratos' verificada/criada.");

        // 2. Busca valores DISTINCT de contrato das duas tabelas
        console.log("Buscando valores distintos de contrato...");

        const [rows2024] = await knex.raw("SELECT DISTINCT contrato FROM `execucao2024` WHERE contrato IS NOT NULL AND contrato != ''");
        const [rows2025] = await knex.raw("SELECT DISTINCT contrato FROM `execucao2025` WHERE contrato IS NOT NULL AND contrato != ''");
        const [rows2026] = await knex.raw("SELECT DISTINCT contrato FROM `execucao2026` WHERE contrato IS NOT NULL AND contrato != ''");

        console.log(`  execucao2024: ${rows2024.length} registros distintos`);
        console.log(`  execucao2025: ${rows2025.length} registros distintos`);
        console.log(`  execucao2026: ${rows2026.length} registros distintos`);

        // 3. Combina e deduplica pelo valor bruto do campo
        const valoresBrutos = new Set();
        [...rows2024, ...rows2025, ...rows2026].forEach(r => {
            if (r.contrato && r.contrato.trim() && r.contrato.trim() !== "- - -") {
                valoresBrutos.add(r.contrato.trim());
            }
        });

        console.log(`\nTotal único (combinado): ${valoresBrutos.size} contratos brutos\n`);

        // 4. Faz o parse de "CODIGO - DESCRICAO"
        function parsearContrato(valorBruto) {
            const idxTraco = valorBruto.indexOf(" - ");
            if (idxTraco === -1) {
                return { codigo: valorBruto.trim(), descricao: "" };
            }
            const codigo = valorBruto.substring(0, idxTraco).trim();
            const descricao = valorBruto.substring(idxTraco + 3).trim();
            return { codigo, descricao };
        }

        // 5. Mapear por código para garantir unicidade (como solicitado)
        // Se houver códigos duplicados com descrições diferentes, pegamos a descrição mais longa/completa
        const mapaContratos = new Map();
        for (const valorBruto of valoresBrutos) {
            const { codigo, descricao } = parsearContrato(valorBruto);
            if (!codigo) continue;

            const existente = mapaContratos.get(codigo);
            if (!existente || (descricao.length > existente.length)) {
                mapaContratos.set(codigo, descricao);
            }
        }

        console.log(`Registros após deduplicação por código: ${mapaContratos.size}`);

        // 6. Verificar o que já existe no banco
        const existentesNoBanco = await knex("contratos").select("codigo");
        const codigosNoBanco = new Set(existentesNoBanco.map(c => c.codigo));

        const novos = [];
        for (const [codigo, descricao] of mapaContratos.entries()) {
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

        // 7. Insere em lotes
        const BATCH_SIZE = 100;
        let inseridos = 0;

        for (let i = 0; i < novos.length; i += BATCH_SIZE) {
            const lote = novos.slice(i, i + BATCH_SIZE);
            await knex("contratos").insert(lote);
            inseridos += lote.length;
            process.stdout.write(`\r  Inserindo... ${inseridos}/${novos.length}`);
        }

        console.log(`\n\n✅ Concluído! ${inseridos} novos registros inseridos na tabela 'contratos'.`);
    } catch (err) {
        console.error("\n❌ Erro durante o processo:", err.message);
    } finally {
        await knex.destroy();
    }
}

populateContratos();
