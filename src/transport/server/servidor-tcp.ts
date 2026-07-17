import {
  BaseRpcContext,
  CustomTransportStrategy,
  IncomingEvent,
  Server,
} from '@nestjs/microservices';
import { IServidorTCPConfig, ISocket } from '../../contracts';
import { Pattern } from '../../enums';
import { TcpContext } from '../ctx-host';
import { SepararMensagens, type MensagemSeparada } from './separar-mensagens';
import * as Net from 'node:net';

export class ServidorTcp extends Server implements CustomTransportStrategy {
  private static readonly conexoesTcp = new Map<string, ISocket>();

  private readonly configuracao: IServidorTCPConfig;
  private readonly conexoesAtivas = new Set<ISocket>();
  private readonly mensagensIncompletasPorSocket = new WeakMap<ISocket, string>();
  private readonly processamentosPorSocket = new WeakMap<ISocket, Promise<void>>();
  private readonly separarMsgs: SepararMensagens;
  private encerrandoServidor = false;
  private servidor?: Net.Server;

  constructor(configuracao: IServidorTCPConfig) {
    super();

    this.configuracao = configuracao;
    this.separarMsgs = new SepararMensagens(this.configuracao);
    this.initializeDeserializer(configuracao);
  }

  /**
   * @override
   */
  public listen(callback: () => void): void {
    this.encerrandoServidor = false;
    this.servidor = Net.createServer((socket: ISocket): void => {
      this.configurarConexao(socket);
    });

    this.servidor.listen(this.configuracao.servidor, callback);
  }

  /**
   * Registra um listener de evento no servidor TCP nativo.
   *
   * @param {string} evento - Nome do evento (ex: 'connection', 'error', 'close')
   * @param {Function} callback - Função callback a ser executada quando o evento ocorrer
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  public on(evento: string, callback: Function): void {
    this.servidor?.on(
      evento,
      callback as unknown as (...argumentos: unknown[]) => void,
    );
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
   * Obtém a conexão do cliente representado pelo IMEI.
   *
   * @param {string} imei
   * @return {ISocket | null}
   */
  public static obterConexao(imei: string): ISocket | null {
    const conexao = ServidorTcp.conexoesTcp.get(imei);
    if (conexao === undefined) {
      return null;
    }

    if (conexao.destroyed) {
      ServidorTcp.conexoesTcp.delete(imei);
      return null;
    }

    return conexao;
  }

  /**
   * Encerra o servidor TCP e todas as conexões pertencentes a esta instância.
   *
   * @override
   */
  public close(): void {
    this.encerrandoServidor = true;

    for (const socket of [...this.conexoesAtivas]) {
      this.removerEstadoDaConexao(socket);
      socket.destroy();
    }

    if (this.servidor?.listening === true) {
      this.servidor.close();
    }
  }

  private configurarConexao(socket: ISocket): void {
    this.conexoesAtivas.add(socket);
    this.mensagem(socket);
    this.conexaoErro(socket);
    this.timeOut(socket);
    this.monitorarConexaoFechada(socket);
    this.qtdDispositivosConectados();
  }

  /**
   * Recebe as mensagens enviadas pelo cliente e as processa na ordem de chegada.
   *
   * @param {ISocket} socket
   * @return {void}
   */
  private mensagem(socket: ISocket): void {
    this.conexoesAtivas.add(socket);
    socket.on('data', (mensagemRecebida: Buffer): void => {
      this.enfileirarProcessamento(socket, mensagemRecebida);
    });
  }

  private enfileirarProcessamento(
    socket: ISocket,
    mensagemRecebida: Buffer,
  ): void {
    const processamentoAnterior = this.processamentosPorSocket.get(socket) ?? Promise.resolve();
    const processamentoAtual = processamentoAnterior.then(async (): Promise<void> => {
      await this.processarDadosRecebidos(socket, mensagemRecebida);
    });
    const processamentoProtegido = processamentoAtual.catch((erro: unknown): void => {
      this.registrarErroProcessamento(erro);
    });

    this.processamentosPorSocket.set(socket, processamentoProtegido);
  }

  private async processarDadosRecebidos(
    socket: ISocket,
    mensagemRecebida: Buffer,
  ): Promise<void> {
    if (!this.conexoesAtivas.has(socket)) {
      return;
    }

    const mensagens = this.separarMensagensComBruto(mensagemRecebida, socket);
    for (const mensagemSeparada of mensagens) {
      if (!this.conexoesAtivas.has(socket)) {
        return;
      }

      await this.processarMensagemComTratamento(socket, mensagemSeparada);
    }
  }

