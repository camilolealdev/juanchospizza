# 🔄 User Flow — Juancho's Pizza / GastroPro

> **Propósito:** Mapear todos los flujos de usuario del sistema
> **Roles:** Cliente · Admin · Cocina (OPERATOR) · Repartidor · Marketing
> **Última actualización:** Julio 2026

---

## 1. 🧑‍🤝‍🧑 Flujo del Cliente (Visitante)

### 1.1 Landing → Pedido Online

```
                    ┌──────────────────────┐
                    │   Llega a la landing │
                    │   guidopizza.com     │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Ve menú digital     │
                    │  - Categorías        │
                    │  - Productos         │
                    │  - "Crea tu Pizza"   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
              ┌─────│  Agrega al carrito   │
              │     └──────────┬───────────┘
              │                │
    ┌─────────▼──────┐  ┌─────▼──────────┐
    │ Ver carrito    │  │ Seguir         │
    │ Ajustar items  │  │ navegando      │
    └─────────┬──────┘  └─────┬──────────┘
              │                │
              └────────┬───────┘
                       │
              ┌────────▼───────────┐
              │  Checkout          │
              │  - Nombre          │
              │  - Dirección       │
              │  - Teléfono        │
              └────────┬───────────┘
                       │
              ┌────────▼───────────┐
              │  Método de pago    │
              │                    │
         ┌────┴────┐       ┌──────┴──────┐
         │  Pago   │       │  Contra     │
         │  Online │       │  Entrega    │
         │         │       │  (cash/card)│
         └────┬────┘       └──────┬──────┘
              │                   │
    ┌─────────▼──────┐   ┌───────▼──────┐
    │ Pasarela       │   │ Orden creada │
    │ Bold/MP/Wompi  │   │ Pago: 'paid' │
    │ Pago: 'pending'│   └───────┬──────┘
    └────────┬───────┘           │
             │                   │
    ┌────────▼───────┐           │
    │ Webhook        │           │
    │ Confirma pago  │           │
    │ → 'paid'       │           │
    └────────┬───────┘           │
             │                   │
             └────────┬──────────┘
                      │
             ┌────────▼───────────┐
             │  Orden confirmada  │
             │  #ORDEN-1234       │
             │  "Gracias por tu   │
             │   pedido!"         │
             └────────┬───────────┘
                      │
        ┌─────────────┼──────────────┐
        │             │              │
   ┌────▼────┐  ┌─────▼────┐  ┌─────▼────┐
   │ Email   │  │ Push     │  │ Tracking │
   │ confirm │  │ notif.   │  │ público  │
   └─────────┘  └──────────┘  └──────────┘
```

### 1.2 Tracking Público

```
Cliente ingresa a /track
  │
  ├── Ingresa número de orden + teléfono
  │
  ├── GET /api/orders/track/:orderNumber?phone=XXX
  │
  ├── Respuesta: { status, estimatedTime, paymentStatus }
  │
  └── Ve estado actualizado en pantalla
       PENDING → CONFIRMED → PREPARING → READY → DELIVERING → COMPLETED
```

### 1.3 Dejar Reseña

```
1. Cliente recibe link/post-checkout
2. Abre formulario de reseña
3. Selecciona rating (1-5 estrellas)
4. Escribe comentario (opcional)
5. Envía → POST /api/reviews
6. Reseña queda 'pending' (moderación admin)
7. Si aprobada → aparece en landing pública
```

### 1.4 Banner Consentimiento (Habeas Data)

```
Primera visita
  │
  ├── Banner aparece (no bloqueante)
  │   "Autorizas tratamiento de datos?"
  │
  ├── Opciones:
  │   ├── "Aceptar todo"       → consent_type: 'all'
  │   ├── "Solo privacidad"    → consent_type: 'privacy_only'
  │   ├── "Solo marketing"     → consent_type: 'marketing'
  │   └── "Rechazar"           → consent_type: 'reject'
  │
  ├── POST /api/consent → guarda IP + User-Agent
  │
  └── Banner guardado en localStorage
      (no vuelve a aparecer)
```

---

## 2. 👨‍💼 Flujo del Administrador

### 2.1 Login + CRM

