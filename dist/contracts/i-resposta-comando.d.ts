import { ComandoStatus } from '../enums';
export interface IRespostaComando {
    readonly id: number;
    readonly pattern: string;
    readonly imei: string;
    readonly dataHora: string;
    readonly identificador: string;
    readonly status: ComandoStatus;
}
