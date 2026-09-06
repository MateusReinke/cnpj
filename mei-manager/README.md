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
- Resumo geral do negócio

## Como Usar

### Navegação
O app possui uma barra de navegação inferior com 4 opções:
- 🏠 **Home**: Dashboard com visão geral
- 📋 **CNPJs**: Gerencie seus CNPJs
- 💰 **Contas**: Controle suas contas a pagar
- 📄 **Notas**: Emita e acompanhe notas fiscais

### Adicionar Novo Item
Em cada tela, clique no botão verde "+ Novo" para abrir o formulário modal e adicionar um novo registro.

### Executar o App

```bash
cd mei-manager

# Instalar dependências (já instaladas)
npm install

# Rodar no navegador web
npm run web

# Rodar no Android (requer emulador ou dispositivo conectado)
npm run android

# Rodar no iOS (requer macOS)
npm run ios
```

## Tecnologias Utilizadas

- **React Native**: Framework para desenvolvimento mobile
- **Expo SDK 57**: Plataforma de desenvolvimento
- **TypeScript**: Tipagem estática
- **React Hooks**: useState para gerenciamento de estado

## Estrutura do Projeto

```
mei-manager/
├── App.tsx          # Código principal do app
├── package.json     # Dependências e scripts
├── tsconfig.json    # Configuração TypeScript
└── assets/          # Ícones e imagens
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

- [ ] Persistência de dados (AsyncStorage ou banco de dados)
- [ ] Validação de CNPJ
- [ ] Integração com APIs de emissão de notas fiscais
- [ ] Relatórios e gráficos
- [ ] Lembretes de vencimento
- [ ] Exportação de dados (PDF, Excel)
- [ ] Autenticação e sincronização em nuvem

## Licença

MIT License - Sinta-se livre para usar e modificar!
