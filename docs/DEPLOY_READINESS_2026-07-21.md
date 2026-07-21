# Estado real del proyecto — 2026-07-21

Auditoría de entrega. Reemplaza en vigencia (no en contenido histórico) a
`docs/DEPLOY_READINESS.md` (2026-07-15) y `docs/SUGGESTED_FOLLOWUPS.md` —
ambos describen un estado anterior a todo el trabajo de esta rama.

**Rama auditada:** `feat/pizza-sizes` (17 commits, 33 archivos, +3727/-544
sobre `master`). `master` sigue en `809c0a7`, sin nada de esto.

---

## 1. Estado real de deploy — lo más importante de este documento

**Nada de lo construido hoy (ni de varias sesiones anteriores) está en
producción real.** Concretamente:

- **Backend: nunca se ha desplegado en ningún host real**, en ningún
  momento de la historia del proyecto. Corre local en Docker (ver §4) y ahí
  nomás.
- **Frontend en Vercel: atascado, no roto.** `pizzeria-fawn.vercel.app`
  responde `HTTP 200` ahora mismo — pero sirve una build vieja. Cada push
  reciente (producción Y preview) devuelve `"Deployment was blocked"`
  ("GitHub couldn't verify an account for the commit"). Es un bloqueo de
  Vercel por verificación de autor de commit, no un fallo de build — los
  commits de hoy están firmados como `Buffy <buffy@pizzeria-local>`, una
  cuenta que Vercel no puede verificar como colaboradora real del proyecto.
  **Acción:** re-vincular la integración GitHub↔Vercel, o asegurar que los
  commits que se quieran desplegar salgan de una cuenta de GitHub real y
  verificada como colaboradora.
- **`master` está 17 commits atrás** de todo el trabajo de pizza_sizes/menu
  real/CTP/docker de hoy. Nada de esto llega a Vercel ni por accidente
  hasta que alguien haga merge a `master` — y aun con merge, seguiría
  bloqueado por el problema de arriba hasta resolverlo.

**Conclusión de esta sección:** lo que hay hoy es un *ambiente Docker local
verificado y funcional* (§4), no un deploy real. Antes de mostrarle esto a
un cliente/usuario real hace falta: (a) arreglar el bloqueo de Vercel, (b)
decidir dónde vive el backend real (VPS, per discusiones anteriores — nunca
resuelto), (c) merge a `master` cuando esté listo.

---

## 2. Qué se construyó/arregló en esta rama

- **Menú real completo en base de datos** (antes: hardcodeado y
  desincronizado entre sitio público y CRM). 7 categorías, 54 productos, 23
  ingredientes, 4 tamaños de pizza, 14 variantes-combo — todo sembrado y
  verificado contra Postgres real, no solo en código.
- **Armador "Crea tu pizza" (CTP)** del sitio público reescrito para leer
  `/api/pizza-sizes` + `/api/ingredients` en vez de catálogos hardcodeados
  (uno con nombres reales, otro con un catálogo gourmet fantasía viejo que
  nunca coincidía con el menú real).
- **CRM (MenuInteligente.tsx):** tab nueva "Tamaños de Pizza" con CRUD
  completo (crear/editar/borrar/activar) — antes solo existía la tabla y
  la API, sin UI.
- **Cuenta admin:** tenía password sin setear (ventana de bootstrap
  solo-PIN abierta desde que existe la cuenta). Password real seteado y
  verificado esta sesión — login solo-PIN ahora rechaza correctamente.
- **Stack Docker completo funcional**, ver §4.
- **Seguridad:** 1 XSS real encontrado y arreglado hoy (ver §3).

---

## 3. Seguridad

**Encontrado y arreglado hoy:**
- **Stored XSS en el armador CTP (`index.html`).** 7 puntos insertaban
  nombre/descripción de ingredientes y tamaños (editables por ADMIN/
  MARKETING desde la CRM) directo en `innerHTML` sin escapar. Un nombre de
  ingrediente con `<script>` o un atributo `onerror` habría ejecutado en el
  navegador de cualquier visitante del sitio público. Arreglado
  (`escapeHtml()` aplicado en los 7 puntos), commit `d2a0164`.

