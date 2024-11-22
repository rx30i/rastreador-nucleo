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
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Sentry = require("@sentry/node");
let LoggerService = class LoggerService extends common_1.ConsoleLogger {
    constructor(configService) {
        super('LoggerService');
        this.configService = configService;
    }
    error(message, stack, context) {
        if (this.configService.get('APP_ENV') !== 'producao') {
            super.error(message.name, message.message, message?.stack);
            return;
        }
        if (typeof message === 'object') {
            message = JSON.stringify(message);
        }
        const erro = `{
      "message": ${message}
      "stack"  : ${stack}
      "context": ${context}
    }`;
        Sentry.captureMessage(erro, 'error');
    }
    local(prefixo, mensagem) {
        if (this.configService.get('APP_ENV') !== 'producao') {
            if (typeof mensagem === 'object') {
                mensagem = JSON.stringify(mensagem);
            }
            this.log(`${prefixo} ${mensagem}`);
        }
    }
    capiturarException(erro, context) {
        if (this.configService.get('APP_ENV') !== 'producao') {
            super.error(erro.name, erro.message, erro?.stack);
            return;
        }
        Sentry.captureException(erro, context);
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LoggerService);
//# sourceMappingURL=logger.service.js.map