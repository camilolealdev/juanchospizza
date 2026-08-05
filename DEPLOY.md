# 🚀 Guía de Deploy — Juancho's Pizza / GastroPro v2.0.0

> **Última actualización:** Julio 2026  
> **Stack:** React 18 + Vite + Express + PostgreSQL + Redis + Docker  
> **Objetivo:** VPS Ubuntu con Docker Compose

---

## 📋 Prerequisitos

### Servidor VPS (mínimo recomendado)

| Recurso | Mínimo        | Recomendado  |
| ------- | ------------- | ------------ |
| CPU     | 2 cores       | 4 cores      |
| RAM     | 2 GB          | 4 GB         |
| Disco   | 20 GB SSD     | 40 GB SSD    |
| Docker  | 24+           | 24+          |
| OS      | Ubuntu 22.04+ | Ubuntu 24.04 |

### Variables de Entorno Requeridas

```bash
# ── Base de datos ─────────────────────────────────────────────
POSTGRES_PASSWORD=<generar seguro>
DATABASE_URL=postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/juanchos_pizza

# ── JWT ───────────────────────────────────────────────────────
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=15m

# ── URLs ──────────────────────────────────────────────────────
FRONTEND_URL=https://tudominio.com
ALLOWED_ORIGINS=https://tudominio.com

# ── Gemini (opcional) ─────────────────────────────────────────
GEMINI_API_KEY=       # Dejar vacío si no se usa menú inteligente

# ── Pasarelas de pago ─────────────────────────────────────────
BOLD_API_KEY=
BOLD_WEBHOOK_SECRET=
WOMPI_MERCHANT_ID=
WOMPI_EVENTS_SECRET=

# ── Push (opcional) ───────────────────────────────────────────
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@tudominio.com

# ── SMTP (opcional) ───────────────────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@tudominio.com
```

---

## 🐳 Deploy con Docker Compose (RECOMENDADO)

### 1. Preparar servidor VPS

```bash
# Instalar Docker
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker

# Agregar usuario al grupo docker (evita sudo en cada comando)
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para aplicar el grupo
```

### 2. Clonar y configurar

```bash
git clone https://github.com/camilolealdev/juanchospizza.git /opt/guido-pizza
cd /opt/guido-pizza

# Crear .env (para docker compose interpolation)
cat > .env <<EOF
POSTGRES_PASSWORD=<tu_password_seguro>
JWT_SECRET=$(openssl rand -hex 32)
ALLOWED_ORIGINS=https://tudominio.com
EOF

# Crear .env.production (para el app service)
cp .env.production.example .env.production
nano .env.production
# Completar TODAS las variables (al menos DATABASE_URL, JWT_SECRET, FRONTEND_URL)
```

### 3. Iniciar servicios

```bash
docker compose up -d

# Verificar que todo esté healthy
watch docker compose ps

# Probar health
curl -k https://localhost/api/health
```

### 4. Configurar SSL con Let's Encrypt

> ⚠️ `certbot --nginx` NO funciona acá — nginx corre dentro de Docker.  
> Usar el flujo **standalone** o **webroot**:

```bash
# Instalar certbot (SIN plugin nginx)
sudo apt install -y certbot

# Opción A — Standalone (primera vez, requiere detener nginx):
docker compose stop nginx
sudo certbot certonly --standalone -d tudominio.com
docker compose start nginx

# Opción B — Webroot (sin downtime, recomienda):
sudo certbot certonly --webroot -w /var/www/certbot -d tudominio.com

# Copiar certificados al volumen montado por docker-compose
sudo mkdir -p /opt/guido-pizza/certs
sudo cp /etc/letsencrypt/live/tudominio.com/fullchain.pem /opt/guido-pizza/certs/
sudo cp /etc/letsencrypt/live/tudominio.com/privkey.pem /opt/guido-pizza/certs/
docker compose restart nginx

# Renovación automática (certbot crea systemd timer):
# Editar /etc/letsencrypt/renewal/tudominio.com.conf y agregar:
# renew_hook = cp /etc/letsencrypt/live/tudominio.com/*.pem /opt/guido-pizza/certs/ && cd /opt/guido-pizza && docker compose restart nginx
```

### 5. Verificar seguridad SSL

```bash
curl -sI https://tudominio.com | grep -i strict-transport-security
# Debe mostrar: Strict-Transport-Security: max-age=31536000

# Tests online: https://www.ssllabs.com/ssltest/
```

### 🔥 Post-Deploy: Limpiar rate limits en Redis

Si se migra de una versión anterior (con el bug `redis.expire(ms)`), los rate limit keys viejos pueden tener TTLs enormes (~16h). Limpiar al primer deploy:

```bash
# Desde el VPS:
cd /opt/guido-pizza
docker compose exec redis redis-cli KEYS 'rl:*'  # Ver qué hay
docker compose exec redis redis-cli FLUSHALL     # Limpiar TODO
# O solo rate limits:
docker compose exec redis redis-cli EVAL "return redis.call('DEL', unpack(redis.call('KEYS', 'rl:*')))" 0
```

