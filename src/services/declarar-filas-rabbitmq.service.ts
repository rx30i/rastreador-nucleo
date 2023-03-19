import * as amqplib from 'amqplib';

type AssertQueue = amqplib.Replies.AssertQueue;

export class DeclararFilasRabbitMqService {
  constructor (
    private readonly rabbitMqFilaCmdPausa: string,
    private readonly rabbitMqFilaCmd: string,
  ) {}

  public async declararExchange (channel: amqplib.Channel): Promise<void> {
    await channel.assertExchange(
      'amq.direct', 'direct', {durable: true}
    );
  }

  public async declararQueue (channel: amqplib.Channel): Promise<void> {
    await Promise.all([
      this.queueRastreadorErro(channel),
      this.queueRastreadorMensagem(channel),
      this.queueRastreadorMensagemPausa(channel),
      this.queueRastreadorCmd(channel),
      this.queueRastreadorCmdPausa(channel),
    ]);
  }

  public async bind (channel: amqplib.Channel): Promise<void> {
    await Promise.all([
      channel.bindQueue('rastreador.mensagem.pausa', 'amq.direct', 'rastreador.mensagem.pausa'),
      channel.bindQueue('rastreador.mensagem', 'amq.direct', 'rastreador.mensagem'),
      channel.bindQueue('rastreador.erro', 'amq.direct', 'rastreador.erro'),
      channel.bindQueue(this.rabbitMqFilaCmdPausa, 'amq.direct', this.rabbitMqFilaCmdPausa),
      channel.bindQueue(this.rabbitMqFilaCmd, 'amq.direct', this.rabbitMqFilaCmd),
    ]);
  }

  private queueRastreadorErro (channel: amqplib.Channel): Promise<AssertQueue> {
    return channel.assertQueue(
      'rastreador.erro', {durable: true}
    );
  }

  private queueRastreadorMensagem (channel: amqplib.Channel): Promise<AssertQueue> {
    return channel.assertQueue(
      'rastreador.mensagem', {
        durable: true,
        arguments: {
          'x-dead-letter-exchange'   : 'amq.direct',
          'x-dead-letter-routing-key': 'rastreador.mensagem.pausa',
        },
      }
    );
  }

  private queueRastreadorMensagemPausa (channel: amqplib.Channel): Promise<AssertQueue> {
    return channel.assertQueue(
      'rastreador.mensagem.pausa', {
        durable  : true,
        arguments: {
          'x-dead-letter-exchange'   : 'amq.direct',
          'x-dead-letter-routing-key': 'rastreador.mensagem',
          'x-message-ttl'            : 60000,
        },
      }
    );
  }

  private queueRastreadorCmd (channel: amqplib.Channel): Promise<AssertQueue> {
    return channel.assertQueue(
      this.rabbitMqFilaCmd, {
        durable  : true,
        arguments: {
          'x-dead-letter-exchange'   : 'amq.direct',
          'x-dead-letter-routing-key': this.rabbitMqFilaCmdPausa,
        },
      }
    );
  }

  private queueRastreadorCmdPausa (channel: amqplib.Channel): Promise<AssertQueue> {
    return channel.assertQueue(
      this.rabbitMqFilaCmdPausa, {
        durable  : true,
        arguments: {
          'x-dead-letter-exchange'   : 'amq.direct',
          'x-dead-letter-routing-key': this.rabbitMqFilaCmd,
          'x-message-ttl'            : 5000,
        },
      }
    );
  }
}
