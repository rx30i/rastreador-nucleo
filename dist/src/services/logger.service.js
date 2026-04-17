"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Sentry = __importStar(require("@sentry/node"));
let LoggerService = class LoggerService extends common_1.ConsoleLogger {
    configService;
    constructor(configService) {
        super('LoggerService');
        this.configService = configService;
    }
    local2(mensagem, prefixo) {
        if (this.configService.get('APP_ENV') !== 'producao') {
            if (prefixo && Object.prototype.toString.call(mensagem) === '[object Object]') {
                mensagem = `${prefixo}: ${JSON.stringify(mensagem)}`;
            }
            if (prefixo && typeof mensagem === 'string') {
                mensagem = `${prefixo}: ${mensagem}`;
            }
            super.log(mensagem, this.context);
        }
    }
    capiturarError(erro) {
        if (erro && !(erro instanceof Error) &&
            Object.prototype.toString.call(erro) === '[object Object]') {
            erro = new Error(JSON.stringify(erro));
        }
        else if (!(erro instanceof Error) &&
            Object.prototype.toString.call(erro) !== '[object Object]') {
            erro = new Error(String(erro));
        }
        if (this.configService.get('APP_ENV') !== 'producao') {
            super.error(erro);
            return;
        }
        Sentry.captureException(erro);
    }
    error(message, stack, context) {
        const erros = [message, stack, context];
        const resposta = erros.filter((valor) => {
            return valor ? true : false;
        });
        if (this.configService.get('APP_ENV') !== 'producao') {
            super.error(resposta.toString());
            return;
        }
        Sentry.captureMessage(resposta.toString(), 'error');
        super.error(resposta.toString());
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