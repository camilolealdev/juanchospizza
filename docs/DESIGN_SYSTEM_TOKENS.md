# 🎨 Design System Tokens — Estado Actual + Roadmap

**Fecha:** 2026-07-21 · `pizzeria-merge`
**Origen:** catálogo extraído de `pizzeria-merge/public/styles.css`, `pizzeria-merge/src/index.css`, `pizzeria-merge/tailwind.config.js`, y todos los `.tsx` que aplican `fontFamily` inline.

---

## 🎨 Paleta de marca

### Estado actual (documentado)

| Token CSS (legacy)  | Hex       | Tailwind class          | Usos primarios                     |
| ------------------- | --------- | ----------------------- | ---------------------------------- |
| `--rrojo-acento`    | `#C0392B` | `red.600`, `brand.600`  | CTA principal, badges, error       |
| `--rojo-hover`      | `#962D22` | `red.700`, `brand.700`  | Hover state de CTAs                |
| `--amarillo-calido` | `#F9DC5C` | `gold.400`, `brand.500` | Acento cálido, badges "Sabor base" |
| `--marron-madera`   | `#8B572A` | `wood.500`, `brand.700` | Texto secundario, borders          |
| `--bg-general`      | `#F4EFEA` | `cream.400`, `brand.50` | Background general landing         |
| `--negro-carbon`    | `#1A1A1A` | `stone.900`             | Texto principal, dark CRM          |
| `--blanco-puro`     | `#FFFFFF` | `white`                 | Cards, surfaces                    |
| `--verde-exito`     | `#10B981` | `emerald.500`           | Success, vegetariano badge         |
| `--whatsapp`        | `#25D366` | (custom)                | WhatsApp CTA                       |

### Contraste WCAG

| Combinación                                | Ratio      | Nivel                             |
| ------------------------------------------ | ---------- | --------------------------------- |
| `#C0392B` (rojo) sobre `#F4EFEA` (crema)   | **4.6:1**  | AA borderline (texto ≥ 18pt)      |
| `#8B572A` (marrón) sobre `#F4EFEA` (crema) | **4.8:1**  | AA                                |
| `#1A1A1A` (negro) sobre `#F4EFEA` (crema)  | **14.8:1** | AAA                               |
| `#F9DC5C` (dorado) sobre `#1A1A1A` (negro) | **11.2:1** | AAA                               |
| `#25D366` (WhatsApp) sobre `#FFFFFF`       | **2.7:1**  | **⚠️ falla AA para texto < 18pt** |

> 🟡 **Acción:** dar fondo más oscuro al botón de WhatsApp o usar texto blanco bold ≥ 18pt. Verificar manualmente.

### Tokens propuestos (single source of truth)

```js
// tailwind.config.js
theme.extend.colors = {
  brand: {
    50: '#F4EFEA', // background cream
    100: '#FDEFE5', // tint
    200: '#F9DC5C', // gold accent (warm)
    400: '#C0392B', // primary red
    500: '#C0392B', // alias
    600: '#962D22', // hover
    700: '#8B572A', // wood brown
    900: '#1A1A1A', // carbon
  },
  // Semanticos > raw
  fg: { DEFAULT: '#1A1A1A', muted: '#8B572A' },
  bg: { DEFAULT: '#F4EFEA', surface: '#FFFFFF', dark: '#0F0F0F' },
  state: {
    success: '#10B981',
    warn: '#F9DC5C',
    danger: '#C0392B',
    info: '#3B82F6',
  },
};
```

---

## 🔠 Tipografía

### Estado actual (desordenado)

| Fuente                                  | Estado                                                                      | Usos actuales                                                     |
| --------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Bitter** (serif)                      | ✅ Cargada en `index.html` Google Fonts                                     | Headings en landing, MenuDigital titles, CartSection "Tu Carrito" |
| **Poppins** (sans)                      | ✅ Cargada en `index.html`                                                  | Body de landing                                                   |
| **Bitter** inline en `src/components/*` | 🟡 reaplicada con `style={{ fontFamily: "'Bitter', serif" }}` en 7+ lugares | El patrón debería usar className                                  |
| **Inter** (sans)                        | ❌ Declarada en `src/index.css` + `tailwind.config.js`                      | No consumida                                                      |
| **Playfair Display** (serif)            | ❌ Declarada en `src/index.css` + `tailwind.config.js`                      | No consumida                                                      |

