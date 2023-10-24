import { ConsumeMessage, MessagePropertyHeaders, Channel } from 'amqplib';
import { ComandoUsuarioEntity, RespostaComandoEntity } from '../entities';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { setTimeout } from 'node:timers/promises';
import { ConfigService } from '@nestjs/config';
import { ServidorTcp } from '../transport';
import { ComandoStatus } from '../enums';
import { ILoger } from '../contracts';

/**
 * Quando o usuário envia um comando ao rastreador, esse comando primeiro vai para uma fila do rabbitMq,
 * essa classe recebe as mensagens dessa fila e as envia para os rastreadores correspondentes,
 * desde que os mesmos estejam conectados.
 */
export class EnviarComandoRastreadorService {
  private channel: Channel;

  /**
   * Quantidade de vezes que deve se tentar enviar o comando ao rastreador.
   *
   * Se o comando não pode ser enviado ele é rejeitado da fila atual "RABBITMQ_FILA_COMANDO" e enviado para
   * para a fila "RABBITMQ_FILA_COMANDO_PAUSA" onde ficar 5 segundos e depois volta para a fila
   * "RABBITMQ_FILA_COMANDO" e uma nova tentativa de envio é feita.
   *
   * Depois de 720 tentativas que equivale a 1 hora, o comando é eliminado e enviado para a fila
   * "rastreador.erro" onde será analisado e verificado se a contém algum erro.
   */
  private tentativasEnvio = 720;

  constructor (
    private readonly amqpConnection: AmqpConnection,
    private readonly configService: ConfigService,
    private readonly logger: ILoger
  ) {}

  /**
   * Se o atributo amqpConnection não for uma instância válida, esse método vai gerar uma exception
   * que não é tratada o que vai fazer com o que a aplicação seja encerrada.
   *
   * Se a conexão com o RabbitMQ for fechada, isso vai ser identificado e depois de 1 minuto o método
   * tenta se inscrever novamente na fila para ouvir as mensagens recebidas, se uma nova conexão não
   * foi realizada vai ser gerada uma exceção que não é tratada e isso finaliza a aplicação.
   *
   * @returns {Promise<void>}
   */
  public async receberMsgRabbitMq (callback: (mensagem: ConsumeMessage) => void): Promise<void> {
    const filaComandos = this.configService.get<string>('RABBITMQ_FILA_COMANDO');
    if (!filaComandos) {
      this.logger.error('Variável de ambiente "RABBITMQ_FILA_COMANDO" não foi declarada no .env ');
      return;
    }

    this.channel = this.amqpConnection.channel;
    this.channel.prefetch(10);
    this.channel.on('close', async () => {
      await setTimeout(60000);
      this.receberMsgRabbitMq(callback);
    });

    this.channel.consume(filaComandos, async (mensagem: ConsumeMessage) => {
      this.logger.local('COMANDO CRIADO:', mensagem.content.toString('ascii'));
      callback(mensagem);
    });
  }

  /**
   * Envia cada comando recebido do rabbitMq para o rastreador, se o mesmo estiver conectado ao servidor TCP.
   * Se o rastreador não estiver conectado, uma nova tentativa de envio será feita depois de alguns segundos,
   * serão feitas 720 tentativas de envio do comando.
   *
   * @param {ConsumeMessage} mensagem
   * @param {Buffer} comando
   * @return {undefined}
   */
  public enviarComando (mensagem: ConsumeMessage, comando: Buffer): undefined {
    const comandoEntity = this.decodificarMsg(mensagem);
    try {
      if (comandoEntity === undefined) {
        this.channel.ack(mensagem, false);
        this.channel.publish('amq.direct', 'rastreador.erro', mensagem.content);
        return undefined;
      }

      const socket   = ServidorTcp.obterConexao(comandoEntity.imei);
      const resposta = socket?.write(comando);
      if (resposta === true) {
        this.finalizarMsg(resposta, mensagem, comandoEntity);
        return undefined;
      }

      this.rejeitarMsg(false, mensagem);
      this.naoPodeSerEnviada(false, mensagem, comandoEntity);
    } catch (erro) {
      this.rejeitarMsg(false, mensagem);
      this.naoPodeSerEnviada(false, mensagem, comandoEntity);
      this.logger.capiturarException(erro);
    }
  }

