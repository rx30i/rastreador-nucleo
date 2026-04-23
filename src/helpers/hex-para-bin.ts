import { hexParaDec } from './hex-para-dec';

/**
 * Converter string hexadecimal para binário. Cada digito em hexadecimal corresponde
 * a quatro digitos binários.
 *
 * @param  {string} mensagem
 * @return {string | undefined}
 */
export function hexParaBin(mensagem: string): string | undefined {
  if (!mensagem || typeof mensagem !== 'string') {
    return undefined;
  }

  let resposta = '';
  for (const caractere of mensagem) {
    const valorDecimal = hexParaDec(caractere);
    if (valorDecimal !== undefined) {
      resposta += valorDecimal.toString(2).padStart(4, '0');
    }
  }

  return resposta;
}
