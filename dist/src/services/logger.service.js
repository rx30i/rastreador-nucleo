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
            const mensagemFormatada = this.formatarMensagem(mensagem, prefixo);
            super.log(mensagemFormatada, this.context);
        }
    }
    capiturarError(erro) {
        const erroNormalizado = this.normalizarErro(erro);
        if (this.configService.get('APP_ENV') !== 'producao') {
            super.error(erroNormalizado);
            return;
        }
        Sentry.captureException(erroNormalizado);
    }
    formatarMensagem(mensagem, prefixo) {
        if (!prefixo) {
            return mensagem;
        }
        if (this.valorEhObjetoComum(mensagem)) {
            return `${prefixo}: ${this.serializarValor(mensagem)}`;
        }
        if (typeof mensagem === 'string') {
            return `${prefixo}: ${mensagem}`;
        }
        return mensagem;
    }
    normalizarErro(erro) {
        if (erro instanceof Error) {
            return erro;
        }
        if (this.valorEhObjetoComum(erro)) {
            return new Error(this.serializarValor(erro));
        }
        return new Error(this.converterValorParaTexto(erro));
    }
    serializarValor(valor) {
        const referenciasVisitadas = new WeakSet();
        try {
            const valorSerializado = JSON.stringify(valor, (_chave, valorAtual) => this.normalizarValorSerializado(valorAtual, referenciasVisitadas));
            if (typeof valorSerializado === 'string') {
                return valorSerializado;
            }
            return this.converterValorParaTexto(valor);
        }
        catch {
            return this.converterValorParaTexto(valor);
        }
    }
    normalizarValorSerializado(valorAtual, referenciasVisitadas) {
        if (typeof valorAtual === 'bigint') {
            return valorAtual.toString();
        }
        if (typeof valorAtual !== 'object' || valorAtual === null) {
            return valorAtual;
        }
        if (referenciasVisitadas.has(valorAtual)) {
            return '[Referencia circular]';
        }
        referenciasVisitadas.add(valorAtual);
        return valorAtual;
    }
    valorEhObjetoComum(valor) {
        return Object.prototype.toString.call(valor) === '[object Object]';
    }
    converterValorParaTexto(valor) {
        try {
            return String(valor);
        }
        catch {
            return '[Valor nao serializavel]';
        }
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LoggerService);
//# sourceMappingURL=logger.service.js.map