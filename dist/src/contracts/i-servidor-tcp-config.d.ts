import { IConsumerDeserializer } from './i-consumer-deserializer';
import { LoggerService } from '@nestjs/common';
import { CodificacaoMsg } from '../enums';
export interface IServidorTCPConfig {
    deserializer: IConsumerDeserializer;
    servidor: {
        path: string;
        port: number;
    };
    tratarErro: LoggerService;
    prefixo?: string | string[];
    sufixo?: string;
    codificacaoMsg: CodificacaoMsg;
}
