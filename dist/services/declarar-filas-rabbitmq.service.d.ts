export declare class DeclararFilasRabbitMqService {
    private readonly rabbitMqFilaCmdPausa;
    private readonly rabbitMqFilaCmd;
    constructor(rabbitMqFilaCmdPausa: string, rabbitMqFilaCmd: string);
    private declararExchange;
    private declararQueue;
    private bind;
    private queueRastreadorErro;
    private queueRastreadorMensagem;
    private queueRastreadorMensagemPausa;
    private queueRastreadorCmd;
    private queueRastreadorCmdPausa;
}