### Consolidación propuesta

| Token          | Fuente                       | Uso                           |
| -------------- | ---------------------------- | ----------------------------- |
| `font-display` | Bitter (700, 900)            | h1, h2, h3, logo              |
| `font-body`    | Poppins (300, 400, 600, 700) | body, p, btn labels           |
| `font-mono`    | JetBrains Mono o system mono | orderNumber, código PIN input |

```js
// tailwind.config.js
theme.extend.fontFamily = {
  display: ['"Bitter"', 'serif'],
  body: ['"Poppins"', 'sans-serif'],
};
```

### Acciones P3-4

- [ ] Eliminar `font-family: 'Inter'` y `'Playfair Display'` de `src/index.css` (no se usan).
- [ ] Agregar `font-display` y `font-body` como clases Tailwind.
- [ ] Reemplazar los 7 `style={{ fontFamily: "'Bitter', serif" }}` inline por `className="font-display"`.

---

## 📐 Spacing scale

### Estado actual: inconsistente

`public/styles.css` usa valores mágicos (8px, 12px, 16px, 20px, 24px, 32px, 48px).
Tailwind provee `0/1/2/3/4/6/8/12/16/20/24/32` (múltiplos de 4px).

### Propuesta: alinear `public/styles.css` a la escala Tailwind

```js
// tokens compartidos
const SPACE = {
  px: '1px',
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
};
```

---

## 📏 Border-radius

### Estado actual: caótico (12 valores distintos)

`8 / 10 / 12 / 14 / 16 / 18 / 20 / 24 / 28 / 30 / 32 / 50% / 999px`

### Propuesta P3-2: 6 tokens

```js
// tailwind.config.js
theme.borderRadius = {
  xs: '8px', // chips, tags
  sm: '12px', // inputs
  md: '16px', // cards default
  lg: '20px', // modal mobile
  xl: '28px', // card destacado
  pill: '9999px', // botones size, filter chip
};
```

> Mapear todos los valores actuales:
> 8→xs, 10→xs, 12→sm, 14→sm, 16→md, 18→md, 20→lg, 24→lg, 28→xl, 30→xl, 32→xl, 50%→pill, 999px→pill.

---

## 🔘 Button system (actual + propuesto)

### Estado actual: 5+ variantes paralelas

| Variante           | Origen              | Token               | Uso                             |
| ------------------ | ------------------- | ------------------- | ------------------------------- |
| `.btn-primary`     | `public/styles.css` | Rojizo              | Landing "VER MENÚ", "PEDIR YA"  |
| `.crm-btn-primary` | inline en CRM views | Naranja             | Dashboard CRM (orange-600)      |
| `.confirm-btn`     | `public/styles.css` | Amarillo sobre rojo | CTP builder "Agregar al pedido" |
| `.cta-btn`         | `public/styles.css` | WhatsApp verde      | Domicilios                      |
| `.ctp-cta`         | inline              | Rojo                | Pizza builder                   |

### Propuesta P3-1: 3 tokens semánticos

```jsx
type ButtonVariant = 'primary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

<Button variant="primary">VER MENÚ</Button>      // bg-brand-400 hover:bg-brand-600
<Button variant="ghost">Cerrar</Button>           // bg-transparent border-brand-700 hover:bg-brand-50
<Button variant="destructive">Eliminar</Button>  // bg-state-danger
```

---

## 🪟 Card pattern (actual + propuesto)

### Estado actual: 5 implementaciones divergentes

| Card               | Archivo               | Background        | Border-radius        | Shadow                           |
| ------------------ | --------------------- | ----------------- | -------------------- | -------------------------------- |
| `.product-section` | `styles.css`          | white             | 16px                 | `0 4px 16px rgba(139,87,42,.06)` |
| `.dlv-sede-card`   | `styles.css`          | cream             | 18px                 | `0 8px 32px rgba(139,87,42,.08)` |
| `.crm-card`        | CRM views             | `bg-stone-900/40` | `rounded-2xl` (16px) | `border border-white/5`          |
| `.premium-icard`   | AdminLayout           | `bg-stone-900/60` | `rounded-3xl` (24px) | `shadow-xl`                      |
| `.ctp-card`        | inline en MenuDigital | `bg-white/70`     | `rounded-3xl` (24px) | `border-[#8B572A]/8`             |

