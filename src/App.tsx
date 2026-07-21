import React, { useState, useEffect, createContext, useContext, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { UserRole, GastroModule, LocationId } from './types';
import AdminLayout from './components/AdminLayout';
import MenuDigital from './components/MenuDigital';
import CartSection from './components/CartSection';
import { CartProvider } from './context/CartContext';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import ApprovedReviews from './components/ApprovedReviews';
import { useWebSocket } from './hooks/useWebSocket';
import api, { AUTH_UNAUTHORIZED_EVENT, getStoredRole, getStoredUsername, setAuthSession } from './services/api';
import { MotionConfig } from 'framer-motion';

// CRM modules only ever render behind a staff login -- lazy-loaded so an
// anonymous landing-page visitor's bundle isn't paying for admin code they
// never see (this app has no router to split by route, so it's done here).
const GastroProDashboard = lazy(() => import('./views/roles/GastroProDashboard'));
const MenuInteligente = lazy(() => import('./views/roles/MenuInteligente'));
const InventarioView = lazy(() => import('./views/roles/InventarioView'));
const ClientesView = lazy(() => import('./views/roles/ClientesView'));
const FidelizacionView = lazy(() => import('./views/roles/FidelizacionView'));
const MarketingView = lazy(() => import('./views/roles/MarketingView'));
const FinanzasView = lazy(() => import('./views/roles/FinanzasView'));
const ReportesView = lazy(() => import('./views/roles/ReportesView'));
const ReviewsView = lazy(() => import('./views/roles/ReviewsView'));
const PaymentSettingsView = lazy(() => import('./views/roles/PaymentSettingsView'));
const EmpleadosView = lazy(() => import('./views/roles/EmpleadosView'));
const TurnosView = lazy(() => import('./views/roles/TurnosView'));
const MesasView = lazy(() => import('./views/roles/MesasView'));
const CajaView = lazy(() => import('./views/roles/CajaView'));
const ComandasView = lazy(() => import('./views/roles/ComandasView'));
const ComprasView = lazy(() => import('./views/roles/ComprasView'));
const InvoicesView = lazy(() => import('./views/roles/InvoicesView'));
const DigiturnoView = lazy(() => import('./views/roles/DigiturnoView'));

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  login: (role: UserRole, pin?: string, password?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: UserRole.CLIENT,
  login: async () => false,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// LoginModal lazy-loaded desde LoginModal.tsx para no inflar el bundle
// principal con el diálogo de inicio de sesión.
const LoginModal = lazy(() => import('./components/LoginModal'));

// Only roles that have a login option in the UI map to a backend username.
// The pizzeria's real users (see server/auth.js) are fixed per-role accounts.
const ROLE_TO_USERNAME: Partial<Record<UserRole, string>> = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.OPERATOR]: 'cocina',
  [UserRole.REPARTIDOR]: 'repartidor',
  [UserRole.MARKETING]: 'marketing',
};

// Cosmetic display names only, kept separate from auth now that credentials
// are verified against the real backend rather than a local test list.
const ROLE_DISPLAY_NAMES: Partial<Record<UserRole, string>> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.OPERATOR]: 'Chef Principal',
  [UserRole.REPARTIDOR]: 'Repartidor',
  [UserRole.MARKETING]: 'Marketing',
};

const isKnownRole = (value: string | null): value is UserRole =>
  !!value && (Object.values(UserRole) as string[]).includes(value);

const GASTRO_MODULES: GastroModule[] = [
  'dashboard',
  'menu',
  'inventario',
  'clientes',
  'fidelizacion',
  'campanas',
  'finanzas',
  'reportes',
  'reviews',
  'pagos',
  'empleados',
  'turnos',
  'mesas',
  'caja',
  'comandas',
  'compras',
  'facturacion',
  'digiturno',
];
const isGastroModule = (value: string): value is GastroModule => (GASTRO_MODULES as string[]).includes(value);

