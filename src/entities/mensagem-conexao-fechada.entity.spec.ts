import {MensagemConexaoFechadaEntity} from './mensagem-conexao-fechada.entity';
import {HttpException} from '@nestjs/common';

describe('MensagemConexaoFechadaEntity', () => {
  let entidade01: MensagemConexaoFechadaEntity;
  let entidade02: MensagemConexaoFechadaEntity;

  beforeEach(async () => {
    entidade01 = new MensagemConexaoFechadaEntity('2022-05-20T19:18:15.000Z', '000000009', 'coban303');
    entidade02 = new MensagemConexaoFechadaEntity('', '', '');
  });

  describe('Método validar', () => {
    it('A entidade recebeu um objeto valido, deve ser retornado "undefined"', () => {
      expect(entidade01.validar()).toEqual(undefined);
    });

    it('A entidade recebeu um objeto invalido, deve emitir um erro "HttpException"', () => {
      try {
        entidade01.validar();
      } catch (erro) {
        expect(erro).toBeInstanceOf(HttpException);
      }
    });
  });

  describe('Atributo dataHora', () => {
    it('Deve retornar a data 2022-05-20T19:18:15.000Z', () => {
      expect(entidade01.dataHora).toEqual('2022-05-20T19:18:15.000Z');
    });

    it('Deve retornar uma string vazia', () => {
      expect(entidade02.dataHora).toEqual('');
    });
  });

  describe('Atributo imei', () => {
    it('Deve retornar a string 000000009', () => {
      expect(entidade01.imei).toEqual('000000009');
    });

    it('Deve retornar um string vazia', () => {
      expect(entidade02.imei).toEqual('');
    });
  });

  describe('Atributo online', () => {
    it('Deve retornar o boolean false', () => {
      expect(entidade01.online).toEqual(false);
    });
  });

  describe('Atributo integracao', () => {
    it('Deve retornar uma string vazia', () => {
      expect(entidade02.integracao).toEqual('');
    });

    it('Deve retornar uma string cujo o valor é "coban303"', () => {
      expect(entidade01.integracao).toEqual('coban303');
    });
  });

  describe('Atributo pattern', () => {
    it('Deve retornar a string conexaoFechada', () => {
      expect(entidade01.pattern).toEqual('conexaoFechada');
    });
  });
});
