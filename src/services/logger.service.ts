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
      if (prefixo && Object.prototype.toString.call(mensagem) === '[object Object]') {
        mensagem = `${prefixo}: ${JSON.stringify(mensagem)}`;
      } if (prefixo && typeof mensagem === 'string') {
        mensagem = `${prefixo}: ${mensagem}`;
      }

      super.log(mensagem, this.context);
    }
  }

  /**
   * @param  {unknown} erro
   * @return {undefined}
  */
  public capiturarError(erro: unknown): undefined {
    if (erro && !(erro instanceof Error) &&
    Object.prototype.toString.call(erro) === '[object Object]') {
      erro = new Error(JSON.stringify(erro));
    } else if (!(erro instanceof Error) &&
    Object.prototype.toString.call(erro) !== '[object Object]') {
      erro = new Error(String(erro));
    }

    if (this.configService.get<string>('APP_ENV') !== 'producao') {
      super.error(erro);
      return;
    }

    Sentry.captureException(erro);
  }

  /**
   * @deprecated
   *
   * @param {any} message
   * @param {string} stack
   * @param {string} context
   *
   * @return {void}
  */
  public error(message: any, stack?: string, context?: string): void {
    const erros    = [message, stack, context];
    const resposta = erros.filter((valor) => {
      return valor ? true : false;
    });

    if (this.configService.get<string>('APP_ENV') !== 'producao') {
      super.error(resposta.toString());
      return;
    }

    Sentry.captureMessage(resposta.toString(), 'error');
    super.error(resposta.toString());
  }

  /**
   * @deprecated
   *
   * @param {string} prefixo
   * @param {string} mensagem
  */
  public local(prefixo: string, mensagem: string | Record<string, any>) {
    if (this.configService.get<string>('APP_ENV') !== 'producao') {
      if (typeof mensagem === 'object') {
        mensagem = JSON.stringify(mensagem);
      }

      this.log(`${prefixo} ${mensagem}`);
    }
  }

  /**
   * @deprecated
   *
   * @param {any} erro
   * @param {Error} context
   * @return {void}
  */
  public capiturarException(erro: Error, context?: any): void {
    if (this.configService.get<string>('APP_ENV') !== 'producao') {
      super.error(erro.name, erro.message, erro?.stack);
      return;
    }

    Sentry.captureException(erro, context);
  }
}
