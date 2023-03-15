"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RespostaComandoEntity = void 0;
class RespostaComandoEntity {
    constructor(id, pattern, dataHora, status) {
        this.id = id;
        this.pattern = pattern;
        this.dataHora = dataHora;
        this.status = status;
    }
    validar() {
        try {
            this._checarInteiro(this.id);
            this._checarString(this.pattern);
            this._checarString(this.dataHora);
            this._checarString(this.status);
            return true;
        }
        catch (erro) {
            return false;
        }
    }
    json() {
        return JSON.stringify({
            pattern: this.pattern,
            data: {
                id: this.id,
                identificador: null,
                imei: null,
                dataHora: this.dataHora,
                status: this.status,
            },
        });
    }
    _checarString(valor) {
        if (typeof valor !== 'string') {
            throw 'Valor deve ser uma string.';
        }
    }
    _checarInteiro(valor) {
        if (valor.toString().match(/^\d+$/) === null) {
            throw 'Valor deve ser um numero interio.';
        }
    }
}
exports.RespostaComandoEntity = RespostaComandoEntity;
//# sourceMappingURL=resposta-comando.entity.js.map