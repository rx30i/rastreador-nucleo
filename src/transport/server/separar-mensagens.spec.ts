import { IncomingRequest, IncomingEvent } from '@nestjs/microservices';
import { SepararMensagens } from './separar-mensagens';
import { IConsumerDeserializer } from 'src/contracts';
import { CodificacaoMsg } from '../../enums';
import { Logger } from '@nestjs/common';


class Deserializer implements IConsumerDeserializer {
  public obterImei(menagem: string): string {
    throw new Error('Method not implemented.');
  }

  public deserialize(value: any, options?: Record<string, any>): IncomingRequest | IncomingEvent | Promise<IncomingRequest | IncomingEvent> {
    throw new Error('Method not implemented.');
  }
}

describe('SepararMensagens', () => {
  let sufixo: SepararMensagens;
  let prefixo: SepararMensagens;
  let prefixoSufixo: SepararMensagens;

  beforeEach(() => {
    prefixoSufixo = new SepararMensagens({
      codificacaoMsg: CodificacaoMsg.HEX,
      deserializer  : new Deserializer(),
      tratarErro    : new Logger(),
      delimitadorMsg: '',
      prefixo       : '7878',
      sufixo        : '0d0a',
      servidor      : {
        path: '127.0.0.1',
        port: 0,
      },
    });

    prefixo = new SepararMensagens({
      codificacaoMsg: CodificacaoMsg.HEX,
      deserializer  : new Deserializer(),
      tratarErro    : new Logger(),
      delimitadorMsg: '',
      prefixo       : '7878',
      servidor      : {
        path: '127.0.0.1',
        port: 0,
      },
    });

     sufixo = new SepararMensagens({
      codificacaoMsg: CodificacaoMsg.HEX,
      deserializer  : new Deserializer(),
      tratarErro    : new Logger(),
      delimitadorMsg: '',
      sufixo        : '0d0a',
      servidor      : {
        path: '127.0.0.1',
        port: 0,
      },
    });
  });

  describe('Método obterMensagens() usando prefixo e sufixo para separar as mensagens', () => {
    it('Recebe uma mensagem valida e retorna um array contendo a mensagem', () => {
      const mensagem = '78780d01086266708570787800007ea40d0a';
      const resposta = ['78780d01086266708570787800007ea40d0a'];

      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe uma mensagem com prefixo invalido e deve retorna um array vazío', () => {
      const mensagem = '78770d01086266708570787800007ea40d0a';
      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual([]);
    });

    it('Recebe uma mensagem com sufixo invalido e deve retorna um array vazío', () => {
      const mensagem = '78780d01086266708570787800007ea40d0b';
      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual([]);
    });

     it('Recebe 2 mensagens validas e deve retorna um array contendo 2 mensagens', () => {
      const mensagem = '78780d01086266708570787800007ea40d0a78780d01086266708570787800007ea40d0a';
      const resposta = ['78780d01086266708570787800007ea40d0a','78780d01086266708570787800007ea40d0a'];

      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe uma mensagem valida e outra com sufixo invalido e deve retornar um array contendo a mensagem valida', () => {
      const mensagem = '78780d01086266708570787800007ea40d0a78770d01086266708570787800007ea40d0a';
      const resposta = ['78780d01086266708570787800007ea40d0a'];

      expect(prefixoSufixo.obterMensagens(mensagem)).toEqual(resposta);
    });
  });

  describe('Método obterMensagens() usando prefixo para separar as mensagens', () => {
    it('Recebe uma mensagem valida e retorna um array contendo a mensagem', () => {
      const mensagem = '78780d01086266708570797900007ea40d0a';
      const resposta = ['78780d01086266708570797900007ea40d0a'];

      expect(prefixo.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe uma mensagem com prefixo invalido e deve retorna um array vazío', () => {
      const mensagem = '78770d01086266708570787800007ea40d0a';
      expect(prefixo.obterMensagens(mensagem)).toEqual([]);
    });

    it('Recebe 2 mensagens validas e deve retorna um array contendo 2 mensagens', () => {
      const mensagem = '78780d01086266708570797900007ea40d0a78780d01086266708570797900007ea40d0a';
      const resposta = ['78780d01086266708570797900007ea40d0a','78780d01086266708570797900007ea40d0a'];

      expect(prefixo.obterMensagens(mensagem)).toEqual(resposta);
    });
  });

  describe('Método obterMensagens() usando sufixo para separar as mensagens', () => {
    it('Recebe uma mensagem valida e retorna um array contendo a mensagem', () => {
      const mensagem = '78780d01086266708570797900007ea40d0a';
      const resposta = ['78780d01086266708570797900007ea40d0a'];

      expect(sufixo.obterMensagens(mensagem)).toEqual(resposta);
    });

    it('Recebe uma mensagem com sufixo invalido e deve retorna um array vazío', () => {
      const mensagem = '78780d01086266708570787800007ea40d01';
      expect(sufixo.obterMensagens(mensagem)).toEqual([]);
    });

    it('Recebe 2 mensagens validas e deve retorna um array contendo 2 mensagens', () => {
      const mensagem = '78780d01086266708570797900007ea40d0a78780d01086266708570797900007ea40d0a';
      const resposta = ['78780d01086266708570797900007ea40d0a','78780d01086266708570797900007ea40d0a'];

      expect(sufixo.obterMensagens(mensagem)).toEqual(resposta);
    });
  });
});
