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

1. **Conecte seu repositório** no Coolify
2. **Configure as variáveis de ambiente**:
   - `PORT=8080` (porta desejada)
   
3. **Build Command** (se necessário):
   ```bash
   npm install
   ```

4. **Start Command**:
   ```bash
   npx expo start --web --port $PORT
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

## Importante

Este app é para **controle interno**. Para obrigações oficiais use:
- Emissão de notas: Sistema da prefeitura (NFS-e)
- DAS: Portal do Empreendedor (Gov.br)
- Declarações: SIMEI

O app organiza suas informações antes do envio oficial!
