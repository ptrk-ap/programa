class PeriodoService {
    constructor() {
        this.meses = {
            'janeiro': 0, 'jan': 0,
            'fevereiro': 1, 'fev': 1,
            'marco': 2, 'mar': 2,
            'abril': 3, 'abr': 3,
            'maio': 4, 'mai': 4,
            'junho': 5, 'jun': 5,
            'julho': 6, 'jul': 6,
            'agosto': 7, 'ago': 7,
            'setembro': 8, 'set': 8,
            'outubro': 9, 'out': 9,
            'novembro': 10, 'nov': 10,
            'dezembro': 11, 'dez': 11
        };

        this.numerais = {
            'primeiro': 1,
            'segundo': 2,
            'terceiro': 3,
            'quarto': 4,
            'quinto': 5,
            'sexto': 6
        };

        this.periodosAgrupados = {
            'bimestre': 2,
            'trimestre': 3,
            'quadrimestre': 4,
            'semestre': 6
        };
    }

    extrair(frase) {
        if (!frase || !this._deveAtivar(frase)) return [];

        const hoje = new Date(2026, 1, 25);
        const anoAtual = hoje.getFullYear();

        const regexGeral = /(?:\d{1,2}\s+de\s+)?(?:\d{1,2}[\/\.]\d{1,2}(?:[\/\.]\d{2,4})?|\d{4}|\b(?:(?:primeiro|segundo|terceiro|quarto|quinto|sexto|\d+\s*[oº°])\s+)?(?:janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|bimestre|trimestre|quadrimestre|semestre)\b)(?:\s+(?:de\s+)?\d{4})?/gi;

        let fragmentos = [];
        let match;

        while ((match = regexGeral.exec(frase)) !== null) {
            const info = this._parseFragmento(match[0], anoAtual, hoje);
            if (info) {
                fragmentos.push({
                    inicio: info.inicio,
                    fim: info.fim,
                    texto: match[0],
                    index: match.index,
                    length: match[0].length,
                    anoExplicito: info.anoExplicito
                });
            }
        }

        if (fragmentos.length === 0) return [];

        const resultados = [];
        let atual = fragmentos[0];

        for (let i = 1; i < fragmentos.length; i++) {
            const proximo = fragmentos[i];
            const entreTrechos = frase
                .substring(atual.index + atual.length, proximo.index)
                .toLowerCase()
                .trim();

            if (/^(ate|até|a)$/i.test(entreTrechos)) {

                // REGRA NOVA: ano explícito prevalece
                if (proximo.anoExplicito && !atual.anoExplicito) {
                    atual.inicio.setFullYear(proximo.inicio.getFullYear());
                    atual.fim.setFullYear(proximo.inicio.getFullYear());
                }
                else if (!proximo.anoExplicito && atual.anoExplicito) {
                    proximo.inicio.setFullYear(atual.inicio.getFullYear());
                    proximo.fim.setFullYear(atual.inicio.getFullYear());
                }
                else if (!proximo.anoExplicito && !atual.anoExplicito) {
                    if (proximo.fim < atual.inicio) {
                        proximo.inicio.setFullYear(atual.inicio.getFullYear());
                        proximo.fim.setFullYear(atual.inicio.getFullYear());
                    }
                }

                atual.fim = proximo.fim;
                atual.texto = frase.substring(atual.index, proximo.index + proximo.length);
                atual.length = atual.texto.length;

            } else {
                resultados.push(this._formatarSaida(atual));
                atual = proximo;
            }
        }

        resultados.push(this._formatarSaida(atual));
        return resultados;
    }

    _deveAtivar(frase) {
        if (!frase) return false;

        const regexMes = /\b(janeiro|jan|fevereiro|fev|marco|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez)\b/i;
        const regexPeriodo = /\b(bimestre|trimestre|quadrimestre|semestre)\b/i;
        const regexDataNumerica = /\b\d{1,2}[\/\.]\d{1,2}([\/\.]\d{2,4})?\b/;

        return (
            regexMes.test(frase) ||
            regexPeriodo.test(frase) ||
            regexDataNumerica.test(frase)
        );
    }

    _parseFragmento(texto, anoReferencia, hoje) {
        const str = texto.toLowerCase().trim();

        let dia = 1;
        let mes = -1;
        let ano = anoReferencia;
        let ehAgrupado = false;
        let mesesDuracao = 1;
        let anoExplicito = false;

        // Ano isolado
        const matchAnoIsolado = str.match(/^\d{4}$/);
        if (matchAnoIsolado) {
            ano = parseInt(matchAnoIsolado[0]);
            return {
                inicio: new Date(ano, 0, 1),
                fim: new Date(ano, 11, 31),
                anoExplicito: true
            };
        }

        // Períodos agrupados
        for (const [nome, meses] of Object.entries(this.periodosAgrupados)) {
            if (str.includes(nome)) {

                let ordinal = 1;

                for (const [nNome, nVal] of Object.entries(this.numerais)) {
                    if (str.includes(nNome)) {
                        ordinal = nVal;
                        break;
                    }
                }

                const mOrdinal = str.match(/(\d+)\s*[oº°]/);
                if (mOrdinal) {
                    ordinal = parseInt(mOrdinal[1]);
                }

                mes = (ordinal - 1) * meses;
                mesesDuracao = meses;
                ehAgrupado = true;
                break;
            }
        }

        // Data numérica
        const matchNumerico = str.match(/(\d{1,2})[\/\.](\d{1,2})/);
        if (matchNumerico) {
            dia = parseInt(matchNumerico[1]);
            mes = parseInt(matchNumerico[2]) - 1;
        }

        // Dia + mês por extenso
        const matchDiaMes = str.match(/(\d{1,2})\s+de\s+([a-z]+)/);
        if (matchDiaMes) {
            dia = parseInt(matchDiaMes[1]);
            mes = this.meses[matchDiaMes[2]] ?? -1;
        }

        // Apenas mês
        for (const [nome, idx] of Object.entries(this.meses)) {
            if (str.includes(nome)) {
                mes = idx;
                break;
            }
        }

        const matchAno = str.match(/\b(20\d{2})\b/);
        if (matchAno) {
            ano = parseInt(matchAno[1]);
            anoExplicito = true;
        }

        if (mes === -1) return null;

        if (!anoExplicito) {
            const dataTeste = new Date(ano, mes, dia);
            if (dataTeste > hoje) ano -= 1;
        }

        const dataInicio = new Date(ano, mes, dia);

        let dataFim;

        if (ehAgrupado) {
            dataFim = new Date(ano, mes + mesesDuracao, 0);
        } else {
            const temDiaExplicito =
                /^\d{1,2}\s+de/i.test(str) ||
                /\d{1,2}[\/\.]\d{1,2}/.test(str);

            if (temDiaExplicito) {
                dataFim = new Date(ano, mes, dia);
            } else {
                dataFim = new Date(ano, mes + 1, 0);
            }
        }

        return { inicio: dataInicio, fim: dataFim, anoExplicito };
    }

    _formatarSaida(obj) {
        return {
            data_inicio: this._dateToStr(obj.inicio),
            data_fim: this._dateToStr(obj.fim),
            trecho_encontrado: obj.texto.trim()
        };
    }

    _dateToStr(data) {
        const y = data.getFullYear();
        const d = String(data.getDate()).padStart(2, '0');
        const m = String(data.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
}

module.exports = PeriodoService;