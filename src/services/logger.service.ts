import {Injectable as injectable, ConsoleLogger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import * as Sentry from '@sentry/node';

@injectable()
export class LoggerService extends ConsoleLogger {
  constructor(
    private readonly configService: ConfigService,
  ) {
    super('LoggerService');
  }

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

  public local(prefixo: string, mensagem: string | Record<string, any>) {
    if (this.configService.get<string>('APP_ENV') !== 'producao') {
      if (typeof mensagem === 'object') {
        mensagem = JSON.stringify(mensagem);
      }

      this.log(`${prefixo} ${mensagem}`);
    }
  }

  public capiturarException(erro: Error, context?: any) {
    if (this.configService.get<string>('APP_ENV') !== 'producao') {
      super.error(erro.name, erro.message, erro?.stack);
      return;
    }

    Sentry.captureException(erro, context);
  }
}
