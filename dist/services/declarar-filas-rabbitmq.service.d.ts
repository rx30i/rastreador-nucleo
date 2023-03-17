import * as amqplib from 'amqplib';
export declare class DeclararFilasRabbitMqService {
    private readonly rabbitMqFilaCmdPausa;
    private readonly rabbitMqFilaCmd;
    constructor(rabbitMqFilaCmdPausa: string, rabbitMqFilaCmd: string);
    declararExchange(channel: amqplib.Channel): Promise<void>;
    declararQueue(channel: amqplib.Channel): Promise<void>;
    bind(channel: amqplib.Channel): Promise<void>;
    private queueRastreadorErro;
    private queueRastreadorMensagem;
    private queueRastreadorMensagemPausa;
    private queueMensagemTempoReal;
    private queueRastreadorCmd;
    private queueRastreadorCmdPausa;
}
