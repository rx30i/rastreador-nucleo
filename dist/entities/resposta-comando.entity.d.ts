import { IRespostaComando } from 'src/contracts';
import { ComandoStatus } from '../enums/comando-status';
export declare class RespostaComandoEntity {
    readonly id: number;
    readonly pattern: string;
    readonly dataHora: string;
    readonly status: ComandoStatus;
    readonly identificador: string;
    readonly imei: string;
    constructor(objeto: IRespostaComando);
    validar(): boolean;
    json(): string;
    private _checarString;
    private _checarInteiro;
}
