import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import type { LocationId, CashRegisterEntry, Tip } from '../../types';

interface Props {
  locationId: LocationId;
}

const CajaView: React.FC<Props> = ({ locationId }) => {
  const [entries, setEntries] = useState<CashRegisterEntry[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [tipsSummary, setTipsSummary] = useState<{ total: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ initialAmount: 0, notes: '' });
  const [closeData, setCloseData] = useState({ finalAmount: 0, notes: '' });
  const [activeTab, setActiveTab] = useState<'caja' | 'propinas'>('caja');

  const openEntry = entries.find((e) => e.status === 'open');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, tipsData, summaryData] = await Promise.all([
        api.getCashRegisterEntries({ locationId }),
        api.getTips({ locationId }),
        api.getTipsSummary({ locationId }),
      ]);
      setEntries(entriesData);
      setTips(tipsData);
      setTipsSummary(summaryData);
    } catch (e) {
      console.error('Error loading cash register data:', e);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // openedBy ya no se manda: el backend lo resuelve del token
      // (req.auth.sub), igual que shifts.js.
      await api.openCashRegister({
        locationId,
        openedBy: '',
        initialAmount: formData.initialAmount,
        notes: formData.notes,
      });
      setShowOpenForm(false);
      setFormData({ initialAmount: 0, notes: '' });
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al abrir caja');
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCloseForm) return;
    try {
      // closedBy ya no se manda: el backend lo resuelve del token
      // (req.auth.sub), igual que shifts.js.
      await api.closeCashRegister(showCloseForm, {
        finalAmount: closeData.finalAmount,
        closedBy: '',
        notes: closeData.notes,
      });
      setShowCloseForm(null);
      setCloseData({ finalAmount: 0, notes: '' });
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cerrar caja');
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="text-stone-500 text-sm font-bold uppercase tracking-widest animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Caja y Propinas</h2>
          <p className="text-stone-500 text-sm mt-1">Sede {locationId === 'nemocon' ? 'Nemocón' : 'Zipaquirá'}</p>
        </div>
        {!openEntry && (
          <button onClick={() => setShowOpenForm(true)} className="crm-btn-primary">
            <i className="fas fa-cash-register text-xs mr-2"></i>Abrir Caja
          </button>
        )}
      </div>

      {/* Status Card */}
      {openEntry && (
        <div className="crm-card p-6 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-lg font-black text-emerald-400">Caja Abierta</h3>
              </div>
              <p className="text-stone-400 text-sm">
                Abierta por <span className="font-bold text-white">{openEntry.openedBy}</span> · $
                {openEntry.initialAmount.toLocaleString()} iniciales
              </p>
              <p className="text-stone-500 text-xs mt-1">{new Date(openEntry.openedAt).toLocaleString('es-CO')}</p>
            </div>
            <button
              onClick={() => setShowCloseForm(openEntry.id)}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-widest transition-all"
            >
              Cerrar Caja
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-3">
        {(['caja', 'propinas'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab ? 'bg-orange-600 text-white' : 'text-stone-500 hover:text-white'
            }`}
          >
            <i className={`fas ${tab === 'caja' ? 'fa-cash-register' : 'fa-coins'} mr-2`}></i>
            {tab === 'caja' ? 'Historial de Caja' : `Propinas ($${(tipsSummary?.total || 0).toLocaleString()})`}
          </button>
        ))}
      </div>

      {/* Caja History */}
      {activeTab === 'caja' && (
        <div className="space-y-3">
          {entries.length === 0 && (
            <div className="text-center py-16 text-stone-500">
              <i className="fas fa-cash-register text-4xl mb-4 opacity-30"></i>
              <p className="font-bold text-sm">No hay movimientos de caja registrados</p>
              <p className="text-xs mt-1">Abre una caja para comenzar</p>
            </div>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="crm-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`w-2 h-2 rounded-full ${entry.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-500'}`}
                    ></span>
                    <h4 className="font-bold text-white text-sm">
                      {entry.status === 'open'
                        ? 'Caja Abierta'
                        : `Caja Cerrada - ${new Date(entry.closedAt || '').toLocaleDateString('es-CO')}`}
                    </h4>
                  </div>
                  <p className="text-stone-400 text-xs">
                    <span className="text-stone-500">Abrió:</span> {entry.openedBy} ·
                    <span className="text-stone-500"> Ini:</span> ${entry.initialAmount.toLocaleString()}
                    {entry.status === 'closed' && (
                      <>
                        · <span className="text-stone-500">Fin:</span> ${(entry.finalAmount || 0).toLocaleString()}·{' '}
                        <span className="text-stone-500">Dif:</span>{' '}
                        <span
                          className={entry.difference && entry.difference >= 0 ? 'text-emerald-400' : 'text-red-400'}
                        >
                          ${(entry.difference || 0).toLocaleString()}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {entry.status === 'closed' && entry.notes && (
                  <span className="text-stone-500 text-[10px] italic max-w-[200px] text-right">{entry.notes}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      {activeTab === 'propinas' && (
        <div className="space-y-3">
          {tips.length === 0 && (
            <div className="text-center py-16 text-stone-500">
              <i className="fas fa-coins text-4xl mb-4 opacity-30"></i>
              <p className="font-bold text-sm">No hay propinas registradas</p>
            </div>
          )}
          {tips.map((tip) => (
            <div key={tip.id} className="crm-card p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">${tip.amount.toLocaleString()}</p>
                <p className="text-stone-500 text-xs">
                  {tip.waiterName && <>Mesero: {tip.waiterName} · </>}
                  {new Date(tip.createdAt).toLocaleString('es-CO')}
                </p>
              </div>
              <span className="text-[10px] text-stone-500 uppercase font-bold">{tip.method}</span>
            </div>
          ))}
        </div>
      )}

      {/* Open Register Modal */}
      {showOpenForm && (
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-stone-950 border border-white/10 rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-6">Abrir Caja</h3>
            <form onSubmit={handleOpen} className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block">
                  Monto Inicial ($)
                </label>
                <input
                  type="number"
                  value={formData.initialAmount}
                  onChange={(e) => setFormData((f) => ({ ...f, initialAmount: parseInt(e.target.value) || 0 }))}
                  className="crm-input w-full"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  className="crm-input w-full resize-none h-20"
                  placeholder="Opcional"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="crm-btn-primary flex-1">
                  Abrir Caja
                </button>
                <button
                  type="button"
                  onClick={() => setShowOpenForm(false)}
                  className="px-6 py-3 rounded-xl bg-stone-900 text-stone-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Register Modal */}
      {showCloseForm && (
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-stone-950 border border-white/10 rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-6">Cerrar Caja</h3>
            <form onSubmit={handleClose} className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block">
                  Monto Final ($)
                </label>
                <input
                  type="number"
                  value={closeData.finalAmount}
                  onChange={(e) => setCloseData((f) => ({ ...f, finalAmount: parseInt(e.target.value) || 0 }))}
                  className="crm-input w-full"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block">
                  Notas
                </label>
                <textarea
                  value={closeData.notes}
                  onChange={(e) => setCloseData((f) => ({ ...f, notes: e.target.value }))}
                  className="crm-input w-full resize-none h-20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="crm-btn-primary flex-1">
                  Cerrar Caja
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloseForm(null)}
                  className="px-6 py-3 rounded-xl bg-stone-900 text-stone-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CajaView;