// /admin/<module> is deep-linkable (bookmark, refresh, back/forward) --
// separate namespace from the landing page's own paths (index.html's
// showPage) and from /confirmacion (handled above, short-circuits the tree).
const moduleFromPath = (): GastroModule | null => {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/admin\/([a-z]+)/);
  return match && isGastroModule(match[1]) ? match[1] : null;
};

// Map of which roles have access to which modules (URL guard)
const ROLE_MODULE_ACCESS: Partial<Record<UserRole, GastroModule[]>> = {
  [UserRole.ADMIN]: GASTRO_MODULES,
  [UserRole.OPERATOR]: ['dashboard', 'menu', 'inventario', 'turnos', 'mesas', 'comandas', 'digiturno'],
  [UserRole.REPARTIDOR]: ['dashboard'],
  [UserRole.MARKETING]: ['dashboard', 'reviews', 'campanas'],
};

const hasModuleAccess = (role: UserRole, module: GastroModule): boolean =>
  ROLE_MODULE_ACCESS[role]?.includes(module) ?? false;

// Guard: fall back to dashboard if the user tries to deep-link to a module
// they don't have access to (test 18 in full-audit.spec.ts caught this gap).
const guardModuleAccess = (desired: GastroModule, role: UserRole): GastroModule =>
  hasModuleAccess(role, desired) ? desired : 'dashboard';

