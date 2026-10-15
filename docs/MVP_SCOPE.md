# 🎯 MVP Scope — Juancho's Pizza / GastroPro

> **Propósito:** Definir el alcance mínimo viable por fase de release
> **Filosofía:** Entregar valor iterativamente, no todo a la vez
> **Última actualización:** Julio 2026

---

## 📊 Estado Actual vs MVP

```
MVP Fase 1 (Core)    ████████████████████████████████  100% ✅ COMPLETADO
MVP Fase 2 (CRM)     ████████████████████████████████  100% ✅ COMPLETADO  
MVP Fase 3 (Pagos)   ██████████████████████████████░░   90% ✅ COMPLETADO
MVP Fase 4 (DIAN)    ████████████████░░░░░░░░░░░░░░   50% 🟡 EN PROGRESO
Post-MVP             ████░░░░░░░░░░░░░░░░░░░░░░░░░░   15% 🔮 PLANIFICADO
```

---

## 🟢 FASE 1 — Landing Page Pública (Core)

**Objetivo:** Que los clientes puedan ver el menú y hacer pedidos.
**Estado:** ✅ 100% COMPLETO

### In Scope

| Feature | Prioridad | Dependencia |
|---------|-----------|-------------|
| Menú digital con categorías | P0 | Ninguna |
| Visual Pizza Builder (Crea tu Pizza) | P0 | Ninguna |
| Carrito de compras | P0 | Ninguna |
| Enlace WhatsApp para pedidos | P0 | Ninguna |
| Landing page responsive | P0 | Ninguna |
| SEO básico (meta tags, schema.org) | P0 | Ninguna |
| Imágenes de productos | P1 | Assets del negocio |
| Integración Google Maps (2 sedes) | P1 | Ninguna |
| Favicon + OG images | P1 | Ninguna |

### Out of Scope

| Feature | Razón |
|---------|-------|
| Checkout online integrado | Requiere Fase 3 (Pagos) |
| Cuentas de usuario para clientes | No necesario para MVP |
| Reseñas | Post-MVP |
| Tracking de pedidos en vivo | Post-MVP |

---

## 🟢 FASE 2 — GastroPro CRM (Administración)

**Objetivo:** Que el equipo administre el negocio digitalmente.
**Estado:** ✅ 100% COMPLETO

### In Scope

| Feature | Prioridad | Esfuerzo |
|---------|-----------|----------|
| Dashboard con KPIs | P0 | 5 días |
| Gestión de productos y menú | P0 | 3 días |
| Órdenes (CRUD + estados) | P0 | 5 días |
| Clientes CRM con historial | P0 | 4 días |
| Inventario y movimientos | P0 | 4 días |
| Cocina: ver pedidos en tiempo real | P0 | 3 días |
| Repartidores: gestión de entregas | P0 | 2 días |
| Autenticación con PIN + roles | P0 | 3 días |
| WebSocket para tiempo real | P0 | 3 días |
| Turnos (apertura/cierre) | P1 | 2 días |
| Mesas + Comandas | P1 | 4 días |
| Caja registradora | P1 | 2 días |
| Gastos/Finanzas básicas | P1 | 3 días |
| Recetas + costos | P2 | 3 días |
| Propinas | P2 | 1 día |

### Out of Scope

| Feature | Razón |
|---------|-------|
| Exportación PDF/Excel | Post-MVP |
| Reportes avanzados | Post-MVP |
| Integración contable | Post-MVP |

---

## 🟢 FASE 3 — Pagos Online

**Objetivo:** Que los clientes paguen en línea.
**Estado:** ✅ 90% COMPLETO (faltan API keys reales)

### In Scope

| Feature | Prioridad | Proveedor | Estado |
|---------|-----------|-----------|--------|
| Bold checkout link | P0 | Bold.co | 🟡 Sin API key |
| MercadoPago | P1 | MercadoPago | 🟡 Sin API key |
| Wompi | P1 | Wompi.co | 🟡 Sin API key |
| PayPal (stub) | P2 | PayPal | 🟡 Oculto en UI |
| Webhook verification (HMAC) | P0 | Todos | ✅ |
| Payment status tracking | P0 | — | ✅ |
| Fallback a contra-entrega | P0 | — | ✅ |
| WebSocket notificación pago | P1 | — | ✅ |

