# ============================================================================
# API del portfolio: Node 22 + Express 5
#
# El contexto de build es la RAIZ del repositorio, no esta carpeta, porque el
# backend necesita tambien frontend/public (la foto y los CVs por defecto).
#   docker build -f backend/Dockerfile .
# ============================================================================

# --- Fase 1: dependencias -------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# bcrypt puede necesitar compilarse si no hay binario precompilado para esta
# plataforma; estas herramientas solo viven en esta fase, no en la imagen final
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# --- Fase 2: imagen final -------------------------------------------------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    TZ=Europe/Madrid \
    PORT=3000
WORKDIR /app

# curl para el healthcheck del contenedor
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./
# Valores por defecto que el backend lee de la carpeta del front:
# frontend/public/images/perfil.jpg y los dos CV en PDF.
COPY frontend/public /frontend/public

# Los archivos que se suben desde el panel (foto, CVs, imagenes de proyectos)
# viven en /app/src/data, que en produccion es un volumen.
RUN mkdir -p /app/src/data/projects /app/src/data/cv \
 && chown -R node:node /app/src/data

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "server.js"]
