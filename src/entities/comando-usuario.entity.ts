/**
 * Está entidade representa um comando enviado pelo usuário ao rastreador, esté comando é enviado através da api.
 *
 * O atributo "id" representa o id do registro no banco de dados.
 *
 * O atributo "integracao" é um identificador unico que distingui a integração.
 * EX: coban303, suntech300
 *
 * O atributo "identificador" representa o nome do comando.
 * Ex: bloquear, formatar, reiniciar
 *
 * O atributo "comando" é o comando ser enviada ao rastreador
 * EX: ST300CMD;100850000;02;Enable1
 *
 * O atributo "imei" é o identificador unico do rastreador, também chamado de número de serie.
 */
interface IComandoUsuarioEntity {
  readonly id: number;
  readonly integracao: string;
  readonly identificador: string;
  readonly comando: string;
  readonly imei: string;
}

export class ComandoUsuarioEntity {
  public readonly id: number;
  public readonly integracao: string;
  public readonly identificador: string;
  public readonly comando: string;
  public readonly imei: string;

  constructor (dados: IComandoUsuarioEntity) {
    this.id            = dados.id;
    this.integracao    = dados.integracao;
    this.identificador = dados.identificador;
    this.comando       = dados.comando;
    this.imei          = dados.imei;
  }

  public valido (): boolean {
    try {
      this._checarInteiro(this.id);
      this._checarString(this.integracao);
      this._checarString(this.identificador);
      this._checarString(this.comando);
      this._checarString(this.imei);

      return true;
    } catch (erro) {
      return false;
    }
  }

  private _checarInteiro (valor: number): void {
    if (Number.isInteger(valor) === false) {
      throw 'Valor deve ser um numero interio.';
    }
  }

  private _checarString (valor: string): void {
    if (typeof valor !== 'string') {
      throw 'Valor deve ser uma string.';
    }
  }
}
