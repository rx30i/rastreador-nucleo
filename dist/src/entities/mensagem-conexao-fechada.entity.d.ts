import { IMensagemConexaoFechada } from '../contracts/i-mensagem-conexao-fechada';
export declare class MensagemConexaoFechadaEntity {
    readonly dataHora: string;
    readonly imei: string;
    readonly integracao: string;
    readonly pattern: string;
    readonly online: boolean;
    constructor(dataHora: string, imei: string, integracao: string);
    obterObjeto(): IMensagemConexaoFechada;
    validar(): void;
    private obterDataHora;
    private obterString;
}
