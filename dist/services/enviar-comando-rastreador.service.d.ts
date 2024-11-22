import { ConsumeMessage } from 'amqplib';
import { ComandoUsuarioEntity } from '../entities';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ILoger } from '../contracts';
export declare class EnviarComandoRastreadorService {
    private readonly amqpConnection;
    private readonly configService;
    private readonly logger;
    private channel;
    private tentativasEnvio;
    constructor(amqpConnection: AmqpConnection, configService: ConfigService, logger: ILoger);
    receberMsgRabbitMq(callback: (mensagem: ConsumeMessage) => void): Promise<void>;
    enviarComando(mensagem: ConsumeMessage, comando: Buffer): undefined;
    private finalizarMsg;
    private rejeitarMsg;
    private naoPodeSerEnviada;
    private publicarResposta;
    decodificarMsg(msg: ConsumeMessage): ComandoUsuarioEntity;
}
