import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { subscribeToPushNotifications } from '../services/push';
import { lockBodyScroll, unlockBodyScroll } from '../utils/useBodyScrollLock';

interface TrackOrderModalProps {
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Recibido',
  CONFIRMED: 'Confirmado',
  PREPARING: 'En preparación',
  READY: 'Listo',
  ASSIGNED: 'Asignado a repartidor',
  DELIVERING: 'En camino',
  COMPLETED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const TrackOrderModal: React.FC<TrackOrderModalProps> = ({ onClose }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<{ id: string; orderNumber: string; status: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // ── WCAG 2.4.3 / 4.1.2: dialog semantics, Escape, focus-trap, body lock ──
  // Bubble-phase: TrackOrderModal no se apila con LoginModal/MenuDigital
  // — el modal de login usa capture-phase + stopPropagation, por lo que
  // siempre gana si llegara a coincidir. Aquí basta con tap del teclado
  // y un focus-trap que solo captura este [role=dialog].
  // lockBodyScroll() es refcounted (src/utils/useBodyScrollLock.ts) para
  // coexistir con MenuDigital si por algún motivo se quedan ambos abiertos.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      // Selector estable por id del panel (no por aria-labelledby, que es
      // frágil si alguien renombra el título del modal en el futuro).
      const modal = document.getElementById('track-order-modal');
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
    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus al primer input 50ms después de montar — suficiente para
    // que el browser termine el focus-restore del click que abrió el modal.
    const id = window.setTimeout(() => {
      document.getElementById('track-order-input')?.focus();
    }, 50);

    lockBodyScroll();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(id);
      unlockBodyScroll();
    };
  }, [onClose]);

  const handleTrack = async () => {
    if (!orderNumber.trim() || !phone.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const result = await api.trackOrder(orderNumber.trim(), phone.trim());
      setOrder(result);
      // Best-effort: ofrecer notificaciones push del estado del pedido al
      // teléfono recién verificado. No bloquea ni rompe el flujo — si el
      // navegador no soporta push, no hay clave VAPID en el bundle, o el
      // usuario rechaza el permiso, simplemente no hace nada.
      void subscribeToPushNotifications(phone.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No encontramos ese pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!order) return;
    setReviewError('');
    try {
      await api.createReview({ orderId: order.id, clientPhone: phone, rating, comment });
      setReviewSubmitted(true);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : 'Error enviando la reseña');
    }
  };

  return (
    // El backdrop cierra onClick — útil para UX "click afuera para
    // cerrar" con mouse. NO tiene role button (un div clickeable fuera
    // del panel robaría foco del focus-trap); la alternativa keyboard es
    // el botón aria-label="Cerrar modal de rastreo" o Escape.
    <div
      className="fixed inset-0 z-[200] bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="track-order-modal"
        className="w-full max-w-md bg-stone-900 border border-white/10 rounded-[2rem] p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
        // WCAG 4.1.2 role=dialog + aria-modal=true + aria-labelledby
        // apuntando al <h2> con título visible.
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-order-modal-title"
      >
        <div className="flex justify-between items-center">
          <h2 id="track-order-modal-title" className="text-xl font-brand text-white">
            Rastrear mi pedido
          </h2>
          <button
            onClick={onClose}
            // WCAG 4.1.2: botón sólo con icono necesita nombre accesible.
            aria-label="Cerrar modal de rastreo"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <i className="fas fa-times text-lg" aria-hidden="true"></i>
          </button>
        </div>

        {!order && (
          <div className="space-y-4">
            <div>
              <label htmlFor="track-order-input" className="sr-only">
                Número de pedido
              </label>
              <input
                id="track-order-input"
                type="text"
                name="orderNumber"
                placeholder="Número de pedido (ej: GUIDO-1234)"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-white placeholder:text-stone-600"
              />
            </div>
            <div>
              <label htmlFor="track-order-phone" className="sr-only">
                Teléfono usado en el pedido
              </label>
              <input
                id="track-order-phone"
                type="tel"
                name="phone"
                placeholder="Teléfono usado en el pedido"
                aria-describedby="track-order-phone-hint"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-white placeholder:text-stone-600"
              />
              <span id="track-order-phone-hint" className="sr-only">
                Ingresa el mismo número de teléfono con el que realizaste el pedido
              </span>
            </div>
            {error && (
              // aria-live polite: el SR anuncia el error cuando termine
              // cualquier utterance en curso, sin interrumpirlo (a
              // diferencia de role=alert que es assertive implícito).
              <p className="text-red-400 text-sm" aria-live="polite">
                {error}
              </p>
            )}
            <button
              onClick={handleTrack}
              disabled={loading || !orderNumber.trim() || !phone.trim()}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-stone-700 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all"
            >
              {loading ? (
                <>
                  {/* WCAG: cuando sólo hay spinner, agregar sr-only para
                      dar un nombre accesible al botón. */}
                  <i className="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
                  <span className="sr-only">Buscando pedido</span>
                </>
              ) : (
                'Buscar pedido'
              )}
            </button>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            {/* WCAG 4.1.2 status role + aria-live="polite" para que el
                screen reader anuncie el estado del pedido al aparecer. */}
            <div
              className="bg-stone-950 rounded-xl p-5 text-center space-y-2"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">{order.orderNumber}</p>
              <p className="text-orange-500 text-xl font-black">{STATUS_LABELS[order.status] || order.status}</p>
            </div>

            {order.status === 'COMPLETED' && !reviewSubmitted && (
              <div className="space-y-4 border-t border-white/10 pt-6">
                <p className="text-white font-bold text-center">¿Cómo estuvo tu pedido?</p>
                {/* WCAG 4.1.2 + 1.3.1: 5 estrellas son un radiogroup con
                    role=radio por estrella (no buttons sueltos). ARIA APG
                    sugiere que un radiogroup responda a ArrowLeft/Right/Up/
                    Down para mover la selección; Tab+Enter también funciona,
                    pero las flechas son la convención esperada por SR users. */}
                <div
                  className="flex justify-center gap-2"
                  role="radiogroup"
                  aria-label="Calificación del pedido del 1 al 5"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                      e.preventDefault();
                      setRating((r) => Math.min(r + 1, 5));
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      setRating((r) => Math.max(r - 1, 1));
                    }
                  }}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      role="radio"
                      aria-checked={n === rating}
                      aria-label={`${n} de 5 estrellas`}
                      onClick={() => setRating(n)}
                      className={`text-3xl transition-colors focus:outline-none ${
                        n <= rating ? 'text-orange-500' : 'text-stone-700'
                      }`}
                    >
                      <i className="fas fa-star" aria-hidden="true"></i>
                    </button>
                  ))}
                </div>
                <div>
                  <label htmlFor="track-order-comment" className="sr-only">
                    Comentario sobre el pedido
                  </label>
                  <textarea
                    id="track-order-comment"
                    name="comment"
                    placeholder="Cuéntanos tu experiencia (opcional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-white placeholder:text-stone-600 resize-none"
                  />
                </div>
                {reviewError && (
                  // aria-live polite: ver nota en el otro useError arriba.
                  <p className="text-red-400 text-sm" aria-live="polite">
                    {reviewError}
                  </p>
                )}
                <button
                  onClick={handleSubmitReview}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all"
                >
                  Enviar reseña
                </button>
              </div>
            )}

            {order.status === 'COMPLETED' && reviewSubmitted && (
              <div className="border-t border-white/10 pt-6 text-center text-green-400">
                <i className="fas fa-check-circle text-2xl mb-2" aria-hidden="true"></i>
                <p className="font-bold">¡Gracias por tu reseña!</p>
              </div>
            )}

            {order.status !== 'COMPLETED' && (
              <p className="text-stone-500 text-sm text-center border-t border-white/10 pt-6">
                Podrás dejar una reseña cuando tu pedido esté marcado como entregado.
              </p>
            )}

            <button
              onClick={() => setOrder(null)}
              className="w-full text-stone-500 hover:text-white text-xs uppercase tracking-widest font-bold py-2"
            >
              Buscar otro pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrderModal;
