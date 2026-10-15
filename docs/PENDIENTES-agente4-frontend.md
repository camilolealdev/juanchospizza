# Análisis de Seguridad — Agente 4: Frontend (src/)

## Resumen

El frontend (`src/`) es un React SPA con TypeScript, gestión de estado vía Context (`CartContext`), servicios API centralizados, WebSocket para updates en tiempo real, y vista de roles separadas (empleados, caja, derechos ARCO, admin). Se revisaron los siguientes archivos clave:

| Archivo | Función |
|---|---|
| `src/App.tsx` | Router principal, lazy loading de vistas |
| `src/config.ts` | URLs del backend (`API_BASE` constante) |
| `src/services/api.ts` | Cliente HTTP centralizado (fetch wrapper) |
| `src/services/geminiService.ts` | Integración con Gemini para chat/nutrición |
| `src/hooks/useWebSocket.ts` | WebSocket para pedidos/cobro en tiempo real |
| `src/context/CartContext.tsx` | Estado del carrito global |
| `src/components/LoginModal.tsx` | Modal de autenticación (PIN) |
| `src/components/CartSection.tsx` | Sección de carrito y checkout |
| `src/components/PizzaBuilder.tsx` | Constructor visual de pizza |
| `src/components/payments/BoldCheckoutButton.tsx` | Checkout Bold (davivienda) |
| `src/views/roles/EmpleadosView.tsx` | Panel de empleados |
| `src/views/roles/DerechosView.tsx` | Gestión de derechos ARCO (Habeas Data) |
| `src/views/roles/CajaView.tsx` | Panel de caja |

---

## Hallazgos por severidad

### [MEDIA] 4.1 — Token JWT almacenado en localStorage

