import React, { useState, useEffect } from 'react';
import type { LocationId, Invoice, CreditNote } from '../../types';
import api from '../../services/api';

interface Props {
  locationId: LocationId;
}

const InvoicesView: React.FC<Props> = ({ locationId }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'facturas' | 'notas'>('facturas');
  const [showCreate, setShowCreate] = useState(false);
  const [orderId, setOrderId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'facturas') {
        const data = await api.getInvoices({ locationId });
        setInvoices(data);
      } else {
        const data = await api.getCreditNotes();
        setCreditNotes(data);
      }
    } catch (e) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [locationId, tab]);

  const createInvoice = async () => {
    if (!orderId) return;
    try {
      await api.createInvoice({ orderId, locationId });
      setShowCreate(false);
      setOrderId('');
      loadData();
    } catch (e) {
      setError('Error al crear factura');
    }
  };

  const printInvoice = (id: string) => {
    window.open(api.getPrintInvoiceUrl(id), '_blank', 'width=500,height=700');
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-900/30 text-yellow-500',
    sent: 'bg-blue-900/30 text-blue-500',
    accepted: 'bg-green-900/30 text-green-500',
    rejected: 'bg-red-900/30 text-red-500',
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-stone-500 text-sm font-bold">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Facturación</h2>
          <p className="text-stone-500 text-sm">Facturas y notas crédito/débito</p>
        </div>
        {tab === 'facturas' && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all"
          >
            <i className="fas fa-file-invoice mr-2" />
            Nueva Factura
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-xl text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {(['facturas', 'notas'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-orange-600 text-white' : 'bg-stone-900 text-stone-400 hover:text-white'}`}
          >
            {t === 'facturas' ? '📄 Facturas' : '📝 Notas Crédito/Débito'}
          </button>
        ))}
      </div>

      {tab === 'facturas' && (
        <div className="space-y-3">
          {invoices.length === 0 && (
            <div className="text-center py-10 text-stone-600">
              <i className="fas fa-file-invoice text-4xl mb-3 opacity-30" />
              <p className="font-bold">No hay facturas</p>
            </div>
          )}
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-stone-900/50 border border-stone-800/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">{inv.invoiceNumber || inv.id.slice(-8)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColors[inv.status] || 'bg-stone-800 text-stone-500'}`}
                  >
                    {inv.status}
                  </span>
                </div>
                <button
                  onClick={() => printInvoice(inv.id)}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-[10px] font-bold text-stone-300 transition-all"
                >
                  <i className="fas fa-print mr-1" />
                  Imprimir
                </button>
              </div>
              <p className="text-xs text-stone-500">
                {inv.tipoDocumento} · {new Date(inv.createdAt).toLocaleDateString('es-CO')}
              </p>
              {inv.cufe && <p className="text-[10px] text-stone-600 mt-1 truncate">CUFE: {inv.cufe}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'notas' && (
        <div className="space-y-3">
          {creditNotes.length === 0 && (
            <div className="text-center py-10 text-stone-600">
              <i className="fas fa-exchange-alt text-4xl mb-3 opacity-30" />
              <p className="font-bold">No hay notas crédito/débito</p>
            </div>
          )}
          {creditNotes.map((cn) => (
            <div key={cn.id} className="bg-stone-900/50 border border-stone-800/30 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${cn.tipoNota === 'credito' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}
                >
                  {cn.tipoNota === 'credito' ? 'NC' : 'ND'}
                </span>
                <span className="font-bold text-white">${(cn.monto || 0).toLocaleString('es-CO')}</span>
                <span className="text-xs text-stone-500">{new Date(cn.createdAt).toLocaleDateString('es-CO')}</span>
              </div>
              <p className="text-sm text-stone-400">{cn.motivo}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-md bg-stone-950 border border-white/10 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-5">Nueva Factura</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  ID de la Orden
                </label>
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Ej: ord_123456_abc123"
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white font-mono"
                />
              </div>
              <p className="text-[10px] text-stone-600">Ingresa el ID de la orden completada para generar la factura</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 rounded-xl text-sm font-bold text-stone-400 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={createInvoice}
                  disabled={!orderId}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                >
                  Crear Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesView;
