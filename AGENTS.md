# AGENTS.md

Guia para agentes de IA ao trabalhar neste repositório NestJs 11.

---

## Regras absolutas (NUNCA VIOLAR)

* Não use workarounds — resolva a causa raiz
* Sempre verifique as skills antes de implementar
* Código 100% em Português (Brasil)
* Sempre use tipagem explícita (parâmetros e retornos)
* Nunca implemente algo sem verificar se já existe solução nativa
* Nomes devem ser descritivos. Evite abreviações. O nome deve dizer exatamente o que o elemento faz ou representa
* Mantenha métodos curtos. Se uma lógica de decisão for complexa, extraia para um método privado dentro da mesma classe
- Execute os checks antes de concluir: `npm run lint`, `tsc --noEmit`, `npm run build`

---

## Comandos do projeto

```bash

npm install           # Instale as dependências do projeto
npm run start:dev     # Execute no modo desenvolvimento
npm run start:debug   # Execute no modo debug
npm run build         # Gera o build, deve ser executado antes de rodar o `npm run start:prod`
npm run start:prod    # Execute no modo produção
npm run lint          # ESLint, busca por erros
tsc --noEmit          # Verificação de tipos TypeScript
npm run test          # Executa os testes unitários
npm run test:watch    # Executa os testes unitários no modo "observador"
npm run test:cov      # Gera um relatório de Cobertura de Código (Code Coverage)
npm run test:debug    # Executa os testes permitindo a inspeção do código
npm run test:e2e      # Executa os testes de ponta a ponta (End-to-End).

```

---

## Contexto do Projeto

Você está trabalhando em uma aplicação NestJs 11 com o seguinte stack:

- node v24
- typescript v6
- @nestjs/core v11
- @nestjs/common v11
- @nestjs/config v4
- @golevelup/nestjs-rabbitmq v9
- @sentry/node v10
- amqplib v1
- rxjs v7
- jest v30

Siga rigorosamente as práticas compatíveis com essas versões.

---

## Skills (Uso obrigatório por contexto)

- `nestjs-expert` — Use essa skill sempre que escrever, revisar ou refatorar código para o framework NestJs
- `clean-code` — Use essa skill sempre que escrever, revisar ou refatorar um código

---

## Git

- **Não execute** `git restore`, `git reset`, `git clean` ou comandos destrutivos **sem permissão explícita do usuário**

---

## Anti-padrões

1. Pular ativação de skill
2. Esquecer verificação antes de marcar tarefa concluída
3. Executar comandos git destrutivos sem permissão do usuário
4. Evite fazer workarounds
