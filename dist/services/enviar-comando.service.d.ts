import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ILoger } from '../contracts';
export declare class EnviarComandoService {
    private readonly clientProxy;
    private readonly amqpConnection;
    private readonly configService;
    private readonly logger;
    private channel;
    private tentativasEnvio;
    constructor(clientProxy: ClientProxy, amqpConnection: AmqpConnection, configService: ConfigService, logger: ILoger);
    receberMsgRabbitMq(): Promise<void>;
    private enviarComando;
    private finalizarMsg;
    private rejeitarMsg;
    private naoPodeSerEnviada;
    private publicarResposta;
    private decodificarMsg;
}
