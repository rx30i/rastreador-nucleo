# Envio de Comandos ao Rastreador

Este documento descreve como utilizar o serviço `EnviarComandoRastreadorService` para enviar comandos do usuário aos rastreadores conectados ao servidor TCP.


## Visão Geral

O fluxo de envio de comandos funciona da seguinte maneira:

1. O usuário envia um comando através de uma API externa
2. O comando é publicado em uma fila do RabbitMQ
3. O `EnviarComandoRastreadorService` consome a mensagem da fila
4. O comando é enviado ao rastreador via conexão TCP (se estiver conectado)
5. Uma resposta é publicada na fila do rabbitMq informando o status do envio (enviado)
6. O rastreador confirma o recebimento do comando
7. uma nova resposta é publicada na fila do rabbitMq informando o status do envio (confirmado ou erro)

O `Buffer` recebido pelo serviço é escrito diretamente no socket retornado por `ServidorTcp.obterConexao(imei)`, sem envelope ou framing adicional. A confirmação do rastreador retorna como uma mensagem normal do protocolo do equipamento e é processada por um controller com `@EventPattern`.


## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `RABBITMQ_FILA_COMANDO`       | Nome da fila onde os comandos são publicados                       | Sim |
| `RABBITMQ_FILA_COMANDO_PAUSA` | Nome da fila onde os comandos aguardam por nova tentativa de envio | Sim |


## Estrutura do comando recebido

O comando enviado para a fila via api pelo usuário deve ter o seguinte formato JSON:

```json
{
  "_id": "6478a1b2c3d4e5f6g7h8i9j0",
  "modeloRastreador": "CRX1",
  "integracao": "coban303",
  "identificador": "bloquear",
  "comando": "ST300CMD;100850000;02;Enable1",
  "imei": "123456789012345"
}
```


### Campos do comando

| Campo              | Tipo   | Descrição                                                    |
|--------------------|--------|--------------------------------------------------------------|
| `_id`              | string | ID do registro no banco de dados                             |
| `modeloRastreador` | string | Modelo do rastreador (ex: CRX1, J16A)                        |
| `integracao`       | string | Identificador único da integração (ex: coban303, suntech300) |
| `identificador`    | string | Nome do comando (ex: bloquear, formatar, reiniciar)          |
| `comando`          | string | Comando a ser enviado ao rastreador                          |
| `imei`             | string | Número de série/IMEI do rastreador                           |


## Filas RabbitMQ

O sistema utiliza as seguintes filas:

| Fila                          | Descrição                                       |
|-------------------------------|-------------------------------------------------|
| `RABBITMQ_FILA_COMANDO`       | Fila principal onde os comandos são publicados  |
| `RABBITMQ_FILA_COMANDO_PAUSA` | Fila de pausa para retry (5 segundos)           |
| `rastreador.mensagem`         | Fila onde são publicadas as respostas de status |
| `rastreador.erro`             | Fila onde são enviados comandos com falha       |


## Status de Comando

| Status       | Descrição                                        |
|--------------|--------------------------------------------------|
| `enviado`    | Comando foi enviado ao rastreador com sucesso    |
| `confirmado` | Rastreador confirmou a execução do comando       |
| `erro`       | Comando não pôde ser enviado após 720 tentativas |

## Exemplo de Uso

### Controller para Receber Comandos do Usuário

```typescript
import { EnviarComandoRastreadorService } from 'rastreador-nucleo/dist';
import { LoggerService } from '../../nucleo/services/logger.service';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConsumeMessage } from 'amqplib';

@Injectable()
export class ReceberCmdUsuarioController implements OnApplicationBootstrap {
  private readonly enviarComando: EnviarComandoRastreadorService;

  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {
    this.logger.setContext(ReceberCmdUsuarioController.name);
    this.enviarComando = new EnviarComandoRastreadorService(
      this.amqpConnection,
      this.configService,
      this.logger
    );
  }

  /**
   * @override
   */
  public async onApplicationBootstrap(): Promise<void> {
    this.enviarComando.receberMsgRabbitMq((mensagem: ConsumeMessage) => {
      this.enviarComandoAoRastreador(mensagem);
    });
  }

  /**
   * @param {ConsumeMessage} mensagem
   * @returns {void}
   */
  private enviarComandoAoRastreador(mensagem: ConsumeMessage): void {
    const comandoUsuario = this.enviarComando.decodificarMsg(mensagem);

    if (comandoUsuario?.comando && typeof comandoUsuario.comando === 'string') {
      this.enviarComando.enviarComando(
        mensagem,
        Buffer.from(comandoUsuario.comando, 'ascii')
      );
    }
  }
}
```

### Controller para Receber Resposta do Rastreador

```typescript
import { SalvarRespostaRastreadorService } from '../services/salvar-resposta-rastreador.service';
import { Pattern as TipoMensagem, TcpContext } from 'rastreador-nucleo/dist';
import { Ctx, EventPattern, Payload } from '@nestjs/microservices';
import { Controller } from '@nestjs/common';

@Controller()
export class ReceberRespostaRastreadorController {
  constructor(
    private readonly salvarRespostaRastreador: SalvarRespostaRastreadorService,
  ) {}

  /**
   * Recebe uma mensagem do rastreador confirmando a execução do comando
   * que foi enviado para ele pelo usuário.
   *
   * @param  {string} mensagem
   * @return {Promise<void>}
   */
  @EventPattern(TipoMensagem.COMANDO)
  public async mensagem(@Payload() mensagem: string, @Ctx() ctx: TcpContext): Promise<void> {
    await this.salvarRespostaRastreador.salvar(mensagem, ctx);
  }
}
```

