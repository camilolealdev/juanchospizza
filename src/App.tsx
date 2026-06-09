import React, { useState, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { UserRole, GastroModule } from './types';
import AdminLayout from './components/AdminLayout';
import MenuDigital from './components/MenuDigital';
import CartSection from './components/CartSection';
import AIChatWidget from './components/AIChatWidget';
import { CartProvider } from './context/CartContext';
import GastroProDashboard from './views/roles/GastroProDashboard';
import MenuInteligente from './views/roles/MenuInteligente';
import InventarioView from './views/roles/InventarioView';
import ClientesView from './views/roles/ClientesView';
import FidelizacionView from './views/roles/FidelizacionView';
import CampanasView from './views/roles/CampanasView';
import FinanzasView from './views/roles/FinanzasView';
import ReportesView from './views/roles/ReportesView';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  login: (role: UserRole, pin?: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: UserRole.CLIENT,
  login: () => false,
  logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

const TEST_USERS: Record<string, { role: UserRole; pin: string; name: string }> = {
  'admin': { role: UserRole.ADMIN, pin: '1234', name: 'Administrador' },
  'cocina': { role: UserRole.OPERATOR, pin: '5678', name: 'Chef Principal' },
  'repartidor': { role: UserRole.REPARTIDOR, pin: '0000', name: 'Repartidor' },
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [gastroModule, setGastroModule] = useState<GastroModule>('dashboard');
  const menuMount = typeof document !== 'undefined' ? document.getElementById('menu-mount') : null;
  const cartMount = typeof document !== 'undefined' ? document.getElementById('cart-mount') : null;

  const login = (selectedRole: UserRole, pin?: string): boolean => {
    const userKey = Object.keys(TEST_USERS).find(k => TEST_USERS[k].role === selectedRole);
    if (userKey && TEST_USERS[userKey].pin === pin) {
      setRole(selectedRole);
      setIsAuthenticated(true);
      setShowLogin(false);
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(UserRole.CLIENT);
    setIsAuthenticated(false);
  };

  const renderGastroModule = () => {
    switch (gastroModule) {
      case 'menu': return <MenuInteligente />;
      case 'inventario': return <InventarioView />;
      case 'clientes': return <ClientesView />;
      case 'fidelizacion': return <FidelizacionView />;
      case 'campanas': return <CampanasView />;
      case 'finanzas': return <FinanzasView />;
      case 'reportes': return <ReportesView />;
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
        {isAuthenticated && (role === UserRole.ADMIN || role === UserRole.OPERATOR || role === UserRole.REPARTIDOR) && (
          <div className="fixed inset-0 z-[9998] animate-fade-in">
            <AdminLayout
              module={gastroModule}
              onModuleChange={setGastroModule}
              userName={Object.values(TEST_USERS).find(u => u.role === role)?.name || role}
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

        {/* Global AI Chatbot */}
        <AIChatWidget />
      </AuthContext.Provider>
    </CartProvider>
  );
};

const LoginModal: React.FC<{ onLogin: (role: UserRole, pin: string) => boolean; onClose: () => void }> = ({ onLogin, onClose }) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !pin) {
      setError('Selecciona un rol e ingresa el PIN');
      return;
    }
    const success = onLogin(selectedRole as UserRole, pin);
    if (!success) setError('PIN incorrecto');
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
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg shadow-orange-900/30 active:scale-[0.98]"
          >
            Entrar
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
