# 🚀 Configuração para Coolify

## Porta de Acesso

A porta do aplicativo está configurada de duas formas:

### 1. Variável de Ambiente no Coolify
No painel do Coolify, adicione a seguinte variável de ambiente:
```
PORT=8080
```

### 2. Configuração no app.json
O arquivo `app.json` já está configurado com:
```json
{
  "expo": {
    "web": {
      "port": 8080
    }
  }
}
```

## Deploy no Coolify

O jeito recomendado é usar o `Dockerfile` do repositório (Build Pack: Dockerfile), que já faz o build e sobe um servidor Node (`server.js`) servindo o app e a API de IA. Nesse caso não é preciso configurar Build/Start Command manualmente.

1. **Conecte seu repositório** no Coolify
2. **Configure as variáveis de ambiente** (veja `.env.example`):
   - `PORT=8080` (porta desejada)
   - `OPENAI_API_KEY` (opcional — veja a seção "IA de Sugestão de Notas" abaixo)
   - `OPENAI_MODEL` (opcional, padrão `gpt-4o-mini`)

Se preferir configurar manualmente sem o Dockerfile:

3. **Build Command**:
   ```bash
   npm ci && npx expo export -p web
   ```

4. **Start Command**:
   ```bash
   node server.js
   ```

## APIs Utilizadas

O app usa APIs oficiais e públicas para consulta de CNPJ:

- **Brasil API**: `https://brasilapi.com.br/api/cnpj/v1/`
- **Receita WS**: `https://www.receitaws.com.br/v1/cnpj/`

✅ Dados reais da Receita Federal
✅ Consulta por CNPJ (14 dígitos)
✅ Informações completas: Razão Social, Nome Fantasia, Atividade, Status

## Funcionalidades Implementadas

### 📋 Gestão de CNPJs
- Consulta automática na Receita Federal
- Cadastro manual de CNPJs
- Múltiplos CNPJs por usuário

### 💰 Contas a Pagar
- Registro de contas mensais (DAS, fornecedores)
- Marcar como pago
- Controle de vencimentos

### 📄 Emissão de Notas Fiscais
- Registro de notas emitidas
- Controle por CNPJ
- Status (Emitida/Cancelada/Pendente)

### 🤖 IA de Sugestão de Notas
- Descreva o serviço prestado
- Receba código de serviço (LC 116/2003)
- Alíquota de ISS estimada
- Observações importantes
- **Sem configurar nada**: usa uma base de regras local, gratuita (sem custo, sem chamada de IA)
- **Configurando `OPENAI_API_KEY`** (no Coolify, como variável de ambiente normal — não precisa marcar como "build time"): as sugestões passam a ser geradas pela OpenAI de verdade
- A chave pode ser trocada a qualquer momento direto na aba "IA" do app (fica salva só no navegador de quem usar), sem precisar mexer no Coolify nem redeployar
- A chamada à API da OpenAI acontece sempre pelo `server.js` (nunca direto do navegador) — é a única forma de funcionar, já que a OpenAI bloqueia chamadas de navegador (CORS) além de manter a chave fora do código-fonte público do site

## Importante

Este app é para **controle interno**. Para obrigações oficiais use:
- Emissão de notas: Sistema da prefeitura (NFS-e)
- DAS: Portal do Empreendedor (Gov.br)
- Declarações: SIMEI

O app organiza suas informações antes do envio oficial!
