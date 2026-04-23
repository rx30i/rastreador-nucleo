import * as amqplib from 'amqplib';

import {
  RABBITMQ_EXCHANGE_DIRETO,
  RABBITMQ_FILA_RASTREADOR_ERRO,
  RABBITMQ_FILA_RASTREADOR_MENSAGEM,
  RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA,
  RABBITMQ_TTL_COMANDO_PAUSA,
  RABBITMQ_TTL_MENSAGEM_PAUSA,
} from '../enums';

type AssertQueue = amqplib.Replies.AssertQueue;

export class DeclararFilasRabbitMqService {
  constructor(
    private readonly rabbitMqFilaCmdPausa: string,
    private readonly rabbitMqFilaCmd: string,
  ) {}

  public async declararExchange(canal: amqplib.Channel): Promise<void> {
    await canal.assertExchange(
      RABBITMQ_EXCHANGE_DIRETO, 'direct', { durable: true },
    );
  }

  public async declararFila(canal: amqplib.Channel): Promise<void> {
    await Promise.all([
      this.criarFilaRastreadorErro(canal),
      this.criarFilaRastreadorMensagem(canal),
      this.criarFilaRastreadorMensagemPausa(canal),
      this.criarFilaRastreadorCmd(canal),
      this.criarFilaRastreadorCmdPausa(canal),
    ]);
  }

  public async vincular(canal: amqplib.Channel): Promise<void> {
    const vinculacoes: Promise<amqplib.Replies.Empty>[] = [
      canal.bindQueue(
        RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA,
        RABBITMQ_EXCHANGE_DIRETO,
        RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA,
      ),
      canal.bindQueue(
        RABBITMQ_FILA_RASTREADOR_MENSAGEM,
        RABBITMQ_EXCHANGE_DIRETO,
        RABBITMQ_FILA_RASTREADOR_MENSAGEM,
      ),
      canal.bindQueue(
        RABBITMQ_FILA_RASTREADOR_ERRO,
        RABBITMQ_EXCHANGE_DIRETO,
        RABBITMQ_FILA_RASTREADOR_ERRO,
      ),
      canal.bindQueue(
        this.rabbitMqFilaCmdPausa,
        RABBITMQ_EXCHANGE_DIRETO,
        this.rabbitMqFilaCmdPausa,
      ),
      canal.bindQueue(
        this.rabbitMqFilaCmd,
        RABBITMQ_EXCHANGE_DIRETO,
        this.rabbitMqFilaCmd,
      ),
    ];

    await Promise.all(vinculacoes);
  }

  private criarFilaRastreadorErro(canal: amqplib.Channel): Promise<AssertQueue> {
    return canal.assertQueue(
      RABBITMQ_FILA_RASTREADOR_ERRO, { durable: true },
    );
  }

  private criarFilaRastreadorMensagem(canal: amqplib.Channel): Promise<AssertQueue> {
    return canal.assertQueue(
      RABBITMQ_FILA_RASTREADOR_MENSAGEM, {
        durable  : true,
        arguments: {
          'x-dead-letter-exchange'   : RABBITMQ_EXCHANGE_DIRETO,
          'x-dead-letter-routing-key': RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA,
        },
      },
    );
  }

  private criarFilaRastreadorMensagemPausa(canal: amqplib.Channel): Promise<AssertQueue> {
    return canal.assertQueue(
      RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA, {
        durable  : true,
        arguments: {
          'x-dead-letter-exchange'   : RABBITMQ_EXCHANGE_DIRETO,
          'x-dead-letter-routing-key': RABBITMQ_FILA_RASTREADOR_MENSAGEM,
          'x-message-ttl'            : RABBITMQ_TTL_MENSAGEM_PAUSA,
        },
      },
    );
  }

  private criarFilaRastreadorCmd(canal: amqplib.Channel): Promise<AssertQueue> {
    return canal.assertQueue(
      this.rabbitMqFilaCmd, {
        durable  : true,
        arguments: {
          'x-dead-letter-exchange'   : RABBITMQ_EXCHANGE_DIRETO,
          'x-dead-letter-routing-key': this.rabbitMqFilaCmdPausa,
        },
      },
    );
  }

  private criarFilaRastreadorCmdPausa(canal: amqplib.Channel): Promise<AssertQueue> {
    return canal.assertQueue(
      this.rabbitMqFilaCmdPausa, {
        durable  : true,
        arguments: {
          'x-dead-letter-exchange'   : RABBITMQ_EXCHANGE_DIRETO,
          'x-dead-letter-routing-key': this.rabbitMqFilaCmd,
          'x-message-ttl'            : RABBITMQ_TTL_COMANDO_PAUSA,
        },
      },
    );
  }
}
