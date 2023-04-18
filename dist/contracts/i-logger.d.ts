import { LoggerService } from '@nestjs/common';
export interface ILoger extends LoggerService {
    local(prefixo: string, mensagem: string | Record<string, any>): void;
    capiturarException(erro: Error, context?: any): void;
}
