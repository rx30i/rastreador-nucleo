import { IServidorTCPConfig } from '../../contracts';

export interface MensagemSeparada {
  mensagem: string;
  mensagemBruta: string;
}

/**
 * O comportamento anterior era: Se a mensagem nao comeca com o prefixo ou sufixo informado a mesma
 * e descartada e e retornado um array vazio, porem tive um problema com esse comportamento.
 *
 * Nem sempre as mensagens do GT06 comecam com 7878, tem mensagens que o prefixo e 7979, ocorreu de
 * esta usando o prefixo 7878 para separar as mensagens quando concatenadas e essa mensagem de
 * prefixo 7979 era descartada eu nao recebia em nenhum controller. O prefixo e sufixo sao usados para
 * separar as mensagens quando recebo varias mensagens concatenadas em uma string mas se nao for
 * identificado o prefixo ou sufixo na mensagem a mesma nao e descartada, ela deve ser propagada para
 * a aplicacao e na aplicacao e verificada se e uma mensagem valida ou nao.
 */
export class SepararMensagens {
  constructor(
    private readonly servidorTCPConfig: IServidorTCPConfig,
  ) {}

  public obterMensagens(mensagem: string): string[] {
    return this.obterMensagensComBruto(mensagem)
      .map((mensagemSeparada: MensagemSeparada): string => mensagemSeparada.mensagem);
  }

  public obterMensagensComBruto(mensagem: string): MensagemSeparada[] {
    const mensagens: MensagemSeparada[] = [];
    if (!mensagem || typeof mensagem !== 'string' || mensagem.length === 0) {
      return mensagens;
    }

    const prefixos = this.obterPrefixosNormalizados();
    const sufixo   = this.obterSufixoNormalizado();

    if (prefixos.length > 0 && sufixo.length > 0) {
      return this.separarMsgPeloPrefixoSufixo(mensagem, prefixos, sufixo);
    }

    if (prefixos.length > 0) {
      return this.separarMsgPeloPrefixo(mensagem, prefixos);
    }

    if (sufixo.length > 0) {
      return this.separarMsgPeloSufixo(mensagem, sufixo);
    }

    return mensagens;
  }

  /**
   * @return {string[]}
  */
  private obterPrefixosNormalizados(): string[] {
    const prefixoConfigurado = this.servidorTCPConfig.prefixo;
    const prefixos: (string | undefined)[] = Array.isArray(prefixoConfigurado)
      ? prefixoConfigurado
      : [prefixoConfigurado];
    const prefixosNormalizados = prefixos
      .filter((prefixo: string | undefined): prefixo is string => typeof prefixo === 'string')
      .map((prefixo: string): string => prefixo.toLowerCase())
      .filter((prefixo: string): boolean => prefixo.length > 0);

    return Array.from(new Set(prefixosNormalizados));
  }

  /**
   * @return {string}
  */
  private obterSufixoNormalizado(): string {
    const sufixo = this.servidorTCPConfig.sufixo;
    if (typeof sufixo !== 'string' || sufixo.length === 0) {
      return '';
    }

    return sufixo.toLowerCase();
  }

  /**
   * @param  {string} mensagem
   * @param  {string[]} prefixos
   * @return {MensagemSeparada[]}
  */
  private separarMsgPeloPrefixo(mensagem: string, prefixos: string[]): MensagemSeparada[] {
    const mensagens: MensagemSeparada[] = [];
    const mensagemNormalizada = mensagem.toLowerCase();
    const prefixosOrdenados = this.ordenarPrefixosPorTamanho(prefixos);
    const posicoesDosPrefixos = this.obterPosicoesDosPrefixos(mensagemNormalizada, prefixosOrdenados);

    if (posicoesDosPrefixos[0] !== 0) {
      mensagens.push(this.criarMensagemSeparada(mensagemNormalizada, mensagem));
      return mensagens;
    }

    for (let indice = 0; indice < posicoesDosPrefixos.length; indice++) {
      const posicaoInicial = posicoesDosPrefixos[indice];
      const posicaoFinal = posicoesDosPrefixos[indice + 1] ?? mensagemNormalizada.length;
      const resposta = mensagemNormalizada.substring(posicaoInicial, posicaoFinal);
      const respostaBruta = mensagem.substring(posicaoInicial, posicaoFinal);

      if (resposta !== '') {
        mensagens.push(this.criarMensagemSeparada(this.removerQuebrasDeLinha(resposta), respostaBruta));
      }
    }

    return mensagens;
  }

