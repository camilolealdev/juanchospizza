
import React, { useState, createContext, useContext, useEffect } from 'react';
import { UserRole, GastroModule } from './types';
import CustomerView from './views/roles/CustomerView';
import AdminDashboard from './views/roles/AdminDashboard';
import KitchenView from './views/roles/KitchenView';
import RepartidorView from './views/roles/RepartidorView';
import MarketingView from './views/roles/MarketingView';
import ProfileView from './views/roles/ProfileView';
import AIChatWidget from './components/AIChatWidget';
import AdminLayout from './components/AdminLayout';
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
  'marketing': { role: UserRole.MARKETING, pin: '9999', name: 'Marketing Team' },
};

const LoginPage: React.FC<{ onLogin: (role: UserRole, pin: string) => void }> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !pin) {
      setError('Selecciona un rol e ingresa el PIN');
      return;
    }
    onLogin(selectedRole as UserRole, pin);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-pizza-slice text-4xl text-white"></i>
          </div>
          <h1 className="text-3xl font-brand text-white">Guido Pizza</h1>
          <p className="text-stone-500 mt-2">Acceso Personal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs text-stone-500 uppercase font-bold mb-2 block">Selecciona tu rol</label>
            <select 
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setError(''); }}
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white"
            >
              <option value="">-- Seleccionar --</option>
              <option value={UserRole.ADMIN}>Administrador</option>
              <option value={UserRole.OPERATOR}>Cocina</option>
              <option value={UserRole.REPARTIDOR}>Repartidor</option>
              <option value={UserRole.MARKETING}>Marketing</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-stone-500 uppercase font-bold mb-2 block">PIN de acceso</label>
            <input 
              type="password" 
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              maxLength={4}
              placeholder="••••"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-center text-3xl tracking-[0.5em]"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all"
          >
            Entrar
          </button>
        </form>

        <div className="mt-8 p-4 bg-stone-900 rounded-xl border border-white/5">
          <p className="text-xs text-stone-500 uppercase font-bold mb-2">Credenciales:</p>
          <div className="text-xs text-stone-400 grid grid-cols-2 gap-2">
            <span>Admin: 1234</span>
            <span>Cocina: 5678</span>
            <span>Repartidor: 0000</span>
            <span>Marketing: 9999</span>
          </div>
        </div>

        <a href="/" className="block text-center mt-6 text-stone-500 text-sm hover:text-white" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}>
          ← Volver al sitio público
        </a>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [gastroModule, setGastroModule] = useState<GastroModule>('dashboard');

  useEffect(() => {
    const handleNavigation = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handleNavigation);
    handleNavigation();
    
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const login = (selectedRole: UserRole, pin?: string): boolean => {
    const userKey = Object.keys(TEST_USERS).find(k => TEST_USERS[k].role === selectedRole);
    if (userKey && TEST_USERS[userKey].pin === pin) {
      setRole(selectedRole);
      setIsAuthenticated(true);
      navigate('/');
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(UserRole.CLIENT);
    setIsAuthenticated(false);
    navigate('/');
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

  const renderContent = () => {
    if (currentPath === '/staff' || currentPath === '/login' || currentPath === '/admin.html') {
      if (isAuthenticated) {
        navigate('/');
        return null;
      }
      return <LoginPage onLogin={login} />;
    }

    switch (role) {
      case UserRole.ADMIN: return (
        <AdminLayout
          module={gastroModule}
          onModuleChange={setGastroModule}
          userName={TEST_USERS['admin']?.name || 'Admin'}
          onLogout={logout}
        >
          {renderGastroModule()}
        </AdminLayout>
      );
      case UserRole.OPERATOR: return <KitchenView />;
      case UserRole.REPARTIDOR: return <RepartidorView />;
      case UserRole.MARKETING: return <MarketingView />;
      default: return <CustomerView />;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole: role, login, logout }}>
      <div className="min-h-screen flex flex-col selection:bg-orange-600 selection:text-white bg-stone-950">
        
        {currentPath === '/staff' || currentPath === '/login' ? (
          renderContent()
        ) : (
          <>
            {isProfileOpen && <ProfileView role={role} onClose={() => setIsProfileOpen(false)} />}
            
            <main className="flex-1">
              {renderContent()}
            </main>

            {role === UserRole.CLIENT && <AIChatWidget />}
          </>
        )}
      </div>
    </AuthContext.Provider>
  );
};

export default App;
