# Juancho's Pizza — CRM Gastronómico & Landing Page

Sistema híbrido de alto rendimiento para **Juancho's Pizza y Comidas Rápidas**, con sedes en Nemocón y Zipaquirá. Combina una experiencia de cliente fluida con un CRM administrativo avanzado denominado **GastroPro**.

## 🏗️ Arquitectura del Sistema

El proyecto utiliza una arquitectura híbrida única:

1.  **Frontend Cliente (Landing Page):** Una interfaz estática de carga ultra-rápida integrada directamente en `index.html`.
2.  **GastroPro CRM (Overlay React):** Una aplicación React 18 que se monta como una capa administrativa (Overlay) y portaliza componentes dinámicos (Menú Digital, Carrito) en la Landing Page.
3.  **Backend API:** Servidor Express.js que gestiona la persistencia con PostgreSQL.

## 🚀 Módulos de GastroPro CRM

El panel administrativo incluye herramientas avanzadas para la gestión total del negocio:

-   **Dashboard Inteligente:** Métricas en tiempo real, mapa de calor de pedidos y proyecciones.
-   **Menú Inteligente:** Gestión de productos, variantes, combos y promociones dinámicas.
-   **Inventario & Recetas:** Control de existencias, cálculo de costos por receta y alertas de stock bajo.
-   **CRM & Clientes:** Base de datos de clientes con historial de compras, tags y segmentación.
-   **Fidelización:** Sistema de puntos, niveles VIP y retos para aumentar la retención.
-   **Campañas & Marketing:** Gestión de campañas flash, cupones y promociones segmentadas.
-   **Finanzas:** Control de ingresos, egresos, flujo de caja y rentabilidad.
-   **Reportes Avanzados:** Generación de informes detallados para toma de decisiones.

## 🛠️ Stack Tecnológico

-   **Frontend:** React 18 + TypeScript + Vite.
-   **Styling:** Tailwind CSS + Framer Motion.
-   **Base de Datos:** PostgreSQL.
-   **IA:** Google Gemini (Asistente "Concierge" y generación visual).
-   **Backend:** Node.js + Express.js.
-   **Despliegue:** Vercel.

## 📦 Estructura del Proyecto

```
PIZZERIAv2/
├── src/
│   ├── components/          # Componentes del CRM y Portales
│   │   ├── AdminLayout.tsx  # Layout del CRM
│   │   ├── MenuDigital.tsx  # Componente portalizado
│   │   └── VisualPizzaBuilder.tsx
│   ├── views/roles/         # Vistas modulares del CRM
│   │   ├── GastroProDashboard.tsx
│   │   ├── InventarioView.tsx
│   │   ├── ClientesView.tsx
│   │   └── ... (otros módulos)
│   ├── services/            # Lógica de negocio y API
│   │   ├── api.ts           # Cliente API
│   │   └── geminiService.ts # Integración con IA
│   ├── types/               # Definiciones TypeScript centralizadas
│   └── context/             # Estados globales (Cart, Auth)
├── server/                 # Backend Express
│   ├── index.js             # API principal y DB Init
│   └── auth.js              # Lógica de autenticación (PIN-based)
├── public/                 # Activos estáticos y multimedia
└── index.html              # Landing Page y Punto de entrada React
```

## ⚙️ Configuración e Instalación

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Variables de Entorno:**
    Crea un `.env` basado en `.env.example`:
    ```env
    DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_db
    GEMINI_API_KEY=tu_api_key_de_google
    ```

3.  **Ejecutar en desarrollo:**
    ```bash
    npm run dev:all
    ```
    - Frontend: `http://localhost:3000`
    - Backend: `http://localhost:3001`

## 🔐 Roles y Acceso

El acceso al CRM se realiza mediante el botón de corona en la esquina inferior izquierda:

| Rol | PIN por defecto | Acceso |
|-----|-----------------|--------|
| **Administrador** | `1234` | Acceso total a todos los módulos |
| **Cocina** | `5678` | Gestión de pedidos y estados |
| **Repartidor** | `0000` | Gestión de entregas |
| **Marketing** | `9999` | Gestión de campañas y clientes |

---

© 2026 Juancho's Pizza. Desarrollado por easy-marketing.xyz.
