# 🚀 Checklist de Deploy en Vivo — Juancho's Pizza / GastroPro

> Runbook paso a paso para llevar el stack a producción: **VPS → DNS → TLS (certbot) → `docker compose up -d` → verificación de health endpoints**.
> Stack real (4 servicios): `app` (Node 22 + Express + Vite/React, puerto **3001**) · `nginx` (TLS + reverse proxy, **80/443**) · `postgres:17-alpine` · `redis:8-alpine`.
> Estado base verificado el **2026-08-06**; revisado el **2026-08-18**. La suite actual y el workflow vigente deben considerarse la fuente de verdad. `FRONTEND_URL`, `ALLOWED_ORIGINS` y comandos de este documento usan `juanchospizza.com`.

---

## 📊 Estado pre-deploy (verificado en este repo)

| Ítem                                                    | Estado                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `master` pusheado a `origin` (`4216639`)                | ✅                                                                             |
| Suite/lint/typecheck                                    | ✅ Verificados en la revisión 2026-08-18                                       |
| `JWT_SECRET` + claves VAPID en `.env.production`        | ✅ generados                                                                   |
| `docker compose config --quiet` (con `.env.production`) | ✅ exit 0                                                                      |
| `VITE_API_URL` en `.env.production`                     | ✅ Puede quedar vacío → el frontend usa rutas relativas en `juanchospizza.com` |
| 🔴 `FRONTEND_URL` / `ALLOWED_ORIGINS`                   | ⚠️ reemplazar `localhost` por `https://juanchospizza.com`                      |
| 🔴 `certs/fullchain.pem`                                | ⚠️ **self-signed `CN=localhost`** → reemplazar con Let's Encrypt               |
| Credenciales reales (pagos/SMTP/Gemini/DIAN)            | ⬜ pendiente (ver `docs/ENV_PRODUCTION_GUIDE.md`)                              |

---

## Fase 0 — Prerequisitos (en tu máquina)

- [ ] **Dominio comprado** y acceso al panel DNS del registrador.
- [ ] **`.env.production` finalizado** localmente (guía: `docs/ENV_PRODUCTION_GUIDE.md`) con al menos:
  - `FRONTEND_URL=https://juanchospizza.com` (obligatoria, fail-fast al boot)
  - `ALLOWED_ORIGINS=https://juanchospizza.com,https://www.juanchospizza.com`
  - `VITE_API_URL=` (vacía: API en el mismo origen; solo llenarla si se separa el backend)
  - `PUBLIC_URL=https://juanchospizza.com` (QR del menú)
- [ ] **GitHub Secrets** configurados para el deploy automático (Fase 7):
      `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`, `PROD_PATH`, `PROD_URL`.
- [ ] Validación local rápida antes de tocar el servidor:

```bash
docker compose --env-file .env.production config --quiet && echo "compose OK"
npx vitest run --reporter=dot 2>&1 | tail -3   # 309 passed
```

---

## Fase 1 — Crear el VPS

**Specs mínimas** (según límites de recursos del compose: app 1G + postgres 1G + redis 512M + nginx 128M → **4 GB RAM**):

| Recurso   | Mínimo                       | Recomendado                 |
| --------- | ---------------------------- | --------------------------- |
| CPU       | 2 vCPU                       | 2 vCPU                      |
| RAM       | 4 GB                         | 4 GB                        |
| Disco SSD | 40 GB                        | 60 GB (volúmenes + backups) |
| SO        | Ubuntu 24.04 LTS / Debian 12 | Ubuntu 24.04 LTS            |

