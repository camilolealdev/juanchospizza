# GUIDO PIZZA - GUÍA DE DESPLIEGUE EN NUEVO SERVIDOR
=====================================================

## 📋 RESUMEN DE LO IMPLEMENTADO

### Stack Completo
- **App**: Node.js 22 + Express + Vite/React (puerto 3001)
- **Worker**: BullMQ + Redis (procesos background: email, PDF, reports, push, webhooks)
- **Nginx**: Reverse proxy + TLS termination + rate limiting (puertos 80/443)
- **PostgreSQL 17**: Base de datos principal
- **Redis 8**: Cache + colas BullMQ + sessions

### Hardening de Seguridad (Producción)
- ✅ Non-root user (UID 1001)
- ✅ `read_only: true` + `tmpfs` en `/tmp`, `/var/cache`
- ✅ `cap_drop: ALL`, `no-new-privileges: true`
- ✅ Resource limits (CPU/Memory) en todos los servicios
- ✅ Red interna aislada (`internal: true`)
- ✅ Health checks en todos los servicios
- ✅ Logging con rotación (10MB x 3)
- ✅ Rate limiting por zona (api: 100r/s, auth: 10r/s, webhooks: 50r/s)
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)

---

## 🚀 PASOS PARA DESPLEGAR EN NUEVO SERVIDOR

### 1. REQUISITOS DEL SERVIDOR
```bash
# Ubuntu 22.04/24.04 o Debian 12
# Mínimo: 2 vCPU, 4GB RAM, 20GB SSD
# Puertos abiertos: 22 (SSH), 80, 443

# Instalar Docker + Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker version
docker compose version
```

### 2. CLONAR Y PREPARAR
```bash
# Clonar repo
git clone https://github.com/TU_USUARIO/guido-pizza.git
cd guido-pizza/pizzeria-master

# Verificar archivos críticos existen
ls -la Dockerfile docker-compose.yml nginx.conf .env.production.example
```

### 3. CONFIGURAR SECRETS (CRÍTICO)
```bash
# Copiar template
cp .env.production.example .env.production

# EDITAR .env.production CON VALORES REALES:
# - POSTGRES_PASSWORD: contraseña segura BD
# - JWT_SECRET: openssl rand -hex 32 (mín 32 chars)
# - GEMINI_API_KEY: tu key de Google AI Studio
# - ALLOWED_ORIGINS: https://tudominio.com,https://www.tudominio.com
# - BOLD_API_KEY, BOLD_WEBHOOK_SECRET: credenciales Bold
# - MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET: credenciales MercadoPago
# - WOMPI_MERCHANT_ID, WOMPI_EVENTS_SECRET: credenciales Wompi
# - PAYPAL_CLIENT_ID: credenciales PayPal
# - SMTP_*: credenciales email (Gmail, SendGrid, etc.)
# - VAPID_*: claves push (npx web-push generate-vapid-keys)
# - PG_POOL_MAX=20, PG_IDLE_TIMEOUT=30000, PG_CONNECT_TIMEOUT=5000
```

### 4. CERTIFICADOS TLS
```bash
mkdir -p certs

# OPCIÓN A: Let's Encrypt (recomendado)
# Requiere dominio apuntando al servidor
sudo apt install certbot
sudo certbot certonly --standalone -d tudominio.com -d www.tudominio.com
sudo cp /etc/letsencrypt/live/tudominio.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/tudominio.com/privkey.pem certs/
sudo chown $USER:$USER certs/*

# OPCIÓN B: Certificados propios
# cp tu_fullchain.pem certs/fullchain.pem
# cp tu_privkey.pem certs/privkey.pem

# Verificar
ls -la certs/
# fullchain.pem  privkey.pem
```

