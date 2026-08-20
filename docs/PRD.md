# 📋 PRD — Product Requirements Document

> **Producto:** Juancho's Pizza — GastroPro CRM + Landing Page
> **Versión:** 2.0.0
> **Fecha:** Julio 2026
> **Estado:** 🟢 En producción (v2 activa)

---

## 1. Resumen Ejecutivo

Sistema híbrido de alto rendimiento para **Juancho's Pizza y Comidas Rápidas** (Nemocón y Zipaquirá, Cundinamarca). Combina una landing page pública para pedidos con un CRM administrativo completo (GastroPro) para gestión de inventario, finanzas, clientes, cocina y domicilios.

### 🎯 Propósito

Digitalizar la operación completa de una pizzería con dos sedes, eliminando papel, automatizando procesos manuales y ofreciendo una experiencia de cliente moderna (menú digital, pedidos online, tracking en tiempo real).

### 👥 Audiencia

| Stakeholder | Necesidad Principal |
|-------------|-------------------|
| Clientes finales | Ver menú, armar pizza, pedir por WhatsApp, rastrear pedido |
| Administradores | Dashboard, inventario, finanzas, reportes, facturación DIAN |
| Cocina | Ver pedidos entrantes, actualizar estado, comandas de mesa |
| Repartidores | Ver pedidos asignados, actualizar entregas |
| Marketing | Campañas, reseñas, fidelización, clientes CRM |

---

## 2. Módulos del Producto

### 🟢 Módulo 1: Landing Page Pública
**Prioridad:** P0 | **Estado:** ✅ Completo

| Feature | Descripción | Estado |
|---------|-------------|--------|
| Menú digital interactivo | Categorías, productos, variantes, combos | ✅ |
| "Crea tu Pizza" | Armador visual con base + ingredientes + extras | ✅ |
| Carrito de compras | Checkout con selección de método de pago | ✅ |
| Pedidos por WhatsApp | Integración directa para pedidos simples | ✅ |
| Tracking público | Seguimiento de pedido por número + teléfono | ✅ |
| Reseñas | Ver reseñas aprobadas, dejar reseña | ✅ |
| Banner consentimiento | Habeas Data (Ley 1581/2012 Colombia) | ✅ |
| QR por mesa | Menú digital escaneando QR en cada mesa | ✅ |

### 🟢 Módulo 2: Autenticación y Seguridad
**Prioridad:** P0 | **Estado:** ✅ Completo

| Feature | Descripción | Estado |
|---------|-------------|--------|
| Login con PIN | Autenticación con PIN de 4 dígitos + PBKDF2 | ✅ |
| 2FA Super Admin | PIN + Password para administradores | ✅ |
| JWT con refresh | Access token 15min + refresh 7d, máx 30d | ✅ |
| Rate limiting | Redis-backed: general, login, consent, ARCO | ✅ |
| CSP + Helmet | Headers de seguridad HTTP configurables | ✅ |
| Service Keys | Autenticación para servicios externos (n8n) | ✅ |

### 🟢 Módulo 3: Gestión de Órdenes
**Prioridad:** P0 | **Estado:** ✅ Completo

| Feature | Descripción | Estado |
|---------|-------------|--------|
| CRUD órdenes | Crear, listar, actualizar, tracking | ✅ |
| Estados workflow | PENDING → CONFIRMED → PREPARING → READY → ASSIGNED → DELIVERING → COMPLETED | ✅ |
| Filtros avanzados | Por status, sede, método de pago, paidOnly | ✅ |
| Notificaciones push | Web Push API para operadores | ✅ |
| Email transaccional | Confirmación, orden lista, bienvenida, reset pass | ✅ |
| Webhooks | Order.created para integraciones externas | ✅ |
| Integración pagos | Bold, MercadoPago, Wompi, PayPal | ✅ |
| WebSocket real-time | Broadcasting de eventos por rol y sede | ✅ |

### 🟢 Módulo 4: GastroPro CRM
**Prioridad:** P0 | **Estado:** ✅ Completo

| Feature | Descripción | Estado |
|---------|-------------|--------|
| Dashboard | KPIs, ingresos, órdenes, clientes nuevos, top productos | ✅ |
| Clientes CRM | Base de datos con historial, segmentación, tags | ✅ |
| Menú Inteligente | CRUD productos, variantes, combos, promociones | ✅ |
| Inventario | Stocks, movimientos, alertas mínimo | ✅ |
| Recetas | Recetas con ingredientes, costo total calculado | ✅ |
| Finanzas | Ingresos, egresos, flujo de caja, utilidad | ✅ |
| Empleados | CRUD, roles, cambio de PIN/password | ✅ |
| Turnos | Apertura/cierre de turno por sede | ✅ |
| Mesas + Comandas | Gestión de mesas, comandas, split de cuentas | ✅ |
| Caja registradora | Apertura/cierre, conteo esperado vs real | ✅ |
| Propinas | Registro de propinas por pedido | ✅ |
| Campañas | Cupones, promociones segmentadas | ✅ |
| Reseñas (admin) | Moderación, aprobación, rechazo | ✅ |
| Procurement | Órdenes de compra, recepción, actualización inventario | ✅ |

