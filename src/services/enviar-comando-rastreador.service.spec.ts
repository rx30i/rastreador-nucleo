import { ConsumeMessage, MessagePropertyHeaders, Channel } from 'amqplib';
import { EnviarComandoRastreadorService } from './enviar-comando-rastreador.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ComandoUsuarioEntity } from '../entities';
import { ConfigService } from '@nestjs/config';
import { ServidorTcp } from '../transport';
import { ILoger, ISocket } from '../contracts';

describe('EnviarComandoRastreadorService', () => {
  let obterConexao: jest.SpyInstance;
  let logger: Pick<ILoger, 'salvarLogRastreador' | 'debug' | 'error'>;
  let canal: jest.Mocked<Pick<Channel, 'ack' | 'nack' | 'publish'>>;
  let servico: EnviarComandoRastreadorService;

  beforeEach((): void => {
    logger = {
      debug              : jest.fn(),
      error              : jest.fn(),
      salvarLogRastreador: jest.fn(),
    };
    canal = {
      ack    : jest.fn(),
      nack   : jest.fn(),
      publish: jest.fn(),
    };
    servico = new EnviarComandoRastreadorService(
      {} as AmqpConnection,
      {} as ConfigService,
      logger as ILoger,
    );
    (servico as unknown as { channel: Channel }).channel = canal as unknown as Channel;
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

    expect(socket.write).toHaveBeenCalledTimes(1);
    expect(socket.write).toHaveBeenCalledWith(comando);
    expect(logger.salvarLogRastreador).toHaveBeenCalledWith(
      '123456789012345',
      'ST300CMD;123456789012345;02;Enable1',
      'enviada',
    );
  });

  it('deve rejeitar comando para retry quando rastreador estiver desconectado na primeira tentativa', (): void => {
    const comando: Buffer = Buffer.from('ST300CMD;123456789012345;02;Enable1', 'ascii');
    const mensagem: ConsumeMessage = criarMensagemComando('123456789012345');
    obterConexao.mockReturnValue(null);

    servico.enviarComando(mensagem, comando);

    expect(canal.nack).toHaveBeenCalledTimes(1);
    expect(canal.nack).toHaveBeenCalledWith(mensagem, false, false);
    expect(canal.ack).not.toHaveBeenCalled();
    expect(canal.publish).not.toHaveBeenCalled();
  });

  it('deve rejeitar comando para retry quando tentativas estiverem abaixo do limite', (): void => {
    const comando: Buffer = Buffer.from('ST300CMD;123456789012345;02;Enable1', 'ascii');
    const mensagem: ConsumeMessage = criarMensagemComando(
      '123456789012345',
      criarHeadersTentativasComando(10),
    );
    obterConexao.mockReturnValue(null);

    servico.enviarComando(mensagem, comando);

    expect(canal.nack).toHaveBeenCalledTimes(1);
    expect(canal.nack).toHaveBeenCalledWith(mensagem, false, false);
    expect(canal.ack).not.toHaveBeenCalled();
    expect(canal.publish).not.toHaveBeenCalled();
  });

  it('deve confirmar e publicar erro quando tentativas atingirem o limite', (): void => {
    const comando: Buffer = Buffer.from('ST300CMD;123456789012345;02;Enable1', 'ascii');
    const mensagem: ConsumeMessage = criarMensagemComando(
      '123456789012345',
      criarHeadersTentativasComando(720),
    );
    obterConexao.mockReturnValue(null);

    servico.enviarComando(mensagem, comando);

    expect(canal.nack).not.toHaveBeenCalled();
    expect(canal.ack).toHaveBeenCalledTimes(1);
    expect(canal.ack).toHaveBeenCalledWith(mensagem, false);
    expect(canal.publish).toHaveBeenCalledWith(
      'amq.direct',
      'rastreador.erro',
      mensagem.content,
    );
    expect(obterStatusComandoPublicado(canal)).toBe('erro');
  });

  it('deve encerrar comando semanticamente inválido sem retry ou escrita no socket', (): void => {
    const mensagem: ConsumeMessage = criarMensagemComando('123456789012345');
    const comandoUsuario: ComandoUsuarioEntity | undefined = servico.decodificarMsg(mensagem);
    if (comandoUsuario === undefined) {
      throw new Error('O contrato base do comando de teste deve ser válido.');
    }

    servico.rejeitarComandoInvalido(mensagem, comandoUsuario);

    expect(canal.ack).toHaveBeenCalledTimes(1);
    expect(canal.ack).toHaveBeenCalledWith(mensagem, false);
    expect(canal.nack).not.toHaveBeenCalled();
    expect(canal.publish).toHaveBeenCalledWith(
      'amq.direct',
      'rastreador.erro',
      mensagem.content,
    );
    expect(obterStatusComandoPublicado(canal)).toBe('erro');
    expect(obterConexao).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'Comando rejeitado por falha de validação do protocolo.',
    );
  });

  it('deve encerrar payload estruturalmente inválido sem publicar status de comando', (): void => {
    const mensagem: ConsumeMessage = criarMensagemInvalida();

    servico.enviarComando(mensagem, Buffer.from('comando não utilizado', 'utf8'));

    expect(canal.ack).toHaveBeenCalledTimes(1);
    expect(canal.ack).toHaveBeenCalledWith(mensagem, false);
    expect(canal.nack).not.toHaveBeenCalled();
    expect(canal.publish).toHaveBeenCalledTimes(1);
    expect(canal.publish).toHaveBeenCalledWith(
      'amq.direct',
      'rastreador.erro',
      mensagem.content,
    );
    expect(obterConexao).not.toHaveBeenCalled();
  });
});

function criarMensagemComando(imei: string, headers: MessagePropertyHeaders = {}): ConsumeMessage {
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
      headers,
    },
  } as ConsumeMessage;
}

function criarMensagemInvalida(): ConsumeMessage {
  return {
    content: Buffer.from('{', 'ascii'),
  } as ConsumeMessage;
}

function criarHeadersTentativasComando(tentativas: number): MessagePropertyHeaders {
  return {
    'x-death': [
      {
        'count'       : tentativas,
        'exchange'    : 'amq.direct',
        'queue'       : 'rastreador.comando',
        'reason'      : 'rejected',
        'time'        : { '!': 'timestamp', 'value': 0 },
        'routing-keys': ['rastreador.comando'],
      },
    ],
  };
}

function obterStatusComandoPublicado(canalComandos: jest.Mocked<Pick<Channel, 'publish'>>): string {
  const publicacaoMensagem = canalComandos.publish.mock.calls.find(
    ([, routingKey]: Parameters<Channel['publish']>): boolean => routingKey === 'rastreador.mensagem',
  );

  if (publicacaoMensagem === undefined) {
    throw new Error('Status do comando nao publicado.');
  }

  const [, , conteudo] = publicacaoMensagem;
  const statusPublicado = JSON.parse(conteudo.toString('ascii')) as { data: { status: string } };

  return statusPublicado.data.status;
}
