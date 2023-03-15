"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJson = void 0;
function isJson(valor) {
    try {
        JSON.parse(valor);
    }
    catch (erro) {
        return false;
    }
    return true;
}
exports.isJson = isJson;
//# sourceMappingURL=is-json.js.map