interface IComandoUsuarioEntity {
    readonly id: number;
    readonly integracao: string;
    readonly identificador: string;
    readonly comando: string;
    readonly imei: string;
}
export declare class ComandoUsuarioEntity {
    readonly id: number;
    readonly integracao: string;
    readonly identificador: string;
    readonly comando: string;
    readonly imei: string;
    constructor(dados: IComandoUsuarioEntity);
    valido(): boolean;
    private _checarInteiro;
    private _checarString;
}
export {};
