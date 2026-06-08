import { Injectable as injectable, ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';


@injectable()
export class LoggerService extends ConsoleLogger {
  constructor(
    private readonly configService: ConfigService,
  ) {
    super('LoggerService');
  }

  /**
   * Os logs não são salvos. Exibe os logs apenas quando a aplicação
   * está no modo desenvolvimento.
   *
   * @param  {unknown} mensagem
   * @param  {string} prefixo
   * @return {undefined}
  */
  public local2(mensagem: unknown, prefixo?: string): undefined {
    if (this.configService.get<string>('APP_ENV') !== 'producao') {
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

    if (this.configService.get<string>('APP_ENV') !== 'producao') {
      super.error(erroNormalizado);
      return;
    }

    Sentry.captureException(erroNormalizado);
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
