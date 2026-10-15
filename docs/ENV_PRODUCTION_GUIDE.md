# Guía de Credenciales — `.env.production`

> Archivo local, **NUNCA se commitea** (está en `.gitignore`). Copia la plantilla
> `.env.production.example` (sí commiteada) y completa aquí los valores reales.
> Esta guía explica **dónde obtener cada credencial** y qué habilita.

Estado actualizado: **2026-08-18** — `JWT_SECRET` y claves VAPID **generadas localmente**; URLs de producción fijadas a `juanchospizza.com`.

---

## 1. Resumen rápido

| Variable                                    | Estado                              | Qué habilita                      | Dónde obtenerla                    |
| ------------------------------------------- | ----------------------------------- | --------------------------------- | ---------------------------------- |
| `JWT_SECRET`                                | ✅ **Generado**                     | Firma de tokens de sesión (login) | Generar localmente (ver §2)        |
| `VAPID_MAILTO`                              | ✅ **Generado**                     | Push notifications (backend)      | Fijar tu `mailto:` de contacto     |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`    | ✅ **Generados**                    | Push notifications (backend)      | `npx web-push generate-vapid-keys` |
| `VITE_VAPID_PUBLIC_KEY`                     | ✅ **Generada**                     | Push (frontend/service worker)    | = `VAPID_PUBLIC_KEY`               |
| `GEMINI_API_KEY`                            | ⬜ Vacía                            | Menú inteligente (opcional)       | AI Studio → §3                     |
| `BOLD_API_KEY` / `BOLD_WEBHOOK_SECRET`      | ⬜ Vacías                           | Checkout Bold (Colombia)          | Portal de Comercio Bold → §4       |
| `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET`     | ⬜ Vacías                           | Checkout MercadoPago              | Developer Dashboard MP → §5        |
| `WOMPI_MERCHANT_ID` / `WOMPI_EVENTS_SECRET` | ⬜ Vacías                           | Checkout Wompi (Bancolombia)      | Dashboard comercios Wompi → §6     |
| `PAYPAL_CLIENT_ID`                          | ⬜ Vacía                            | Checkout PayPal                   | Developer Dashboard PayPal → §7    |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`     | ⬜ Vacías                           | Emails transaccionales            | Proveedor SMTP → §8                |
| `FRONTEND_URL` / `ALLOWED_ORIGINS`          | ✅ Dominio definido; validar en VPS | CORS + redirects checkout         | `https://juanchospizza.com` → §9   |

Regla general de comportamiento del server (verificado en código):

- **Obligatorias al boot** (`server/config.js` fail-fast): `DATABASE_URL` y `FRONTEND_URL` (en producción).
- **Opcionales con degradación limpia**: el resto. Sin configurar, la feature se deshabilita con un
  warning en logs — nunca rompe el arranque.
- **Webhooks de pago fail-closed**: si el `*_WEBHOOK_SECRET` falta, los webhooks entrantes se
  **rechazan** (`server/routes/payments.js`).

---

## 2. JWT_SECRET ✅ (generado)

Firma los JWT de sesión (`server/auth.js`). **Requisito: ≥ 32 caracteres** (fuera de
`NODE_ENV=development` el server rechaza secretos cortos).

Generar uno nuevo:

