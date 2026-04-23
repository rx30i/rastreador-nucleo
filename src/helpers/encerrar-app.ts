import { INestMicroservice } from '@nestjs/common';
import * as Sentry from '@sentry/node';

export async function encerrarApp(app: INestMicroservice, codigo: number, erro: unknown): Promise<void> {
  if (erro instanceof Error) {
    Sentry.captureException(erro);
  }

  try {
    await app.close();
  } catch (erroAoFechar) {
    if (erroAoFechar instanceof Error) {
      Sentry.captureException(erroAoFechar);
    }
  } finally {
    process.exit(codigo);
  }
}
