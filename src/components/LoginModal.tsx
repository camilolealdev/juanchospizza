import React, { useState, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/useBodyScrollLock';

interface LoginModalProps {
  onLogin: (username: string, pin?: string, password?: string) => Promise<boolean>;
  onClose: () => void;
}

// Antes este modal solo dejaba elegir uno de 4 ROLES fijos, que App.tsx
// traducía a un usuario hardcodeado (admin/cocina/repartidor/marketing) --
// las 4 cuentas semilla de la migración #001. Cualquier empleado creado
// individualmente después vía el CRM (EmpleadosView.tsx "Nuevo Empleado",
// con su propio username/PIN) no tenía forma de loguearse acá: la pantalla
// no sabía pedir un usuario específico, solo un rol genérico.
//
// Ahora el campo es el usuario real (texto libre); estos presets son solo
// un atajo de UI para las 4 cuentas compartidas de siempre, no una lista
// cerrada -- cualquier username real funciona igual escribiéndolo.
const ROLE_PRESETS: { username: string; label: string }[] = [
  { username: 'admin', label: 'Administrador' },
  { username: 'cocina', label: 'Cocina' },
  { username: 'repartidor', label: 'Repartidor' },
  { username: 'marketing', label: 'Marketing' },
];

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Visible en cuanto hay un usuario -- opcional salvo que la cuenta lo
  // exija (server/auth.js decide eso por empleado, no esta UI por rol).
  const showPasswordField = username.trim().length > 0;

  // ── WCAG 2.4.3: Focus Trap ─────────────────────────────────────
  // Escape cierra el modal. El focus permanece dentro del modal mientras
  // esté abierto (Tab cíclico). Al abrir, auto-focus al campo de usuario.
  // lockBodyScroll es ref-counted para coexistir con MenuDigital cuando
  // ambos modales están abiertos simultáneamente.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const modal = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (!modal) return;
      const focusables = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);

    // Auto-focus al campo de usuario al abrir
    const id = window.setTimeout(() => {
      const usernameInput = document.getElementById('login-username') as HTMLInputElement | null;
      usernameInput?.focus();
    }, 50);

    lockBodyScroll();

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.clearTimeout(id);
      unlockBodyScroll();
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // PIN ya no es obligatorio incondicionalmente -- una cuenta con
    // contraseña configurada (server/auth.js) puede loguearse solo con
    // password, sin PIN. Basta con usuario + al menos una de las dos.
    const trimmedUsername = username.trim();
    if (!trimmedUsername || (!pin && !password)) {
      setError('Ingresa tu usuario y el PIN o la contraseña');
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await onLogin(trimmedUsername, pin || undefined, password || undefined);
      if (!success) setError('Credenciales incorrectas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // WCAG 4.1.2: role="dialog" + aria-modal="true" + aria-labelledby
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="w-full max-w-md bg-stone-950 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-zoom-in relative">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-900/30">
            <i className="fas fa-pizza-slice text-2xl text-white" aria-hidden="true"></i>
          </div>
          <h2 id="login-modal-title" className="text-2xl font-black text-white">
            GastroPro
          </h2>
          <p className="text-stone-500 text-sm mt-1">CRM Gastronómico</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="login-username"
              className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block"
            >
              Usuario
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="tu.usuario"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold focus:border-orange-600/50 outline-none transition-colors"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {ROLE_PRESETS.map((r) => (
                <button
                  key={r.username}
                  type="button"
                  onClick={() => {
                    setUsername(r.username);
                    setError('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    username === r.username
                      ? 'bg-orange-600 text-white'
                      : 'bg-stone-900 text-stone-500 border border-white/10 hover:text-white hover:border-orange-600/40'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {showPasswordField && (
            <div>
              <label
                htmlFor="login-password"
                className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block"
              >
                Contraseña (opcional)
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Solo si tu cuenta la tiene configurada"
                autoComplete="current-password"
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold focus:border-orange-600/50 outline-none transition-colors"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="login-pin"
              className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block"
            >
              PIN
            </label>
            <input
              id="login-pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              maxLength={4}
              placeholder="••••"
              aria-describedby="login-pin-hint"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-center text-2xl tracking-[0.5em] font-bold focus:border-orange-600/50 outline-none transition-colors"
            />
            <span id="login-pin-hint" className="sr-only">
              PIN de 4 dígitos
            </span>
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

        {/* Frontend audit P0: bloque "¿Olvidaste el PIN?" eliminado.
            Si un empleado pierde su PIN, debe hablar con ADMIN para reset
            (server/routes/employees.js tiene setEmployeePassword). No exponer
            credenciales en el bundle público. */}

        <button
          onClick={onClose}
          aria-label="Cerrar login"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:text-white hover:bg-stone-800 transition-colors"
        >
          <i className="fas fa-times text-xs" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
};

export default LoginModal;
