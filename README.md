# 🍕 Juancho's Pizza — GastroPro CRM & Landing Page

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-8-FF4438?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-521%2F521-brightgreen)
![PWA](https://img.shields.io/badge/PWA-✅-purple)

> **Juancho's Pizza** — Pizzería artesanal con sedes en **Nemocón** y **Zipaquirá**, Cundinamarca, Colombia.  
> **GastroPro CRM** — Sistema administrativo completo con 17 módulos de gestión.

---

## ✨ Stack

| Capa         | Tecnología                                    | Estado        |
| ------------ | --------------------------------------------- | ------------- |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS   | ✅ Producción |
| **Backend**  | Express.js + Node.js ESM + Zod validación     | ✅ Producción |
| **DB**       | PostgreSQL 17                                 | ✅ Docker     |
| **Cache**    | Redis 8 (AOF + LRU eviction)                  | ✅ Docker     |
| **Proxy**    | Nginx 1.31 (SSL, rate-limit, WebSocket)       | ✅ Docker     |
| **Auth**     | JWT (HMAC-SHA256) + PBKDF2 + HttpOnly cookies | ✅ Producción |
| **IA**       | Google Gemini (menú inteligente opcional)     | ⚠️ Opcional   |
| **Pagos**    | Bold (Colombia)                               | ✅ Listo      |
| **PWA**      | Service Worker + manifest + icons             | ✅ Listo      |
| **Tests**    | Vitest (521 tests) + Playwright (E2E)         | ✅ CI         |

---

## 🏗️ Arquitectura

El proyecto usa un **patrón híbrido**: landing page estática (`index.html`) para el sitio público + **GastroPro CRM** (SPA React 18) que se monta como overlay administrativo con `createPortal`.

```
┌─────────────────────────────────────────────────────────┐
│  index.html (Landing pública — carga instantánea)       │
│  ├── MenuDigital (portal vía #menu-mount)               │
│  ├── CartSection (portal vía #cart-mount)               │
│  ├── Reviews (portal vía #reviews-mount)                 │
│  └── GastroPro CRM (monta en #root con login)           │
├─────────────────────────────────────────────────────────┤
│  nginx (SSL termination + rate-limit + proxy reverso)    │
├─────────────────────────────────────────────────────────┤
│  Express API (32 rutas) — PostgreSQL — Redis             │
└─────────────────────────────────────────────────────────┘
```

> Ver **[ARCHITECTURE.md](./ARCHITECTURE.md)** para el detalle completo de decisiones técnicas.

---

## 🚀 Módulos GastroPro CRM

| Módulo                   | Descripción                                              | Estado |
| ------------------------ | -------------------------------------------------------- | ------ |
| **Dashboard**            | Métricas real-time, heatmap, proyecciones                | ✅     |
| **Menú Inteligente**     | Productos, variantes, combos, promociones                | ✅     |
| **Inventario & Recetas** | Stock, costos por receta, alertas                        | ✅     |
| **CRM Clientes**         | Historial, tags, segmentación VIP                        | ✅     |
| **Fidelización**         | Puntos, niveles, retos                                   | ✅     |
| **Campañas**             | Flash, cupones, segmentadas                              | ✅     |
| **Finanzas**             | Ingresos, egresos, flujo de caja                         | ✅     |
| **Comandas**             | Mesas, splits, kitchen tickets                           | ✅     |
| **Digiturno**            | Tickets virtuales multi-sede                             | ✅     |
| **Facturación DIAN**     | Estructura/adapters listos; activación externa pendiente | ⚠️     |
| **Reportes**             | Informes detallados                                      | ✅     |
| **Caja**                 | Registro de caja por turno                               | ✅     |
| **Propinas**             | Gestión de propinas                                      | ✅     |

---

## 💳 Pasarelas de Pago

| Pasarela                         | País        | Estado        | Notas                                                             |
| -------------------------------- | ----------- | ------------- | ----------------------------------------------------------------- |
| **Bold**                         | 🇨🇴 Colombia | ✅ Producción | Payment links + webhook HMAC-SHA256                               |
| **MercadoPago / Wompi / PayPal** | 🌎          | ⛔ No activos | No forman parte del flujo online vigente; solo Bold está expuesto |

> **El webhook activo de Bold falla cerrado (503)** si falta su secreto de verificación. Las integraciones históricas de otros proveedores no están activas.

---

## 🐳 Quick Start con Docker

```bash
# 1. Clonar
git clone https://github.com/tu-repo/juanchospizza.git
cd juanchospizza

# 2. Crear .env para Docker Compose (interpolación de variables)
cp .env.production.example .env.production
# Editar .env.production con al menos POSTGRES_PASSWORD y JWT_SECRET

# 3. Crear .env (necesario para docker compose)
cat > .env <<EOF
POSTGRES_PASSWORD=devpassword123
JWT_SECRET=dev-jwt-secret-cambiar-en-prod
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80,http://localhost
EOF

# 4. Generar certs SSL para desarrollo local
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/privkey.pem -out certs/fullchain.pem \
  -subj "/C=CO/ST=Cundinamarca/L=Local/O=Dev/CN=localhost"

# 5. Build e iniciar
docker compose up --build -d

# 6. Verificar
curl -sk https://localhost/api/health
# → {"status":"healthy", ...}
```

---

## 📦 Iconos PWA

| Icono                  | Tamaño    | Propósito                |
| ---------------------- | --------- | ------------------------ |
| `favicon.svg`          | Vectorial | Navegadores modernos     |
| `favicon.png`          | 32×32     | Fallback PNG             |
| `favicon.ico`          | 32×32     | Legacy                   |
| `apple-touch-icon.png` | 180×180   | iOS home screen          |
| `pwa-192x192.png`      | 192×192   | PWA manifest             |
| `pwa-512x512.png`      | 512×512   | PWA + maskable (Android) |

Los SVGs fueron diseñados con temática de pizza artesanal: masa dorada, pepperoni, aceitunas, pimientos, queso derretido y fondo naranja degradado.

---

## 🔐 Roles y Acceso CRM

| Rol               | PIN (⚠️ rotar en prod) | Acceso                     |
| ----------------- | ---------------------- | -------------------------- |
| **Administrador** | `1234`                 | Total — todos los módulos  |
| **Cocina**        | `5678`                 | Pedidos, comandas, estados |
| **Repartidor**    | `0000`                 | Entregas                   |
| **Marketing**     | `9999`                 | Campañas, clientes         |

> 🔴 **IMPORTANTE**: Rotar los PINs por defecto ANTES de producción vía CRM > Empleados.

---

## 📋 Scripts

```bash
npm run dev          # Frontend + Backend en dev
npm run build        # Build producción (Vite)
npm test             # Tests unitarios (Vitest)
npm run test:e2e     # Tests E2E (Playwright)
npm run lint         # ESLint
npm run docker:build # Docker image build
npm run docker:run   # Docker Compose up
```

---

## 🚀 CI/CD

| Workflow          | Archivo                                   | Trigger                                            |
| ----------------- | ----------------------------------------- | -------------------------------------------------- |
| **CI**            | `.github/workflows/ci.yml`                | Push/PR a master                                   |
| **Deploy**        | `.github/workflows/deploy.yml`            | Manual (PM2 legado)                                |
| **Deploy Docker** | `.github/workflows/deploy-prod.yml`       | Manual con branch selector                         |
| **Backup**        | `.github/workflows/backup.yml` + cron VPS | GH no alcanza Postgres interno; cron VPS requerido |

> El workflow **`deploy-prod.yml`** usa `appleboy/ssh-action` para hacer deploy con Docker Compose via SSH:
> `quality → docker-check → deploy (git pull + compose up -d --build + healthcheck) → smoke test`

---

## 📊 Tests

```bash
npx vitest run        # 521 tests, 47 archivos
npx tsc --noEmit      # 0 errors
npx vite build        # Build limpio
npx playwright test    # E2E (requiere servidor)
```

---

## 📚 Documentación

| Documento         | Contenido                            |
| ----------------- | ------------------------------------ |
| `ARCHITECTURE.md` | Decisiones técnicas, patrones, deuda |
| `DEPLOY.md`       | Guía completa de despliegue VPS      |
| `CHANGELOG.md`    | Historial de versiones               |
| `CONTRIBUTING.md` | Cómo contribuir                      |
| `docs/`           | Auditorías, planes, PRD, TRD         |

---

## 🔒 Seguridad

| Badge                                                                                   | Estado                                                         |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ![Security Audit](https://img.shields.io/badge/Security_Audit-2026--07--29-brightgreen) | ✅ 0 hardcoded secrets, 31/31 rutas con queries parametrizadas |
| ![Secrets Scan](https://img.shields.io/badge/Secrets-0_encontrados-green)               | `server/`, `src/`, `routes/` — 0 secrets hardcodeados          |
| ![SQL Injection](https://img.shields.io/badge/SQLi-✅_prevenido-green)                  | 100% queries con `$N` parametrizados                           |

- ✅ **JWT** HMAC-SHA256 con HttpOnly cookies + refresh automático
- ✅ **Rate limiting** multi-zona (general + login + API) con Redis (fallback memoria), health/metrics bypass
- ✅ **Helmet** CSP, HSTS, X-Frame-Options
- ✅ **Input validation** Zod en todos los endpoints
- ✅ **SQL injection** prevención (parámetros `$1` en 30/30 rutas)
- ✅ **PBKDF2 + SHA-512** hash de PINs
- ✅ **Docker** non-root user + read-only FS + cap_drop ALL + redes separadas
- ✅ **CORS** solo orígenes autorizados
- ✅ **CSRF** token por sesión
- ✅ **Falla cerrada** webhooks sin secret → 503
- ✅ **`.gitignore`** protege `.env`, `certs/`, `test-results/`, `graphify-out/`
- ✅ **Docker HEALTHCHECK** bypass de rate limiter (fix 2026-07-29)
- ✅ **`redis.expire()`** corregido — ms→segundos (fix crítico 2026-07-29)

---

## 🗺️ Roadmap

- [ ] Activar emisión DIAN end-to-end (estructura y adapters implementados; faltan datos/certificado/credenciales y habilitación)
- [ ] Integración real MercadoPago Colombia (PSE/Nequi)
- [ ] Dashboard con gráficos avanzados
- [ ] App móvil (React Native / PWA avanzada)
- [ ] Multi-sede con inventario separado
- [ ] Reportes exportables (Excel/PDF)

---

> **Estado de documentación:** revisado el 2026-08-18. Los pendientes vigentes son DIAN end-to-end, configuración/validación externa de Bold y SMTP, cron diario de backups en VPS, recarga de nginx, monitoreo n8n y decisiones de producto explícitas; los demás pendientes históricos deben contrastarse con `docs/REVISION_6_FRENTES_2026-08-17.md`.

<p align="center">
  <strong>Juancho's Pizza</strong> — Nemocón & Zipaquirá, Cundinamarca, Colombia<br>
  <em>Hecho con ❤️ por <a href="https://easy-marketing.xyz">easy-marketing.xyz</a></em>
</p>
