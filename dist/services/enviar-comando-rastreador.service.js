"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnviarComandoRastreadorService = void 0;
const entities_1 = require("../entities");
const promises_1 = require("node:timers/promises");
const transport_1 = require("../transport");
const enums_1 = require("../enums");
class EnviarComandoRastreadorService {
    constructor(amqpConnection, configService, logger) {
        this.amqpConnection = amqpConnection;
        this.configService = configService;
        this.logger = logger;
        this.tentativasEnvio = 720;
    }
    async receberMsgRabbitMq(callback) {
        const filaComandos = this.configService.get('RABBITMQ_FILA_COMANDO');
        if (!filaComandos) {
            this.logger.error('Variável de ambiente "RABBITMQ_FILA_COMANDO" não foi declarada no .env ');
            return;
        }
        this.channel = this.amqpConnection.channel;
        this.channel.prefetch(10);
        this.channel.on('close', async () => {
            await (0, promises_1.setTimeout)(60000);
            this.receberMsgRabbitMq(callback);
        });
        this.channel.consume(filaComandos, async (mensagem) => {
            this.logger.local('COMANDO CRIADO:', mensagem.content.toString('ascii'));
            callback(mensagem);
        });
    }
    enviarComando(mensagem, comando) {
        const comandoEntity = this.decodificarMsg(mensagem);
        try {
            if (comandoEntity === undefined) {
                this.channel.ack(mensagem, false);
                this.channel.publish('amq.direct', 'rastreador.erro', mensagem.content);
                return undefined;
            }
            const socket = transport_1.ServidorTcp.obterConexao(comandoEntity.imei);
            const resposta = socket?.write(comando);
            if (resposta === true) {
                this.finalizarMsg(resposta, mensagem, comandoEntity);
                return undefined;
            }
            this.rejeitarMsg(false, mensagem);
            this.naoPodeSerEnviada(false, mensagem, comandoEntity);
        }
        catch (erro) {
            this.rejeitarMsg(false, mensagem);
            this.naoPodeSerEnviada(false, mensagem, comandoEntity);
            this.logger.capiturarException(erro);
        }
    }
    finalizarMsg(msgEnviada, rabbitMqMsg, comando) {
        if (msgEnviada === true) {
            this.channel.ack(rabbitMqMsg, false);
            this.publicarResposta(enums_1.ComandoStatus.Enviado, comando);
        }
    }
    rejeitarMsg(msgEnviada, rabbitMqMsg) {
        const headers = rabbitMqMsg.properties?.headers;
        if (msgEnviada !== true && (!headers?.['x-death'] || headers['x-death'][0].count < this.tentativasEnvio)) {
            this.channel.nack(rabbitMqMsg, false, false);
        }
    }
    naoPodeSerEnviada(msgEnviada, rabbitMqMsg, comando) {
        const headers = rabbitMqMsg.properties?.headers;
        if (msgEnviada === true || !headers?.['x-death'] || headers['x-death'][0].count < this.tentativasEnvio) {
            return undefined;
        }
        if (comando instanceof entities_1.ComandoUsuarioEntity) {
            this.publicarResposta(enums_1.ComandoStatus.Erro, comando);
        }
        this.channel.ack(rabbitMqMsg, false);
        this.channel.publish('amq.direct', 'rastreador.erro', rabbitMqMsg.content);
    }
    publicarResposta(statusResposta, comando) {
        const dataHora = new Date().toISOString();
        const pattern = 'COMANDO';
        const resposta = new entities_1.RespostaComandoEntity({
            _id: comando._id,
            imei: comando.imei,
            pattern: pattern,
            dataHora: dataHora,
            status: statusResposta,
            identificador: comando.identificador,
        });
        this.logger.local('COMANDO STATUS:', resposta.json());
        resposta.validar();
        this.channel.publish('amq.direct', 'rastreador.mensagem', Buffer.from(resposta.json(), 'ascii'));
    }
    decodificarMsg(msg) {
        try {
            const mensagem = JSON.parse(msg.content.toString('ascii'));
            const comandoEntity = new entities_1.ComandoUsuarioEntity({
                _id: mensagem._id,
                modeloRastreador: mensagem.modeloRastreador,
                integracao: mensagem.integracao,
                identificador: mensagem.identificador,
                comando: mensagem.comando,
                imei: mensagem.imei,
            });
            return comandoEntity.valido() ? comandoEntity : undefined;
        }
        catch (erro) {
            this.logger.capiturarException(erro);
        }
    }
}
exports.EnviarComandoRastreadorService = EnviarComandoRastreadorService;
//# sourceMappingURL=enviar-comando-rastreador.service.js.map