**Verificado limpio (confirmado en código, no solo supuesto):**
- Rutas nuevas (`/api/pizza-sizes`, `subcategory` en `/api/products`):
  GET público, POST/PUT/DELETE correctamente gateados a ADMIN/MARKETING.
  Queries parametrizadas, sin riesgo de SQL injection.
- `server/auth.js`: una vez seteado el password de un super-admin, el PIN
  solo YA NO alcanza — confirmado en código (rama estructuralmente
  inalcanzable), no solo por prueba manual.
- Sin secretos hardcodeados en archivos trackeados (grep completo de
  `server/`, `src/`, configs de Docker).
- JWT/cookies: `timingSafeEqual`, `HttpOnly`/`SameSite`/`Secure`-en-prod
  todos correctos, sin cambios respecto a auditorías previas.
- `nginx.conf`: headers de seguridad presentes (X-Frame-Options,
  X-Content-Type-Options, X-XSS-Protection, Referrer-Policy,
  Permissions-Policy, CSP). Dos notas, no bloqueantes:
  - HSTS está comentado (razonable con cert self-signed local; activarlo
    antes de un deploy real con cert válido).
  - CSP incluye `'unsafe-inline' 'unsafe-eval'` en `script-src` — permisivo,
    pragmático dado que `index.html` tiene mucho `<script>` inline, pero
    reduce el valor real de la CSP contra XSS. No urgente dado el fix de
    arriba, pero vale la pena endurecer a futuro (nonces/hashes).

**Riesgo aceptado por diseño, no bug:** roles OPERATOR/REPARTIDOR/MARKETING
siguen solo-PIN con PINs default conocidos (1234/5678/0000/9999) — UX
deliberada de terminal compartida. Confirmar que el negocio acepta ese
riesgo antes de exponer esos roles fuera de un terminal físicamente
controlado.

---

## 4. Docker / infraestructura local

**Estado: funcional y verificado en vivo**, primera vez que este stack
corre contra Postgres real en la historia del proyecto.

| Servicio | Estado | Nota |
|---|---|---|
| `postgres` | ✅ healthy | Sembrado con datos reales, verificado |
| `redis` | ✅ healthy | |
| `app` | ✅ healthy | Puerto 3001 publicado, login+API real verificados |
| `nginx` | ✅ funcional | HTTPS real (self-signed local) en :80/:443, redirect http→https OK |
| `worker` | 🗑️ removido | `server/worker.js` no existe — BullMQ se sacó del código hace tiempo, el servicio quedaba huérfano crasheando en loop. Ver comentario en `docker-compose.yml` para cómo re-agregarlo si algún día hace falta procesamiento async real. |

**Bugs reales encontrados y arreglados en el camino** (no solo config, bugs
de verdad que hubieran roto cualquier deploy real):
- `src/services/api.ts`: URL de API horneada como `http://localhost:3001`
  en cada build de producción — cualquier visitante real le pegaba a SU
  PROPIO localhost, no al servidor. Cambiado a URL relativa.
- `Dockerfile`: healthcheck le pegaba a puerto vacío (`${BUILD_PORT}`, un
  ARG que no persiste a runtime, en vez de `${PORT}`, el ENV real).
- `package-lock.json` desincronizado — `npm ci` fallaba silencioso en cada
  build de Docker, que caía a capas cacheadas de una imagen de 5 días atrás
  sin avisar. Por esto el código nuevo nunca llegaba a la imagen hasta esta
  sesión.
- `nginx.conf`: 4 bloques `location` referenciaban un `proxy_params`
  fantasma que nunca existió como archivo — nginx jamás iba a arrancar.
- `docker-compose.yml` (nginx): faltaban `CHOWN`/`SETUID`/`SETGID` bajo
  `cap_drop: ALL` — nginx no podía bajar privilegios al usuario no-root al
  arrancar, crash-loop permanente.
