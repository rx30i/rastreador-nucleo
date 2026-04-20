import { IConsumerDeserializer } from './i-consumer-deserializer';
import { Serializer } from '@nestjs/microservices';
import { LoggerService } from '@nestjs/common';
import { CodificacaoMsg } from '../enums';

export interface IServidorTCPConfig {
  deserializer: IConsumerDeserializer;
  serializer? : Serializer;
  servidor: {
    path: string;
    port: number;
  };

  /**
   * Recebe uma instância de algo que implementa a interface LoggerService do NestJs.
   * Na classe ServidorTcp os possíveis erros que ocorram serão injetados no
   * método erro da instância fornecida.
   */
  tratarErro: LoggerService;

  /**
   * O protocolo TCP concatena as mensagens enviadas em um mesmo canal
   * com um curto intervalo de tempo entre os envios, por isso as mensagens
   * recebidas devem ser verificadas e tratadas.
   *
   * O atributo "prefixo" é um código que define o início da mensagem, toda
   * mensagem recebida deve ter esse prefixo no seu início. Através desse
   * prefixo é possível verificar a quantidade de mensagens recebidas e separá-las.
   * Se a mensagem não possui o prefixo ela não deve ser descartada, deve ser propagada
   * para para a aplicação e na aplicação será verificada se é valida ou não.
  */
  prefixo?: string;

  /**
   * O protocolo TCP concatena as mensagens enviadas em um mesmo canal
   * com um curto intervalo de tempo entre os envios, por isso as mensagens
   * recebidas devem ser verificadas e tratadas.
   *
   * O atributo "sufixo" é um código que define o final da mensagem, toda
   * mensagem recebida deve ter esse código no seu final, através
   * desse código é possível verificar a quantidade de mensagens
   * recebidas e separá-las.
   *
   * Se a mensagem não possui o sufixo informado ela não deve ser descartada, deve ser
   * propagada para para a aplicação e na aplicação será verificada se é valida ou não.
   *
   */
  sufixo?: string;

  /**
   * É necessário informar qual a codificação das mensagens recebidas,
   * se estão em ascii ou hex.
   */
  codificacaoMsg: CodificacaoMsg
}