  /**
   * @param  {string} mensagem
   * @param  {string} sufixo
   * @return {MensagemSeparada[]}
  */
  private separarMsgPeloSufixo(mensagem: string, sufixo: string): MensagemSeparada[] {
    const mensagens: MensagemSeparada[] = [];
    const mensagemNormalizada = mensagem.toLowerCase();

    if (!mensagemNormalizada.includes(sufixo)) {
      return mensagens;
    }

    let posicaoInicial = 0;
    let posicaoSufixo = mensagemNormalizada.indexOf(sufixo, posicaoInicial);
    while (posicaoSufixo !== -1) {
      const fimMensagem = posicaoSufixo + sufixo.length;
      const mensagemCompleta = mensagemNormalizada.substring(posicaoInicial, fimMensagem);
      const mensagemBruta = mensagem.substring(posicaoInicial, fimMensagem);

      mensagens.push(this.criarMensagemSeparada(this.removerQuebrasDeLinha(mensagemCompleta), mensagemBruta));

      posicaoInicial = fimMensagem;
      posicaoSufixo = mensagemNormalizada.indexOf(sufixo, posicaoInicial);
    }

    return mensagens;
  }

  /**
   * @param  {string} mensagem
   * @param  {string[]} prefixos
   * @param  {string} sufixo
   * @return {MensagemSeparada[]}
  */
  private separarMsgPeloPrefixoSufixo(mensagem: string, prefixos: string[], sufixo: string): MensagemSeparada[] {
    const mensagens: MensagemSeparada[] = [];
    const prefixosOrdenados = this.ordenarPrefixosPorTamanho(prefixos);
    const mensagemNormalizada = mensagem.toLowerCase();

    let posicaoInicial = 0;
    while (posicaoInicial < mensagemNormalizada.length) {
      if (this.obterPrefixoNaPosicao(mensagemNormalizada, prefixosOrdenados, posicaoInicial) === undefined) {
        break;
      }

      const posicaoSufixo = mensagemNormalizada.indexOf(sufixo, posicaoInicial);
      if (posicaoSufixo === -1) {
        break;
      }

      const fimMensagem = posicaoSufixo + sufixo.length;
      const mensagemCompleta = mensagemNormalizada.substring(posicaoInicial, fimMensagem);
      const mensagemBruta = mensagem.substring(posicaoInicial, fimMensagem);

      posicaoInicial = fimMensagem;
      mensagens.push(this.criarMensagemSeparada(mensagemCompleta, mensagemBruta));
    }

    if (mensagens.length === 0) {
      mensagens.push(this.criarMensagemSeparada(mensagemNormalizada, mensagem));
    }

    return mensagens;
  }

  /**
   * @param  {string[]} prefixos
   * @return {string[]}
  */
  private ordenarPrefixosPorTamanho(prefixos: string[]): string[] {
    return [...prefixos].sort((primeiroPrefixo: string, segundoPrefixo: string): number =>
      segundoPrefixo.length - primeiroPrefixo.length,
    );
  }

  /**
   * @param  {string} mensagem
   * @param  {string[]} prefixos
   * @return {number[]}
  */
  private obterPosicoesDosPrefixos(mensagem: string, prefixos: string[]): number[] {
    const posicoes: number[] = [];
    let posicaoAtual = 0;

    while (posicaoAtual < mensagem.length) {
      const prefixo = this.obterPrefixoNaPosicao(mensagem, prefixos, posicaoAtual);
      if (prefixo === undefined) {
        posicaoAtual = posicaoAtual + 1;
        continue;
      }

      posicoes.push(posicaoAtual);
      posicaoAtual = posicaoAtual + prefixo.length;
    }

    return posicoes;
  }

  /**
   * @param  {string} mensagem
   * @param  {string[]} prefixos
   * @param  {number} posicao
   * @return {string | undefined}
  */
  private obterPrefixoNaPosicao(mensagem: string, prefixos: string[], posicao: number): string | undefined {
    return prefixos.find((prefixo: string): boolean => mensagem.startsWith(prefixo, posicao));
  }

  /**
   * @param  {string} mensagem
   * @return {string}
  */
  private removerQuebrasDeLinha(mensagem: string): string {
    return mensagem.replace(/(\r\n|\n|\r)/gm, '');
  }

  /**
   * @param  {string} mensagem
   * @param  {string} mensagemBruta
   * @return {MensagemSeparada}
  */
  private criarMensagemSeparada(mensagem: string, mensagemBruta: string): MensagemSeparada {
    return {
      mensagem,
      mensagemBruta,
    };
  }
}