```
1. Click botón corona (esquina inferior izquierda)
2. LoginModal aparece (React.lazy)
3. Ingresa username + PIN (+ password si super admin)
4. POST /api/auth/login → JWT set en HttpOnly cookie
5. CRM se monta como overlay
6. Sidebar con módulos según rol:
   
   ADMIN:     Dashboard · Menú · Órdenes · Clientes · Inventario
             · Recetas · Finanzas · Empleados · Turnos · Mesas
             · Comandas · Caja · Campañas · Reseñas · Compras
             · Facturación · QR Menú · Tips

   OPERATOR:  Dashboard · Órdenes · Turnos · Mesas · Comandas
   REPARTIDOR:Dashboard · Órdenes (solo asignadas)
   MARKETING: Dashboard · Clientes · Campañas · Reseñas
```

### 2.2 Gestión de Órdenes (Admin/Operador)

```
Dashboard → "Órdenes Activas"
  │
  ├── Filtros: status, sede, método de pago
  │
  ├── Cards de órdenes con:
  │   ├── Número de orden + nombre cliente
  │   ├── Items del pedido
  │   ├── Total + método de pago
  │   └── Botón "Cambiar estado"
  │
  ├── Estados: PENDING → CONFIRMED → PREPARING → READY
  │            → ASSIGNED → DELIVERING → COMPLETED
  │            (o CANCELLED desde cualquier estado)
  │
  └── Cada cambio → WebSocket broadcast
      → Push notification al cliente (si suscripto)
      → Email de notificación (si email configurado)
```

### 2.3 Gestión de Clientes (CRM)

```
Módulo Clientes
  │
  ├── Lista con search + filtro por estado
  │   ├── nombre, teléfono, email, totalGastado, nivel
  │   └── Badge VIP, tags
  │
  ├── Click en cliente:
  │   ├── Datos personales (editable: PUT /api/clients/:id)
  │   ├── Historial de órdenes (GET /api/clients/:id/orders)
  │   ├── Consent History (ARCO compliance)
  │   ├── Puntos de lealtad
  │   └── Tags y segmentación
  │
  └── Acciones:
      ├── Crear cliente manual
      ├── Marcar VIP / Perdido
      └── Enviar email/campaña
```

### 2.4 Inventario

```
Módulo Inventario
  │
  ├── Grid de items con:
  │   ├── stockActual / stockMinimo / stockMaximo
  │   ├── Barra de progreso visual (verde/amarillo/rojo)
  │   └── Alerta si stockActual < stockMinimo
  │
  ├── Agregar movimiento (entrada/salida/ajuste)
  │   ├── POST /api/inventory/movement
  │   └── SaldoAnterior → SaldoNuevo (histórico)
  │
  └── Alertas automáticas de stock crítico
```

---

## 3. 👨‍🍳 Flujo de Cocina (OPERATOR)

### 3.1 Gestión de Pedidos

```
Pantalla de cocina (full screen TV)
  │
  ├── WebSocket recibe order:new en tiempo real
  │
  ├── Ve nueva orden en cola:
  │   ├── Número de orden
  │   ├── Items a preparar
  │   ├── Notas especiales
  │   └── Método de pago
  │
  ├── Confirma orden → status: 'CONFIRMED' → 'PREPARING'
  │
  ├── Marca como listo → 'READY'
  │   → Notifica WebSocket
  │   → Notifica push al repartidor
  │   → Envía email "Tu pedido está listo!"
  │
  └── Si tiene comandas de mesa → ver en grid de mesas
```

### 3.2 Comandas de Mesa

```
Pantalla de mesas (grid visual)
  │
  ├── Mesas coloreadas por estado:
  │   ├── 🟢 available  → Mesa libre
  │   ├── 🟡 occupied   → Clientes sentados
  │   ├── 🔴 reserved   → Reservada
  │   └── ⚪ order      → Orden en preparación
  │
  ├── Click en mesa ocupada:
  │   ├── Ver comanda (items, total, tiempo)
  │   ├── Marcar items como listos
  │   └── Cerrar comanda (libera mesa)
  │
  └── Nueva comanda:
      ├── Seleccionar mesa
      ├── Agregar items (productos del menú)
      ├── Split de cuenta (si aplica)
      └── Enviar a cocina
```

---

## 4. 🏍️ Flujo del Repartidor

