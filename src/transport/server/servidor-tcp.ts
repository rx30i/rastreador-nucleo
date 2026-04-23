import { WritePacket, PacketId, IncomingEvent, Server, BaseRpcContext } from '@nestjs/microservices';
import { CustomTransportStrategy, IncomingRequest } from '@nestjs/microservices';
import { IServidorTCPConfig, ISocket } from '../../contracts';
import { SepararMensagens } from './separar-mensagens';
import { StringDecoder } from 'node:string_decoder';
import { TcpContext } from '../ctx-host';
import { Pattern } from '../../enums';
import * as Net from 'node:net';


declare type MsgRecebida = IncomingRequest | IncomingEvent | Promise<IncomingRequest | IncomingEvent>;

export class ServidorTcp extends Server implements CustomTransportStrategy {
  private readonly stringDecoder: StringDecoder = new StringDecoder();
  private readonly configuracao: IServidorTCPConfig;
  private static conexoesTcp: Map<string, ISocket>;
  private readonly separarMsgs: SepararMensagens;
  private servidor?: Net.Server;

  constructor(configuracao: IServidorTCPConfig) {
    super();

    ServidorTcp.conexoesTcp = new Map();
    this.configuracao = configuracao;
    this.separarMsgs  = new SepararMensagens(this.configuracao);

    this.initializeDeserializer(configuracao);
    this.initializeSerializer(configuracao);
  }

