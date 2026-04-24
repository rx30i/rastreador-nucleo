---
name: rastreador-nucleo
description: "Guia para consumidores do pacote rastreador-nucleo. Use esta skill sempre que o usuario quiser entender o que o pacote disponibiliza, como configurar ou integrar ServidorTcp, declarar as filas RabbitMQ, envio de comandos, eventos, contratos, entidades, helpers, mesmo que ele nao mencione o nome do pacote explicitamente."
---

# Guia do pacote rastreador nucleo

Use esta skill para orientar aplicacoes cliente que vao consumir o pacote `rastreador-nucleo`.

## Objetivo

Ao ser acionada, esta skill deve ajudar a LLM a:

- explicar o que o pacote disponibiliza
- indicar quais imports, contratos, entidades, enums e services o cliente pode usar
- mostrar como configurar a integracao em uma aplicacao NestJS
- apontar a documentacao certa em `docs/` para cada caso de uso
- montar exemplos pequenos, corretos e adaptados ao contexto do cliente

## Postura desta skill

Trate o pacote pelo ponto de vista de quem consome, nao de quem o desenvolve.

Isso significa:

- nao instrua o usuario a editar arquivos internos de `src/` do pacote
- priorize exemplos de uso, configuracao e composicao em aplicacoes cliente
- explique sempre quais dependencias externas o cliente precisa ter no projeto dele
- use a documentacao de `docs/` como fonte principal sobre o comportamento esperado
- quando citar a API publica, prefira o que e exportado por `src/index.ts`

## Fluxo recomendado

1. Identifique o caso de uso do consumidor.
2. Abra apenas a documentacao de `docs/` relevante para o caso.
3. Consulte a superficie publica resumida em `references/mapa-do-projeto.md`.
4. Responda com foco em integracao, nao em manutencao interna.
5. Sempre que possivel, entregue:
   - o que o pacote oferece nesse fluxo
   - dependencias necessarias
   - variaveis de ambiente necessarias
   - exemplo minimo de uso
   - eventos, filas ou contratos envolvidos

## Como classificar a tarefa

### Transporte TCP e mensagens do rastreador

Use quando a tarefa mencionar:

- `ServidorTcp`
- conexoes TCP
- `Pattern`
- `TcpContext`
- receber mensagens rastreador
- login, mensagem desconhecida, conexao fechada ou quantidade de dispositivos conectados
- subir um microservico NestJS para falar com rastreadores

Abra primeiro:

- `docs/servidor-tcp.md`

Explique principalmente:

- como instanciar `ServidorTcp`
- quais campos `IServidorTCPConfig` exige
- como usar `Pattern` e `TcpContext` em controllers
- como obter a conexao ativa de um rastreador pelo IMEI

### RabbitMQ, filas

Use quando a tarefa mencionar:

- declaracao de filas
- exchange
- binding
- fila de comando
- fila de pausa
- preparacao da infraestrutura RabbitMQ para o pacote

Abra primeiro:

- `docs/declarar-filas-rabbitmq.md`

Explique principalmente:

- quais filas e exchange o pacote usa
- quais variaveis de ambiente o cliente deve definir
- como usar `DeclararFilasRabbitMqService`
- quais TTLs e roteamentos padrao existem

### Envio de comandos para o rastreador

Use quando a tarefa mencionar:

- enviar comando para o rastreador
- receber comando enviado pelo usuário para o rastreador
- receber do rastreador a confirmação de execução do comando enviado
- status `enviado`, `confirmado` ou `erro`
- comando via RabbitMQ para rastreador conectado

Abra primeiro:

- `docs/enviar-comandos.md`

Explique principalmente:

- formato da mensagem de comando
- como usar `EnviarComandoRastreadorService`
- como funciona o retry
- quais respostas o cliente recebe de volta
- quais entities e enums ajudam nesse fluxo

### Persistencia de mensagens no RabbitMQ

Use quando a tarefa mencionar:

- `SalvarMsgRepository`
- publicacao em `rastreador.mensagem`
- publicacao em `rastreador.erro`
- formato `IPadraoMsgNestjs`

Abra primeiro:

- `docs/salvar-msg.repository.md`

Explique principalmente:

- quando usar `SalvarMsgRepository`
- diferenca entre `salvar` e `salvarDesconhecida`
- formato esperado de `IPadraoMsgNestjs`

### Helpers e utilitarios

Use quando a tarefa mencionar:

- `geoJsonPoint`
- `hexParaDec`
- `hexParaBin`
- `isJson`
- `encerrarApp`

Abra primeiro:

- `docs/utilitarios.md`

Explique principalmente:

- assinatura da funcao
- retorno esperado
- contexto de uso dentro de uma aplicacao cliente

## O que o pacote disponibiliza

O pacote exporta publicamente:

- `services`: `DeclararFilasRabbitMqService`, `EnviarComandoRastreadorService`, `LoggerService`
- `transport`: `ServidorTcp`, `TcpContext` e itens relacionados ao transporte
- `repositories`: `SalvarMsgRepository`
- `contracts`: interfaces como `IServidorTCPConfig`, `IConsumerDeserializer`, `IPadraoMsgNestjs`, `IRespostaComando`
- `entities`: `ComandoUsuarioEntity`, `RespostaComandoEntity`, `MensagemConexaoFechadaEntity`
- `enums`: `Pattern`, `ComandoStatus`, `CodificacaoMsg`, `RabbitMQ` constants e outros enums do dominio
- `helpers`: `geoJsonPoint`, `hexParaDec`, `hexParaBin`, `isJson`, `encerrarApp`

## Resposta esperada da LLM

Ao responder para um consumidor do pacote:

- explique primeiro qual parte do pacote resolve o problema
- depois mostre a configuracao minima necessaria
- entregue exemplos em NestJS quando o contexto for servidor ou microservico
- cite variaveis de ambiente, filas, eventos e contratos envolvidos
- deixe claro quando algo depende de implementacao do proprio cliente, como o deserializer

## Exemplo de uso

**Exemplo 1**
Pedido: "Como eu subo um servidor TCP com esse pacote para receber mensagens de rastreador?"

Caminho esperado:

1. Abrir `docs/servidor-tcp.md`
2. Consultar `references/mapa-do-projeto.md`
3. Explicar `ServidorTcp`, `IServidorTCPConfig`, `Pattern` e `TcpContext`
4. Montar um exemplo minimo de bootstrap NestJS

**Exemplo 2**
Pedido: "Como minha API pode enviar comandos para um rastreador conectado?"

Caminho esperado:

1. Abrir `docs/enviar-comandos.md`
2. Consultar `references/mapa-do-projeto.md`
3. Explicar `EnviarComandoRastreadorService`, filas e retry
4. Mostrar o JSON esperado do comando e um exemplo de consumo
