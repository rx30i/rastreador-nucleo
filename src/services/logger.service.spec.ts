import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as FileSystem from 'node:fs';
import * as Winston from 'winston';

jest.mock('node:fs', () => ({
  ...jest.requireActual<typeof import('node:fs')>('node:fs'),
  mkdirSync: jest.fn(),
}));

jest.mock('winston-daily-rotate-file', () => ({
  __esModule: true,
  default   : jest.fn(),
}));

jest.mock('winston', () => ({
  createLogger: jest.fn(),
  format      : {
    printf: jest.fn((formatador: (informacoes: { message: unknown }) => string): unknown => formatador),
  },
}));

type ChamadaConsoleDebug = [unknown, ...unknown[]];
type ChamadaConsoleErro = [unknown, unknown?, ...unknown[]];

describe('LoggerService', () => {
  let debugConsole: jest.SpyInstance<void, ChamadaConsoleDebug>;
  let erroConsole: jest.SpyInstance<void, ChamadaConsoleErro>;
  let registrarInformacao: jest.Mock<undefined, [string]>;

  beforeEach((): void => {
    jest.clearAllMocks();

    debugConsole = jest.spyOn(ConsoleLogger.prototype, 'debug')
      .mockImplementation((): void => undefined);
    erroConsole = jest.spyOn(ConsoleLogger.prototype, 'error')
      .mockImplementation((): void => undefined);

    registrarInformacao = jest.fn<undefined, [string]>(() => undefined);
    (Winston.createLogger as jest.Mock).mockReturnValue({
      info: registrarInformacao,
    });
  });

  afterEach((): void => {
    debugConsole.mockRestore();
    erroConsole.mockRestore();
  });

  it('deve exibir debug quando a aplicacao estiver em desenvolvimento', (): void => {
    const logger: LoggerService = criarLoggerService({
      APP_ENV: 'desenvolvimento',
    });

    logger.debug('mensagem de teste', 'PREFIXO');

    expect(debugConsole).toHaveBeenCalledWith('PREFIXO: mensagem de teste', 'LoggerService');
  });

  it('nao deve exibir debug quando a aplicacao nao estiver em desenvolvimento', (): void => {
    const logger: LoggerService = criarLoggerService({
      APP_ENV: 'producao',
    });

    logger.debug('mensagem de teste', 'PREFIXO');

    expect(debugConsole).not.toHaveBeenCalled();
  });

  it('deve registrar erro local com mensagem, stack e contexto quando nao estiver em producao', (): void => {
    const logger: LoggerService = criarLoggerService({
      APP_ENV: 'desenvolvimento',
    });
    const erro: Error = new Error('falha capturada');

    logger.capiturarError(erro);

    expect(erroConsole).toHaveBeenCalledWith('falha capturada', erro.stack, 'LoggerService');
  });

  it('nao deve configurar logger de rastreador quando a variavel de IMEI estiver vazia', (): void => {
    const logger: LoggerService = criarLoggerService({
      SALVAR_LOG_RASTREADOR_IMEI: '',
    });

    logger.salvarLogRastreador('123456789012345', 'mensagem recebida', 'recebida');

    expect(Winston.createLogger).not.toHaveBeenCalled();
    expect(DailyRotateFile).not.toHaveBeenCalled();
  });

  it('deve exibir mensagem de rastreador em desenvolvimento quando a variavel de IMEI estiver vazia', (): void => {
    const logger: LoggerService = criarLoggerService({
      APP_ENV                   : 'desenvolvimento',
      SALVAR_LOG_RASTREADOR_IMEI: '',
    });

    logger.salvarLogRastreador('123456789012345', 'mensagem recebida', 'recebida');

    expect(Winston.createLogger).not.toHaveBeenCalled();
    expect(DailyRotateFile).not.toHaveBeenCalled();
    expect(debugConsole).toHaveBeenCalledTimes(1);
    expect(debugConsole).toHaveBeenCalledWith('RASTREADOR: mensagem recebida', 'LoggerService');
  });

  it('nao deve exibir mensagem de rastreador em producao', (): void => {
    const logger: LoggerService = criarLoggerService({
      APP_ENV                   : 'producao',
      SALVAR_LOG_RASTREADOR_IMEI: '',
    });

    logger.salvarLogRastreador('123456789012345', 'mensagem recebida', 'recebida');

    expect(debugConsole).not.toHaveBeenCalled();
  });

  it('nao deve gravar mensagem de rastreador quando o IMEI nao corresponder ao configurado', (): void => {
    const logger: LoggerService = criarLoggerService({
      SALVAR_LOG_RASTREADOR_IMEI: '123456789012345',
    });

    logger.salvarLogRastreador('999999999999999', 'mensagem recebida', 'recebida');

    expect(Winston.createLogger).not.toHaveBeenCalled();
    expect(DailyRotateFile).not.toHaveBeenCalled();
  });

  it(
    'deve exibir mensagem de rastreador em desenvolvimento quando o IMEI nao corresponder ao configurado',
    (): void => {
      const logger: LoggerService = criarLoggerService({
        APP_ENV                   : 'desenvolvimento',
        SALVAR_LOG_RASTREADOR_IMEI: '123456789012345',
      });

      logger.salvarLogRastreador('999999999999999', 'mensagem recebida', 'recebida');

      expect(Winston.createLogger).not.toHaveBeenCalled();
      expect(DailyRotateFile).not.toHaveBeenCalled();
      expect(debugConsole).toHaveBeenCalledTimes(1);
      expect(debugConsole).toHaveBeenCalledWith('RASTREADOR: mensagem recebida', 'LoggerService');
    },
  );

  it('deve configurar arquivo rotacionado e gravar mensagem quando o IMEI corresponder ao configurado', (): void => {
    const logger: LoggerService = criarLoggerService({
      SALVAR_LOG_RASTREADOR_IMEI: '123/456',
    });

    logger.salvarLogRastreador('123/456', 'mensagem recebida', 'recebida');

    expect(FileSystem.mkdirSync).toHaveBeenCalledWith('logs', { recursive: true });
    expect(DailyRotateFile).toHaveBeenCalledWith({
      filename   : 'logs/log-123_456-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level      : 'info',
    });
    expect(Winston.createLogger).toHaveBeenCalledTimes(1);
    expect(registrarInformacao).toHaveBeenCalledTimes(1);
    const primeiraMensagemRegistrada: string = registrarInformacao.mock.calls[0][0];
    expect(primeiraMensagemRegistrada).toMatch(
      /^\[\d{4}-\d{2}-\d{2}T.*\] \[123\/456\] \[recebida\] mensagem recebida$/,
    );
  });

  it('deve exibir terminal e gravar arquivo quando o IMEI corresponder em desenvolvimento', (): void => {
    const logger: LoggerService = criarLoggerService({
      APP_ENV                   : 'desenvolvimento',
      SALVAR_LOG_RASTREADOR_IMEI: '123456789012345',
    });

    logger.salvarLogRastreador('123456789012345', 'mensagem recebida', 'recebida');

    expect(debugConsole).toHaveBeenCalledWith('RASTREADOR: mensagem recebida', 'LoggerService');
    expect(registrarInformacao).toHaveBeenCalledTimes(1);
  });

  it('nao deve propagar erro quando o logger de rastreador nao puder ser criado', (): void => {
    const logger: LoggerService = criarLoggerService({
      APP_ENV                   : 'desenvolvimento',
      SALVAR_LOG_RASTREADOR_IMEI: '123456789012345',
    });
    const erro: Error = new Error('sem permissao para criar diretorio');
    (FileSystem.mkdirSync as jest.Mock).mockImplementationOnce((): never => {
      throw erro;
    });

    expect((): undefined => {
      logger.salvarLogRastreador('123456789012345', 'mensagem recebida', 'recebida');
    }).not.toThrow();
    expect(erroConsole).toHaveBeenCalledWith(
      'sem permissao para criar diretorio',
      erro.stack,
      'LoggerService',
    );
  });
});

function criarLoggerService(variaveis: Record<string, string | undefined>): LoggerService {
  const configService: Pick<ConfigService, 'get'> = {
    get: jest.fn((chave: string): string | undefined => variaveis[chave]),
  };

  return new LoggerService(configService as ConfigService);
}
