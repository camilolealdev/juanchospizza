import React, { useEffect, useState } from 'react';
import { api, Review } from '../services/api';

const ApprovedReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    api.getApprovedReviews().then(setReviews).catch(() => setReviews([]));
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section className="px-4 md:px-20 py-20 space-y-10">
      <h2 className="text-3xl md:text-5xl font-brand text-center text-white">Lo que dicen nuestros clientes</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {reviews.slice(0, 6).map(r => (
          <div key={r.id} className="bg-stone-900/40 p-6 rounded-3xl border border-white/5">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 5 }, (_, i) => (
                <i key={i} className={`fas fa-star text-sm ${i < r.rating ? 'text-orange-500' : 'text-stone-700'}`}></i>
              ))}
            </div>
            {r.comment && <p className="text-stone-300 text-sm italic mb-3">&ldquo;{r.comment}&rdquo;</p>}
            <p className="text-stone-600 text-xs uppercase tracking-widest font-bold">{r.clientName || 'Cliente Guido Pizza'}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ApprovedReviews;