  private async processarMensagemComTratamento(
    socket: ISocket,
    mensagemSeparada: MensagemSeparada,
  ): Promise<void> {
    try {
      await this.processarMensagem(socket, mensagemSeparada);
    } catch (erro: unknown) {
      this.registrarErroProcessamento(erro);
    }
  }

  private async processarMensagem(
    socket: ISocket,
    mensagemSeparada: MensagemSeparada,
  ): Promise<void> {
    const evento = await this.deserializer.deserialize(
      mensagemSeparada.mensagem,
    ) as IncomingEvent;

    if (!this.conexoesAtivas.has(socket)) {
      return;
    }

    const consumidor = this.getHandlerByPattern(evento.pattern as string);
    if (consumidor === null) {
      this.registrarConsumidorAusente(mensagemSeparada.mensagem);
      return;
    }

    if (consumidor.isEventHandler !== true) {
      this.registrarConsumidorIncompativel(mensagemSeparada.mensagem);
      return;
    }

    this.salvarConexao(socket, mensagemSeparada.mensagem);
    const contexto = this.criarContexto(socket, mensagemSeparada);
    await this.handleEvent(evento.pattern as string, evento, contexto);
  }

  private criarContexto(
    socket: ISocket,
    mensagemSeparada: MensagemSeparada,
  ): TcpContext {
    return new TcpContext([
      socket,
      mensagemSeparada.mensagem,
      (imei: string): ISocket | null => ServidorTcp.obterConexao(imei),
      mensagemSeparada.mensagemBruta,
    ]);
  }

  private registrarConsumidorAusente(mensagem: string): void {
    this.configuracao.tratarErro.error(
      `Class ServidorTcp Não há um consumidor para a mensagem ${mensagem}`,
    );
  }

  private registrarConsumidorIncompativel(mensagem: string): void {
    this.configuracao.tratarErro.error(
      `Class ServidorTcp O consumidor deve ser registrado com @EventPattern ${mensagem}`,
    );
  }

  private registrarErroProcessamento(erro: unknown): void {
    this.configuracao.tratarErro.error(
      'ServidorTcp',
      this.obterDescricaoErro(erro),
    );
  }

  private obterDescricaoErro(erro: unknown): string {
    if (erro instanceof Error) {
      return erro.stack ?? erro.message;
    }

    return String(erro);
  }

  /**
   * Em um intervalo de 10 minutos sem tráfego de dados, o socket é destruído.
   *
   * @param {ISocket} socket
   * @return {void}
   */
  private timeOut(socket: ISocket): void {
    socket.setTimeout(600000);
    socket.on('timeout', (): void => {
      socket.destroy();
    });
  }

  private monitorarConexaoFechada(socket: ISocket): void {
    socket.once('close', (): void => {
      void this.clienteDesconectou(socket).catch((erro: unknown): void => {
        this.registrarErroProcessamento(erro);
      });
    });
  }

  /**
   * Remove o cliente da lista de conexões ativas e emite CONEXAO_FECHADA.
   *
   * @param {ISocket} socket
   * @return {Promise<void>}
   */
  private async clienteDesconectou(socket: ISocket): Promise<void> {
    if (!this.conexoesAtivas.has(socket)) {
      return;
    }

    const imei = this.removerEstadoDaConexao(socket);
    if (imei === null || this.encerrandoServidor) {
      return;
    }

    await this.emitirEventoConexaoFechada(imei);
  }

  private removerEstadoDaConexao(socket: ISocket): string | null {
    this.conexoesAtivas.delete(socket);
    this.processamentosPorSocket.delete(socket);
    this.descartarMensagemIncompleta(socket);

    const imei = socket.imei;
    if (imei === undefined) {
      return null;
    }

    const conexaoRegistrada = ServidorTcp.conexoesTcp.get(imei);
    if (conexaoRegistrada !== undefined && conexaoRegistrada !== socket) {
      return null;
    }

    if (conexaoRegistrada === socket) {
      ServidorTcp.conexoesTcp.delete(imei);
    }

    return imei;
  }