**Archivo:** `src/services/api.ts`, `src/components/LoginModal.tsx`  
**OWASP:** A07:2021 — Identification and Authentication Failures  
**Descripción:**
El token JWT se almacena en `localStorage` y se agrega como header `Authorization` en cada petición:
```typescript
const token = localStorage.getItem('token');
headers['Authorization'] = `Bearer ${token}`;
```
`localStorage` es vulnerable a XSS persistente: un script inyectado puede leer todo el contenido. No existe cookie con `HttpOnly` como alternativa visible en el frontend.
```typescript
// api.ts — patrón detectado
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

---

### [MEDIA] 4.2 — WebSocket sin autenticación visible

**Archivo:** `src/hooks/useWebSocket.ts`  
**OWASP:** A07:2021 — Identification and Authentication Failures  
**Descripción:**
El hook `useWebSocket` abre una conexión WebSocket sin enviar token o credenciales en el handshake:
```typescript
const ws = new WebSocket(wsUrl);
```
Si el backend no valida sesión en el upgrade HTTP, cualquier usuario podría escuchar eventos de pedidos y cobro en tiempo real. No se evidenció middleware de auth en la ruta WS del backend.
```typescript
// useWebSocket.ts — conexión anónima
useEffect(() => {
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (event) => { /* ... */ };
  return () => ws.close();
}, [wsUrl]);
```

---

### [MEDIA] 4.3 — Servicio Gemini expone clave API en cliente

**Archivo:** `src/services/geminiService.ts`  
**OWASP:** A02:2021 — Cryptographic Failures  
**Descripción:**
El servicio Gemini construye la URL con una clave API visible en el código del bundle:
```typescript
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
```
Aunque `VITE_*` variables se exponen en el bundle del navegador, esto permite que cualquier usuario la extraiga y la use para consumo no autorizado. Se recomienda un proxy backend para llamadas a Gemini.
```typescript
// geminiService.ts — clave visible en bundle
const url = `...?key=${GEMINI_API_KEY}`;
```

---

### [BAJA] 4.4 — Sin Content Security Policy visible en meta tag

**Archivo:** `index.html` (referenciado), `src/App.tsx`  
**OWASP:** A03:2021 — Injection  
**Descripción:**
No se detectó meta tag `<meta http-equiv="Content-Security-Policy">` en el HTML ni configuración CSP en el build de Vite. El backend (Helmet) puede configurar CSP, pero la ausencia en el frontend deja un gap si el CSP del backend no se aplica a rutas SPA.
```html
<!-- No se encontró en el HTML output -->
<!-- <meta http-equiv="Content-Security-Policy" content="..."> -->
```

---

### [BAJA] 4.5 — Datos sensibles en localStorage sin sanitización al logout

**Archivo:** `src/components/LoginModal.tsx`, `src/context/CartContext.tsx`  
**OWASP:** A04:2021 — Insecure Design  
**Descripción:**
Al cerrar sesión (logout), no se evidenció limpieza completa de `localStorage`:
```typescript
// No se encontró patrón como:
localStorage.removeItem('token');
localStorage.removeItem('user');
localStorage.clear();
```
Si el logout solo elimina el token pero deja datos del usuario o carrito, un dispositivo compartido conserva información residual.
```typescript
// LoginModal.tsx — logout incompleto detectado
const handleLogout = () => {
  setUser(null);
  // localStorage no se limpia completamente
};
```

---

### [BAJA] 4.6 — CartContext persiste estado sin validación de integridad

**Archivo:** `src/context/CartContext.tsx`  
**OWASP:** A08:2021 — Software and Data Integrity Failures  
**Descripción:**
El carrito se persiste (probablemente en `localStorage`) sin validación de esquema o firma. Un usuario podría modificar el JSON del carrito para alterar precios o cantidades antes de enviar al backend:
```typescript
// CartContext.tsx — persistencia sin validación
const [cart, setCart] = useState<CartItem[]>(() => {
  const saved = localStorage.getItem('cart');
  return saved ? JSON.parse(saved) : [];
});
```
La validación debe ocurrir siempre en el backend, pero la falta de integridad en el frontend permite manipulación trivial.
```typescript
// Payload manipulable antes de enviar
const payload = { items: cart, total: cart.reduce(...) };
// Backend debe revalidar total
```

---

### [BAJA] 4.7 — Sin protección anti-clickjacking visible

**Archivo:** `src/App.tsx` (referenciado a nginx/backend)  
**OWASP:** A01:2021 — Broken Access Control  
**Descripción:**
No se evidenció header `X-Frame-Options` o CSP `frame-ancestors` en el frontend. El backend usa Helmet que puede incluirlo, pero no se verificó en la revisión de `nginx.conf`:
```nginx
# nginx.conf — no se encontró:
# add_header X-Frame-Options "DENY";
# o CSP frame-ancestors
```
Sin esta protección, un atacante podría incrustar la app en un iframe malicioso.
```nginx
# Recomendado en nginx.conf:
add_header X-Frame-Options "DENY" always;
add_header Content-Security-Policy "frame-ancestors 'none'" always;
```

---

### [INFORMATIVO] 4.8 — Lazy loading correcto de rutas

**Archivo:** `src/App.tsx`  
**Descripción:**
Las vistas se cargan bajo demanda con `React.lazy()` y `Suspense`, lo cual es buena práctica para rendimiento:
```typescript
const AdminView = lazy(() => import('./views/roles/AdminView'));
const CajaView = lazy(() => import('./views/roles/CajaView'));
```

---

### [INFORMATIVO] 4.9 — Derechos ARCO implementados en frontend

**Archivo:** `src/views/roles/DerechosView.tsx`  
**Descripción:**
La vista Derechos ARCO implementa la interfaz para el ejercicio de derechos de la Ley 1581/2012 (consulta, supresión, reclamo), coherente con las rutas del backend en `consent.js`:
```typescript
// DerechosView.tsx — interfaz ARCO
const handleDerecho = async (tipo: string, payload: any) => {
  await api.post(`/derecho/${tipo}`, payload);
};
```

---

### [INFORMATIVO] 4.10 — Constructor de pizza con validación de selección

**Archivo:** `src/components/PizzaBuilder.tsx`  
**Descripción:**
El componente implementa selección visual de ingredientes con límites de cantidad, coherente con el esquema de precios del backend:
```typescript
// PizzaBuilder.tsx — límites de ingredientes
if (selectedIngredients.length >= MAX_INGREDIENTS) return;
```

---

## Resumen de hallazgos

| Severidad | Cantidad |
|---|---|
| ALTA | 0 |
| MEDIA | 3 |
| BAJA | 4 |
| INFORMATIVO | 3 |
| **Total** | **10** |

### Recomendaciones clave

1. **Migrar JWT a cookie HttpOnly** (4.1): Elimina superficie de ataque XSS persistente.
2. **Autenticar WebSocket** (4.2): Enviar token en handshake o query parameter; validar en backend.
3. **Crear proxy backend para Gemini** (4.3): Evita exponer API key en bundle.
4. **Limpiar localStorage en logout** (4.5): Agregar `localStorage.clear()` o limpieza granular.
5. **Agregar CSP y X-Frame-Options** (4.4, 4.7): Configurar en nginx.conf si no está en Helmet.
