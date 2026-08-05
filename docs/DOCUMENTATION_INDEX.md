# 📚 Índice Maestro de Documentación — Juancho's Pizza / GastroPro

> **Propósito:** Mapa único de toda la documentación del proyecto.
> **Última actualización:** 2026-08-05 (catálogo ampliado a 27 docs vigentes + registro de auditorías continuas)
> **Repo canónico:** `pizzeria-merge/`. `pizzeria-master/` se conserva como espejo histórico no actualizado.
> **Grafo del proyecto:** `graphify-out/` (raíz) — knowledge graph regenerado el 2026-08-05 (2038 nodos · 2957 edges · 181 comunidades). Consultable con `/graphify query`.

---

## 📂 Estructura Actual (post-reorganización 2026-07-21)

```
pizzeria-merge/                    ★ Repo canónico (single source of truth)
├── README.md                       ★ Entrada — Stack, setup, roles
├── ARCHITECTURE.md                 ★ Decisiones técnicas, patrón híbrido
├── CHANGELOG.md                    ★ Historial de versiones
├── CONTRIBUTING.md                 ★ Guía para contribuir
├── DEPLOY.md                       ★ Despliegue (Docker, VPS, CI/CD)
│
└── docs/                           ★ ★ Toda la documentación consolidada
    ├── DOCUMENTATION_INDEX.md      ★ Este archivo (índice maestro)
    │
    ├── [ACTUAL · fuentes vivas]
    │   ├── API.md                       ★ ★ ★ Referencia de endpoints (29 módulos)
    │   ├── AUDIT_COMPLETO.md             ★ ★ ★ Auditoría integral del proyecto
    │   ├── DEPLOY_READINESS_2026-07-21.md ★ ★ Estado REAL del proyecto hoy
    │   ├── DIAN_MODULE_STATUS.md          ★ ★ Facturación electrónica — estado
    │   ├── GAPS_REMEDIATION_PLAN.md       ★ ★ Plan por sprints S0-S4
    │   ├── PENDIENTES_PROVEEDORES.md     ★ ★ Bold, DIAN, certs, SMTP, etc.
    │   ├── DESIGN_SYSTEM_TOKENS.md       ★ ★ Catálogo tokens + roadmap
    │   ├── FRONTEND_AUDIT_2026-07-21.md  ★ ★ Auditoría frontend 4-agentes
    │   └── ISSUES_2026-07-21.md          ★ ★ 27 hallazgos (10 resueltos / 17 backlog)
    │
    └── history/                   ★ Snapshots históricos (no actualizar)
        ├── AUDIT_REPORT_2026-06.md         (jun-2026)
        ├── RESPONSIVITY_AUDIT_2026-06.md  (jun-2026)
        ├── DEPLOY_READINESS.md            (jul-2026, reemplazado por DEPLOY_READINESS_2026-07-21)
        ├── SUGGESTED_FOLLOWUPS.md         (jul-2026, reemplazado por ISSUES_2026-07-21)
        ├── TEST_REPORT.md                 (jul-2026, reemplazado por FRONTEND_AUDIT_2026-07-21)
        ├── IMPLEMENTATION_SUMMARY.md      (jul-2026, redundante con CHANGELOG + AUDIT_COMPLETO)
        ├── IMPLEMENTATION_SUMMARY__2026-07-15.md  (snapshot raíz, mismo contenido)
        └── DEPLOY_GUIDE.md                (jul-2026, generic deploy guide superseded por DEPLOY.md)
```

> **★** = esencial · **★★** = referencia técnica esencial · **★★★** = fuente vigente hoy

> **★** = Documento raíz esencial  
> **★★** = Documento de referencia técnica esencial

---

## 🔍 Catálogo Vigente (9 docs en `docs/` + 5 en raíz = 14 fuentes vivas)

### 📄 Raíz de `pizzeria-merge/` (5 archivos esenciales)

