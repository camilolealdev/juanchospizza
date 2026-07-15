# Contribuyendo a Juancho's Pizza / GastroPro

Gracias por tu interés en contribuir. Este documento describe las convenciones y procesos del proyecto.

## 📋 Stack

| Capa     | Tecnología                                  |
| -------- | ------------------------------------------- |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend  | Express.js + Node.js + ESM                  |
| DB       | PostgreSQL                                  |
| Tests    | Vitest + Playwright                         |
| IA       | Google Gemini SDK                           |
| Infra    | Docker + docker-compose                     |

## 🧑‍💻 Setup Local

```bash
# 1. Clonar
git clone https://github.com/jastigoga/pizzeria
cd pizzeria

# 2. Instalar
npm install

# 3. Variables de entorno
cp .env.example .env
# Completar DATABASE_URL, GEMINI_API_KEY, etc.

# 4. Base de datos
docker compose up -d postgres

# 5. Iniciar desarrollo (frontend + backend)
npm run dev:all
```

## 🏗️ Estructura del Proyecto

```
├── src/                    # Frontend React
│   ├── components/         # Componentes compartidos
│   ├── views/roles/        # Vistas del CRM (17 módulos)
│   ├── services/           # API client, servicios
│   ├── types/              # Tipos TypeScript
│   └── context/            # Contextos (Cart, Auth)
├── server/                 # Backend Express
│   ├── routes/             # Rutas por recurso (29 archivos)
│   ├── schemas/            # Validación Zod
│   ├── middleware/         # Auth, rate limit, service key
│   ├── workers/            # BullsMQ workers (email, PDF, reports, etc.)
│   ├── auth.js             # Lógica de autenticación
│   ├── db.js               # Conexión + initDB
│   └── migrate.js          # Sistema de migraciones
├── docs/                   # Documentación
├── _legacy/                # Código legacy archivado
└── index.html              # Landing page (entry point)
```

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
# Tests unitarios
npm test

# Tests E2E (requiere frontend+backend corriendo)
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
# Build
npm run docker:build

# Iniciar todos los servicios
npm run docker:run

# Logs
npm run docker:logs

# Detener y limpiar
npm run docker:clean
```

## 🚀 Despliegue

Frontend (Vercel): Se deploya automáticamente desde `main`.
Backend: Docker en VPS (Railway/Render/Fly.io recomendados).

```bash
# Staging
npm run deploy:staging

# Producción
npm run deploy:prod
```

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
