import React, { useEffect, useState } from 'react';
import { api, Review } from '../../services/api';

type Tab = 'pending' | 'approved' | 'rejected';

const ReviewsView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('pending');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const load = async (status: Tab) => {
    setLoading(true);
    try {
      const result = await api.getReviews(status);
      setReviews(result);
    } catch (e) {
      showToast(`Error cargando reseñas: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // load is redefined every render (not memoized) -- including it would
  // refire this on every render instead of just when `tab` changes.

  useEffect(() => {
    load(tab);
  }, [tab]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.updateReviewStatus(id, status);
      showToast(status === 'approved' ? 'Reseña aprobada' : 'Reseña rechazada');
      load(tab);
    } catch (e) {
      showToast(`Error actualizando reseña: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm('¿Eliminar esta reseña permanentemente?')) return;
    try {
      await api.deleteReview(id);
      showToast('Reseña eliminada');
      load(tab);
    } catch (e) {
      showToast(`Error eliminando reseña: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  };

  return (
    <div className="p-8 md:p-12 space-y-10 pb-40 animate-fade-in">
      <div>
        <h1 className="text-5xl font-brand">Reseñas de Clientes</h1>
        <p className="text-stone-500 mt-4 max-w-xl">Modera las reseñas dejadas por clientes en pedidos entregados</p>
      </div>

      <div className="flex gap-2 p-1 bg-stone-900 rounded-2xl border border-stone-800 w-fit">
        {(['pending', 'approved', 'rejected'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === t ? 'bg-orange-600 text-white' : 'text-stone-500'}`}
          >
            {t === 'pending' ? 'Pendientes' : t === 'approved' ? 'Aprobadas' : 'Rechazadas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-stone-500">
          <i className="fas fa-spinner fa-spin text-2xl mr-3"></i> Cargando...
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-stone-600 font-bold text-xs uppercase tracking-widest py-20">
          No hay reseñas en esta categoría
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((r) => (
            <div key={r.id} className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <i
                      key={i}
                      className={`fas fa-star text-sm ${i < r.rating ? 'text-orange-500' : 'text-stone-700'}`}
                    ></i>
                  ))}
                </div>
                <span className="text-[10px] text-stone-600 uppercase tracking-widest font-bold">
                  {new Date(r.createdAt).toLocaleDateString('es-CO')}
                </span>
              </div>
              {r.comment && <p className="text-stone-300 text-sm italic">&ldquo;{r.comment}&rdquo;</p>}
              <p className="text-stone-500 text-xs">
                {r.clientName || 'Cliente'} {r.clientPhone ? `— ${r.clientPhone}` : ''}
              </p>
              {tab === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => updateStatus(r.id, 'approved')}
                    className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, 'rejected')}
                    className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Rechazar
                  </button>
                </div>
              )}
              {tab !== 'pending' && (
                <div className="flex pt-2">
                  <button
                    onClick={() => deleteReview(r.id)}
                    className="flex-1 bg-stone-800 hover:bg-red-600/20 hover:text-red-400 text-stone-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                  >
                    <i className="fas fa-trash mr-2"></i>Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-orange-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ReviewsView;
