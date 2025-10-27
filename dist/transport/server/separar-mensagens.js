"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SepararMensagens = void 0;
class SepararMensagens {
    servidorTCPConfig;
    constructor(servidorTCPConfig) {
        this.servidorTCPConfig = servidorTCPConfig;
    }
    obterMensagens(mensagem) {
        const arrayMensagens = [];
        if (!mensagem || typeof mensagem !== 'string' || mensagem.length === 0) {
            return arrayMensagens;
        }
        if (this.prefixoInformado() && this.sufixoInformado()) {
            return this.separarMsgPeloPrefixoSufixo(mensagem);
        }
        if (this.prefixoInformado()) {
            return this.separarMsgPeloPrefixo(mensagem);
        }
        if (this.sufixoInformado()) {
            return this.separarMsgPeloSufixo(mensagem);
        }
        if (this.delimitadorInformado()) {
            return this.separarMsgPeloPrefixo(mensagem);
        }
        return arrayMensagens;
    }
    prefixoInformado() {
        return typeof this.servidorTCPConfig.prefixo === 'string' &&
            this.servidorTCPConfig.prefixo.length > 0;
    }
    sufixoInformado() {
        return typeof this.servidorTCPConfig.sufixo === 'string' &&
            this.servidorTCPConfig.sufixo.length > 0;
    }
    delimitadorInformado() {
        return typeof this.servidorTCPConfig.delimitadorMsg === 'string' &&
            this.servidorTCPConfig.delimitadorMsg.length > 0;
    }
    separarMsgPeloPrefixo(mensagem) {
        const mensagens = [];
        const msgNormalizada = mensagem.toLowerCase();
        const prefixo = this.servidorTCPConfig.prefixo?.toLowerCase();
        if (typeof prefixo !== 'string' || prefixo.length === 0 ||
            !msgNormalizada.startsWith(prefixo)) {
            return mensagens;
        }
        const msgAtualizada = msgNormalizada.replace(new RegExp(prefixo, 'g'), `@@@${prefixo}`);
        const conjutoMsg = msgAtualizada.split('@@@');
        for (const resposta of conjutoMsg) {
            if (typeof resposta === 'string' && resposta !== '') {
                mensagens.push(resposta.replace(/(\r\n|\n|\r)/gm, ''));
            }
        }
        return mensagens;
    }
    separarMsgPeloSufixo(mensagem) {
        const mensagens = [];
        const msgNormalizada = mensagem.toLowerCase();
        const sufixo = this.servidorTCPConfig.sufixo?.toLowerCase();
        if (typeof sufixo !== 'string' || sufixo.length === 0) {
            return mensagens;
        }
        if ((msgNormalizada.match(new RegExp(sufixo, 'g')) || []).length == 0) {
            return mensagens;
        }
        const msgAtualizada = msgNormalizada.replace(new RegExp(sufixo, 'g'), `${sufixo}@@@`);
        const conjutoMsg = msgAtualizada.split('@@@');
        console.log(msgAtualizada);
        for (const resposta of conjutoMsg) {
            if (typeof resposta === 'string' && resposta.endsWith(sufixo)) {
                mensagens.push(resposta.replace(/(\r\n|\n|\r)/gm, ''));
            }
        }
        return mensagens;
    }
    separarMsgPeloPrefixoSufixo(mensagem) {
        let posicaoAtual = 0;
        const mensagens = [];
        const prefixo = this.servidorTCPConfig.prefixo?.toLowerCase() ?? '';
        const sufixo = this.servidorTCPConfig.sufixo?.toLowerCase() ?? '';
        let msgNormalizada = mensagem.toLowerCase();
        while (posicaoAtual < msgNormalizada.length) {
            if (!msgNormalizada.startsWith(prefixo)) {
                break;
            }
            const posicaoSufixo = msgNormalizada.indexOf(sufixo);
            if (posicaoSufixo === -1) {
                break;
            }
            const fimMensagem = posicaoSufixo + sufixo.length;
            const msgCompleta = msgNormalizada.substring(0, fimMensagem);
            posicaoAtual = posicaoAtual + 1;
            msgNormalizada = msgNormalizada.substring(fimMensagem);
            mensagens.push(msgCompleta);
        }
        return mensagens;
    }
}
exports.SepararMensagens = SepararMensagens;
//# sourceMappingURL=separar-mensagens.js.map