```bash
openssl rand -hex 32
# o
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ Rotar el secret invalida **todas** las sesiones existentes. Hazlo en ventana de mantenimiento.

## 3. GEMINI_API_KEY — Menú Inteligente (opcional)

- **Dónde**: https://aistudio.google.com/app/apikey → "Create API key".
- **Notas**: sin ella el menú inteligente se deshabilita graceful (solo un warning).
  Si además usas la versión client-side (`src/services/geminiService.ts`), expón la **misma key**
  como `VITE_GEMINI_API_KEY` (queda visible en el bundle; restringe por dominio/referer en AI Studio).

## 4. Bold — Checkout (Colombia, recomendado) ⬜

- **Portal desarrolladores / docs**: https://developers.bold.co/
- **Dónde obtener las llaves**: dentro del Portal de Comercio (https://bold.co → tu cuenta de negocio)
  → sección **Integraciones API**: ahí salen la `API key` y el `webhook secret`.
- **Qué hace en el código**: `server/routes/payments.js` — `POST /api/payments/bold/checkout` crea la
  intención de pago; el webhook entrante se rechaza si `BOLD_WEBHOOK_SECRET` no está (fail-closed).

## 5. MercadoPago ⬜

- **Portal desarrolladores**: https://www.mercadopago.com.co/developers/
- **Dónde obtener las llaves**: https://www.mercadopago.com.co/developers/panel →
  "Your Integrations" → tu aplicación → **Credenciales de producción** (Access Token) y
  **Webhooks** (secret para validar `x-signature`).
- **Notas**: necesitas una aplicación creada en el dashboard. Modo test vs producción = credenciales distintas.

## 6. Wompi (Grupo Bancolombia) ⬜

- **Portal desarrolladores / docs**: https://wompi.com/es/co/desarrolladores/ ·
  guía de llaves: https://docs.wompi.co/en/docs/colombia/ambientes-y-llaves/
- **Dónde obtenerlas**: Dashboard de Comercios → https://comercios.wompi.co/ (login con tu cuenta
  Bancolombia) → **Merchant ID** + **Events secret** (firma de eventos, verificada por checksum).

## 7. PayPal ⬜

- **Portal desarrolladores**: https://developer.paypal.com/
- **Dónde obtener el Client ID**: https://developer.paypal.com/dashboard/ → **Apps & Credentials**
  → crea/abre tu app → copia el **Client ID** (Live).
- **Nota**: en el código solo se usa `PAYPAL_CLIENT_ID` (el webhook no se verifica — `webhookSecret: null` en `payments.js`).

## 8. SMTP — Emails transaccionales ⬜

Sin `SMTP_USER`/`SMTP_PASS`, los emails (confirmación de pedido, etc.) simplemente **no se envían**
(`server/services/email.js` salta si falta `SMTP_USER`). `SMTP_HOST` tiene default `smtp.gmail.com`.

Opciones de proveedor:

| Proveedor                   | Dónde sacar credenciales                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Gmail**                   | https://myaccount.google.com/apppasswords — con 2FA activado, genera una "App Password" (16 chars) para `SMTP_USER`/`SMTP_PASS` |
| **Brevo** (ex-Sendinblue)   | https://www.brevo.com — SMTP relay + key en Settings → SMTP & API                                                               |
| **Resend**                  | https://resend.com — API key / SMTP en la sección API Keys                                                                      |
| **Mailtrap** (solo pruebas) | https://mailtrap.io — inbox de testing, los correos no se entregan de verdad                                                    |

## 9. URLs de producción — juanchospizza.com

- `FRONTEND_URL` — **obligatoria** en producción (fail-fast al boot; los checkout redirigen aquí).
  Valor objetivo: `https://juanchospizza.com` (debe verificarse en `.env.production` del VPS).
- `ALLOWED_ORIGINS` — CORS: lista de orígenes separada por comas. Añadir el dominio real.
- `PUBLIC_URL` — URL absoluta del backend para los QR del menú (`server/routes/qrMenu.js`).
- `VITE_API_URL` — URL base de API para el frontend (vacío = mismo origen).

---

## 10. Servicios opcionales recomendados (están en `.env.production.example`, faltan en `.env.production`)

- **`SERVICE_KEY_N8N` / `SERVICE_KEY_CRON`** — auth servicio-a-servicio (header `x-service-key`) para
  n8n/cron. Generar con `openssl rand -hex 32` (una por servicio para poder rotar/revocar por separado).
  `server/middleware/serviceKey.js` rechaza (403) todo request sin clave válida si no están configuradas.
- **Bloque DIAN** — facturación electrónica Colombia: requiere **certificado digital .p12**
  (entidad autorizada: Andrés Díaz / Certicámara / GSE) + homologación con proveedor tecnológico
  (muisca | dataico | novasoft | alegra). Sin esto, el sistema no firma ni envía facturas.
  **Nunca commitear el `.p12`.** Ver el bloque completo en `.env.production.example`.
- **`WEBHOOK_URL` / `ORDER_WEBHOOK_URL` / `PAYMENT_WEBHOOK_URL`** — webhooks salientes
  (opcionales; sin ellos simplemente no se envían).

---

## Seguridad (recordatorios)

- `.env.production` **no** está en el repo (gitignore). Tampoco el `.p12` de DIAN ni backups de estos.
- Las variables `VITE_*` son **públicas por diseño** (van al bundle del navegador): `VITE_GEMINI_API_KEY`
  y `VITE_VAPID_PUBLIC_KEY` no son secretos; restríngelas por dominio/referer donde el proveedor lo permita.
- Para rotar: actualiza el valor, reinicia el contenedor, y verifica `/api/health` + un login real.
