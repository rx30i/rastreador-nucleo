"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encerrarApp = encerrarApp;
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
//# sourceMappingURL=encerrar-app.js.map