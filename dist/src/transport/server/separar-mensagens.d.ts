import { IServidorTCPConfig } from '../../contracts';
export declare class SepararMensagens {
    private readonly servidorTCPConfig;
    constructor(servidorTCPConfig: IServidorTCPConfig);
    obterMensagens(mensagem: string): string[];
    private prefixoInformado;
    private sufixoInformado;
    private separarMsgPeloPrefixo;
    private separarMsgPeloSufixo;
    private separarMsgPeloPrefixoSufixo;
}
