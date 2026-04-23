# Serviço DeclararFilasRabbitMqService

## Visão geral

O serviço `DeclararFilasRabbitMqService` é responsável por configurar e declarar as filas, exchanges e vinculações necessárias para o funcionamento da aplicação com o RabbitMQ. Ele implementa a interface `OnApplicationBootstrap` do NestJS, o que significa que sua execução ocorre automaticamente durante a inicialização da aplicação.


## O que este serviço faz

Este serviço realiza as seguintes operações na inicialização da aplicação:

1. **Declara o Exchange**: Cria um exchange do tipo `direct` chamado `amq.direct` com configuração durável
2. **Declara as Filas**: Cria as seguintes filas no RabbitMQ:
   - `rastreador.erro` — Fila para mensagens de erro
   - `rastreador.mensagem` — Fila principal de mensagens
   - `rastreador.mensagem.pausa` — Fila de mensagens pausadas (com TTL de 60 segundos)
   - Fila de comandos (nome configurável via variável de ambiente)
   - Fila de comandos pausados (nome configurável via variável de ambiente)
3. **Vincula as Filas**: Associa cada fila ao exchange utilizando as chaves de roteamento apropriadas


## Variáveis de ambiente obrigatórias

Para que o serviço funcione corretamente, as seguintes variáveis de ambiente devem estar configuradas no arquivo `.env`:

| Variável                      | Descrição                         | Exemplo                    |
|-------------------------------|-----------------------------------|----------------------------|
| `RABBITMQ_FILA_COMANDO`       | Nome da fila de comandos          | `rastreador.comando`       |
| `RABBITMQ_FILA_COMANDO_PAUSA` | Nome da fila de comandos pausados | `rastreador.comando.pausa` |


## Como utilizar o serviço

### 1. Configuração no módulo

O serviço deve ser registrado como um provider no módulo da aplicação. Ele já está configurado para injeção de dependência e será automaticamente executado na inicialização.

```typescript
import { Module } from '@nestjs/common';
import { DeclararFilasRabbitMqService } from './services/declarar-filas-rabbitmq.service';

@Module({
  providers: [DeclararFilasRabbitMqService],
  exports: [DeclararFilasRabbitMqService],
})
export class AppModule {}
```

### 2. Injeção de Dependências

O serviço recebe as seguintes dependências através do construtor:

- `AmqpConnection`: Conexão gerenciada pelo módulo `@golevelup/nestjs-rabbitmq`
- `ConfigService`: Serviço de configuração do NestJS para acessar variáveis de ambiente
- `LoggerService`: Serviço de log para registro de exceções

### 3. Configuração do RabbitMQ

Certifique-se de que o módulo RabbitMQ está configurado corretamente no módulo raiz:

```typescript
import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

@Module({
  imports: [
    RabbitMQModule.forRoot(RabbitMQModule, {
      uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
      connectionInitOptions: { wait: true },
    }),
  ],
})
export class AppModule {}
```

## Estrutura das Filas

### Filas Principais

| Nome da Fila                | Tipo    | Descrição                                   |
|-----------------------------|---------|---------------------------------------------|
| `rastreador.erro`           | Durável | Armazena mensagens de erro processadas      |
| `rastreador.mensagem`       | Durável | Fila principal para mensagens do rastreador |
| `rastreador.mensagem.pausa` | Durável | Fila de mensagens com TTL de 60 segundos    |

### Filas de Comandos

| Nome da Fila                    | Tipo    | Descrição                                       |
|---------------------------------|---------|-------------------------------------------------|
| `{RABBITMQ_FILA_COMANDO}`       | Durável | Fila principal de comandos                      |
| `{RABBITMQ_FILA_COMANDO_PAUSA}` | Durável | Fila de comandos pausados com TTL de 5 segundos |

### Exchange

| Nome         | Tipo   | Descrição                                        |
|--------------|--------|--------------------------------------------------|
| `amq.direct` | Direct | Exchange utilizado para roteamento das mensagens |


## Tratamento de Erros

O serviço possui tratamento de erros robusto:

- **Validação de Variáveis de Ambiente**: Se `RABBITMQ_FILA_COMANDO` ou `RABBITMQ_FILA_COMANDO_PAUSA` não estiverem definidas, um erro será lançado indicando qual variável está faltando
- **Captura de Exceções**: Qualquer erro durante a declaração das filas é capturado e registrado através do `LoggerService`, permitindo diagnóstico de problemas


## Exemplo de Fluxo

1. A aplicação inicia
2. O NestJS executa o hook `onApplicationBootstrap`
3. O serviço valida as variáveis de ambiente obrigatórias
4. O serviço declara o exchange `amq.direct`
5. O serviço cria todas as filas necessárias
6. O serviço vincula as filas ao exchange
7. A aplicação continua a inicialização normalmente


## Verificação

Para verificar se as filas foram criadas corretamente, você pode acessar o painel de gerenciamento do RabbitMQ e verificar a presença das filas listadas acima.


## Dependências Externas

- `@golevelup/nestjs-rabbitmq` — Módulo RabbitMQ para NestJS
- `amqplib` — Biblioteca cliente RabbitMQ para Node.js
- `rastreador-nucleo` — Pacote interno contendo a classe base `DeclararFilasRabbitMq`
