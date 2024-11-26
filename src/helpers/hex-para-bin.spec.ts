import {hexParaBin} from './hex-para-bin';

describe('Função hexParaBin()', () => {
  it('Recebe a string "154C" no formato hex e deve retornar o binário "0001010101001100" ', () => {
    expect(hexParaBin('154C')).toEqual('0001010101001100');
  });
});