| #   | Archivo           | Propósito                                         | Estado                |
| --- | ----------------- | ------------------------------------------------- | --------------------- |
| 1   | `README.md`       | Stack, instalación, roles, estructura             | ✅ Vigente            |
| 2   | `ARCHITECTURE.md` | Decisiones arquitectónicas, patrón híbrido, deuda | ✅ Vigente            |
| 3   | `CHANGELOG.md`    | Historial v1.0.0 → v2.0.0                         | ✅ Vigente            |
| 4   | `CONTRIBUTING.md` | Guía de contribución y convenciones               | ✅ Vigente            |
| 5   | `DEPLOY.md`       | Despliegue Docker, VPS, CI/CD                     | ✅ Vigente (jul-2026) |

### 📁 `docs/` — Documentación técnica (27 archivos vigentes)

#### 🔒 Auditorías y brechas (fuente vigente hoy)

| #   | Archivo                         | Propósito                                                                                                          | Estado                        |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| 6   | `GAPS_DETALLADO_2026-08-05.md`  | **Brechas 2026-08-05** — informe componente por componente (34 tablas, 32 routers, 20 vistas): qué hay y qué falta | ✅ Vigente — el más detallado |
| 6b  | `BREACHES_2026-08-04.md`        | **Brechas 2026-08-04** — 5 áreas, 10 hallazgos (5 resueltos), cobertura 66.34%                                     | ✅ Vigente                    |
| 7   | `AUDIT_2026-07-30.md`           | Auditoría pre-deploy multi-agente (4 Critical + 9 High) — sección 0 con seguimiento 08-04                          | ✅ Vigente con seguimiento    |
| 8   | `ISO27001_AUDIT_2026-07-26.md`  | Auditoría ISO/IEC 27001 pre-deploy (3 no conformidades)                                                            | ✅ Vigente                    |
| 9   | `PREDEPLOY_AUDIT_2026-07-26.md` | Auditoría pre-deploy completa + checklist verificación                                                             | ✅ Vigente                    |
| 10  | `READINESS_FINAL.md`            | Evaluación final de readiness                                                                                      | ✅ Vigente                    |
| 11  | `AUDIT_COMPLETO.md`             | Auditoría integral (módulos, DB, seguridad)                                                                        | —                             | ✅ Vigente (jul-2026) |
| 12  | `FRONTEND_AUDIT_2026-07-21.md`  | Auditoría frontend 4-agentes (P0+P1E resueltos)                                                                    | `TEST_REPORT.md`              | ✅ Vigente            |
| 13  | `ISSUES_2026-07-21.md`          | 27 hallazgos priorizados (10 done / 17 backlog)                                                                    | `SUGGESTED_FOLLOWUPS.md`      | ✅ Vigente            |

#### 🚀 Deploy, monitoreo y operación

| #   | Archivo                           | Propósito                                                            | Estado                |
| --- | --------------------------------- | -------------------------------------------------------------------- | --------------------- |
| 14  | `DEPLOY_READINESS_2026-07-21.md`  | Estado REAL del proyecto                                             | `DEPLOY_READINESS.md` | ✅ Vigente                     |
| 15  | `PENDIENTES_DEPLOY_2026-07-26.md` | Pendientes de la sesión de deploy (bloqueante: Docker nunca levantó) | —                     | ✅ Vigente + seguimiento 08-04 |
| 16  | `DEPLOY_SUMMARY.md`               | Resumen de deploy + checklist pre-deploy                             | —                     | ✅ Vigente                     |
| 17  | `DR_RUNBOOK.md`                   | Runbook de disaster recovery (docker compose v2)                     | —                     | ✅ Vigente                     |
| 18  | `MONITOREO_N8N.md`                | Propuesta monitoreo con n8n (health + metrics)                       | —                     | ⏳ Propuesta — no implementado |
| 19  | `DOCKER_DNS_FIX.md`               | Fix de DNS IPv6 para builds Docker en Windows                        | —                     | ✅ Vigente                     |

#### 📋 Producto, especificación y módulos

