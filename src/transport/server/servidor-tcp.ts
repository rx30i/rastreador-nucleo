import { WritePacket, PacketId, IncomingEvent, Server } from '@nestjs/microservices';
import { CustomTransportStrategy, IncomingRequest} from '@nestjs/microservices';
import { IServidorTCPConfig, ISocket } from '../../contracts';
import { StringDecoder } from 'node:string_decoder';
import { TcpContext } from '../ctx-host';
import { Pattern } from '../../enums';
import { Observable } from 'rxjs';
import * as Net from 'node:net';

declare type MsgRecebida = IncomingRequest | IncomingEvent | Promise<IncomingRequest | IncomingEvent>;

export class ServidorTcp extends Server implements CustomTransportStrategy {
  private readonly stringDecoder: StringDecoder = new StringDecoder();
  private readonly configuracao: IServidorTCPConfig;
  private static conexoesTcp: Map<string, ISocket>;
  private servidor: Net.Server;

  constructor (configuracao: IServidorTCPConfig) {
    super();

    ServidorTcp.conexoesTcp = new Map();
    this.configuracao = configuracao;

    this.initializeDeserializer(configuracao);
    this.initializeSerializer(configuracao);
  }

  /**
   * @override
   * */
  public listen (callback: () => void) {
    this.servidor = Net.createServer((socket: ISocket) => {
      this.mensagem(socket);
      this.conexaoErro(socket);
      this.timeOut(socket);
      this.clienteEncerrouConexao(socket);
      this.qtdDispositivosConectados();
    });

    const configuracao = this.configuracao.servidor;
    this.servidor.listen(configuracao, callback);
  }

  /**
   * Obtem a conexão, o socket do cliente que o imei representa.
   *
   * @param {imei} imei
   * @return {ISocket | null}
   */
  public static obterConexao (imei: string): ISocket | null {
    const resposta = ServidorTcp.conexoesTcp.get(imei);
    if (resposta === undefined) {
      return null;
    }

    return resposta;
  }

  /**
   * @override
   * */
  public close (): void {
    if (this.servidor !== undefined) {
      this.servidor.close();
    }
  }

  /**
   * Recebe a mensagem enviada pelo cliente.
   *
   * @param {ISocket} socket
   * @returns {void}
   */
  private async mensagem (socket: ISocket): Promise<void> {
    socket.on('data', async (message: Buffer) => {
      for (const resposta of this.separarMensagens(message)) {
        const tcpContexto  = new TcpContext([socket, resposta, ServidorTcp.obterConexao]);
        const msgFormatada = await this.deserializer.deserialize(resposta);
        const consumidor   = this.getHandlerByPattern(msgFormatada.pattern);

        if (consumidor === null) {
          const erro = 'Não há um consumidor para a mensagem';
          this.configuracao.tratarErro.error(
            'ServidorTcp',
            `${erro} : ${resposta}`
          );

          continue;
        }

        consumidor?.isEventHandler
          ? this.eventPattern(tcpContexto, msgFormatada)
          : this.messagePattern(tcpContexto, msgFormatada);

        this.salvarConexao(socket, resposta);
      }
    });
  }

  private async messagePattern (tcpContexto: TcpContext, msgFormatada: MsgRecebida): Promise<void> {
    const mensagem   = msgFormatada as IncomingRequest;
    const consumidor = this.getHandlerByPattern(mensagem.pattern);
    const response$  = this.transformToObservable(
      await consumidor(mensagem.data, tcpContexto),
    ) as Observable<any>;

    response$ && this.send(response$, data => {
      Object.assign(data, {id: mensagem.id });
      const outgoingResponse = this.serializer.serialize(
        data as WritePacket & PacketId,
      );

      tcpContexto.getSocketRef().write(
        Buffer.from(this.formatarResposta(outgoingResponse))
      );
    });
  }

  /**
   * @param {TcpContext} tcpContexto
   * @param {IncomingEvent} evento
   * @return {Promise<void>}
   */
  private async eventPattern (tcpContexto: TcpContext, evento: IncomingEvent): Promise<void> {
    this.handleEvent(evento.pattern, evento, tcpContexto);
  }

  /**
   * Em um intervalo de 10 minutos se não for transitado dados no socket
   * é gerado um evento “timeout” informando que o socket está inativo,
   * nesse momento o socket é encerrado.
   *
   * @param {ISocket} socket
   * @returns {void}
   */
  private timeOut (socket: ISocket): void {
    socket.setTimeout(600000);
    socket.on('timeout', () => {
      this.clienteDesconectou(socket);
    });
  }

  /**
   * Evento emitido quando o cliente encerra a conexão com o servidor TCP.
   *
   * @param {ISocket} socket
   * @returns {void}
   */
  private clienteEncerrouConexao (socket: ISocket): void {
    socket.on('end', () => {
      this.clienteDesconectou(socket);
    });
  }

  /**
   * Remove o cliente que se desconectou da lista de conexões ativas. Também emite um evento
   * cujo o patter é "conexaoFechada" caso haja um consumidor para esse evento.
   *
   * Exemplo evento emitido:
   *  {pattern: 'conexaoFechada', data: {imei: '000000001', dataHora: '2021-02-12T19:18:15.000Z'}}
   *
   * @param {ISocket} socket
   * @returns {void}
   */
  private clienteDesconectou (socket: ISocket): void {
    const imei: string = socket?.imei || '';
    const socketSalvo  = ServidorTcp.conexoesTcp.get(imei);
    if ((socketSalvo?.id || null) === socket?.id) {
      ServidorTcp.conexoesTcp.delete(imei);

      const tempo  = (new Date()).toISOString();
      const evento = {pattern: Pattern.CONEXAO_FECHADA, data: {imei: imei, dataHora: tempo}};
      const consumidorEvento = this.getHandlerByPattern(evento.pattern);
      if (consumidorEvento?.isEventHandler) {
        this.handleEvent(evento.pattern, evento, undefined);
      }
    }

    socket.end();
    socket.destroy();
  }

