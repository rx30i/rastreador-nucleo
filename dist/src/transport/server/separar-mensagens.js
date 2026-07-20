"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SepararMensagens = void 0;
const enums_1 = require("../../enums");
class SepararMensagens {
    servidorTCPConfig;
    constructor(servidorTCPConfig) {
        this.servidorTCPConfig = servidorTCPConfig;
    }
    obterMensagens(mensagem) {
        return this.obterMensagensComBruto(mensagem).map((mensagemSeparada) => mensagemSeparada.mensagem);
    }
    obterMensagensComBruto(mensagem) {
        const resultado = this.obterResultadoSeparacao(mensagem);
        if (resultado.mensagens.length === 0 &&
            resultado.mensagemIncompleta !== '') {
            return [
                this.criarMensagemSeparada(mensagem.toLowerCase(), mensagem),
            ];
        }
        return resultado.mensagens;
    }
    possuiDelimitadorSimetrico() {
        return this.configuracaoPossuiDelimitadorSimetrico(this.obterPrefixosNormalizados(), this.obterSufixoNormalizado());
    }
    obterResultadoSeparacao(mensagem) {
        if (mensagem.length === 0) {
            return {
                mensagens: [],
                mensagemIncompleta: '',
            };
        }
        const prefixos = this.obterPrefixosNormalizados();
        const sufixo = this.obterSufixoNormalizado();
        if (this.configuracaoPossuiDelimitadorSimetrico(prefixos, sufixo)) {
            return this.separarMensagensPeloDelimitadorSimetrico(mensagem, sufixo);
        }
        if (prefixos.length > 0 && sufixo.length > 0) {
            return this.separarMensagensPeloPrefixoSufixo(mensagem, prefixos, sufixo);
        }
        return {
            mensagens: this.obterMensagensPelaConfiguracao(mensagem, prefixos, sufixo),
            mensagemIncompleta: '',
        };
    }
    obterMensagensPelaConfiguracao(mensagem, prefixos, sufixo) {
        if (prefixos.length > 0) {
            return this.separarMsgPeloPrefixo(mensagem, prefixos);
        }
        if (sufixo.length > 0) {
            return this.separarMsgPeloSufixo(mensagem, sufixo);
        }
        return [
            this.criarMensagemSeparada(mensagem.toLowerCase(), mensagem),
        ];
    }
    configuracaoPossuiDelimitadorSimetrico(prefixos, sufixo) {
        return prefixos.length === 1 && prefixos[0] === sufixo;
    }
    separarMensagensPeloDelimitadorSimetrico(mensagem, delimitador) {
        const mensagens = [];
        const mensagemNormalizada = mensagem.toLowerCase();
        let posicaoInicial = 0;
        while (posicaoInicial < mensagemNormalizada.length) {
            if (!mensagemNormalizada.startsWith(delimitador, posicaoInicial)) {
                if (mensagens.length === 0) {
                    return {
                        mensagens: [
                            this.criarMensagemSeparada(mensagemNormalizada, mensagem),
                        ],
                        mensagemIncompleta: '',
                    };
                }
                return {
                    mensagens,
                    mensagemIncompleta: '',
                };
            }
            const posicaoSufixo = this.obterPosicaoDelimitador(mensagemNormalizada, delimitador, posicaoInicial + delimitador.length);
            if (posicaoSufixo === -1) {
                return {
                    mensagens,
                    mensagemIncompleta: mensagem.substring(posicaoInicial),
                };
            }
            const fimMensagem = posicaoSufixo + delimitador.length;
            const mensagemCompleta = mensagemNormalizada.substring(posicaoInicial, fimMensagem);
            const mensagemBruta = mensagem.substring(posicaoInicial, fimMensagem);
            mensagens.push(this.criarMensagemSeparada(mensagemCompleta, mensagemBruta));
            posicaoInicial = fimMensagem;
        }
        return {
            mensagens,
            mensagemIncompleta: '',
        };
    }
    obterPrefixosNormalizados() {
        const prefixoConfigurado = this.servidorTCPConfig.prefixo;
        const prefixos = Array.isArray(prefixoConfigurado)
            ? prefixoConfigurado
            : [prefixoConfigurado];
        const prefixosNormalizados = prefixos
            .filter((prefixo) => typeof prefixo === 'string')
            .map((prefixo) => prefixo.toLowerCase())
            .filter((prefixo) => prefixo.length > 0);
        return Array.from(new Set(prefixosNormalizados));
    }
    obterSufixoNormalizado() {
        const sufixo = this.servidorTCPConfig.sufixo;
        if (typeof sufixo !== 'string' || sufixo.length === 0) {
            return '';
        }
        return sufixo.toLowerCase();
    }
    separarMsgPeloPrefixo(mensagem, prefixos) {
        const mensagens = [];
        const mensagemNormalizada = mensagem.toLowerCase();
        const prefixosOrdenados = this.ordenarPrefixosPorTamanho(prefixos);
        const posicoesDosPrefixos = this.obterPosicoesDosPrefixos(mensagemNormalizada, prefixosOrdenados);
        if (posicoesDosPrefixos[0] !== 0) {
            mensagens.push(this.criarMensagemSeparada(mensagemNormalizada, mensagem));
            return mensagens;
        }
        for (let indice = 0; indice < posicoesDosPrefixos.length; indice++) {
            const posicaoInicial = posicoesDosPrefixos[indice];
            const posicaoFinal = posicoesDosPrefixos[indice + 1] ?? mensagemNormalizada.length;
            const resposta = mensagemNormalizada.substring(posicaoInicial, posicaoFinal);
            const respostaBruta = mensagem.substring(posicaoInicial, posicaoFinal);
            if (resposta !== '') {
                mensagens.push(this.criarMensagemSeparada(this.removerQuebrasDeLinha(resposta), respostaBruta));
            }
        }
        return mensagens;
    }
    separarMsgPeloSufixo(mensagem, sufixo) {
        const mensagens = [];
        const mensagemNormalizada = mensagem.toLowerCase();
        let posicaoInicial = 0;
        let posicaoSufixo = this.obterPosicaoDelimitador(mensagemNormalizada, sufixo, posicaoInicial);
        while (posicaoSufixo !== -1) {
            const fimMensagem = posicaoSufixo + sufixo.length;
            const mensagemCompleta = mensagemNormalizada.substring(posicaoInicial, fimMensagem);
            const mensagemBruta = mensagem.substring(posicaoInicial, fimMensagem);
            mensagens.push(this.criarMensagemSeparada(this.removerQuebrasDeLinha(mensagemCompleta), mensagemBruta));
            posicaoInicial = fimMensagem;
            posicaoSufixo = this.obterPosicaoDelimitador(mensagemNormalizada, sufixo, posicaoInicial);
        }
        return mensagens;
    }
    separarMensagensPeloPrefixoSufixo(mensagem, prefixos, sufixo) {
        const mensagens = [];
        const prefixosOrdenados = this.ordenarPrefixosPorTamanho(prefixos);
        const mensagemNormalizada = mensagem.toLowerCase();
        let posicaoInicial = 0;
        while (posicaoInicial < mensagemNormalizada.length) {
            const prefixo = this.obterPrefixoNaPosicao(mensagemNormalizada, prefixosOrdenados, posicaoInicial);
            if (prefixo === undefined) {
                return this.criarResultadoSemPrefixoCompleto(mensagem, mensagemNormalizada, prefixosOrdenados, posicaoInicial, mensagens);
            }
            const posicaoSufixo = this.obterPosicaoDelimitador(mensagemNormalizada, sufixo, posicaoInicial + prefixo.length);
            if (posicaoSufixo === -1) {
                return {
                    mensagens,
                    mensagemIncompleta: mensagem.substring(posicaoInicial),
                };
            }
            const fimMensagem = posicaoSufixo + sufixo.length;
            const mensagemCompleta = mensagemNormalizada.substring(posicaoInicial, fimMensagem);
            const mensagemBruta = mensagem.substring(posicaoInicial, fimMensagem);
            posicaoInicial = fimMensagem;
            mensagens.push(this.criarMensagemSeparada(mensagemCompleta, mensagemBruta));
        }
        return {
            mensagens,
            mensagemIncompleta: '',
        };
    }
    criarResultadoSemPrefixoCompleto(mensagem, mensagemNormalizada, prefixos, posicaoInicial, mensagens) {
        const mensagemRestante = mensagemNormalizada.substring(posicaoInicial);
        if (this.podeSerInicioDePrefixo(mensagemRestante, prefixos)) {
            return {
                mensagens,
                mensagemIncompleta: mensagem.substring(posicaoInicial),
            };
        }
        if (mensagens.length === 0) {
            mensagens.push(this.criarMensagemSeparada(mensagemNormalizada, mensagem));
        }
        return {
            mensagens,
            mensagemIncompleta: '',
        };
    }
    podeSerInicioDePrefixo(mensagem, prefixos) {
        return prefixos.some((prefixo) => prefixo.startsWith(mensagem));
    }
    ordenarPrefixosPorTamanho(prefixos) {
        return [...prefixos].sort((primeiroPrefixo, segundoPrefixo) => segundoPrefixo.length - primeiroPrefixo.length);
    }
    obterPosicoesDosPrefixos(mensagem, prefixos) {
        const posicoes = [];
        let posicaoAtual = 0;
        while (posicaoAtual < mensagem.length) {
            const prefixo = this.obterPrefixoNaPosicao(mensagem, prefixos, posicaoAtual);
            if (prefixo === undefined) {
                posicaoAtual = posicaoAtual + 1;
                continue;
            }
            posicoes.push(posicaoAtual);
            posicaoAtual = posicaoAtual + prefixo.length;
        }
        return posicoes;
    }
    obterPrefixoNaPosicao(mensagem, prefixos, posicao) {
        if (!this.posicaoDelimitadorEstaAlinhada(posicao)) {
            return undefined;
        }
        return prefixos.find((prefixo) => mensagem.startsWith(prefixo, posicao));
    }
    obterPosicaoDelimitador(mensagem, delimitador, posicaoInicial) {
        let posicaoDelimitador = mensagem.indexOf(delimitador, posicaoInicial);
        while (posicaoDelimitador !== -1 &&
            !this.posicaoDelimitadorEstaAlinhada(posicaoDelimitador)) {
            posicaoDelimitador = mensagem.indexOf(delimitador, posicaoDelimitador + 1);
        }
        return posicaoDelimitador;
    }
    posicaoDelimitadorEstaAlinhada(posicao) {
        return (this.servidorTCPConfig.codificacaoMsg !== enums_1.CodificacaoMsg.HEX ||
            posicao % 2 === 0);
    }
    removerQuebrasDeLinha(mensagem) {
        return mensagem.replace(/(\r\n|\n|\r)/gm, '');
    }
    criarMensagemSeparada(mensagem, mensagemBruta) {
        return {
            mensagem,
            mensagemBruta,
        };
    }
}
exports.SepararMensagens = SepararMensagens;
//# sourceMappingURL=separar-mensagens.js.map