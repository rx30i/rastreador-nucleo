"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServidorTcp = void 0;
const microservices_1 = require("@nestjs/microservices");
const separar_mensagens_1 = require("./separar-mensagens");
const node_string_decoder_1 = require("node:string_decoder");
const ctx_host_1 = require("../ctx-host");
const enums_1 = require("../../enums");
const Net = __importStar(require("node:net"));
class ServidorTcp extends microservices_1.Server {
    stringDecoder = new node_string_decoder_1.StringDecoder();
    configuracao;
    static conexoesTcp;
    separarMsgs;
    servidor;
    constructor(configuracao) {
        super();
        ServidorTcp.conexoesTcp = new Map();
        this.configuracao = configuracao;
        this.separarMsgs = new separar_mensagens_1.SepararMensagens(this.configuracao);
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
    on(evento, callback) {
        this.servidor?.on(evento, callback);
    }
    unwrap() {
        return this.servidor;
    }
    static obterConexao(imei) {
        const resposta = ServidorTcp.conexoesTcp.get(imei);
        if (resposta === undefined) {
            return null;
        }
        return resposta;
    }
    close() {
        if (this.servidor === undefined) {
            return;
        }
        for (const socket of ServidorTcp.conexoesTcp.values()) {
            socket.destroy();
        }
        ServidorTcp.conexoesTcp.clear();
        this.servidor.close();
    }
    mensagem(socket) {
        socket.on('data', (message) => void (async () => {
            console.log('SERVIDOR HEX: ', message.toString('hex'));
            console.log('SERVIDOR ASCII: ', message.toString());
            for (const resposta of this.separarMensagens(message)) {
                const tcpContexto = new ctx_host_1.TcpContext([socket, resposta, (imei) => ServidorTcp.obterConexao(imei)]);
                const msgFormatada = await this.deserializer.deserialize(resposta);
                const consumidor = this.getHandlerByPattern(msgFormatada.pattern);
                if (consumidor === null) {
                    const erro = 'Não há um consumidor para a mensagem';
                    this.configuracao.tratarErro.error(`Class ServidorTcp ${erro} ${resposta}`);
                    continue;
                }
                this.salvarConexao(socket, resposta);
                if (consumidor.isEventHandler === true) {
                    await this.eventPattern(tcpContexto, msgFormatada);
                }
                else {
                    await this.messagePattern(tcpContexto, msgFormatada);
                }
            }
        })());
    }
    async messagePattern(tcpContexto, msgFormatada) {
        const mensagem = msgFormatada;
        const consumidor = this.getHandlerByPattern(mensagem.pattern);
        if (consumidor === null) {
            return;
        }
        const response$ = this.transformToObservable(await consumidor(mensagem.data, tcpContexto));
        this.send(response$, (data) => {
            Object.assign(data, { id: mensagem.id });
            const outgoingResponse = this.serializer.serialize(data);
            tcpContexto.getSocketRef()?.write(Buffer.from(this.formatarResposta(outgoingResponse)));
        });
    }
    async eventPattern(tcpContexto, evento) {
        await this.handleEvent(evento.pattern, evento, tcpContexto);
    }
    timeOut(socket) {
        socket.setTimeout(600000);
        socket.on('timeout', () => {
            this.clienteDesconectou(socket).catch((erro) => {
                this.configuracao.tratarErro.error(erro);
            });
        });
    }
    clienteEncerrouConexao(socket) {
        socket.on('end', () => {
            this.clienteDesconectou(socket).catch((erro) => {
                this.configuracao.tratarErro.error(erro);
            });
        });
    }
    async clienteDesconectou(socket) {
        const imei = socket.imei ?? '';
        const socketSalvo = ServidorTcp.conexoesTcp.get(imei);
        if ((socketSalvo?.id ?? null) === socket.id) {
            ServidorTcp.conexoesTcp.delete(imei);
            const tempo = (new Date()).toISOString();
            const evento = { pattern: enums_1.Pattern.CONEXAO_FECHADA, data: { imei: imei, dataHora: tempo } };
            const consumidorEvento = this.getHandlerByPattern(evento.pattern);
            if (consumidorEvento?.isEventHandler) {
                await this.handleEvent(evento.pattern, evento, {});
            }
        }
        socket.end();
        socket.destroy();
    }
    conexaoErro(socket) {
        socket.on('error', (error) => {
            if (error.message === 'read ECONNRESET') {
                this.clienteDesconectou(socket).catch((erro) => {
                    this.configuracao.tratarErro.error(erro);
                });
            }
            if (error.message !== 'read ECONNRESET') {
                this.configuracao.tratarErro.error('ServidorTcp', error.stack ?? error.message);
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
        return `${tamanhoMensagm.toString()}#${messageString}`;
    }
    qtdDispositivosConectados() {
        this.servidor?.getConnections((error, quantidade) => {
            if (error) {
                this.configuracao.tratarErro.error(error);
                return;
            }
            const tempo = (new Date()).toISOString();
            const evento = { pattern: enums_1.Pattern.QTD_DISPOSITIVOS_CONECTADOS, data: { qtd: quantidade, dataHora: tempo } };
            const consumidorEvento = this.getHandlerByPattern(evento.pattern);
            if (consumidorEvento?.isEventHandler) {
                this.handleEvent(evento.pattern, evento, {})
                    .catch((erro) => {
                    this.configuracao.tratarErro.error(erro);
                });
            }
        });
    }
    separarMensagens(mensagem) {
        let mensagemString = this.stringDecoder.write(mensagem);
        const quantidadeMenagem = (mensagemString.match(/\d+#{/g) ?? []).length;
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
        const demaisMsg = mensagem.toString(codificacao);
        return this.separarMsgs.obterMensagens(demaisMsg);
    }
}
exports.ServidorTcp = ServidorTcp;
//# sourceMappingURL=servidor-tcp.js.map