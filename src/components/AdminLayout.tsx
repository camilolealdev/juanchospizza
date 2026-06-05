
import React, { useState } from 'react';
import { GastroModule } from '../types';

interface AdminLayoutProps {
  module: GastroModule;
  onModuleChange: (m: GastroModule) => void;
  children: React.ReactNode;
  userName?: string;
  onLogout?: () => void;
}

const NAV_ITEMS: { module: GastroModule; label: string; icon: string }[] = [
  { module: 'dashboard', label: 'Dashboard', icon: 'chart-simple' },
  { module: 'menu', label: 'Menú Inteligente', icon: 'book' },
  { module: 'inventario', label: 'Inventario', icon: 'warehouse' },
  { module: 'clientes', label: 'Clientes', icon: 'users' },
  { module: 'fidelizacion', label: 'Fidelización', icon: 'gift' },
  { module: 'campanas', label: 'Campañas', icon: 'bullhorn' },
  { module: 'finanzas', label: 'Finanzas', icon: 'coins' },
  { module: 'reportes', label: 'Reportes', icon: 'chart-line' },
];

const MODULE_TITLES: Record<GastroModule, string> = {
  dashboard: 'Dashboard',
  menu: 'Menú Inteligente',
  inventario: 'Inventario',
  clientes: 'Clientes',
  fidelizacion: 'Fidelización',
  campanas: 'Campañas',
  finanzas: 'Finanzas',
  reportes: 'Reportes',
};

const AdminLayout: React.FC<AdminLayoutProps> = ({
  module,
  onModuleChange,
  children,
  userName = 'Admin',
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleModuleChange = (m: GastroModule) => {
    onModuleChange(m);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex selection:bg-orange-600 selection:text-white">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed md:sticky top-0 left-0 z-40 h-screen',
          'w-[280px] flex flex-col',
          'bg-stone-950/80 backdrop-blur-2xl border-r border-white/5',
          'transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/30">
              <i className="fas fa-pizza-slice text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">GastroPro</h1>
              <p className="text-[9px] font-bold text-stone-500 uppercase tracking-[0.3em]">CRM Gastronómico</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = module === item.module;
            return (
              <button
                key={item.module}
                onClick={() => handleModuleChange(item.module)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative',
                  isActive
                    ? 'bg-orange-600/10 text-orange-500 shadow-sm'
                    : 'text-stone-400 hover:text-white hover:bg-stone-900/60',
                ].join(' ')}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-orange-600" />
                )}
                <div
                  className={[
                    'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200',
                    isActive
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-900/30'
                      : 'bg-stone-900 text-stone-500 group-hover:bg-stone-800 group-hover:text-stone-300',
                  ].join(' ')}
                >
                  <i className={`fas fa-${item.icon} text-sm`} />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-stone-900/40 mb-3">
            <div className="w-9 h-9 rounded-full bg-orange-600/20 flex items-center justify-center border border-orange-600/20">
              <i className="fas fa-user text-orange-500 text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{userName}</p>
              <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Administrador</p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-stone-500 hover:text-red-400 hover:bg-red-500/5 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
                <i className="fas fa-right-from-bracket text-sm"></i>
              </div>
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-stone-950/80 backdrop-blur-2xl border-b border-white/5">
          <div className="flex items-center justify-between px-6 md:px-10 h-16">
            {/* Mobile Menu Toggle + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
              >
                <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-sm`}></i>
              </button>
              <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                {MODULE_TITLES[module]}
              </h2>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button className="relative w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition-all">
                <i className="fas fa-bell text-sm"></i>
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-lg shadow-orange-900/40">
                  3
                </span>
              </button>
              <div className="hidden md:flex items-center gap-2 text-xs text-stone-500 font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Online
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
