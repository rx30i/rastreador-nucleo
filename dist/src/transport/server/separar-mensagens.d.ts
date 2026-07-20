import { IServidorTCPConfig } from '../../contracts';
export interface MensagemSeparada {
    mensagem: string;
    mensagemBruta: string;
}
export interface IResultadoSeparacaoMensagens {
    mensagens: MensagemSeparada[];
    mensagemIncompleta: string;
}
export declare class SepararMensagens {
    private readonly servidorTCPConfig;
    constructor(servidorTCPConfig: IServidorTCPConfig);
    obterMensagens(mensagem: string): string[];
    obterMensagensComBruto(mensagem: string): MensagemSeparada[];
    possuiDelimitadorSimetrico(): boolean;
    obterResultadoSeparacao(mensagem: string): IResultadoSeparacaoMensagens;
    private obterMensagensPelaConfiguracao;
    private configuracaoPossuiDelimitadorSimetrico;
    private separarMensagensPeloDelimitadorSimetrico;
    private obterPrefixosNormalizados;
    private obterSufixoNormalizado;
    private separarMsgPeloPrefixo;
    private separarMsgPeloSufixo;
    private separarMensagensPeloPrefixoSufixo;
    private criarResultadoSemPrefixoCompleto;
    private podeSerInicioDePrefixo;
    private ordenarPrefixosPorTamanho;
    private obterPosicoesDosPrefixos;
    private obterPrefixoNaPosicao;
    private obterPosicaoDelimitador;
    private posicaoDelimitadorEstaAlinhada;
    private removerQuebrasDeLinha;
    private criarMensagemSeparada;
}
