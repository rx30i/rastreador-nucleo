"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclararFilasRabbitMqService = void 0;
class DeclararFilasRabbitMqService {
    rabbitMqFilaCmdPausa;
    rabbitMqFilaCmd;
    constructor(rabbitMqFilaCmdPausa, rabbitMqFilaCmd) {
        this.rabbitMqFilaCmdPausa = rabbitMqFilaCmdPausa;
        this.rabbitMqFilaCmd = rabbitMqFilaCmd;
    }
    async declararExchange(channel) {
        await channel.assertExchange('amq.direct', 'direct', { durable: true });
    }
    async declararQueue(channel) {
        await Promise.all([
            this.queueRastreadorErro(channel),
            this.queueRastreadorMensagem(channel),
            this.queueRastreadorMensagemPausa(channel),
            this.queueRastreadorCmd(channel),
            this.queueRastreadorCmdPausa(channel),
        ]);
    }
    async bind(channel) {
        await Promise.all([
            channel.bindQueue('rastreador.mensagem.pausa', 'amq.direct', 'rastreador.mensagem.pausa'),
            channel.bindQueue('rastreador.mensagem', 'amq.direct', 'rastreador.mensagem'),
            channel.bindQueue('rastreador.erro', 'amq.direct', 'rastreador.erro'),
            channel.bindQueue(this.rabbitMqFilaCmdPausa, 'amq.direct', this.rabbitMqFilaCmdPausa),
            channel.bindQueue(this.rabbitMqFilaCmd, 'amq.direct', this.rabbitMqFilaCmd),
        ]);
    }
    queueRastreadorErro(channel) {
        return channel.assertQueue('rastreador.erro', { durable: true });
    }
    queueRastreadorMensagem(channel) {
        return channel.assertQueue('rastreador.mensagem', {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': 'amq.direct',
                'x-dead-letter-routing-key': 'rastreador.mensagem.pausa',
            },
        });
    }
    queueRastreadorMensagemPausa(channel) {
        return channel.assertQueue('rastreador.mensagem.pausa', {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': 'amq.direct',
                'x-dead-letter-routing-key': 'rastreador.mensagem',
                'x-message-ttl': 60000,
            },
        });
    }
    queueRastreadorCmd(channel) {
        return channel.assertQueue(this.rabbitMqFilaCmd, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': 'amq.direct',
                'x-dead-letter-routing-key': this.rabbitMqFilaCmdPausa,
            },
        });
    }
    queueRastreadorCmdPausa(channel) {
        return channel.assertQueue(this.rabbitMqFilaCmdPausa, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': 'amq.direct',
                'x-dead-letter-routing-key': this.rabbitMqFilaCmd,
                'x-message-ttl': 5000,
            },
        });
    }
}
exports.DeclararFilasRabbitMqService = DeclararFilasRabbitMqService;
//# sourceMappingURL=declarar-filas-rabbitmq.service.js.map