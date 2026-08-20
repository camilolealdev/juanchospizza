import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useSedeStore } from '../store/sedeStore';

const navLinks = [
  { label: 'Inicio', to: '/' },
  { label: 'Crea tu Pizza', to: '/pizza' },
  { label: 'Menú', to: '/menu' },
  { label: 'Domicilios', to: '/domicilios' },
];

interface HeaderProps {
  onCartClick?: () => void;
}

export default function Header({ onCartClick }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSedeBanner, setShowSedeBanner] = useState(false);
  const count = useCartStore((s) => s.count());
  const { sede, setSede } = useSedeStore();
  const location = useLocation();

  useEffect(() => {
    const dismissed = localStorage.getItem('sede-banner-dismissed');
    if (!dismissed) {
      const timer = setTimeout(() => setShowSedeBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissBanner = () => {
    setShowSedeBanner(false);
    localStorage.setItem('sede-banner-dismissed', '1');
  };

  const selectSede = (s: 'nemocon' | 'zipaquira') => {
    setSede(s);
    dismissBanner();
  };

  return (
    <header className="sticky top-0 z-50 bg-carbon/95 backdrop-blur-md border-b border-crema/10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left – Brand */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 group" aria-label="Ir al inicio">
          <img
            src="/images/logo.png"
            alt=""
            className="h-10 w-10 rounded-full object-cover ring-2 ring-queso/30 group-hover:ring-queso/60 transition-all"
            loading="eager"
          />
          <span className="font-heading text-xl text-queso tracking-wider uppercase leading-none">
            Juancho&apos;s Pizza
          </span>
        </Link>

        {/* Center – Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-colors ${
                location.pathname === link.to
                  ? 'text-queso bg-crema/10'
                  : 'text-crema/70 hover:text-queso hover:bg-crema/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right – Sede selector + Cart */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Sede selector */}
          <div className="relative">
            <label htmlFor="sede-select" className="sr-only">
              Seleccionar sede
            </label>
            <select
              id="sede-select"
              value={sede}
              onChange={(e) => setSede(e.target.value as 'nemocon' | 'zipaquira')}
              className="appearance-none bg-carbon-700/60 border border-crema/10 text-crema/80 text-xs font-body font-medium rounded-lg px-3 py-2 pr-7 cursor-pointer hover:border-queso/30 focus:outline-none focus:ring-1 focus:ring-queso/40 transition-colors"
            >
              <option value="nemocon">Nemocón</option>
              <option value="zipaquira">Zipaquirá</option>
            </select>
            <svg
              className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-crema/50 pointer-events-none"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M2 4.5L6 8.5L10 4.5" />
            </svg>
          </div>

          {/* Cart button */}
          <button
            onClick={() => onCartClick?.()}
            className="relative w-10 h-10 rounded-lg bg-tomato flex items-center justify-center text-crema hover:bg-tomato-600 transition-colors"
            aria-label={`Carrito de compras — ${count} artículo${count !== 1 ? 's' : ''}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a1 1 0 0 0 1 .81h9.72a1 1 0 0 0 1-.76L23 6H6" />
            </svg>
            {count > 0 && (
              <span
                aria-live="polite"
                className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-queso text-carbon text-[10px] font-heading font-bold flex items-center justify-center leading-none"
              >
                {count}
              </span>
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden w-10 h-10 rounded-lg bg-carbon-700/60 border border-crema/10 flex items-center justify-center text-crema/70 hover:text-queso transition-colors"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="3" y1="7" x2="21" y2="7" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="md:hidden border-t border-crema/10 bg-carbon/98 backdrop-blur-xl animate-slide-up"
          aria-label="Navegación móvil"
        >
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block w-full text-left px-4 py-3 rounded-lg text-sm font-body font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-queso bg-crema/10'
                    : 'text-crema/70 hover:text-queso hover:bg-crema/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Sede selector banner */}
      {showSedeBanner && (
        <div className="relative bg-gradient-to-r from-queso/90 via-queso to-tomato/80 text-carbon animate-slide-up">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex items-center justify-center gap-3 flex-wrap">
            <span className="text-xs sm:text-sm font-body font-semibold tracking-wide">
              🍕 ¿Cuál es tu sede más cerca?
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectSede('nemocon')}
                className={`px-3 py-1 rounded-full text-xs font-heading font-bold tracking-wider uppercase transition-all ${
                  sede === 'nemocon'
                    ? 'bg-carbon text-queso shadow-lg scale-105'
                    : 'bg-carbon/20 text-carbon hover:bg-carbon/30'
                }`}
              >
                Nemocón
              </button>
              <button
                onClick={() => selectSede('zipaquira')}
                className={`px-3 py-1 rounded-full text-xs font-heading font-bold tracking-wider uppercase transition-all ${
                  sede === 'zipaquira'
                    ? 'bg-carbon text-queso shadow-lg scale-105'
                    : 'bg-carbon/20 text-carbon hover:bg-carbon/30'
                }`}
              >
                Zipaquirá
              </button>
            </div>
            <button
              onClick={dismissBanner}
              className="ml-2 w-8 h-8 rounded-full bg-carbon/20 hover:bg-carbon/40 flex items-center justify-center text-carbon/60 hover:text-carbon transition-colors"
              aria-label="Cerrar"
            >
              <svg
                viewBox="0 0 12 12"
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
