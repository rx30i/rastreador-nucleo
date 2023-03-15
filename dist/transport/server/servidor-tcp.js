"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServidorTcp = void 0;
const microservices_1 = require("@nestjs/microservices");
const node_string_decoder_1 = require("node:string_decoder");
const ctx_host_1 = require("../ctx-host");
const enums_1 = require("../../enums");
const Net = require("node:net");
class ServidorTcp extends microservices_1.Server {
    constructor(configuracao) {
        super();
        this.stringDecoder = new node_string_decoder_1.StringDecoder();
        ServidorTcp.conexoesTcp = new Map();
        this.configuracao = configuracao;
        this.initializeDeserializer(configuracao);
        this.initializeSerializer(configuracao);
    }
    listen(callback) {
        this.servidor = Net.createServer((socket) => {
            this.mensagem(socket);
            this.conexaoErro(socket);
            this.timeOut(socket);
            this.clienteEncerrouConexao(socket);
            this.qtdDispositivosConectados();
        });
        const configuracao = this.configuracao.servidor;
        this.servidor.listen(configuracao, callback);
    }
    obterConexao(imei) {
        const resposta = ServidorTcp.conexoesTcp.get(imei);
        if (resposta === undefined) {
            return null;
        }
        return resposta;
    }
    close() {
        if (this.servidor !== undefined) {
            this.servidor.close();
        }
    }
    async mensagem(socket) {
        socket.on('data', async (message) => {
            for (const resposta of this.separarMensagens(message)) {
                const tcpContexto = new ctx_host_1.TcpContext([socket, resposta, this.obterConexao]);
                const msgFormatada = await this.deserializer.deserialize(resposta);
                const consumidor = this.getHandlerByPattern(msgFormatada.pattern);
                if (consumidor === null) {
                    const erro = 'Não há um consumidor para a mensagem';
                    this.configuracao.tratarErro.error('ServidorTcp', `${erro} : ${resposta}`);
                    continue;
                }
                consumidor?.isEventHandler
                    ? this.eventPattern(tcpContexto, msgFormatada)
                    : this.messagePattern(tcpContexto, msgFormatada);
                this.salvarConexao(socket, resposta);
            }
        });
    }
    async messagePattern(tcpContexto, msgFormatada) {
        const mensagem = msgFormatada;
        const consumidor = this.getHandlerByPattern(mensagem.pattern);
        const response$ = this.transformToObservable(await consumidor(mensagem.data, tcpContexto));
        response$ && this.send(response$, data => {
            Object.assign(data, { id: mensagem.id });
            const outgoingResponse = this.serializer.serialize(data);
            tcpContexto.getSocketRef().write(Buffer.from(this.formatarResposta(outgoingResponse)));
        });
    }
    async eventPattern(tcpContexto, evento) {
        this.handleEvent(evento.pattern, evento, tcpContexto);
    }
    timeOut(socket) {
        socket.setTimeout(600000);
        socket.on('timeout', () => {
            this.clienteDesconectou(socket);
        });
    }
    clienteEncerrouConexao(socket) {
        socket.on('end', () => {
            this.clienteDesconectou(socket);
        });
    }
    clienteDesconectou(socket) {
        const imei = socket?.imei || '';
        const socketSalvo = ServidorTcp.conexoesTcp.get(imei);
        if ((socketSalvo?.id || null) === socket?.id) {
            ServidorTcp.conexoesTcp.delete(imei);
            const tempo = (new Date()).toISOString();
            const evento = { pattern: enums_1.Pattern.CONEXAO_FECHADA, data: { imei: imei, dataHora: tempo } };
            const consumidorEvento = this.getHandlerByPattern(evento.pattern);
            if (consumidorEvento?.isEventHandler) {
                this.handleEvent(evento.pattern, evento, undefined);
            }
        }
        socket.end();
        socket.destroy();
    }
    conexaoErro(socket) {
        socket.on('error', (error) => {
            if (error.message !== 'read ECONNRESET') {
                this.configuracao.tratarErro.error('ServidorTcp', error.stack || error.message);
            }
        });
    }
    salvarConexao(conexao, mensagem) {
        const rastreadorImei = this.configuracao.deserializer.obterImei(mensagem);
        if (!conexao.imei && rastreadorImei) {
            ServidorTcp.conexoesTcp.set(rastreadorImei, conexao);
            conexao.imei = rastreadorImei;
            conexao.id = Symbol();
        }
    }
    formatarResposta(mensagem) {
        const messageString = JSON.stringify(mensagem);
        const tamanhoMensagm = messageString.length;
        return `${tamanhoMensagm}#${messageString}`;
    }
    qtdDispositivosConectados() {
        this.servidor.getConnections((error, quantidade) => {
            if (error) {
                this.configuracao.tratarErro.error(error);
                return;
            }
            const tempo = (new Date()).toISOString();
            const evento = { pattern: enums_1.Pattern.DISPOSITIVOS_CONECTADOS, data: { qtd: quantidade, dataHora: tempo } };
            const consumidorEvento = this.getHandlerByPattern(evento.pattern);
            if (consumidorEvento?.isEventHandler) {
                this.handleEvent(evento.pattern, evento, undefined);
            }
        });
    }
    separarMensagens(mensagem) {
        let mensagemString = this.stringDecoder.write(mensagem);
        const quantidadeMenagem = (mensagemString.match(/\d+#{/g) || []).length;
        if (quantidadeMenagem > 0) {
            const arrayMensagens = [];
            for (let _i = 0; _i < quantidadeMenagem; _i++) {
                const posicaoDelimitador = mensagemString.indexOf('#');
                const msgSemDelimidador = mensagemString.substring(posicaoDelimitador + 1);
                const tamanhoMensagem = parseInt(mensagemString.substring(0, posicaoDelimitador), 10);
                if (!isNaN(tamanhoMensagem)) {
                    arrayMensagens.push(msgSemDelimidador.substring(0, tamanhoMensagem));
                    mensagemString = msgSemDelimidador.substring(tamanhoMensagem);
                }
            }
            return arrayMensagens;
        }
        const codificacao = this.configuracao.codificacaoMsg;
        const delimitador = this.configuracao.delimitadorMsg;
        const demaisMsg = mensagem.toString(codificacao);
        if (demaisMsg.slice(0, delimitador.length) === delimitador
            && (demaisMsg.match(new RegExp(delimitador, 'g')) || []).length > 0) {
            const msgAtualizada = demaisMsg.replace(new RegExp(delimitador, 'g'), `@@@${delimitador}`);
            const conjutoMsg = msgAtualizada.split('@@@');
            const novaResposta = [];
            for (const resposta of conjutoMsg) {
                if (resposta !== '') {
                    novaResposta.push(resposta.replace(/(\r\n|\n|\r)/gm, ''));
                }
            }
            return novaResposta;
        }
        return [demaisMsg];
    }
}
exports.ServidorTcp = ServidorTcp;
//# sourceMappingURL=servidor-tcp.js.map