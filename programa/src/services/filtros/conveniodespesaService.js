const fs = require("fs");

const path = require("path");
const caminhoCsv = path.join(__dirname, "..", "..", "data", "entidades", "convenio_despesa.csv");

class ConvenioDespesaService {

    constructor() {
        this.convenios = this.carregarCsv(caminhoCsv);

        // Índice rápido O(1)
        this.mapaPorCodigo = new Map(
            this.convenios.map(c => [c.codigo, c])
        );
    }

    carregarCsv(caminho) {
        const conteudo = fs.readFileSync(caminho, "utf8");

        return conteudo
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(1) // remove cabeçalho
            .map(linha => {
                const match = linha.match(/^([^,]+),(.*)$/);
                if (!match) return null;

                let codigo = match[1].trim();
                let descricao = match[2].trim();

                descricao = descricao.replace(/^"|"$/g, "");

                return { codigo, descricao };
            })
            .filter(Boolean);
    }

    extrair(frase) {

        if (!frase) return [];

        // 🔎 Só executa se contiver exatamente "convenio_despesa"
        if (!frase.includes("convenio_despesa")) {
            return [];
        }

        const resultados = [];
        const encontrados = new Set();

        // 🔐 Captura exatamente 6 dígitos (mesmo colado)
        const codigos = frase.match(/(?<!\d)\d{6}(?!\d)/g) || [];

        for (const codigo of codigos) {
            const convenio = this.mapaPorCodigo.get(codigo);

            if (convenio && !encontrados.has(codigo)) {
                resultados.push(convenio);
                encontrados.add(codigo);
            }
        }

        return resultados;
    }
}

module.exports = ConvenioDespesaService;
