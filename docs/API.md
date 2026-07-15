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

Health check del servidor.

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2026-07-15T10:00:00.000Z",
  "uptime": 3600,
  "version": "2.0.0"
}
```

**Auth:** ❌ Público

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
