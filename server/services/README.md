# Servicios Directos — Opción B

> Este directorio contiene servicios directos (síncronos) para operaciones
> que NO requieren el sistema de colas BullMQ + Redis.
>
> **Decisión:** Opción B — Servicios directos en vez de workers asíncronos.
> El sistema BullMQ completo (`queues/`, `workers/`, `redis.js`, `worker.js`)
> se eliminó porque:
> - BullMQ requiere `ioredis`, pero el código usaba `redis` v4 (incompatible)
> - Los workers duplicaban la lógica de estos servicios
> - Ninguna ruta llamaba a `queues.X.add()` — cero integración
>
> Cuando el negocio crezca y necesites procesamiento async real:
> 1. Agregar `ioredis` como dependencia
> 2. Crear colas BullMQ y workers
> 3. Llamar a `queues.X.add()` desde las rutas

## Servicios disponibles

| Archivo | Función | Dependencias |
|---------|---------|-------------|
| `email.js` | Envío de emails vía SMTP (Nodemailer) | `nodemailer` |
| `pdf.js` | Generación de PDFs (facturas, tickets, reportes) | `pdf-lib` |
| `webhooks.js` | Delivery de webhooks a URLs externas | `fetch` (nativo) |

## Uso desde rutas

```js
import { sendEmail } from '../services/email.js';
import { generateInvoicePDF } from '../services/pdf.js';
import { deliverWebhook } from '../services/webhooks.js';
```
