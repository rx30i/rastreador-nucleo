import { ComandoStatus } from '../enums/comando-status';
export declare class RespostaComandoEntity {
    readonly id: number;
    readonly pattern: string;
    readonly dataHora: string;
    readonly status: ComandoStatus;
    readonly identificador: string | null;
    readonly imei: string | null;
    constructor(id: number, pattern: string, dataHora: string, status: ComandoStatus);
    validar(): boolean;
    json(): string;
    private _checarString;
    private _checarInteiro;
}
