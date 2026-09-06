FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependências do sistema necessárias para React Native Web
RUN apk add --no-cache libc6-compat

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar o resto do código
COPY . .

# Gerar o build estático de produção do app web
RUN npx expo export -p web

FROM node:20-alpine

WORKDIR /app

# Servidor estático leve para servir o build gerado
RUN npm install -g serve

COPY --from=build /app/dist ./dist

# Porta (configurável via variável de ambiente)
ENV PORT=8080
EXPOSE 8080

# Servir o build estático em produção
CMD ["sh", "-c", "serve -s dist -l $PORT"]
