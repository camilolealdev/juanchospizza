# 📋 Informe Consolidado de Pendientes — Juancho's Pizza / GastroPro

> **Fecha original:** 2026-08-17 · **Revisado:** 2026-08-18  
> **Propósito:** Resumen ejecutivo de pendientes reales; las auditorías históricas se conservan como evidencia y no como estado vigente.  
> **Proyecto:** pizzeria-merge (Juancho's Pizza / GastroPro CRM)
>
> **Regla de lectura:** ✅ indica trabajo resuelto en código; 🟠 indica acción externa o decisión pendiente; 🔴 indica bloqueante real. Las métricas numéricas son una fotografía de la fecha original y no sustituyen la validación actual. Para el estado operativo más reciente, consultar `PENDIENTES_OPERACIONALES_2026-08-17.md`.

---

## 🎯 Resumen Ejecutivo

El proyecto tiene el núcleo funcional y de seguridad verificado; lo que sigue abierto es principalmente operacional o externo. A la fecha de revisión:

1. **Credenciales y pruebas externas** (Bold, SMTP y DIAN).
2. **Configuración del VPS** (cron de backups y recarga de nginx; requieren SSH).
3. **Cobertura adicional** en algunas rutas y vistas, como mejora de calidad, no como bloqueo de arranque.
4. **Decisiones de producto**: canal WhatsApp, descuento automático de inventario por receta y monitoreo n8n.

---

## 🔴 PRIORIDAD ALTA — Bloqueantes para producción

### 1. Credenciales de Proveedores (sin esto no hay pagos ni facturación)

| Proveedor | Estado                                    | Credenciales faltantes                                       | Acción requerida                                          |
| --------- | ----------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| **Bold**  | ✅ Código listo                           | `BOLD_API_KEY`, `BOLD_WEBHOOK_SECRET`                        | Obtener en [Bold Dashboard](https://app.bold.co)          |
| **DIAN**  | ⚠️ Estructura lista, sin integración real | Software ID, PIN, certificado digital, proveedor tecnológico | 11 pasos documentados en `docs/PENDIENTES_PROVEEDORES.md` |
| **SMTP**  | ⚠️ Configurado parcialmente               | `SMTP_USER`, `SMTP_PASS`                                     | Configurar correo transaccional                           |

**Acción:** Obtener credenciales de Bold primero (más simple), luego coordinar DIAN con proveedor tecnológico (Dataico o Alégrate recomendados).

### 2. VPS y Despliegue (backups rotos, nginx desactualizado)

| Pendiente                  | Estado actual                                                                                              | Riesgo                | Acción                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| **Backups de BD**          | 🟠 El cron de GitHub Actions no alcanza el Postgres interno; el deploy ya hace backup pre-deploy en el VPS | Riesgo de continuidad | Instalar/probar cron diario en el VPS y restore                                          |
| **Nginx deny blocks**      | 🟠 Configuración corregida en el repo; falta recargar la instancia que ya corre en producción              | Exposición menor      | `docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload` en VPS |
| **`/api/metrics` público** | 🟠 Info disclosure menor                                                                                   | Bajo                  | Restringir por IP/token si n8n lo necesita                                               |

**Acción:** Conectar al VPS y ejecutar:

```bash
docker compose restart nginx
# Configurar backup local en VPS
```

### 3. Seguridad Crítica

| Hallazgo                                  | Estado                        | Verificación                                                                                                        |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **PUT orders acepta `total` del cliente** | ✅ **Resuelto**               | `server/routes/orders.js:174` recalcula `verifiedTotal` server-side desde el catálogo (docs/AUDIT_2026-07-30.md #2) |
| **JWT en localStorage**                   | ✅ Resuelto (cookie HttpOnly) | Verificar que `document.cookie` no muestra token                                                                    |
| **CSRF protegido**                        | ✅ Resuelto                   | Verificar en producción                                                                                             |

---

## 🟠 PRIORIDAD MEDIA — Deudas Técnicas

### 4. Tests de Cobertura (~20 routers sin tests)

| Área                | % Cobertura                         | Routers sin tests                                                                                                                                                                                                                     |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **server/routes**   | ✅ **Grandes avances (2026-08-17)** | Sin tests quedan: `auth`, `comandas`, `invoices`, `menuExtras`, `qrMenu`. Con tests nuevos hoy: **pizzaSizes (11), loyalty (14), cashRegister (12), procurement (13)** — +50 tests de rutas de dinero. Suite total: 362 tests server. |
| **src/views/roles** | ⚠️ Pendiente                        | 17 vistas sin test                                                                                                                                                                                                                    |
| **TOTAL**           | ✅ 362/362 server                   | —                                                                                                                                                                                                                                     |

**Acción:** (hecho) tests de rutas de dinero. Pendiente: `comandas` (531 líneas, feature grande) e `invoices` (DIAN).

**Bug de dinero corregido al escribir los tests:** los schemas de `pizzaSizes` y `loyalty` usaban `clampedNumber` (optional→default 0), así que un POST sin `precio` creaba un tamaño a **$0** y una reward sin `puntosCosto`/`valor` a 0 puntos / $0. Ahora exigen los campos de dinero con `requiredPositiveNumber` (mismo criterio que finance). El frontend siempre envía esos campos → sin impacto en clientes legítimos.

### 5. Paginación Real — RESUELTA EN LOS ENDPOINTS CRÍTICOS

| Endpoint                       | Estado vigente      | Evidencia                                                                                    |
| ------------------------------ | ------------------- | -------------------------------------------------------------------------------------------- |
| `GET /api/clients`             | ✅ Resuelto         | `page`/`pageSize` + `COUNT(*)` + `totalPages`, con compatibilidad sin parámetros             |
| `GET /api/orders`              | ✅ Resuelto         | `page`/`pageSize` + `COUNT(*)` + `totalPages`                                                |
| `GET /api/inventory/movements` | ✅ Resuelto         | Shape paginado; conserva límite defensivo por defecto                                        |
| `GET /api/finance`             | 🟠 Límite existente | No forma parte del cambio de paginación verificado; revisar solo si el volumen real lo exige |

**Acción:** ninguna para clients/orders/inventory. Mantener una prueba de regresión del shape paginado.

### 6. Automatizaciones que no se disparan

| Automatización                      | Estado                                | Impacto                                                                                                                          |
| ----------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Campañas `scheduled`**            | ✅ Scheduler y despacho implementados | Activa campañas vencidas y despacha por email/push cuando hay credenciales; WhatsApp sigue pendiente porque no hay API conectada |
| **Reconciliación caja/turno**       | ✅ Resuelta                           | `shifts.js`/`cashRegister.js` recalculan el esperado al cerrar y guardan `difference`                                            |
| **Descuento inventario por receta** | 🟠 Decisión pendiente                 | Falta definir cuándo descontar y poblar/validar recetas antes de automatizarlo                                                   |
| **Monitoreo n8n**                   | 🟠 Propuesto, no implementado         | Falta configurar alertas externas                                                                                                |

**Acción:** no reabrir scheduler ni reconciliación; atender solo WhatsApp, inventario por receta y monitoreo según prioridad.

---

## 🟡 PRIORIDAD BAJA — Mejoras

### 7. Frontend: PaymentSettingsView "decorativa"

- Solo lee `/api/payments/status`
- No configura credenciales
- No prueba webhooks

**Acción:** Evaluar si vale la pena expandir o dejar como panel de estado.

### 8. Performance Restante

| Mejora               | Estado                | Ahorro    |
| -------------------- | --------------------- | --------- |
| ~~Optimizar assets~~ | ✅ Resuelto (-6.82MB) | —         |
| ~~Lazy recharts~~    | ✅ Resuelto (-385KiB) | —         |
| **Compresión HTTP**  | ⚠️ Parcial            | Completar |
| **Cache PWA tuning** | ⚠️ Parcial            | Completar |

### 9. Documentación

| Documento         | Estado                                 | Acción                                                                                                                  |
| ----------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `CONTRIBUTING.md` | ✅ **Ya actualizado** (verificado)     | Documenta `origin` como único remoto activo; `jastigoga/pizzeria` es read-only histórico. Informe viejo desactualizado. |
| `DEPLOY.md`       | ✅ Actualizado                         | —                                                                                                                       |
| `ARCHITECTURE.md` | ✅ Actualizado (auth contra employees) | —                                                                                                                       |
| `graphify-out/`   | ✅ **Destrackeado** (2026-08-17)       | 14 archivos de manifiestos de la herramienta de grafos ya no se trackean (están en .gitignore); quedan en disco.        |

---

## 📊 Métricas de Salud del Proyecto

| Métrica                       | Valor     | Estado |
| ----------------------------- | --------- | ------ |
| **TypeScript errors**         | 0         | ✅     |
| **Tests passing**             | 429/429   | ✅     |
| **Lint warnings**             | 0         | ✅     |
| **npm audit vulnerabilities** | 0 (prod)  | ✅     |
| **Build time**                | ~4.5s     | ✅     |
| **Bundle size**               | ~1.13 MiB | ✅     |
| **PWA precache**              | 792 KiB   | ✅     |

---

## 🎯 Plan de Acción Recomendado

### Sesión 1: Configuración Crítica (2-3 horas)

1. **Obtener credenciales Bold** (30 min)
   - Registrarse en Bold Dashboard
   - Obtener `BOLD_API_KEY` y `BOLD_WEBHOOK_SECRET`
   - Configurar en `.env.production`
   - Probar flujo de pago en sandbox

2. **Corregir VPS** (1 hora)
   - Conectar al VPS
   - `docker compose restart nginx`
   - Configurar backup local (cron)
   - Verificar `/api/metrics` acceso

3. **Validar PUT orders** (30 min)
   - Verificar que `total` se recalcula server-side
   - Agregar test anti-tampering si falta

### Sesión 2: Tests y Cobertura (3-4 horas)

1. **Tests críticos** (2 horas)
   - `products.test.js` (CRUD completo)
   - `clients.test.js` (CRUD completo)
   - `finance.test.js` (CRUD completo)

2. **Paginación** (1 hora)
   - Agregar LIMIT/OFFSET a `clients`
   - Actualizar frontend para paginación

### Sesión 3: Decisiones y operación (2-3 horas)

1. **Validar scheduler de campañas**
   - Ejecutar una campaña vencida en entorno controlado
   - Confirmar email/push solo cuando SMTP/VAPID estén configurados

2. **Decidir inventario por receta y monitoreo**
   - Definir evento exacto de descuento de stock
   - Decidir proveedor/canal para alertas n8n

> Scheduler y reconciliación ya no son tareas de implementación: fueron verificadas y deben tratarse como regresión si fallan.

---

## ❓ Preguntas para Decidir

1. **¿Priorizar Bold (pagos) o DIAN (facturación)?**
   - Bold: más simple, solo 2 variables
   - DIAN: complejo, requiere certificado digital + proveedor

2. **¿Crear tests de rutas o paginación primero?**
   - Tests: seguridad antes de expandir funcionalidad
   - Paginación: rendimiento para datos reales

3. **¿Implementar scheduler de campañas o monitoreo n8n?**
   - Scheduler: funcionalidad inmediata
   - Monitoreo: visibilidad en producción

4. **¿Configurar VPS o seguir en desarrollo local?**
   - VPS: validación real
   - Local: iteración rápida

---

## 📚 Documentos de Referencia

- `docs/PENDIENTES_PROVEEDORES.md` — Pasos detallados para Bold y DIAN
- `docs/PENDIENTES_OPERACIONALES_2026-08-17.md` — **Estado verificado contra código** (VPS, backups, Bold/DIAN) con comandos listos
- `docs/GAPS_REMEDIATION_PLAN.md` — Plan de sprints S0-S4
- `docs/GAPS_DETALLADO_2026-08-05.md` — Auditoría completa con tabla por tabla
- `docs/QA_PRODUCCION_2026-08-14.md` — Resultados de QA en producción
- `docs/PENDIENTES_DEPLOY_2026-07-26.md` — Pendientes de deploy

---

> **Conclusión:** El proyecto está técnicamente sólido. Las pendientes son operacionales (credenciales, VPS) y de madurez (tests, automatizaciones). Recomiendo **empezar por Bold** (pagos) ya que es el blocker más directo para generar revenue, mientras se coordinan los pasos más complejos de DIAN.

---

_Informe generado el 2026-08-17 — Buffy (Codebuff)_
