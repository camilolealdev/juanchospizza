# Contribuyendo a Juancho's Pizza / GastroPro

Gracias por tu interés en contribuir. Este documento describe las convenciones y procesos del proyecto.

## 📋 Stack

| Capa     | Tecnología                                  |
| -------- | ------------------------------------------- |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend  | Express.js + Node.js + ESM                  |
| DB       | PostgreSQL 17                               |
| Cache    | Redis 8                                     |
| Proxy    | Nginx 1.31 (Docker)                         |
| Tests    | Vitest (131+ tests) + Playwright            |
| IA       | Google Gemini SDK (opcional)                |
| Infra    | Docker + docker-compose                     |

## 🧑‍💻 Setup Local

```bash
# 1. Clonar
git clone https://github.com/camilolealdev/juanchospizza.git
cd juanchospizza

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
# .env → necesario para docker compose (interpolación de ${VAR})
# .env.production → env_file del app service
cp .env.production.example .env.production
# Editar al menos POSTGRES_PASSWORD y JWT_SECRET

# 4. Generar certs SSL locales (para nginx en Docker)
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/privkey.pem -out certs/fullchain.pem \
  -subj "/C=CO/ST=Cundinamarca/L=Local/O=Dev/CN=localhost"

# 5. Iniciar todo con Docker
docker compose up --build -d

# 6. Verificar
curl -sk https://localhost/api/health

# Alternativa: solo backend en dev (sin Docker)
# npm run dev:all  → frontend :3000 + backend :3001

# ⚠️ VITE_API_URL build arg: Al construir con Docker, pasar
# VITE_API_URL=https://tudominio.com como --build-arg (o configurar
# en docker-compose.yml). Ver DEPLOY.md para detalle.
```

## 🏗️ Estructura del Proyecto

```
├── src/                    # Frontend React
│   ├── components/         # Componentes compartidos + portales
│   ├── pages/              # Páginas standalone (OrderConfirmation)
│   ├── services/           # API client, gemini
│   ├── types/              # Tipos TypeScript
│   ├── context/            # Contextos (Cart, Auth)
│   └── hooks/              # Custom hooks (useWebSocket)
├── server/                 # Backend Express
│   ├── routes/             # Rutas por recurso (32 archivos)
│   ├── schemas/            # Validación Zod (20 archivos)
│   ├── services/           # Email, PDF, webhooks, logger, redis
│   ├── middleware/          # Auth, rate-limit, error handler, CSRF
│   ├── auth.js             # Lógica de autenticación JWT
│   ├── db.js               # Conexión PostgreSQL + initDB
│   └── migrate.js          # Sistema de migraciones (6 aplicadas)
├── public/                 # Activos estáticos (favicon, PWA icons, logo)
├── docs/                   # Documentación técnica y auditorías
├── e2e/                    # Tests E2E (Playwright)
├── tools/                  # Scripts auxiliares (generación iconos)
├── .github/workflows/      # CI/CD pipelines
└── index.html              # Landing page (entry point)
```

## 🚀 Git workflow

`origin` (`camilolealdev/juanchospizza`) es el **único remoto activo** — push normal, sin alias especiales:

```bash
git push origin feat/foo
git push origin master
```

`jastigoga/pizzeria` es un repo anterior del proyecto, abandonado desde 2026-07-27 (sin colaboradores externos reales ni trabajo abierto — ver `docs/AUDIT_2026-07-30.md` para el análisis completo). Se mantiene solo como remoto de solo lectura para referencia histórica; no recibe pushes.

## 🔧 Convenciones de Código

### Naming

| Elemento            | Convención                 | Ejemplo               |
| ------------------- | -------------------------- | --------------------- |
| Variables/funciones | `camelCase`                | `getAuthToken()`      |
| Componentes React   | `PascalCase`               | `MenuDigital`         |
| Archivos            | `kebab-case`               | `inventario-view.tsx` |
| Tablas DB           | `snake_case`               | `inventory_items`     |
| Columnas DB         | `camelCase` entre comillas | `"stockActual"`       |

### TypeScript

- Usar tipos explícitos siempre que sea posible
- Tipos centralizados en `src/types/index.ts`
- Preferir `interface` sobre `type` para objetos
- `strict: true` habilitado en tsconfig

### Backend

- Cada recurso tiene su router en `server/routes/<recurso>.js`
- Validación Zod en `server/schemas/<recurso>.js`
- Todas las queries SQL usan parámetros `$1`, nunca concatenación
- PUT usa updates dinámicos (solo campos presentes en el body)
- Endpoints públicos: `/api/menu`, `/api/reviews/approved`, `/api/categories`
- Endpoints auth: usar `authMiddleware` + `requireRole()`
- No hay `server/workers/` — el procesamiento async se hace síncrono en `server/services/`

### Frontend

- Componentes CRM lazy-loaded (17 módulos)
- Portales para componentes públicos (MenuDigital, CartSection)
- Estados: loading / empty / error / success en todas las vistas
- API siempre a través de `src/services/api.ts`

### Git Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <descripción>

tipos: feat, fix, refactor, docs, style, test, chore, security
scope: backend, frontend, infra, db, auth, docs
```

Ejemplos:

- `feat(backend): agregar endpoint de comandas split`
- `fix(frontend): corregir refresh de token en 401`
- `security(auth): migrar usuarios hardcodeados a DB`
- `docs(infra): agregar CHANGELOG.md`

## 🧪 Testing

```bash
# Tests unitarios (Vitest)
npm test

# Tests E2E (Playwright — requiere servidor vivo)
npm run test:e2e

# TypeScript check
npx tsc --noEmit

# Lint
npm run lint
```

### Escribir Tests

- Schemas Zod: testear parsing exitoso y casos de error
- Rutas: testear status codes + estructura de respuesta
- Componentes: testear render + estados + interacciones
- Usar Vitest + React Testing Library

## 🐳 Docker

```bash
# Build y arrancar todos los servicios
docker compose up --build -d

# Ver estado
docker compose ps

# Logs en tiempo real
docker compose logs -f app
docker compose logs -f nginx

# Detener sin perder datos
docker compose down

# Detener y limpiar volúmenes (¡pierde datos!)
docker compose down -v
```

> ⚠️ Si el contenedor `app` aparece `unhealthy` pero responde OK a `curl /api/health`, el health check está recibiendo 429 del rate limiter. Verificar que `/api/health` esté definido **antes** de `generalRateLimit` en `server/index.js`. Esta configuración es la correcta desde el fix del 2026-07-29.

## 🚀 Despliegue

El backend corre en **Docker sobre VPS**. Frontend se sirve desde el mismo contenedor Express.

```bash
# Deploy manual via SSH
ssh user@tudominio.com
cd /opt/guido-pizza
git pull origin master
docker compose up -d --build

# O via GitHub Actions: workflow deploy-prod.yml
```

Ver `DEPLOY.md` para guía completa.

## 📝 Reportar Issues

- Usar GitHub Issues con templates
- Incluir: descripción, pasos para reproducir, expected vs actual behavior
- Si aplica: logs, screenshots, stack trace

## 🔐 Seguridad

- No commitear `.env` ni variables sensibles
- No exponer secretos en logs
- Reportar vulnerabilidades por privado a los maintainers
- CRUD de empleados → el alta/edición también se hace por el CRM

## 📄 Licencia

Uso interno — Juancho's Pizza. Código cerrado.
