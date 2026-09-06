# MEI Manager - Aplicativo de Gestão para MEI

## Visão Geral

Este é um aplicativo React Native (Expo) desenvolvido para ajudar Microempreendedores Individuais (MEI) a gerenciar seus CNPJs, contas a pagar e emissão de notas fiscais.

## Funcionalidades

### 1. **Gestão de CNPJs**
- Cadastro de múltiplos CNPJs
- Campos: CNPJ, Razão Social, Nome Fantasia, Atividade Principal, Faturamento Anual
- Status do CNPJ (Ativo, Suspenso, Baixado)
- Visualização completa de todos os CNPJs cadastrados

### 2. **Contas a Pagar**
- Registro de contas com descrição, valor e data de vencimento
- Marcar contas como pagas
- Visualização do total pendente
- Histórico de pagamentos

### 3. **Emissão de Notas Fiscais**
- Registro de notas fiscais emitidas
- Campos: Número, Série, Valor, Cliente, Data de Emissão
- Status da nota (Emitida, Cancelada, Pendente)
- Totalizador de notas emitidas

### 4. **Dashboard (Home)**
- Cards com resumo financeiro
- Total de CNPJs ativos
- Total de contas a pagar
- Total de notas fiscais emitidas
- Alertas automáticos de contas atrasadas e CNPJs perto do limite anual do MEI
- Resumo geral do negócio

### 5. **IA de Sugestão de Nota Fiscal**
- Descreva o serviço em texto livre e receba tipo de nota, código de serviço (LC 116/2003), alíquota de ISS estimada e observações
- Funciona **sem nenhuma configuração**, usando uma base de regras local gratuita
- Se você configurar uma chave da OpenAI (nas variáveis de ambiente ou direto na aba "IA" do app), as sugestões passam a ser geradas por IA de verdade

### Dados salvos automaticamente
Tudo o que você cadastra (CNPJs, contas, notas e a configuração de IA) fica salvo no navegador (`localStorage`) e continua lá mesmo depois de fechar ou atualizar a página. Não há um banco de dados compartilhado — os dados ficam por navegador/dispositivo.

## Como Usar

### Navegação
O app possui uma barra de navegação inferior com 5 opções:
- 🏠 **Home**: Dashboard com visão geral e alertas
- 📋 **CNPJs**: Gerencie seus CNPJs (consulta automática por CNPJ)
- 💰 **Contas**: Controle suas contas a pagar
- 📄 **Notas**: Emita e acompanhe notas fiscais
- 🤖 **IA**: Sugestão de nota fiscal por descrição do serviço

### Adicionar Novo Item
Em cada tela, clique no botão verde "+ Novo" para abrir o formulário modal e adicionar um novo registro.

### Executar o App

```bash
# Instalar dependências (já instaladas)
npm install

# Rodar no navegador web
npm run web

# Rodar no Android (requer emulador ou dispositivo conectado)
npm run android

# Rodar no iOS (requer macOS)
npm run ios

# Build de produção (gera a pasta dist/) + servidor local com a API de IA
npm run build:web
npm run server
```

Para usar IA real (OpenAI) localmente, veja as variáveis em `.env.example` e rode com elas definidas, por exemplo: `OPENAI_API_KEY=sk-... npm run server`.

## Tecnologias Utilizadas

- **React Native**: Framework para desenvolvimento mobile
- **Expo SDK 57**: Plataforma de desenvolvimento
- **TypeScript**: Tipagem estática
- **React Hooks**: useState para gerenciamento de estado

## Estrutura do Projeto

```
.
├── App.tsx                  # Componente principal do app (telas e estado)
├── types.ts                 # Interfaces compartilhadas (CNPJ, ContaPagar, ...)
├── theme.ts                 # Cores, espaçamentos e constantes visuais
├── server.js                # Servidor de produção: serve o app e a API de IA
├── server.package.json      # Manifesto enxuto (só Express) da imagem Docker final
├── services/
│   ├── cnpjApi.ts           # Consulta e normalização de dados de CNPJ
│   ├── aiSugestao.ts        # Chamada ao servidor para sugestão de nota via IA
│   └── storage.ts           # Persistência local (AsyncStorage/localStorage)
├── shared/
│   └── notaKnowledgeBase.js # Base de regras local (usada pelo server e pelo app)
├── components/
│   └── Toast.tsx            # Notificações não-bloqueantes de sucesso/erro
├── package.json              # Dependências e scripts
├── tsconfig.json              # Configuração TypeScript
├── Dockerfile                 # Build para deploy (Coolify)
├── .env.example                # Variáveis de ambiente (PORT, OPENAI_*)
└── assets/                    # Ícones e imagens
```

## Observações Importantes para MEI

### Limites do MEI
- Faturamento anual máximo: R$ 81.000,00 (valor de 2023, sujeito a atualização)
- Não pode ter participação em outra empresa
- Pode ter até 1 empregado
- Atividades permitidas conforme lista oficial

### Obrigações Mensais
- Pagamento do DAS (Documento de Arrecadação do Simples Nacional)
- Declaração mensal de faturamento
- Emissão de notas fiscais quando necessário

### Este App É Para Você?
✅ **SIM**, se você é MEI e quer:
- Controlar múltiplos CNPJs (se tiver mais de um negócio)
- Organizar contas a pagar
- Registrar notas fiscais emitidas
- Ter uma visão geral do seu negócio

⚠️ **IMPORTANTE**: Este app é um controle interno. Para emissão oficial de notas fiscais, utilize o sistema da prefeitura ou estado conforme sua atividade.

## Próximas Melhorias Sugeridas

- [x] Persistência de dados (localStorage via AsyncStorage)
- [x] IA real de sugestão de nota fiscal (OpenAI, configurável)
- [x] Alertas de contas atrasadas e limite de faturamento do MEI
- [ ] Validação completa de CNPJ (dígito verificador)
- [ ] Integração com APIs de emissão de notas fiscais
- [ ] Relatórios e gráficos
- [ ] Exportação de dados (PDF, Excel)
- [ ] Autenticação e sincronização em nuvem (banco de dados compartilhado entre dispositivos)

## Licença

MIT License - Sinta-se livre para usar e modificar!
