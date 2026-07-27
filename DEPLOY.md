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
git clone https://github.com/camilolealdev/juanchospizza.git /opt/guido-pizza
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

`nginx.conf` ya viene en el repo (auditoría 2026-07-26) — no hace falta crearlo, pero
**sí revisar `server_name` y descomentar HSTS una vez que SSL funcione**.

⚠️ **`certbot --nginx` NO sirve acá** — ese plugin espera un nginx instalado
directamente en el host (systemd), pero en este proyecto nginx corre *dentro*
de un contenedor Docker. Usar el flujo `standalone` (para el primer certificado,
con el contenedor nginx parado) o `webroot` (sin downtime, usando el
`location /.well-known/acme-challenge/` que `nginx.conf` ya expone):

```bash
# Instalar certbot (SIN el plugin de nginx, no aplica en este setup)
sudo apt install -y certbot

# Opción standalone (primera vez, con el stack parado en el puerto 80):
docker compose stop nginx
sudo certbot certonly --standalone -d tudominio.com
docker compose start nginx

# Copiar los certs al volumen que docker-compose.yml monta en ./certs
sudo mkdir -p ./certs
sudo cp /etc/letsencrypt/live/tudominio.com/fullchain.pem ./certs/
sudo cp /etc/letsencrypt/live/tudominio.com/privkey.pem ./certs/
docker compose restart nginx

# Renovación (cron/systemd timer, certbot lo agrega solo) -- agregar un
# --deploy-hook que vuelva a copiar los certs y reinicie nginx:
#   certbot renew --deploy-hook "cp /etc/letsencrypt/live/tudominio.com/*.pem /opt/guido-pizza/certs/ && cd /opt/guido-pizza && docker compose restart nginx"
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

El proyecto tiene 3 workflows en `.github/workflows/`. **No hay `ci-cd.yml`** — se
documentaba acá pero nunca se llegó a commitear; corregido 2026-07-26.

| Workflow    | Archivo                        | Disparador                  |
| ----------- | ------------------------------- | --------------------------- |
| **CI**      | `.github/workflows/ci.yml`      | Push/PR a master            |
| **Deploy**  | `.github/workflows/deploy.yml`  | Manual (`workflow_dispatch`) — deshabilitado como auto-trigger, ver nota abajo |
| **Backup**  | `.github/workflows/backup.yml`  | Cron diario 04:00 Colombia  |

### CI Pipeline (`.github/workflows/ci.yml`)

- ✅ Lint (ESLint)
- ✅ TypeScript check
- ✅ Build (Vite)
- ✅ Tests (Vitest)
- ✅ Docker build + verify
- ✅ E2E smoke (Playwright)

### ⚠️ Deploy real: NO es automático vía GitHub Actions

`deploy.yml` desplegaba vía PM2 + `git pull` a `/var/www/juanchospizza` — una
estrategia completamente distinta a Docker Compose (la que este documento
describe) y que además llamaba a un script `npm start` inexistente. Se
deshabilitó su disparo automático en cada push (auditoría 2026-07-26) para que
no corra en paralelo/en conflicto con el deploy manual de la sección anterior.

El deploy real hoy es **manual**: seguir los pasos 1-4 de arriba la primera
vez, y para actualizaciones posteriores usar `npm run deploy:prod` (SSH +
`git pull` + `docker compose up -d --build`) o entrar al VPS y correrlo a mano.

### Secrets requeridos en GitHub (solo si se usa `deploy:staging`/`deploy:prod` o se reactiva `deploy.yml`)

| Secret            | Propósito                  |
| ----------------- | -------------------------- |
| `STAGING_HOST`    | IP del servidor staging    |
| `PROD_HOST`       | IP producción               |
| `DEPLOY_SSH_KEY`  | Clave privada SSH (si se usa `deploy.yml` manual) |

---

## ✅ Post-Deploy Checklist

### Inmediato (primeros 10 min)

- [ ] `curl https://tudominio.com/api/health` → `{"status":"ok"}`
- [ ] Login como ADMIN funciona
- [ ] Login como OPERATOR funciona
- [ ] Menú digital carga correctamente
- [ ] Static assets se sirven (JS, CSS, imágenes)
- [ ] **🔴 Rotar los PINs por defecto** (1234/5678/0000/9999, sembrados por
      `server/migrate.js` y documentados públicamente en el propio README) vía
      CRM > Empleados, ANTES de compartir la URL con nadie del staff real.

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