```
Login → Dashboard
  │
  ├── WebSocket recibe order:new solo de su sede
  │
  ├── Ve pedidos listos para entregar ('READY')
  │
  ├── Se asigna pedido → status: 'ASSIGNED'
  │   → ve dirección, teléfono, items
  │
  ├── Inicia entrega → 'DELIVERING'
  │
  ├── Marca entregado → 'COMPLETED'
  │   → Actualiza agregados del cliente
  │   → Libera para reseña
  │
  └── Ciclo se repite
```

---

## 5. 📢 Flujo de Marketing

```
Módulo Campañas
  │
  ├── Crear campaña:
  │   ├── Tipo: porcentaje / monto fijo
  │   ├── Producto/Categoría objetivo
  │   ├── Monto mínimo de compra
  │   ├── Fechas de vigencia
  │   └── Límite de usos
  │
  ├── Clientes CRM:
  │   ├── Ver segmentación (VIP, nivel, tags)
  │   ├── Historial de consentimiento
  │   └── Exportar datos (próximamente)
  │
  └── Reseñas:
      ├── Moderar reseñas pendientes
      ├── Aprobar/Rechazar
      └── Responder a reseñas
```

---

## 6. ⚙️ Flujos del Sistema

### 6.1 Autenticación + Refresh Token

```
Request a ruta protegida
  │
  ├── authMiddleware extrae JWT de:
  │   ├── Cookie HttpOnly (primario)
  │   └── Authorization header (fallback)
  │
  ├── verifyToken() → HMAC-SHA256 + exp check
  │
  ├── Si token expirado:
  │   ├── Frontend llama POST /api/auth/refresh
  │   ├── Server verifica refresh token en DB
  │   ├── Verifica origIat ≤ 30 días
  │   ├── Revoca refresh anterior
  │   └── Emite nuevo par access + refresh
  │
  └── req.auth = { sub, role, locationId }
      → requireRole('ADMIN') verifica
```

### 6.2 WebSocket Connection

```
Cliente conecta:
  ws://host/ws?role=OPERATOR&locationId=nemocon
  │
  ├── Server verifica:
  │   ├── Cookie HttpOnly (JWT) para roles privilegiados
  │   ├── ?token query param como fallback
  │   └── Sin auth → role='public'
  │
  ├── ws.send({ type: 'connected', role, locationId })
  │
  └── Eventos entrantes filtrados por:
      ├── role (broadcastToRole)
      ├── locationId (broadcastToLocation)
      └── allowedRoles (notifyAuthorized)
```

### 6.3 Payment Webhook

```
Proveedor envía POST a /api/payments/{provider}/webhook
  │
  ├── Bold:     verificar x-bol-signature (HMAC)
  ├── MP:       verificar x-signature (HMAC) + API call verify
  └── Wompi:    verificar checksum (SHA-256)
  │
  ├── Si falla verificación → 200 OK + log (evita retries)
  │
  ├── Si OK → UPDATE orders SET paymentStatus = 'paid'
  │
  ├── Notificar WebSocket (order:update)
  ├── Enviar push notification
  └── Enviar email de confirmación
```

---

## 7. 📱 Multi-sede

El sistema soporta dos sedes actualmente (Nemocón y Zipaquirá):

| Dimensión | Filtro |
|-----------|--------|
| Órdenes | `locationId` en cada orden |
| Empleados | `locationId` en cada employee |
| Mesas | `locationId`: unique name per location |
| Digiturno | `locationId`: sequential numbers per location |
| WebSocket | `broadcastToLocation()` para notificaciones |
| Admin global | Sin locationId → ve todas las sedes |
| Staff local | locationId fijo → solo su sede |

---

## 8. 🔒 Resumen de Permisos por Endpoint

| Endpoint | Público | ADMIN | OPERATOR | REPARTIDOR | MARKETING |
|----------|---------|-------|----------|------------|-----------|
| GET /api/menu | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /api/orders | ❌ | ✅ | ✅ | ✅ | ❌ |
| POST /api/orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| PATCH /api/orders/:id/status | ❌ | ✅ | ✅ | ✅ | ❌ |
| GET /api/clients | ❌ | ✅ | ❌ | ❌ | ✅ |
| POST /api/products | ❌ | ✅ | ✅ | ❌ | ❌ |
| GET /api/inventory | ❌ | ✅ | ✅ | ❌ | ❌ |
| POST /api/campaigns | ❌ | ✅ | ❌ | ❌ | ✅ |
| POST /api/reviews | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /api/health | ✅ | ✅ | ✅ | ✅ | ✅ |
