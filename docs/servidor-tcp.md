## Servidor TCP customizado (ServidorTcp)

A classe `ServidorTcp` é uma implementação customizada de transporte TCP para o NestJS, permitindo criar servidores TCP onde clientes podem se conectar e enviar mensagens. Ela implementa a interface `CustomTransportStrategy` do NestJS.


### Características

- Servidor TCP compatível com o padrão de microserviços do NestJS
- Suporte a separação de mensagens concatenadas (TCP Receive Segment Coalescing)
- Gerenciamento de conexões ativas por IMEI
- Eventos automáticos para conexões fechadas e quantidade de dispositivos conectados
- Timeout configurável para conexões inativas


### Uso Básico

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ServidorTcp } from './transport/server/servidor-tcp';
import { IServidorTCPConfig } from './contracts';


async function bootstrap () {
  const configService: ConfigService = new ConfigService({isGlobal: true});
  Sentry.init({dsn: configService.get<string>('SENTRY_DNS')});

  const logger   = new LoggerService(configService);
  const servidor = configService.get<string>('APP_HOST') ?? '';
  const porta    = configService.get<number>('APP_PORTA') ?? 0;

  const app = await NestFactory.createMicroservice(AppModule, {
    strategy: new ServidorTcp({
      deserializer  : new Deserializer(),
      codificacaoMsg: CodificacaoMsg.HEX,
      delimitadorMsg: '',
      sufixo        : '0d0a',
      tratarErro    : logger,
      servidor      : {
        path: servidor,
        port: porta,
      },
    }),
  });

  app.listen();

  process.on('unhandledRejection', (erro) => encerrarApp(app, 1, erro));
  process.on('uncaughtException', (erro) => encerrarApp(app, 1, erro));
}

bootstrap();
```

### Configuração (IServidorTCPConfig)

| Propriedade | Tipo | Obrigatório | Descrição |
|-------------|------|-------------|-----------|
| `deserializer` | `IConsumerDeserializer` | Sim | Deserializador para converter mensagens recebidas |
| `serializer` | `Serializer` | Não | Serializador para formatar respostas |
| `servidor.path` | `string` | Sim | Endereço IP do servidor |
| `servidor.port` | `number` | Sim | Porta do servidor |
| `tratarErro` | `LoggerService` | Sim | Logger para tratamento de erros |
| `codificacaoMsg` | `CodificacaoMsg` | Sim | Codificação das mensagens (`ascii` ou `hex`) |
| `prefixo` | `string` | Não | Prefixo para identificar início das mensagens |
| `sufixo` | `string` | Não | Sufixo para identificar fim das mensagens |

### Métodos Principais

#### `listen(callback: () => void)`
Inicia o servidor TCP e executa o callback quando estiver pronto.

#### `close()`
Encerra o servidor TCP e destrói todas as conexões ativas.

#### `unwrap<T = Net.Server>(): T`
Retorna o servidor TCP nativo do Node.js para acesso a funcionalidades específicas.

#### `on(evento: string, callback: Function): void`
Registra um listener de evento no servidor TCP nativo.

#### `static obterConexao(imei: string): ISocket | null`
Obtém a conexão (socket) de um cliente pelo seu IMEI.

### Eventos Automáticos

O servidor emite automaticamente os seguintes eventos:

#### `CONEXAO_FECHADA`
Emitido quando um cliente desconecta.

```typescript
import { SalvarMsgConexaoRastreadorEnceradaService } from '../services';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Pattern } from 'rastreador-nucleo/dist/src';
import { Controller } from '@nestjs/common';

@Controller()
export class ReceberMsgConexaoRastreadorEnceradaController {
  constructor (
    private readonly conexaoRastreadorEncerada: SalvarMsgConexaoRastreadorEnceradaService
  ) {}

  //Sempre que o rastreador for desconectado do servidor TCP, esse controller será informado.
  @EventPattern(Pattern.CONEXAO_FECHADA)
  public async receber (@Payload() mensagem: Record<string, string>): Promise<void> {
    await this.conexaoRastreadorEncerada.salvar(mensagem);
  }
}
```


#### `DESCONHECIDA`
Emitido quando não for definido um controller para lidar com o tipo da mensagem recebida.

```typescript
import { EventPattern, Payload } from '@nestjs/microservices';
import { SalvarMsgDesconhecidaService } from '../services';
import { Pattern } from 'rastreador-nucleo/dist/src';
import { Controller } from '@nestjs/common';

@Controller()
export class ReceberMsgDesconhecidaController {
  constructor (
    private readonly salvarMsgDesconhecida: SalvarMsgDesconhecidaService,
  ) {}

  @EventPattern(Pattern.DESCONHECIDA)
  public async receber (@Payload() mensagem: string): Promise<void> {
    await this.salvarMsgDesconhecida.salvar(mensagem);
  }
}

```


#### `QTD_DISPOSITIVOS_CONECTADOS`
Emitido quando um novo dispositivo se conecta.

```typescript
import { EventPattern, Payload } from '@nestjs/microservices';
import { Pattern } from 'rastreador-nucleo/dist/src';
import { LoggerService } from '../../nucleo';
import { Controller } from '@nestjs/common';

@Controller()
export class ReceberMsgQtdDispositivosConectadosController {
  constructor (
    private readonly loggerService: LoggerService,
  ) {}

  @EventPattern(Pattern.QTD_DISPOSITIVOS_CONECTADOS)
  public async receber (@Payload() mensagem: string): Promise<void> {
    this.loggerService.local('INTEGRAÇÃO', mensagem);
  }
}
```


### Exemplo de Controller para lidar com a menssagem `LOGIN`

```typescript
import { ResponderMsgLoginService, SalvarMsgLoginService } from '../services';
import { Ctx, EventPattern, Payload } from '@nestjs/microservices';
import { TcpContext, Pattern } from 'rastreador-nucleo/dist/src';
import { Controller } from '@nestjs/common';

@Controller()
export class ReceberMsgLoginController {

  constructor (
    private readonly responderMsgLogin: ResponderMsgLoginService,
    private readonly salvarMsgLogin: SalvarMsgLoginService,
  ) {}

  @EventPattern(Pattern.LOGIN)
  public async receber (@Payload() mensagem: string, @Ctx() ctx: TcpContext): Promise<void> {
    this.responderMsgLogin.responder(mensagem, ctx);
    await this.salvarMsgLogin.salvar(mensagem);
  }
}
```

### Enviando Comandos para Clientes

```typescript
import { ServidorTcp } from './transport/server/servidor-tcp';

// Obter conexão de um cliente específico
const socket = ServidorTcp.obterConexao('123456789012345');

if (socket) {
  socket.write(Buffer.from('comando'));
}
```

### Separação de Mensagens

O servidor trata automaticamente mensagens concatenadas pelo protocolo TCP:

1. **Mensagens no formato NestJS**: `tamanho#mensagem` (ex: `25#{"pattern":"teste"}`)
2. **Mensagens de rastreadores**: Separadas por `prefixo` e/ou `sufixo` configurados
