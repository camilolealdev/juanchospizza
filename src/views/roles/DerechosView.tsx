import React, { useState, useEffect, useCallback } from 'react';
import type { DerechoSolicitud } from '../../types';
import api from '../../services/api';

const TIPO_LABELS: Record<DerechoSolicitud['tipo'], string> = {
  consulta: 'Consulta',
  rectificacion: 'Rectificación',
  supresion: 'Supresión',
  reclamo: 'Reclamo',
};

const ESTADO_STYLES: Record<DerechoSolicitud['estado'], string> = {
  pendiente: 'bg-yellow-900/30 text-yellow-500',
  en_proceso: 'bg-blue-900/30 text-blue-500',
  respondida: 'bg-green-900/30 text-green-500',
  rechazada: 'bg-red-900/30 text-red-500',
};

const ESTADO_LABELS: Record<DerechoSolicitud['estado'], string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  respondida: 'Respondida',
  rechazada: 'Rechazada',
};

const ESTADOS = ['pendiente', 'en_proceso', 'respondida', 'rechazada'] as const;

// Máquina de estados ARCO (espejo del backend, server/schemas/derechos.js):
// pendiente ↔ en_proceso → respondida|rechazada. Los estados terminales no
// tienen transiciones salientes. Se usa para deshabilitar opciones inválidas
// en el selector de estado (el backend además lo valida con 409).
const TRANSICIONES: Record<DerechoSolicitud['estado'], DerechoSolicitud['estado'][]> = {
  pendiente: ['en_proceso', 'respondida', 'rechazada'],
  en_proceso: ['pendiente', 'respondida', 'rechazada'],
  respondida: [],
  rechazada: [],
};

// Solicitudes de derechos ARCO (Ley 1581 Art. 14-15) — el admin las ve y
// responde acá dentro del plazo legal de 10 días hábiles. Cada respuesta
// queda registrada con quién (respondedBy) y cuándo (respondedAt) para
// evidencia ante la SIC.
const DerechosView: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<DerechoSolicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [respondiendo, setRespondiendo] = useState<DerechoSolicitud | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<DerechoSolicitud['estado']>('respondida');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDerechos({
        estado: filtroEstado || undefined,
        tipo: filtroTipo || undefined,
      });
      setSolicitudes(data);
    } catch (e) {
      setError('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroTipo]);

  useEffect(() => {
    load();
  }, [load]);

  const openRespond = (s: DerechoSolicitud) => {
    setRespondiendo(s);
    setRespuesta(s.respuesta || '');
    setNuevoEstado(s.estado === 'pendiente' ? 'en_proceso' : s.estado);
  };

  const save = async () => {
    if (!respondiendo) return;
    setSaving(true);
    try {
      await api.respondDerecho(respondiendo.id, {
        estado: nuevoEstado,
        respuesta: respuesta || undefined,
      });
      setRespondiendo(null);
      setRespuesta('');
      load();
    } catch (e) {
      setError('Error al guardar la respuesta');
    } finally {
      setSaving(false);
    }
  };

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Derechos ARCO</h2>
          <p className="text-stone-500 text-sm">
            Habeas Data — Ley 1581/2012 · {pendientes} pendiente{pendientes !== 1 ? 's' : ''} de responder
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50"
        >
          <i className="fas fa-rotate mr-1" />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="p-4 bg-stone-900/50 border border-stone-800/30 rounded-xl text-stone-400 text-sm font-mono">
          {error}
          <button onClick={() => setError('')} className="ml-3 text-stone-600 hover:text-white">
            <i className="fas fa-times" />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-stone-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-300 focus:outline-none focus:border-brand-500/50"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABELS[e]}
            </option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-stone-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-300 focus:outline-none focus:border-brand-500/50"
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(TIPO_LABELS) as DerechoSolicitud['tipo'][]).map((t) => (
            <option key={t} value={t}>
              {TIPO_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-stone-500 text-sm font-bold">Cargando...</p>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="text-center py-16 text-stone-600">
          <i className="fas fa-shield-halved text-5xl mb-4 opacity-20" />
          <p className="font-bold text-lg mb-1">No hay solicitudes ARCO</p>
          <p className="text-sm text-stone-700">
            Las solicitudes de clientes desde el banner de consentimiento aparecerán acá
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => (
            <div key={s.id} className="bg-stone-900/50 border border-stone-800/30 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.tipo === 'supresion'
                          ? 'bg-red-900/30 text-red-500'
                          : s.tipo === 'reclamo'
                            ? 'bg-orange-900/30 text-orange-500'
                            : 'bg-blue-900/30 text-blue-400'
                      }`}
                    >
                      {TIPO_LABELS[s.tipo]}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_STYLES[s.estado]}`}>
                      {ESTADO_LABELS[s.estado]}
                    </span>
                    <span className="text-[10px] text-stone-600 font-mono">{s.id.slice(-10)}</span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    {s.clientName || s.identificador || 'Titular no asociado'}
                    {s.clientPhone && <span className="text-stone-500 font-normal"> · {s.clientPhone}</span>}
                  </p>
                  {s.descripcion && <p className="text-xs text-stone-400 mt-1">{s.descripcion}</p>}
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-stone-600">
                    <span>
                      <i className="fas fa-calendar mr-1" />
                      {new Date(s.createdAt).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {s.respondedBy && (
                      <span>
                        <i className="fas fa-user-check mr-1" />
                        Respondida por {s.respondedBy}
                      </span>
                    )}
                  </div>
                  {s.respuesta && (
                    <div className="mt-3 p-3 bg-white/[0.03] border border-white/5 rounded-lg">
                      <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1">Respuesta</p>
                      <p className="text-xs text-stone-300">{s.respuesta}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openRespond(s)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-[10px] font-bold transition-all shrink-0"
                >
                  <i className="fas fa-reply mr-1" />
                  Responder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal responder */}
      {respondiendo && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !saving && setRespondiendo(null)}
        >
          <div
            className="w-full max-w-lg bg-stone-950 border border-white/10 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-1">Responder solicitud ARCO</h3>
            <p className="text-[10px] text-stone-600 mb-5">
              {TIPO_LABELS[respondiendo.tipo]} ·{' '}
              {respondiendo.clientName || respondiendo.identificador || 'Titular no asociado'} · Plazo legal 10 días
              hábiles
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  Estado
                </label>
                <select
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value as DerechoSolicitud['estado'])}
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-600/50 outline-none"
                >
                  {ESTADOS.map((e) => (
                    <option
                      key={e}
                      value={e}
                      disabled={e !== respondiendo.estado && !TRANSICIONES[respondiendo.estado].includes(e)}
                    >
                      {ESTADO_LABELS[e]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  Respuesta <span className="text-stone-700 normal-case">(obligatoria si se marca respondida)</span>
                </label>
                <textarea
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  rows={5}
                  placeholder='Ej: "Se entregó copia de los datos personales al titular vía correo."'
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-600/50 outline-none resize-y"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRespondiendo(null)}
                  disabled={saving}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 rounded-xl text-sm font-bold text-stone-400 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving || (nuevoEstado === 'respondida' && !respuesta.trim())}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                >
                  {saving ? <i className="fas fa-spinner fa-spin" /> : 'Guardar respuesta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DerechosView;