- [ ] **Crear el droplet/instancia** (ej. Hetzner CX32 ~€8/mes, DigitalOcean droplet 4GB). Anotar la **IPv4 pública**.
- [ ] **Firewall del proveedor (cloud)** → abrir solo `22`, `80`, `443`.
- [ ] (Opcional) **Swap 2 GB** para evitar OOM en picos de build: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` (+ línea en `/etc/fstab`).

> Alternativa sin VPS: Railway/Render con `docker-compose.yml` — pero este runbook asume VPS (flujo del workflow `deploy-prod.yml`).

---

## Fase 2 — DNS

- [ ] Crear registros **A** en el panel DNS del dominio:

```
Tipo    Nombre    Valor
A       @         <IP_DEL_VPS>
A       www       <IP_DEL_VPS>
```

- [ ] **Esperar propagación** y verificar desde tu máquina:

```bash
dig +short juanchospizza.com        # → debe mostrar la IP del VPS
dig +short www.juanchospizza.com    # → debe mostrar la IP del VPS
```

> 💡 Si el DNS tarda, https://dnschecker.org ayuda a ver por región. **No seguir a la Fase 5 sin DNS resuelto** (certbot lo necesita).

---

## Fase 3 — Hardening SSH + instalar Docker

```bash
# Conectarse como root
ssh root@<IP_DEL_VPS>

# 1. Usuario deploy (no-root) + llaves
adduser deploy
usermod -aG sudo deploy
# En TU máquina: ssh-keygen -t ed25519; luego
mkdir -p /home/deploy/.ssh
# pegar TU clave pública en /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# 2. Deshabilitar login por password y root (editar /etc/ssh/sshd_config)
#   PasswordAuthentication no
#   PermitRootLogin no
systemctl restart ssh

# 3. Firewall UFW
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
ufw status verbose   # 22,80,443 = ALLOW

# 4. Docker + Compose
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
# (cerrar sesión y volver a entrar como deploy)
newgrp docker
docker version && docker compose version   # ambos deben responder
```

- [ ] Conectarse ya solo como `deploy` con la llave.
- [ ] (Opcional, recomendado) `apt install fail2ban` para SSH.

---

## Fase 4 — Código + `.env.production` en el servidor

```bash
# En el VPS como deploy
sudo mkdir -p /opt/guido-pizza && sudo chown deploy:deploy /opt/guido-pizza
cd /opt/guido-pizza
git clone https://github.com/camilolealdev/juanchospizza.git .
git checkout master && git pull origin master

# Desde TU máquina: subir el .env.production ya completado
scp .env.production deploy@<IP_DEL_VPS>:/opt/guido-pizza/.env.production

# En el VPS: reemplazar los valores de localhost por el dominio real
cd /opt/guido-pizza
sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://juanchospizza.com|' .env.production
sed -i 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://juanchospizza.com,https://www.juanchospizza.com|' .env.production
# Agregar (si no existen):
grep -q '^VITE_API_URL=' .env.production || echo 'VITE_API_URL=https://juanchospizza.com' >> .env.production
grep -q '^PUBLIC_URL=' .env.production || echo 'PUBLIC_URL=https://api.juanchospizza.com' >> .env.production

# Verificación de que no queda nada en localhost (fail-fast de config.js: DATABASE_URL + FRONTEND_URL)
grep -E '^(FRONTEND_URL|ALLOWED_ORIGINS|VITE_API_URL|PUBLIC_URL|DATABASE_URL)=' .env.production
```

- [ ] **El `.env.production` del servidor se conserva entre deploys** (es gitignored; el workflow hace `git pull` sin tocarlo). Guardar un backup: `cp .env.production .env.production.bak` (y mantenerlo fuera del repo).

---

## Fase 5 — TLS con certbot

> 🔴 **Antes de seguir**: el `certs/` actual contiene un certificado **self-signed `CN=localhost`** — hay que reemplazarlo:

```bash
# Verificar qué hay hoy (debe decir issuer=Let's Encrypt y tu dominio; si dice CN=localhost, reemplazar)
openssl x509 -in /opt/guido-pizza/certs/fullchain.pem -noout -subject -issuer -dates
```

### 5.1 Emisión inicial (standalone — puerto 80 libre, nginx aún NO está levantado)

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone \
  -d juanchospizza.com -d www.juanchospizza.com \
  --non-interactive --agree-tos -m admin@juanchospizza.com

# Copiar al directorio que monta nginx (docker-compose monta ./certs)
sudo cp /etc/letsencrypt/live/juanchospizza.com/fullchain.pem /opt/guido-pizza/certs/
sudo cp /etc/letsencrypt/live/juanchospizza.com/privkey.pem /opt/guido-pizza/certs/
sudo chown deploy:deploy /opt/guido-pizza/certs/*

# Verificar
openssl x509 -in /opt/guido-pizza/certs/fullchain.pem -noout -subject -dates
#   subject=CN=juanchospizza.com · issuer=CN=R3,O=Let's Encrypt
```

