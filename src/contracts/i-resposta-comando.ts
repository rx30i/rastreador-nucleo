import { ComandoStatus } from '../enums';

export interface IRespostaComando {
  readonly _id: string,
  readonly pattern: string,
  readonly imei: string;
  readonly dataHora: string,
  readonly identificador: string;
  readonly status: ComandoStatus,
}