- Red `app-network` con `internal: true` bloqueaba el port-forward real
  host↔contenedor aunque `ports:` estuviera bien configurado (config
  correcta, pero Docker nunca activaba el mapeo real). Resuelto con una red
  extra local-only en `docker-compose.override.yml` (gitignored, no toca
  producción).

**No verificado, blocker real de infraestructura, no de código:** durante
esta sesión Docker Desktop se cayó/perdió conexión con el motor 2 veces sin
razón atribuible al código — reinicios manuales lo resolvieron ambas veces.
Si esto se repite en un host real, vale la pena investigar estabilidad de
Docker Desktop/WSL2 en esa máquina específica antes de confiar en él para
producción (en un VPS Linux real esto probablemente no aplica).

---

## 5. Brechas de negocio (¿puede un cliente real pedir y pagar, puede el
staff cumplir el pedido?)

**Bloquean lanzamiento real:**
- **Ningún proveedor de pago configurado** (Bold/MercadoPago/Wompi/PayPal —
  las 6 variables de entorno están vacías en `.env.production`). Sin esto,
  nadie paga online.
- **Dos canales de pedido, uno invisible para el negocio.** El checkout
  público (con pago) SÍ crea una orden real en la base de datos, rastreable
  en cocina/CRM. El botón de WhatsApp (con pre-llenado de carrito, agregado
  hoy) NO crea ninguna orden — es un mensaje de texto plano. Un pedido por
  WhatsApp no aparece en ninguna cola de cocina ni CRM. Esto es una brecha
  operativa real si el negocio espera que "pedir por WhatsApp" y "pedir por
  el sitio" sean equivalentes.
- **DIAN (facturación electrónica): sigue sin conectar.** El código de
  firma/envío existe y es real (`dianSigner.js`, `dianProvider.js`), pero
  ninguna ruta lo llama — mismo hueco de cableado que en la auditoría del
  15 de julio, sin cambios.

**No bloquean lanzamiento, pero son brechas reales:**
- **Campañas de marketing no envían nada.** `reach`/`conversions` siguen en
  cero fijo, no hay mecanismo de envío (email/SMS/WhatsApp/push) en
  ningún lado del código.
- **Puntos de fidelización no se acreditan solos.** Solo vía botón manual
  en la CRM, nunca automático al pagar un pedido.
- **"Adicional de ingrediente" ($3.500, agregado hoy) es un producto suelto
  del carrito, no una modificación de un ítem existente.** Un cliente o
  staff que lo agrega no tiene forma de indicar A CUÁL plato aplica —
  hueco real de UX si la intención es "agrégale queso extra a mi pizza",
  no "cóbrame un ítem misterioso de $3.500".

**Confirmado que sigue bien (sin regresión):**
- El invariante `paidOnly=true` (pedidos sin pago confirmado no aparecen en
  cocina) sigue intacto después de toda la reescritura de menú/carrito de
  hoy.
- Reviews: ownership check por teléfono y prevención de review duplicado
  ambos presentes y correctos (mejoró desde la auditoría anterior). El ID
  de orden sigue siendo débilmente adivinable — sin cambios, pendiente.

---

## 6. Próximos pasos, en orden

1. **Arreglar el bloqueo de Vercel** (verificación de cuenta de commit) —
   sin esto, nada de lo nuevo llega a producción aunque se haga merge.
2. **Decidir dónde vive el backend real** (VPS — nunca resuelto en ninguna
   sesión anterior, no es un problema técnico nuevo, es una decisión
   pendiente de hace tiempo).
3. Credenciales reales de al menos un proveedor de pago (Bold es el más
   avanzado en el código existente).
4. Decidir qué hacer con el canal de WhatsApp: ¿conectarlo a crear una
   orden real, o aceptar que es un canal secundario no rastreado?
5. Merge a `master` una vez resuelto 1-2 (o antes, si se decide probar en
   un ambiente de staging primero).
6. Antes de exponer roles PIN-only (OPERATOR/REPARTIDOR/MARKETING) fuera de
   un terminal físico controlado: confirmar que el negocio acepta ese
   modelo o migrar esos roles a usuario+password también.
