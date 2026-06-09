import { Injectable as injectable, ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type SentidoMensagemRastreador } from '../contracts';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as Sentry from '@sentry/node';
import * as Winston from 'winston';
import * as FileSystem from 'node:fs';
import * as Path from 'node:path';


@injectable()
export class LoggerService extends ConsoleLogger {
  private readonly loggersRastreador: Map<string, Winston.Logger> = new Map<string, Winston.Logger>();
  private readonly diretorioLogsRastreador: string = 'logs';

  constructor(
    private readonly configService: ConfigService,
  ) {
    super('LoggerService');
  }

  public override debug(mensagem: unknown, ...parametrosOpcionais: unknown[]): undefined {
    if (!this.aplicacaoEstaEmModoDesenvolvimento()) {
      return undefined;
    }

    const prefixo: string | undefined = this.obterPrefixo(parametrosOpcionais);
    const mensagemFormatada: unknown = this.formatarMensagem(mensagem, prefixo);

    super.debug(mensagemFormatada, this.context);

    return undefined;
  }

  public mensagemRastreador(
    imeiRastreador: string,
    mensagem: unknown,
    sentidoMensagem: SentidoMensagemRastreador,
  ): undefined {
    const imeiConfigurado: string = this.obterImeiConfiguradoParaSalvarLog();
    const imeiNormalizado: string = this.normalizarTexto(imeiRastreador);

    if (!imeiConfigurado || imeiConfigurado !== imeiNormalizado) {
      return undefined;
    }

    const loggerRastreador: Winston.Logger = this.obterLoggerRastreador(imeiNormalizado);
    loggerRastreador.info(
      this.formatarLinhaMensagemRastreador(imeiNormalizado, mensagem, sentidoMensagem),
    );

    return undefined;
  }

  /**
   * Os logs nao sao salvos. Exibe os logs apenas quando a aplicacao
   * nao esta no modo producao.
   *
   * @param  {unknown} mensagem
   * @param  {string} prefixo
   * @return {undefined}
   * @deprecated Use o metodo debug.
  */
  public local2(mensagem: unknown, prefixo?: string): undefined {
    if (this.aplicacaoNaoEstaEmProducao()) {
      const mensagemFormatada: unknown = this.formatarMensagem(mensagem, prefixo);

      super.log(mensagemFormatada, this.context);
    }
  }

  /**
   * @param  {unknown} erro
   * @return {undefined}
  */
  public capiturarError(erro: unknown): undefined {
    const erroNormalizado: Error = this.normalizarErro(erro);

    if (this.aplicacaoNaoEstaEmProducao()) {
      super.error(erroNormalizado);
      return;
    }

    Sentry.captureException(erroNormalizado);
  }

  private aplicacaoEstaEmModoDesenvolvimento(): boolean {
    return this.configService.get<string>('APP_ENV') === 'desenvolvimento';
  }

  private aplicacaoNaoEstaEmProducao(): boolean {
    return this.configService.get<string>('APP_ENV') !== 'producao';
  }

  private obterImeiConfiguradoParaSalvarLog(): string {
    const imeiConfigurado: string | undefined = this.configService.get<string>('SALVAR_LOG_RASTREADOR_IMEI');

    return this.normalizarTexto(imeiConfigurado);
  }

  private normalizarTexto(valor?: string): string {
    return valor?.trim() ?? '';
  }

  private obterPrefixo(parametrosOpcionais: unknown[]): string | undefined {
    const primeiroParametro: unknown = parametrosOpcionais[0];

    if (typeof primeiroParametro !== 'string') {
      return undefined;
    }

    return primeiroParametro;
  }

  private obterLoggerRastreador(imeiRastreador: string): Winston.Logger {
    const nomeArquivo: string = this.obterNomeArquivoLogRastreador(imeiRastreador);
    const loggerExistente: Winston.Logger | undefined = this.loggersRastreador.get(nomeArquivo);

    if (loggerExistente !== undefined) {
      return loggerExistente;
    }

    const loggerCriado: Winston.Logger = this.criarLoggerRastreador(nomeArquivo);
    this.loggersRastreador.set(nomeArquivo, loggerCriado);

    return loggerCriado;
  }

