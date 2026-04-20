import { Server } from '@nestjs/microservices';
import { CustomTransportStrategy } from '@nestjs/microservices';
import { IServidorTCPConfig, ISocket } from '../../contracts';
import * as Net from 'node:net';
export declare class ServidorTcp extends Server implements CustomTransportStrategy {
    private readonly stringDecoder;
    private readonly configuracao;
    private static conexoesTcp;
    private readonly separarMsgs;
    private servidor?;
    constructor(configuracao: IServidorTCPConfig);
    listen(callback: () => void): void;
    on(evento: string, callback: Function): void;
    unwrap<T = Net.Server>(): T;
    static obterConexao(imei: string): ISocket | null;
    close(): void;
    private mensagem;
    private messagePattern;
    private eventPattern;
    private timeOut;
    private clienteEncerrouConexao;
    private clienteDesconectou;
    private conexaoErro;
    private salvarConexao;
    private formatarResposta;
    private qtdDispositivosConectados;
    separarMensagens(mensagem: Buffer): string[];
}
