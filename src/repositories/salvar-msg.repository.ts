import {AmqpConnection} from '@golevelup/nestjs-rabbitmq';
import {Injectable as injectable} from '@nestjs/common';
import {IPadraoMsgNestjs} from '../contracts';

@injectable()
export class SalvarMsgRepository {
  constructor(
    private readonly amqpConnection: AmqpConnection,
  ) {}

  /**
   * @param  {IPadraoMsgNestjs} mensagem
   * @return {Promise<void>}
   */
  public async salvar(mensagem: IPadraoMsgNestjs): Promise<boolean> {
    return await this.amqpConnection.publish(
      'amq.direct',
      'rastreador.mensagem',
      Buffer.from(JSON.stringify(mensagem))
    );
  }

  /**
   * Recebe as mensagens descartadas pela integração, as mensagens recebidas que
   * a integração ainda não da suporte ou que não passaram pela validação. Essas
   * mensagens são enviadas para a fila "rastreador.erro" para serem analisadas depois.
   *
   * @param  {string} mensagem
   * @return {Promise<boolean>}
   */
  public async salvarDesconhecida(mensagem: string): Promise<boolean> {
    return await this.amqpConnection.publish(
      'amq.direct',
      'rastreador.erro',
      Buffer.from(mensagem)
    );
  }
}
