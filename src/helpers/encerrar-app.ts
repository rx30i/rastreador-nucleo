import {INestMicroservice} from '@nestjs/common';
import * as Sentry from '@sentry/node';

export function encerrarApp(app: INestMicroservice, codigo: number, erro: Error | any): void {
  if (erro instanceof Error) {
    Sentry.captureException(erro);
  }

  app.close();
  setTimeout(() => {
    process.exit(codigo);
  }, 1000);
}
