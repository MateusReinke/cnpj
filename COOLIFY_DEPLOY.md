# 🚀 Deploy no Coolify - Guia Completo

## ✅ PRONTO PARA DEPLOY!

Seu app já está 100% configurado para deploy no Coolify. Todos os arquivos necessários foram criados:

- `Dockerfile` - Configuração do container
- `coolify.json` - Configurações do Coolify
- `.env.example` - Variáveis de ambiente de exemplo
- `app.json` - Porta 8080 configurada

---

## 📋 Passo a Passo para Deploy

### Opção 1: Deploy Automático (Recomendado)

1. **No painel do Coolify:**
   - Clique em "+ Add Resource"
   - Selecione "Application"
   - Escolha seu repositório Git (GitHub/GitLab)
   - Selecione o branch `main` ou `master`

2. **Configurações Automáticas:**
   - O Coolify detectará automaticamente o `coolify.json`
   - A porta 8080 será configurada automaticamente
   - Health check será configurado

3. **Variáveis de Ambiente (Environment Variables):**
   ```
   PORT=8080
   ```

4. **Clique em "Deploy"** 🚀

---

### Opção 2: Deploy Manual com Dockerfile

1. **No painel do Coolify:**
   - "+ Add Resource" → "Application"
   - Conecte seu repositório Git

2. **Build Settings:**
   - **Build Pack:** Dockerfile
   - **Dockerfile Path:** `Dockerfile`

3. **Port Configuration:**
   - **Expose Port:** 8080
   - **Protocol:** HTTP

4. **Environment Variables:**
   ```bash
   PORT=8080
   ```

5. **Deploy!** 🚀

---

## ⚙️ Configurações no Coolify

### Variáveis de Ambiente Obrigatórias

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `PORT` | `8080` | Porta do servidor web |

### Opcionais (se necessário)

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `BASE_URL` | `https://seu-dominio.coolify.app` | URL base para callbacks |
| `OPENAI_API_KEY` | `sk-...` | Ativa sugestões de nota fiscal por IA real (OpenAI). Sem essa variável, o app usa uma base de regras local gratuita. Também pode ser definida direto na aba "IA" do app, sem redeploy. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Modelo da OpenAI a usar (padrão `gpt-4o-mini` se não definido). |

### Domínio Personalizado (Opcional)

1. Vá em "Domains" no seu recurso
2. Adicione seu domínio: `mei-manager.seudominio.com`
3. Configure o DNS conforme instruções do Coolify

---

## 🔍 Verificação Pós-Deploy

Após o deploy, verifique:

1. **Health Check:**
   - Acesse: `https://seu-app.coolify.app/`
   - Deve carregar a interface do app

2. **Funcionalidades:**
   - ✅ Dashboard aparece corretamente
   - ✅ Navegação entre abas funciona
   - ✅ Consulta de CNPJ retorna dados reais
   - ✅ IA de sugestão de notas funciona

3. **Logs:**
   - Verifique os logs no Coolify para erros
   - Procure por "Expo Web Bundler" nos logs

---

## 🛠️ Troubleshooting

### Problema: App não inicia

**Solução:**
```bash
# Verifique os logs no Coolify
# Certifique-se que a variável PORT está definida
# Tente rebuild: Settings → Rebuild
```

### Problema: Porta incorreta

**Solução:**
- Verifique se `PORT=8080` está nas environment variables
- No Dockerfile: `ENV PORT=8080`
- No app.json: `"port": 8080`

### Problema: Build falha

**Solução:**
```bash
# Teste build localmente:
docker build -t mei-manager .
docker run -p 8080:8080 mei-manager
```

---

## 📊 Recursos Recomendados no Coolify

| Recurso | Valor | Justificativa |
|---------|-------|---------------|
| CPU | 0.5 | Suficiente para app React Native Web |
| Memory | 512MB | Mínimo recomendado |
| Storage | 1GB | Para dados locais e cache |

---

## 🔄 Atualizações Futuras

Para atualizar o app após mudanças no código:

1. **Commit e push** das alterações no Git
2. **Coolify** detectará automaticamente
3. **Auto-deploy** será acionado (se habilitado)
4. Ou clique em **"Redeploy"** manualmente

---

## 🎯 Resumo da Configuração

```yaml
Nome: mei-manager
Tipo: Dockerfile
Porta: 8080
Variáveis: PORT=8080
Health Check: / (porta 8080)
Recursos: 0.5 CPU, 512MB RAM
```

---

## ✨ Pronto!

Seu app está **100% pronto** para deploy no Coolify!

Basta seguir os passos acima e em poucos minutos seu MEI Manager estará no ar! 🎉

**URL após deploy:** `https://mei-manager.seu-projeto.coolify.app`