| #   | Archivo                       | Propósito                                          | Estado |
| --- | ----------------------------- | -------------------------------------------------- | ------ |
| 20  | `PRD.md`                      | Product Requirements Document                      | —      | ✅ Vigente                        |
| 21  | `TRD.md`                      | Technical Requirements Document                    | —      | ✅ Vigente                        |
| 22  | `MVP_SCOPE.md`                | Alcance del MVP                                    | —      | ✅ Vigente                        |
| 23  | `USER_FLOW.md`                | Flujos de usuario                                  | —      | ✅ Vigente                        |
| 24  | `UIUX_PLAN.md`                | Plan UI/UX                                         | —      | ✅ Vigente                        |
| 25  | `DEV_PLAN.md`                 | Plan de desarrollo                                 | —      | ✅ Vigente                        |
| 26  | `DISENO_CATALOGO_TOPPINGS.md` | Diseño catálogo toppings + armador (nota estado)   | —      | ✅ Vigente                        |
| 27  | `API.md`                      | Referencia endpoints (29 módulos)                  | —      | ✅ Vigente                        |
| 28  | `DIAN_MODULE_STATUS.md`       | Integración facturación electrónica                | —      | ⏳ Pendiente cert + provider real |
| 29  | `GAPS_REMEDIATION_PLAN.md`    | Plan por sprints S0-S4                             | —      | ⏳ S1-S4 pendientes               |
| 30  | `PENDIENTES_PROVEEDORES.md`   | Pasos Bold, DIAN, SMTP, VAPID                      | —      | ⏳ Pendiente credenciales         |
| 31  | `DESIGN_SYSTEM_TOKENS.md`     | Catálogo de tokens (color, type, radius, z-index…) | —      | ✅ Vigente (jul-2026)             |

### 📁 `docs/history/` — Snapshots (no modificar, referencia)

| #   | Archivo                                 | Origen          | Snapshot de                                           |
| --- | --------------------------------------- | --------------- | ----------------------------------------------------- |
| H1  | `AUDIT_REPORT_2026-06.md`               | jun-2026        | Auditoría junio                                       |
| H2  | `RESPONSIVITY_AUDIT_2026-06.md`         | jun-2026        | Responsividad junio                                   |
| H3  | `DEPLOY_READINESS.md`                   | jul-2026        | Versión vieja del estado pre-deploy                   |
| H4  | `SUGGESTED_FOLLOWUPS.md`                | jul-2026        | Sugerencias obsoletas                                 |
| H5  | `TEST_REPORT.md`                        | jul-2026        | Reporte de tests anterior                             |
| H6  | `IMPLEMENTATION_SUMMARY.md`             | jul-2026        | Snapshot de implementación (redundante con CHANGELOG) |
| H7  | `IMPLEMENTATION_SUMMARY__2026-07-15.md` | jul-2026 (raíz) | Duplicado de H6                                       |
| H8  | `DEPLOY_GUIDE.md`                       | jul-2026 (raíz) | Deploy guide genérico antes de DEPLOY.md              |

---

## 🗺️ Mapa de Relaciones entre Documentos

```
                    ┌─────────────────────────┐
                    │       README.md          │  ← Punto de entrada
                    │   (Stack, setup, roles)  │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │ ARCHITECTURE  │   │ CONTRIBUTING  │   │   DEPLOY.md   │
    │  .md (por qué)│   │  .md (cómo)   │   │ (cómo deploy) │
    └───────────────┘   └───────────────┘   └───────┬───────┘
                                                    │
                    ┌───────────────────────────────┘
                    ▼
            ┌───────────────┐
            │  docs/API.md  │  ← Referencia técnica
            └───────┬───────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌────────────┐ ┌────────┐ ┌────────────┐
│ Proveedores│ │  DIAN  │ │ Auditoría  │
│ Ext.      │ │ Status │ │ Completa   │
└────────────┘ └────────┘ └────────────┘
```

---

---

## 📌 Últimos docs agregados (2026-07-30 → 2026-08-05)