  private criarLoggerRastreador(nomeArquivo: string): Winston.Logger {
    FileSystem.mkdirSync(this.diretorioLogsRastreador, { recursive: true });

    return Winston.createLogger({
      level     : 'info',
      format    : this.criarFormatoLoggerRastreador(),
      transports: [
        new DailyRotateFile({
          filename   : nomeArquivo,
          datePattern: 'YYYY-MM-DD',
          level      : 'info',
        }),
      ],
    });
  }

  private criarFormatoLoggerRastreador(): Winston.Logform.Format {
    return Winston.format.printf((informacoes: Winston.Logform.TransformableInfo): string =>
      this.converterValorParaTexto(informacoes.message),
    );
  }

  private obterNomeArquivoLogRastreador(imeiRastreador: string): string {
    const imeiSanitizado: string = this.sanitizarImeiParaNomeArquivo(imeiRastreador);

    return Path.posix.join(
      this.diretorioLogsRastreador,
      `log-${imeiSanitizado}-%DATE%.log`,
    );
  }

  private sanitizarImeiParaNomeArquivo(imeiRastreador: string): string {
    const imeiSanitizado: string = imeiRastreador.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (imeiSanitizado.length === 0) {
      return 'sem-imei';
    }

    return imeiSanitizado;
  }

  private formatarLinhaMensagemRastreador(
    imeiRastreador: string,
    mensagem: unknown,
    sentidoMensagem: SentidoMensagemRastreador,
  ): string {
    const dataHora: string = new Date().toISOString();
    const mensagemTexto: string = this.converterMensagemRastreadorParaTexto(mensagem);

    return `[${dataHora}] [${imeiRastreador}] [${sentidoMensagem}] ${mensagemTexto}`;
  }

  private converterMensagemRastreadorParaTexto(mensagem: unknown): string {
    if (mensagem instanceof Error) {
      return this.removerQuebrasDeLinha(mensagem.stack ?? mensagem.message);
    }

    if (typeof mensagem === 'string') {
      return this.removerQuebrasDeLinha(mensagem);
    }

    if (this.valorEhObjetoComum(mensagem)) {
      return this.removerQuebrasDeLinha(this.serializarValor(mensagem));
    }

    return this.removerQuebrasDeLinha(this.converterValorParaTexto(mensagem));
  }

  private removerQuebrasDeLinha(valor: string): string {
    return valor.replace(/(\r\n|\n|\r)/gm, '\\n');
  }

  private formatarMensagem(mensagem: unknown, prefixo?: string): unknown {
    if (!prefixo) {
      return mensagem;
    }

    if (this.valorEhObjetoComum(mensagem)) {
      return `${prefixo}: ${this.serializarValor(mensagem)}`;
    }

    if (typeof mensagem === 'string') {
      return `${prefixo}: ${mensagem}`;
    }

    return mensagem;
  }

  private normalizarErro(erro: unknown): Error {
    if (erro instanceof Error) {
      return erro;
    }

    if (this.valorEhObjetoComum(erro)) {
      return new Error(this.serializarValor(erro));
    }

    return new Error(this.converterValorParaTexto(erro));
  }

  private serializarValor(valor: unknown): string {
    const referenciasVisitadas: WeakSet<object> = new WeakSet<object>();

    try {
      const valorSerializado: unknown = JSON.stringify(
        valor,
        (_chave: string, valorAtual: unknown): unknown =>
          this.normalizarValorSerializado(valorAtual, referenciasVisitadas),
      );

      if (typeof valorSerializado === 'string') {
        return valorSerializado;
      }

      return this.converterValorParaTexto(valor);
    } catch {
      return this.converterValorParaTexto(valor);
    }
  }

  private normalizarValorSerializado(
    valorAtual: unknown,
    referenciasVisitadas: WeakSet<object>,
  ): unknown {
    if (typeof valorAtual === 'bigint') {
      return valorAtual.toString();
    }

    if (typeof valorAtual !== 'object' || valorAtual === null) {
      return valorAtual;
    }

    if (referenciasVisitadas.has(valorAtual)) {
      return '[Referencia circular]';
    }

    referenciasVisitadas.add(valorAtual);

    return valorAtual;
  }

  private valorEhObjetoComum(valor: unknown): boolean {
    return Object.prototype.toString.call(valor) === '[object Object]';
  }

  private converterValorParaTexto(valor: unknown): string {
    try {
      return String(valor);
    } catch {
      return '[Valor nao serializavel]';
    }
  }
}
