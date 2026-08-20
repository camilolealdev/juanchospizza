import { z } from 'zod';
import { str, strOpt } from './helpers.js';

export const pushSubscribeSchema = z.object({
  phone: strOpt(30),
  // El original trata '' igual que ausente/null para este campo específico
  // (a diferencia del resto de los strOpt del proyecto, que dejan '' tal cual).
  clientId: strOpt(100).transform(v => v || null),
  endpoint: str(500, 'Faltan datos requeridos'),
  p256dh: str(200, 'Faltan datos requeridos'),
  auth: str(200, 'Faltan datos requeridos'),
});
