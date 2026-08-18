import React, { useEffect, useState } from 'react';
import { Campaign } from '../../types';
import { api } from '../../services/api';
import { useLazyCharts } from '../../hooks/useLazyCharts';
import ChartSkeleton from '../../components/ChartSkeleton';

const emptyForm = {
  name: '',
  type: 'flash' as Campaign['type'],
  discount: 0,
  status: 'draft' as Campaign['status'],
  budget: 0,
  scheduleAt: '',
};

// Convierte ISO (de la DB) → valor de <input type="datetime-local"> en hora
// local (el input no acepta offset; datetime-local se interpreta como local).
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Formato legible para mostrar la fecha programada en la card.
const formatSchedule = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MarketingView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadCampaigns = () => {
    setLoading(true);
    api
      .getCampaigns()
      .then(setCampaigns)
      .catch((e) => showToast(`Error cargando campañas: ${e instanceof Error ? e.message : 'error desconocido'}`))
      .finally(() => setLoading(false));
  };

  // loadCampaigns is redefined every render (not memoized) -- including it
  // would refire this on every render instead of once on mount.

  useEffect(() => {
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const campaignStats = campaigns.map((c) => ({ name: c.name.substring(0, 15), conv: c.conversions }));
  // reach/conversions are DB columns that are set to 0 on creation and never updated by any
  // sending pipeline (no email/push/WhatsApp integration exists yet). Until that's wired up,
  // this is always true and the UI below must say so instead of showing a fake "0".
  const metricsNotTracked = campaigns.length > 0 && campaigns.every((c) => c.reach === 0 && c.conversions === 0);
  const METRICS_TOOLTIP = 'Métrica no disponible: el envío de campañas aún no está conectado a ningún canal.';
  // recharts (chunk de ~363 KB) solo se descarga si el gráfico se va a
  // renderizar: sin métricas el chart ni siquiera se pinta, así que aquí
  // nunca se carga (el envío de campañas aún no está conectado a canales).
  const { charts, error: chartsError, containerRef } = useLazyCharts(!loading && !metricsNotTracked);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };
  const openEdit = (c: Campaign) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      type: c.type,
      discount: c.discount,
      status: c.status,
      budget: c.budget,
      scheduleAt: toLocalInput(c.scheduleAt),
    });
    setShowModal(true);
  };

  const handleDelete = async (c: Campaign) => {
    if (!window.confirm(`¿Eliminar la campaña "${c.name}"?`)) return;
    try {
      await api.deleteCampaign(c.id);
      setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
      showToast('Campaña eliminada');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error eliminando la campaña');
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    try {
      // datetime-local → ISO con offset (lo que valida el schema del server).
      const payload = {
        ...form,
        scheduleAt: form.scheduleAt ? new Date(form.scheduleAt).toISOString() : null,
      };
      if (editingId) {
        await api.updateCampaign(editingId, payload);
        showToast('Campaña actualizada');
      } else {
        await api.createCampaign(payload);
        showToast('Campaña creada');
      }
      setShowModal(false);
      loadCampaigns();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error guardando la campaña');
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh] text-stone-500">
        <i className="fas fa-spinner fa-spin text-3xl mr-4"></i>
        <span className="font-bold uppercase tracking-widest text-sm">Cargando campañas...</span>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-12 pb-40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-brand">Marketing</h1>
          <p className="text-stone-500 mt-4 max-w-xl">Gestión de campañas para el ecosistema Guido Pizza.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 w-full md:w-auto justify-center"
        >
          <i className="fas fa-plus"></i> NUEVA CAMPAÑA
        </button>
      </div>

      <div className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800 shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <h3 className="font-bold text-xl flex items-center gap-4">
            <i className="fas fa-bullseye text-orange-500"></i> Conversiones por campaña
            {metricsNotTracked && (
              <span
                title={METRICS_TOOLTIP}
                className="text-[8px] font-black uppercase px-4 py-2 rounded-full border bg-stone-800 text-stone-500 border-stone-700 tracking-widest"
              >
                No disponible
              </span>
            )}
          </h3>
        </div>
        {metricsNotTracked ? (
          <p className="text-stone-600 text-sm" title={METRICS_TOOLTIP}>
            Sin datos de conversión todavía — el envío de campañas no está conectado a ningún canal.
          </p>
        ) : (
          <div ref={containerRef} className="h-72">
            {!chartsError && charts ? (
              <charts.ResponsiveContainer width="100%" height="100%">
                <charts.BarChart data={campaignStats}>
                  <charts.XAxis dataKey="name" stroke="#444" fontSize={9} axisLine={false} tickLine={false} />
                  <charts.YAxis stroke="#444" fontSize={9} axisLine={false} tickLine={false} />
                  <charts.Tooltip
                    cursor={{ fill: '#ffffff05' }}
                    contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #333', borderRadius: '16px' }}
                  />
                  <charts.Bar dataKey="conv" radius={[10, 10, 0, 0]} barSize={50}>
                    {campaignStats.map((_entry, index) => (
                      <charts.Cell key={`cell-${index}`} fill={index === 1 ? '#ea580c' : '#444'} />
                    ))}
                  </charts.Bar>
                </charts.BarChart>
              </charts.ResponsiveContainer>
            ) : (
              <ChartSkeleton error={chartsError} />
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="bg-stone-900/60 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group relative overflow-hidden"
          >
            <div
              className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 ${c.status === 'active' ? 'bg-green-500' : 'bg-stone-500'}`}
            ></div>
            <div className="flex justify-between items-start mb-8">
              <span
                className={`text-[8px] font-black uppercase px-5 py-2 rounded-full border ${
                  c.status === 'active'
                    ? 'bg-green-950 text-green-500 border-green-500/20'
                    : 'bg-stone-800 text-stone-500 border-stone-700'
                }`}
              >
                {c.status}
              </span>
              <div className="flex items-center gap-4">
                <button onClick={() => openEdit(c)} className="text-stone-700 hover:text-white transition-colors">
                  <i className="fas fa-pen"></i>
                </button>
                <button onClick={() => handleDelete(c)} className="text-stone-700 hover:text-red-500 transition-colors">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <h4 className="font-black text-xl mb-3 tracking-tight">{c.name}</h4>
            <p className="text-stone-500 text-[10px] mb-2 uppercase tracking-[0.3em] font-bold italic">{c.type}</p>
            {c.status === 'scheduled' && c.scheduleAt && (
              <p className="text-[10px] font-bold text-orange-400/80 mb-6 flex items-center gap-2">
                <i className="fas fa-calendar"></i> Se activa el {formatSchedule(c.scheduleAt)}
              </p>
            )}
            {c.status !== 'scheduled' && <div className="mb-6"></div>}

            <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-8">
              <div>
                <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-1">Impacto</p>
                <p className="text-2xl font-black text-white" title={c.reach === 0 ? METRICS_TOOLTIP : undefined}>
                  {c.reach === 0 ? '—' : c.reach.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-1">Conversión</p>
                <p
                  className="text-2xl font-black text-orange-500"
                  title={c.conversions === 0 ? METRICS_TOOLTIP : undefined}
                >
                  {c.conversions === 0 ? '—' : c.conversions}
                </p>
              </div>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && (
          <p className="text-stone-600 text-sm col-span-full">
            Sin campañas todavía. Creá la primera con &ldquo;Nueva Campaña&rdquo;.
          </p>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-stone-900 p-10 rounded-[3rem] border border-stone-700 shadow-2xl max-w-lg w-full mx-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-brand mb-8">{editingId ? 'Editar Campaña' : 'Nueva Campaña'}</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">
                  Nombre
                </label>
                <input
                  className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Promo Verano"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">
                    Tipo
                  </label>
                  <select
                    className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as Campaign['type'] })}
                  >
                    <option value="flash">Flash</option>
                    <option value="segment">Segmento</option>
                    <option value="rappipromo">RappiPromo</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">
                    Estado
                  </label>
                  <select
                    className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Campaign['status'] })}
                  >
                    <option value="draft">Borrador</option>
                    <option value="scheduled">Programada</option>
                    <option value="active">Activa</option>
                  </select>
                </div>
              </div>
              {form.status === 'scheduled' && (
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">
                    Fecha de activación
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
                    value={form.scheduleAt}
                    onChange={(e) => setForm({ ...form, scheduleAt: e.target.value })}
                  />
                  <p className="text-[9px] text-stone-600 mt-2">
                    La campaña pasa a «Activa» automáticamente a esta fecha/hora.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">
                    Descuento %
                  </label>
                  <input
                    type="number"
                    className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">
                    Presupuesto
                  </label>
                  <input
                    type="number"
                    className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-10">
              <button
                className="px-8 py-4 rounded-2xl border border-stone-700 text-xs font-black uppercase tracking-widest text-stone-500 hover:border-stone-500 transition-colors"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-8 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-xs font-black uppercase tracking-widest transition-colors shadow-xl"
                onClick={handleSubmit}
              >
                {editingId ? 'Guardar' : 'Crear Campaña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-700 px-6 py-3 rounded-2xl shadow-2xl z-50 text-sm font-bold">
          {toast}
        </div>
      )}
    </div>
  );
};

export default MarketingView;
