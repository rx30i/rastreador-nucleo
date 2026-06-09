import { IServidorTCPConfig } from '../../contracts';
export interface MensagemSeparada {
    mensagem: string;
    mensagemBruta: string;
}
export declare class SepararMensagens {
    private readonly servidorTCPConfig;
    constructor(servidorTCPConfig: IServidorTCPConfig);
    obterMensagens(mensagem: string): string[];
    obterMensagensComBruto(mensagem: string): MensagemSeparada[];
    private obterPrefixosNormalizados;
    private obterSufixoNormalizado;
    private separarMsgPeloPrefixo;
    private separarMsgPeloSufixo;
    private separarMsgPeloPrefixoSufixo;
    private ordenarPrefixosPorTamanho;
    private obterPosicoesDosPrefixos;
    private obterPrefixoNaPosicao;
    private removerQuebrasDeLinha;
    private criarMensagemSeparada;
}
