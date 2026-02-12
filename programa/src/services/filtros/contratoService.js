const fs = require("fs");

const caminhoCsv = "../src/data/entidades/contrato.csv";

class ContratoService {

    constructor() {
        this.contratos = this.carregarCsv(caminhoCsv);

        // Índice rápido por código (O(1))
        this.mapaPorCodigo = new Map(
            this.contratos.map(c => [c.codigo, c])
        );
    }

    carregarCsv(caminho) {
        const conteudo = fs.readFileSync(caminho, "utf8");

        return conteudo
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(1)
            .map(linha => {
                const match = linha.match(/^([^,]+),(.*)$/);
                if (!match) return null;

                let codigo = match[1].trim();
                let descricao = match[2].trim();

                // Remove aspas caso existam
                descricao = descricao.replace(/^"|"$/g, "");

                return { codigo, descricao };
            })
            .filter(Boolean);
    }

    extrair(frase) {

        // 🔎 Só executa se contiver a palavra "contrato"
        if (!/\bcontrato\b/i.test(frase)) {
            return [];
        }

        const resultados = [];
        const encontrados = new Set();

        // 🔐 Apenas códigos com exatamente 8 dígitos
        const codigos = frase.match(/(?<!\d)\d{8}(?!\d)/g) || [];


        for (const codigo of codigos) {
            const contrato = this.mapaPorCodigo.get(codigo);

            if (contrato && !encontrados.has(codigo)) {
                resultados.push(contrato);
                encontrados.add(codigo);
            }
        }

        return resultados;
    }
}

module.exports = ContratoService;
