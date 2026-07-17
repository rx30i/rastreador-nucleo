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
const enums_1 = require("../../enums");
const ctx_host_1 = require("../ctx-host");
const separar_mensagens_1 = require("./separar-mensagens");
const Net = __importStar(require("node:net"));
class ServidorTcp extends microservices_1.Server {
    static conexoesTcp = new Map();
    configuracao;
    conexoesAtivas = new Set();
    mensagensIncompletasPorSocket = new WeakMap();
    processamentosPorSocket = new WeakMap();
    separarMsgs;
    encerrandoServidor = false;
    servidor;
    constructor(configuracao) {
        super();
        this.configuracao = configuracao;
        this.separarMsgs = new separar_mensagens_1.SepararMensagens(this.configuracao);
        this.initializeDeserializer(configuracao);
    }
    listen(callback) {
        this.encerrandoServidor = false;
        this.servidor = Net.createServer((socket) => {
            this.configurarConexao(socket);
        });
        this.servidor.listen(this.configuracao.servidor, callback);
    }
    on(evento, callback) {
        this.servidor?.on(evento, callback);
    }
    unwrap() {
        return this.servidor;
    }
    static obterConexao(imei) {
        const conexao = ServidorTcp.conexoesTcp.get(imei);
        if (conexao === undefined) {
            return null;
        }
        if (conexao.destroyed) {
            ServidorTcp.conexoesTcp.delete(imei);
            return null;
        }
        return conexao;
    }
    close() {
        this.encerrandoServidor = true;
        for (const socket of [...this.conexoesAtivas]) {
            this.removerEstadoDaConexao(socket);
            socket.destroy();
        }
        if (this.servidor?.listening === true) {
            this.servidor.close();
        }
    }
    configurarConexao(socket) {
        this.conexoesAtivas.add(socket);
        this.mensagem(socket);
        this.conexaoErro(socket);
        this.timeOut(socket);
        this.monitorarConexaoFechada(socket);
        this.qtdDispositivosConectados();
    }
    mensagem(socket) {
        this.conexoesAtivas.add(socket);
        socket.on('data', (mensagemRecebida) => {
            this.enfileirarProcessamento(socket, mensagemRecebida);
        });
    }
    enfileirarProcessamento(socket, mensagemRecebida) {
        const processamentoAnterior = this.processamentosPorSocket.get(socket) ?? Promise.resolve();
        const processamentoAtual = processamentoAnterior.then(async () => {
            await this.processarDadosRecebidos(socket, mensagemRecebida);
        });
        const processamentoProtegido = processamentoAtual.catch((erro) => {
            this.registrarErroProcessamento(erro);
        });
        this.processamentosPorSocket.set(socket, processamentoProtegido);
    }
    async processarDadosRecebidos(socket, mensagemRecebida) {
        if (!this.conexoesAtivas.has(socket)) {
            return;
        }
        const mensagens = this.separarMensagensComBruto(mensagemRecebida, socket);
        for (const mensagemSeparada of mensagens) {
            if (!this.conexoesAtivas.has(socket)) {
                return;
            }
            await this.processarMensagemComTratamento(socket, mensagemSeparada);
        }
    }
    async processarMensagemComTratamento(socket, mensagemSeparada) {
        try {
            await this.processarMensagem(socket, mensagemSeparada);
        }
        catch (erro) {
            this.registrarErroProcessamento(erro);
        }
    }
    async processarMensagem(socket, mensagemSeparada) {
        const evento = await this.deserializer.deserialize(mensagemSeparada.mensagem);
        if (!this.conexoesAtivas.has(socket)) {
            return;
        }
        const consumidor = this.getHandlerByPattern(evento.pattern);
        if (consumidor === null) {
            this.registrarConsumidorAusente(mensagemSeparada.mensagem);
            return;
        }
        if (consumidor.isEventHandler !== true) {
            this.registrarConsumidorIncompativel(mensagemSeparada.mensagem);
            return;
        }
        this.salvarConexao(socket, mensagemSeparada.mensagem);
        const contexto = this.criarContexto(socket, mensagemSeparada);
        await this.handleEvent(evento.pattern, evento, contexto);
    }
    criarContexto(socket, mensagemSeparada) {
        return new ctx_host_1.TcpContext([
            socket,
            mensagemSeparada.mensagem,
            (imei) => ServidorTcp.obterConexao(imei),
            mensagemSeparada.mensagemBruta,
        ]);
    }
    registrarConsumidorAusente(mensagem) {
        this.configuracao.tratarErro.error(`Class ServidorTcp Não há um consumidor para a mensagem ${mensagem}`);
    }
    registrarConsumidorIncompativel(mensagem) {
        this.configuracao.tratarErro.error(`Class ServidorTcp O consumidor deve ser registrado com @EventPattern ${mensagem}`);
    }
    registrarErroProcessamento(erro) {
        this.configuracao.tratarErro.error('ServidorTcp', this.obterDescricaoErro(erro));
    }
    obterDescricaoErro(erro) {
        if (erro instanceof Error) {
            return erro.stack ?? erro.message;
        }
        return String(erro);
    }
    timeOut(socket) {
        socket.setTimeout(600000);
        socket.on('timeout', () => {
            socket.destroy();
        });
    }
    monitorarConexaoFechada(socket) {
        socket.once('close', () => {
            void this.clienteDesconectou(socket).catch((erro) => {
                this.registrarErroProcessamento(erro);
            });
        });
    }
    async clienteDesconectou(socket) {
        if (!this.conexoesAtivas.has(socket)) {
            return;
        }
        const imei = this.removerEstadoDaConexao(socket);
        if (imei === null || this.encerrandoServidor) {
            return;
        }
        await this.emitirEventoConexaoFechada(imei);
    }
    removerEstadoDaConexao(socket) {
        this.conexoesAtivas.delete(socket);
        this.processamentosPorSocket.delete(socket);
        this.descartarMensagemIncompleta(socket);
        const imei = socket.imei;
        if (imei === undefined) {
            return null;
        }
        const conexaoRegistrada = ServidorTcp.conexoesTcp.get(imei);
        if (conexaoRegistrada !== undefined && conexaoRegistrada !== socket) {
            return null;
        }
        if (conexaoRegistrada === socket) {
            ServidorTcp.conexoesTcp.delete(imei);
        }
        return imei;
    }
    async emitirEventoConexaoFechada(imei) {
        const evento = {
            pattern: enums_1.Pattern.CONEXAO_FECHADA,
            data: {
                imei,
                dataHora: new Date().toISOString(),
            },
        };
        const consumidor = this.getHandlerByPattern(evento.pattern);
        if (consumidor?.isEventHandler !== true) {
            return;
        }
        await this.handleEvent(evento.pattern, evento, new microservices_1.BaseRpcContext([]));
    }
    conexaoErro(socket) {
        socket.on('error', (erro) => {
            const codigoErro = erro.code;
            if (codigoErro !== 'ECONNRESET') {
                this.configuracao.tratarErro.error('ServidorTcp', erro.stack ?? erro.message);
            }
            socket.destroy();
        });
    }
    salvarConexao(conexao, mensagem) {
        if (!this.conexoesAtivas.has(conexao) || conexao.destroyed) {
            return;
        }
        const rastreadorImei = this.configuracao.deserializer.obterImei(mensagem);
        if (conexao.imei === undefined && rastreadorImei !== '') {
            ServidorTcp.conexoesTcp.set(rastreadorImei, conexao);
            conexao.imei = rastreadorImei;
            conexao.id = Symbol();
        }
    }
    qtdDispositivosConectados() {
        this.servidor?.getConnections((erro, quantidade) => {
            if (erro !== null) {
                this.configuracao.tratarErro.error(erro);
                return;
            }
            const evento = {
                pattern: enums_1.Pattern.QTD_DISPOSITIVOS_CONECTADOS,
                data: {
                    qtd: quantidade,
                    dataHora: new Date().toISOString(),
                },
            };
            const consumidor = this.getHandlerByPattern(evento.pattern);
            if (consumidor?.isEventHandler !== true) {
                return;
            }
            this.handleEvent(evento.pattern, evento, new microservices_1.BaseRpcContext([])).catch((erroEvento) => {
                this.registrarErroProcessamento(erroEvento);
            });
        });
    }
    separarMensagens(mensagem) {
        return this.separarMensagensComBruto(mensagem)
            .map((mensagemSeparada) => mensagemSeparada.mensagem);
    }
    separarMensagensComBruto(mensagem, socket) {
        const mensagemRecebida = mensagem.toString(this.configuracao.codificacaoMsg);
        if (socket !== undefined) {
            return this.separarMensagensMantendoEstadoDoSocket(socket, mensagemRecebida);
        }
        return this.separarMsgs.obterMensagensComBruto(mensagemRecebida);
    }
    separarMensagensMantendoEstadoDoSocket(socket, mensagemRecebida) {
        const mensagemPendente = this.mensagensIncompletasPorSocket.get(socket) ?? '';
        const resultado = this.separarMsgs.obterResultadoSeparacao(`${mensagemPendente}${mensagemRecebida}`);
        this.atualizarMensagemIncompleta(socket, resultado.mensagemIncompleta);
        return resultado.mensagens;
    }
    atualizarMensagemIncompleta(socket, mensagemIncompleta) {
        if (mensagemIncompleta === '') {
            this.mensagensIncompletasPorSocket.delete(socket);
            return;
        }
        this.mensagensIncompletasPorSocket.set(socket, mensagemIncompleta);
    }
    descartarMensagemIncompleta(socket) {
        const mensagemIncompleta = this.mensagensIncompletasPorSocket.get(socket);
        if (mensagemIncompleta === undefined) {
            return;
        }
        this.mensagensIncompletasPorSocket.delete(socket);
        this.configuracao.tratarErro.error(`Class ServidorTcp Quadro incompleto descartado ${mensagemIncompleta}`);
    }
}
exports.ServidorTcp = ServidorTcp;
//# sourceMappingURL=servidor-tcp.js.map