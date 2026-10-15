# Project Context — Juancho's Pizza & GastroPro CRM

## ¿Qué es este proyecto?
Plataforma unificada para la gestión y operación de **Juancho's Pizza** (Nemocón & Zipaquirá). El sistema combina una landing page optimizada para clientes con un CRM interno de grado empresarial llamado **GastroPro**.

### Sobre el Branding
-   **Juancho's Pizza:** Marca comercial principal orientada al cliente.
-   **Guido Pizza / Guido Bogotá:** Nombre interno del motor/ecosistema digital que impulsa la plataforma.
-   **GastroPro:** Nombre de la suite CRM administrativa.

## Stack Tecnológico
-   **Frontend:** React 18 + Vite + Tailwind CSS + Framer Motion.
-   **Backend:** Express.js + Node.js.
-   **Base de Datos:** PostgreSQL.
-   **IA:** Google Gemini SDK (`@google/generative-ai`).
-   **Hosting:** Vercel para el frontend (build estático de Vite, `vercel.json` no tiene funciones serverless). El backend Express **no vive en Vercel** -- necesita un host aparte (pensado para Docker en un VPS, ver `docker-compose.yml`). No asumir que el deploy de Vercel incluye la API.

## Arquitectura de Aplicación
-   **Híbrida:** El CRM se inyecta como un overlay sobre la landing page estática en `index.html`.
-   **Portales:** Componentes React como `MenuDigital` se portalizan en nodos específicos del HTML estático (`#menu-mount`).
-   **Multi-rol:** Soporte para CLIENT, ADMIN, OPERATOR (Cocina), REPARTIDOR y MARKETING.

## Estados de Pedidos
PENDING → CONFIRMED → PREPARING → READY → ASSIGNED → DELIVERING → COMPLETED

## Convenciones de Desarrollo
-   **Naming:** camelCase para variables/funciones, PascalCase para componentes, kebab-case para archivos.
-   **Tailwind:** Utility-first, con fuerte uso de clases dinámicas y responsive.
-   **API:** Cliente centralizado en `src/services/api.ts`.
-   **Types:** Definiciones centralizadas en `src/types/index.ts`.

## Deuda Técnica & Roadmap
1.  **ORM:** Evaluar migración a Drizzle ORM para tipado seguro en queries SQL.
2.  **PINs:** siguen siendo la lista hardcodeada en `server/auth.js` (ya con salts random, ver auditoría 2026-07-09) -- mover a DB sigue pendiente si se necesita gestión dinámica de staff.
3.  **Tests de backend:** `server/routes/*.js` y `server/schemas/*.js` (validación Zod agregada 2026-07-09) no tienen cobertura automatizada todavía -- solo se verificaron a mano con requests HTTP reales durante la sesión que los construyó.
4.  **TypeScript strict mode:** `tsconfig.json` no tiene `strict: true` -- deuda real dado que este código maneja pedidos/pagos.
