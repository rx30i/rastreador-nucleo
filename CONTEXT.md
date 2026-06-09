# Rastreador Nucleo

Este contexto descreve os conceitos centrais compartilhados pelas integracoes de rastreadores.

## Language

**Rastreador**:
Dispositivo conectado ao servidor TCP que envia mensagens de telemetria e recebe comandos.
_Avoid_: Dispositivo generico, cliente TCP

**IMEI do rastreador**:
Identificador unico usado para associar uma conexao TCP ao rastreador proprietario da mensagem.
_Avoid_: Serial generico, identificador do socket

**Mensagem do rastreador**:
Conteudo bruto recebido de um rastreador ou enviado a ele pela aplicacao.
_Avoid_: Log generico, mensagem RabbitMQ