### 5.2 Renovación automática (cada 60-90 días)

`nginx.conf` ya expone el challenge HTTP-01 en `/.well-known/acme-challenge/` (root `/var/www/certbot`), pero ese path **no está montado** en el contenedor nginx (compose solo monta `./nginx.conf` y `./certs`). Dos opciones:

**Opción A (recomendada, sin tocar compose)** — cron con stop/start de nginx:

```cron
# crontab -e  (usuario deploy)
0 3 * * * sudo certbot renew --quiet --pre-hook "docker compose -f /opt/guido-pizza/docker-compose.yml stop nginx" --deploy-hook "cp /etc/letsencrypt/live/juanchospizza.com/fullchain.pem /opt/guido-pizza/certs/ && cp /etc/letsencrypt/live/juanchospizza.com/privkey.pem /opt/guido-pizza/certs/ && docker compose -f /opt/guido-pizza/docker-compose.yml up -d nginx" --post-hook "docker compose -f /opt/guido-pizza/docker-compose.yml start nginx"
```

**Opción B (webroot, sin downtime)** — requiere un cambio de una línea en `docker-compose.yml` (servicio `nginx`, volumen `- ./certbot/www:/var/www/certbot:ro` y crear `certbot/www/`), después certbot `--webroot -w /opt/guido-pizza/certbot/www`. Útil si prefieres cero interrupciones.

- [ ] Probar renovación en seco: `sudo certbot renew --dry-run`.

---

## Fase 6 — `docker compose up -d` EN VIVO + verificación de health

```bash
cd /opt/guido-pizza

# 1. Primer build (npm ci + vite build dentro de la imagen, tarda varios minutos)
docker compose --env-file .env.production up -d --build

# 2. Estado de contenedores — TODOS deben verse "healthy"
docker compose ps
#   NAME            STATUS
#   app             Up ... (healthy)
#   nginx           Up ... (healthy)
#   postgres        Up ... (healthy)
#   redis           Up ... (healthy)
```

### 6.1 Health endpoints (verificación obligatoria)

```bash
# A) Directo al app (dentro del stack) — el HEALTHCHECK del Dockerfile pega aquí
curl -s http://localhost:3001/api/health
#   {"status":"healthy","uptime":...,"timestamp":"...","services":{"database":"connected","redis":"connected"}}

# B) A través de nginx + SSL (público)
curl -s https://juanchospizza.com/api/health
#   {"status":"healthy",...,"services":{"database":"connected","redis":"connected"}}
```

**Resultados esperados:**

| Endpoint             | Esperado                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `/api/health`        | `"status":"healthy"`, `"database":"connected"`, `"redis":"connected"`                               |
| `/api/metrics`       | texto `prom-client` (líneas `# HELP` / `http_request_duration`)                                     |
| `/api/csrf-token`    | JSON `{"csrfToken":"..."}`                                                                          |
| `GET /` (frontend)   | HTTP **200**, `index.html` con `<div id="root">`                                                    |
| Headers de seguridad | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` |

```bash
# 3. Frontend + headers
curl -sI https://juanchospizza.com/ | head -12
# 4. Métricas
curl -s https://juanchospizza.com/api/metrics | head -5
# 5. CSRF (necesario para login)
curl -s https://juanchospizza.com/api/csrf-token
# 6. Logs — sin errores de conexión a postgres/redis
docker compose logs --tail=30 app
# 7. Estado de los servicios internos
docker compose exec postgres pg_isready -U postgres   # "accepting connections"
docker compose exec redis redis-cli ping              # "PONG"
```

### 6.2 Activar HSTS (después de confirmar que SSL funciona)

```bash
# En /opt/guido-pizza/nginx.conf descomentar:
#   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
docker compose restart nginx
curl -sI https://juanchospizza.com/ | grep -i strict-transport
```

- [ ] Verificar el certificado desde el navegador (candado 🔒, sin warnings) y opcionalmente https://www.ssllabs.com/ssltest/ (target A).

---

## Fase 7 — Deploys futuros automatizados (workflow GitHub)

El pipeline `deploy-prod.yml` ya existe y hace: **quality (tsc+build+tests) → docker build check → deploy SSH (`git pull` + `docker compose up -d --build` + healthcheck) → smoke e2e**.

- [ ] Configurar en GitHub → Settings → Secrets and variables → Actions:
      `PROD_HOST` (IP), `PROD_USER` (`deploy`), `PROD_SSH_KEY` (clave privada), `PROD_PATH` (`/opt/guido-pizza`), `PROD_URL` (`https://juanchospizza.com`).
