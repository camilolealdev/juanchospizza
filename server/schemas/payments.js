import { z } from 'zod';
import { str, strOpt } from './helpers.js';

// Solo para las rutas create-link/create-payment/create-transaction/
// create-order -- los webhooks (payload que define cada proveedor, no
// nosotros) se quedan sin schema a propósito, ver server/routes/payments.js.
export const createPaymentSchema = z.object({
  orderId: str(100, 'Falta orderId'),
  customerEmail: strOpt(100),
});
