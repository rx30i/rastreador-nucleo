"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MensagemConexaoFechadaEntity = void 0;
const common_1 = require("@nestjs/common");
const pattern_1 = require("../enums/pattern");
class MensagemConexaoFechadaEntity {
    constructor(dataHora, imei, integracao) {
        this.dataHora = this.obterDataHora(dataHora);
        this.imei = this.obterString(imei);
        this.pattern = pattern_1.Pattern.CONEXAO_FECHADA;
        this.integracao = this.obterString(integracao);
        this.online = false;
    }
    obterObjeto() {
        return { ...this };
    }
    validar() {
        if (!this.dataHora) {
            throw new common_1.HttpException(`O atributo dataHora não é valido. Valor atual é: '${this.dataHora}'`, common_1.HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (!this.imei) {
            throw new common_1.HttpException(`O atributo imei não é valido. Valor atual é: '${this.imei}'`, common_1.HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }
    obterDataHora(dataHora) {
        if (typeof dataHora === 'string'
            && /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3})Z$/g.test(dataHora) === true) {
            return dataHora;
        }
        return '';
    }
    obterString(valor) {
        if (typeof valor === 'string') {
            return valor;
        }
        if (typeof valor === 'number') {
            return valor.toString();
        }
        return '';
    }
}
exports.MensagemConexaoFechadaEntity = MensagemConexaoFechadaEntity;
//# sourceMappingURL=mensagem-conexao-fechada.entity.js.map