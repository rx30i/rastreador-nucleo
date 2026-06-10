# LoggerService

O `LoggerService` centraliza logs da aplicacao e logs pontuais de trafego por IMEI.

## Dependencias

Para usar a gravacao de mensagens do rastreador em arquivo, a aplicacao cliente deve instalar:

```bash
npm install winston winston-daily-rotate-file
```

O pacote `rastreador-nucleo` declara essas bibliotecas como `peerDependencies`, porque o destino dos logs e a politica de instalacao pertencem a aplicacao consumidora.

## Variaveis de ambiente

| Variavel | Descricao |
|----------|-----------|
| `APP_ENV=desenvolvimento` | Habilita a exibicao de logs chamados por `debug` e das mensagens brutas do rastreador. |
| `SALVAR_LOG_RASTREADOR_IMEI` | Quando preenchida, habilita a gravacao manual das mensagens do IMEI informado. |

## `debug(mensagem, prefixo?)`

Exibe logs no console apenas quando `APP_ENV` for igual a `desenvolvimento`.

```typescript
this.loggerService.debug('Comando recebido da fila', 'COMANDO');
```

O metodo `local2` continua existindo para compatibilidade, mas esta depreciado e deve ser substituido por `debug` em novas implementacoes.

## `salvarLogRastreador(imeiRastreador, mensagemBruta, sentidoMensagem)`

Grava mensagens de um rastreador especifico em arquivo apenas quando `SALVAR_LOG_RASTREADOR_IMEI` estiver preenchida e corresponder ao IMEI recebido como primeiro parametro.

Quando `APP_ENV` for igual a `desenvolvimento`, a mensagem bruta tambem e exibida no terminal no formato `RASTREADOR: mensagemBruta`. Essa exibicao usa o `ConsoleLogger`; o `Winston.Logger` continua restrito ao arquivo.

Esse metodo nao captura trafego automaticamente. O controller, service ou repository decide quando chamar o metodo.

```typescript
this.loggerService.salvarLogRastreador(
  '123456789012345',
  '78780d010812345678901234500010d0a',
  'recebida',
);

this.loggerService.salvarLogRastreador(
  '123456789012345',
  'ST300CMD;123456789012345;02;Enable1',
  'enviada',
);
```

Os arquivos sao gravados em `logs/log-{imei}-%DATE%.log`, com rotacao diaria no formato `YYYY-MM-DD`. Arquivos antigos nao sao apagados automaticamente.

Cada linha segue este formato:

```text
[dataHoraIso] [imei] [recebida|enviada] mensagem
```