| Doc                                                                                   | Fecha  | Por qué existe                                                                                                                        |
| ------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `AUDIT_2026-07-30.md`                                                                 | 30-jul | Auditoría pre-deploy multi-agente (10 especialistas). Sección 0 = seguimiento 04-ago de los fixes en `73e08da`.                       |
| `BREACHES_2026-08-04.md`                                                              | 04-ago | Auditoría 5 áreas del día: 10 hallazgos, 5 resueltos (cobertura 66.34% + gate CI), pagos/orders cubiertos, bundle recharts pendiente. |
| `PENDIENTES_DEPLOY_2026-07-26.md`                                                     | 26-jul | Ledger de la sesión de deploy: bloqueante Docker Desktop, reconciliación git, hallazgos sin corregir. Seguimiento 04-ago agregado.    |
| `PREDEPLOY_AUDIT_2026-07-26.md`, `READINESS_FINAL.md`, `ISO27001_AUDIT_2026-07-26.md` | 26-jul | Auditorías pre-deploy del día (una de una sesión paralela).                                                                           |
| `DEPLOY_SUMMARY.md`, `DR_RUNBOOK.md`, `MONITOREO_N8N.md`                              | jul    | Resumen deploy, runbook DR, propuesta monitoreo.                                                                                      |
| `PRD.md`, `TRD.md`, `MVP_SCOPE.md`, `USER_FLOW.md`, `UIUX_PLAN.md`, `DEV_PLAN.md`     | jul    | Especificación de producto y planificación.                                                                                           |
| `DISENO_CATALOGO_TOPPINGS.md`                                                         | ago    | Diseño del catálogo de toppings — nota de estado del armador unificado (`470a48a`).                                                   |
| `DOCKER_DNS_FIX.md`                                                                   | jul    | Fix de resolución DNS para builds en Docker Desktop Windows.                                                                          |

> Los docs con sufijo `_YYYY-MM-DD` son **snapshots fechados**. Cuando se publique una versión más nueva, el hermano sin fecha se mueve a `docs/history/`.

---

## 🧹 Limpieza Ejecutada (2026-07-21)

### 📦 Archivado en `docs/history/` (5 archivos)

| Archivo (antes)                       | Movimiento                                                    | Razón                                                    |
| ------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| `docs/DEPLOY_READINESS.md`            | renombrado en `docs/history/` (sin sufijo — único snapshot)   | Reemplazado por `docs/DEPLOY_READINESS_2026-07-21.md`    |
| `docs/IMPLEMENTATION_SUMMARY.md`      | movido a `docs/history/IMPLEMENTATION_SUMMARY.md`             | Redundante con `CHANGELOG.md` + `AUDIT_COMPLETO.md`      |
| `docs/SUGGESTED_FOLLOWUPS.md`         | movido a `docs/history/SUGGESTED_FOLLOWUPS.md`                | Reemplazado por `docs/ISSUES_2026-07-21.md`              |
| `docs/TEST_REPORT.md`                 | movido a `docs/history/TEST_REPORT.md`                        | Reemplazado por `docs/FRONTEND_AUDIT_2026-07-21.md`      |
| `../IMPLEMENTATION_SUMMARY.md` (raíz) | movido a `docs/history/IMPLEMENTATION_SUMMARY__2026-07-15.md` | Duplicado exacto del `IMPLEMENTATION_SUMMARY.md` tracked |
| `../DEPLOY_GUIDE.md` (raíz)           | movido a `docs/history/DEPLOY_GUIDE.md`                       | Deploy guide genérico superseded por `DEPLOY.md`         |

### 🆕 Promovidos a `docs/` vigentes (3 archivos)

| Archivo (untracked)                 | Estado actual                                     |
| ----------------------------------- | ------------------------------------------------- |
| `docs/DESIGN_SYSTEM_TOKENS.md`      | ✅ Trackeado                                      |
| `docs/FRONTEND_AUDIT_2026-07-21.md` | ✅ Trackeado — reemplaza `TEST_REPORT.md`         |
| `docs/ISSUES_2026-07-21.md`         | ✅ Trackeado — reemplaza `SUGGESTED_FOLLOWUPS.md` |

### ✅ Política de ahora en adelante

> Los archivos con sufijo `_YYYY-MM-DD` (ej. `FRONTEND_AUDIT_2026-07-21.md`) son **snapshots fechados**. Cuando se publique una nueva versión, su archivo hermano sin fecha (ej. `TEST_REPORT.md`) debe moverse a `docs/history/` y la nueva versión debe quedarse en `docs/`.

---

> **📌 Nota:** Este índice se actualiza manualmente cuando se agregan/eliminan documentos. Si ves que falta algún archivo, ¡avísame!
