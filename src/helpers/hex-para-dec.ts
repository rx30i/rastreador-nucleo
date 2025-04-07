export function hexParaDec(mensagem: string): number | undefined {
  if (mensagem && typeof mensagem === 'string') {
    return parseInt(mensagem, 16);
  }
}