## Métodos do Serviço

### `receberMsgRabbitMq(callback)`

Inicia o consumo de mensagens da fila de comandos.

| Parâmetro  | Tipo                                 | Descrição                                  |
|------------|--------------------------------------|--------------------------------------------|
| `callback` | `(mensagem: ConsumeMessage) => void` | Função chamada para cada mensagem recebida |

**Comportamento:**
- Configura prefetch de 10 mensagens
- Em caso de fechamento da conexão, aguarda 1 minuto e tenta reconectar
- Registra erro se a variável `RABBITMQ_FILA_COMANDO` não estiver definida

### `enviarComando(mensagem, comando)`

Envia o comando ao rastreador conectado.

| Parâmetro  | Tipo | Descrição |
|------------|------------------|-----------------------------------|
| `mensagem` | `ConsumeMessage` | Mensagem original do RabbitMQ     |
| `comando`  | `Buffer`         | Comando em formato Buffer (ASCII) |

**Retorno:** `undefined`

**Comportamento:**
- Decodifica a mensagem para extrair os dados do comando
- Busca a conexão TCP do rastreador pelo IMEI
- Escreve exatamente o `Buffer` recebido no socket, sem framing adicional
- Publica resposta na fila `rastreador.mensagem` ou `rastreador.erro`

### `decodificarMsg(msg)`

Decodifica a mensagem do RabbitMQ para um objeto `ComandoUsuarioEntity`.

| Parâmetro | Tipo             | Descrição            |
|-----------|------------------|----------------------|
| `msg`     | `ConsumeMessage` | Mensagem do RabbitMQ |

**Retorno:** `ComandoUsuarioEntity | undefined`

### `rejeitarComandoInvalido(mensagem, comandoUsuario?)`

Encerra sem retry um comando que não pode ser convertido para o protocolo específico do rastreador.

| Parâmetro         | Tipo                               | Descrição                                             |
|-------------------|------------------------------------|-------------------------------------------------------|
| `mensagem`        | `ConsumeMessage`                   | Mensagem original do RabbitMQ                         |
| `comandoUsuario`  | `ComandoUsuarioEntity | undefined` | Contrato base decodificado, quando estiver disponível |

**Comportamento:**
- Não procura conexão nem escreve no socket
- Não aplica `nack` nem envia o comando para a fila de pausa
- Publica `COMANDO/erro` quando `comandoUsuario` estiver disponível
- Publica o payload original em `rastreador.erro`
- Confirma a mensagem com `ack`
- Registra somente a causa da rejeição, sem expor o corpo completo do comando

## Tratamento de Erros

### Canal Indisponível

Se o canal RabbitMQ não estiver disponível, o serviço lança um erro:

```
Error: Canal RabbitMQ não está disponível. Verifique a conexão.
```

### Payload Estruturalmente Inválido

Se a mensagem não puder ser decodificada no contrato base:
- A mensagem é confirmada (ack) e removida da fila
- A mensagem é publicada na fila `rastreador.erro` para análise

### Comando Semanticamente Inválido

Se o contrato base for válido, mas o comando não puder ser convertido para o protocolo do rastreador:
- O status `COMANDO/erro` é publicado em `rastreador.mensagem`
- O payload original é publicado em `rastreador.erro`
- A mensagem é confirmada (ack), sem retry

### Rastreador Desconectado

Se o rastreador não estiver conectado:
- A mensagem é rejeitada (nack) e enviada para a fila de pausa
- Após 5 segundos, retorna para a fila principal
- São feitas até 720 tentativas (aproximadamente 1 hora)
- Após esgotar as tentativas, vai para a fila `rastreador.erro`

## Fluxo de Retry

```
┌─────────────────────────────────────┐
│     RABBITMQ_FILA_COMANDO           │
│   (Fila principal de comandos)      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   EnviarComandoRastreadorService    │
│        (Tenta enviar)               │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
   Sucesso           Falha
       │               │
       ▼               ▼
┌──────────────┐  ┌────────────────────────┐
│ rastreador.  │  │ RABBITMQ_FILA_         │
│ mensagem     │  │ COMANDO_PAUSA (5s)     │
└──────────────┘  └───────────┬────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ Retry (até 720x)      │
                  └───────────┬───────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                Sucesso           Esgotou tentativas
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │ rastreador.  │    │ rastreador.  │
            │ mensagem     │    │ erro         │
            └──────────────┘    └──────────────┘
```

## Boas Práticas

1. **Implemente tratamento de exceções** no callback para evitar que erros não tratados encerrem a aplicação

2. **Monitore a fila de erros** (`rastreador.erro`) para identificar comandos que falharam

3. **Configure alertas** para quando a fila de comandos estiver acumulando mensagens

4. **Valide os dados** antes de publicar na fila para evitar mensagens malformadas