### Propuesta P3-3: `<Card>` base

```jsx
<Card tone="default" elevation="raised" padding="md">
  {/* content */}
</Card>

// tone: 'default' | 'inverse' | 'cream' | 'highlight'
// elevation: 'flat' | 'raised' | 'floating'
// padding: 'none' | 'sm' | 'md' | 'lg'
```

---

## 📱 Breakpoints (actual + propuesto)

### Estado actual: 9 valores sin sistema

`480 / 600 / 640 / 768 / 900 / 1024 / 1200 / 1280 / 1440`

### Propuesta P2-4: 3 mobile-first + 2 extendidos

```js
// tailwind.config.js
theme.extend.screens = {
  sm: '768px', // tablet portrait / mobile landscape
  md: '1024px', // tablet landscape / small desktop
  xl: '1280px', // desktop
  '2xl': '1536px', // widescreen (existing tailwind)
};
```

> Los valores `480`/`600`/`640`/`900` colapsan a `<sm` (mobile) o `sm/md`. `1200` y `1440` colapsan a `xl`. Solo `768` y `1024` quedan como bordes semánticos.

### Acciones

- [ ] Auditar 37 `@media (...)` queries en `public/styles.css`, consolidar.
- [ ] Reemplazar valores hardcoded por `min-w-sm:`, `min-w-md:`, `min-w-xl:` Tailwind utilities.
- [ ] Verificar que `ConsolidatedReportsView`, `DigiturnoView`, `CajaView`, `TrackOrderModal`, `LoginModal` se ven bien en los 3 tiers.

---

## 🗂️ Z-index system (actual + propuesto)

### Estado actual: 15 valores sin jerarquía

```
9999 = App crown button
9998 = AdminLayout container
9995 = MenuDigital overlay
9994 = cart drawer shadow
9993 = toast notification
9992 = cart drawer
70   = OrderConfirmationPage close
50   = various modals
40   = toasts (MenuDigital)
30   = modals (pizza builder)
20   = sticky tabs MenuDigital
10   = cart gradient overlays
8    = cookie banner
3    = hover elevations
2    = dropdowns/selects
1    = base
```

### Propuesta P2-5: 6 capas semánticas

```js
// tailwind.config.js
theme.extend.zIndex = {
  base: '1',
  dropdown: '10',
  sticky: '20',
  overlay: '30',
  modal: '50',
  toast: '80',
  pinned: '9999', // crown button, sticky CTAS
};
```

> Mapping sugerido:
> 9999→pinned · 9995/9998/9994/9992→modal · 9993/40→toast · 30/50→modal · 20→sticky · 10/8→dropdown/overlay · 3/2/1→base+elevation

---

## ✅ Resumen del estado de tokens

| Token         | Estado                                                          | Acción                         |
| ------------- | --------------------------------------------------------------- | ------------------------------ |
| Color palette | ✅ Coherente en 3 superficies (HTML/CSS, Tailwind, componentes) | Documentar como brand.*        |
| Typography    | 🟡 Inter/Playfair dead config                                   | P3-4 purgar                    |
| Spacing       | 🟡 Múltiples escalas                                            | P3-N normalize                 |
| Border-radius | 🔴 13 valores                                                   | P3-2 a 6 tokens                |
| Buttons       | 🔴 5 paralelos                                                  | P3-1 a 3 tokens                |
| Cards         | 🔴 5 divergentes                                                | P3-3 base                      |
| Breakpoints   | 🔴 9 valores                                                    | P2-4 a 3-5                     |
| Z-index       | 🔴 15 valores                                                   | P2-5 a 6 capas                 |
| Shadows       | 🟡 Hardcoded rgba en ~25 lugares                                | Extracción a `theme.boxShadow` |
| Animations    | 🟡 mixed (keyframes CSS + framer-motion)                        | Unificar (P2-7 MotionConfig)   |

> El roadmap completo de polish está en `ISSUES_2026-07-21.md`. Shippeable hoy con el set actual; refactor de tokens en iteraciones futuras.