### 5. BUILD Y PUSH DE IMAGEN (desde tu máquina local)
```bash
# En tu máquina de desarrollo
cd pizzeria-master

# Build
docker build -t guido-pizza:latest .

# Tag para registry
docker tag guido-pizza:latest ghcr.io/TU_USUARIO/guido-pizza:latest
# O Docker Hub: docker tag guido-pizza:latest TU_USUARIO/guido-pizza:latest

# Login y push
echo $GH_TOKEN | docker login ghcr.io -u TU_USUARIO --password-stdin
docker push ghcr.io/TU_USUARIO/guido-pizza:latest
```

### 6. EN EL SERVIDOR: PULL Y DEPLOY
```bash
# En el servidor nuevo
cd guido-pizza/pizzeria-master

# Login registry (si imagen privada)
echo $GH_TOKEN | docker login ghcr.io -u TU_USUARIO --password-stdin

# Pull imagen
docker pull ghcr.io/TU_USUARIO/guido-pizza:latest

# Tag local para compose
docker tag ghcr.io/TU_USUARIO/guido-pizza:latest guido-pizza:latest

# Deploy
docker compose --env-file .env.production up -d

# Verificar
docker compose ps
# Todos deben mostrar "healthy" o "running"
```

### 7. VERIFICACIÓN POST-DEPLOY
```bash
# Health check
curl https://tudominio.com/api/health
# {"status":"ok","timestamp":"..."}

# Ver logs
docker compose logs -f app
docker compose logs -f worker
docker compose logs -f nginx

# Verificar BD
docker compose exec postgres pg_isready -U postgres

# Verificar Redis
docker compose exec redis redis-cli ping
# PONG
```

---

## 🔧 COMANDOS ÚTILES EN PRODUCCIÓN

```bash
# Ver estado
docker compose ps

# Logs en tiempo real
docker compose logs -f --tail=100

# Reiniciar servicio específico
docker compose restart app
docker compose restart worker

# Escalar workers (si más carga)
docker compose up -d --scale worker=3

# Actualizar a nueva versión
docker pull ghcr.io/TU_USUARIO/guido-pizza:latest
docker tag ghcr.io/TU_USUARIO/guido-pizza:latest guido-pizza:latest
docker compose up -d

# Backup BD
docker compose exec postgres pg_dump -U postgres juanchos_pizza > backup_$(date +%Y%m%d).sql

# Restore BD
cat backup.sql | docker compose exec -T postgres psql -U postgres juanchos_pizza

# Limpiar espacio
docker system prune -f
docker image prune -f
```

---

## 📁 ARCHIVOS CLAVE EN EL REPO

```
pizzeria-master/
├── Dockerfile                    # Multi-stage hardened
├── docker-compose.yml            # 5 servicios + hardening
├── docker-compose.ci.yml         # Override para CI
├── nginx.conf                    # Reverse proxy TLS + rate limit
├── .env.production.example       # Template secrets
├── .dockerignore                 # Optimizado
├── deploy.sh                     # Script deploy simple
├── .github/workflows/ci-cd.yml   # Pipeline completo
├── server/
│   ├── index.js                  # App principal (puerto 3001)
│   ├── worker.js                 # Entry point workers
│   ├── db.js                     # Pool PG configurable
│   ├── redis.js                  # Cliente Redis
│   ├── queues/index.js           # Colas BullMQ
│   ├── workers/                  # 5 workers
│   │   ├── email.js              # Nodemailer + templates
│   │   ├── pdf.js                # pdf-lib (invoice, ticket, report)
│   │   ├── reports.js            # SQL reports (sales, topProducts, etc.)
│   │   ├── notifications.js      # Web Push VAPID
│   │   └── webhooks.js           # Entrega con reintentos
│   └── services/
│       ├── email.js              # Templates + sendEmail
│       ├── pdf.js                # Generación PDF
│       └── webhooks.js           # Cola + entrega
└── package.json                  # Scripts: docker:*, workers, deploy:*
```

---

