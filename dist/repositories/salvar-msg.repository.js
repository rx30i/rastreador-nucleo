"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalvarMsgRepository = void 0;
const nestjs_rabbitmq_1 = require("@golevelup/nestjs-rabbitmq");
const common_1 = require("@nestjs/common");
let SalvarMsgRepository = class SalvarMsgRepository {
    amqpConnection;
    constructor(amqpConnection) {
        this.amqpConnection = amqpConnection;
    }
    async salvar(mensagem) {
        return await this.amqpConnection.publish('amq.direct', 'rastreador.mensagem', Buffer.from(JSON.stringify(mensagem)));
    }
    async salvarDesconhecida(mensagem) {
        return await this.amqpConnection.publish('amq.direct', 'rastreador.erro', Buffer.from(mensagem));
    }
};
exports.SalvarMsgRepository = SalvarMsgRepository;
exports.SalvarMsgRepository = SalvarMsgRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [nestjs_rabbitmq_1.AmqpConnection])
], SalvarMsgRepository);
//# sourceMappingURL=salvar-msg.repository.js.map