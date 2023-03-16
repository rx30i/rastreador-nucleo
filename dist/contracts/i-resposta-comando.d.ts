import { ComandoStatus } from '../enums';
export interface IRespostaComando {
    readonly id: number;
    readonly pattern: string;
    readonly dataHora: string;
    readonly status: ComandoStatus;
}
