# 🎨 UI/UX Plan — Juancho's Pizza / GastroPro

> **Propósito:** Guía de diseño de interfaz y experiencia de usuario
> **Tono visual:** Premium oscuro · Cálido · Sabroso
> **Última actualización:** Julio 2026

---

## 1. Design System

### 1.1 Paleta de Colores

```css
/* Brand Primario */
--color-brand-50:  #fff7ed;  /* Fondo muy claro */
--color-brand-100: #ffedd5;
--color-brand-200: #fed7aa;
--color-brand-300: #fdba74;
--color-brand-400: #fb923c;
--color-brand-500: #f97316;  /* Naranja principal */
--color-brand-600: #ea580c;  /* Naranja hover/active */
--color-brand-700: #c2410c;
--color-brand-800: #9a3412;
--color-brand-900: #7c2d12;

/* Neutral (oscuro) */
--color-base-50:  #fafaf9;
--color-base-100: #f5f5f4;
--color-base-200: #e7e5e4;
--color-base-300: #d6d3d1;
--color-base-400: #a8a29e;
--color-base-500: #78716c;
--color-base-600: #57534e;
--color-base-700: #44403c;
--color-base-800: #292524;
--color-base-900: #1c1917;
--color-base-950: #0c0a09;  /* Fondo principal */

/* Semántico */
--color-success: #16a34a;   /* Verde: pagos, completado */
--color-warning: #f59e0b;    /* Amarillo: pending, warning */
--color-error:   #dc2626;    /* Rojo: error, cancelado */
--color-info:    #0284c7;    /* Azul: info, notificaciones */
```

### 1.2 Tipografía

```css
/* Headings */
font-family: 'DM Sans', system-ui, sans-serif;
font-weight: 700, 800

/* Body */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 400, 500, 600

/* Monospace (código, precios) */
font-family: 'JetBrains Mono', monospace;

/* Escala */
--text-xs:   0.75rem;    /* 12px */
--text-sm:   0.875rem;   /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg:   1.125rem;   /* 18px */
--text-xl:   1.25rem;    /* 20px */
--text-2xl:  1.5rem;     /* 24px */
--text-3xl:  1.875rem;   /* 30px */
--text-4xl:  2.25rem;    /* 36px */
--text-5xl:  3rem;       /* 48px */
```

### 1.3 Espaciado

```css
--space-1:  0.25rem;    /* 4px */
--space-2:  0.5rem;     /* 8px */
--space-3:  0.75rem;    /* 12px */
--space-4:  1rem;       /* 16px */
--space-5:  1.25rem;    /* 20px */
--space-6:  1.5rem;     /* 24px */
--space-8:  2rem;       /* 32px */
--space-10: 2.5rem;     /* 40px */
--space-12: 3rem;       /* 48px */
--space-16: 4rem;       /* 64px */
```

### 1.4 Sombras

```css
--shadow-sm:   0 1px 2px rgba(0,0,0,0.3);
--shadow-md:   0 4px 6px rgba(0,0,0,0.4);
--shadow-lg:   0 10px 15px rgba(0,0,0,0.5);
--shadow-xl:   0 20px 25px rgba(0,0,0,0.6);
--shadow-glow: 0 0 20px rgba(234,88,12,0.3);  /* Brand glow */
```

### 1.5 Border Radius

```css
--radius-sm:   0.375rem;   /* 6px */
--radius-md:   0.5rem;     /* 8px */
--radius-lg:   0.75rem;    /* 12px */
--radius-xl:   1rem;       /* 16px */
--radius-2xl:  1.5rem;     /* 24px */
--radius-full: 9999px;     /* Circular */
```

---

## 2. Componentes UI

### 2.1 Cards

```jsx
// Patrón de card usado en todo el sistema
<div className="bg-base-800 rounded-xl border border-base-700 
                shadow-lg hover:shadow-xl hover:border-brand-600 
                transition-all duration-200">
  {/* Header */}
  <div className="flex items-center justify-between px-6 py-4 
                  border-b border-base-700">
    <h3 className="text-lg font-semibold text-base-100">
      Título
    </h3>
    <span className="text-sm text-base-400">Subtítulo</span>
  </div>
  
  {/* Content */}
  <div className="p-6">
    {children}
  </div>
</div>
```

### 2.2 Botones

| Variante | Uso | Clase |
|----------|-----|-------|
| **Primary** | Acción principal | `bg-brand-600 hover:bg-brand-500 text-white` |
| **Secondary** | Acción secundaria | `bg-base-700 hover:bg-base-600 text-base-200` |
| **Ghost** | Acción terciaria | `hover:bg-base-800 text-base-300` |
| **Danger** | Eliminar/Cancelar | `bg-red-600 hover:bg-red-500 text-white` |
| **Success** | Completar | `bg-green-600 hover:bg-green-500 text-white` |

