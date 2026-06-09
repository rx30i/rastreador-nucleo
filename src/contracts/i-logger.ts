export type SentidoMensagemRastreador = 'recebida' | 'enviada';

export interface ILoger {
  debug(mensagem: unknown, ...parametrosOpcionais: unknown[]): undefined;

  error(mensagem: unknown, ...parametrosOpcionais: unknown[]): void;

  /**
   * @deprecated Use o metodo debug.
   */
  local2(mensagem: unknown, prefixo?: string): undefined;

  mensagemRastreador(
    imeiRastreador: string,
    mensagem: unknown,
    sentidoMensagem: SentidoMensagemRastreador,
  ): undefined;
}
