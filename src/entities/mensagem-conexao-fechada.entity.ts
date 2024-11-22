import {IMensagemConexaoFechada} from '../contracts/i-mensagem-conexao-fechada';
import {HttpException, HttpStatus} from '@nestjs/common';
import {Pattern} from '../enums/pattern';

export class MensagemConexaoFechadaEntity {
  public readonly dataHora: string;
  public readonly imei: string;
  public readonly integracao: string;
  public readonly pattern: string;
  public readonly online: boolean;

  constructor(dataHora: string, imei: string, integracao: string) {
    this.dataHora   = this.obterDataHora(dataHora);
    this.imei       = this.obterString(imei);
    this.pattern    = Pattern.CONEXAO_FECHADA;
    this.integracao = this.obterString(integracao);
    this.online     = false;
  }

  public obterObjeto(): IMensagemConexaoFechada {
    return {...this};
  }

  /**
   * @return {void}
   * @throws { HttpException }
   */
  public validar(): void {
    if (!this.dataHora) {
      throw new HttpException(
        `O atributo dataHora não é valido. Valor atual é: '${this.dataHora}'`,
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    if (!this.imei) {
      throw new HttpException(
        `O atributo imei não é valido. Valor atual é: '${this.imei}'`,
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
  }

  private obterDataHora(dataHora: string): string {
    if (typeof dataHora === 'string' &&
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3})Z$/g.test(dataHora) === true) {
      return dataHora;
    }

    return '';
  }

  private obterString(valor: string): string {
    if (typeof valor === 'string') {
      return valor;
    }

    if (typeof valor === 'number') {
      return (valor as number).toString();
    }

    return '';
  }
}
