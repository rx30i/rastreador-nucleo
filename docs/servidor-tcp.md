## Servidor TCP customizado (ServidorTcp)

A classe `ServidorTcp` é uma implementação customizada de transporte TCP para o NestJS, permitindo criar servidores TCP onde rastreadores podem se conectar e enviar mensagens. Ela implementa a interface `CustomTransportStrategy` e despacha exclusivamente eventos registrados com `@EventPattern`.


### Características

- Servidor TCP compatível com o padrão de microserviços do NestJS
- Despacho exclusivo de eventos com `@EventPattern`
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
      prefixo       : ['7878', '7979'],
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
| `servidor.path` | `string` | Sim | Endereço IP do servidor |
| `servidor.port` | `number` | Sim | Porta do servidor |
| `tratarErro` | `LoggerService` | Sim | Logger para tratamento de erros |
| `codificacaoMsg` | `CodificacaoMsg` | Sim | Codificação das mensagens (`ascii` ou `hex`) |
| `exibirMensagensBrutasRecebidas` | `boolean` | Não | Quando `true`, registra cada quadro TCP completo recebido pelo logger configurado; o padrão é `false` |
| `prefixo` | `string \| string[]` | Não | Prefixo ou prefixos alternativos para identificar início das mensagens; vazio equivale a não configurado |
| `sufixo` | `string` | Não | Sufixo para identificar fim das mensagens; vazio equivale a não configurado |

### Exibição de mensagens brutas

Para visualizar cada quadro completo recebido do rastreador, a integração pode definir a seguinte variável de ambiente:

```env
EXIBIR_MENSAGENS_BRUTAS_RASTREADOR=true
```

Converta a variável para booleano ao criar o servidor:

```typescript
const exibirMensagensBrutasRecebidas =
  configService.get<string>('EXIBIR_MENSAGENS_BRUTAS_RASTREADOR') === 'true';

new ServidorTcp({
  // demais configurações
  exibirMensagensBrutasRecebidas,
});
```

Quando ativa, a opção usa `tratarErro.log()` para registrar uma linha por quadro completo. Em `CodificacaoMsg.ASCII`, a mensagem preserva caixa e terminadores; em `CodificacaoMsg.HEX`, ela é exibida em hexadecimal. Como o conteúdo pode incluir IMEI, localização e outros dados sensíveis, mantenha a opção desativada fora de diagnósticos controlados.

### Métodos Principais

#### `listen(callback: () => void)`
Inicia o servidor TCP e executa o callback quando estiver pronto.

#### `close()`
Encerra o servidor TCP e destrói todas as conexões pertencentes à instância, inclusive as que ainda não tiveram IMEI reconhecido. Conexões mantidas por outras instâncias não são removidas.

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
    this.loggerService.debug(mensagem, 'INTEGRAÇÃO');
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

### Contexto TCP

Controllers que recebem `@Ctx() ctx: TcpContext` podem acessar duas representacoes da mensagem:

- `ctx.mensagem()` retorna a mensagem usada pelo transporte para roteamento e desserializacao. Ela preserva o comportamento historico do servidor TCP e pode estar normalizada, por exemplo em caixa baixa e sem quebras de linha.
- `ctx.mensagemBruta()` retorna o trecho original recebido do socket para aquela mensagem, preservando caixa, separadores e terminadores como `\r` e `\n`. Quando o transporte nao tiver uma mensagem bruta separada, esse metodo retorna o mesmo valor de `ctx.mensagem()`.

Use `ctx.mensagemBruta()` quando o protocolo exigir o pacote ASCII original para calculos de ACK ou checksum, como nas mensagens Suntech `ASTT`, `AALT`, `ATRV` e `ACID`.

```typescript
import { Ctx, EventPattern, Payload } from '@nestjs/microservices';
import { TcpContext, Pattern } from 'rastreador-nucleo/dist/src';
import { Controller } from '@nestjs/common';

@Controller()
export class ReceberMsgSuntechController {
  @EventPattern(Pattern.LOGIN)
  public async receber(@Payload() mensagem: string, @Ctx() ctx: TcpContext): Promise<void> {
    const mensagemParaRoteamento = ctx.mensagem();
    const mensagemOriginal = ctx.mensagemBruta();

    // Calcule o ACK com mensagemOriginal quando o checksum depender do pacote ASCII recebido.
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

O comando é escrito como `Buffer` bruto, exatamente no protocolo do rastreador, sem envelope ou framing adicional. A confirmação enviada pelo equipamento retorna como uma mensagem normal do protocolo do rastreador e é encaminhada a um controller com `@EventPattern`.

### Separação de Mensagens

O servidor trata mensagens de rastreadores concatenadas pelo protocolo TCP usando o `prefixo` e/ou o `sufixo` configurados.

Quando `prefixo` receber um array, cada item será tratado como um prefixo alternativo válido.

Em `CodificacaoMsg.HEX`, prefixos e sufixos são reconhecidos somente no início de um byte, isto é, em posições pares da representação hexadecimal. Sequências formadas entre o segundo caractere de um byte e o primeiro caractere do byte seguinte não são tratadas como delimitadores.

Quando nenhum delimitador válido estiver configurado — inclusive `prefixo: []`, prefixos vazios ou `sufixo: ''` — cada entrada TCP não vazia é encaminhada integralmente como uma única mensagem. A versão usada no roteamento é normalizada, enquanto `TcpContext.mensagemBruta()` preserva o conteúdo original. Uma entrada vazia não produz evento.

#### Prefixo e sufixo

Quando houver ao menos um `prefixo` e um `sufixo` não vazios, o servidor trata os dados recebidos como um fluxo contínuo. Um quadro ou o próprio prefixo pode chegar em mais de um evento `data`; nesse caso, a parte incompleta é mantida somente no socket de origem, concatenada ao próximo evento e encaminhada ao deserializador apenas depois que o sufixo for encontrado.

Se uma entrada contiver quadros completos seguidos pelo início de outro quadro, somente os quadros completos serão processados imediatamente. A sobra permanece pendente até a chegada do restante. Se a conexão for encerrada antes do fechamento do quadro, a parte truncada é descartada e registrada no logger configurado.

Exemplo:

```typescript
new ServidorTcp({
  deserializer  : new Deserializer(),
  codificacaoMsg: CodificacaoMsg.HEX,
  prefixo       : ['7878', '7979'],
  sufixo        : '0d0a',
  tratarErro    : logger,
  servidor      : {
    path: servidor,
    port: porta,
  },
});
```

#### Delimitador simétrico

Quando houver um único `prefixo` igual ao `sufixo`, como `7e` em protocolos JT/T 808, o servidor considera o primeiro delimitador como abertura e procura o próximo como fechamento. Quadros concatenados são entregues separadamente, com os dois delimitadores preservados.
