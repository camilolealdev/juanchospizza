// Validación de payloads para los endpoints de consentimiento y derechos
// ARCO (Ley 1581/2012). El consentimiento puede venir sin identificar
// al titular (visitante anónimo) o con phone/email para asociarlo a un
// cliente existente. derechos_* requiere al menos un identificador
// porque la SIC exige verificar la identidad del titular antes de
// entregar o modificar datos.

import { z } from 'zod';

// consent_type usa los mismos valores que acepta el frontend
// (public/consent-banner.js: 'all' | 'privacy_only' | 'marketing').
const consentTypeSchema = z.enum(['all', 'privacy_only', 'marketing']);

export const postConsentSchema = z.object({
  consent_type: consentTypeSchema,
  granted: z.boolean(),
  phone: z.string().regex(/^[0-9+\-\s()]{6,20}$/).optional().nullable(),
  email: z.string().email().optional().nullable(),
  path: z.string().max(255).optional().nullable(),
});
