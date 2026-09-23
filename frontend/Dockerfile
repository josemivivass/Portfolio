# ============================================================================
# Web del portfolio: Angular 21 con renderizado en servidor (SSR)
#
# Contexto de build: la RAIZ del repositorio.
#   docker build -f frontend/Dockerfile .
#
# La compilacion (pesada, ~3 GB de RAM) ocurre en la fase 1, que se descarta.
# La imagen final solo lleva el resultado y arranca el servidor de Angular.
# ============================================================================

# --- Fase 1: compilacion --------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# El build de Angular necesita mas memoria de la que Node reserva por defecto
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# --- Fase 2: imagen final -------------------------------------------------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    TZ=Europe/Madrid \
    PORT=4000
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null || exit 1

CMD ["node", "dist/frontend/server/server.mjs"]
