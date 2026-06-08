import { IServidorTCPConfig } from '../../contracts';
export declare class SepararMensagens {
    private readonly servidorTCPConfig;
    constructor(servidorTCPConfig: IServidorTCPConfig);
    obterMensagens(mensagem: string): string[];
    private obterPrefixosNormalizados;
    private obterSufixoNormalizado;
    private separarMsgPeloPrefixo;
    private separarMsgPeloSufixo;
    private separarMsgPeloPrefixoSufixo;
    private ordenarPrefixosPorTamanho;
    private obterPosicoesDosPrefixos;
    private obterPrefixoNaPosicao;
    private removerQuebrasDeLinha;
}
