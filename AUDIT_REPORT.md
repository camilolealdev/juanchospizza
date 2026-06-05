# 🔍 INFORME DE AUDITORÍA — PIZZERIAv2

**Fecha:** 2026-04-10  
**Versión del Documento Maestro:** v8.0  
**Auditor:** AI Assistant (Documento Maestro)

---

## 📊 RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Estado anterior** | 5.5/10 |
| **Estado posterior objetivo** | 8.5/10 |
| **Stack** | React + Vite + Express + Turso |
| **DB** | Turso (libSQL edge) |
| **Archivos analizados** | ~50 |
| **Problemas identificados** | 18 |
| **🔴 Críticos** | 2 |
| **🟡 Importantes** | 8 |
| **🟢 Mejoras** | 8 |

### Top hallazgos críticos:

1. 🔴 **SEC-001:** API Key de Gemini expuesta en `.env`
2. 🔴 **SEC-002:** Token de Turso Auth expuesto en `.env`
3. 🟡 **ST-001:** Estructura plana sin separación de capas
4. 🟡 **ST-002:** Sin autenticación real (hardcoded PINs)
5. 🟡 **DB-001:** Sin ORM, SQL directo en controladores
6. 🟢 **UI-001:** Tailwind sin design tokens centralizados

---

## 🔒 HALLAZGOS DE SEGURIDAD

### 🔴 SEC-001 — API Key de Gemini expuesta
| Campo | Valor |
|-------|-------|
| **Severidad** | CRÍTICO |
| **Archivo** | `.env:2` |
| **Línea** | 2 |
| **Tipo** | API Key hardcodeada |
| **Valor** | `AIzaSyC1BtMaPEDOde-P6f0sVUaHdRO4enbOVzY` |
| **En Git?** | No (en .gitignore) |
| **Riesgo** | Compromiso de la cuenta de GCP, cargos inesperados |

**Acción:**
1. ✅ Rotar la clave inmediatamente en Google AI Studio
2. ✅ Usar Variables de entorno en server-side only
3. ✅ Mover a Turso secrets si está disponible

---

### 🔴 SEC-002 — Token de Turso Auth expuesto
| Campo | Valor |
|-------|-------|
| **Severidad** | CRÍTICO |
| **Archivo** | `.env:10` |
| **Línea** | 10 |
| **Tipo** | Database Auth Token |
| **Valor** | `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...` (exposed) |
| **En Git?** | No (en .gitignore) |
| **Riesgo** | Acceso completo a la base de datos |

**Acción:**
1. ✅ Regenerar el token en Turso Dashboard
2. ✅ Almacenar en secrets manager (Vercel, Doppler)
3. ✅ Nunca commitear valores reales

---

### 🟡 SEC-003 — Credenciales hardcodeadas en código
| Campo | Valor |
|-------|-------|
| **Severidad** | IMPORTANTE |
| **Archivo** | `src/App.tsx` |
| **Línea** | 28-33 |
| **Tipo** | Pines de acceso en texto plano |
| **Detalles** | `admin: 1234`, `cocina: 5678`, etc. |

**Acción:**
1. Implementar auth real con JWT
2. Hashear los pines si se mantienen
3. Mover a base de datos con hash

---

### 🟡 SEC-004 — Sin validación de inputs
| Campo | Valor |
|-------|-------|
| **Severidad** | IMPORTANTE |
| **Archivo** | `server/index.js` |
| **Línea** | 216-233 |
| **Tipo** | POST /orders sin sanitización |

**Acción:**
1. Usar Zod para validar inputs
2. Sanitizar datos antes de insertar

---

### 🟢 SEC-005 — CORS permisivo
| Campo | Valor |
|-------|-------|
| **Severidad** | MEJORA |
| **Archivo** | `server/index.js` |
| **Línea** | 16 |

**Acción:**
1. Configurar CORS por ambiente
2. Usar whitelist de dominios

---

## 🏗️ ESTRUCTURA

### Scorecard de Estructura

| Dimensión | Puntaje | Hallazgo |
|----------|--------|---------|
| Estructura de carpetas | 4/10 | plana, sin separación de concerns |
| Separación de concerns | 3/10 | negocio en routes |
| Naming consistency | 8/10 | Uniforme |
| Capa de datos | 3/10 | Sin ORM, SQL directo |
| Config management | 5/10 | .env básico |

### Problemas de Estructura

| ID | Severidad | Problema | Ubicación |
|----|----------|---------|-----------|
| ST-001 | 🟡 | Estructura plana | Raíz src/ |
| ST-002 | 🟡 | Sin packages/shared | — |
| ST-003 | 🟡 | Lógica en routes | server/index.js |
| ST-004 | 🟢 | Sin cleanup de GSAP | No aplicable |

