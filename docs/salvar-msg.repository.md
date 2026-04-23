# SalvarMsgRepository

Repositório responsável por persistir mensagens no RabbitMQ.


## Visão Geral

A classe `SalvarMsgRepository` fornece métodos para publicar mensagens em filas do RabbitMQ, utilizando a conexão AMQP configurada na aplicação.


## Injeção de Dependência

O repositório é injetável e depende de:

- `AmqpConnection`: Conexão com o RabbitMQ fornecida pelo módulo `@golevelup/nestjs-rabbitmq`


## Métodos

### salvar

Publica uma mensagem padronizada na fila de mensagens rastreadas.

```typescript
public async salvar(mensagem: IPadraoMsgNestjs): Promise<boolean>
```

**Parâmetros:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| mensagem | `IPadraoMsgNestjs` | Mensagem padronizada no formato esperado pelo sistema |

**Retorno:**

- `Promise<boolean>`: Indica se a mensagem foi publicada com sucesso

**Detalhes:**

- Exchange: `amq.direct`
- Routing Key: `rastreador.mensagem`
- Formato: A mensagem é convertida para JSON e armazenada em um Buffer

---


### salvarDesconhecida

Publica mensagens que não foram reconhecidas ou validadas pela integração em uma fila de erros para análise posterior.

```typescript
public async salvarDesconhecida(mensagem: string): Promise<boolean>
```

**Parâmetros:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| mensagem | `string` | Mensagem bruta recebida que não passou na validação |

**Retorno:**

- `Promise<boolean>`: Indica se a mensagem foi publicada com sucesso

**Detalhes:**

- Exchange: `amq.direct`
- Routing Key: `rastreador.erro`
- Formato: A mensagem é armazenada como Buffer raw (sem conversão JSON)


## Casos de Uso

1. **Mensagens válidas**: Quando uma mensagem é recebida, validada e processada corretamente, utilize o método `salvar` para persistir na fila de mensagens.

2. **Mensagens inválidas**: Quando uma mensagem é recebida mas não passa na validação ou não há suporte para o tipo de mensagem, utilize o método `salvarDesconhecida` para enviar à fila de erros.


## Exemplo de Uso

```typescript
import { Injectable as injectable } from '@nestjs/common';
import { SalvarMsgRepository } from './repositories/salvar-msg.repository';
import { IPadraoMsgNestjs } from './contracts';

@injectable()
export class MeuServico {
  constructor(
    private readonly salvarMsgRepository: SalvarMsgRepository,
  ) {}

  async processarMensagem(mensagem: IPadraoMsgNestjs): Promise<void> {
    const sucesso = await this.salvarMsgRepository.salvar(mensagem);
    
    if (!sucesso) {
      throw new Error('Falha ao publicar mensagem');
    }
  }

  async processarMensagemInvalida(mensagemBruta: string): Promise<void> {
    await this.salvarMsgRepository.salvarDesconhecida(mensagemBruta);
  }
}
```


## Contratos Relacionados

- `IPadraoMsgNestjs`: Interface que define o formato padrão das mensagens do sistema
