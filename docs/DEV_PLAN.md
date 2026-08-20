# 🗺️ Dev Plan — Juancho's Pizza / GastroPro

> **Propósito:** Roadmap de desarrollo, sprints, y plan de implementación
> **Filosofía:** Entregar valor iterativamente, no todo a la vez
> **Última actualización:** Julio 2026

---

## 1. Estado Actual del Desarrollo

```
Backend:        ████████████████████████████████  92% ✅
Frontend:       ████████████████████████████████  90% ✅  
Infraestructura: ██████████████████████████████░░  85% ✅
Testing:        ████████████████░░░░░░░░░░░░░░░░  50% 🟡
Documentación:  ████████████████████████████████  92% ✅
Seguridad:      ██████████████████████████████░░  88% ✅
```

---

## 2. Sprints Planificados

### Sprint 0: Fundación (COMPLETADO ✅)

| Fecha | Julio 2026 |
|-------|------------|
| **Duración** | 2 semanas |
| **Objetivo** | Base sólida para producción |

**Logrado:**
- ✅ Docker multi-stage + Compose (app, nginx, postgres, redis)
- ✅ JWT auth + refresh + PBDKF2
- ✅ Helmet + CSP + rate limiting
- ✅ PWA con service worker
- ✅ CI/CD GitHub Actions
- ✅ Backup automático
- ✅ Pino logging estructurado
- ✅ Health endpoint
- ✅ SSL DB condicional

---

### Sprint 1: Landing + Pagos (COMPLETADO ✅)

| Fecha | Julio 2026 |
|-------|------------|
| **Duración** | 2 semanas |
| **Objetivo** | Landing pública funcional con pagos online |

**Logrado:**
- ✅ Menú digital interactivo
- ✅ "Crea tu Pizza" builder
- ✅ Carrito + checkout
- ✅ Bold + MercadoPago + Wompi integración
- ✅ Webhook verification (HMAC + checksum)
- ✅ Email transaccional (Nodemailer)
- ✅ Push notifications (VAPID)

---

### Sprint 2: GastroPro CRM (COMPLETADO ✅)

| Fecha | Julio 2026 |
|-------|------------|
| **Duración** | 3 semanas |
| **Objetivo** | CRM funcional para administración del negocio |

**Logrado:**
- ✅ Dashboard con KPIs y gráficos
- ✅ 32 rutas API
- ✅ WebSocket real-time
- ✅ 29 tablas PostgreSQL
- ✅ 131 tests unitarios
- ✅ 0 errores TypeScript

---

### Sprint 3: Compliance + Calidad (EN PROGRESO 🟡)

| Fecha | Julio - Agosto 2026 |
|-------|---------------------|
| **Duración** | 2 semanas |
| **Objetivo** | Cumplimiento legal + estabilidad |

| Tarea | Estado | Esfuerzo | Dependencia |
|-------|--------|----------|-------------|
| **DIAN: Obtener certificado digital** | ❌ Pendiente | 1 semana | Entidad autorizada |
| **DIAN: Pruebas sandbox** | ❌ Pendiente | 3 días | Certificado |
| **DIAN: Producción** | ❌ Pendiente | 2 días | Sandbox OK |
| **API keys de pago reales** | ❌ Pendiente | 1 día | Proveedores |
| **Auto-refresh token frontend** | 🟡 Pendiente | 1 día | — |
| **E2E tests (login, orden, pago)** | 🟡 Pendiente | 3 días | — |
| **Chunk splitting (LCP fix)** | 🟡 Pendiente | 1 día | — |

---

### Sprint 4: Post-Deploy (PLANIFICADO 🔮)

| Fecha | Agosto 2026 |
|-------|-------------|
| **Duración** | 3 semanas |
| **Objetivo** | Mejora continua + nuevas features |

| Tarea | Prioridad | Esfuerzo |
|-------|-----------|----------|
| Exportar reportes (PDF/CSV) | Alta | 3 días |
| OpenTelemetry / Sentry | Alta | 2 días |
| WhatsApp Business API | Alta | 1 semana |
| Notificaciones push frontend | Media | 2 días |
| Dark mode CRM completo | Media | 2 días |
| Exportar clientes a Excel | Media | 1 día |

---

### Sprint 5: Escalamiento (FUTURO 🔮)

| Fecha | Septiembre 2026+ |
|-------|------------------|
| **Duración** | 4 semanas |
| **Objetivo** | Escalar a más sedes + multicanal |

| Tarea | Prioridad | Esfuerzo |
|-------|-----------|----------|
| Multi-idioma (Inglés) | Alta | 1 semana |
| App móvil React Native | Alta | 4 semanas |
| Programa de referidos | Media | 1 semana |
| POS en mostrador | Media | 2 semanas |

---

## 3. Dependencias Técnicas

### 3.1 Externas (Requieren Terceros)

