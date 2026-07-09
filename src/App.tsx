import React, { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { UserRole, GastroModule } from './types';
import AdminLayout from './components/AdminLayout';
import MenuDigital from './components/MenuDigital';
import CartSection from './components/CartSection';
import { CartProvider } from './context/CartContext';
import GastroProDashboard from './views/roles/GastroProDashboard';
import MenuInteligente from './views/roles/MenuInteligente';
import InventarioView from './views/roles/InventarioView';
import ClientesView from './views/roles/ClientesView';
import FidelizacionView from './views/roles/FidelizacionView';
import MarketingView from './views/roles/MarketingView';
import FinanzasView from './views/roles/FinanzasView';
import ReportesView from './views/roles/ReportesView';
import ReviewsView from './views/roles/ReviewsView';
import PaymentSettingsView from './views/roles/PaymentSettingsView';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import ApprovedReviews from './components/ApprovedReviews';
import api, { AUTH_UNAUTHORIZED_EVENT, clearAuthSession, getAuthToken, getStoredRole, setAuthSession } from './services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  login: (role: UserRole, pin?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: UserRole.CLIENT,
  login: async () => false,
  logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

// Only roles that have a login option in the UI map to a backend username.
// The pizzeria's real users (see server/auth.js) are fixed per-role accounts.
const ROLE_TO_USERNAME: Partial<Record<UserRole, string>> = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.OPERATOR]: 'cocina',
  [UserRole.REPARTIDOR]: 'repartidor',
  [UserRole.MARKETING]: 'marketing'
};

// Cosmetic display names only, kept separate from auth now that credentials
// are verified against the real backend rather than a local test list.
const ROLE_DISPLAY_NAMES: Partial<Record<UserRole, string>> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.OPERATOR]: 'Chef Principal',
  [UserRole.REPARTIDOR]: 'Repartidor',
  [UserRole.MARKETING]: 'Marketing'
};

const isKnownRole = (value: string | null): value is UserRole =>
  !!value && (Object.values(UserRole) as string[]).includes(value);

