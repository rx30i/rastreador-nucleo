/* eslint-disable max-len */
export enum IdentificadoresComandos {
  CMD_CONFIGURAR_IP_PORTA = 'CMD_CONFIGURAR_IP_PORTA',                            // IP e porta do servidor
  CMD_CONFIGURAR_APN = 'CMD_CONFIGURAR_APN',                                      // Parâmetros de Rede
  CMD_CONFIGURAR_FUSO_HORARIO = 'CMD_CONFIGURAR_FUSO_HORARIO',                    // Configurar fuso horário
  CMD_ATIVAR_ODOMETRO = 'CMD_ATIVAR_ODOMETRO',                                    // Ativar envio do odômetro.
  CMD_VOLTAGEM_BT_EXTERNA = 'CMD_VOLTAGEM_BT_EXTERNA',                            // Ativar envio voltagem bateria externa.
  CMD_DESBLOQUEAR = 'CMD_DESBLOQUEAR',                                            // Desbloquear
  CMD_BLOQUEAR = 'CMD_BLOQUEAR',                                                  // Bloquear
  CMD_REINICIAR = 'CMD_REINICIAR',                                                // Reiniciar
  CMD_FORMATAR = 'CMD_FORMATAR',                                                  // Restaurar configurações de fábrica
  CMD_OBTER_HODOMETRO = 'CMD_OBTER_HODOMETRO',                                    // Obtém o valor do hodômetro do rastreador
  CMD_CONFIGURAR_HODOMETRO = 'CMD_CONFIGURAR_HODOMETRO',                          // Configurar o valor do hodômetro do rastreador
  CMD_ALERTA_IGNICAO_LIGADA = 'CMD_ALERTA_IGNICAO_LIGADA',                        // Ativar alerta ignição ligada
  CMD_ALERTA_IGNICAO_DESLIGADA = 'CMD_ALERTA_IGNICAO_DESLIGADA',                  // Ativar alerta ignição desligada
  CMD_ALERTA_VELOCIDADE = 'CMD_ALERTA_VELOCIDADE',                                // Ativar alerta de velocidade
  CMD_ALERTA_MOVIMENTO = 'CMD_ALERTA_MOVIMENTO',                                  // Ativar alerta de movimento
  CMD_ALERTA_BT_RASTREADOR_BAIXA = 'CMD_ALERTA_BT_RASTREADOR_BAIXA',              // Ativar alerta bateria rastreador baixa
  CMD_ALERTA_RASTREADOR_DESLIGADO = 'CMD_ALERTA_RASTREADOR_DESLIGADO',            // Ativar alerta que vai informar que o rastreador foi desligado.
  CMD_ATIVAR_MODO_ANTI_FURTO = 'CMD_ATIVAR_MODO_ANTI_FURTO',                      // Ativar modo antirroubo.
  CMD_SOLICITAR_STATUS = 'CMD_SOLICITAR_STATUS',                                  // Ativar modo antirroubo.
  CMD_CONFIGURAR_INTERVALO_ENVIO_DADOS = 'CMD_CONFIGURAR_INTERVALO_ENVIO_DADOS',  // Intervalo de envio dos dados
}
