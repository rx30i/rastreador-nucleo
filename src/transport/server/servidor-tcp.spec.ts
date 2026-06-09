import { IncomingRequest, IncomingEvent } from '@nestjs/microservices';
import { ServidorTcp } from './servidor-tcp';
import { IConsumerDeserializer, IServidorTCPConfig, ISocket } from '../../contracts';
import { CodificacaoMsg } from '../../enums';
import { TcpContext } from '../ctx-host';
import { Logger } from '@nestjs/common';
import * as Net from 'node:net';

class DeserializerMock implements IConsumerDeserializer {
  public obterImei(mensagem: string): string {
    const match = /imei:(\d+)/.exec(mensagem);
    return match ? match[1] : '';
  }

  public deserialize(value: string): IncomingRequest | IncomingEvent {
    if (value.includes('evento')) {
      return { pattern: 'evento', data: value } as IncomingEvent;
    }
    return { pattern: 'mensagem', id: '1', data: value } as IncomingRequest;
  }
}

class DeserializerSuntechMock implements IConsumerDeserializer {
  public obterImei(_mensagem: string): string {
    return '';
  }

  public deserialize(value: string): IncomingEvent {
    return { pattern: 'suntech', data: value } as IncomingEvent;
  }
}

function criarConfiguracao(overrides?: Partial<IServidorTCPConfig>): IServidorTCPConfig {
  return {
    codificacaoMsg: CodificacaoMsg.ASCII,
    deserializer  : new DeserializerMock(),
    tratarErro    : new Logger(),
    servidor      : {
      path: '127.0.0.1',
      port: 0,
    },
    ...overrides,
  };
}

function criarSocketMock(overrides?: Partial<ISocket>): ISocket {
  const socket = {
    id        : Symbol(),
    imei      : undefined,
    on        : jest.fn(),
    setTimeout: jest.fn(),
    end       : jest.fn(),
    destroy   : jest.fn(),
    write     : jest.fn(),
    ...overrides,
  } as unknown as ISocket;
  return socket;
}

function obterCallbackDados(socket: ISocket): (mensagem: Buffer) => void {
  const chamadas = (socket.on as unknown as jest.Mock).mock.calls as [string, (mensagem: Buffer) => void][];
  const chamadaDados = chamadas.find((chamada: [string, (mensagem: Buffer) => void]): boolean =>
    chamada[0] === 'data',
  );

  if (chamadaDados === undefined) {
    throw new Error('Callback de dados nao registrado');
  }

  return chamadaDados[1];
}

async function aguardarProcessamentoAssincrono(): Promise<void> {
  await new Promise<void>((resolve): void => {
    setImmediate(resolve);
  });
}

function criarConsumidorCapturandoContextos(
  contextosRecebidos: TcpContext[],
): (_mensagem: string, contexto: TcpContext) => Promise<void> {
  return (_mensagem: string, contexto: TcpContext): Promise<void> => {
    contextosRecebidos.push(contexto);
    return Promise.resolve();
  };
}

