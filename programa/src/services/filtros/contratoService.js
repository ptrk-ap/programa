const fs = require("fs");
const path = require("path");
const caminhoCsv = path.join(__dirname, "..", "..", "data", "entidades", "contrato.csv");

/**
 * Service responsável por:
 * - carregar o CSV de contratos em memória
 * - extrair contratos a partir de uma frase
 *
 * ESTRATÉGIA: puramente por código (8 dígitos exatos).
 * Já otimizado: Map O(1) + trigger "contrato".
 */
class ContratoService {

    constructor() {
        // Carrega CSV uma única vez
        this.contratos = this.carregarCsv(caminhoCsv);

        // Índice rápido por código — O(1)
        this.mapaPorCodigo = new Map(
            this.contratos.map(c => [c.codigo, c])
        );
    }

    /**
     * Lê o CSV e transforma em objetos.
     * Suporta descrições com vírgulas internas.
     */
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

    /**
     * Extrai contratos de uma frase.
     *
     * 🔎 Só executa se contiver a palavra "contrato".
     * 🔐 Apenas códigos com exatamente 8 dígitos.
     *
     * Complexidade: O(matches) — busca direta no Map.
     */
    extrair(frase) {
        // Trigger obrigatório
        if (!/\bcontrato\b/i.test(frase)) return [];

        const resultados = [];
        const encontrados = new Set();

        // 🔐 Apenas códigos com exatamente 8 dígitos
        const codigos = frase.match(/(?<!\d)\d{8}(?!\d)/g) || [];

        for (const codigo of codigos) {
            const contrato = this.mapaPorCodigo.get(codigo);

            if (contrato && !encontrados.has(codigo)) {
                resultados.push({
                    codigo: contrato.codigo,
                    descricao: contrato.descricao,
                    trecho_encontrado: codigo
                });
                encontrados.add(codigo);
            }
        }

        return resultados;
    }
}

module.exports = ContratoService;
