import React, { useState, useEffect, useRef, createContext, useContext, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserRole, GastroModule, LocationId } from './types';
import AdminLayout from './components/AdminLayout';
import CustomerSite from './components/CustomerSite';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import { CartProvider } from './context/CartContext';
import TrackOrderModal from './components/TrackOrderModal';
import { useWebSocket } from './hooks/useWebSocket';
import api, { AUTH_UNAUTHORIZED_EVENT, getStoredRole, getStoredUsername, setAuthSession } from './services/api';
import { MotionConfig } from 'framer-motion';

// Customer pages
const HomePage = lazy(() => import('./pages/site/HomePage'));
const PizzaPage = lazy(() => import('./pages/site/PizzaPage'));
const MenuPage = lazy(() => import('./pages/site/MenuPage'));
const DomiciliosPage = lazy(() => import('./pages/site/DomiciliosPage'));
const LegalPage = lazy(() => import('./pages/site/LegalPage'));

// CRM modules
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
const NotificacionesView = lazy(() => import('./views/roles/NotificacionesView'));
const EmpleadosView = lazy(() => import('./views/roles/EmpleadosView'));
const TurnosView = lazy(() => import('./views/roles/TurnosView'));
const MesasView = lazy(() => import('./views/roles/MesasView'));
const CajaView = lazy(() => import('./views/roles/CajaView'));
const ComandasView = lazy(() => import('./views/roles/ComandasView'));
const ComprasView = lazy(() => import('./views/roles/ComprasView'));
const InvoicesView = lazy(() => import('./views/roles/InvoicesView'));
const DigiturnoView = lazy(() => import('./views/roles/DigiturnoView'));
const DerechosView = lazy(() => import('./views/roles/DerechosView'));

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

const LoginModal = lazy(() => import('./components/LoginModal'));

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
  'notificaciones',
  'empleados',
  'turnos',
  'mesas',
  'caja',
  'comandas',
  'compras',
  'facturacion',
  'digiturno',
  'derechos',
];
const isGastroModule = (value: string): value is GastroModule => (GASTRO_MODULES as string[]).includes(value);

const moduleFromPath = (): GastroModule | null => {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/admin\/([a-z]+)/);
  return match && isGastroModule(match[1]) ? match[1] : null;
};

const ROLE_MODULE_ACCESS: Partial<Record<UserRole, GastroModule[]>> = {
  [UserRole.ADMIN]: GASTRO_MODULES,
  [UserRole.OPERATOR]: ['dashboard', 'menu', 'inventario', 'turnos', 'mesas', 'comandas', 'digiturno'],
  [UserRole.REPARTIDOR]: ['dashboard'],
  [UserRole.MARKETING]: ['dashboard', 'reviews', 'campanas', 'derechos'],
};

const hasModuleAccess = (role: UserRole, module: GastroModule): boolean =>
  ROLE_MODULE_ACCESS[role]?.includes(module) ?? false;

const guardModuleAccess = (desired: GastroModule, role: UserRole): GastroModule =>
  hasModuleAccess(role, desired) ? desired : 'dashboard';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(() => {
    const storedRole = getStoredRole();
    return isKnownRole(storedRole) ? storedRole : UserRole.CLIENT;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getStoredUsername());
  const [showLogin, setShowLogin] = useState(false);
  const [showTrackOrder, setShowTrackOrder] = useState(false);
  const [gastroModule, setGastroModuleState] = useState<GastroModule>(() => {
    const storedRole = getStoredRole();
    const initialRole = isKnownRole(storedRole) ? storedRole : UserRole.CLIENT;
    const pathModule = moduleFromPath();
    if (pathModule && initialRole !== UserRole.CLIENT) {
      return guardModuleAccess(pathModule, initialRole);
    }
    return pathModule || 'dashboard';
  });
  const [selectedLocation, setSelectedLocation] = useState<LocationId>('nemocon');

  useEffect(() => {
    const btn = document.getElementById('navTrackOrderBtn');
    if (!btn) return;
    const handler = () => setShowTrackOrder(true);
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, []);

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

  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  useEffect(() => {
    const isLoginPath = window.location.pathname === '/login';
    const isAdminBase = window.location.pathname === '/admin';
    const isAdminDeep = !!moduleFromPath();

    if (!isAuthenticated && isLoginPath) {
      setShowLogin(true);
      history.replaceState(null, '', '/');
      return;
    }

    if (!isAuthenticated && (isAdminBase || isAdminDeep)) {
      setShowLogin(true);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (!isAuthenticatedRef.current) {
          setShowLogin((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    void api.logout();
    setRole(UserRole.CLIENT);
    setIsAuthenticated(false);
    if (window.location.pathname.startsWith('/admin/')) {
      history.pushState(null, '', '/');
    }
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      setRole(UserRole.CLIENT);
      setIsAuthenticated(false);
      setShowLogin(true);
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  useWebSocket('*', undefined, { role, locationId: selectedLocation });

  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/confirmacion')) {
    return (
      <MotionConfig reducedMotion="user">
        <OrderConfirmationPage />
      </MotionConfig>
    );
  }

  const login = async (username: string, pin?: string, password?: string): Promise<boolean> => {
    if (!username || (!pin && !password)) return false;
    const result = await api.login(username, pin, password);
    if (!result?.role) return false;
    setAuthSession({ role: result.role, username: result.username });
    const resolvedRole = isKnownRole(result.role) ? result.role : UserRole.CLIENT;
    setRole(resolvedRole);
    setIsAuthenticated(true);
    setShowLogin(false);
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
      case 'notificaciones':
        return <NotificacionesView />;
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
      case 'derechos':
        return <DerechosView />;
      default:
        return <GastroProDashboard locationId={selectedLocation} />;
    }
  };

  const isStaffAdmin =
    isAuthenticated &&
    (role === UserRole.ADMIN ||
      role === UserRole.OPERATOR ||
      role === UserRole.REPARTIDOR ||
      role === UserRole.MARKETING);

  return (
    <MotionConfig reducedMotion="user">
      <CartProvider>
        <AuthContext.Provider value={{ isAuthenticated, userRole: role, login, logout }}>
          {showLogin && !isAuthenticated && (
            <Suspense fallback={null}>
              <LoginModal onLogin={login} onClose={() => setShowLogin(false)} />
            </Suspense>
          )}

          {showTrackOrder && <TrackOrderModal onClose={() => setShowTrackOrder(false)} />}

          {isStaffAdmin && (
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

          {!isStaffAdmin && (
            <BrowserRouter>
              <Suspense
                fallback={
                  <div className="min-h-screen bg-crema flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-4xl block mb-3">🍕</span>
                      <p className="font-heading text-lg text-carbon/50 uppercase tracking-wider">Cargando...</p>
                    </div>
                  </div>
                }
              >
                <Routes>
                  <Route element={<CustomerSite />}>
                    <Route index element={<HomePage />} />
                    <Route path="pizza" element={<PizzaPage />} />
                    <Route path="menu" element={<MenuPage />} />
                    <Route path="domicilios" element={<DomiciliosPage />} />
                    <Route path="politica-de-privacidad" element={<LegalPage />} />
                    <Route path="terminos-y-condiciones" element={<LegalPage />} />
                    <Route path="eliminacion-de-datos" element={<LegalPage />} />
                    <Route path="*" element={<HomePage />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          )}
        </AuthContext.Provider>
      </CartProvider>
    </MotionConfig>
  );
};

export default App;