```
DIAN Facturación:
  └── Certificado digital (.p12) ← Entidad autorizada
  └── Technical key ← Asignada por DIAN
  └── Proveedor tecnológico ← Contratación

Pagos Online:
  └── Bold API Key ← Dashboard Bold.co
  └── MercadoPago Access Token ← Dashboard MP
  └── Wompi Merchant ID ← Dashboard Wompi
  └── PayPal Client ID ← Dashboard PayPal

IA Concierge:
  └── Gemini API Key ← Google AI Studio

Email:
  └── SMTP credentials ← Proveedor email

Push Notifications:
  └── VAPID keys ← Generar localmente (npx web-push)
```

### 3.2 Internas (Bloqueantes)

```
Para producción:
  1. ✅ Docker compose listo para deploy
  2. ✅ SSL config listo (condicional)
  3. ✅ Backup scripts listos
  4. ✅ CI/CD configurado
  5. 🟡 API keys reales (PENDIENTE)
  6. ❌ CERTIFICADO DIAN (PENDIENTE)
```

---

## 4. Timeline

```
Julio 2026                         Agosto 2026                    Septiembre 2026
├── Sprint 0 ──┤ Sprint 1 ──┤ Sprint 2 ──┤ Sprint 3 ──┤ Sprint 4 ──┤ Sprint 5 ──┤
│              │            │            │            │            │            │
│ Docker       │ Landing    │ CRM Full   │ DIAN       │ Reportes   │ App Móvil  │
│ Auth         │ Pagos      │ Dashboard  │ E2E tests  │ WhatsApp   │ Multi-ID   │
│ Seguridad    │ Checkout   │ 32 Routes  │ Chunk fix  │ Obs        │ Referidos  │
│ PWA          │ Email      │ WS RealTim │ Auto-refr  │ Dark Mode  │ POS        │
│ CI/CD        │ Push       │ 131 Tests  │            │            │            │
│ Backup       │            │            │            │            │            │
│ Observab.    │            │            │            │            │            │
╞══════════════╪════════════╪════════════╪════════════╪════════════╪════════════╡
│  COMPLETADO  │COMPLETADO  │COMPLETADO  │ ⏳ AHORA   │  🔮        │  🔮        │
```

---

## 5. Recursos y Responsabilidades

### 5.1 Stack de Desarrollo

| Recurso | Detalle |
|---------|---------|
| **Lenguajes** | TypeScript (frontend) + JavaScript (backend) |
| **Framework** | React 18 + Express 4 |
| **Databases** | PostgreSQL 17 + Redis 8 |
| **Infra** | Docker + Nginx + VPS |
| **CI/CD** | GitHub Actions |
| **Testing** | Vitest (unit) + Playwright (E2E) |
| **Monitoreo** | Pino + Health endpoint |

### 5.2 Roles Recomendados

| Rol | Responsabilidad | Dedicación |
|-----|----------------|------------|
| **Full-stack dev** | Features + bugs + tests | 100% |
| **DevOps** | Docker + CI/CD + deploy | 20% |
| **QA** | E2E + regression testing | 30% |
| **Diseñador UX** | UI polish + WCAG audit | 10% |

---

## 6. Estrategia de Deploy

### 6.1 Fases

```
Fase 1: Vercel (Frontend solo)
  ├── Landing pública funciona sin backend
  ├── Menú con datos hardcodeados
  ├── Pedidos por WhatsApp
  └── Sin CRM · Sin pagos online

Fase 2: VPS + Docker (Full stack)
  ├── Backend Express en Docker
  ├── PostgreSQL + Redis en contenedores
  ├── Nginx como reverse proxy con SSL
  ├── CRM completo operativo
  └── Pagos online funcionales

Fase 3: Producción (Full + Compliance)
  ├── DIAN facturación electrónica
  ├── Monitoreo activo
  ├── Backup verificado
  └── E2E tests en CI
```

### 6.2 Rollback Plan

```
1. Docker: docker-compose pull <version_anterior>
2. DB: pg_restore desde backup más reciente
3. DNS: Cambiar registro A a IP anterior
4. Verificar: health endpoint + smoke test
```

---

## 7. Métricas de Progreso

| KPI | Actual | Objetivo |
|-----|--------|----------|
| Tests totales | 131 | 200+ |
| TypeScript errors | 0 | 0 |
| Chunk size (main) | 565 KB | <300 KB |
| LCP (landing) | ~3s | <2.5s |
| API endpoints | 100+ | — |
| DB tables | 29 | — |
| Documentación | 20+ archivos | — |

---

## 8. Risk Register

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Sin API keys de pago reales | Alta | Crítico | Usar contra-entrega mientras tanto |
| DIAN certificado demora | Media | Alto | Facturación manual mientras tanto |
| Redis no disponible | Baja | Medio | Fallback a Map en memoria |
| Rate limit sin Redis | Baja | Medio | Map en memoria (single instance) |
| Error en webhook de pago | Baja | Alto | Log + retry manual |
| Data loss sin backup | Baja | Crítico | Backup diario + S3 |
| Violación datos personales | Baja | Crítico | Habeas Data + ARCO + audit trail |
