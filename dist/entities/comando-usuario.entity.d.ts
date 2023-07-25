interface IComandoUsuarioEntity {
    readonly _id: string;
    readonly integracao: string;
    readonly identificador: string;
    readonly comando: string;
    readonly imei: string;
}
export declare class ComandoUsuarioEntity {
    readonly _id: string;
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
