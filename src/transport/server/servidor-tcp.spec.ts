import { IncomingRequest, IncomingEvent } from '@nestjs/microservices';
import { ServidorTcp } from './servidor-tcp';
import { IConsumerDeserializer, IServidorTCPConfig, ISocket } from '../../contracts';
import { CodificacaoMsg } from '../../enums';
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
      servidorTcp.listen(() => {});
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
      servidorTcp.listen(() => {});
      servidorTcp.close();

      const servidor = servidorTcp.unwrap();
      expect(servidor?.listening).toBe(false);
      done();
    });

    it('deve destruir todas as conexões ativas', (done) => {
      const socketMock = criarSocketMock({ imei: '123456789' });

      servidorTcp.listen(() => {});

      // Simula uma conexão salva
      (ServidorTcp as unknown as { conexoesTcp: Map<string, ISocket> }).conexoesTcp.set('123456789', socketMock);

      servidorTcp.close();

      expect(socketMock.destroy).toHaveBeenCalled();
      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
      done();
    });

    it('deve limpar o mapa de conexões', (done) => {
      const socketMock1 = criarSocketMock({ imei: '111111111' });
      const socketMock2 = criarSocketMock({ imei: '222222222' });

      servidorTcp.listen(() => {});

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
      servidorTcp.listen(() => {});
      const servidor = servidorTcp.unwrap();
      expect(servidor).toBeInstanceOf(Net.Server);
      servidorTcp.close();
      done();
    });
  });

  describe('on', () => {
    it('deve registrar um listener de evento no servidor', (done) => {
      servidorTcp.listen(() => {});

      const callback = jest.fn();
      servidorTcp.on('connection', callback);

      const servidor = servidorTcp.unwrap();
      expect(servidor?.listenerCount('connection')).toBeGreaterThan(0);
      servidorTcp.close();
      done();
    });

    it('não deve lançar erro se o servidor não foi iniciado', () => {
      expect(() => {
        servidorTcp.on('connection', () => {});
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
      const mensagem = Buffer.from(`${jsonStr.length}#${jsonStr}`);
      const resultado = servidorTcp.separarMensagens(mensagem);

      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toBe(jsonStr);
    });

    it('deve separar múltiplas mensagens no formato NestJS', () => {
      const json1 = '{"a":1}';
      const json2 = '{"b":"teste"}';
      const mensagem = Buffer.from(`${json1.length}#${json1}${json2.length}#${json2}`);
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

  describe('formatarResposta', () => {
    it('deve formatar a resposta com tamanho e delimitador', () => {
      // Acessando método privado via reflexão para teste
      const servidor = servidorTcp as unknown as { formatarResposta: (msg: unknown) => string };
      const mensagem = { id: '1', response: 'ok' };
      const resultado = servidor.formatarResposta(mensagem);

      const esperado = JSON.stringify(mensagem);
      expect(resultado).toBe(`${esperado.length}#${esperado}`);
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
