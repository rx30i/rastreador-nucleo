import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { IPadraoMsgNestjs } from '../contracts';
export declare class SalvarMsgRepository {
    private readonly amqpConnection;
    constructor(amqpConnection: AmqpConnection);
    salvar(mensagem: IPadraoMsgNestjs): Promise<boolean>;
    salvarDesconhecida(mensagem: string): Promise<boolean>;
}