> ⚠️ `FLUSHALL` limpia TODO Redis — solo hacerlo si Redis solo se usa para rate limiting.

---

---

## 🔄 CI/CD con GitHub Actions

El proyecto tiene el workflow **`deploy-prod.yml`** que automatiza el deploy:

### Secrets requeridos en GitHub

| Secret         | Valor             | Ejemplo                                  |
| -------------- | ----------------- | ---------------------------------------- |
| `PROD_HOST`    | IP del VPS        | `123.123.123.123`                        |
| `PROD_USER`    | Usuario SSH       | `deploy`                                 |
| `PROD_SSH_KEY` | Clave privada SSH | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PROD_PATH`    | Ruta en VPS       | `/opt/guido-pizza`                       |
| `PROD_URL`     | URL pública       | `https://tudominio.com`                  |

### Pipeline

El workflow hace:

```
workflow_dispatch (selector de rama)
  │
  ├─ 🔍 Quality: typecheck → build → tests → lint → audit
  │
  ├─ 🐳 Docker Build Check: build + verify image
  │
  ├─ 🚀 Deploy (SSH via appleboy/ssh-action):
  │     1. git pull
  │     2. Verificar .env.production existe
  │     3. docker compose down --remove-orphans
  │     4. docker compose up -d --build
  │     5. docker image prune
  │     6. Health check (localhost:3001 → localhost fallback)
  │     7. docker compose ps (estado final)
  │
  └─ 🔥 Smoke Test: Playwright contra URL producción
```

### Cómo usar

1. Ir a GitHub → Actions → "🚀 Deploy Production (Docker Compose)"
2. Click "Run workflow"
3. Seleccionar rama (`master`)
4. Click "Run"

### Actualizaciones manuales (sin GitHub Actions)

```bash
# Conectarse al VPS y ejecutar:
ssh deploy@tudominio.com
cd /opt/guido-pizza
git pull origin master
docker compose up -d --build
```

---

## ✅ Post-Deploy Checklist

### Inmediato (primeros 10 min)

- [ ] `curl https://tudominio.com/api/health` → `{"status":"healthy", ... "services":{"database":"connected","redis":"connected"}}` (la forma real del health en `server/index.js`, que incluye uptime y estado de DB/Redis)
- [ ] Login como ADMIN funciona
- [ ] Login como OPERATOR funciona
- [ ] Menú digital carga correctamente
- [ ] Static assets se sirven (JS, CSS, imágenes, iconos)
- [ ] PWA manifest se carga: `curl https://tudominio.com/manifest.webmanifest`
- [ ] **🔴 Rotar los PINs por defecto** (1234/5678/0000/9999) vía CRM > Empleados

### Primeras 24 horas

- [ ] Crear pedido de prueba → método de pago Bold
- [ ] Verificar WebSocket se conecta
- [ ] Probar cambio de estado de pedido
- [ ] Verificar dashboard muestra datos
- [ ] Probar impresión de ticket de cocina
- [ ] Verificar apple-touch-icon en iOS: `curl https://tudominio.com/apple-touch-icon.png`

### Primera semana

- [ ] Monitorear logs: `docker compose logs -f app`
- [ ] Verificar backups de BD (configurados en docker-compose)
- [ ] Revisar rate limiting en producción
- [ ] Verificar SSL/TLS (https://www.ssllabs.com/ssltest/)
- [ ] Monitorear recursos: `docker stats`

---

## 🛟 Rollback

```bash
# Docker Compose: volver a versión anterior
docker compose down
git checkout <commit-anterior>
docker compose up -d --build

# GitHub Actions: re-ejecutar workflow con commit anterior
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

# Uso de disco
docker system df
```

---

## 🔒 Seguridad en Producción

- ✅ **JWT**: Firma HMAC-SHA256 con `JWT_SECRET` único
- ✅ **Rate limit**: 100 req/min general, 10 intentos/15min login
- ✅ **Helmet**: CSP, HSTS, X-Frame-Options activos
- ✅ **PG Pool**: Máximo 20 conexiones simultáneas
- ✅ **Cookie HttpOnly**: JWT solo accesible por HTTP
- ✅ **Docker**: Non-root user + read-only filesystem + cap_drop ALL
- ✅ **CORS**: Solo orígenes en `ALLOWED_ORIGINS`
- ✅ **CSRF**: Token por sesión
- ✅ **SSL**: TLS 1.2/1.3 con ciphers OWASP B-grade
- ✅ **Webhooks**: Falla cerrada (503) si falta secret

---

## 🐳 Comandos Docker Útiles

```bash
# Build sin cache (útil después de cambiar package.json)
docker compose build --no-cache app

# Ver logs de un servicio específico
docker compose logs -f nginx

# Ejecutar comando dentro del contenedor
docker compose exec app node server/migrate.js

# Respaldar BD
docker compose exec postgres pg_dump -U postgres juanchos_pizza > backup.sql

# Restaurar BD
cat backup.sql | docker compose exec -T postgres psql -U postgres juanchos_pizza

# Limpiar todo (volúmenes incluidos)
docker compose down -v
```

---

_Documento generado Julio 2026 — Próxima actualización: post-deploy o cambio de infraestructura._
