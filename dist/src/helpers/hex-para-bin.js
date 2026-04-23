"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexParaBin = hexParaBin;
const hex_para_dec_1 = require("./hex-para-dec");
function hexParaBin(mensagem) {
    if (!mensagem || typeof mensagem !== 'string') {
        return undefined;
    }
    let resposta = '';
    for (const caractere of mensagem) {
        const valorDecimal = (0, hex_para_dec_1.hexParaDec)(caractere);
        if (valorDecimal !== undefined) {
            resposta += valorDecimal.toString(2).padStart(4, '0');
        }
    }
    return resposta;
}
//# sourceMappingURL=hex-para-bin.js.map