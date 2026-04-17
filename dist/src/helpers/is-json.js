"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJson = isJson;
function isJson(valor) {
    try {
        JSON.parse(valor);
    }
    catch (_erro) {
        return false;
    }
    return true;
}
//# sourceMappingURL=is-json.js.map