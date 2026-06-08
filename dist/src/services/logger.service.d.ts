import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class LoggerService extends ConsoleLogger {
    private readonly configService;
    constructor(configService: ConfigService);
    local2(mensagem: unknown, prefixo?: string): undefined;
    capiturarError(erro: unknown): undefined;
    private formatarMensagem;
    private normalizarErro;
    private serializarValor;
    private normalizarValorSerializado;
    private valorEhObjetoComum;
    private converterValorParaTexto;
}
