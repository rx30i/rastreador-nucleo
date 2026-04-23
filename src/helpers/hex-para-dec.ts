export function hexParaDec(mensagem: string): number | undefined {
  if (!mensagem || typeof mensagem !== 'string') {
    return undefined;
  }

  const resultado = parseInt(mensagem, 16);

  if (isNaN(resultado)) {
    return undefined;
  }

  return resultado;
}
