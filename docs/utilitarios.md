# Utilitários

Este documento descreve os utilitários disponíveis em `src/helpers/`.

---

## geoJsonPoint

Cria um objeto no formato GeoJSON do tipo Point.

**Assinatura:**
```typescript
function geoJsonPoint(longitude: number, latitude: number): IGeoJsonPoint
```

**Parâmetros:**
- `longitude` (number): Coordenada de longitude
- `latitude` (number): Coordenada de latitude

**Retorno:**
Objeto GeoJSON com `type: 'Point'` e `coordinates: [longitude, latitude]`

**Exemplo de uso:**
```typescript
const ponto = geoJsonPoint(-46.633308, -23.55052);
// Resultado: { type: 'Point', coordinates: [-46.633308, -23.55052] }
```

---

## hexParaDec

Converte uma string hexadecimal para número decimal.

**Assinatura:**
```typescript
function hexParaDec(mensagem: string): number | undefined
```

**Parâmetros:**
- `mensagem` (string): String contendo um caractere hexadecimal

**Retorno:**
- `number`: Valor decimal correspondente
- `undefined`: Se a entrada for inválida

**Exemplo de uso:**
```typescript
const valor = hexParaDec('F');  // Retorna 15
const valor2 = hexParaDec('A'); // Retorna 10
```

---

## hexParaBin

Converte uma string hexadecimal para binário. Cada dígito em hexadecimal corresponde a quatro dígitos binários.

**Assinatura:**
```typescript
function hexParaBin(mensagem: string): string | undefined
```

**Parâmetros:**
- `mensagem` (string): String contendo dígitos hexadecimais

**Retorno:**
- `string`: Representação binária da mensagem
- `undefined`: Se a entrada for inválida

**Exemplo de uso:**
```typescript
const binario = hexParaBin('FF');  // Retorna '11111111'
const binario2 = hexParaBin('0A'); // Retorna '00001010'
```

**Dependências:**
- `hexParaDec`

---

## isJson

Verifica se uma string é um JSON válido.

**Assinatura:**
```typescript
function isJson(valor: string): boolean
```

**Parâmetros:**
- `valor` (string): String a ser validada

**Retorno:**
- `true`: Se a string for um JSON válido
- `false`: Se a string não for um JSON válido

**Exemplo de uso:**
```typescript
const valido = isJson('{"nome": "teste"}'); // Retorna true
const invalido = isJson('texto simples');   // Retorna false
```

---

## encerrarApp

Encerra a aplicação NestJS de forma segura, capturando exceções no Sentry antes de fechar o aplicativo.

**Assinatura:**
```typescript
async function encerrarApp(app: INestMicroservice, codigo: number, erro: unknown): Promise<void>
```

**Parâmetros:**
- `app` (INestMicroservice): Instância do microserviço NestJS
- `codigo` (number): Código de saída do processo
- `erro` (unknown): Erro opcional que será capturado no Sentry

**Comportamento:**
1. Se `erro` for uma instância de Error, captura a exceção no Sentry
2. Tenta fechar o aplicativo gracefulmente
3. Se ocorrer erro ao fechar, também captura no Sentry
4. Finaliza o processo com o código especificado

**Exemplo de uso:**
```typescript
await encerrarApp(app, 1, new Error('Falha crítica'));
```

**Dependências:**
- `@sentry/node`
- `@nestjs/common`