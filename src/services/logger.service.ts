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
    if (this.configService.get<string>('APP_ENV') !== 'producao') {
      super.error(message.name, message.message, message?.stack);
      return;
    }

    if (typeof message === 'object') {
      message = JSON.stringify(message);
    }

    const erro  = `{
      "message": ${message}
      "stack"  : ${stack}
      "context": ${context}
    }`;

    Sentry.captureMessage(erro, 'error');
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
