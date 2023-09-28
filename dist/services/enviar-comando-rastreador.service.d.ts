import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { CodificacaoMsg } from '../enums';
import { ConfigService } from '@nestjs/config';
import { ILoger } from '../contracts';
export declare class EnviarComandoRastreadorService {
    private readonly amqpConnection;
    private readonly configService;
    private readonly logger;
    private channel;
    private tentativasEnvio;
    constructor(amqpConnection: AmqpConnection, configService: ConfigService, logger: ILoger);
    receberMsgRabbitMqEnviarParaRastreador(codificacaoCmd: CodificacaoMsg): Promise<void>;
    private enviarComando;
    private finalizarMsg;
    private rejeitarMsg;
    private naoPodeSerEnviada;
    private publicarResposta;
    private decodificarMsg;
}
