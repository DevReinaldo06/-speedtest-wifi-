# ---- Etapa 1: instala só as dependências de produção ----
# O better-sqlite3 já traz o binário pronto para Alpine (musl), então não
# precisa de compilador. O .npmrc mantém "ignore-scripts=true".
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

# ---- Etapa 2: imagem final, pequena e sem o cache do npm ----
FROM node:22-alpine
WORKDIR /app

ARG GIT_COMMIT=dev
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/speedtest.db \
    GIT_COMMIT=${GIT_COMMIT}

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public

# Pasta do banco SQLite, com permissão para o usuário "node" (não roda como root)
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
