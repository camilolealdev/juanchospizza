# 🔧 Pendientes Operacionales — Estado Verificado 2026-08-17

> **Propósito:** estado real de VPS, backups y credenciales Bold/DIAN, verificado contra el código (no solo contra docs). Complementa `INFORME_CONSOLIDADO_PENDIENTES_2026-08-17.md` y corrige datos que quedaron desactualizados.
>
> **Leyenda:** ✅ listo · 🟠 requiere acción externa (VPS/credenciales) · 🔴 bloqueante

---

## 1. Seguridad crítica — YA RESUELTO (el informe viejo decía "abierto")

### 🔴→✅ PUT/POST orders acepta `total` del cliente

Verificado en `server/routes/orders.js:136-174`: el `total` del cliente **nunca se usa ni se persiste** — se recalcula server-side con `computeVerifiedClient()` → `verifiedTotal` dentro de la misma transacción del INSERT, desde el catálogo real (`products`/`pizza_sizes`). Referencia: `docs/AUDIT_2026-07-30.md #2`.

**Acción:** ninguna. El informe consolidado del 17-08 lo listaba como "🔴 abierto" — dato viejo.

---

## 2. Credenciales de proveedores (requieren acción tuya, no código)

### 🟠 Bold — el blocker de revenue más corto

**Código 100% listo y verificado:** create-link (`server/routes/payments.js:192`), webhook con verificación de firma (fall-open hacia `x-webhook-secret`), checkout button, CSP, panel de estado (`/api/payments/status` muestra solo booleans, nunca el secreto).

**Solo faltan 2 variables en `.env.production` del VPS:**

```bash
BOLD_API_KEY=sk_xxx            # Bold Dashboard → Configuración → API Keys
BOLD_WEBHOOK_SECRET=whsec_xxx  # Bold Dashboard → Webhooks → Crear webhook
```

