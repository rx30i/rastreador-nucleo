import { LoggerService } from '@nestjs/common';
export type SentidoMensagemRastreador = 'recebida' | 'enviada';
export interface ILoger extends LoggerService {
    debug(mensagem: unknown, ...parametrosOpcionais: unknown[]): undefined;
    local2(mensagem: unknown, prefixo?: string): undefined;
    mensagemRastreador(imeiRastreador: string, mensagem: unknown, sentidoMensagem: SentidoMensagemRastreador): undefined;
    capiturarException(erro: Error, context?: unknown): void;
}