  /**
   * Se a mensagem foi enviado ao rastreador, ela é removida da fila e uma nova mensagem
   * é publicada na fila "rastreador.mensagem" informando o ocorrido.
   *
   * @param {boolean} msgEnviada
   * @param {ConsumeMessage} rabbitMqMsg
   * @param {ComandoUsuarioEntity} comando
   * @returns {void}
   */
  private finalizarMsg (msgEnviada: boolean, rabbitMqMsg: ConsumeMessage, comando: ComandoUsuarioEntity): void {
    if (msgEnviada === true) {
      this.channel.ack(rabbitMqMsg, false);
      this.publicarResposta(ComandoStatus.Enviado, comando);
    }
  }

  /**
   * Houve uma tentativa de enviar a mensagem ao rastreador, a aplicação retornou "false"
   * informando que não conseguiu enviar a mensagem, a mensagem é rejeitada o que faz com
   * que a mesma seja eliminada da fila "RABBITMQ_FILA_COMANDO" e seja publicado na fila
   * "RABBITMQ_FILA_COMANDO_PAUSA". Vai aguardar 5 segundos nessa fila ai depois é publicada
   * novamente na fila “RABBITMQ_FILA_COMANDO_PAUSA” e uma nova tentativa de envio é feita.
   *
   * @param {ConsumeMessage} rabbitMqMsg
   * @returns {void}
   */
  private rejeitarMsg (msgEnviada: boolean, rabbitMqMsg: ConsumeMessage): void {
    const headers: MessagePropertyHeaders = rabbitMqMsg.properties?.headers;
    if (msgEnviada !== true && (!headers?.['x-death'] || headers['x-death'][0].count < this.tentativasEnvio)) {
      this.channel.nack(rabbitMqMsg, false, false);
    }
  }

  /**
   * Por algum motivo o comando não pode ser enviado ao rastreador, o mesmo é removido da fila
   * "RABBITMQ_FILA_COMANDO" e enviado para a fila "rastreador.erro" apos o numero limite de
   * tentativas de envio ser atingido.
   *
   * @param {boolean} msgEnviada
   * @param {ConsumeMessage} rabbitMqMsg
   * @param {ComandoUsuarioEntity} comando
   * @returns {void}
   */
  private naoPodeSerEnviada (msgEnviada: boolean, rabbitMqMsg: ConsumeMessage, comando?: ComandoUsuarioEntity): void {
    const headers: MessagePropertyHeaders | undefined = rabbitMqMsg.properties?.headers;
    if (msgEnviada === true || !headers?.['x-death'] || headers['x-death'][0].count < this.tentativasEnvio) {
      return undefined;
    }

    if (comando instanceof ComandoUsuarioEntity) {
      this.publicarResposta(ComandoStatus.Erro, comando);
    }

    this.channel.ack(rabbitMqMsg, false);
    this.channel.publish(
      'amq.direct',
      'rastreador.erro',
      rabbitMqMsg.content
    );
  }

  /**
   * Apos a mensagem ser enviada ou não ao rastreador, é necessario
   * publicar uma nova mensagem na fila "rastreador.mensagem" informando
   * o ocorrido.
   *
   * @param {Status} statusResposta
   * @param {ComandoUsuarioEntity} comando
   */
  private publicarResposta (statusResposta: ComandoStatus, comando: ComandoUsuarioEntity): void {
    const dataHora = new Date().toISOString();
    const pattern  = 'COMANDO';

    const resposta = new RespostaComandoEntity({
      _id          : comando._id,
      imei         : comando.imei,
      pattern      : pattern,
      dataHora     : dataHora,
      status       : statusResposta,
      identificador: comando.identificador,
    });

    this.logger.local('COMANDO STATUS:', resposta.json());
    resposta.validar();
    this.channel.publish(
      'amq.direct',
      'rastreador.mensagem',
      Buffer.from(resposta.json(), 'ascii')
    );
  }

  /**
   * Recebo como mensagem um buffer, esse buffer deve ser convertido em um objeto ComandoEntity,
   * caso ocorra algum erro no processo, provavelmente a mesagem recebida não está no formato
   * esperado.
   *
   * @param {ConsumeMessage} msg
   * @returns {ComandoUsuarioEntity | undefined}
   */
  public decodificarMsg (msg: ConsumeMessage): ComandoUsuarioEntity{
    try {
      const mensagem = JSON.parse(msg.content.toString('ascii'));
      const comandoEntity = new ComandoUsuarioEntity({
        _id             : mensagem._id,
        modeloRastreador: mensagem.modeloRastreador,
        integracao      : mensagem.integracao,
        identificador   : mensagem.identificador,
        comando         : mensagem.comando,
        imei            : mensagem.imei,
      });

      return comandoEntity.valido()
        ? comandoEntity
        : undefined;
    } catch (erro) {
      this.logger.capiturarException(erro);
    }
  }
}
