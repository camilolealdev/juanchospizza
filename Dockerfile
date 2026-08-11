# =============================================================================
#  Dockerfile optimizado — Juancho's Pizza / GastroPro
#  Multi-stage build con caché de capas, npm ci y huella mínima en runtime.
# =============================================================================

ARG NODE_VERSION=22-alpine
ARG BUILD_PORT=3001
# ── Registry mirror (fallback) ─────────────────────────────────
# Si el registry oficial de npm da timeout (ej: Docker Desktop + resolución
# IPv6), se puede cambiar a un mirror. Ejemplo de uso:
#   docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com app
# El valor por defecto '' significa 'usar el registry oficial de npm' (no
# se pasa --registry a npm ci). Solo cambiar si hay problemas de conectividad.
ARG NPM_REGISTRY=

# ── Stage 0: Runtime base (instalación limpia con npmrc) ─────────────────
# Separado para que npmrc y los directorios base sean cacheados aunque
# cambien las dependencias.
FROM node:${NODE_VERSION} AS base
WORKDIR /app

# Silenciar npm en producción y configurar network resilience.
# Network: Docker Desktop en Windows tiene proxy DNS virtual que falla
# con resolución IPv6 de npm registry (ETIMEDOUT). Se aumentan timeouts
# y reintentos. prefer-ipv4 se pasa como flag CLI en npm ci, no acá.
RUN npm config set fund false --location=project && \
    npm config set audit false --location=project && \
    npm config set progress false --location=project && \
    npm config set fetch-timeout 120000 --location=project && \
    npm config set fetch-retries 5 --location=project && \
    npm config set fetch-retry-mintimeout 20000 --location=project && \
    npm config set fetch-retry-maxtimeout 120000 --location=project

# ── Stage 1: Instalación de dependencias (capa cacheable) ───────────────
# package.json y lockfile cambian mucho menos que el código fuente.
# Esta capa se reusa del cache de Docker mientras no toquemos
# dependencias — incluso si src/ o server/ cambian.
FROM base AS deps
COPY package.json package-lock.json ./

# Usar npm ci (no install): es determinístico, más rápido y falla si el
# lockfile no coincide con package.json — evita sorpresas en producción.
# --ignore-scripts: los scripts postinstall (ej. husky, node-gyp) se
# ejecutarán solo en la stage build donde realmente se necesitan.
# NOTA: --prefer-ipv4 funciona en npm v10 (Node 22) pero emite warning:
# "Unknown CLI config --prefer-ipv4. This will stop working in the next major
# version." Si npm v11 lo elimina, migrar a forzar IPv4 vía:
#   NODE_OPTIONS="--dns-result-order=ipv4first"
# o usar solo --registry con un mirror IPv4 como alternativa.
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund --prefer-ipv4 ${NPM_REGISTRY:+--registry "$NPM_REGISTRY"} 2>&1

# ── Stage 2: Dependencias de desarrollo (solo para build) ───────────────
# capa independiente que se descarta al final — no llega a runtime.
FROM base AS deps-dev
COPY package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts --no-audit --no-fund --prefer-ipv4 ${NPM_REGISTRY:+--registry "$NPM_REGISTRY"} 2>&1

# ── Stage 3: Build del frontend (Vite + TypeScript) ─────────────────────
# Copia en orden de menor a mayor tasa de cambio para maximizar cache:
# 1. configs (tsconfig, vite, tailwind, postcss)
# 2. archivos fuente
FROM deps-dev AS build

# VITE_API_URL expone la URL base para WebSocket y llamadas API; se inyecta
# desde docker-compose.yml (--build-arg) con el valor correcto según entorno
# (ej: https://juanchospizza.com para producción, https://localhost para dev).
ARG VITE_API_URL
# VITE_VAPID_PUBLIC_KEY: clave pública VAPID para notificaciones push; se
# hornea en el bundle en build time (la lee import.meta.env en
# src/services/push.ts). Sin ella el cliente no puede suscribirse. Mismo
# valor que VAPID_PUBLIC_KEY, expuesta al bundle (la pública no es secreta).
ARG VITE_VAPID_PUBLIC_KEY

COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js ./
COPY public/ ./public/
COPY index.html ./
COPY src/ ./src/

RUN VITE_API_URL=${VITE_API_URL} VITE_VAPID_PUBLIC_KEY=${VITE_VAPID_PUBLIC_KEY} npm run build 2>&1

# ── Stage 4: Runtime final (imagen mínima) ─────────────────────────────
# Solo lo necesario para correr: Node, production deps, server, y dist.
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

# ARGs no cruzan a un nuevo stage automáticamente -- sin esta línea BUILD_PORT
# quedaba vacío acá (solo existía en el stage de antes del primer FROM).
ARG BUILD_PORT=3001

ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512" \
    PORT=${BUILD_PORT} \
    npm_config_fund=false \
    npm_config_audit=false

# Crear usuario no-root y directorios necesarios en una sola capa (-l
# combina los comandos, -S crea el usuario sistema — sin shell de login).
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copiar solo producción: node_modules con production deps
COPY --chown=appuser:appgroup --from=deps /app/node_modules ./node_modules
# Código servidor
COPY --chown=appuser:appgroup server/ ./server/
# Frontend compilado
COPY --chown=appuser:appgroup --from=build /app/dist ./dist

USER appuser
EXPOSE ${BUILD_PORT}

# HEALTHCHECK CMD corre en el contenedor en RUNTIME, no en build time -- ARGs
# (como BUILD_PORT) nunca persisten hasta ahí, solo ENV sí. Por eso acá se usa
# ${PORT} (seteado arriba vía ENV PORT=${BUILD_PORT}), no ${BUILD_PORT}
# directo -- referenciarlo mal dejaba el healthcheck pegándole a
# "http://localhost:/api/health" (puerto vacío) siempre, incluso con el
# server sirviendo tráfico real sin problema.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -q --spider http://localhost:${PORT}/api/health || exit 1

CMD ["node", "server/index.js"]
