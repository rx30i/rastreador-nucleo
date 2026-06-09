import { TcpContext } from './tcp.context';
import { ISocket } from '../../contracts';
import { Socket } from 'node:net';

function criarSocketMock(): Socket {
  return {} as Socket;
}

function obterConexaoMock(_imei: string): ISocket | null {
  return null;
}

describe('TcpContext', () => {
  it('deve retornar a mensagem bruta quando o quarto argumento for informado', () => {
    const contexto = new TcpContext([
      criarSocketMock(),
      'astt;0360000001;000007;26;010;1',
      obterConexaoMock,
      'ASTT;0360000001;000007;26;010;1\r',
    ]);

    expect(contexto.mensagemBruta()).toBe('ASTT;0360000001;000007;26;010;1\r');
  });

  it('deve retornar mensagem como valor reserva quando a mensagem bruta nao for informada', () => {
    const contexto = new TcpContext([
      criarSocketMock(),
      'astt;0360000001;000007;26;010;1',
      obterConexaoMock,
    ]);

    expect(contexto.mensagemBruta()).toBe(contexto.mensagem());
  });
});
