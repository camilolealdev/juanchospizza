import React, { useState } from 'react';
import { api } from '../services/api';

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
  CANCELLED: 'Cancelado'
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

  const handleTrack = async () => {
    if (!orderNumber.trim() || !phone.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const result = await api.trackOrder(orderNumber.trim(), phone.trim());
      setOrder(result);
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
    <div className="fixed inset-0 z-[200] bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-stone-900 border border-white/10 rounded-[2rem] p-8 space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-brand text-white">Rastrear mi pedido</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><i className="fas fa-times text-lg"></i></button>
        </div>

        {!order && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Número de pedido (ej: GUIDO-1234)"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-white placeholder:text-stone-600"
            />
            <input
              type="tel"
              placeholder="Teléfono usado en el pedido"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-white placeholder:text-stone-600"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleTrack}
              disabled={loading || !orderNumber.trim() || !phone.trim()}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-stone-700 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all"
            >
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Buscar pedido'}
            </button>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            <div className="bg-stone-950 rounded-xl p-5 text-center space-y-2">
              <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">{order.orderNumber}</p>
              <p className="text-orange-500 text-xl font-black">{STATUS_LABELS[order.status] || order.status}</p>
            </div>

            {order.status === 'COMPLETED' && !reviewSubmitted && (
              <div className="space-y-4 border-t border-white/10 pt-6">
                <p className="text-white font-bold text-center">¿Cómo estuvo tu pedido?</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRating(n)} className={`text-3xl transition-colors ${n <= rating ? 'text-orange-500' : 'text-stone-700'}`}>
                      <i className="fas fa-star"></i>
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Cuéntanos tu experiencia (opcional)"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-white placeholder:text-stone-600 resize-none"
                />
                {reviewError && <p className="text-red-400 text-sm">{reviewError}</p>}
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
                <i className="fas fa-check-circle text-2xl mb-2"></i>
                <p className="font-bold">¡Gracias por tu reseña!</p>
              </div>
            )}

            {order.status !== 'COMPLETED' && (
              <p className="text-stone-500 text-sm text-center border-t border-white/10 pt-6">
                Podrás dejar una reseña cuando tu pedido esté marcado como entregado.
              </p>
            )}

            <button onClick={() => setOrder(null)} className="w-full text-stone-500 hover:text-white text-xs uppercase tracking-widest font-bold py-2">
              Buscar otro pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrderModal;
