"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RespostaComandoEntity = void 0;
class RespostaComandoEntity {
    constructor(objeto) {
        this._id = objeto._id;
        this.pattern = objeto.pattern;
        this.imei = objeto.imei;
        this.dataHora = objeto.dataHora;
        this.status = objeto.status;
        this.identificador = objeto.identificador;
    }
    validar() {
        try {
            this._checarString(this._id);
            this._checarString(this.pattern);
            this._checarString(this.dataHora);
            this._checarString(this.imei);
            this._checarString(this.status);
            this._checarString(this.identificador);
            return true;
        }
        catch (_erro) {
            return false;
        }
    }
    json() {
        return JSON.stringify({
            pattern: this.pattern,
            data: {
                _id: this._id,
                imei: this.imei,
                dataHora: this.dataHora,
                status: this.status,
                identificador: this.identificador,
            },
        });
    }
    _checarString(valor) {
        if (typeof valor !== 'string') {
            throw new Error('Valor deve ser uma string.');
        }
    }
    _checarInteiro(valor) {
        if (valor.toString().match(/^\d+$/) === null) {
            throw new Error('Valor deve ser um numero interio.');
        }
    }
}
exports.RespostaComandoEntity = RespostaComandoEntity;
//# sourceMappingURL=resposta-comando.entity.js.map