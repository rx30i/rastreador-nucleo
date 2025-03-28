import {ComandoStatus} from '../enums/comando-status';
import {IRespostaComando} from '../contracts';

/**
 * Para todo comando enviado pelo usuário é necessario retornar uma resposta, essa resposta
 * represnta o status do comando, ela iforma se o comando foi enviado ou não ao rastreador.
 *
 * O atributo "_id" representa o id do registro no banco de dados.
 *
 * O atributo "dataHora" corresponde ao momento em que o comando foi enviado ao rastreador ou em
 * que o comando foi removido da fila por atigir o limite de tentativas de envio.
 *
 * O atributo "status" informa a situação do objeto criado, se representa um comando que foi enviado
 * ao rastreador ou um comando que não pode ser enviado ao rastreador.
 */
export class RespostaComandoEntity {
  public readonly _id: string;
  public readonly pattern: string;
  public readonly dataHora: string;
  public readonly status: ComandoStatus;
  public readonly identificador: string;
  public readonly imei: string;

  constructor(objeto: IRespostaComando) {
    this._id           = objeto._id;
    this.pattern       = objeto.pattern;
    this.imei          = objeto.imei;
    this.dataHora      = objeto.dataHora;
    this.status        = objeto.status;
    this.identificador = objeto.identificador;
  }

  public validar(): boolean {
    try {
      this._checarString(this._id);
      this._checarString(this.pattern);
      this._checarString(this.dataHora);
      this._checarString(this.imei);
      this._checarString(this.status);
      this._checarString(this.identificador);

      return true;
    } catch (_erro) {
      return false;
    }
  }

  public json(): string {
    return JSON.stringify({
      pattern: this.pattern,
      data   : {
        _id          : this._id,
        imei         : this.imei,
        dataHora     : this.dataHora,
        status       : this.status,
        identificador: this.identificador,
      },
    });
  }

  private _checarString(valor: string): void {
    if (typeof valor !== 'string') {
      throw new Error('Valor deve ser uma string.');
    }
  }

  private _checarInteiro(valor: number): void {
    if (valor.toString().match(/^\d+$/) === null) {
      throw new Error('Valor deve ser um numero interio.');
    }
  }
}
