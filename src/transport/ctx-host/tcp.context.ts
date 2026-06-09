import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';
import { ISocket } from '../../contracts';
import { Socket } from 'net';

/**
 * Socket   => Conexao do cliente proprietario da mensagem atual.
 * string   => Mensagem usada pelo transporte apos as normalizacoes atuais.
 * Function => Recebe o imei do cliente e verifica em uma lista de conexoes se o proprietario daquele imei esta
 *  conectado, retorna a conexao ou null.
 * string   => Mensagem bruta recebida do socket para este contexto.
 */
declare type TcpContextArgs = [Socket, string, (imei: string) => ISocket | null, string?];

export class TcpContext extends BaseRpcContext<TcpContextArgs> {
  public getSocketRef(imei?: string): ISocket | null {
    if (imei) {
      return this.args[2](imei);
    }

    return this.args[0];
  }

  /**
   * Corresponde a mensagem usada pelo transporte, mantendo o comportamento historico de normalizacao.
   * @return {string}
   */
  public mensagem(): string {
    return this.args[1];
  }

  /**
   * Corresponde ao trecho bruto recebido do socket para esta mensagem.
   * @return {string}
   */
  public mensagemBruta(): string {
    return this.args[3] ?? this.mensagem();
  }
}