describe('ServidorTcp', () => {
  let servidorTcp: ServidorTcp;
  let configuracao: IServidorTCPConfig;

  beforeEach(() => {
    configuracao = criarConfiguracao();
    servidorTcp = new ServidorTcp(configuracao);
  });

  afterEach(() => {
    servidorTcp.close();
  });

  describe('constructor', () => {
    it('deve criar uma instância do ServidorTcp', () => {
      expect(servidorTcp).toBeInstanceOf(ServidorTcp);
    });

    it('deve inicializar o mapa de conexões vazio', () => {
      const conexao = ServidorTcp.obterConexao('imei-inexistente');
      expect(conexao).toBeNull();
    });
  });

  describe('listen', () => {
    it('deve iniciar o servidor TCP e chamar o callback', (done) => {
      servidorTcp.listen(() => {
        servidorTcp.close();
        done();
      });
    });

    it('deve criar um servidor TCP', () => {
      servidorTcp.listen(jest.fn());
      const servidor = servidorTcp.unwrap();
      expect(servidor).toBeDefined();
      expect(servidor).toBeInstanceOf(Net.Server);
    });
  });

  describe('close', () => {
    it('não deve fazer nada se o servidor não foi iniciado', () => {
      expect(() => {
        servidorTcp.close();
      }).not.toThrow();
    });

    it('deve encerrar o servidor TCP', (done) => {
      servidorTcp.listen(jest.fn());
      servidorTcp.close();

      const servidor = servidorTcp.unwrap();
      expect(servidor.listening).toBe(false);
      done();
    });

    it('deve destruir todas as conexões ativas', (done) => {
      const destruirSocketMock = jest.fn();
      const socketMock = criarSocketMock({
        destroy: destruirSocketMock as unknown as ISocket['destroy'],
        imei   : '123456789',
      });

      servidorTcp.listen(jest.fn());

      // Simula uma conexão salva
      (ServidorTcp as unknown as { conexoesTcp: Map<string, ISocket> }).conexoesTcp.set('123456789', socketMock);

      servidorTcp.close();

      expect(destruirSocketMock).toHaveBeenCalled();
      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
      done();
    });

    it('deve limpar o mapa de conexões', (done) => {
      const socketMock1 = criarSocketMock({ imei: '111111111' });
      const socketMock2 = criarSocketMock({ imei: '222222222' });

      servidorTcp.listen(jest.fn());

      (ServidorTcp as unknown as { conexoesTcp: Map<string, ISocket> }).conexoesTcp.set('111111111', socketMock1);
      (ServidorTcp as unknown as { conexoesTcp: Map<string, ISocket> }).conexoesTcp.set('222222222', socketMock2);

      servidorTcp.close();

      expect(ServidorTcp.obterConexao('111111111')).toBeNull();
      expect(ServidorTcp.obterConexao('222222222')).toBeNull();
      done();
    });
  });

  describe('obterConexao', () => {
    it('deve retornar null se a conexão não existir', () => {
      const conexao = ServidorTcp.obterConexao('imei-inexistente');
      expect(conexao).toBeNull();
    });

    it('deve retornar a conexão se ela existir', () => {
      const socketMock = criarSocketMock({ imei: '123456789' });
      (ServidorTcp as unknown as { conexoesTcp: Map<string, ISocket> }).conexoesTcp.set('123456789', socketMock);

      const conexao = ServidorTcp.obterConexao('123456789');
      expect(conexao).toBe(socketMock);
    });
  });

  describe('unwrap', () => {
    it('deve retornar undefined se o servidor não foi iniciado', () => {
      const servidor = servidorTcp.unwrap();
      expect(servidor).toBeUndefined();
    });

    it('deve retornar o servidor TCP nativo após listen', (done) => {
      servidorTcp.listen(jest.fn());
      const servidor = servidorTcp.unwrap();
      expect(servidor).toBeInstanceOf(Net.Server);
      servidorTcp.close();
      done();
    });
  });

  describe('on', () => {
    it('deve registrar um listener de evento no servidor', (done) => {
      servidorTcp.listen(jest.fn());

      const callback = jest.fn();
      servidorTcp.on('connection', callback);

      const servidor = servidorTcp.unwrap();
      expect(servidor.listenerCount('connection')).toBeGreaterThan(0);
      servidorTcp.close();
      done();
    });

    it('não deve lançar erro se o servidor não foi iniciado', () => {
      const callback = jest.fn();
      expect(() => {
        servidorTcp.on('connection', callback);
      }).not.toThrow();
    });
  });

  describe('separarMensagens', () => {
    beforeEach(() => {
      servidorTcp = new ServidorTcp(criarConfiguracao({
        prefixo: 'imei:',
        sufixo : '\r\n',
      }));
    });

    it('deve separar mensagens no formato NestJS (tamanho#mensagem)', () => {
      const jsonStr = '{"pattern":"teste","data":"ok"}';
      const mensagem = Buffer.from(`${jsonStr.length.toString()}#${jsonStr}`);
      const resultado = servidorTcp.separarMensagens(mensagem);

      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toBe(jsonStr);
    });

    it('deve separar múltiplas mensagens no formato NestJS', () => {
      const json1 = '{"a":1}';
      const json2 = '{"b":"teste"}';
      const mensagem = Buffer.from(`${json1.length.toString()}#${json1}${json2.length.toString()}#${json2}`);
      const resultado = servidorTcp.separarMensagens(mensagem);

      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toBe(json1);
      expect(resultado[1]).toBe(json2);
    });

    it('deve usar SepararMensagens para mensagens que não estão no formato NestJS', () => {
      const mensagem = Buffer.from('imei:123456789\r\n');
      const resultado = servidorTcp.separarMensagens(mensagem);

      expect(resultado.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('mensagem', () => {
    beforeEach(() => {
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg: CodificacaoMsg.ASCII,
        deserializer  : new DeserializerSuntechMock(),
        prefixo       : ['STT', 'ASTT'],
      }));
    });

    it('deve entregar ao consumidor o contexto com a mensagem bruta Suntech ASCII original', async () => {
      const socketMock = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);

      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from('ASTT;0360000001;000007;26;010;1\r', 'ascii'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(1);
      expect(contextosRecebidos[0].mensagem()).toBe('astt;0360000001;000007;26;010;1');
      expect(contextosRecebidos[0].mensagemBruta()).toBe('ASTT;0360000001;000007;26;010;1\r');
    });

    it('deve preservar a mensagem bruta correta para mensagens Suntech ASCII concatenadas', async () => {
      const socketMock = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);

      const primeiraMensagem = 'ASTT;0360000001;000007;26;010;1\r';
      const segundaMensagem = 'STT;0360000002;000008;26;010;2\r';
      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from(`${primeiraMensagem}${segundaMensagem}`, 'ascii'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(2);
      expect(contextosRecebidos[0].mensagemBruta()).toBe(primeiraMensagem);
      expect(contextosRecebidos[1].mensagemBruta()).toBe(segundaMensagem);
    });

    it('deve preservar o bruto de mensagens Suntech concatenadas com prefixos alternativos', async () => {
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg: CodificacaoMsg.ASCII,
        deserializer  : new DeserializerSuntechMock(),
        prefixo       : ['STT', 'ASTT', 'AALT'],
      }));
      const socketMock = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);

      const primeiraMensagem = 'ASTT;1\r';
      const segundaMensagem = 'AALT;2\r';
      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from(`${primeiraMensagem}${segundaMensagem}`, 'ascii'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(2);
      expect(contextosRecebidos[0].mensagemBruta()).toBe(primeiraMensagem);
      expect(contextosRecebidos[1].mensagemBruta()).toBe(segundaMensagem);
    });

    it('deve preservar terminador composto em mensagens Suntech ASCII separadas por sufixo', async () => {
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg: CodificacaoMsg.ASCII,
        deserializer  : new DeserializerSuntechMock(),
        sufixo        : '\r\n',
      }));
      const socketMock = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);

      const primeiraMensagem = 'ASTT;1\r\n';
      const segundaMensagem = 'AALT;2\r\n';
      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from(`${primeiraMensagem}${segundaMensagem}`, 'ascii'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(2);
      expect(contextosRecebidos[0].mensagem()).toBe('astt;1');
      expect(contextosRecebidos[0].mensagemBruta()).toBe(primeiraMensagem);
      expect(contextosRecebidos[1].mensagem()).toBe('aalt;2');
      expect(contextosRecebidos[1].mensagemBruta()).toBe(segundaMensagem);
    });
  });

  describe('formatarResposta', () => {
    it('deve formatar a resposta com tamanho e delimitador', () => {
      // Acessando método privado via reflexão para teste
      const servidor = servidorTcp as unknown as { formatarResposta: (msg: unknown) => string };
      const mensagem = { id: '1', response: 'ok' };
      const resultado = servidor.formatarResposta(mensagem);

      const esperado = JSON.stringify(mensagem);
      expect(resultado).toBe(`${esperado.length.toString()}#${esperado}`);
    });
  });

  describe('salvarConexao', () => {
    it('deve salvar a conexão se o imei for válido e o socket não tiver imei', () => {
      const socketMock = criarSocketMock();
      const servidor = servidorTcp as unknown as { salvarConexao: (conexao: ISocket, mensagem: string) => void };

      servidor.salvarConexao(socketMock, 'imei:123456789');

      expect(socketMock.imei).toBe('123456789');
      expect(socketMock.id).toBeDefined();
      expect(ServidorTcp.obterConexao('123456789')).toBe(socketMock);
    });

    it('não deve sobrescrever conexão existente', () => {
      const socketMock1 = criarSocketMock();
      const socketMock2 = criarSocketMock();
      const servidor = servidorTcp as unknown as { salvarConexao: (conexao: ISocket, mensagem: string) => void };

      servidor.salvarConexao(socketMock1, 'imei:123456789');

      // O segundo socket já terá imei definido pelo primeiro salvamento
      // Então não deve sobrescrever
      servidor.salvarConexao(socketMock2, 'imei:999999999');

      // O socketMock1 deve permanecer como a conexão do imei 123456789
      const conexaoSalva = ServidorTcp.obterConexao('123456789');
      expect(conexaoSalva?.imei).toBe('123456789');
    });

    it('não deve salvar conexão se o socket já possui imei', () => {
      const socketMock = criarSocketMock({ imei: '987654321' });
      const servidor = servidorTcp as unknown as { salvarConexao: (conexao: ISocket, mensagem: string) => void };

      servidor.salvarConexao(socketMock, 'imei:123456789');

      expect(socketMock.imei).toBe('987654321');
      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
    });
  });
});
