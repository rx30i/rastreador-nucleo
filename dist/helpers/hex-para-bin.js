"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexParaBin = hexParaBin;
const hex_para_dec_1 = require("./hex-para-dec");
function hexParaBin(mensagem) {
    if (!mensagem || typeof mensagem !== 'string') {
        return undefined;
    }
    let resposta = '';
    const arrayDados = mensagem.split('');
    for (let cont = 0; cont < arrayDados.length; cont++) {
        if (arrayDados[cont] !== undefined) {
            const valorDecimal = (0, hex_para_dec_1.hexParaDec)(arrayDados[cont]);
            if (valorDecimal !== undefined) {
                resposta += valorDecimal.toString(2).padStart(4, '0');
            }
        }
    }
    return resposta;
}
//# sourceMappingURL=hex-para-bin.js.map