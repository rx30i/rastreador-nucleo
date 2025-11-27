import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class LoggerService extends ConsoleLogger {
    private readonly configService;
    constructor(configService: ConfigService);
    local2(mensagem: unknown): undefined;
    capiturarError(erro: unknown): undefined;
    error(message: any, stack?: string, context?: string): void;
    local(prefixo: string, mensagem: string | Record<string, any>): void;
    capiturarException(erro: Error, context?: any): void;
}
