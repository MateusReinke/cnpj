FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema necessárias para React Native Web
RUN apk add --no-cache libc6-compat

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar o resto do código
COPY . .

# Expor a porta (configurável via variável de ambiente)
ENV PORT=8080
EXPOSE 8080

# Comando para iniciar o app web em produção
CMD ["sh", "-c", "npx expo start --web --port $PORT --host 0.0.0.0"]
