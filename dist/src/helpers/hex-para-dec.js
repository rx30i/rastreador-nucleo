"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexParaDec = hexParaDec;
function hexParaDec(mensagem) {
    if (!mensagem || typeof mensagem !== 'string') {
        return undefined;
    }
    const resultado = parseInt(mensagem, 16);
    if (isNaN(resultado)) {
        return undefined;
    }
    return resultado;
}
//# sourceMappingURL=hex-para-dec.js.map