const App: React.FC = () => {
  // Initialize from whatever session was already persisted in local storage,
  // so a page refresh doesn't silently drop a valid, still-live token.
  const [role, setRole] = useState<UserRole>(() => {
    const storedRole = getStoredRole();
    return isKnownRole(storedRole) ? storedRole : UserRole.CLIENT;
  });
  // El JWT vive solo en la cookie HttpOnly -- JS no puede leerlo para saber
  // si sigue siendo válido. username SÍ persiste en localStorage (no es
  // secreto) y solo se setea en un login de staff real, así que su
  // presencia es la señal optimista de "había sesión" en este refresh; si
  // la cookie ya no es válida, la primera llamada API dispara un 401 →
  // AUTH_UNAUTHORIZED_EVENT → esto se corrige solo (ver el listener abajo).
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getStoredUsername());
  const [showLogin, setShowLogin] = useState(false);
  const [gastroModule, setGastroModuleState] = useState<GastroModule>(() => {
    const storedRole = getStoredRole();
    const initialRole = isKnownRole(storedRole) ? storedRole : UserRole.CLIENT;
    const pathModule = moduleFromPath();
    if (pathModule && initialRole !== UserRole.CLIENT) {
      return guardModuleAccess(pathModule, initialRole);
    }
    return pathModule || 'dashboard';
  });
  // Sede seleccionada en el dropdown de AdminLayout -- filtra el dashboard y
  // es la sede activa para abrir/cerrar turno. Vive acá (no en cada vista)
  // porque tanto el selector (en AdminLayout) como las vistas que lo
  // consumen (dashboard, turnos) son hermanos en el árbol.
  const [selectedLocation, setSelectedLocation] = useState<LocationId>('nemocon');
  const menuMount = typeof document !== 'undefined' ? document.getElementById('menu-mount') : null;
  const cartMount = typeof document !== 'undefined' ? document.getElementById('cart-mount') : null;
  const reviewsMount = typeof document !== 'undefined' ? document.getElementById('reviews-mount') : null;

  // Keeps gastroModule and the URL in sync both ways: calling this pushes
  // /admin/<module>, and browser back/forward (popstate below) calls
  // setGastroModuleState directly to avoid re-pushing on every pop.
  const navigateToModule = (m: GastroModule) => {
    const guarded = guardModuleAccess(m, role);
    setGastroModuleState(guarded);
    if (window.location.pathname !== `/admin/${guarded}`) {
      history.pushState({ gastroModule: guarded }, '', `/admin/${guarded}`);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const m = moduleFromPath();
      if (m) setGastroModuleState(guardModuleAccess(m, role));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [role]);

  // Deep link landed on directly (bookmark, shared link) while logged out --
  // prompt for the PIN instead of silently falling back to the public
  // landing page underneath with no explanation.
  useEffect(() => {
    if (!isAuthenticated && moduleFromPath()) setShowLogin(true);
    // Intentionally only on mount: this is a one-time "did we land deep
    // while logged out" check, not something that should re-fire on every
    // isAuthenticated flip (login/logout already handle their own state).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    // api.logout() ya limpia clearAuthSession() y llama a POST
    // /api/auth/logout para vaciar la cookie HttpOnly server-side -- sin
    // esto, cerrar sesión solo borraba el estado local y la cookie seguía
    // siendo válida en el backend. No se espera la promesa: la UI se
    // resetea de inmediato, el request corre en segundo plano.
    void api.logout();
    setRole(UserRole.CLIENT);
    setIsAuthenticated(false);
    if (window.location.pathname.startsWith('/admin/')) {
      history.pushState(null, '', '/');
    }
  };

  // If any request comes back 401 (missing/expired token), api.ts clears the
  // stored session and fires this event - react by kicking the user back to
  // the logged-out state so they land on the login screen.
  useEffect(() => {
    const handleUnauthorized = () => {
      setRole(UserRole.CLIENT);
      setIsAuthenticated(false);
      setShowLogin(true);
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  // ── WebSocket raíz ──────────────────────────────────────────────
  // Conecta el WebSocket automáticamente con el rol y sede actuales.
  // El hook internamente llama a reconnectWS cuando cambian las deps.
  // El WCAG focus trap y Escape key del LoginModal se manejan dentro
  // del componente LoginModal.tsx (no aquí), para que el lazy-loading
  // funcione correctamente sin duplicar lógica de accesibilidad.
  useWebSocket('*', undefined, { role, locationId: selectedLocation });

  // Standalone page landed on after a Bold checkout -- bypasses the rest of
  // the app tree entirely (no CRM/login chrome needed here). Still wrapped
  // in <MotionConfig reducedMotion="user"> so any motion components inside
  // OrderConfirmationPage also honor prefers-reduced-motion (2026-07-21 fix
  // for ISSUES_2026-07-21.md P2-7; CSS-only @media was covering Tailwind
  // animate-* utilities but framer-motion runs outside CSS).
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/confirmacion')) {
    return (
      <MotionConfig reducedMotion="user">
        <OrderConfirmationPage />
      </MotionConfig>
    );
  }

  const login = async (selectedRole: UserRole, pin?: string, password?: string): Promise<boolean> => {
    const username = ROLE_TO_USERNAME[selectedRole];
    // password solo lo pide LoginModal para ADMIN -- el resto de roles sigue
    // mandando solo PIN, backend decide qué exige según la cuenta.
    if (!username || (!pin && !password)) return false;
    // No try/catch swallowing here on purpose -- a network failure (backend
    // unreachable) needs to reach LoginModal's own catch with its real
    // message, not collapse into the same "PIN incorrecto" a wrong PIN gets.
    const result = await api.login(username, pin, password);
    if (!result?.role) return false;
    setAuthSession({ role: result.role, username: result.username });
    const resolvedRole = isKnownRole(result.role) ? result.role : selectedRole;
    setRole(resolvedRole);
    setIsAuthenticated(true);
    setShowLogin(false);
    // Landed here from the public site (crown button) -- move the URL into
    // the /admin/* namespace so refresh/back-forward/bookmarks work from
    // the module the user lands on (whatever gastroModule already is,
    // e.g. still 'dashboard' on a fresh login).
    if (!window.location.pathname.startsWith('/admin/')) {
      history.pushState({ gastroModule }, '', `/admin/${gastroModule}`);
    }
    return true;
  };

  const renderGastroModule = () => {
    switch (gastroModule) {
      case 'menu':
        return <MenuInteligente />;
      case 'inventario':
        return <InventarioView />;
      case 'clientes':
        return <ClientesView />;
      case 'fidelizacion':
        return <FidelizacionView />;
      case 'campanas':
        return <MarketingView />;
      case 'finanzas':
        return <FinanzasView />;
      case 'reportes':
        return <ReportesView />;
      case 'reviews':
        return <ReviewsView />;
      case 'pagos':
        return <PaymentSettingsView />;
      case 'empleados':
        return <EmpleadosView />;
      case 'turnos':
        return <TurnosView locationId={selectedLocation} />;
      case 'mesas':
        return <MesasView locationId={selectedLocation} />;
      case 'caja':
        return <CajaView locationId={selectedLocation} />;
      case 'comandas':
        return <ComandasView locationId={selectedLocation} />;
      case 'compras':
        return <ComprasView locationId={selectedLocation} />;
      case 'facturacion':
        return <InvoicesView locationId={selectedLocation} />;
      case 'digiturno':
        return <DigiturnoView locationId={selectedLocation} />;
      default:
        return <GastroProDashboard locationId={selectedLocation} />;
    }
  };

  // <MotionConfig reducedMotion="user"> is the single source of truth for
  // honoring prefers-reduced-motion across all framer-motion components
  // (LoginModal, MenuDigital animations, AnimatePresence transitions).
  // The CSS rule in src/index.css already handles Tailwind animate-* utilities;
  // this wrapper closes the framer-motion gap (P2-7).
  return (
    <MotionConfig reducedMotion="user">
    <CartProvider>
      <AuthContext.Provider value={{ isAuthenticated, userRole: role, login, logout }}>
        {/* Floating admin button - always visible */}
        <button
          onClick={() => (isAuthenticated ? logout() : setShowLogin(true))}
          className="fixed bottom-6 left-6 z-[9999] w-14 h-14 rounded-2xl bg-stone-950/90 backdrop-blur-xl border border-white/10 text-stone-400 hover:text-white hover:border-orange-500/50 flex items-center justify-center shadow-2xl transition-all group"
          title={isAuthenticated ? 'Cerrar sesión' : 'Panel Administrativo'}
        >
          <i
            className={`fas ${isAuthenticated ? 'fa-right-from-bracket' : 'fa-crown'} text-xl transition-transform group-hover:scale-110`}
          ></i>
        </button>

        {/* Login Modal (lazy-loaded) */}
        {showLogin && !isAuthenticated && (
          <Suspense fallback={null}>
            <LoginModal onLogin={login} onClose={() => setShowLogin(false)} />
          </Suspense>
        )}

        {/* Admin CRM Overlay */}
        {isAuthenticated &&
          (role === UserRole.ADMIN ||
            role === UserRole.OPERATOR ||
            role === UserRole.REPARTIDOR ||
            role === UserRole.MARKETING) && (
            <div className="fixed inset-0 z-[9998] animate-fade-in">
              <AdminLayout
                module={gastroModule}
                onModuleChange={navigateToModule}
                userName={ROLE_DISPLAY_NAMES[role] || role}
                userRole={role}
                onLogout={logout}
                locationId={selectedLocation}
                onLocationChange={setSelectedLocation}
              >
                <Suspense
                  fallback={
                    <div className="p-10 text-stone-500 text-sm font-bold uppercase tracking-widest">Cargando...</div>
                  }
                >
                  {renderGastroModule()}
                </Suspense>
              </AdminLayout>
            </div>
          )}

        {/* MenuDigital — rendered as inline section via portal into #menu-mount */}
        {menuMount && createPortal(<MenuDigital variant="section" />, menuMount)}

        {/* CartSection — rendered as inline section via portal into #cart-mount */}
        {cartMount && createPortal(<CartSection />, cartMount)}

        {/* Approved reviews — rendered as inline section via portal into #reviews-mount.
            Was previously only wired inside dead CustomerView.tsx (never rendered since
            2026-06-05's move to this portal architecture) — moved onto the live surface. */}
        {reviewsMount && createPortal(<ApprovedReviews />, reviewsMount)}
      </AuthContext.Provider>
    </CartProvider>
    </MotionConfig>
  );
};

export default App;
