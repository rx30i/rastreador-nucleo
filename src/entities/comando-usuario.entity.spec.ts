import { ComandoUsuarioEntity } from './comando-usuario.entity';

describe('ComandoUsuarioEntity', () => {
  let comandoUsuarioEntity01: ComandoUsuarioEntity;
  let comandoUsuarioEntity02: ComandoUsuarioEntity;

  beforeEach(() => {
    comandoUsuarioEntity01 = new ComandoUsuarioEntity({
      id           : undefined,
      integracao   : undefined,
      identificador: undefined,
      comando      : undefined,
      imei         : undefined,
    });

    comandoUsuarioEntity02 = new ComandoUsuarioEntity({
      id           : 10,
      integracao   : 'suntech300',
      identificador: 'bloquear',
      comando      : 'ST300CMD;100850000;02;Enable1',
      imei         : '100850000',
    });
  });

  describe('Método valido()', () => {
    it('A entidade foi gerada com dados invalidos, deve ser retornado false', () => {
      expect(comandoUsuarioEntity01.valido()).toEqual(false);
    });

    it('A entidade foi gerada com dados validos, deve ser retornado true', () => {
      expect(comandoUsuarioEntity02.valido()).toEqual(true);
    });
  });

  describe('Atribúto id', () => {
    it('Deve retornar "undefined"', () => {
      expect(comandoUsuarioEntity01.id).toEqual(undefined);
    });

    it('Deve retornar "10"', () => {
      expect(comandoUsuarioEntity02.id).toEqual(10);
    });
  });

  describe('Atribúto integracao', () => {
    it('Deve retornar "undefined"', () => {
      expect(comandoUsuarioEntity01.integracao).toEqual(undefined);
    });

    it('Deve retornar "suntech300"', () => {
      expect(comandoUsuarioEntity02.integracao).toEqual('suntech300');
    });
  });

  describe('Atribúto identificador', () => {
    it('Deve retornar "undefined"', () => {
      expect(comandoUsuarioEntity01.identificador).toEqual(undefined);
    });

    it('Deve retornar "bloquear"', () => {
      expect(comandoUsuarioEntity02.identificador).toEqual('bloquear');
    });
  });

  describe('Atribúto comando', () => {
    it('Deve retornar "undefined"', () => {
      expect(comandoUsuarioEntity01.comando).toEqual(undefined);
    });

    it('Deve retornar "ST300CMD;100850000;02;Enable1"', () => {
      expect(comandoUsuarioEntity02.comando).toEqual('ST300CMD;100850000;02;Enable1');
    });
  });

  describe('Atribúto imei', () => {
    it('Deve retornar "undefined"', () => {
      expect(comandoUsuarioEntity01.imei).toEqual(undefined);
    });

    it('Deve retornar "ST300CMD;100850000;02;Enable1"', () => {
      expect(comandoUsuarioEntity02.imei).toEqual('100850000');
    });
  });
});
