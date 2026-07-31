# API Documentation — Juancho's Pizza / GastroPro

> **Base URL:** `http://localhost:3001` (dev) o `https://api.tudominio.com` (prod)
> **Auth:** Bearer token en header `Authorization` para rutas protegidas
> **Content-Type:** `application/json`

---

## 📋 Índice

- [Auth](#-auth)
- [Health](#-health)
- [Products (Menú)](#-products-menu)
- [Categories](#-categories)
- [Ingredients](#-ingredients)
- [Orders](#-orders)
- [Menu (Unificado)](#-menu-unificado)
- [Menu Variants / Combos / Promotions](#-menu-variants--combos--promotions)
- [Clients (CRM)](#-clients-crm)
- [Loyalty / Fidelización](#-loyalty--fidelización)
- [Inventory](#-inventory)
- [Recipes](#-recipes)
- [Expenses / Finance](#-expenses--finance)
- [Stats / Dashboard](#-stats--dashboard)
- [Employees](#-employees)
- [Shifts / Turnos](#-shifts--turnos)
- [Dining Tables](#-dining-tables)
- [Comandas](#-comandas)
- [Cash Register](#-cash-register)
- [Tips](#-tips)
- [Campaigns / Marketing](#-campaigns--marketing)
- [Reviews](#-reviews)
- [Push Notifications](#-push-notifications)
- [Payments](#-payments)
- [Procurement / Purchase Orders](#-procurement--purchase-orders)
- [Invoices / Credit Notes](#-invoices--credit-notes)
- [QR Menu](#-qr-menu)
- [Print](#-print)

---

## 🔐 Auth

### `POST /api/auth/login`

Iniciar sesión con username + PIN (y password para super admin).

**Body:**

```json
{
  "username": "admin",
  "pin": "1234",
  "password": "opcional_para_super_admin"
}
```

**Response (200):**

```json
{
  "token": "eyJhbG...",
  "role": "ADMIN",
  "username": "admin",
  "expiresIn": 1742179200
}
```

**Rate limit:** 10 intentos / 15 min por IP
**Auth:** ❌ Público

---

### `POST /api/auth/refresh`

Refrescar token antes de que expire.

**Body:**

```json
{
  "token": "eyJhbG..."
}
```

**Response (200):**

```json
{
  "token": "nuevo_token"
}
```

**Auth:** ❌ Público (requiere token válido)

---

## 🏥 Health

### `GET /api/health`

Health check del servidor. **No tiene rate limit** (definido antes del middleware generalRateLimit) para que Docker HEALTHCHECK nunca reciba 429.

**Response (200):**

```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2026-07-29T10:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

| Campo               | Descripción                                                |
| ------------------- | ---------------------------------------------------------- |
| `status`            | `"healthy"` si DB conectada, `"degraded"` si no            |
| `uptime`            | Segundos desde que arrancó el servidor                     |
| `services.database` | `"connected"` / `"error"`                                  |
| `services.redis`    | `"connected"` / `"memory_fallback"` (si Redis no responde) |

**Auth:** ❌ Público
**Rate limit:** ❌ No aplica

---

## 🍕 Products (Menú)

### `GET /api/products`

Listar productos. Opcional: `?category=CATEGORY_ID`

### `GET /api/products/:id`

Obtener producto por ID.

### `POST /api/products`

Crear producto. **Auth:** ADMIN/OPERATOR

### `PUT /api/products/:id`

Actualizar producto. **Auth:** ADMIN/OPERATOR

### `DELETE /api/products/:id`

Eliminar producto. **Auth:** ADMIN/OPERATOR

### `POST /api/products/bulk`

Importación masiva de productos.

```json
{
  "products": [{ "nombre": "Pizza Margarita", "basePrice": 25000, ... }]
}
```

**Auth:** ADMIN/OPERATOR

---

## 📂 Categories

### `GET /api/categories`

Listar categorías del menú.

**Auth:** ❌ Público

---

## 🥬 Ingredients

### `GET /api/ingredients`

Listar ingredientes. Opcional: `?category=CATEGORY`

### `POST /api/ingredients`

**Auth:** ADMIN/OPERATOR

### `PUT /api/ingredients/:id`

**Auth:** ADMIN/OPERATOR

### `DELETE /api/ingredients/:id`

**Auth:** ADMIN/OPERATOR

---

## 📦 Orders

### `GET /api/orders`

Listar pedidos. Filtros: `?status=PENDING&paidOnly=true`

### `GET /api/orders/:id`

Obtener pedido por ID.

### `POST /api/orders`

Crear pedido (desde carrito público o CRM).

### `PUT /api/orders/:id`

Actualizar pedido.

### `PATCH /api/orders/:id/status`

Actualizar estado del pedido.

```json
{ "status": "PREPARING" }
```

**Estados:** `PENDING → CONFIRMED → PREPARING → READY → ASSIGNED → DELIVERING → COMPLETED`

### `GET /api/orders/track/:orderNumber?phone=XXX`

Tracking público de pedido por número + teléfono.

**Auth:** ❌ Público

---

## 🍽️ Menu (Unificado)

### `GET /api/menu`

Endpoint unificado que devuelve categorías + productos + variantes + combos + promociones en una sola llamada.

**Auth:** ❌ Público

---

## 🏷️ Menu Variants / Combos / Promotions

### `GET /api/menu/variants`

### `POST /api/menu/variants`

### `PUT /api/menu/variants/:id`

### `DELETE /api/menu/variants/:id`

### `GET /api/menu/combos`

### `POST /api/menu/combos`

### `PUT /api/menu/combos/:id`

### `DELETE /api/menu/combos/:id`

### `GET /api/menu/promotions`

### `POST /api/menu/promotions`

### `PUT /api/menu/promotions/:id`

### `DELETE /api/menu/promotions/:id`

**Auth CRUD:** ADMIN/OPERATOR

---

## 👥 Clients (CRM)

### `GET /api/clients`

Listar clientes. Filtros: `?estado=activo&search=Juan`

### `GET /api/clients/:id`

### `POST /api/clients`

### `PUT /api/clients/:id` — Editar perfil completo

### `PATCH /api/clients/:id` — Actualizar vip/notas/tags/estado

### `DELETE /api/clients/:id` — (Protegido por FK si tiene historial)

### `GET /api/clients/:id/orders` — Historial de órdenes del cliente

**Auth:** ADMIN

---

## ⭐ Loyalty / Fidelización

### `GET /api/loyalty/rewards`

### `POST /api/loyalty/rewards`

### `PUT /api/loyalty/rewards/:id`

### `DELETE /api/loyalty/rewards/:id`

### `GET /api/loyalty/points/:clientId`

### `POST /api/loyalty/points`

**Auth:** ADMIN

---

## 📦 Inventory

### `GET /api/inventory`

### `POST /api/inventory`

### `PUT /api/inventory/:id`

### `POST /api/inventory/movement` — Registrar entrada/salida

### `GET /api/inventory/movements`

**Auth:** ADMIN/OPERATOR

---

## 📖 Recipes

### `GET /api/recipes`

Listar recetas con ingredientes y costo total calculado.

**Auth:** ADMIN/OPERATOR

---

## 💰 Expenses / Finance

### `GET /api/expenses?desde=2026-01-01&hasta=2026-07-15`

### `POST /api/expenses`

### `PUT /api/expenses/:id`

### `DELETE /api/expenses/:id`

### `GET /api/finance/summary` — Resumen ingresos/egresos/utilidad

**Auth:** ADMIN

---

## 📊 Stats / Dashboard

### `GET /api/stats`

Dashboard principal. Opcional: `?locationId=zipaquira`

Returns KPIs: órdenes, ingresos, clientes nuevos, productos top, distribución horaria.

**Auth:** ADMIN/OPERATOR/REPARTIDOR/MARKETING

---

## 👨‍🍳 Employees

### `GET /api/employees`

### `POST /api/employees`

### `PUT /api/employees/:id`

### `PATCH /api/employees/:id/password` — Cambiar contraseña

### `DELETE /api/employees/:id`

**Auth:** ADMIN

---

## 🕐 Shifts / Turnos

### `GET /api/shifts?locationId=nemocon&status=open`

### `GET /api/shifts/current?locationId=nemocon`

### `POST /api/shifts` — Abrir turno

### `PATCH /api/shifts/:id/close` — Cerrar turno

**Auth:** ADMIN/OPERATOR

---

## 🪑 Dining Tables

### `GET /api/tables?locationId=nemocon&area=salon&status=available`

### `GET /api/tables/:id`

### `POST /api/tables`

### `PUT /api/tables/:id`

### `PATCH /api/tables/batch-status` — Actualizar estado masivo

### `GET /api/tables/floor-plan?locationId=nemocon`

**Auth CRUD:** ADMIN/OPERATOR

---

## 📋 Comandas

### `GET /api/comandas?status=open&locationId=nemocon`

### `GET /api/comandas/:id`

### `POST /api/comandas` — Abrir comanda en mesa

### `PATCH /api/comandas/:id/close` — Cerrar comanda y liberar mesa

### `POST /api/comandas/items` — Agregar item

### `POST /api/comandas/items/bulk` — Agregar múltiples items

### `PATCH /api/comandas/items/:id`

### `DELETE /api/comandas/items/:id`

### `POST /api/comandas/:id/split` — Dividir comanda (cuentas)

### `GET /api/comandas/:id/kitchen-ticket` — Ticket de cocina

**Auth:** ADMIN/OPERATOR

---

## 💵 Cash Register

### `GET /api/cash-register?locationId=nemocon&status=open`

### `POST /api/cash-register/open`

### `POST /api/cash-register/:id/close`

**Auth:** ADMIN

---

## 💰 Tips

### `GET /api/tips?locationId=nemocon&desde=2026-01-01`

### `POST /api/tips`

### `GET /api/tips/summary`

**Auth:** ADMIN

---

## 📢 Campaigns / Marketing

### `GET /api/campaigns`

### `POST /api/campaigns`

### `PUT /api/campaigns/:id`

### `DELETE /api/campaigns/:id`

**Auth:** ADMIN/MARKETING

---

## ⭐ Reviews

### `GET /api/reviews?status=pending`

### `POST /api/reviews` — Crear reseña (público)

### `PATCH /api/reviews/:id/status` — Aprobar/rechazar

### `DELETE /api/reviews/:id`

### `GET /api/reviews/approved` — Reseñas aprobadas (público)

**Auth Público:** POST + GET /approved
**Auth Admin:** ADMIN

---

## 🔔 Push Notifications

### `POST /api/push/subscribe`

Suscribir navegador a notificaciones push.

```json
{
  "phone": "573001234567",
  "endpoint": "https://...",
  "p256dh": "...",
  "auth": "..."
}
```

**Auth:** ❌ Público

---

## 💳 Payments

### `GET /api/payments/status`

Estado de configuración de proveedores de pago.

**Auth:** ADMIN

---

### Bold (Colombia)

#### `POST /api/payments/bold/create-link`

Crea un link de pago Bold (checkout hosted) para un pedido.

**Body:**

```json
{
  "orderId": "ord_1234567890_abc123"
}
```

**Response (201):**

```json
{
  "url": "https://checkout.bold.co/LNK_H7S4xxx",
  "paymentLink": "LNK_H7S4xxx",
  "reused": false
}
```

| Campo         | Descripción                                        |
| ------------- | -------------------------------------------------- |
| `url`         | URL del checkout de Bold para redirigir al cliente |
| `paymentLink` | ID del link en Bold (LNK_*)                        |
| `reused`      | `true` si se reutilizó un link existente y activo  |

**Errores:**

| Código | Significado                                                    |
| ------ | -------------------------------------------------------------- |
| `400`  | Pedido ya pagado, cancelado/completado, o paymentLink inválido |
| `404`  | Order not found                                                |
| `502`  | Error de Bold (timeout, credenciales, validación)              |
| `503`  | Bold no configurado (falta BOLD_API_KEY)                       |

**Idempotencia:** Bold usa `reference` (orderNumber) para detectar duplicados. Si ya existe un link activo para la orden, se reutiliza en vez de crear uno nuevo.

**Auth:** ❌ Público (usa solo orderId, la autenticación la hace Bold vía API key server-side)

---

#### `GET /api/payments/bold/status/:paymentLink`

Consulta el estado actual de un link de pago Bold contra la API de Bold.

**Response (200):**

```json
{
  "boldStatus": "PAID",
  "paymentStatus": "paid",
  "paymentLink": "LNK_H7S4xxx",
  "amount": { "currency": "COP", "total": 55000 }
}
```

| Campo           | Descripción                                                                              |
| --------------- | ---------------------------------------------------------------------------------------- |
| `boldStatus`    | Estado crudo de Bold: `ACTIVE`, `PROCESSING`, `PAID`, `REJECTED`, `CANCELLED`, `EXPIRED` |
| `paymentStatus` | Mapeado a nuestro sistema: `pending`, `paid`, `failed`                                   |
| `paymentLink`   | ID del link en Bold                                                                      |

**Auth:** ADMIN

---

#### `POST /api/payments/bold/webhook`

Webhook de Bold (CloudEvents v1.0). Bold notifica eventos de pago (`SALE_APPROVED`, `SALE_REJECTED`, etc.) a esta URL.

**Verificación:**

- **Principal**: Header `x-bold-signature` con HMAC-SHA256 del body RAW contra `BOLD_WEBHOOK_SECRET`
- **Fallback**: Header `x-webhook-secret` comparación directa (Bold Simple)

**Eventos:**

| Evento          | Acción                                          |
| --------------- | ----------------------------------------------- |
| `SALE_APPROVED` | `paymentStatus → 'paid'`, envía push al cliente |
| `SALE_REJECTED` | `paymentStatus → 'failed'`                      |
| `VOID_APPROVED` | `paymentStatus → 'failed'`                      |

**Comportamiento:** Responde `200 OK` inmediatamente (≤2s como exige Bold) y procesa la actualización de la orden en background (`setImmediate`).

**Auth:** ❌ Público (verificado por firma HMAC)

---

### Wompi

#### `POST /api/payments/wompi/create-transaction`

Crea una transacción Wompi.

**Response (201):** `{ transactionId, approved, paymentUrl }`

**Auth:** ❌ Público

---

### MercadoPago

#### `POST /api/payments/mercadopago/create-payment`

**⚠️ DESHABILITADO** — El método `pix` es brasileño; no funciona en Colombia. Usar Bold o Wompi.

---

### PayPal

#### `POST /api/payments/paypal/create-order`

Crea una orden de PayPal. **Stub sin API real** — redirige a PayPal con URL construida básica.

---

## 📦 Procurement / Purchase Orders

### `GET /api/procurement?status=pendiente&locationId=nemocon`

### `GET /api/procurement/:id`

### `POST /api/procurement`

### `PATCH /api/procurement/:id/receive` — Recibir orden (actualiza inventario)

### `DELETE /api/procurement/:id`

**Auth:** ADMIN

---

## 🧾 Invoices / Credit Notes

### `GET /api/invoices?status=pending`

### `POST /api/invoices`

### `GET /api/credit-notes?invoiceId=INVOICE_ID`

### `POST /api/credit-notes`

**Auth:** ADMIN

---

## 📱 QR Menu

### `GET /api/qr-menu/config?locationId=nemocon`

### `POST /api/qr-menu/config`

### `GET /api/qr-menu/qr-codes?locationId=nemocon`

### `POST /api/qr-menu/regenerate`

**Auth Config:** ADMIN
**Auth QR Codes:** ADMIN

---

## 🖨️ Print

### `GET /api/print/receipt/:orderId?token=TOKEN`

### `GET /api/print/kitchen-ticket/:comandaId?token=TOKEN`

### `GET /api/print/comanda-receipt/:comandaId?token=TOKEN`

### `GET /api/print/invoice/:invoiceId?token=TOKEN`

**Auth:** Bearer token vía query param

---

## 🔒 Resumen de Autenticación por Módulo

| Módulo             | Público | ADMIN | OPERATOR | REPARTIDOR   | MARKETING |
| ------------------ | ------- | ----- | -------- | ------------ | --------- |
| Health             | ✅      | —     | —        | —            | —         |
| Categories         | ✅      | —     | —        | —            | —         |
| Menu (unificado)   | ✅      | —     | —        | —            | —         |
| Products           | —       | ✅    | ✅       | —            | —         |
| Orders (track)     | ✅      | —     | —        | —            | —         |
| Orders (CRUD)      | —       | ✅    | ✅       | ✅ (lectura) | —         |
| Clients            | —       | ✅    | —        | —            | —         |
| Reviews (públicas) | ✅      | —     | —        | —            | —         |
| Reviews (admin)    | —       | ✅    | —        | —            | ✅        |
| Employees          | —       | ✅    | —        | —            | —         |
| Shifts             | —       | ✅    | ✅       | —            | —         |
| Tables             | —       | ✅    | ✅       | —            | —         |
| Comandas           | —       | ✅    | ✅       | —            | —         |
| Inventory          | —       | ✅    | ✅       | —            | —         |
| Dashboard          | —       | ✅    | ✅       | ✅           | ✅        |
| Campaigns          | —       | ✅    | —        | —            | ✅        |
| Payments           | —       | ✅    | —        | —            | —         |
| Procurement        | —       | ✅    | —        | —            | —         |
| Invoices           | —       | ✅    | —        | —            | —         |
| Push Subscribe     | ✅      | —     | —        | —            | —         |

---

## ⚠️ Códigos de Error

| Código | Significado                                       |
| ------ | ------------------------------------------------- |
| `400`  | Bad request (validación Zod falló)                |
| `401`  | No autenticado (token faltante/inválido)          |
| `403`  | Sin permisos (rol no autorizado)                  |
| `404`  | Recurso no encontrado                             |
| `409`  | Conflicto (ej. FK protection, username duplicado) |
| `429`  | Rate limit excedido                               |
| `500`  | Error interno del servidor                        |

**Formato de error:**

```json
{
  "error": "Mensaje descriptivo del error"
}
```
