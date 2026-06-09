"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SepararMensagens = void 0;
class SepararMensagens {
    servidorTCPConfig;
    constructor(servidorTCPConfig) {
        this.servidorTCPConfig = servidorTCPConfig;
    }
    obterMensagens(mensagem) {
        return this.obterMensagensComBruto(mensagem)
            .map((mensagemSeparada) => mensagemSeparada.mensagem);
    }
    obterMensagensComBruto(mensagem) {
        const mensagens = [];
        if (!mensagem || typeof mensagem !== 'string' || mensagem.length === 0) {
            return mensagens;
        }
        const prefixos = this.obterPrefixosNormalizados();
        const sufixo = this.obterSufixoNormalizado();
        if (prefixos.length > 0 && sufixo.length > 0) {
            return this.separarMsgPeloPrefixoSufixo(mensagem, prefixos, sufixo);
        }
        if (prefixos.length > 0) {
            return this.separarMsgPeloPrefixo(mensagem, prefixos);
        }
        if (sufixo.length > 0) {
            return this.separarMsgPeloSufixo(mensagem, sufixo);
        }
        return mensagens;
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
        if (!mensagemNormalizada.includes(sufixo)) {
            return mensagens;
        }
        let posicaoInicial = 0;
        let posicaoSufixo = mensagemNormalizada.indexOf(sufixo, posicaoInicial);
        while (posicaoSufixo !== -1) {
            const fimMensagem = posicaoSufixo + sufixo.length;
            const mensagemCompleta = mensagemNormalizada.substring(posicaoInicial, fimMensagem);
            const mensagemBruta = mensagem.substring(posicaoInicial, fimMensagem);
            mensagens.push(this.criarMensagemSeparada(this.removerQuebrasDeLinha(mensagemCompleta), mensagemBruta));
            posicaoInicial = fimMensagem;
            posicaoSufixo = mensagemNormalizada.indexOf(sufixo, posicaoInicial);
        }
        return mensagens;
    }
    separarMsgPeloPrefixoSufixo(mensagem, prefixos, sufixo) {
        const mensagens = [];
        const prefixosOrdenados = this.ordenarPrefixosPorTamanho(prefixos);
        const mensagemNormalizada = mensagem.toLowerCase();
        let posicaoInicial = 0;
        while (posicaoInicial < mensagemNormalizada.length) {
            if (this.obterPrefixoNaPosicao(mensagemNormalizada, prefixosOrdenados, posicaoInicial) === undefined) {
                break;
            }
            const posicaoSufixo = mensagemNormalizada.indexOf(sufixo, posicaoInicial);
            if (posicaoSufixo === -1) {
                break;
            }
            const fimMensagem = posicaoSufixo + sufixo.length;
            const mensagemCompleta = mensagemNormalizada.substring(posicaoInicial, fimMensagem);
            const mensagemBruta = mensagem.substring(posicaoInicial, fimMensagem);
            posicaoInicial = fimMensagem;
            mensagens.push(this.criarMensagemSeparada(mensagemCompleta, mensagemBruta));
        }
        if (mensagens.length === 0) {
            mensagens.push(this.criarMensagemSeparada(mensagemNormalizada, mensagem));
        }
        return mensagens;
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
        return prefixos.find((prefixo) => mensagem.startsWith(prefixo, posicao));
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