---

## 🗄️ BASE DE DATOS

### Estrategia actual

- **DB:** Turso (libSQL edge SQLite)
- **ORM:** No — SQL directo
- **Multi-tenancy:** No
- **Inicialización:** `initDB()` en server startup

### Problemas de DB

| ID | Severidad | Problema |
|----|----------|---------|
| DB-001 | 🟡 | Sin ORM, queries en controladores |
| DB-002 | 🟡 | Sin manejo de transacciones |
| DB-003 | 🟢 | Sin Índices en columnas de filtro |
| DB-004 | 🟢 | Sin migrations (DDL en código) |

---

## 🔐 AUTH

### Estado actual

- **Modo:** PIN hardcodeado (no es autenticación real)
- **almacenamiento:** En memoria (TEST_USERS)
- **Roles:** CLIENT, ADMIN, OPERATOR, REPARTIDOR, MARKETING

### Problemas de Auth

| ID | Severidad | Problema |
|----|----------|---------|
| AUTH-001 | 🟡 | Sin JWT, tokens |
| AUTH-002 | 🟡 | Pines en texto plano |
| AUTH-003 | 🟡 | Sin sesiones seguras |
| AUTH-004 | 🟢 | Sin rate limiting |

---

## 📱 RESPONSIVE Y UI/UX

### Estado actual

- **Diseño:** Tailwind CSS
- **Responsive:** Clases responsive de Tailwind
- **Accesibilidad:** Parcial

### Problemas de UI/UX

| ID | Severidad | Problema |
|----|----------|---------|
| UI-001 | 🟢 | Tailwind sin tokens centralizados |
| UI-002 | 🟢 | Sin loading states consistentes |
| UI-003 | 🟢 | Sin empty states |

---

## 🎨 ANIMACIONES

**Estado:** No se detectan GSAP, Three.js ni Spline en uso actual

---

## ⚡ PERFORMANCE

| Métrica | Estado |
|---------|--------|
| Server rendering | Express SSR |
| CDN | Vercel |
| Caching | Básico |
| Image optimization | Manual |

---

## ☁️ DEPLOYMENT

- **Proveedor:** Vercel
- **Config:** `vercel.json` presente
- **Docker:** No

---

## ⚖️ LICENCIAMIENTO

| Dependencia | Licencia |
|------------|----------|
| React 18 | MIT |
| Tailwind | MIT |
| Express | MIT |
| @libsql/client | Apache 2.0 |
| @google/generative-ai | Apache 2.0 |

---

## 🤖 LIMPIEZA DE IA

### Referencias eliminadas:

| ID | Tipo | Archivo | Línea |
|----|------|---------|-------|
| IA-001 | Referencia en README | README.md | 112 |

---

## 📋 PLAN DE ACCIÓN PRIORIZADO

### 🔴 INMEDIATO (hoy)
1. [SEC-001] Rotar API Key de Gemini
2. [SEC-002] Regenerar token de Turso

### 🟡 ESTA SEMANA
1. [ST-001] Crear estructura modular
2. [AUTH-001] Implementar JWT básico
3. [DB-001] Migrar a Drizzle ORM

### 🟢 PRÓXIMO SPRINT
1. [UI-001] Centralizar design tokens
2. [SEC-004] Añadir validación de inputs
3. [SEC-003] Mover credenciales a DB

---

## 📄 ARCHIVOS GENERADOS DURANTE LA AUDITORÍA

- `AUDIT_REPORT.md` — Este informe

---

## ✅ CHECKLIST DE VERIFICACIÓN

```
ESTRUCTURA Y CÓDIGO
[ ] Imports actualizados
[ ] package.json scripts correctos
[ ] Sin archivos huérfanos

SEGURIDAD
[x] Sin secretos en repo (están en .gitignore)
[x] .gitignore completo
[ ] Headers de seguridad activos
[ ] Rate limiting

BASE DE DATOS
[x] Turso configurado
[ ] ORM implementado

AUTH
[ ] JWT implementado
[ ] Pines hasheados

UI/UX
[ ] Design tokens centralizados
[ ] Loading states

LIMPIEZA DE IA
[x] Referencias a Google AI Studio eliminadas
```

---

## NOTAS

1. El proyecto está razonablemente organizado para su tamaño
2. Los hallazgos críticos son de secrets management — rotar inmediatamente
3. La arquitectura puede mejorarse con capas modulares
4. Para una aplicación de producción, se recomienda implementar auth real

---

*Generado por Documento Maestro v8.0*