import { ConsumerDeserializer } from '@nestjs/microservices';
export interface IConsumerDeserializer extends ConsumerDeserializer {
    obterImei(menagem: string): string;
}
