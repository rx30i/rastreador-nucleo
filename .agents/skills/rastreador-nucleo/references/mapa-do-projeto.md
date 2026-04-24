# Mapa Publico do Pacote Rastreador Nucleo

Este arquivo resume o que uma aplicacao cliente pode usar do pacote `rastreador-nucleo` e em qual documento olhar primeiro.

## Superficie publica

O pacote exporta:

- `services`
- `transport`
- `repositories`
- `contracts`
- `entities`
- `enums`
- `helpers`

Na pratica, isso permite ao consumidor:

- subir um servidor TCP customizado com NestJS
- tratar eventos de mensagens de rastreador
- declarar filas e exchange no RabbitMQ
- consumir comandos e encaminha-los ao rastreador conectado
- publicar mensagens padrao ou mensagens de erro
- reutilizar contratos, enums, entities e helpers do dominio

## Documentacao por assunto

### `docs/servidor-tcp.md`

Consulte quando a aplicacao cliente precisar receber rastreadores por TCP.

Elementos publicos mais importantes:

- `ServidorTcp`
- `TcpContext`
- `Pattern`
- `IServidorTCPConfig`
- `IConsumerDeserializer`
- `CodificacaoMsg`

O cliente precisa providenciar:

- um `deserializer` compativel com o protocolo do rastreador
- `host` e `porta` do servidor TCP
- um logger para tratamento de erro
- controllers NestJS para os `Pattern` desejados

### `docs/declarar-filas-rabbitmq.md`

Consulte quando a aplicacao cliente precisar preparar a infraestrutura RabbitMQ usada pelo pacote.

Elementos publicos mais importantes:

- `DeclararFilasRabbitMqService`
- `RABBITMQ_EXCHANGE_DIRETO`
- `RABBITMQ_FILA_RASTREADOR_ERRO`
- `RABBITMQ_FILA_RASTREADOR_MENSAGEM`
- `RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA`
- `RABBITMQ_TTL_MENSAGEM_PAUSA`
- `RABBITMQ_TTL_COMANDO_PAUSA`

Variaveis de ambiente citadas:

- `RABBITMQ_FILA_COMANDO`
- `RABBITMQ_FILA_COMANDO_PAUSA`

### `docs/enviar-comandos.md`

Consulte quando a aplicacao cliente precisar pegar um comando vindo de fila e envia-lo ao rastreador conectado.

Elementos publicos mais importantes:

- `EnviarComandoRastreadorService`
- `ComandoUsuarioEntity`
- `RespostaComandoEntity`
- `ComandoStatus`
- `IdentificadoresComandos`
- `ServidorTcp`

Pontos de atencao:

- o retry documentado passa por fila de pausa e volta para a fila principal
- o fluxo usa o IMEI para localizar a conexao TCP ativa
- erros e mensagens de status sao publicados no RabbitMQ

### `docs/salvar-msg.repository.md`

Consulte quando a aplicacao cliente precisar publicar mensagens processadas ou mensagens desconhecidas no RabbitMQ.

Elementos publicos mais importantes:

- `SalvarMsgRepository`
- `IPadraoMsgNestjs`

Filas documentadas:

- `rastreador.mensagem`
- `rastreador.erro`

### `docs/utilitarios.md`

Consulte quando a aplicacao cliente precisar reaproveitar funcoes auxiliares ja disponiveis no pacote.

Elementos publicos mais importantes:

- `geoJsonPoint`
- `hexParaDec`
- `hexParaBin`
- `isJson`
- `encerrarApp`
- `IGeoJsonPoint`

## Fluxos de uso para consumidores

### Fluxo de entrada por TCP

1. A aplicacao cliente sobe um microservico NestJS com `ServidorTcp`.
2. O rastreador conecta.
3. O deserializer transforma a mensagem no formato esperado pelo NestJS.
4. O pacote encaminha o evento para o controller certo usando `Pattern`.
5. O controller do cliente decide se responde, salva ou publica algo.

### Fluxo de comando do usuario para o rastreador

1. Um comando do usuario entra na fila configurada em `RABBITMQ_FILA_COMANDO`.
2. `EnviarComandoRastreadorService` consome e decodifica a mensagem.
3. O servico procura a conexao TCP pelo IMEI.
4. Se houver conexao, envia o comando e publica status.
5. Se nao houver conexao, reencaminha para fila de pausa ate o limite de tentativas.
6. Se esgotar tentativas ou houver erro estrutural, publica em `rastreador.erro`.

### Fluxo de declaracao de filas

1. A aplicacao sobe.
2. `DeclararFilasRabbitMqService` roda no bootstrap.
3. O servico valida variaveis de ambiente obrigatorias.
4. O exchange `amq.direct` e declarado.
5. Filas principais, de erro e de pausa sao declaradas e vinculadas.

## Checklist de resposta para a LLM

Antes de responder:

- confirme qual fluxo o usuario quer integrar
- abra o documento de `docs/` correto
- identifique quais exports publicos resolvem o caso
- se faltar contexto, explique a parte que cabe ao cliente implementar

Na resposta:

- diga o que o pacote oferece
- mostre os imports mais provaveis
- descreva variaveis de ambiente e dependencias
- entregue um exemplo objetivo
- cite filas, eventos e contratos relevantes