**✅ Verificado contra documentación oficial (2026-08-18):** Bold usa el header `x-bold-signature` y HMAC-SHA256 sobre el body codificado en Base64, usando la Identity Key. El código ya conserva el body RAW, codifica Base64 y compara el digest hexadecimal en tiempo constante. `x-webhook-secret` queda como fallback para Bold Simple. Referencia: [Bold Webhooks](https://developers.bold.co/products/webhook). Falta probar una notificación real de sandbox.

**Pasos para activar:**

1. Crear webhook en Bold apuntando a `https://juanchospizza.com/api/payments/bold/webhook`
2. Poner las 2 env vars en `.env.production` del VPS
3. Probar en sandbox: pedido → "Pagar con Bold" → webhook → `paymentStatus='paid'`
4. Confirmar header/algoritmo de firma contra docs de Bold

### 🟠 DIAN — estructura avanzada, pero NO es solo "poner credenciales"

**El código está mucho más avanzado que lo que dice `PENDIENTES_PROVEEDORES.md`** (que describe pasos 7-8 como pendientes cuando ya están hechos):

| Componente                            | Estado verificado                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| XML UBL 2.1 / DIAN 4.1 (`dianXml.js`) | ✅ Completo                                                                           |
| Firma XAdES-EPES (`dianSigner.js`)    | ✅ Implementada con `node-forge` real (parsea `.p12`, bags, firma RSA) — ya instalado |
| Proveedor (`dianProvider.js`)         | ✅ Adapters reales: `muisca` (SOAP) y `dataico` (REST), selección por `DIAN_PROVIDER` |
| Ruta `POST /api/invoices/:id/send`    | 🟠 Marca `status='sent'` y sugiere flujo manual — **aún no llama al provider real**   |

**Lo que falta (todo externo):**

1. **Software registrado en DIAN** → Software ID + PIN
2. **Certificado digital** (`.pfx`/`.p12`, ~$150-200k/año, Certicámara/Andrés Díaz/GSE)
3. **Datos del emisor** (NIT, razón social, resolución, rango) en `DIAN_CONFIG` de `dianXml.js`
4. **Proveedor tecnológico elegido** (recomendados para pyme: **Dataico** o **Alégrate** — REST moderno)
5. **Conectar `sendToDataico()`/`sendToMuisca()` en la ruta send** (el código del adapter ya existe)

**Estimación realista:** esto es un mini-proyecto (1-2 días con credenciales en mano), NO un quick win. Recomendación: hacerlo DESPUÉS de Bold.

### 🟠 SMTP — correo transaccional (+ campañas)

`server/services/email.js` existe y se usa (facturas, notificaciones) y el scheduler de campañas despacha por email al activar (desde 2026-08-17). Faltan en `.env.production`:

```bash
SMTP_HOST=...  SMTP_PORT=...  SMTP_USER=...  SMTP_PASS=...  EMAIL_FROM=...
```

Sin SMTP, las campañas se activan igual pero con `conversions` en 0 (fail-open, log de warning).

---

## 3. VPS — 3 pendientes, todos con comando listo

### 🟠 Gap 1 — Backups de BD NO funcionan (desde al menos el 12-08)

**Diagnóstico verificado (QA 2026-08-14 + código):**

- ✅ Los scripts existen y están bien: `server/scripts/backup.sh` (pg_dump custom + gzip + sha256 + rotación 30 días) y `.github/workflows/backup.yml` (cron diario 04:00 CO).
- 🔴 **Causa raíz A:** falta el secret `DATABASE_URL` en GitHub.
- 🔴 **Causa raíz B (de diseño, la que importa):** el runner de GitHub corre **fuera** del VPS y Postgres usa `expose: 5432` (red interna docker, no publicada) → el runner **nunca puede conectarse**, aun con secret.

**Fix aplicado al workflow de deploy:** el deploy ahora crea un `pg_dump` dentro del VPS, antes de `docker compose down`, y guarda `.dump` + `.sha256` en `backups/` con rotación de 30 días. Para continuidad diaria, sigue siendo necesario instalar un cron local en el VPS. En el VPS:

```bash
# 1. Crear script de cron (copia los .env al entorno del script)
cat > /etc/cron.d/guido-pizza-backup <<'EOF'
# Backup diario 04:05 Colombia (09:05 UTC)
5 9 * * * root cd /opt/guido-pizza && DATABASE_URL="$(grep DATABASE_URL /opt/guido-pizza/.env.production | cut -d= -f2-)" ./server/scripts/backup.sh --output /opt/guido-pizza/backups >> /var/log/guido-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/guido-pizza-backup

# 2. Verificar que el script funciona
cd /opt/guido-pizza && DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d= -f2-)" ./server/scripts/backup.sh --output backups

# 3. (Opcional) Probar restore una vez — un backup que nunca se restauró no es un backup
pg_restore --list backups/guido-pizza_latest.dump.gz | head
```

> ⚠️ **Alternativa si quieren off-site:** el workflow de GitHub Actions sirve si se **publica** el puerto 5432 del postgres (inseguro, no recomendado) o se configura un túnel SSH desde el runner. Lo simple y robusto: cron local + rsync/scp del `.dump.gz` a otro disco o bucket.

### 🟠 Gap 2 — deny blocks de nginx inactivos en producción

**Verificado:** `location ~ /\.env { deny all; return 404; }` existe en el repo y el mount es correcto (`./nginx.conf:/etc/nginx/nginx.conf:ro`), pero en prod `/.env` responde 200 (index.html del SPA — **sin fuga de datos**, pero la regla no aplica).

**Causa:** nginx del VPS corriendo con config antigua en memoria (el archivo montado cambió pero el contenedor no se recargó).

**Fix (comando exacto, en el VPS):**

```bash
cd /opt/guido-pizza
docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
# Verificar: curl -I https://juanchospizza.com/.env → debe dar 404, no 200
```

### 🟡 Gap 3 — `/api/metrics` público (info disclosure menor)

Prometheus metrics expuestas sin auth (`server/index.js:184`, antes del rate limiter a propósito). Puede que n8n/monitoreo las consuma así (ver `docs/MONITOREO_N8N.md`).

**Acción:** NO romper sin revisar el scraper. Si n8n no las consume, restringir por IP en nginx:

```nginx
location /api/metrics {
    allow <IP-del-monitoreo>;
    deny all;
    proxy_pass http://app:3001;
}
```

---

## 4. Resumen de acciones (orden sugerido)

| #   | Acción                                                        | Requiere         | Esfuerzo  | Impacto               |
| --- | ------------------------------------------------------------- | ---------------- | --------- | --------------------- |
| 1   | Poner `BOLD_API_KEY` + `BOLD_WEBHOOK_SECRET` y probar sandbox | Tu cuenta Bold   | 30-60 min | 🔴 Revenue            |
| 2   | Restart nginx en VPS (deny blocks)                            | SSH VPS          | 2 min     | 🟠 Seguridad          |
| 3   | Cron de backups en VPS + probar restore                       | SSH VPS          | 15 min    | 🔴 Datos              |
| 4   | Confirmar firma webhook Bold vs docs                          | Nada (docs)      | 15 min    | 🔴 Pagos              |
| 5   | SMTP credentials                                              | Proveedor email  | 10 min    | 🟠 Facturas por email |
| 6   | DIAN (certificado + software + provider + conectar send)      | DIAN + proveedor | 1-2 días  | 🟠 Facturación legal  |

**Los items 1-4 se pueden resolver en una sesión de ~1 hora con acceso al VPS y a la cuenta Bold.** DIAN es un proyecto aparte.

---

_Verificado contra código el 2026-08-17: `server/routes/payments.js`, `server/services/dianProvider.js`, `server/services/dianSigner.js`, `server/routes/orders.js`, `server/scripts/backup.sh`, `.github/workflows/backup.yml`, `.github/workflows/deploy-prod.yml`._
