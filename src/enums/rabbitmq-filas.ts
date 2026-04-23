/**
 * Constantes para nomes de filas e exchanges do RabbitMQ
 */
export const RABBITMQ_EXCHANGE_DIRETO = 'amq.direct';

export const RABBITMQ_FILA_RASTREADOR_ERRO = 'rastreador.erro';
export const RABBITMQ_FILA_RASTREADOR_MENSAGEM = 'rastreador.mensagem';
export const RABBITMQ_FILA_RASTREADOR_MENSAGEM_PAUSA = 'rastreador.mensagem.pausa';

/**
 * TTL em milissegundos para a fila de mensagens pausadas
 */
export const RABBITMQ_TTL_MENSAGEM_PAUSA = 60000;

/**
 * TTL em milissegundos para a fila de comandos pausados
 */
export const RABBITMQ_TTL_COMANDO_PAUSA = 5000;