  private async emitirEventoConexaoFechada(imei: string): Promise<void> {
    const evento: IncomingEvent = {
      pattern: Pattern.CONEXAO_FECHADA,
      data   : {
        imei,
        dataHora: new Date().toISOString(),
      },
    };
    const consumidor = this.getHandlerByPattern(evento.pattern as string);
    if (consumidor?.isEventHandler !== true) {
      return;
    }

    await this.handleEvent(
      evento.pattern as string,
      evento,
      new BaseRpcContext([]),
    );
  }

  private conexaoErro(socket: ISocket): void {
    socket.on('error', (erro: Error): void => {
      const codigoErro = (erro as NodeJS.ErrnoException).code;
      if (codigoErro !== 'ECONNRESET') {
        this.configuracao.tratarErro.error(
          'ServidorTcp',
          erro.stack ?? erro.message,
        );
      }

      socket.destroy();
    });
  }

  /**
   * @param {ISocket} conexao
   * @param {string} mensagem
   * @return {void}
   */
  private salvarConexao(conexao: ISocket, mensagem: string): void {
    if (!this.conexoesAtivas.has(conexao) || conexao.destroyed) {
      return;
    }

    const rastreadorImei = this.configuracao.deserializer.obterImei(mensagem);
    if (conexao.imei === undefined && rastreadorImei !== '') {
      ServidorTcp.conexoesTcp.set(rastreadorImei, conexao);
      conexao.imei = rastreadorImei;
      conexao.id = Symbol();
    }
  }

  /**
   * Emite a quantidade atual de conexões sempre que um dispositivo se conecta.
   *
   * @return {void}
   */
  private qtdDispositivosConectados(): void {
    this.servidor?.getConnections((erro: Error | null, quantidade: number): void => {
      if (erro !== null) {
        this.configuracao.tratarErro.error(erro);
        return;
      }

      const evento: IncomingEvent = {
        pattern: Pattern.QTD_DISPOSITIVOS_CONECTADOS,
        data   : {
          qtd     : quantidade,
          dataHora: new Date().toISOString(),
        },
      };
      const consumidor = this.getHandlerByPattern(evento.pattern as string);
      if (consumidor?.isEventHandler !== true) {
        return;
      }

      this.handleEvent(
        evento.pattern as string,
        evento,
        new BaseRpcContext([]),
      ).catch((erroEvento: unknown): void => {
        this.registrarErroProcessamento(erroEvento);
      });
    });
  }

  /**
   * Separa mensagens concatenadas enviadas pelos rastreadores.
   *
   * @param {Buffer} mensagem
   * @return {string[]}
   */
  public separarMensagens(mensagem: Buffer): string[] {
    return this.separarMensagensComBruto(mensagem)
      .map((mensagemSeparada: MensagemSeparada): string => mensagemSeparada.mensagem);
  }

  private separarMensagensComBruto(
    mensagem: Buffer,
    socket?: ISocket,
  ): MensagemSeparada[] {
    const mensagemRecebida = mensagem.toString(this.configuracao.codificacaoMsg);
    if (socket !== undefined) {
      return this.separarMensagensMantendoEstadoDoSocket(
        socket,
        mensagemRecebida,
      );
    }

    return this.separarMsgs.obterMensagensComBruto(mensagemRecebida);
  }

  private separarMensagensMantendoEstadoDoSocket(
    socket: ISocket,
    mensagemRecebida: string,
  ): MensagemSeparada[] {
    const mensagemPendente = this.mensagensIncompletasPorSocket.get(socket) ?? '';
    const resultado = this.separarMsgs.obterResultadoSeparacao(
      `${mensagemPendente}${mensagemRecebida}`,
    );

    this.atualizarMensagemIncompleta(socket, resultado.mensagemIncompleta);
    return resultado.mensagens;
  }

  private atualizarMensagemIncompleta(
    socket: ISocket,
    mensagemIncompleta: string,
  ): void {
    if (mensagemIncompleta === '') {
      this.mensagensIncompletasPorSocket.delete(socket);
      return;
    }

    this.mensagensIncompletasPorSocket.set(socket, mensagemIncompleta);
  }

  private descartarMensagemIncompleta(socket: ISocket): void {
    const mensagemIncompleta = this.mensagensIncompletasPorSocket.get(socket);
    if (mensagemIncompleta === undefined) {
      return;
    }

    this.mensagensIncompletasPorSocket.delete(socket);
    this.configuracao.tratarErro.error(
      `Class ServidorTcp Quadro incompleto descartado ${mensagemIncompleta}`,
    );
  }
}
