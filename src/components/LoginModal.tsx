import React, { useState, useEffect, useRef } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/useBodyScrollLock';

interface LoginModalProps {
  onLogin: (identifier: string, password: string) => Promise<boolean>;
  onLoginGoogle: (credential: string) => Promise<boolean>;
  onClose: () => void;
}

// Google Identity Services -- script liviano (no amerita el paquete
// @react-oauth/google por un solo botón), se carga una sola vez.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('google-identity-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  });
}

<<<<<<< HEAD
=======
<<<<<<< HEAD
// Login del CRM: correo + contraseña, o Google. Nada de PINes.
=======
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
// Login del CRM: identificador + contraseña, sin PIN y sin presets de rol.
// El identificador es el correo (admin) o el username (cocina y cuentas de
// terminal compartida) -- el backend resuelve el mismo campo contra ambos.
// La contraseña es el único credencial -- ver server/auth.js authenticate().
<<<<<<< HEAD
=======
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onLoginGoogle, onClose }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

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

<<<<<<< HEAD
    // Auto-focus al campo identificador al abrir
=======
<<<<<<< HEAD
    // Auto-focus al campo de usuario al abrir
=======
    // Auto-focus al campo identificador al abrir
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
    const id = window.setTimeout(() => {
      const identifierInput = document.getElementById('login-identifier') as HTMLInputElement | null;
      identifierInput?.focus();
    }, 50);

    lockBodyScroll();

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.clearTimeout(id);
      unlockBodyScroll();
    };
  }, [onClose]);

<<<<<<< HEAD
  // Botón oficial de Google -- se renderiza una sola vez. El id_token que
  // devuelve ya prueba la identidad, así que el backend no pide credencial
  // extra (ver server/auth.js loginWithGoogle).
=======
<<<<<<< HEAD
  // Botón oficial de Google -- se renderiza una sola vez.
=======
  // Botón oficial de Google -- se renderiza una sola vez. El id_token que
  // devuelve ya prueba la identidad, así que el backend no pide credencial
  // extra (ver server/auth.js loginWithGoogle).
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !googleButtonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp) => {
            setError('');
            setIsSubmitting(true);
            try {
              const success = await onLoginGoogle(resp.credential);
              if (!success) setError('Credenciales incorrectas');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor');
            } finally {
              setIsSubmitting(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 328,
        });
      })
      .catch(() => setError('No se pudo cargar el inicio de sesión con Google'));
    return () => {
      cancelled = true;
    };
  }, [onLoginGoogle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
<<<<<<< HEAD
    const trimmedIdentifier = identifier.trim();
=======
<<<<<<< HEAD
    const trimmedIdentifier = identifier.trim().toLowerCase();
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
    if (!trimmedIdentifier || !password) {
      setError('Ingresa tu correo (o usuario) y contraseña');
      return;
    }
<<<<<<< HEAD
=======
    setError('');
=======
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setError('Ingresa tu correo (o usuario) y contraseña');
      return;
    }
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
    setIsSubmitting(true);
    try {
      const success = await onLogin(trimmedIdentifier, password);
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

        {GOOGLE_CLIENT_ID && (
          <div className="mb-5">
            <div ref={googleButtonRef} className="flex justify-center" />
            <div className="flex items-center gap-3 mt-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">o con correo</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="login-identifier"
              className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block"
            >
              Correo o usuario
            </label>
            <input
              id="login-identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError('');
              }}
<<<<<<< HEAD
              placeholder="tu@correo.com o usuario"
=======
<<<<<<< HEAD
              placeholder="tu@correo.com o tu usuario"
=======
              placeholder="tu@correo.com o usuario"
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold focus:border-orange-600/50 outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block"
            >
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
<<<<<<< HEAD
              placeholder="••••••••"
=======
<<<<<<< HEAD
              placeholder="Tu contraseña"
=======
              placeholder="••••••••"
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)
              autoComplete="current-password"
              className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-white text-sm font-bold focus:border-orange-600/50 outline-none transition-colors"
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

          {/* Requisito Meta (WhatsApp Cloud API): la app debe exponer la
              política de privacidad y los términos desde el diálogo de
              inicio de sesión. Se abren en pestaña nueva para no interrumpir
              el login (el focus trap sigue activo en este modal). */}
          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <p className="text-[10px] leading-relaxed text-stone-500">
              Al ingresar aceptas nuestros{' '}
              <a
                href="/terminos-y-condiciones"
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-400 underline underline-offset-2 hover:text-orange-500 transition-colors"
              >
                Términos y Condiciones
              </a>{' '}
              y nuestra{' '}
              <a
                href="/politica-de-privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-400 underline underline-offset-2 hover:text-orange-500 transition-colors"
              >
                Política de Privacidad
              </a>
              .
            </p>
          </div>
        </form>

        {/* Frontend audit P0: bloque "¿Olvidaste el PIN?" eliminado.
<<<<<<< HEAD
            Si un empleado pierde su contraseña, debe hablar con ADMIN para
            resetearla (server/routes/employees.js tiene setEmployeePassword).
            No exponer credenciales en el bundle público. */}
=======
<<<<<<< HEAD
            Si un empleado pierde su PIN, debe hablar con ADMIN para reset
            (server/routes/employees.js tiene setEmployeePassword). No exponer
            credenciales en el bundle público. */}
=======
            Si un empleado pierde su contraseña, debe hablar con ADMIN para
            resetearla (server/routes/employees.js tiene setEmployeePassword).
            No exponer credenciales en el bundle público. */}
>>>>>>> 9446794 (Add dine-in/delivery orderType and mesa; persist to CRM; fix auth seed force-reset; update WhatsApp builder and CartDrawer)
>>>>>>> b12bdb5 (Force admin password reset on boot with DY6tT9TSRfWk)

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