## 🔐 VARIABLES DE ENTORNO REQUERIDAS

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Password PostgreSQL | `super_secure_pass_123` |
| `JWT_SECRET` | JWT signing (32+ chars) | `openssl rand -hex 32` |
| `GEMINI_API_KEY` | Google AI Studio | `AIzaSy...` |
| `ALLOWED_ORIGINS` | CORS origins | `https://tudominio.com` |
| `BOLD_API_KEY` | Bold identity key | `sk_live_...` |
| `BOLD_WEBHOOK_SECRET` | Bold webhook secret | `whsec_...` |
| `MP_ACCESS_TOKEN` | MercadoPago access token | `APP_USR-...` |
| `MP_WEBHOOK_SECRET` | MP webhook secret | `...` |
| `WOMPI_MERCHANT_ID` | Wompi merchant | `...` |
| `WOMPI_EVENTS_SECRET` | Wompi events secret | `...` |
| `PAYPAL_CLIENT_ID` | PayPal client ID | `...` |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP puerto | `587` |
| `SMTP_USER` | SMTP usuario | `noreply@tudominio.com` |
| `SMTP_PASS` | SMTP password | `app_password` |
| `SMTP_FROM` | From email | `"Guido Pizza" <noreply@tudominio.com>` |
| `VAPID_MAILTO` | VAPID contact | `mailto:admin@tudominio.com` |
| `VAPID_PUBLIC_KEY` | Web Push public | `BEl62u...` |
| `VAPID_PRIVATE_KEY` | Web Push private | `...` |
| `PG_POOL_MAX` | Pool PG app | `20` |
| `PG_POOL_MAX` | Pool PG worker | `10` |

---

## 🌐 CONFIGURACIÓN DNS

```
Tipo    Nombre    Valor
A       @         IP_DEL_SERVIDOR
A       www       IP_DEL_SERVIDOR
```

---

## 🔄 RENOVACIÓN TLS (Let's Encrypt)

```bash
# Agregar a crontab (renueva cada 60 días)
0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/tudominio.com/fullchain.pem /ruta/guido-pizza/pizzeria-master/certs/ && cp /etc/letsencrypt/live/tudominio.com/privkey.pem /ruta/guido-pizza/pizzeria-master/certs/ && docker compose -f /ruta/guido-pizza/pizzeria-master/docker-compose.yml restart nginx"
```

---

## 📊 MONITOREO BÁSICO

```bash
# Ver uso recursos
docker stats

# Ver logs nginx (accesos)
docker compose logs nginx | grep -E '(GET|POST)'

# Ver métricas app
curl https://tudominio.com/api/health
curl https://tudominio.com/api/stats  # si existe endpoint
```

---

## ✅ CHECKLIST PRE-DEPLOY

- [ ] Servidor con Docker + Compose instalado
- [ ] Dominio apuntando a IP del servidor
- [ ] `.env.production` completado con TODOS los valores reales
- [ ] Certificados TLS en `./certs/` (fullchain.pem + privkey.pem)
- [ ] Imagen construida y pusheada a registry
- [ ] Puertos 80/443 abiertos en firewall/cloud
- [ ] `docker compose --env-file .env.production up -d` exitoso
- [ ] `curl https://tudominio.com/api/health` retorna `{"status":"ok"}`
- [ ] Workers procesando colas (ver logs worker)
- [ ] Backup BD programado

---

## 🆘 TROUBLESHOOTING COMÚN

| Problema | Solución |
|----------|----------|
| `health check failed` | Verificar BD accesible, logs `docker compose logs app` |
| `502 Bad Gateway` | Nginx no llega a app: `docker compose logs nginx`, verificar `app:3001` |
| `SSL certificate error` | Verificar `certs/fullchain.pem` y `privkey.pem` existen y son válidos |
| `Worker no procesa` | Verificar Redis: `docker compose exec redis redis-cli ping`, logs worker |
| `Out of memory` | Aumentar `memory` en `docker-compose.yml` o escalar workers |
| `Rate limited` | Ajustar `limit_req_zone` en `nginx.conf` |

---

**Última actualización**: 2026-07-15  
**Versión**: 2.0.0  
**Estado**: Listo para producción