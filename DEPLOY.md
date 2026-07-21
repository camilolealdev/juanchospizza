# 🚀 Guía de Deploy — Juancho's Pizza / GastroPro v2.0.0

> **Última actualización:** Julio 2026
> **Stack:** React 18 + Vite + Express + PostgreSQL + Redis + Docker

---

## 📋 Prerequisitos

### Variables de Entorno Requeridas

```bash
# Obligatorias (sin estas no arranca)
DATABASE_URL=postgres://user:password@host:5432/juanchos_pizza
JWT_SECRET=<generar con: openssl rand -hex 32>
FRONTEND_URL=https://tudominio.com

# Opcionales pero recomendadas
GEMINI_API_KEY=          # Menú inteligente (Google AI Studio)
POSTGRES_PASSWORD=       # Docker Compose
ALLOWED_ORIGINS=https://tudominio.com

# Pasarelas de pago (opcionales hasta activarlas)
BOLD_API_KEY=
MP_ACCESS_TOKEN=
WOMPI_MERCHANT_ID=
PAYPAL_CLIENT_ID=

# Push Notifications
VAPID_PUBLIC_KEY=        # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
```

---

## 🐳 Opción 1: Docker Compose (Recomendada)

### 1. Preparar servidor

```bash
# Requisitos: Ubuntu 22.04+, Docker 24+, Docker Compose v2
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

### 2. Clonar y configurar

```bash
git clone https://github.com/jastigoga/pizzeria.git /opt/guido-pizza
cd /opt/guido-pizza

# Crear .env.production con todas las variables
# (.env.production.example es el comprehensive actualizado; .env.example también existe pero está incompleto)
cp .env.production.example .env.production
nano .env.production

# Generar JWT_SECRET
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env.production
```

### 3. Iniciar servicios

```bash
docker compose up -d
# Verificar health
docker compose ps
curl http://localhost:3001/api/health
```

### 4. Configurar Nginx + SSL

```bash
# Instalar certbot para SSL
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tudominio.com

# El docker-compose incluye Nginx como reverse proxy
# Editar ./nginx.conf con tu dominio real antes del primer deploy
```

---

## ☁️ Opción 2: Railway / Render / Fly.io

### Railway (recomendado para Colombia)

```bash
# 1. Crear cuenta en railway.com
# 2. Conectar repositorio GitHub
# 3. Crear servicio web
#    - Root directory: pizzeria-merge/   (ajusta al nombre del worktree activo de tu fork)
#    - Start command: node server/index.js
# 4. Agregar PostgreSQL (Railway lo provisiona automáticamente)
# 5. Configurar variables de entorno en Railway Dashboard
# 6. Deploy automático en cada push a master
```

### Variables requeridas en Railway

| Variable         | Valor                       | Dónde obtener                                              |
| ---------------- | --------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`   | `postgres://...`            | Lo provee Railway al agregar PostgreSQL                    |
| `JWT_SECRET`     | rand 32 hex                 | `openssl rand -hex 32`                                     |
| `FRONTEND_URL`   | `https://tuapp.railway.app` | URL que asigna Railway                                     |
| `NODE_ENV`       | `production`                | Fijo                                                       |
| `GEMINI_API_KEY` | `AIza...`                   | [Google AI Studio](https://aistudio.google.com/app/apikey) |

---

## 🔄 CI/CD Pipeline

El proyecto incluye GitHub Actions listo:

| Workflow           | Archivo                       | Disparador             |
| ------------------ | ----------------------------- | ---------------------- |
| **CI**             | `.github/workflows/ci.yml`    | Push/PR a master       |
| **CI/CD completo** | `.github/workflows/ci-cd.yml` | Push a main + dispatch |

### CI Pipeline (`.github/workflows/ci.yml`)

- ✅ Lint (ESLint)
- ✅ TypeScript check
- ✅ Build (Vite)
- ✅ Tests (Vitest)
- ✅ Dependency audit

### CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

1. ✅ Lint & Test
2. ✅ Docker Build + Trivy Scan
3. ✅ E2E Tests (Playwright)
4. ✅ Deploy a Staging
5. ✅ Deploy a Production (solo tags v* o dispatch manual)

### Secrets requeridos en GitHub

| Secret            | Propósito                  |
| ----------------- | -------------------------- |
| `DEPLOY_HOST`     | IP del servidor producción |
| `DEPLOY_USER`     | Usuario SSH                |
| `DEPLOY_SSH_KEY`  | Clave privada SSH          |
| `STAGING_HOST`    | IP del servidor staging    |
| `STAGING_USER`    | Usuario SSH staging        |
| `STAGING_SSH_KEY` | Clave SSH staging          |
| `PROD_HOST`       | IP producción              |
| `PROD_USER`       | Usuario SSH producción     |
| `PROD_SSH_KEY`    | Clave SSH producción       |

---

## ✅ Post-Deploy Checklist

### Inmediato (primeros 10 min)

- [ ] `curl https://tudominio.com/api/health` → `{"status":"ok"}`
- [ ] Login como ADMIN funciona
- [ ] Login como OPERATOR funciona
- [ ] Menú digital carga correctamente
- [ ] Static assets se sirven (JS, CSS, imágenes)

### Primeras 24 horas

- [ ] Crear un pedido de prueba
- [ ] Verificar que el WebSocket se conecta
- [ ] Probar cambio de estado de pedido
- [ ] Verificar que el dashboard muestra datos
- [ ] Probar impresión de ticket de cocina

### Primera semana

- [ ] Monitorear logs del servidor (`docker compose logs -f`)
- [ ] Verificar backups de BD (configurados en docker-compose)
- [ ] Revisar rate limiting en producción
- [ ] Verificar SSL/TLS (https://www.ssllabs.com/ssltest/)

---

## 🛟 Rollback

```bash
# Docker Compose: volver a versión anterior
docker compose down
git checkout <commit-anterior>
docker compose up -d

# Railway: usar el Dashboard → Deployments → Previous → Promote
```

---

## 📊 Monitoreo

```bash
# Logs en tiempo real
docker compose logs -f app
docker compose logs -f nginx

# Health check
curl https://tudominio.com/api/health

# Estadísticas del contenedor
docker stats
```

---

## 🔒 Seguridad en Producción

- ✅ **JWT**: Firma HMAC-SHA256 con `JWT_SECRET` único
- ✅ **Rate limit**: 100 req/min general, 10 intentos/15min login
- ✅ **Helmet**: CSP, HSTS, X-Frame-Options activos
- ✅ **PG Pool**: Máximo 20 conexiones simultáneas
- ✅ **Cookie HttpOnly**: JWT solo accesible por HTTP
- ✅ **Docker**: Non-root user + read-only filesystem
- ✅ **CORS**: Solo orígenes en `ALLOWED_ORIGINS`

---

_Documento generado Julio 2026 — Próxima actualización: post-deploy o cambio de infraestructura._
