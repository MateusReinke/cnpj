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

# Manifesto enxuto só com o Express, para não carregar as ferramentas
# de build do Expo/React Native na imagem final de produção.
COPY server.package.json ./package.json
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY server.js ./server.js
COPY shared ./shared

# Porta (configurável via variável de ambiente)
ENV PORT=8080
EXPOSE 8080

# OpenAI (opcional) — sem essas variáveis o app usa uma base de regras
# local gratuita para sugerir notas fiscais. Configure em runtime no Coolify.
# ENV OPENAI_API_KEY=
# ENV OPENAI_MODEL=gpt-4o-mini

CMD ["node", "server.js"]
