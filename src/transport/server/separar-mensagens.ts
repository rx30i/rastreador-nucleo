import { IServidorTCPConfig } from '../../contracts';

/**
 * O comportamento anterior era: Se a mensagem não começa com o prefixo ou sufixo informado a mesma
 * é descartada e é retornado um array vazio, porém tive um problema com esse comportamento.
 *
 * Nem sempre as mensagens do GT06 começam com 7878, tem mensagens que o prefixo é 7979, ocorreu de
 * está usando o prefixo 7878 para separar as mensagens quando concatenadas e essa mensagem de
 * prefixo 7979 era descartada eu não recebia em nenhum controller. O prefixo e sufixo são usados para
 * separar as mensagens quando recebo várias mensagens concatenadas em uma string mais se não for
 * identificado o prefixo ou sufixo na mensagem a mesma não é descartada, ela deve ser propagada  para
 * a aplicação e na aplicação é verificada se é uma mensagem válida ou não.
 */
export class SepararMensagens {
  constructor(
    private readonly servidorTCPConfig: IServidorTCPConfig,
  ) {}

  public obterMensagens(mensagem: string): string[] {
    const arrayMensagens: string[] = [];
    if (!mensagem || typeof mensagem !== 'string' || mensagem.length === 0) {
      return arrayMensagens;
    }

    if (this.prefixoInformado() && this.sufixoInformado()) {
      return this.separarMsgPeloPrefixoSufixo(mensagem);
    } if (this.prefixoInformado()) {
      return this.separarMsgPeloPrefixo(mensagem);
    } if (this.sufixoInformado()) {
      return this.separarMsgPeloSufixo(mensagem);
    }

    return arrayMensagens;
  }

  /**
   * @return {boolean}
  */
  private prefixoInformado(): boolean {
    return typeof this.servidorTCPConfig.prefixo === 'string' &&
    this.servidorTCPConfig.prefixo.length > 0;
  }

  /**
   * @return {boolean}
  */
  private sufixoInformado(): boolean {
    return typeof this.servidorTCPConfig.sufixo === 'string' &&
    this.servidorTCPConfig.sufixo.length > 0;
  }

  /**
   * @param  {string} mensagem
   * @return {string[]}
  */
  private separarMsgPeloPrefixo(mensagem: string): string[] {
    const mensagens      = [] as string[];
    const msgNormalizada = mensagem.toLowerCase();
    const prefixo        = this.servidorTCPConfig.prefixo?.toLowerCase();
    if (typeof prefixo !== 'string' || prefixo.length === 0 ||
    !msgNormalizada.startsWith(prefixo)) {
      mensagens.push(msgNormalizada);
      return mensagens;
    }

    const msgAtualizada = msgNormalizada.replace(new RegExp(prefixo, 'g'), `@@@${prefixo}`);
    const conjutoMsg    = msgAtualizada.split('@@@');

    for (const resposta of conjutoMsg) {
      if (typeof resposta === 'string' && resposta !== '') {
        mensagens.push(resposta.replace(/(\r\n|\n|\r)/gm, ''));
      }
    }

    return mensagens;
  }

  /**
   * @param  {string} mensagem
   * @return {string[]}
  */
  private separarMsgPeloSufixo(mensagem: string): string[] {
    const mensagens      = [] as string[];
    const msgNormalizada = mensagem.toLowerCase();
    const sufixo         = this.servidorTCPConfig.sufixo?.toLowerCase();
    if (typeof sufixo !== 'string' || sufixo.length === 0) {
      mensagens.push(msgNormalizada);
      return mensagens;
    }

    if ((msgNormalizada.match(new RegExp(sufixo, 'g')) ?? []).length == 0) {
      return mensagens;
    }

    const msgAtualizada = msgNormalizada.replace(new RegExp(sufixo, 'g'), `${sufixo}@@@`);
    const conjutoMsg    = msgAtualizada.split('@@@');

    for (const resposta of conjutoMsg) {
      if (typeof resposta === 'string' && resposta.endsWith(sufixo)) {
        mensagens.push(resposta.replace(/(\r\n|\n|\r)/gm, ''));
      }
    }

    return mensagens;
  }

  /**
   * @param  {string} mensagem
   * @return {string[]}
  */
  private separarMsgPeloPrefixoSufixo(mensagem: string): string[] {
    let posicaoAtual  = 0;
    const mensagens: string[] = [];
    const prefixo = this.servidorTCPConfig.prefixo?.toLowerCase() ?? '';
    const sufixo  = this.servidorTCPConfig.sufixo?.toLowerCase() ?? '';

    let msgNormalizada = mensagem.toLowerCase();
    while (posicaoAtual < msgNormalizada.length) {
      if (!msgNormalizada.startsWith(prefixo)) {
        break;
      }

      const posicaoSufixo = msgNormalizada.indexOf(sufixo);
      if (posicaoSufixo === -1) {
        break;
      }

      // Encontrou uma mensagem COMPLETA!
      // A mensagem completa vai do index 0 até 'fimMensagem'.
      const fimMensagem = posicaoSufixo + sufixo.length;
      const msgCompleta = msgNormalizada.substring(0, fimMensagem);


      posicaoAtual   = posicaoAtual + 1;
      msgNormalizada = msgNormalizada.substring(fimMensagem);
      mensagens.push(msgCompleta);
    }

    if (mensagens.length === 0) {
      mensagens.push(msgNormalizada);
    }

    return mensagens;
  }
}
