import {hexParaDec} from './hex-para-dec';

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

  let resposta     = '';
  const arrayDados = mensagem.split('');
  for (let cont = 0; cont < arrayDados.length; cont++) {
    if (arrayDados[cont] !== undefined) {
      resposta += hexParaDec(arrayDados[cont]).toString(2).padStart(4, '0');
    }
  }

  return resposta;
}
