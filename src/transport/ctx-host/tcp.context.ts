import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';
import { ISocket } from '../../contracts';
import { Socket } from 'net';

/**
 * Socket   => Conexão do cliente proprietário da mensagem autal.
 * string   => Menagem original recebida pelo servidor TCP, a única alteração feita é a conversão de Buffer para string.
 * Function => Recebe o imei do cliente e verifica em uma lista de conexões se o proprietario daquele imei está
 *  conectado, retorna a conexao ou null.
 */
declare type TcpContextArgs = [Socket, string, (imei: string) => ISocket | null];

export class TcpContext extends BaseRpcContext<TcpContextArgs> {
  constructor (args: TcpContextArgs) {
    super(args);
  }

  public getSocketRef (imei?: string): ISocket | null {
    if (imei) {
      return this.args[2](imei);
    }

    return this.args[0];
  }

  /**
   * Corresponde a mensagem original, a mensagem recebida pelo servidor TCP.
   */
  public mensagem (): string {
    return this.args[1];
  }
}
