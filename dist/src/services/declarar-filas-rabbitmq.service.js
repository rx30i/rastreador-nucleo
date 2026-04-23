"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclararFilasRabbitMqService = void 0;
const enums_1 = require("../enums");
class DeclararFilasRabbitMqService {
    rabbitMqFilaCmdPausa;
    rabbitMqFilaCmd;
    constructor(rabbitMqFilaCmdPausa, rabbitMqFilaCmd) {
        this.rabbitMqFilaCmdPausa = rabbitMqFilaCmdPausa;
        this.rabbitMqFilaCmd = rabbitMqFilaCmd;
    }
    async declararExchange(canal) {
        await canal.assertExchange(enums_1.RABBITMQ_EXCHANGE_DIRETO, 'direct', { durable: true });
    }
    async declararFila(canal) {
        await Promise.all([
            this.criarFilaRastreadorErro(canal),
            this.criarFilaRastreadorMensagem(canal),
            this.criarFilaRastreadorMensagemPausa(canal),
            this.criarFilaRastreadorCmd(canal),
            this.criarFilaRastreadorCmdPausa(canal),
        ]);
    }
    async vincular(canal) {
        const vinculacoes = [
            canal.bindQueue(enums_1.RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA, enums_1.RABBITMQ_EXCHANGE_DIRETO, enums_1.RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA),
            canal.bindQueue(enums_1.RABBITMQ_FILA_RASTREADOR_MENSAGEM, enums_1.RABBITMQ_EXCHANGE_DIRETO, enums_1.RABBITMQ_FILA_RASTREADOR_MENSAGEM),
            canal.bindQueue(enums_1.RABBITMQ_FILA_RASTREADOR_ERRO, enums_1.RABBITMQ_EXCHANGE_DIRETO, enums_1.RABBITMQ_FILA_RASTREADOR_ERRO),
            canal.bindQueue(this.rabbitMqFilaCmdPausa, enums_1.RABBITMQ_EXCHANGE_DIRETO, this.rabbitMqFilaCmdPausa),
            canal.bindQueue(this.rabbitMqFilaCmd, enums_1.RABBITMQ_EXCHANGE_DIRETO, this.rabbitMqFilaCmd),
        ];
        await Promise.all(vinculacoes);
    }
    criarFilaRastreadorErro(canal) {
        return canal.assertQueue(enums_1.RABBITMQ_FILA_RASTREADOR_ERRO, { durable: true });
    }
    criarFilaRastreadorMensagem(canal) {
        return canal.assertQueue(enums_1.RABBITMQ_FILA_RASTREADOR_MENSAGEM, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': enums_1.RABBITMQ_EXCHANGE_DIRETO,
                'x-dead-letter-routing-key': enums_1.RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA,
            },
        });
    }
    criarFilaRastreadorMensagemPausa(canal) {
        return canal.assertQueue(enums_1.RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': enums_1.RABBITMQ_EXCHANGE_DIRETO,
                'x-dead-letter-routing-key': enums_1.RABBITMQ_FILA_RASTREADOR_MENSAGEM,
                'x-message-ttl': enums_1.RABBITMQ_TTL_MENSAGEM_PAUSA,
            },
        });
    }
    criarFilaRastreadorCmd(canal) {
        return canal.assertQueue(this.rabbitMqFilaCmd, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': enums_1.RABBITMQ_EXCHANGE_DIRETO,
                'x-dead-letter-routing-key': this.rabbitMqFilaCmdPausa,
            },
        });
    }
    criarFilaRastreadorCmdPausa(canal) {
        return canal.assertQueue(this.rabbitMqFilaCmdPausa, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': enums_1.RABBITMQ_EXCHANGE_DIRETO,
                'x-dead-letter-routing-key': this.rabbitMqFilaCmd,
                'x-message-ttl': enums_1.RABBITMQ_TTL_COMANDO_PAUSA,
            },
        });
    }
}
exports.DeclararFilasRabbitMqService = DeclararFilasRabbitMqService;
//# sourceMappingURL=declarar-filas-rabbitmq.service.js.map