### 🟡 Módulo 5: Facturación Electrónica DIAN
**Prioridad:** P1 | **Estado:** 🟡 65%

| Feature | Descripción | Estado |
|---------|-------------|--------|
| XML UBL 2.1 | Generación completa según Resolución 000008 | ✅ |
| Firma XAdES-EPES | SHA-384, CUFE, canonicalización | ✅ |
| Notas crédito/débito | CRUD completo | ✅ |
| Certificado digital | Certificado .p12 de entidad autorizada | ❌ Pendiente |
| Pruebas sandbox | Validación con proveedor tecnológico | ❌ Pendiente |
| Envío producción | Integración con proveedor DIAN | ❌ Pendiente |

### 🟢 Módulo 6: Infraestructura
**Prioridad:** P0 | **Estado:** ✅ Listo

| Feature | Descripción | Estado |
|---------|-------------|--------|
| Docker multi-stage | Build optimizado, non-root user | ✅ |
| Docker Compose | app + nginx + postgres + redis | ✅ |
| Nginx | TLS, rate limiting, cache, WebSocket | ✅ |
| PWA | Service worker, offline shell, standalone | ✅ |
| CI/CD GitHub Actions | Lint → test → build → Docker | ✅ |
| Backup automático | pg_dump + S3 + rotación 30 días | ✅ |
| Monitoreo | Health endpoint + Pino logging | ✅ |
| SSL DB | Configuración condicional para cloud | ✅ |

---

## 3. User Stories Priorizadas

### P0 — Esencial (Core business)

```
Como cliente, quiero ver el menú digital con precios para decidir mi pedido.
Como cliente, quiero armar mi propia pizza con ingredientes a elección.
Como cliente, quiero pagar con Bold/MercadoPago para no necesitar efectivo.
Como administrador, quiero ver el dashboard con KPIs del día para tomar decisiones.
Como cocina, quiero ver los pedidos entrantes en tiempo real para prepararlos.
Como administrador, quiero gestionar inventario para no quedarme sin insumos.
```

### P1 — Importante (Diferenciación)

```
Como cliente, quiero rastrear mi pedido en vivo para saber cuándo llega.
Como administrador, quiero facturar electrónicamente (DIAN) para cumplir la ley.
Como marketing, quiero crear campañas de descuento para atraer clientes.
Como cliente, quiero dejar una reseña para compartir mi experiencia.
```

### P2 — Mejora (Madurez)

```
Como administrador, quiero ver reportes financieros para analizar rentabilidad.
Como operador, quiero gestionar mesas y comandas para el salón.
Como cliente, quiero notificaciones push para saber cuando mi pedido está listo.
```

---

## 4. Métricas de Éxito (KPIs)

| KPI | Objetivo | Medición |
|-----|----------|----------|
| Órdenes digitales/mes | >30% de órdenes totales | Dashboard |
| Tiempo promedio preparación | <25 min | Dashboard |
| Clientes CRM registrados | >500 en 6 meses | DB clients |
| Tasa de reseñas positivas | >4.5 estrellas | Reviews |
| Uptime del sistema | >99.5% | Monitoreo |
| Tiempo de carga landing | LCP <2.5s | Core Web Vitals |

---

## 5. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + TypeScript + Vite | 18 / 5.2 / 8.1 |
| Styling | Tailwind CSS + Framer Motion | 3.4 / 12.40 |
| Backend | Node.js + Express | 22 / 4.18 |
| Base de Datos | PostgreSQL + Redis | 17 / 8 |
| Pagos | Bold / MercadoPago / Wompi / PayPal | APIs REST |
| IA | Google Gemini (Concierge) | API v1 |
| Infra | Docker / Nginx / Railway / Vercel | — |
| CI/CD | GitHub Actions | — |
| Monitoreo | Pino + Health endpoint | 9.x |

---

## 6. Restricciones y Cumplimiento

| Área | Requisito | Estado |
|------|-----------|--------|
| Ley 1581/2012 | Habeas Data (Colombia) — consentimiento expreso + ARCO | ✅ |
| Resolución DIAN 000008 | Facturación electrónica Versión 4.1 | 🟡 Pendiente certificado |
| WCAG 2.2 | Accesibilidad AA (focus trap, aria, reduced-motion) | 🟡 Parcial |
| PCI DSS | Pagos online — webhooks con verificación criptográfica | ✅ |
| RGPD (UE) | Protección de datos personales | 🟡 Parcial |

---

## 7. Roadmap de Features Futuros

| Feature | Prioridad | Release Estimada |
|---------|-----------|------------------|
| Auto-refresh token frontend | P1 | v2.1 |
| DIAN facturación real | P1 | v2.1 |
| Reportes exportables (PDF/Excel) | P1 | v2.1 |
| Dark mode completo CRM | P2 | v2.2 |
| Integración WhatsApp Business API | P2 | v2.2 |
| App móvil (React Native) | P3 | v3.0 |
| Menú por QR con multi-idioma | P3 | v3.0 |
| Programa de referidos | P3 | v3.0 |