### Out of Scope

| Feature | Razón |
|---------|-------|
| Suscripciones recurrentes | No aplica a pizzería |
| Split payments multi-sede | Post-MVP |

---

## 🟡 FASE 4 — DIAN Facturación Electrónica

**Objetivo:** Cumplir con la ley colombiana de facturación electrónica.
**Estado:** 🟡 65% COMPLETO

### In Scope (MVP)

| Feature | Prioridad | Estado |
|---------|-----------|--------|
| XML UBL 2.1 completo | P0 | ✅ |
| XAdES-EPES signature | P0 | ✅ |
| CUFE con SHA-384 | P0 | ✅ |
| Notas crédito/débito | P0 | ✅ |
| Proveedor DIAN (Muisca) | P0 | 🟡 Pendiente setup |
| Certificado digital (.p12) | P0 | ❌ Pendiente trámite |
| Sandbox testing | P0 | ❌ Pendiente |
| Producción | P0 | ❌ Pendiente |

### Out of Scope (Post-MVP)

| Feature | Razón |
|---------|-------|
| POS electrónico (facturación en mostrador) | Fase futura |
| Integración con contadores públicos | Post-MVP |
| Documento soporte en nómina | No aplica |

---

## 🔮 FASE 5 — Post-MVP (Mejora Continua)

**Priorizado por impacto:**

| # | Feature | Impacto | Esfuerzo | Release |
|---|---------|---------|----------|---------|
| 1 | **Auto-refresh token** | 🔥 Seguridad | 1 día | v2.1 |
| 2 | **DIAN facturación real** | 🔥 Legal | 2 semanas | v2.1 |
| 3 | **Reportes exportables (PDF/CSV)** | 🔥 UX | 3 días | v2.1 |
| 4 | **E2E tests (login, orden, pago)** | 🔥 Calidad | 3 días | v2.1 |
| 5 | **Exportar clientes a Excel** | ⭐ CRM | 1 día | v2.1 |
| 6 | **Notificaciones push frontend** | ⭐ UX | 2 días | v2.2 |
| 7 | **Dark mode CRM completo** | ⭐ UX | 2 días | v2.2 |
| 8 | **WhatsApp Business API** | 🔥 Ventas | 1 semana | v2.2 |
| 9 | **Chunk splitting (LCP fix)** | ⚡ Perf | 1 día | v2.2 |
| 10 | **OpenTelemetry / Sentry** | 🔍 Obs | 2 días | v2.2 |
| 11 | **Multi-idioma menú QR** | 🌎 Alcance | 3 días | v3.0 |
| 12 | **App móvil React Native** | 📱 Reach | 1 mes | v3.0 |

---

## 📈 Criterios de Release

### Gate para pasar de Fase n → Fase n+1

```
✅ Calidad:    Tests pasando (0 failures)
✅ Build:      Build exitoso (0 errors)
✅ TypeScript: tsc --noEmit (0 errors)
✅ Seguridad:  0 vulnerabilidades críticas en npm audit
✅ Docker:     Build de imagen exitoso
```

### Gate para Producción (Fase 1-4 completas)

```
☐ API keys de pago configuradas (Bold, MP, Wompi)
☐ Dominio apuntando a VPS
☐ SSL/TLS habilitado en nginx
☐ Certificado DIAN obtenido
☐ Backup automático verificado
☐ Monitoreo (Pino + health endpoint) activo
☐ Prueba E2E de checkout completa
```

---

## 📊 Matriz de Priorización (RICE)

| Feature | Reach | Impact | Confidence | Effort | RICE Score |
|---------|-------|--------|------------|--------|------------|
| API keys de pago | 100% | 3 | 100% | 0.5 días | **600** |
| DIAN certificado | 100% | 3 | 80% | 5 días | **48** |
| Chunk splitting | 80% | 2 | 100% | 1 día | **160** |
| E2E tests | 60% | 2 | 90% | 3 días | **36** |
| WhatsApp API | 70% | 3 | 60% | 5 días | **25** |
| App móvil | 50% | 3 | 40% | 30 días | **2** |
