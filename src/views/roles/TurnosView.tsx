import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LocationId, Shift } from '../../types';

const LOCATION_LABELS: Record<LocationId, string> = {
  nemocon: 'Nemocón',
  zipaquira: 'Zipaquirá',
};

const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

interface TurnosViewProps {
  locationId: LocationId;
}

const TurnosView: React.FC<TurnosViewProps> = ({ locationId }) => {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const [openingCash, setOpeningCash] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [closeNotas, setCloseNotas] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [current, hist] = await Promise.all([api.getCurrentShift(locationId), api.getShifts({ locationId })]);
      setCurrentShift(current);
      setHistory(hist);
    } catch (e) {
      showToast(`Error cargando turnos: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // loadAll no está memoizada (se recrea cada render) -- incluirla en deps
  // volvería a dispararla en cada render en vez de solo al montar o cuando
  // cambia la sede seleccionada.

  useEffect(() => {
    loadAll();
  }, [locationId]);

  const handleOpen = async () => {
    if (!openingCash) {
      showToast('Ingresá el monto de apertura');
      return;
    }
    setIsOpening(true);
    try {
      await api.openShift({ locationId, openingCash: Number(openingCash) });
      setOpeningCash('');
      showToast('Turno abierto');
      loadAll();
    } catch (e) {
      showToast(`Error abriendo turno: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setIsOpening(false);
    }
  };

  const handleClose = async () => {
    if (!currentShift || !closingCash) {
      showToast('Ingresá el monto de cierre');
      return;
    }
    setIsClosing(true);
    try {
      const closed = await api.closeShift(currentShift.id, {
        closingCash: Number(closingCash),
        notas: closeNotas || undefined,
      });
      setShowCloseModal(false);
      setClosingCash('');
      setCloseNotas('');
      const diff = closed.difference || 0;
      showToast(
        diff === 0
          ? 'Turno cerrado. Caja cuadrada exacta.'
          : diff > 0
            ? `Turno cerrado. Sobrante de ${formatter.format(diff)}`
            : `Turno cerrado. Faltante de ${formatter.format(Math.abs(diff))}`
      );
      loadAll();
    } catch (e) {
      showToast(`Error cerrando turno: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh] text-stone-500">
        <i className="fas fa-spinner fa-spin text-3xl mr-4"></i>
        <span className="font-bold uppercase tracking-widest text-sm">Cargando turnos...</span>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 space-y-12 pb-40 animate-fade-in">
      <div className="space-y-4">
        <h1 className="text-5xl md:text-6xl font-brand text-white">Turnos y Control de Caja</h1>
        <p className="text-stone-500 max-w-xl text-lg italic opacity-80">
          Sede {LOCATION_LABELS[locationId]} — apertura, cierre y cuadre de caja
        </p>
      </div>

      {currentShift ? (
        <div className="bg-green-950/20 p-10 rounded-[3rem] border border-green-500/20 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">Turno Abierto</p>
              <p className="text-3xl font-black text-white">{formatter.format(currentShift.openingCash)}</p>
              <p className="text-xs text-stone-500 mt-1 font-bold">
                Abierto por {currentShift.openedBy} · {formatDateTime(currentShift.openedAt)}
              </p>
            </div>
            <button
              onClick={() => setShowCloseModal(true)}
              className="bg-red-600 hover:bg-red-500 text-white font-black py-4 px-8 rounded-2xl uppercase tracking-widest text-xs transition-all shadow-lg shadow-red-900/30 active:scale-[0.98]"
            >
              Cerrar Turno
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-stone-900/40 p-10 rounded-[3rem] border border-stone-800/50 space-y-6">
          <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
            Sin turno abierto en {LOCATION_LABELS[locationId]}
          </p>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1 w-full">
              <label className="text-[10px] uppercase tracking-[0.3em] font-black text-stone-500 mb-2 block">
                Monto de Apertura
              </label>
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0"
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <button
              onClick={handleOpen}
              disabled={isOpening}
              className="bg-orange-600 hover:bg-orange-500 text-white font-black py-3 px-8 rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg shadow-orange-900/30 active:scale-[0.98] disabled:opacity-60"
            >
              {isOpening ? 'Abriendo...' : 'Abrir Turno'}
            </button>
          </div>
        </div>
      )}

      <section className="space-y-8">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand text-white">Historial de Turnos</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">
              {LOCATION_LABELS[locationId]}
            </p>
          </div>
          <span className="text-[10px] font-black text-stone-700 uppercase tracking-widest">
            {history.length} Registros
          </span>
        </div>

        <div className="bg-stone-900/30 rounded-[2.5rem] border border-stone-800/50 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800/80 text-[10px] uppercase tracking-[0.3em] text-stone-500 font-black">
                  <th className="text-left p-6 pl-8">Apertura</th>
                  <th className="text-left p-6">Cierre</th>
                  <th className="text-right p-6">Caja Inicial</th>
                  <th className="text-right p-6">Caja Final</th>
                  <th className="text-right p-6">Esperado</th>
                  <th className="text-right p-6 pr-8">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-stone-600 font-bold text-xs uppercase tracking-widest"
                    >
                      Sin turnos registrados
                    </td>
                  </tr>
                )}
                {history.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`border-b border-stone-800/40 transition-all hover:bg-stone-800/20 ${idx % 2 === 0 ? 'bg-stone-900/10' : ''}`}
                  >
                    <td className="p-6 pl-8 text-stone-300">
                      {formatDateTime(s.openedAt)}
                      <span className="block text-[10px] text-stone-600 uppercase">{s.openedBy}</span>
                    </td>
                    <td className="p-6 text-stone-300">
                      {s.closedAt ? (
                        <>
                          {formatDateTime(s.closedAt)}
                          <span className="block text-[10px] text-stone-600 uppercase">{s.closedBy}</span>
                        </>
                      ) : (
                        <span className="text-green-500 font-black text-[10px] uppercase">Abierto</span>
                      )}
                    </td>
                    <td className="p-6 text-right text-stone-300 font-mono">{formatter.format(s.openingCash)}</td>
                    <td className="p-6 text-right text-stone-300 font-mono">
                      {s.closingCash !== null ? formatter.format(s.closingCash) : '—'}
                    </td>
                    <td className="p-6 text-right text-stone-400 font-mono">
                      {s.expectedCash !== null ? formatter.format(s.expectedCash) : '—'}
                    </td>
                    <td
                      className={`p-6 pr-8 text-right font-black font-mono ${
                        s.difference === null
                          ? 'text-stone-500'
                          : s.difference === 0
                            ? 'text-green-400'
                            : s.difference > 0
                              ? 'text-blue-400'
                              : 'text-red-400'
                      }`}
                    >
                      {s.difference !== null ? formatter.format(s.difference) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showCloseModal && currentShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCloseModal(false)}></div>
          <div className="relative bg-stone-900 border border-stone-700 rounded-[2rem] p-10 w-full max-w-lg mx-4 shadow-2xl z-10">
            <h3 className="text-2xl font-black text-white mb-2">Cerrar Turno</h3>
            <p className="text-stone-500 text-sm mb-8">Caja inicial: {formatter.format(currentShift.openingCash)}</p>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] uppercase tracking-[0.3em] font-black text-stone-500 mb-2 block">
                  Monto de Cierre (efectivo contado)
                </label>
                <input
                  type="number"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.3em] font-black text-stone-500 mb-2 block">
                  Notas (opcional)
                </label>
                <textarea
                  value={closeNotas}
                  onChange={(e) => setCloseNotas(e.target.value)}
                  rows={3}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-3 rounded-xl bg-stone-800 text-stone-400 font-black text-xs uppercase tracking-widest hover:bg-stone-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={isClosing}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-60"
              >
                {isClosing ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-800 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in max-w-sm">
          {toast}
        </div>
      )}
    </div>
  );
};

export default TurnosView;