  /**
   * "read ECONNRESET" significa que o cliente encerrou abruptamente sua conexão.
   *
   * @param {ISocket} socket
   * @returns {void}
   */
  private conexaoErro (socket: ISocket): void {
    socket.on('error', (error) => {
      if (error.message === 'read ECONNRESET') {
        this.clienteDesconectou(socket);
      }

      if (error.message !== 'read ECONNRESET') {
        this.configuracao.tratarErro.error(
          'ServidorTcp', error.stack || error.message
        );
      }
    });
  }

  /**
   * @param {ISocket} conexao
   * @param {string} mensagem
   * @returns {void}
   */
  private salvarConexao (conexao: ISocket, mensagem: string): void {
    const rastreadorImei = this.configuracao.deserializer.obterImei(mensagem);
    if (!conexao.imei && rastreadorImei) {
      ServidorTcp.conexoesTcp.set(rastreadorImei, conexao);

      conexao.imei = rastreadorImei;
      conexao.id   = Symbol();
    }
  }

  /**
   * Formata uma resposta que será enviada a um microserviço NestJs.
   * A resposta deve conter como sufixo seu tamanho seguido do
   * caracter #.
   *
   * @param {any} mensagem
   */
  private formatarResposta (mensagem: any): string {
    const messageString  = JSON.stringify(mensagem);
    const tamanhoMensagm = messageString.length;
    return `${tamanhoMensagm}#${messageString}`;
  }

  /**
   * Obtém de forma assíncrona o número de conexões simultâneas no servidor.
   *
   * Sempre que um novo dispositivo se conectar ao servidor esse método será executado e um evento será emitido
   * caso tenha um consumidor registrado para o patter "QTD_DISPOSITIVOS_CONECTADOS".
   *
   * Exemplo evento emitido:
   *  {pattern: 'QTD_DISPOSITIVOS_CONECTADOS', data: {qtd: 3000, dataHora: '2021-02-12T19:18:15.000Z'}}
   *
   * @returns {void}
   */
  private qtdDispositivosConectados (): void {
    this.servidor.getConnections((error, quantidade) => {
      if (error) {
        this.configuracao.tratarErro.error(error);
        return;
      }

      const tempo  = (new Date()).toISOString();
      const evento = {pattern: Pattern.QTD_DISPOSITIVOS_CONECTADOS, data: {qtd: quantidade, dataHora: tempo}};
      const consumidorEvento = this.getHandlerByPattern(evento.pattern);
      if (consumidorEvento?.isEventHandler) {
        this.handleEvent(evento.pattern, evento, undefined);
      }
    });
  }

  /**
   * TCP Receive Segment Coalescing (RSC).
   *
   * O protocolo TCP pode pegar várias mensagens enviadas em uma mesma conexão e
   * concatená-las em uma só mensagem. As mensagens recebidas devem ser verificadas e
   * tratadas.
   *
   * Os modelos dos rastreadores Coban que essa integração dá suporte não apresentam um padrão
   * para início das mensagens, a maioria das mensagens começam com o valor "imei:" mas existem
   * exceções, tem mensagens que começam com o valor "##", outras que contêm apenas o valor numérico
   * representado o imei.
   *
   * Se a mensagem começar com o valor "imei:", deve ser verificado se foram passadas mais de uma mensagens
   * concatenadas, nos demais casos esse verificação não é necessaria.
   *
   * @param {Buffer} mensagem
   */
  public separarMensagens (mensagem: Buffer): string[] {
    //Mensagens enviadas por uma aplicação Nest
    let mensagemString = this.stringDecoder.write(mensagem);
    const quantidadeMenagem = (mensagemString.match(/\d+#{/g) || []).length;
    if (quantidadeMenagem > 0) {
      const arrayMensagens: string[] = [];

      for(let _i = 0; _i < quantidadeMenagem; _i++) {
        const posicaoDelimitador = mensagemString.indexOf('#');
        const msgSemDelimidador  = mensagemString.substring(posicaoDelimitador + 1);
        const tamanhoMensagem    = parseInt(mensagemString.substring(0, posicaoDelimitador), 10);

        if (!isNaN(tamanhoMensagem)) {
          arrayMensagens.push(msgSemDelimidador.substring(0, tamanhoMensagem));
          mensagemString = msgSemDelimidador.substring(tamanhoMensagem);
        }
      }

      return arrayMensagens;
    }

    //Mensagens enviadas pelos rastreadores
    const codificacao = this.configuracao.codificacaoMsg;
    const delimitador = this.configuracao.delimitadorMsg;
    const demaisMsg   = mensagem.toString(codificacao);

    if (demaisMsg.slice(0, delimitador.length) === delimitador
    && (demaisMsg.match(new RegExp(delimitador, 'g')) || []).length > 0) {
      const msgAtualizada = demaisMsg.replace(new RegExp(delimitador, 'g'), `@@@${delimitador}`);
      const conjutoMsg    = msgAtualizada.split('@@@');
      const novaResposta  = [];

      for(const resposta of conjutoMsg) {
        if (resposta !== '') {
          novaResposta.push(resposta.replace(/(\r\n|\n|\r)/gm, ''));
        }
      }

      return novaResposta;
    }

    return [demaisMsg];
  }
}
