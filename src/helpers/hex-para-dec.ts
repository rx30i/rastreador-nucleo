export function hexParaDec(mensagem: string): number {
  if (mensagem && typeof mensagem === 'string') {
    return parseInt(mensagem, 16);
  }
}
