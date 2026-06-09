import { ConsumeMessage, Channel } from 'amqplib';
import { EnviarComandoRastreadorService } from './enviar-comando-rastreador.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ServidorTcp } from '../transport';
import { ILoger, ISocket } from '../contracts';

describe('EnviarComandoRastreadorService', () => {
  let obterConexao: jest.SpyInstance;
  let logger: Pick<ILoger, 'mensagemRastreador' | 'debug' | 'error'>;
  let canal: Pick<Channel, 'ack' | 'publish'>;
  let servico: EnviarComandoRastreadorService;

  beforeEach((): void => {
    logger = {
      debug             : jest.fn(),
      error             : jest.fn(),
      mensagemRastreador: jest.fn(),
    };
    canal = {
      ack    : jest.fn(),
      publish: jest.fn(),
    };
    servico = new EnviarComandoRastreadorService(
      {} as AmqpConnection,
      {} as ConfigService,
      logger as ILoger,
    );
    (servico as unknown as { channel: Channel }).channel = canal as Channel;
    obterConexao = jest.spyOn(ServidorTcp, 'obterConexao');
  });

  afterEach((): void => {
    obterConexao.mockRestore();
  });

  it('deve registrar o comando enviado ao rastreador quando o socket confirmar o envio', (): void => {
    const comando: Buffer = Buffer.from('ST300CMD;123456789012345;02;Enable1', 'ascii');
    const socket: Pick<ISocket, 'write'> = {
      write: jest.fn((): boolean => true),
    };
    const mensagem: ConsumeMessage = criarMensagemComando('123456789012345');
    obterConexao.mockReturnValue(socket);

    servico.enviarComando(mensagem, comando);

    expect(logger.mensagemRastreador).toHaveBeenCalledWith(
      '123456789012345',
      'ST300CMD;123456789012345;02;Enable1',
      'enviada',
    );
  });
});

function criarMensagemComando(imei: string): ConsumeMessage {
  return {
    content: Buffer.from(JSON.stringify({
      _id             : '10',
      modeloRastreador: 'ST310U',
      integracao      : 'suntech300',
      identificador   : 'bloquear',
      comando         : 'ST300CMD;123456789012345;02;Enable1',
      imei            : imei,
    }), 'ascii'),
    properties: {
      headers: {},
    },
  } as ConsumeMessage;
}
