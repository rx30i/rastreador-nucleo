import { IConsumerDeserializer } from './i-consumer-deserializer';
import { Serializer } from '@nestjs/microservices';
import { LoggerService } from '@nestjs/common';
import { CodificacaoMsg } from '../enums';
export interface IServidorTCPConfig {
    deserializer: IConsumerDeserializer;
    serializer?: Serializer;
    servidor: {
        path: string;
        port: number;
    };
    tratarErro: LoggerService;
    delimitadorMsg: string;
    codificacaoMsg: CodificacaoMsg;
}