const App: React.FC = () => {
  // Initialize from whatever session was already persisted in local storage,
  // so a page refresh doesn't silently drop a valid, still-live token.
  const [role, setRole] = useState<UserRole>(() => {
    const storedRole = getStoredRole();
    return isKnownRole(storedRole) ? storedRole : UserRole.CLIENT;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getAuthToken());
  const [showLogin, setShowLogin] = useState(false);
  const [gastroModule, setGastroModule] = useState<GastroModule>('dashboard');
  const menuMount = typeof document !== 'undefined' ? document.getElementById('menu-mount') : null;
  const cartMount = typeof document !== 'undefined' ? document.getElementById('cart-mount') : null;
  const reviewsMount = typeof document !== 'undefined' ? document.getElementById('reviews-mount') : null;

  const logout = () => {
    clearAuthSession();
    setRole(UserRole.CLIENT);
    setIsAuthenticated(false);
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

  // Standalone page landed on after a Bold checkout -- bypasses the rest of
  // the app tree entirely (no CRM/login chrome needed here).
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/confirmacion')) {
    return <OrderConfirmationPage />;
  }

  const login = async (selectedRole: UserRole, pin?: string): Promise<boolean> => {
    const username = ROLE_TO_USERNAME[selectedRole];
    if (!username || !pin) return false;
    try {
      const result = await api.login(username, pin);
      if (!result?.token) return false;
      setAuthSession({ token: result.token, role: result.role, username: result.username });
      const resolvedRole = isKnownRole(result.role) ? result.role : selectedRole;
      setRole(resolvedRole);
      setIsAuthenticated(true);
      setShowLogin(false);
      return true;
    } catch {
      return false;
    }
  };

  const renderGastroModule = () => {
    switch (gastroModule) {
      case 'menu': return <MenuInteligente />;
      case 'inventario': return <InventarioView />;
      case 'clientes': return <ClientesView />;
      case 'fidelizacion': return <FidelizacionView />;
      case 'campanas': return <MarketingView />;
      case 'finanzas': return <FinanzasView />;
      case 'reportes': return <ReportesView />;
      case 'reviews': return <ReviewsView />;
      case 'pagos': return <PaymentSettingsView />;
      default: return <GastroProDashboard />;
    }
  };

  return (
    <CartProvider>
      <AuthContext.Provider value={{ isAuthenticated, userRole: role, login, logout }}>
        {/* Floating admin button - always visible */}
        <button
          onClick={() => isAuthenticated ? logout() : setShowLogin(true)}
          className="fixed bottom-6 left-6 z-[9999] w-14 h-14 rounded-2xl bg-stone-950/90 backdrop-blur-xl border border-white/10 text-stone-400 hover:text-white hover:border-orange-500/50 flex items-center justify-center shadow-2xl transition-all group"
          title={isAuthenticated ? 'Cerrar sesión' : 'Panel Administrativo'}
        >
          <i className={`fas ${isAuthenticated ? 'fa-right-from-bracket' : 'fa-crown'} text-xl transition-transform group-hover:scale-110`}></i>
        </button>

        {/* Login Modal */}
        {showLogin && !isAuthenticated && <LoginModal onLogin={login} onClose={() => setShowLogin(false)} />}

        {/* Admin CRM Overlay */}
        {isAuthenticated && (role === UserRole.ADMIN || role === UserRole.OPERATOR || role === UserRole.REPARTIDOR || role === UserRole.MARKETING) && (
          <div className="fixed inset-0 z-[9998] animate-fade-in">
            <AdminLayout
              module={gastroModule}
              onModuleChange={setGastroModule}
              userName={ROLE_DISPLAY_NAMES[role] || role}
              userRole={role}
              onLogout={logout}
            >
              {renderGastroModule()}
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
  );
};

const LoginModal: React.FC<{ onLogin: (role: UserRole, pin: string) => Promise<boolean>; onClose: () => void }> = ({ onLogin, onClose }) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !pin) {
      setError('Selecciona un rol e ingresa el PIN');
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await onLogin(selectedRole as UserRole, pin);
      if (!success) setError('PIN incorrecto');
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-stone-950 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-zoom-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-900/30">
            <i className="fas fa-pizza-slice text-2xl text-white"></i>
          </div>
          <h2 className="text-2xl font-black text-white">GastroPro</h2>
          <p className="text-stone-500 text-sm mt-1">CRM Gastronómico</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block">Rol</label>
            <select
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setError(''); }}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold focus:border-orange-600/50 outline-none transition-colors"
            >
              <option value="">Seleccionar rol</option>
              <option value={UserRole.ADMIN}>Administrador</option>
              <option value={UserRole.OPERATOR}>Cocina</option>
              <option value={UserRole.REPARTIDOR}>Repartidor</option>
              <option value={UserRole.MARKETING}>Marketing</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              maxLength={4}
              placeholder="••••"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-center text-2xl tracking-[0.5em] font-bold focus:border-orange-600/50 outline-none transition-colors"
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg shadow-orange-900/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-[10px] text-stone-600 hover:text-stone-400 uppercase tracking-widest font-bold transition-colors"
          >
            {showHint ? 'Ocultar' : '¿Olvidaste el PIN?'}
          </button>
          {showHint && (
            <div className="mt-3 p-3 bg-stone-900 rounded-xl border border-white/5 text-[10px] text-stone-500 space-y-1">
              <p>Admin: <span className="text-orange-500 font-bold">1234</span></p>
              <p>Cocina: <span className="text-orange-500 font-bold">5678</span></p>
              <p>Repartidor: <span className="text-orange-500 font-bold">0000</span></p>
              <p>Marketing: <span className="text-orange-500 font-bold">9999</span></p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:text-white hover:bg-stone-800 transition-colors"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>
    </div>
  );
};

export default App;
