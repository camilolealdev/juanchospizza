# 🔍 INFORME DE AUDITORÍA — Juancho's Pizza v9.0

**Fecha:** 2026-06-09  
**Auditor:** Gemini CLI Agent

---

## 📊 RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Estado anterior** | 5.5/10 (v8.0) |
| **Estado actual** | 7.5/10 |
| **Stack** | React + Vite + Express + Turso |
| **DB** | Turso (libSQL) |
| **Issues Críticos** | 1 (Auth) |
| **Issues Importantes** | 4 |

### Avances desde v8.0:
1. ✅ **SEC-005:** Implementado rate limiting básico por IP en el backend.
2. ✅ **SEC-004:** Implementada sanitización y validación manual de inputs en `/api/orders`.
3. ✅ **DOC-001:** Documentación alineada con la arquitectura híbrida (Landing + CRM).
4. ✅ **STR-001:** Limpieza de branding de IA externa completada.

---

## 🔒 HALLAZGOS DE SEGURIDAD

### 🔴 SEC-003 — Auth por PIN Hardcodeado
| Campo | Valor |
|-------|-------|
| **Severidad** | CRÍTICO |
| **Archivo** | `src/App.tsx` |
| **Riesgo** | Acceso no autorizado trivial, falta de auditoría de acciones. |

**Acción:** Implementar JWT y mover usuarios/pines a la base de datos con hashing (bcrypt).

---

### 🟡 DB-001 — Sin ORM (SQL Directo)
| Campo | Valor |
|-------|-------|
| **Severidad** | IMPORTANTE |
| **Archivo** | `server/index.js` |
| **Riesgo** | Difícil mantenimiento, propenso a errores de tipado, potencial SQL Injection si falla la sanitización manual. |

**Acción:** Migrar a Drizzle ORM para tipado seguro y mejores migraciones.

---

### 🟡 SEC-004 — Validación Manual vs Zod
| Campo | Valor |
|-------|-------|
| **Severidad** | IMPORTANTE |
| **Archivo** | `server/index.js` |
| **Estado** | Parcialmente mitigado con `String().slice()`. |

**Acción:** Implementar Zod para validaciones de esquema rigurosas y tipado automático.

---

## 🏗️ ARQUITECTURA HÍBRIDA

El sistema ha sido identificado como una solución híbrida:
- **Landing Page:** HTML Estático optimizado.
- **GastroPro CRM:** Aplicación React portalizada.

**Recomendación:** Mantener la separación de concerns pero centralizar la lógica de estado compartido (ej. carrito) para evitar duplicidad de datos entre el JS estático y el Context de React.

---

## 📋 PLAN DE ACCIÓN PRIORIZADO

1.  **Auth Real:** Migrar de `TEST_USERS` en `App.tsx` a una tabla `users` en Turso.
2.  **Drizzle ORM:** Implementar la capa de datos con Drizzle.
3.  **Zod Schemas:** Definir esquemas compartidos entre frontend y backend.
4.  **UI/UX:** Consolidar el diseño del CRM para que sea consistente con la marca Juancho's Pizza.

---
*Generado por Gemini CLI — Junio 2026*
