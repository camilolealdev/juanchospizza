# 📚 Índice Maestro de Documentación — Juancho's Pizza / GastroPro

> **Propósito:** Mapa único de toda la documentación del proyecto.
> **Última actualización:** 2026-07-21 (reorganización: 3 docs nuevos actuels + historial consolidado)
> **Repo canónico:** `pizzeria-merge/`. `pizzeria-master/` se conserva como espejo histórico no actualizado.

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

### 📁 `docs/` — Documentación técnica (9 archivos vigentes)

| #   | Archivo                          | Propósito                                           | Reemplaza a              | Estado                              |
| --- | -------------------------------- | --------------------------------------------------- | ------------------------ | ----------------------------------- |
| 6   | `API.md`                         | Referencia endpoints (29 módulos)                   | —                        | ✅ Vigente                          |
| 7   | `AUDIT_COMPLETO.md`              | Auditoría integral (módulos, DB, seguridad)         | —                        | ✅ Vigente                          |
| 8   | `DEPLOY_READINESS_2026-07-21.md` | Estado REAL del proyecto (60% listo)                | `DEPLOY_READINESS.md`    | ✅ Vigente — única fuente de verdad |
| 9   | `DIAN_MODULE_STATUS.md`          | Integración facturación electrónica                 | —                        | ⏳ Pendiente cert + provider real   |
| 10  | `GAPS_REMEDIATION_PLAN.md`       | Plan por sprints S0-S4                              | —                        | ⏳ S1-S4 pendientes                 |
| 11  | `PENDIENTES_PROVEEDORES.md`      | Pasos Bold, DIAN, SMTP, VAPID                       | —                        | ⏳ Pendiente credenciales           |
| 12  | `DESIGN_SYSTEM_TOKENS.md`        | Catálogo de tokens (color, type, radius, z-index…)  | —                        | ✅ Vigente (jul-2026)               |
| 13  | `FRONTEND_AUDIT_2026-07-21.md`   | Auditoría frontend 4-agentes (P0+P1E resueltos hoy) | `TEST_REPORT.md`         | ✅ Vigente — única fuente de verdad |
| 14  | `ISSUES_2026-07-21.md`           | 27 hallazgos priorizados (10 done / 17 backlog)     | `SUGGESTED_FOLLOWUPS.md` | ✅ Vigente — única fuente de verdad |

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
