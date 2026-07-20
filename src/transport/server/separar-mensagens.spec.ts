/* eslint-disable max-len */
import { IncomingEvent } from '@nestjs/microservices';
import { SepararMensagens } from './separar-mensagens';
import { IConsumerDeserializer, IServidorTCPConfig } from '../../contracts';
import { CodificacaoMsg } from '../../enums';
import { Logger } from '@nestjs/common';

class Deserializer implements IConsumerDeserializer {
  public obterImei(_mensagem: string): string {
    throw new Error('Method not implemented.');
  }

  public deserialize(
    _value: unknown,
    _options?: Record<string, unknown>,
  ): IncomingEvent {
    throw new Error('Method not implemented.');
  }
}

function criarSeparadorMensagens(
  configuracao?: Partial<IServidorTCPConfig>,
): SepararMensagens {
  return new SepararMensagens({
    codificacaoMsg: CodificacaoMsg.HEX,
    deserializer  : new Deserializer(),
    tratarErro    : new Logger(),
    servidor      : {
      path: '127.0.0.1',
      port: 0,
    },
    ...configuracao,
  });
}

describe('SepararMensagens', () => {
  let sufixo: SepararMensagens;
  let prefixo: SepararMensagens;
  let prefixoSufixo: SepararMensagens;

  beforeEach(() => {
    prefixoSufixo = criarSeparadorMensagens({
      prefixo: '7878',
      sufixo : '0d0a',
    });

    prefixo = criarSeparadorMensagens({
      prefixo: '7878',
    });

    sufixo = criarSeparadorMensagens({
      sufixo: '0d0a',
    });
  });

  describe('Metodo obterMensagens() usando prefixo e sufixo para separar as mensagens', () => {
    it('Recebe uma mensagem valida e retorna um array contendo a mensagem', () => {
      const mensagem = '78780d01086266708570787800007ea40d0a';
      const resposta = ['78780d01086266708570787800007ea40d0a'];

      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Ignora sufixo hexadecimal formado entre dois bytes', () => {
      const mensagem = '787810d0a20d0a';

      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual([mensagem]);
    });

    it('Recebe uma mensagem com prefixo invalido e deve retorna um array contento a mensagem recebida', () => {
      const mensagem = '78770d01086266708570787800007ea40d0a';
      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual([
        '78770d01086266708570787800007ea40d0a',
      ]);
    });

    it('Recebe uma mensagem com sufixo invalido e deve retorna um array com a mensagem recebida', () => {
      const mensagem = '78780d01086266708570787800007ea40d0b';
      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual([
        '78780d01086266708570787800007ea40d0b',
      ]);
    });

    it('Recebe 2 mensagens validas e deve retorna um array contendo 2 mensagens', () => {
      const mensagem =
        '78780d01086266708570787800007ea40d0a78780d01086266708570787800007ea40d0a';
      const resposta = [
        '78780d01086266708570787800007ea40d0a',
        '78780d01086266708570787800007ea40d0a',
      ];

      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe uma mensagem valida e outra com sufixo invalido e deve retornar um array contendo a mensagem valida', () => {
      const mensagem =
        '78780d01086266708570787800007ea40d0a78770d01086266708570787800007ea40d0a';
      const resposta = ['78780d01086266708570787800007ea40d0a'];

      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual(resposta);
    });
  });

  describe('Metodo obterMensagensComBruto() usando o mesmo delimitador no inicio e no fim', () => {
    const quadroHeartbeat = '7E0002000001380000000100013B7E';

    it('Recebe um quadro delimitado por 7e e preserva a mensagem bruta', () => {
      const separadorDelimitadorIgual = criarSeparadorMensagens({
        prefixo: '7e',
        sufixo : '7e',
      });

      expect(
        separadorDelimitadorIgual.obterMensagensComBruto(quadroHeartbeat),
      ).toEqual([
        {
          mensagem     : quadroHeartbeat.toLowerCase(),
          mensagemBruta: quadroHeartbeat,
        },
      ]);
    });

    it('Recebe quadros concatenados delimitados por 7e e retorna cada quadro completo', () => {
      const separadorDelimitadorIgual = criarSeparadorMensagens({
        prefixo: '7e',
        sufixo : '7e',
      });
      const quadroDesregistro = '7E0003000001380000000100013A7E';

      expect(
        separadorDelimitadorIgual.obterMensagens(
          `${quadroHeartbeat}${quadroDesregistro}`,
        ),
      ).toEqual([
        quadroHeartbeat.toLowerCase(),
        quadroDesregistro.toLowerCase(),
      ]);
    });

    it('Ignora delimitador hexadecimal formado entre dois bytes', () => {
      const separadorDelimitadorIgual = criarSeparadorMensagens({
        prefixo: '7e',
        sufixo : '7e',
      });
      const quadro = '7e0147e2027e';

      expect(separadorDelimitadorIgual.obterMensagens(quadro)).toEqual([
        quadro,
      ]);
    });
  });

  describe('Metodo obterResultadoSeparacao() usando o mesmo delimitador no inicio e no fim', () => {
    it('Retorna apenas os quadros completos e informa a sobra sem delimitador final', () => {
      const separadorDelimitadorIgual = criarSeparadorMensagens({
        prefixo: '7e',
        sufixo : '7e',
      });
      const quadroHeartbeat = '7E0002000001380000000100013B7E';
      const quadroDesregistro = '7E0003000001380000000100013A7E';
      const quadroIncompleto = '7E000400000138000000010001';

      expect(
        separadorDelimitadorIgual.obterResultadoSeparacao(
          `${quadroHeartbeat}${quadroDesregistro}${quadroIncompleto}`,
        ),
      ).toEqual({
        mensagens: [
          {
            mensagem     : quadroHeartbeat.toLowerCase(),
            mensagemBruta: quadroHeartbeat,
          },
          {
            mensagem     : quadroDesregistro.toLowerCase(),
            mensagemBruta: quadroDesregistro,
          },
        ],
        mensagemIncompleta: quadroIncompleto,
      });
    });
  });

  describe('Metodo obterResultadoSeparacao() usando prefixo e sufixo distintos', () => {
    const separadorPrefixosAlternativos = criarSeparadorMensagens({
      prefixo: ['7878', '7979'],
      sufixo : '0d0a',
    });

    it('Retem quadro iniciado por prefixo conhecido enquanto o sufixo nao chega', () => {
      const quadroIncompleto = '7878010203';

      expect(
        separadorPrefixosAlternativos.obterResultadoSeparacao(
          quadroIncompleto,
        ),
      ).toEqual({
        mensagens         : [],
        mensagemIncompleta: quadroIncompleto,
      });
    });

    it('Retem inicio parcial de prefixo recebido no fim da entrada', () => {
      const inicioParcialPrefixo = '79';

      expect(
        separadorPrefixosAlternativos.obterResultadoSeparacao(
          inicioParcialPrefixo,
        ),
      ).toEqual({
        mensagens         : [],
        mensagemIncompleta: inicioParcialPrefixo,
      });
    });

    it('Retorna quadros completos e preserva a sobra incompleta com a caixa original', () => {
      const quadroCompleto = '787801020D0A';
      const quadroIncompleto = '79790304';

      expect(
        separadorPrefixosAlternativos.obterResultadoSeparacao(
          `${quadroCompleto}${quadroIncompleto}`,
        ),
      ).toEqual({
        mensagens: [
          {
            mensagem     : quadroCompleto.toLowerCase(),
            mensagemBruta: quadroCompleto,
          },
        ],
        mensagemIncompleta: quadroIncompleto,
      });
    });

    it('Propaga integralmente entrada iniciada por prefixo desconhecido', () => {
      const mensagem = '999901020d0a';

      expect(
        separadorPrefixosAlternativos.obterResultadoSeparacao(mensagem),
      ).toEqual({
        mensagens: [
          {
            mensagem,
            mensagemBruta: mensagem,
          },
        ],
        mensagemIncompleta: '',
      });
    });
  });

  describe('Metodo obterMensagens() usando prefixo para separar as mensagens', () => {
    it('Recebe uma mensagem valida e retorna um array contendo a mensagem', () => {
      const mensagem = '78780d01086266708570797900007ea40d0a';
      const resposta = ['78780d01086266708570797900007ea40d0a'];

      expect(prefixo.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe uma mensagem com prefixo invalido e deve retorna um array contendo a mensagem recebida', () => {
      const mensagem = '78770d01086266708570787800007ea40d0a';
      expect(prefixo.obterMensagens(mensagem)).toEqual([
        '78770d01086266708570787800007ea40d0a',
      ]);
    });

    it('Recebe 2 mensagens validas e deve retorna um array contendo 2 mensagens', () => {
      const mensagem =
        '78780d01086266708570797900007ea40d0a78780d01086266708570797900007ea40d0a';
      const resposta = [
        '78780d01086266708570797900007ea40d0a',
        '78780d01086266708570797900007ea40d0a',
      ];

      expect(prefixo.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Ignora prefixo hexadecimal formado entre dois bytes', () => {
      const mensagem = '7878178782';

      expect(prefixo.obterMensagens(mensagem)).toEqual([mensagem]);
    });
  });

  describe('Metodo obterMensagens() usando lista de prefixos', () => {
    it('Recebe mensagens validas com prefixos alternativos e sufixo e deve retornar cada mensagem', () => {
      const prefixosAlternativos = criarSeparadorMensagens({
        prefixo: ['7878', '7979'],
        sufixo : '0d0a',
      });
      const mensagemPrefixo7878 = '78780d01086266708570aaaa00007ea40d0a';
      const mensagemPrefixo7979 = '79790d01086266708570bbbb00007ea40d0a';
      const mensagem = `${mensagemPrefixo7878}${mensagemPrefixo7979}`;
      const resposta = [mensagemPrefixo7878, mensagemPrefixo7979];

      expect(prefixosAlternativos.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe mensagens validas com prefixos alternativos sem sufixo e deve retornar cada mensagem', () => {
      const prefixosAlternativos = criarSeparadorMensagens({
        prefixo: ['7878', '7979'],
      });
      const mensagemPrefixo7878 = '78780d01086266708570aaaa00007ea40d0a';
      const mensagemPrefixo7979 = '79790d01086266708570bbbb00007ea40d0a';
      const mensagem = `${mensagemPrefixo7878}${mensagemPrefixo7979}`;
      const resposta = [mensagemPrefixo7878, mensagemPrefixo7979];

      expect(prefixosAlternativos.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe prefixos duplicados e deve separar cada mensagem uma unica vez', () => {
      const prefixosAlternativos = criarSeparadorMensagens({
        prefixo: ['7878', '7979', '7878'],
        sufixo : '0d0a',
      });
      const mensagemPrefixo7878 = '78780d01086266708570aaaa00007ea40d0a';
      const mensagemPrefixo7979 = '79790d01086266708570bbbb00007ea40d0a';
      const mensagem = `${mensagemPrefixo7878}${mensagemPrefixo7979}`;
      const resposta = [mensagemPrefixo7878, mensagemPrefixo7979];

      expect(prefixosAlternativos.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe prefixos em caixa alta e deve normalizar a comparacao', () => {
      const prefixosAlternativos = criarSeparadorMensagens({
        prefixo: ['ABCD', 'EFAB'],
        sufixo : '0d0a',
      });
      const mensagemPrefixoAbcd = 'abcd00010d0a';
      const mensagemPrefixoEfab = 'efab00020d0a';
      const mensagem = `${mensagemPrefixoAbcd}${mensagemPrefixoEfab}`;
      const resposta = [mensagemPrefixoAbcd, mensagemPrefixoEfab];

      expect(prefixosAlternativos.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe mensagem com prefixo nao configurado e deve retornar a mensagem recebida', () => {
      const prefixosAlternativos = criarSeparadorMensagens({
        prefixo: ['7878', '7979'],
        sufixo : '0d0a',
      });
      const mensagem = '99990d01086266708570787800007ea40d0a';

      expect(prefixosAlternativos.obterMensagens(mensagem)).toEqual([mensagem]);
    });

    it('Recebe mensagem valida seguida de mensagem invalida e deve retornar apenas a mensagem valida', () => {
      const prefixosAlternativos = criarSeparadorMensagens({
        prefixo: ['7878', '7979'],
        sufixo : '0d0a',
      });
      const mensagemValida = '79790d01086266708570797900007ea40d0a';
      const mensagemInvalida = '99990d01086266708570787800007ea40d0a';

      expect(
        prefixosAlternativos.obterMensagens(
          `${mensagemValida}${mensagemInvalida}`,
        ),
      ).toEqual([mensagemValida]);
    });

    it('Recebe array de prefixos vazio sem sufixo e deve tratar como prefixo nao informado', () => {
      const prefixosVazios = criarSeparadorMensagens({
        prefixo: [],
      });
      const mensagem = '78780d01086266708570787800007ea40d0a';

      expect(prefixosVazios.obterMensagens(mensagem)).toEqual([mensagem]);
    });

    it('Recebe array apenas com prefixos vazios e deve separar mensagens pelo sufixo informado', () => {
      const prefixosVazios = criarSeparadorMensagens({
        prefixo: ['', ''],
        sufixo : '0d0a',
      });
      const mensagemPrefixo7878 = '78780d01086266708570787800007ea40d0a';
      const mensagemPrefixo7979 = '79790d01086266708570797900007ea40d0a';
      const mensagem = `${mensagemPrefixo7878}${mensagemPrefixo7979}`;
      const resposta = [mensagemPrefixo7878, mensagemPrefixo7979];

      expect(prefixosVazios.obterMensagens(mensagem)).toEqual(resposta);
    });
  });

  describe('Metodo obterMensagens() usando sufixo para separar as mensagens', () => {
    it('Recebe uma mensagem valida e retorna um array contendo a mensagem', () => {
      const mensagem = '78780d01086266708570797900007ea40d0a';
      const resposta = ['78780d01086266708570797900007ea40d0a'];

      expect(sufixo.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe uma mensagem valida de prefixo 7979 e retorna um array contendo a mensagem', () => {
      const mensagem = '79790d01086266708570797900007ea40d0a';
      const resposta = ['79790d01086266708570797900007ea40d0a'];

      expect(sufixo.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe uma mensagem com sufixo invalido e deve retorna um array vazio', () => {
      const mensagem = '78780d01086266708570787800007ea40d01';
      expect(sufixo.obterMensagens(mensagem)).toEqual([]);
    });

    it('Recebe 2 mensagens validas e deve retorna um array contendo 2 mensagens', () => {
      const mensagem =
        '78780d01086266708570797900007ea40d0a78780d01086266708570797900007ea40d0a';
      const resposta = [
        '78780d01086266708570797900007ea40d0a',
        '78780d01086266708570797900007ea40d0a',
      ];

      expect(sufixo.obterMensagens(mensagem)).toEqual(resposta);
    });
  });

  describe('Metodo obterMensagens() sem delimitadores configurados', () => {
    it('Deve propagar a entrada nao vazia como uma unica mensagem', () => {
      const separadorSemDelimitadores = criarSeparadorMensagens();
      const mensagem = 'ASTT;0360000001;000007;26;010;1\r';

      expect(separadorSemDelimitadores.obterMensagens(mensagem)).toEqual([
        mensagem.toLowerCase(),
      ]);
    });

    it('Deve preservar a mensagem bruta e normalizar a mensagem entregue', () => {
      const separadorSemDelimitadores = criarSeparadorMensagens();
      const mensagem = 'ASTT;0360000001;000007;26;010;1\r';

      expect(
        separadorSemDelimitadores.obterMensagensComBruto(mensagem),
      ).toEqual([
        {
          mensagem     : mensagem.toLowerCase(),
          mensagemBruta: mensagem,
        },
      ]);
    });

    it('Deve tratar prefixos e sufixo vazios como delimitadores nao configurados', () => {
      const separadorSemDelimitadores = criarSeparadorMensagens({
        prefixo: ['', ''],
        sufixo : '',
      });
      const mensagem = 'MENSAGEM';

      expect(separadorSemDelimitadores.obterMensagens(mensagem)).toEqual([
        mensagem.toLowerCase(),
      ]);
    });

    it('Nao deve propagar mensagem vazia', () => {
      const separadorSemDelimitadores = criarSeparadorMensagens({
        prefixo: [],
        sufixo : '',
      });

      expect(separadorSemDelimitadores.obterMensagens('')).toEqual([]);
      expect(separadorSemDelimitadores.obterMensagensComBruto('')).toEqual([]);
    });
  });
});
