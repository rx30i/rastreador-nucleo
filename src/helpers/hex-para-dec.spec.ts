import {hexParaDec} from './hex-para-dec';

describe('Função hexParaDec()', () => {
  it('Recebe a string "0A" no formato hex e deve retornar o decimal "10" ', () => {
    expect(hexParaDec('0A')).toEqual(10);
  });

  it('Recebe a string "03" no formato hex e deve retornar o decimal "3" ', () => {
    expect(hexParaDec('03')).toEqual(3);
  });

  it('Recebe a string "17" no formato hex e deve retornar o decimal "23" ', () => {
    expect(hexParaDec('17')).toEqual(23);
  });
});
