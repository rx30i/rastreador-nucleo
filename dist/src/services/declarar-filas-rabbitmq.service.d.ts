import * as amqplib from 'amqplib';
export declare class DeclararFilasRabbitMqService {
    private readonly rabbitMqFilaCmdPausa;
    private readonly rabbitMqFilaCmd;
    constructor(rabbitMqFilaCmdPausa: string, rabbitMqFilaCmd: string);
    declararExchange(canal: amqplib.Channel): Promise<void>;
    declararFila(canal: amqplib.Channel): Promise<void>;
    vincular(canal: amqplib.Channel): Promise<void>;
    private criarFilaRastreadorErro;
    private criarFilaRastreadorMensagem;
    private criarFilaRastreadorMensagemPausa;
    private criarFilaRastreadorCmd;
    private criarFilaRastreadorCmdPausa;
}
