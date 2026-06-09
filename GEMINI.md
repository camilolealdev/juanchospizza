# Core Mandates — Juancho's Pizza

Este archivo contiene las directrices fundamentales para el desarrollo y mantenimiento del proyecto.

## 🏗️ Arquitectura & Integridad
- **Arquitectura Híbrida:** No eliminar el soporte para portales en `index.html`. La landing page estática debe seguir siendo funcional sin JS pesado, inyectando solo lo necesario vía React.
- **Single Source of Truth:** Los tipos en `src/types/index.ts` son la referencia absoluta para los modelos de datos.
- **Portales:** Cualquier nuevo componente del CRM que deba aparecer en la landing page debe usar `createPortal` hacia un nodo `#mount-point` en `index.html`.

## 🔒 Seguridad & Privacidad
- **Variables de Entorno:** Nunca commitear `.env`. Usar siempre el prefijo `VITE_` para variables del frontend.
- **Secrets:** Las claves de Turso y Gemini deben manejarse exclusivamente en el server-side cuando sea posible.
- **Sanitización:** Todo input del usuario debe ser sanitizado antes de llegar a `turso.execute`.

## 🎨 Branding & UX
- **Branding Dual:** 
  - Cliente externo -> **Juancho's Pizza**.
  - Sistema interno -> **GastroPro / Guido**.
- **Performance:** Mantener el bundle size bajo. Usar lazy loading para los módulos pesados del CRM (`GastroProDashboard`, `ReportesView`, etc.).

## 🛠️ Convenciones de Código
- **TypeScript:** No usar `any`. Definir interfaces para todas las respuestas de API.
- **Servicios:** La lógica de comunicación con APIs externas (Gemini, Turso) debe residir en `src/services/`.
- **Backend:** Mantener `server/index.js` organizado por responsabilidades. Planear migración a estructura de controladores.

## 🤖 AI Mandates
- Seguir las reglas de `.ai/shared/branding-cleanup.md`. No permitir branding de herramientas de IA en el código de producción.