  /**
   * @override
  * */
  public listen(callback: () => void) {
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
   * Registra um listener de evento no servidor TCP nativo.
   *
   * @param {string} evento - Nome do evento (ex: 'connection', 'error', 'close')
   * @param {Function} callback - Função callback a ser executada quando o evento ocorrer
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  public on(evento: string, callback: Function): void {
    this.servidor?.on(evento, callback as unknown as (...args: unknown[]) => void);
  }

  /**
   * Retorna o servidor TCP nativo do Node.js.
   * Permite que consumidores da API acessem funcionalidades específicas do servidor TCP.
   *
   * @template T - Tipo de retorno, padrão é Net.Server
   * @return {T} Instância do servidor TCP nativo
   */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  public unwrap<T = Net.Server>(): T {
    return this.servidor as T;
  }

  /**
   * Obtem a conexão, o socket do cliente que o imei representa.
   *
   * @param {imei} imei
   * @return {ISocket | null}
 */
  public static obterConexao(imei: string): ISocket | null {
    const resposta = ServidorTcp.conexoesTcp.get(imei);
    if (resposta === undefined) {
      return null;
    }

    return resposta;
  }

  /**
   * Encerra o servidor TCP e limpa todas as conexões ativas.
   *
   * @override
   */
  public close(): void {
    if (this.servidor === undefined) {
      return;
    }

    // Encerra todas as conexões ativas
    for (const socket of ServidorTcp.conexoesTcp.values()) {
      socket.destroy();
    }

    // Limpa o mapa de conexões
    ServidorTcp.conexoesTcp.clear();

    // Encerra o servidor TCP
    this.servidor.close();
  }

  /**
   * Recebe a mensagem enviada pelo cliente.
   *
   * @param {ISocket} socket
   * @return {void}
   */
  private mensagem(socket: ISocket): void {
    socket.on('data', (message: Buffer) => void (async () => {
      console.log('SERVIDOR HEX: ', message.toString('hex'));
      console.log('SERVIDOR ASCII: ', message.toString());
      for (const resposta of this.separarMensagens(message)) {
        const tcpContexto  = new TcpContext([socket, resposta, (imei: string) => ServidorTcp.obterConexao(imei)]);
        const msgFormatada = await this.deserializer.deserialize(resposta);
        const consumidor   = this.getHandlerByPattern(msgFormatada.pattern as string);

        if (consumidor === null) {
          const erro = 'Não há um consumidor para a mensagem';
          this.configuracao.tratarErro.error(
            `Class ServidorTcp ${erro} ${resposta}`,
          );

          continue;
        }

        this.salvarConexao(socket, resposta);
        if (consumidor.isEventHandler === true) {
          await this.eventPattern(tcpContexto, msgFormatada);
        } else {
          await this.messagePattern(tcpContexto, msgFormatada);
        }
      }
    })());
  }

  private async messagePattern(tcpContexto: TcpContext, msgFormatada: MsgRecebida): Promise<void> {
    const mensagem   = msgFormatada as IncomingRequest;
    const consumidor = this.getHandlerByPattern(mensagem.pattern as string);
    if (consumidor === null) {
      return;
    }

    const response$  = this.transformToObservable(
      await consumidor(mensagem.data, tcpContexto),
    );

    this.send(response$, (data) => {
      Object.assign(data, { id: mensagem.id });
      const outgoingResponse = this.serializer.serialize(
        data as WritePacket & PacketId,
      );

      tcpContexto.getSocketRef()?.write(
        Buffer.from(this.formatarResposta(outgoingResponse)),
      );
    });
  }

  /**
   * @param {TcpContext} tcpContexto
   * @param {IncomingEvent} evento
   * @return {Promise<void>}
   */
  private async eventPattern(tcpContexto: TcpContext, evento: IncomingEvent): Promise<void> {
    await this.handleEvent(evento.pattern, evento, tcpContexto);
  }

  /**
   * Em um intervalo de 10 minutos se não for transitado dados no socket
   * é gerado um evento “timeout” informando que o socket está inativo,
   * nesse momento o socket é encerrado.
   *
   * @param {ISocket} socket
   * @return {void}
   */
  private timeOut(socket: ISocket): void {
    socket.setTimeout(600000);
    socket.on('timeout', () => {
      this.clienteDesconectou(socket).catch((erro: unknown) => {
        this.configuracao.tratarErro.error(erro);
      });
    });
  }

  /**
   * Evento emitido quando o cliente encerra a conexão com o servidor TCP.
   *
   * @param {ISocket} socket
   * @return {void}
   */
  private clienteEncerrouConexao(socket: ISocket): void {
    socket.on('end', () => {
      this.clienteDesconectou(socket).catch((erro: unknown) => {
        this.configuracao.tratarErro.error(erro);
      });
    });
  }

  /**
   * Remove o cliente que se desconectou da lista de conexões ativas. Também emite um evento
   * cujo o patter é "CONEXAO_FECHADA" caso haja um consumidor para esse evento.
   *
   * Exemplo evento emitido:
   *  {pattern: 'CONEXAO_FECHADA', data: {imei: '000000001', dataHora: '2021-02-12T19:18:15.000Z'}}
   *
   * @param {ISocket} socket
   * @return {void}
   */
  private async clienteDesconectou(socket: ISocket): Promise<void> {
    const imei: string = socket.imei ?? '';
    const socketSalvo  = ServidorTcp.conexoesTcp.get(imei);
    if ((socketSalvo?.id ?? null) === socket.id) {
      ServidorTcp.conexoesTcp.delete(imei);

      const tempo  = (new Date()).toISOString();
      const evento = { pattern: Pattern.CONEXAO_FECHADA, data: { imei: imei, dataHora: tempo } };
      const consumidorEvento = this.getHandlerByPattern(evento.pattern);
      if (consumidorEvento?.isEventHandler) {
        await this.handleEvent(evento.pattern, evento, {} as BaseRpcContext);
      }
    }

    socket.end();
    socket.destroy();
  }

  /**
   * "read ECONNRESET" significa que o cliente encerrou abruptamente sua conexão.
   *
   * @param {ISocket} socket
   * @return {void}
   */
  private conexaoErro(socket: ISocket): void {
    socket.on('error', (error) => {
      if (error.message === 'read ECONNRESET') {
        this.clienteDesconectou(socket).catch((erro: unknown) => {
          this.configuracao.tratarErro.error(erro);
        });
      }

      if (error.message !== 'read ECONNRESET') {
        this.configuracao.tratarErro.error(
          'ServidorTcp', error.stack ?? error.message,
        );
      }
    });
  }

  /**
   * @param {ISocket} conexao
   * @param {string} mensagem
   * @return {void}
   */
  private salvarConexao(conexao: ISocket, mensagem: string): void {
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
   * @return {string}
   */
  private formatarResposta(mensagem: any): string {
    const messageString  = JSON.stringify(mensagem);
    const tamanhoMensagm = messageString.length;
    return `${tamanhoMensagm.toString()}#${messageString}`;
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
   * @return {void}
   */
  private qtdDispositivosConectados(): void {
    this.servidor?.getConnections((error, quantidade) => {
      if (error) {
        this.configuracao.tratarErro.error(error);
        return;
      }

      const tempo  = (new Date()).toISOString();
      const evento = { pattern: Pattern.QTD_DISPOSITIVOS_CONECTADOS, data: { qtd: quantidade, dataHora: tempo } };
      const consumidorEvento = this.getHandlerByPattern(evento.pattern);
      if (consumidorEvento?.isEventHandler) {
        this.handleEvent(evento.pattern, evento, {} as BaseRpcContext)
          .catch((erro: unknown) => {
            this.configuracao.tratarErro.error(erro);
          });
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
   * @return {string[]}
  */
  public separarMensagens(mensagem: Buffer): string[] {
    // Mensagens enviadas por uma aplicação Nest
    let mensagemString = this.stringDecoder.write(mensagem);
    const quantidadeMenagem = (mensagemString.match(/\d+#{/g) ?? []).length;
    if (quantidadeMenagem > 0) {
      const arrayMensagens: string[] = [];

      for (let _i = 0; _i < quantidadeMenagem; _i++) {
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

    // Mensagens enviadas pelos rastreadores
    const codificacao = this.configuracao.codificacaoMsg;
    const demaisMsg   = mensagem.toString(codificacao);

    return this.separarMsgs.obterMensagens(demaisMsg);
  }
}
