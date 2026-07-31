import React, { useState, useMemo, useRef } from 'react';
import { GastroModule, LocationId, UserRole } from '../types';

interface AdminLayoutProps {
  module: GastroModule;
  onModuleChange: (m: GastroModule) => void;
  children: React.ReactNode;
  userName?: string;
  userRole?: UserRole;
  onLogout?: () => void;
  locationId?: LocationId;
  onLocationChange?: (l: LocationId) => void;
}

const LOCATION_LABELS: Record<LocationId, string> = {
  nemocon: 'Nemocón',
  zipaquira: 'Zipaquirá',
};

const ALL_NAV: { module: GastroModule; label: string; icon: string; roles: UserRole[] }[] = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    icon: 'chart-simple',
    roles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.REPARTIDOR, UserRole.MARKETING],
  },
  { module: 'menu', label: 'Menú Inteligente', icon: 'book', roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { module: 'inventario', label: 'Inventario', icon: 'warehouse', roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { module: 'clientes', label: 'Clientes', icon: 'users', roles: [UserRole.ADMIN] },
  { module: 'fidelizacion', label: 'Fidelización', icon: 'gift', roles: [UserRole.ADMIN] },
  { module: 'campanas', label: 'Campañas', icon: 'bullhorn', roles: [UserRole.ADMIN, UserRole.MARKETING] },
  { module: 'finanzas', label: 'Finanzas', icon: 'coins', roles: [UserRole.ADMIN] },
  { module: 'reportes', label: 'Reportes', icon: 'chart-line', roles: [UserRole.ADMIN] },
  { module: 'reviews', label: 'Reseñas', icon: 'star', roles: [UserRole.ADMIN] },
  { module: 'pagos', label: 'Pagos', icon: 'credit-card', roles: [UserRole.ADMIN] },
  { module: 'empleados', label: 'Empleados', icon: 'id-badge', roles: [UserRole.ADMIN] },
  { module: 'turnos', label: 'Turnos', icon: 'clock', roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { module: 'mesas', label: 'Mesas', icon: 'table', roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { module: 'caja', label: 'Caja', icon: 'cash-register', roles: [UserRole.ADMIN] },
  { module: 'comandas', label: 'Comandas', icon: 'utensils', roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { module: 'digiturno', label: 'Digiturno', icon: 'ticket', roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { module: 'derechos', label: 'Derechos ARCO', icon: 'shield-halved', roles: [UserRole.ADMIN, UserRole.MARKETING] },
  { module: 'compras', label: 'Compras', icon: 'truck', roles: [UserRole.ADMIN] },
  { module: 'facturacion', label: 'Facturación', icon: 'file-invoice', roles: [UserRole.ADMIN] },
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
  reviews: 'Reseñas',
  pagos: 'Pagos',
  empleados: 'Empleados',
  turnos: 'Turnos',
  mesas: 'Mesas',
  caja: 'Caja',
  comandas: 'Comandas',
  digiturno: 'Digiturno',
  derechos: 'Derechos ARCO',
  compras: 'Compras',
  facturacion: 'Facturación',
};

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.OPERATOR]: 'Cocina',
  [UserRole.REPARTIDOR]: 'Repartidor',
  [UserRole.CLIENT]: 'Cliente',
  [UserRole.MARKETING]: 'Marketing',
};

const AdminLayout: React.FC<AdminLayoutProps> = ({
  module,
  onModuleChange,
  children,
  userName = 'Admin',
  userRole = UserRole.ADMIN,
  onLogout,
  locationId,
  onLocationChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const navItems = useMemo(() => ALL_NAV.filter((item) => item.roles.includes(userRole)), [userRole]);

  const handleModuleChange = (m: GastroModule) => {
    onModuleChange(m);
    setMobileMenuOpen(false);
    mainRef.current?.scrollTo(0, 0);
  };

  return (
    <div className="h-screen bg-brand-950 flex selection:bg-brand-600 selection:text-white">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-overlay md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed md:sticky top-0 left-0 z-sidebar h-screen',
          'w-[280px] flex flex-col',
          'bg-gradient-to-b from-brand-950 via-[#0f0807] to-[#0a0403]',
          'border-r border-brand-900/30',
          'shadow-2xl shadow-black/50',
          'transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="relative p-6 border-b border-brand-900/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-600/5 to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/40 ring-1 ring-white/10">
              <i className="fas fa-pizza-slice text-white text-lg drop-shadow-sm"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">
                Juancho<span className="text-gold-400">&rsquo;</span>
                <span className="text-gold-400">s</span>
              </h1>
              <p className="text-[9px] font-bold text-brand-200/50 uppercase tracking-[0.25em]">Panel de Gestión</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = module === item.module;
            return (
              <button
                key={item.module}
                onClick={() => handleModuleChange(item.module)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative',
                  isActive
                    ? 'bg-brand-600/12 text-brand-400 shadow-sm shadow-brand-900/20'
                    : 'text-brand-200/40 hover:text-brand-200/80 hover:bg-white/[0.04]',
                ].join(' ')}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-gold-400 shadow-sm shadow-gold-400/30" />
                )}
                <div
                  className={[
                    'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-md shadow-brand-900/40 ring-1 ring-white/10'
                      : 'bg-white/[0.04] text-brand-200/30 group-hover:bg-white/[0.06] group-hover:text-brand-200/60',
                  ].join(' ')}
                >
                  <i className={`fas fa-${item.icon} text-sm`} />
                </div>
                <span className={isActive ? 'text-white' : ''}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-brand-900/20">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.04] mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-600/30 to-brand-700/30 flex items-center justify-center ring-1 ring-brand-500/20">
              <i className="fas fa-user text-brand-400 text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{userName}</p>
              <p className="text-[9px] font-bold text-brand-200/40 uppercase tracking-wider">{ROLE_LABELS[userRole]}</p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-brand-200/40 hover:text-red-400 hover:bg-red-500/5 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-white/[0.03] flex items-center justify-center group-hover:bg-red-500/10 transition-colors ring-1 ring-white/[0.04]">
                <i className="fas fa-right-from-bracket text-sm"></i>
              </div>
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full md:ml-0 min-w-0">
        <main ref={mainRef} className="flex-1 overflow-y-auto max-h-full min-h-0 pt-16">
          {children}
        </main>
      </div>

      {/* Floating Header */}
      <div className="fixed top-0 left-0 right-0 z-topbar md:left-[280px] pointer-events-none">
        <div className="flex items-center justify-between px-6 md:px-10 h-16 pointer-events-auto bg-white/[0.005] backdrop-blur-2xl border-b border-white/[0.03] shadow-2xl shadow-black/10">
          {/* Left: hamburger + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-all"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-sm`}></i>
            </button>
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight drop-shadow-sm">
              {MODULE_TITLES[module]}
            </h2>
          </div>

          {/* Right: sede selector (ADMIN/OPERATOR) + bell */}
          <div className="flex items-center gap-4">
            {onLocationChange && (userRole === UserRole.ADMIN || userRole === UserRole.OPERATOR) && (
              <select
                value={locationId || 'nemocon'}
                onChange={(e) => onLocationChange(e.target.value as LocationId)}
                title="Sede"
                className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white/80 uppercase tracking-wider focus:outline-none focus:border-brand-500/50 transition-colors"
              >
                {(Object.keys(LOCATION_LABELS) as LocationId[]).map((l) => (
                  <option key={l} value={l} className="bg-brand-950 text-white">
                    {LOCATION_LABELS[l]}
                  </option>
                ))}
              </select>
            )}
            {/* [2026-07-21] Frontend audit P0: el badge "3" era HARDCODED — el
                bell siempre mostraba 3 independientemente de la sesión/rol.
                Comprobé que el conteo no se leerá de nada real hasta que
                exista un endpoint /api/notifications (campanas, pedidos
                nuevos, reseñas pendientes). Se deja el botón sin badge y se
                documenta el TODO acá para no reintroducir el literal. */}
            <button
              className="relative w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-all"
              aria-label="Notificaciones"
            >
              <i className="fas fa-bell text-sm" aria-hidden="true"></i>
              {/* TODO 2026-07-21: notifications count wired to backend.
                  Render badge only when notifications.length > 0:
                  {notifications?.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-brand-600 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-lg shadow-brand-900/40">
                      {notifications.length}
                    </span>
                  )} */}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
