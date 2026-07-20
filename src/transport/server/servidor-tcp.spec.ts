import { IncomingEvent } from '@nestjs/microservices';
import { ServidorTcp } from './servidor-tcp';
import { IConsumerDeserializer, IServidorTCPConfig, ISocket } from '../../contracts';
import { CodificacaoMsg, Pattern } from '../../enums';
import { TcpContext } from '../ctx-host';
import { Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import * as Net from 'node:net';

class DeserializerMock implements IConsumerDeserializer {
  public obterImei(mensagem: string): string {
    const match = /imei:(\d+)/.exec(mensagem);
    return match ? match[1] : '';
  }

  public deserialize(value: string): IncomingEvent {
    const pattern = value.includes('evento') ? 'evento' : 'mensagem';
    return { pattern, data: value } as IncomingEvent;
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
    destroyed : false,
    id        : Symbol(),
    imei      : undefined,
    on        : jest.fn(),
    once      : jest.fn(),
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

function obterCallbackEvento(
  socket: ISocket,
  evento: string,
  metodo: 'on' | 'once' = 'on',
): (...argumentos: unknown[]) => void {
  const registrarEvento = socket[metodo] as unknown as jest.Mock;
  const chamadas = registrarEvento.mock.calls as [
    string,
    (...argumentos: unknown[]) => void,
  ][];
  const chamada = chamadas.find(
    (chamadaRegistrada: [
      string,
      (...argumentos: unknown[]) => void,
    ]): boolean => chamadaRegistrada[0] === evento,
  );

  if (chamada === undefined) {
    throw new Error(`Callback do evento ${evento} nao registrado`);
  }

  return chamada[1];
}

function configurarConexaoNoServidor(
  servidorTcp: ServidorTcp,
  socket: ISocket,
): void {
  const servidor = servidorTcp as unknown as {
    configurarConexao: (conexao: ISocket) => void;
  };
  servidor.configurarConexao(socket);
}

function salvarConexaoNoServidor(
  servidorTcp: ServidorTcp,
  socket: ISocket,
  mensagem: string,
): void {
  const servidor = servidorTcp as unknown as {
    mensagem: (conexao: ISocket) => void;
  };
  servidor.mensagem(socket);
  salvarConexaoAtivaNoServidor(servidorTcp, socket, mensagem);
}

function salvarConexaoAtivaNoServidor(
  servidorTcp: ServidorTcp,
  socket: ISocket,
  mensagem: string,
): void {
  const servidor = servidorTcp as unknown as {
    salvarConexao: (conexao: ISocket, conteudo: string) => void;
  };
  servidor.salvarConexao(socket, mensagem);
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

function registrarConsumidorConexaoFechada(
  servidorTcp: ServidorTcp,
): jest.Mock {
  const consumidor = jest.fn(
    (_mensagem: { imei: string }): Promise<void> => Promise.resolve(),
  );
  servidorTcp.addHandler(Pattern.CONEXAO_FECHADA, consumidor, true);
  return consumidor;
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

    it('não deve apagar conexões ao criar outra instância', () => {
      const socketMock = criarSocketMock();
      salvarConexaoNoServidor(servidorTcp, socketMock, 'imei:123456789');

      const outroServidor = new ServidorTcp(criarConfiguracao());

      expect(ServidorTcp.obterConexao('123456789')).toBe(socketMock);
      outroServidor.close();
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

      salvarConexaoNoServidor(
        servidorTcp,
        socketMock,
        'imei:123456789',
      );

      servidorTcp.close();

      expect(destruirSocketMock).toHaveBeenCalled();
      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
      done();
    });

    it('deve limpar o mapa de conexões', (done) => {
      const socketMock1 = criarSocketMock();
      const socketMock2 = criarSocketMock();

      salvarConexaoNoServidor(servidorTcp, socketMock1, 'imei:111111111');
      salvarConexaoNoServidor(servidorTcp, socketMock2, 'imei:222222222');

      servidorTcp.close();

      expect(ServidorTcp.obterConexao('111111111')).toBeNull();
      expect(ServidorTcp.obterConexao('222222222')).toBeNull();
      done();
    });

    it('deve destruir conexões ainda não identificadas', () => {
      const destruirSocket = jest.fn();
      const socketMock = criarSocketMock({
        destroy: destruirSocket as unknown as ISocket['destroy'],
      });
      const servidor = servidorTcp as unknown as {
        mensagem: (conexao: ISocket) => void;
      };
      servidor.mensagem(socketMock);

      servidorTcp.close();

      expect(destruirSocket).toHaveBeenCalledTimes(1);
    });

    it('não deve remover conexões pertencentes a outra instância', () => {
      const primeiroServidor = servidorTcp;
      const segundoServidor = new ServidorTcp(criarConfiguracao());
      const primeiroSocket = criarSocketMock();
      const segundoSocket = criarSocketMock();

      salvarConexaoNoServidor(primeiroServidor, primeiroSocket, 'imei:111111111');
      salvarConexaoNoServidor(segundoServidor, segundoSocket, 'imei:222222222');

      primeiroServidor.close();

      expect(ServidorTcp.obterConexao('111111111')).toBeNull();
      expect(ServidorTcp.obterConexao('222222222')).toBe(segundoSocket);
      segundoServidor.close();
    });
  });

  describe('obterConexao', () => {
    it('deve retornar null se a conexão não existir', () => {
      const conexao = ServidorTcp.obterConexao('imei-inexistente');
      expect(conexao).toBeNull();
    });

    it('deve retornar a conexão se ela existir', () => {
      const socketMock = criarSocketMock();
      salvarConexaoNoServidor(servidorTcp, socketMock, 'imei:123456789');

      const conexao = ServidorTcp.obterConexao('123456789');
      expect(conexao).toBe(socketMock);
    });

    it('deve remover e retornar null para uma conexão destruída', () => {
      const socketMock = criarSocketMock({
        destroyed: true,
        imei     : '123456789',
      });
      const servidor = ServidorTcp as unknown as {
        conexoesTcp: Map<string, ISocket>;
      };
      servidor.conexoesTcp.set('123456789', socketMock);

      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
      expect(servidor.conexoesTcp.has('123456789')).toBe(false);
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

    it('deve separar mensagens concatenadas do rastreador', () => {
      const primeiraMensagem = 'imei:123456789\r\n';
      const segundaMensagem = 'imei:987654321\r\n';
      const mensagem = Buffer.from(`${primeiraMensagem}${segundaMensagem}`);
      const resultado = servidorTcp.separarMensagens(mensagem);

      expect(resultado).toEqual([primeiraMensagem, segundaMensagem]);
    });
  });

  describe('separarMensagens com delimitador simetrico', () => {
    it('deve separar quadros completos com delimitador simetrico', () => {
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg: CodificacaoMsg.HEX,
        prefixo       : '7e',
        sufixo        : '7e',
      }));
      const primeiroQuadro = '7E0102037E';
      const segundoQuadro = '7E0405067E';

      expect(
        servidorTcp.separarMensagens(
          Buffer.from(`${primeiroQuadro}${segundoQuadro}`, 'hex'),
        ),
      ).toEqual([
        primeiroQuadro.toLowerCase(),
        segundoQuadro.toLowerCase(),
      ]);
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

    it('deve processar mensagens em ordem quando o primeiro consumidor for assincrono', async () => {
      const socketMock = criarSocketMock();
      const ordemProcessamento: string[] = [];
      let liberarPrimeiraMensagem: () => void = (): void => undefined;
      const primeiraMensagemPendente = new Promise<void>((resolve): void => {
        liberarPrimeiraMensagem = resolve;
      });
      const consumidor = jest.fn(async (mensagem: string): Promise<void> => {
        ordemProcessamento.push(`inicio:${mensagem}`);
        if (mensagem.includes('primeira')) {
          await primeiraMensagemPendente;
        }
        ordemProcessamento.push(`fim:${mensagem}`);
      });
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as {
        mensagem: (socket: ISocket) => void;
      };
      servidor.mensagem(socketMock);
      obterCallbackDados(socketMock)(
        Buffer.from('STT;primeira\rSTT;segunda\r', 'ascii'),
      );
      await aguardarProcessamentoAssincrono();

      expect(ordemProcessamento).toEqual(['inicio:stt;primeira']);

      liberarPrimeiraMensagem();
      await aguardarProcessamentoAssincrono();

      expect(ordemProcessamento).toEqual([
        'inicio:stt;primeira',
        'fim:stt;primeira',
        'inicio:stt;segunda',
        'fim:stt;segunda',
      ]);
    });

    it('deve registrar falha do deserializador e processar a mensagem seguinte', async () => {
      const logger = new Logger();
      const registrarErro = jest.spyOn(logger, 'error').mockImplementation();
      const rejeicoesNaoTratadas: unknown[] = [];
      const observarRejeicao = (motivo: unknown): void => {
        rejeicoesNaoTratadas.push(motivo);
      };
      const deserializer: IConsumerDeserializer = {
        deserialize: (mensagem: string): IncomingEvent => {
          if (mensagem.includes('primeira')) {
            throw new Error('Falha ao deserializar');
          }

          return { pattern: 'suntech', data: mensagem } as IncomingEvent;
        },
        obterImei: (_mensagem: string): string => '',
      };
      servidorTcp = new ServidorTcp(criarConfiguracao({
        deserializer,
        prefixo   : 'STT',
        tratarErro: logger,
      }));
      const consumidor = jest.fn((_mensagem: string): Promise<void> => Promise.resolve());
      const socketMock = criarSocketMock();
      servidorTcp.addHandler('suntech', consumidor, true);
      process.on('unhandledRejection', observarRejeicao);

      try {
        const servidor = servidorTcp as unknown as {
          mensagem: (socket: ISocket) => void;
        };
        servidor.mensagem(socketMock);
        obterCallbackDados(socketMock)(
          Buffer.from('STT;primeira\rSTT;segunda\r', 'ascii'),
        );
        await aguardarProcessamentoAssincrono();

        expect(registrarErro).toHaveBeenCalledWith(
          'ServidorTcp',
          expect.stringContaining('Falha ao deserializar'),
        );
        expect(consumidor).toHaveBeenCalledTimes(1);
        expect(consumidor).toHaveBeenCalledWith(
          'stt;segunda',
          expect.any(TcpContext),
        );
        expect(rejeicoesNaoTratadas).toEqual([]);
      } finally {
        process.off('unhandledRejection', observarRejeicao);
      }
    });

    it('deve registrar falha do consumidor e processar a mensagem seguinte', async () => {
      const logger = new Logger();
      const registrarErro = jest.spyOn(logger, 'error').mockImplementation();
      const rejeicoesNaoTratadas: unknown[] = [];
      const observarRejeicao = (motivo: unknown): void => {
        rejeicoesNaoTratadas.push(motivo);
      };
      servidorTcp = new ServidorTcp(criarConfiguracao({
        deserializer: new DeserializerSuntechMock(),
        prefixo     : 'STT',
        tratarErro  : logger,
      }));
      const consumidor = jest.fn((mensagem: string): Promise<void> => {
        if (mensagem.includes('primeira')) {
          return Promise.reject(new Error('Falha no consumidor'));
        }

        return Promise.resolve();
      });
      const socketMock = criarSocketMock();
      servidorTcp.addHandler('suntech', consumidor, true);
      process.on('unhandledRejection', observarRejeicao);

      try {
        const servidor = servidorTcp as unknown as {
          mensagem: (socket: ISocket) => void;
        };
        servidor.mensagem(socketMock);
        obterCallbackDados(socketMock)(
          Buffer.from('STT;primeira\rSTT;segunda\r', 'ascii'),
        );
        await aguardarProcessamentoAssincrono();

        expect(registrarErro).toHaveBeenCalledWith(
          'ServidorTcp',
          expect.stringContaining('Falha no consumidor'),
        );
        expect(consumidor).toHaveBeenCalledTimes(2);
        expect(rejeicoesNaoTratadas).toEqual([]);
      } finally {
        process.off('unhandledRejection', observarRejeicao);
      }
    });

    it('deve registrar consumidor que nao usa EventPattern sem destruir o socket', async () => {
      const logger = new Logger();
      const registrarErro = jest.spyOn(logger, 'error').mockImplementation();
      const destruirSocket = jest.fn();
      const socketMock = criarSocketMock({
        destroy: destruirSocket as unknown as ISocket['destroy'],
      });
      servidorTcp = new ServidorTcp(criarConfiguracao({
        deserializer: new DeserializerSuntechMock(),
        prefixo     : 'STT',
        tratarErro  : logger,
      }));
      servidorTcp.addHandler('suntech', jest.fn(), false);

      const servidor = servidorTcp as unknown as {
        mensagem: (socket: ISocket) => void;
      };
      servidor.mensagem(socketMock);
      obterCallbackDados(socketMock)(Buffer.from('STT;mensagem\r', 'ascii'));
      await aguardarProcessamentoAssincrono();

      expect(registrarErro).toHaveBeenCalledWith(
        expect.stringContaining('@EventPattern'),
      );
      expect(destruirSocket).not.toHaveBeenCalled();
    });
  });

  describe('exibicao de mensagens brutas recebidas', () => {
    it('nao deve registrar a mensagem quando a opcao nao for informada', async () => {
      const logger = new Logger();
      const registrarMensagem = jest.spyOn(logger, 'log').mockImplementation();
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg: CodificacaoMsg.ASCII,
        deserializer  : new DeserializerSuntechMock(),
        prefixo       : ['STT', 'ASTT'],
        tratarErro    : logger,
      }));
      const socketMock = criarSocketMock();
      servidorTcp.addHandler('suntech', jest.fn(), true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);
      obterCallbackDados(socketMock)(Buffer.from('ASTT;1\r', 'ascii'));
      await aguardarProcessamentoAssincrono();

      expect(registrarMensagem).not.toHaveBeenCalled();
    });

    it('nao deve registrar a mensagem quando a opcao for falsa', async () => {
      const logger = new Logger();
      const registrarMensagem = jest.spyOn(logger, 'log').mockImplementation();
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg                : CodificacaoMsg.ASCII,
        deserializer                  : new DeserializerSuntechMock(),
        exibirMensagensBrutasRecebidas: false,
        prefixo                       : ['STT', 'ASTT'],
        tratarErro                    : logger,
      }));
      const socketMock = criarSocketMock();
      servidorTcp.addHandler('suntech', jest.fn(), true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);
      obterCallbackDados(socketMock)(Buffer.from('ASTT;1\r', 'ascii'));
      await aguardarProcessamentoAssincrono();

      expect(registrarMensagem).not.toHaveBeenCalled();
    });

    it('deve registrar a mensagem ASCII bruta com caixa e terminador originais', async () => {
      const logger = new Logger();
      const registrarMensagem = jest.spyOn(logger, 'log').mockImplementation();
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg                : CodificacaoMsg.ASCII,
        deserializer                  : new DeserializerSuntechMock(),
        exibirMensagensBrutasRecebidas: true,
        prefixo                       : ['STT', 'ASTT'],
        tratarErro                    : logger,
      }));
      const socketMock = criarSocketMock();
      servidorTcp.addHandler('suntech', jest.fn(), true);

      const mensagemBruta = 'ASTT;Mensagem Original\r';
      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);
      obterCallbackDados(socketMock)(Buffer.from(mensagemBruta, 'ascii'));
      await aguardarProcessamentoAssincrono();

      expect(registrarMensagem).toHaveBeenCalledTimes(1);
      expect(registrarMensagem).toHaveBeenCalledWith(
        `RASTREADOR RECEBIDO: ${mensagemBruta}`,
      );
    });

    it('deve registrar cada quadro hexadecimal concatenado separadamente', async () => {
      const logger = new Logger();
      const registrarMensagem = jest.spyOn(logger, 'log').mockImplementation();
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg                : CodificacaoMsg.HEX,
        deserializer                  : new DeserializerSuntechMock(),
        exibirMensagensBrutasRecebidas: true,
        prefixo                       : ['7878', '7979'],
        sufixo                        : '0d0a',
        tratarErro                    : logger,
      }));
      const socketMock = criarSocketMock();
      servidorTcp.addHandler('suntech', jest.fn(), true);

      const primeiroQuadro = '787801020d0a';
      const segundoQuadro = '797903040d0a';
      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);
      obterCallbackDados(socketMock)(Buffer.from(`${primeiroQuadro}${segundoQuadro}`, 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(registrarMensagem).toHaveBeenCalledTimes(2);
      expect(registrarMensagem).toHaveBeenNthCalledWith(
        1,
        `RASTREADOR RECEBIDO: ${primeiroQuadro}`,
      );
      expect(registrarMensagem).toHaveBeenNthCalledWith(
        2,
        `RASTREADOR RECEBIDO: ${segundoQuadro}`,
      );
    });

    it('deve registrar quadro fragmentado somente depois de completo', async () => {
      const logger = new Logger();
      const registrarMensagem = jest.spyOn(logger, 'log').mockImplementation();
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg                : CodificacaoMsg.HEX,
        deserializer                  : new DeserializerSuntechMock(),
        exibirMensagensBrutasRecebidas: true,
        prefixo                       : ['7878', '7979'],
        sufixo                        : '0d0a',
        tratarErro                    : logger,
      }));
      const socketMock = criarSocketMock();
      servidorTcp.addHandler('suntech', jest.fn(), true);

      const quadro = '787801020d0a';
      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);
      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from(quadro.slice(0, -4), 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(registrarMensagem).not.toHaveBeenCalled();

      callbackDados(Buffer.from(quadro.slice(-4), 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(registrarMensagem).toHaveBeenCalledTimes(1);
      expect(registrarMensagem).toHaveBeenCalledWith(
        `RASTREADOR RECEBIDO: ${quadro}`,
      );
    });
  });

  describe('mensagem com prefixo e sufixo distintos', () => {
    beforeEach(() => {
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg: CodificacaoMsg.HEX,
        deserializer  : new DeserializerSuntechMock(),
        prefixo       : ['7878', '7979'],
        sufixo        : '0d0a',
      }));
    });

    it('deve aguardar o sufixo de quadro recebido em eventos distintos', async () => {
      const socketMock = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      const quadro = '78780102030d0a';
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);

      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from(quadro.slice(0, -4), 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).not.toHaveBeenCalled();

      callbackDados(Buffer.from(quadro.slice(-4), 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(1);
      expect(contextosRecebidos[0].mensagem()).toBe(quadro);
      expect(contextosRecebidos[0].mensagemBruta()).toBe(quadro);
    });

    it('deve recompor prefixo dividido entre eventos distintos', async () => {
      const socketMock = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      const quadro = '797901020d0a';
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);

      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from(quadro.slice(0, 2), 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).not.toHaveBeenCalled();

      callbackDados(Buffer.from(quadro.slice(2), 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(1);
      expect(contextosRecebidos[0].mensagem()).toBe(quadro);
    });

    it('deve entregar quadros completos e reter somente a sobra do proximo quadro', async () => {
      const socketMock = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      const primeiroQuadro = '787801020d0a';
      const segundoQuadro = '797903040d0a';
      const terceiroQuadro = '787805060d0a';
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);

      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from(
        `${primeiroQuadro}${segundoQuadro}${terceiroQuadro.slice(0, -4)}`,
        'hex',
      ));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(2);
      expect(contextosRecebidos[0].mensagemBruta()).toBe(primeiroQuadro);
      expect(contextosRecebidos[1].mensagemBruta()).toBe(segundoQuadro);

      callbackDados(Buffer.from(terceiroQuadro.slice(-4), 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(3);
      expect(contextosRecebidos[2].mensagem()).toBe(terceiroQuadro);
      expect(contextosRecebidos[2].mensagemBruta()).toBe(terceiroQuadro);
    });

    it('deve manter mensagens incompletas isoladas entre sockets', async () => {
      const primeiroSocket = criarSocketMock();
      const segundoSocket = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(primeiroSocket);
      servidor.mensagem(segundoSocket);

      const callbackPrimeiroSocket = obterCallbackDados(primeiroSocket);
      const callbackSegundoSocket = obterCallbackDados(segundoSocket);
      callbackPrimeiroSocket(Buffer.from('78780102', 'hex'));
      callbackSegundoSocket(Buffer.from('79790304', 'hex'));
      callbackPrimeiroSocket(Buffer.from('0d0a', 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(1);
      expect(contextosRecebidos[0].mensagem()).toBe('787801020d0a');

      callbackSegundoSocket(Buffer.from('0d0a', 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(2);
      expect(contextosRecebidos[1].mensagem()).toBe('797903040d0a');
    });

    it('deve descartar e registrar quadro truncado quando a conexao for encerrada', async () => {
      const logger = new Logger();
      const registrarErro = jest.spyOn(logger, 'error').mockImplementation();
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg: CodificacaoMsg.HEX,
        deserializer  : new DeserializerSuntechMock(),
        prefixo       : ['7878', '7979'],
        sufixo        : '0d0a',
        tratarErro    : logger,
      }));
      const socketMock = criarSocketMock();
      configurarConexaoNoServidor(servidorTcp, socketMock);

      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from('78780102', 'hex'));
      await aguardarProcessamentoAssincrono();
      obterCallbackEvento(socketMock, 'close', 'once')();
      await aguardarProcessamentoAssincrono();

      expect(registrarErro).toHaveBeenCalledWith(
        'Class ServidorTcp Quadro incompleto descartado 78780102',
      );
    });
  });

  describe('mensagem com delimitador simetrico', () => {
    beforeEach(() => {
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg: CodificacaoMsg.HEX,
        deserializer  : new DeserializerSuntechMock(),
        prefixo       : '7e',
        sufixo        : '7e',
      }));
    });

    it('deve aguardar o delimitador final de quadro recebido em eventos distintos', async () => {
      const socketMock = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      const quadro = '7E0102037E';
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);

      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from(quadro.slice(0, -2), 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).not.toHaveBeenCalled();

      callbackDados(Buffer.from(quadro.slice(-2), 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(1);
      expect(contextosRecebidos[0].mensagem()).toBe(quadro.toLowerCase());
      expect(contextosRecebidos[0].mensagemBruta()).toBe(quadro.toLowerCase());
    });

    it('deve entregar o quadro completo e reter somente a sobra do proximo quadro', async () => {
      const socketMock = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      const primeiroQuadro = '7E0102037E';
      const segundoQuadro = '7E0405067E';
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(socketMock);

      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from(`${primeiroQuadro}${segundoQuadro.slice(0, -2)}`, 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(1);
      expect(contextosRecebidos[0].mensagem()).toBe(primeiroQuadro.toLowerCase());

      callbackDados(Buffer.from(segundoQuadro.slice(-2), 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(2);
      expect(contextosRecebidos[1].mensagem()).toBe(segundoQuadro.toLowerCase());
    });

    it('deve manter mensagens incompletas isoladas entre sockets', async () => {
      const primeiroSocket = criarSocketMock();
      const segundoSocket = criarSocketMock();
      const contextosRecebidos: TcpContext[] = [];
      const consumidor = jest.fn(criarConsumidorCapturandoContextos(contextosRecebidos));
      servidorTcp.addHandler('suntech', consumidor, true);

      const servidor = servidorTcp as unknown as { mensagem: (socket: ISocket) => void };
      servidor.mensagem(primeiroSocket);
      servidor.mensagem(segundoSocket);

      const callbackPrimeiroSocket = obterCallbackDados(primeiroSocket);
      const callbackSegundoSocket = obterCallbackDados(segundoSocket);
      callbackPrimeiroSocket(Buffer.from('7e0102', 'hex'));
      callbackSegundoSocket(Buffer.from('7e0304', 'hex'));
      callbackPrimeiroSocket(Buffer.from('7e', 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(1);
      expect(contextosRecebidos[0].mensagem()).toBe('7e01027e');

      callbackSegundoSocket(Buffer.from('7e', 'hex'));
      await aguardarProcessamentoAssincrono();

      expect(consumidor).toHaveBeenCalledTimes(2);
      expect(contextosRecebidos[1].mensagem()).toBe('7e03047e');
    });

    it('deve descartar e registrar quadro truncado quando a conexao for encerrada', async () => {
      const logger = new Logger();
      const registrarErro = jest.spyOn(logger, 'error').mockImplementation();
      servidorTcp = new ServidorTcp(criarConfiguracao({
        codificacaoMsg: CodificacaoMsg.HEX,
        deserializer  : new DeserializerSuntechMock(),
        prefixo       : '7e',
        sufixo        : '7e',
        tratarErro    : logger,
      }));
      const socketMock = criarSocketMock();
      configurarConexaoNoServidor(servidorTcp, socketMock);

      const callbackDados = obterCallbackDados(socketMock);
      callbackDados(Buffer.from('7e0102', 'hex'));
      await aguardarProcessamentoAssincrono();
      obterCallbackEvento(socketMock, 'close', 'once')();
      await aguardarProcessamentoAssincrono();

      expect(registrarErro).toHaveBeenCalledWith(
        'Class ServidorTcp Quadro incompleto descartado 7e0102',
      );
    });
  });

  describe('ciclo de vida da conexao', () => {
    it('deve limpar no close emitido depois do end', async () => {
      const emissorEventos = new EventEmitter();
      const consumidorConexaoFechada = registrarConsumidorConexaoFechada(
        servidorTcp,
      );
      const socketMock = criarSocketMock({
        on  : emissorEventos.on.bind(emissorEventos) as unknown as ISocket['on'],
        once: emissorEventos.once.bind(emissorEventos) as unknown as ISocket['once'],
      });
      configurarConexaoNoServidor(servidorTcp, socketMock);
      salvarConexaoAtivaNoServidor(servidorTcp, socketMock, 'imei:123456789');

      emissorEventos.emit('end');

      expect(ServidorTcp.obterConexao('123456789')).toBe(socketMock);

      emissorEventos.emit('close');
      await aguardarProcessamentoAssincrono();

      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
      expect(consumidorConexaoFechada).toHaveBeenCalledTimes(1);
    });

    it('deve limpar a conexao e emitir o evento uma unica vez no close', async () => {
      const socketMock = criarSocketMock();
      const consumidorConexaoFechada = registrarConsumidorConexaoFechada(
        servidorTcp,
      );
      configurarConexaoNoServidor(servidorTcp, socketMock);
      salvarConexaoAtivaNoServidor(servidorTcp, socketMock, 'imei:123456789');

      const fecharConexao = obterCallbackEvento(socketMock, 'close', 'once');
      fecharConexao();
      fecharConexao();
      await aguardarProcessamentoAssincrono();

      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
      expect(consumidorConexaoFechada).toHaveBeenCalledTimes(1);
      expect(consumidorConexaoFechada).toHaveBeenCalledWith(
        expect.objectContaining({ imei: '123456789' }),
        expect.anything(),
      );
    });

    it('deve destruir ECONNRESET e deixar o close executar a limpeza', async () => {
      const logger = new Logger();
      const registrarErro = jest.spyOn(logger, 'error').mockImplementation();
      const destruirSocket = jest.fn();
      const socketMock = criarSocketMock({
        destroy: destruirSocket as unknown as ISocket['destroy'],
      });
      servidorTcp = new ServidorTcp(criarConfiguracao({ tratarErro: logger }));
      const consumidorConexaoFechada = registrarConsumidorConexaoFechada(
        servidorTcp,
      );
      configurarConexaoNoServidor(servidorTcp, socketMock);
      salvarConexaoAtivaNoServidor(servidorTcp, socketMock, 'imei:123456789');
      const erro = Object.assign(new Error('conexao reiniciada'), {
        code: 'ECONNRESET',
      });

      obterCallbackEvento(socketMock, 'error')(erro);
      obterCallbackEvento(socketMock, 'close', 'once')();
      await aguardarProcessamentoAssincrono();

      expect(destruirSocket).toHaveBeenCalledTimes(1);
      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
      expect(registrarErro).not.toHaveBeenCalled();
      expect(consumidorConexaoFechada).toHaveBeenCalledTimes(1);
    });

    it('deve registrar outro erro, destruir o socket e limpar no close', async () => {
      const logger = new Logger();
      const registrarErro = jest.spyOn(logger, 'error').mockImplementation();
      const destruirSocket = jest.fn();
      const socketMock = criarSocketMock({
        destroy: destruirSocket as unknown as ISocket['destroy'],
      });
      servidorTcp = new ServidorTcp(criarConfiguracao({ tratarErro: logger }));
      const consumidorConexaoFechada = registrarConsumidorConexaoFechada(
        servidorTcp,
      );
      configurarConexaoNoServidor(servidorTcp, socketMock);
      salvarConexaoAtivaNoServidor(servidorTcp, socketMock, 'imei:123456789');
      const erro = Object.assign(new Error('canal interrompido'), {
        code: 'EPIPE',
      });

      obterCallbackEvento(socketMock, 'error')(erro);
      obterCallbackEvento(socketMock, 'close', 'once')();
      await aguardarProcessamentoAssincrono();

      expect(registrarErro).toHaveBeenCalledWith(
        'ServidorTcp',
        expect.stringContaining('canal interrompido'),
      );
      expect(destruirSocket).toHaveBeenCalledTimes(1);
      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
      expect(consumidorConexaoFechada).toHaveBeenCalledTimes(1);
    });

    it('deve emitir conexao fechada mesmo quando o getter remover o socket destruido', async () => {
      const socketMock = criarSocketMock();
      const consumidorConexaoFechada = registrarConsumidorConexaoFechada(
        servidorTcp,
      );
      configurarConexaoNoServidor(servidorTcp, socketMock);
      salvarConexaoAtivaNoServidor(servidorTcp, socketMock, 'imei:123456789');
      Object.defineProperty(socketMock, 'destroyed', {
        configurable: true,
        value       : true,
      });

      expect(ServidorTcp.obterConexao('123456789')).toBeNull();

      obterCallbackEvento(socketMock, 'close', 'once')();
      await aguardarProcessamentoAssincrono();

      expect(consumidorConexaoFechada).toHaveBeenCalledTimes(1);
    });

    it('deve destruir o socket no timeout e limpar no close', async () => {
      const destruirSocket = jest.fn();
      const socketMock = criarSocketMock({
        destroy: destruirSocket as unknown as ISocket['destroy'],
      });
      configurarConexaoNoServidor(servidorTcp, socketMock);
      salvarConexaoAtivaNoServidor(servidorTcp, socketMock, 'imei:123456789');

      obterCallbackEvento(socketMock, 'timeout')();

      expect(destruirSocket).toHaveBeenCalledTimes(1);
      expect(ServidorTcp.obterConexao('123456789')).toBe(socketMock);

      obterCallbackEvento(socketMock, 'close', 'once')();
      await aguardarProcessamentoAssincrono();

      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
    });

    it('nao deve remover a conexao mais nova quando a antiga fechar', async () => {
      const socketAntigo = criarSocketMock();
      const socketNovo = criarSocketMock();
      configurarConexaoNoServidor(servidorTcp, socketAntigo);
      configurarConexaoNoServidor(servidorTcp, socketNovo);
      salvarConexaoAtivaNoServidor(servidorTcp, socketAntigo, 'imei:123456789');
      salvarConexaoAtivaNoServidor(servidorTcp, socketNovo, 'imei:123456789');

      obterCallbackEvento(socketAntigo, 'close', 'once')();
      await aguardarProcessamentoAssincrono();

      expect(ServidorTcp.obterConexao('123456789')).toBe(socketNovo);
    });

    it('nao deve emitir conexao fechada durante o encerramento manual', async () => {
      const socketMock = criarSocketMock();
      const consumidorConexaoFechada = jest.fn();
      servidorTcp.addHandler(
        Pattern.CONEXAO_FECHADA,
        consumidorConexaoFechada,
        true,
      );
      configurarConexaoNoServidor(servidorTcp, socketMock);
      salvarConexaoAtivaNoServidor(servidorTcp, socketMock, 'imei:123456789');

      servidorTcp.close();
      obterCallbackEvento(socketMock, 'close', 'once')();
      await aguardarProcessamentoAssincrono();

      expect(consumidorConexaoFechada).not.toHaveBeenCalled();
    });
  });

  describe('salvarConexao', () => {
    it('deve salvar a conexão se o imei for válido e o socket não tiver imei', () => {
      const socketMock = criarSocketMock();
      salvarConexaoNoServidor(servidorTcp, socketMock, 'imei:123456789');

      expect(socketMock.imei).toBe('123456789');
      expect(socketMock.id).toBeDefined();
      expect(ServidorTcp.obterConexao('123456789')).toBe(socketMock);
    });

    it('deve manter conexões de IMEIs diferentes', () => {
      const socketMock1 = criarSocketMock();
      const socketMock2 = criarSocketMock();

      salvarConexaoNoServidor(servidorTcp, socketMock1, 'imei:123456789');
      salvarConexaoNoServidor(servidorTcp, socketMock2, 'imei:999999999');

      expect(ServidorTcp.obterConexao('123456789')).toBe(socketMock1);
      expect(ServidorTcp.obterConexao('999999999')).toBe(socketMock2);
    });

    it('não deve salvar conexão se o socket já possui imei', () => {
      const socketMock = criarSocketMock({ imei: '987654321' });
      salvarConexaoNoServidor(servidorTcp, socketMock, 'imei:123456789');

      expect(socketMock.imei).toBe('987654321');
      expect(ServidorTcp.obterConexao('123456789')).toBeNull();
    });
  });
});
