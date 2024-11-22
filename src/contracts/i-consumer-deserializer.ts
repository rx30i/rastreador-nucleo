import {ConsumerDeserializer} from '@nestjs/microservices';

export interface IConsumerDeserializer extends ConsumerDeserializer {
  /**
   * Um identificador único que representa o cliente conectado
   */
  obterImei(menagem: string): string;
}
