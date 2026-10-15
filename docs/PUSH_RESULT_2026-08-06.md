# Push a `origin/master` — 2026-08-06

## Commit

- Hash: **`ced9878`**
- Mensaje: `fix+feat: csrf webhook bold, anti-tampering total, pagos solo bold, notificaciones ui, auditoria crud`
- Rango del push: **`d995673..ced9878`** → `master -> master`
- Remoto: `https://github.com/camilolealdev/juanchospizza` (`origin`)

## Archivos incluidos (18)

- 16 modificados (`M`): `CHANGELOG.md`, `docs/API.md`, `server/middleware/csrf.js`, `server/routes/orders.js`, `server/routes/payments.js`, `server/schemas/orders.js`, `server/schemas/orders.test.js`, `server/tests/orders.test.js`, `server/tests/payments.test.js`, `src/App.tsx`, `src/components/AdminLayout.tsx`, `src/services/api.ts`, `src/services/payments/index.ts`, `src/services/payments/paymentService.ts`, `src/types/index.ts`, `src/views/roles/PaymentSettingsView.tsx`
- 2 nuevos (`A`): `docs/AUDITORIA_CRUD_GENERAL_2026-08-06.md`, `src/views/roles/NotificacionesView.tsx`
- Stat: **732 insertions(+), 592 deletions(-)**

## Calidad (verde antes del commit)

- `npm run lint` → limpio
- `npm run build` → OK (PWA v1.3.0, 40 precache entries)
- `npx tsc --noEmit` → limpio
- `npx vitest run` → **308/308 passed (29 files)**
- Husky / lint-staged → prettier + eslint pasaron durante el commit

## Contenido del push

- **P0 — CSRF en webhook Bold resuelto**: `server/middleware/csrf.js` exime `/api/payments/bold/webhook`; cliente envía header `x-csrf-token` (`src/services/api.ts`); `POST /api/orders` en `PUBLIC_PATHS` con match exacto.
- **Anti-tampering PUT `/api/orders/:id`**: `total` fuera de `updateOrderSchema`; recálculo verificado desde catálogo + transacción + ROLLBACK.
- **Pagos online SOLO Bold**: MercadoPago/Wompi/PayPal eliminados (`server/routes/payments.js` −311).
- **Frontend de Notificaciones**: `src/views/roles/NotificacionesView.tsx` (ADMIN) + wiring en `App.tsx` y `AdminLayout.tsx` (hallazgo #1 de la auditoría).
- **Auditoría CRUD** en `docs/AUDITORIA_CRUD_GENERAL_2026-08-06.md`.

## Pendientes / observaciones

- README dice "Tests 131/131" (desactualizado; real 308/308).
- Matriz CRUD línea 100 dice "4 pasarelas" (desactualizada; SOLO Bold).