```jsx
// Patrón de botón
<button className="px-4 py-2 rounded-lg font-medium 
                   transition-all duration-150 
                   focus-visible:ring-2 focus-visible:ring-brand-500
                   disabled:opacity-50 disabled:cursor-not-allowed">
  {children}
</button>
```

### 2.3 Formularios

```jsx
// Patrón de input
<div className="space-y-1">
  <label htmlFor="field-id" className="text-sm font-medium text-base-300">
    Etiqueta
  </label>
  <input
    id="field-id"
    className="w-full px-3 py-2 bg-base-900 border border-base-700 
               rounded-lg text-base-100 placeholder-base-500
               focus:outline-none focus:ring-2 focus:ring-brand-500 
               focus:border-transparent transition-all duration-150"
    placeholder="Placeholder"
  />
  <p className="text-xs text-base-500">Helper text</p>
</div>
```

### 2.4 Badges

| Color | Uso |
|-------|-----|
| 🟢 `bg-green-900 text-green-300` | Completado, activo, pagado |
| 🟡 `bg-yellow-900 text-yellow-300` | Pendiente, waiting |
| 🔴 `bg-red-900 text-red-300` | Cancelado, error |
| 🔵 `bg-blue-900 text-blue-300` | En proceso, info |
| ⚪ `bg-base-700 text-base-300` | Default, inactivo |

### 2.5 Tablas

```jsx
// Patrón de tabla usado en todo el CRM
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr className="border-b border-base-700">
        <th className="px-4 py-3 text-left text-xs font-medium 
                       text-base-400 uppercase tracking-wider">
          Columna
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-base-700/50">
      {items.map(item => (
        <tr key={item.id} 
            className="hover:bg-base-800/50 transition-colors">
          <td className="px-4 py-3 text-sm text-base-200">
            {item.value}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## 3. Micro-interacciones

### 3.1 Animaciones (Framer Motion)

```jsx
// Animaciones estándar del sistema

// Fade in
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Slide up (modales, paneles)
const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// Scale (hover en cards)
const scaleOnHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

// Stagger children (listas)
const stagger = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};
```

### 3.2 Loading States

```jsx
// Skeleton genérico
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-base-700 rounded w-3/4" />
  <div className="h-4 bg-base-700 rounded w-1/2" />
  <div className="h-4 bg-base-700 rounded w-2/3" />
</div>

// Spinner
<svg className="animate-spin h-5 w-5 text-brand-500" ...>
  {/* SVG spinner */}
</svg>
```

### 3.3 Empty States

```jsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="w-16 h-16 text-base-600 mb-4" />
  <h3 className="text-lg font-medium text-base-300 mb-2">
    Sin resultados
  </h3>
  <p className="text-sm text-base-500 max-w-md">
    Mensaje contextual explicando por qué está vacío
    y qué puede hacer el usuario al respecto.
  </p>
</div>
```

---

## 4. Responsive Design

### 4.1 Breakpoints

```
Móvil:     < 640px     (1 columna, nav colapsado)
Tablet:    640-1024px  (2 columnas, sidebar compacto)
Desktop:   > 1024px    (3+ columnas, sidebar expandido)
```

### 4.2 Landing Page

```
Móvil:
  - Menú en lista vertical simple
  - Carrito ocupa pantalla completa (drawer)
  - Navegación hamburger

Tablet:
  - Menú en grid de 2 columnas
  - Carrito como panel lateral (slide-over)
  - Nav completa visible

Desktop:
  - Menú en grid de 3-4 columnas
  - Carrito como panel lateral fijo
  - Hero section con imagen de fondo completa
```

### 4.3 CRM (GastroPro)

```
Móvil:
  - Sidebar colapsado (iconos only)
  - Tablas scroll horizontal
  - Modales full-screen

Desktop:
  - Sidebar expandido con labels
  - Tablas con todas las columnas
  - Modales centrados con overlay
