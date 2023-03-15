"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encerrarApp = void 0;
const Sentry = require("@sentry/node");
function encerrarApp(app, codigo, erro) {
    if (erro instanceof Error) {
        Sentry.captureException(erro);
    }
    app.close();
    setTimeout(() => {
        process.exit(codigo);
    }, 1000);
}
exports.encerrarApp = encerrarApp;
//# sourceMappingURL=encerrar-app.js.map