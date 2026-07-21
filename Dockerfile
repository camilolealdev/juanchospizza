# =============================================================================
#  Dockerfile optimizado — Juancho's Pizza / GastroPro
#  Multi-stage build con caché de capas, npm ci y huella mínima en runtime.
# =============================================================================

ARG NODE_VERSION=22-alpine
ARG BUILD_PORT=3001

# ── Stage 0: Runtime base (instalación limpia con npmrc) ─────────────────
# Separado para que npmrc y los directorios base sean cacheados aunque
# cambien las dependencias.
FROM node:${NODE_VERSION} AS base
WORKDIR /app

# Silenciar npm en producción: sin audit, sin fund, sin progreso
RUN npm config set fund false --location=project && \
    npm config set audit false --location=project && \
    npm config set progress false --location=project

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
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund 2>&1 && \
    npm cache clean --force 2>/dev/null

# ── Stage 2: Dependencias de desarrollo (solo para build) ───────────────
# capa independiente que se descarta al final — no llega a runtime.
FROM base AS deps-dev
COPY package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts --no-audit --no-fund 2>&1 && \
    npm cache clean --force 2>/dev/null

# ── Stage 3: Build del frontend (Vite + TypeScript) ─────────────────────
# Copia en orden de menor a mayor tasa de cambio para maximizar cache:
# 1. configs (tsconfig, vite, tailwind, postcss)
# 2. archivos fuente
FROM deps-dev AS build
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js ./
COPY public/ ./public/
COPY index.html ./
COPY src/ ./src/

RUN npm run build 2>&1

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