```

---

## 5. WCAG 2.2 AA Compliance

### 5.1 Implementado

| Criterio | Descripción | Estado |
|----------|-------------|--------|
| **1.1.1** | Non-text Content — alt en imágenes | ✅ |
| **1.4.1** | Use of Color — no solo color para información | ✅ |
| **1.4.3** | Contrast Ratio — texto ≥4.5:1 | ✅ |
| **2.1.1** | Keyboard — todas las acciones accesibles por teclado | ✅ |
| **2.4.3** | Focus Order — focus trap en LoginModal | ✅ |
| **2.4.7** | Focus Visible — focus-visible ring global | ✅ |
| **2.4.1** | Bypass Blocks — skip to content | 🟡 Parcial |
| **2.3.3** | Animation from Interactions — prefers-reduced-motion | ✅ |
| **4.1.2** | Name, Role, Value — aria labels en botones/iframes | ✅ |

### 5.2 Pendiente

| Criterio | Descripción | Prioridad |
|----------|-------------|-----------|
| **1.4.4** | Resize Text — zoom 200% sin pérdida | P2 |
| **2.4.5** | Multiple Ways — más de una forma de navegar | P2 |
| **3.2.1** | On Focus — sin cambios de contexto inesperados | P2 |
| **3.3.2** | Labels or Instructions — todos los inputs con label | P2 |

---

## 6. Flujo de Pantallas

### 6.1 Página Pública (Landing)

```
┌─────────────────────────────────────┐
│  [Logo]  [Menú]  [Promos] [📞] [🛒]│ ← Navbar sticky
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────┐           │
│  │  Hero:               │           │
│  │  "En Sabor y         │           │
│  │   Calidad"           │           │
│  │  + CTA "Ver Menú"    │           │
│  └──────────────────────┘           │
│                                     │
│  ┌─Categorías──────────────┐        │
│  │ [🍕Pizza] [🌮Hamburguesa]│        │
│  │ [🥤Bebidas] [🍟Papas]   │        │
│  └──────────────────────────┘        │
│                                     │
│  ┌─Menú Digital (grid)─────┐        │
│  │ [Card][Card][Card]      │        │
│  │ [Card][Card][Card]      │        │
│  └──────────────────────────┘        │
│                                     │
│  ┌─Reseñas──────────────┐           │
│  │ ⭐⭐⭐⭐⭐ "Excelente"  │           │
│  │ ⭐⭐⭐⭐ "Rápido"      │           │
│  └──────────────────────┘           │
│                                     │
│  ┌─Ubicaciones────────────┐         │
│  │  [Mapa Nemocón]        │         │
│  │  [Mapa Zipaquirá]      │         │
│  └────────────────────────┘         │
│                                     │
├─────────────────────────────────────┤
│  Footer: © 2026 Juancho's Pizza    │
└─────────────────────────────────────┘
```

### 6.2 CRM (GastroPro) — Desktop Layout

```
┌──────┬──────────────────────────────────────┐
│      │  [🔔] [👤 Admin] [Logout]            │
│ ═══　 ├──────────────────────────────────────┤
│ ≡    │                                       │
│ 📊   │  Dashboard Content                    │
│ 📦   │  (Cards, Charts, Tables)              │
│ 👥   │                                       │
│ 🥗   │                                       │
│ 📋   │                                       │
│ 💰   │                                       │
│ 👨‍🍳  │                                       │
│ 🪑   │                                       │
│ 🖨️   │                                       │
│ 💵   │                                       │
│ 📢   │                                       │
│ ⭐   │                                       │
└──────┴──────────────────────────────────────┘

Sidebar colapsable → iconos cuando cerrado
                   → iconos + labels cuando abierto
```

---

## 7. Patrones de Comportamiento

### 7.1 Optimistic Updates

```jsx
// Ejemplo: actualizar estado de orden
// 1. UI muestra inmediatamente el nuevo estado
// 2. API call en background
// 3. Si falla → revertir UI + mostrar error

const [status, setStatus] = useState(order.status);

const handleStatusChange = async (newStatus) => {
  const previous = status;
  setStatus(newStatus); // Optimistic
  try {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
  } catch {
    setStatus(previous); // Revertir
    toast.error('Error al actualizar estado');
  }
};
```

### 7.2 Notificaciones Toast

| Tipo | Duración | Icono | Color borde |
|------|----------|-------|-------------|
| `success` | 3s | ✅ | `border-green-500` |
| `error` | 5s | ❌ | `border-red-500` |
| `warning` | 4s | ⚠️ | `border-yellow-500` |
| `info` | 3s | ℹ️ | `border-blue-500` |

### 7.3 Confirmaciones Destructivas

```jsx
const confirmDelete = (item) => {
  if (window.confirm(
    `¿Estás seguro de eliminar ${item.nombre}? Esta acción no se puede deshacer.`
  )) {
    // Proceder con eliminación
  }
};
```

---

## 8. Checklist de Calidad UI

### Pre-Release

```
☐ Todos los estados contemplados: loading · empty · error · success
☐ Transiciones suaves en hover/focus/active
☐ Responsive: testear en 375px, 768px, 1440px
☐ Sin overflow horizontal
☐ Contraste de color ≥ 4.5:1
☐ Navegación completa por teclado
☐ Sin console.errors en producción
☐ Placeholder de carga visible (no blank flash)
☐ Mensajes de error amigables (no técnicos)
☐ Confirmación antes de acciones destructivas
```
