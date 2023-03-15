"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TcpContext = void 0;
const base_rpc_context_1 = require("@nestjs/microservices/ctx-host/base-rpc.context");
class TcpContext extends base_rpc_context_1.BaseRpcContext {
    constructor(args) {
        super(args);
    }
    getSocketRef(imei) {
        if (imei) {
            return this.args[2](imei);
        }
        return this.args[0];
    }
    mensagem() {
        return this.args[1];
    }
}
exports.TcpContext = TcpContext;
//# sourceMappingURL=tcp.context.js.map