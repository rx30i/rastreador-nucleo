"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComandoUsuarioEntity = void 0;
class ComandoUsuarioEntity {
    constructor(dados) {
        this._id = dados._id;
        this.modeloRastreador = dados.modeloRastreador;
        this.integracao = dados.integracao;
        this.identificador = dados.identificador;
        this.comando = dados.comando;
        this.imei = dados.imei;
    }
    valido() {
        try {
            this._checarString(this._id);
            this._checarString(this.modeloRastreador);
            this._checarString(this.integracao);
            this._checarString(this.identificador);
            this._checarString(this.comando);
            this._checarString(this.imei);
            return true;
        }
        catch (_erro) {
            return false;
        }
    }
    _checarString(valor) {
        if (typeof valor !== 'string') {
            throw new Error('Valor deve ser uma string.');
        }
    }
}
exports.ComandoUsuarioEntity = ComandoUsuarioEntity;
//# sourceMappingURL=comando-usuario.entity.js.map