- [ ] Desplegar desde la pestaña **Actions → "🚀 Deploy Production" → Run workflow** (rama `master`).
- [ ] (Opcional) Descomentar el bloque `push:` del workflow para deploy automático en cada push a master.

---

## Fase 8 — Post-deploy operativo

- [ ] **Backup de BD** diario en el VPS: el workflow de GitHub Actions no alcanza el Postgres interno. El deploy hace backup pre-deploy; instalar además el cron local documentado en `docs/PENDIENTES_OPERACIONALES_2026-08-17.md` y probar restore.
- [ ] **Monitoreo**: ping a `/api/health` cada minuto (UptimeRobot/BetterStack) + scrape de `/api/metrics` (Prometheus o workflow n8n propuesto en los docs).
- [ ] **Credenciales reales** de pasarelas de pago (Bold recomendado), SMTP, Gemini y **DIAN** (certificado .p12 + homologación) — guía: `docs/ENV_PRODUCTION_GUIDE.md`.
- [ ] **Espacio en disco**: `docker system prune -f` (imágenes viejas ya se limpian en cada deploy) y revisar tamaño de volúmenes.
- [ ] `npm audit` y alinear Node 22 del Dockerfile con el CI (deuda conocida, no bloquea).

---

## ↩️ Rollback

```bash
cd /opt/guido-pizza
# Volver al commit anterior del código
git log --oneline -5            # elegir el commit bueno
git checkout <commit-anterior>
docker compose --env-file .env.production up -d --build

# Restaurar BD desde backup (si hubo migración problemática)
gzip -dc /backups/backup_YYYY-MM-DD.sql.gz | docker compose exec -T postgres psql -U postgres juanchos_pizza
```

---

## 🆘 Troubleshooting rápido

| Síntoma                                       | Causa probable                                                    | Fix                                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `docker compose ps` muestra app **unhealthy** | BD/Redis no listos o DB sin conexión                              | `docker compose logs app`; esperar a postgres healthy (`depends_on` ya lo ordena); revisar `DATABASE_URL` |
| **502 Bad Gateway**                           | nginx no alcanza `app:3001`                                       | `docker compose logs nginx`; `docker compose ps` (¿app corriendo?)                                        |
| Navegador: **conexión no privada**            | Cert self-signed viejo (CN=localhost)                             | Repetir Fase 5 y `docker compose restart nginx`                                                           |
| Frontend **en blanco** en prod                | `VITE_API_URL` faltó en build → bundle apunta a https://localhost | Setear `VITE_API_URL=https://dominio` en `.env.production` y `up -d --build`                              |
| **429 Too Many Requests**                     | Rate limit nginx (`zone=general 100r/s`)                          | Revisar logs; ajustar `limit_req_zone` en `nginx.conf`                                                    |
| Login no funciona                             | CSRF token no refrescado / cookies                                | Pedir `GET /api/csrf-token` antes del POST (flujo del frontend)                                           |
| **OOM kill** en build                         | RAM insuficiente para npm ci + vite                               | Subir a 4 GB o agregar swap (Fase 1)                                                                      |
| Certs no se renuevan                          | Cron sin permisos o puerto 80 ocupado                             | Probar `sudo certbot renew --dry-run`; revisar hooks del cron                                             |

---

**Última actualización:** 2026-08-06 · **Referencias:** `docs/ENV_PRODUCTION_GUIDE.md`, `docs/PENDIENTES_DEPLOY_2026-07-26.md`, `.github/workflows/deploy-prod.yml`, `docker-compose.yml`, `nginx.conf`.
