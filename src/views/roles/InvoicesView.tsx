import React, { useState, useEffect, useCallback } from 'react';
import type { LocationId, Invoice, CreditNote } from '../../types';
import api from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

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
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [expandedXml, setExpandedXml] = useState<string | null>(null);
  const [xmlContent, setXmlContent] = useState<string>('');
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [firmaInvoice, setFirmaInvoice] = useState<Invoice | null>(null);
  const [cufeManual, setCufeManual] = useState('');
  const [xmlActualizado, setXmlActualizado] = useState('');

  const loadData = useCallback(async () => {
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
  }, [locationId, tab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket: recargar cuando hay cambios en facturas
  useWebSocket('invoice:update', () => {
    loadData();
  });

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

  const sendToDian = async (id: string) => {
    setSendingId(id);
    try {
      const result = await api.sendInvoiceToDian(id);
      if (result?.instrucciones) {
        setError(`✅ Factura enviada. Siguiente paso: ${result.instrucciones.endpointSiguiente}`);
      }
      loadData();
    } catch (e) {
      setError('Error al enviar a DIAN: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setSendingId(null);
    }
  };

  const resendToDian = async (id: string) => {
    setSendingId(id);
    try {
      await api.resendInvoiceToDian(id);
      loadData();
    } catch (e) {
      setError('Error al reenviar: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setSendingId(null);
    }
  };

  const openXmlViewer = async (inv: Invoice) => {
    setExpandedXml(inv.id);
    const result = await api.getInvoice(inv.id);
    setXmlContent(result.xml || '<!-- XML no generado -->');
  };

  const closeXmlViewer = () => {
    setExpandedXml(null);
    setXmlContent('');
  };

  const openFirmaModal = (inv: Invoice) => {
    setFirmaInvoice(inv);
    setCufeManual(inv.cufe || '');
    setXmlActualizado(inv.xml || '');
    setShowFirmaModal(true);
  };

  const saveFirma = async () => {
    if (!firmaInvoice) return;
    try {
      await api.updateInvoice(firmaInvoice.id, {
        cufe: cufeManual,
        xml: xmlActualizado,
        status: 'accepted',
        dianResponse: {
          cufe: cufeManual,
          xmlFirmado: xmlActualizado ? xmlActualizado.substring(0, 200) + '...' : null,
          firmadoEn: new Date().toISOString(),
          nota: '[MANUAL] Actualizar con respuesta real del proveedor DIAN',
        },
      });
      setShowFirmaModal(false);
      setFirmaInvoice(null);
      loadData();
    } catch (e) {
      setError('Error al guardar firma: ' + (e instanceof Error ? e.message : ''));
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-900/30 text-yellow-500',
    sent: 'bg-blue-900/30 text-blue-500',
    accepted: 'bg-green-900/30 text-green-500',
    rejected: 'bg-red-900/30 text-red-500',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    sent: 'Enviado a DIAN',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
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
          <h2 className="text-2xl font-black text-white">Facturación Electrónica</h2>
          <p className="text-stone-500 text-sm">Facturas, notas crédito/débito e integración DIAN</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setError(
                '📋 Ver docs/DIAN_MODULE_STATUS.md para estado completo de la integración DIAN (campos [MANUAL] pendientes).'
              )
            }
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-xl text-[10px] font-bold transition-all"
          >
            <i className="fas fa-info-circle mr-1" />
            Estado DIAN
          </button>
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
      </div>

      {error && (
        <div className="p-4 bg-stone-900/50 border border-stone-800/30 rounded-xl text-stone-400 text-sm font-mono whitespace-pre-wrap">
          {error}
          <button onClick={() => setError('')} className="ml-3 text-stone-600 hover:text-white">
            <i className="fas fa-times" />
          </button>
        </div>
      )}

      <div className="flex gap-1 bg-stone-900/50 rounded-xl p-1 w-fit">
        {(['facturas', 'notas'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30' : 'text-stone-400 hover:text-white'
            }`}
          >
            {t === 'facturas' ? '📄 Facturas' : '📝 Notas Crédito/Débito'}
          </button>
        ))}
      </div>

      {/* ═══ TABLA DE FACTURAS ═══ */}
      {tab === 'facturas' && (
        <div className="space-y-3">
          {invoices.length === 0 && (
            <div className="text-center py-16 text-stone-600">
              <i className="fas fa-file-invoice text-5xl mb-4 opacity-20" />
              <p className="font-bold text-lg mb-1">No hay facturas</p>
              <p className="text-sm text-stone-700">Creá una desde el botón &quot;Nueva Factura&quot;</p>
            </div>
          )}

          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-stone-900/50 border border-stone-800/30 rounded-xl overflow-hidden transition-all hover:border-stone-700/50"
            >
              {/* Header */}
              <div className="p-5 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-white text-lg">{inv.invoiceNumber || inv.id.slice(-8)}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        statusColors[inv.status] || 'bg-stone-800 text-stone-500'
                      }`}
                    >
                      {statusLabels[inv.status] || inv.status}
                    </span>
                    <span className="text-[10px] text-stone-600 font-mono">{inv.tipoDocumento}</span>
                  </div>
                  <p className="text-xs text-stone-500">
                    {new Date(inv.createdAt).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {inv.cufe && (
                    <p className="text-[10px] text-stone-600 mt-1 font-mono truncate" title={inv.cufe}>
                      CUFE: {inv.cufe}
                    </p>
                  )}
                  {inv.notes && <p className="text-xs text-stone-500 mt-1 italic">{inv.notes}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 ml-4 shrink-0">
                  {/* XML Viewer */}
                  <button
                    onClick={() => (expandedXml === inv.id ? closeXmlViewer() : openXmlViewer(inv))}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-[10px] font-bold text-stone-300 transition-all"
                    title="Ver XML"
                  >
                    <i className="fas fa-code mr-1" />
                    XML
                  </button>

                  {/* Download XML */}
                  <a
                    href={api.getInvoiceXmlUrl(inv.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-[10px] font-bold text-stone-300 transition-all inline-flex items-center"
                    title="Descargar XML"
                  >
                    <i className="fas fa-download" />
                  </a>

                  {/* Print */}
                  <button
                    onClick={() => window.open(api.getPrintInvoiceUrl(inv.id), '_blank', 'width=500,height=700')}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-[10px] font-bold text-stone-300 transition-all"
                    title="Imprimir"
                  >
                    <i className="fas fa-print mr-1" />
                    PDF
                  </button>

                  {/* Send to DIAN */}
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => sendToDian(inv.id)}
                      disabled={sendingId === inv.id}
                      className="px-3 py-2 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                      title="Enviar a DIAN"
                    >
                      {sendingId === inv.id ? (
                        <i className="fas fa-spinner fa-spin" />
                      ) : (
                        <>
                          <i className="fas fa-paper-plane mr-1" />
                          Enviar
                        </>
                      )}
                    </button>
                  )}

                  {/* Resend (when sent but needs re-attempt) */}
                  {inv.status === 'sent' && (
                    <button
                      onClick={() => resendToDian(inv.id)}
                      disabled={sendingId === inv.id}
                      className="px-3 py-2 bg-yellow-900/30 hover:bg-yellow-800/40 text-yellow-500 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                      title="Reenviar a DIAN"
                    >
                      {sendingId === inv.id ? (
                        <i className="fas fa-spinner fa-spin" />
                      ) : (
                        <>
                          <i className="fas fa-redo mr-1" />
                          Reenviar
                        </>
                      )}
                    </button>
                  )}

                  {/* Manual sign (when returned from DIAN) */}
                  <button
                    onClick={() => openFirmaModal(inv)}
                    className="px-3 py-2 bg-green-900/30 hover:bg-green-800/40 text-green-500 rounded-lg text-[10px] font-bold transition-all"
                    title="Completar firma manual"
                  >
                    <i className="fas fa-pen mr-1" />
                    Firmar
                  </button>
                </div>
              </div>

              {/* XML Viewer (expandable) */}
              {expandedXml === inv.id && (
                <div className="border-t border-stone-800/30">
                  <div className="flex items-center justify-between px-5 py-2 bg-stone-900/30">
                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                      XML de la Factura
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(xmlContent);
                      }}
                      className="text-[10px] text-stone-600 hover:text-stone-300 transition-all"
                    >
                      <i className="fas fa-copy mr-1" />
                      Copiar
                    </button>
                  </div>
                  <pre className="p-5 text-[10px] text-stone-400 font-mono overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
                    {xmlContent ? (
                      xmlContent.length > 2000 ? (
                        xmlContent.substring(0, 2000) + '\n\n... (truncado)'
                      ) : (
                        xmlContent
                      )
                    ) : (
                      <span className="text-stone-600 italic">XML no generado — creá la factura de nuevo</span>
                    )}
                  </pre>
                </div>
              )}

              {/* Emisor/Receptor info cards */}
              <div className="border-t border-stone-800/30 px-5 py-3 flex gap-6 text-[10px]">
                {inv.emisorInfo && (
                  <div className="text-stone-500">
                    <span className="font-bold text-stone-400 uppercase tracking-wider">Emisor:</span>{' '}
                    {inv.emisorInfo.razonSocial} · NIT {inv.emisorInfo.nit}-{inv.emisorInfo.digitoVerificacion}
                  </div>
                )}
                {inv.receptorInfo && (
                  <div className="text-stone-500">
                    <span className="font-bold text-stone-400 uppercase tracking-wider">Cliente:</span>{' '}
                    {inv.receptorInfo.razonSocial}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TABLA DE NOTAS CRÉDITO/DÉBITO ═══ */}
      {tab === 'notas' && (
        <div className="space-y-3">
          {creditNotes.length === 0 && (
            <div className="text-center py-16 text-stone-600">
              <i className="fas fa-exchange-alt text-5xl mb-4 opacity-20" />
              <p className="font-bold text-lg">No hay notas crédito/débito</p>
            </div>
          )}
          {creditNotes.map((cn) => (
            <div key={cn.id} className="bg-stone-900/50 border border-stone-800/30 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    cn.tipoNota === 'credito' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'
                  }`}
                >
                  {cn.tipoNota === 'credito' ? 'NC - Nota Crédito' : 'ND - Nota Débito'}
                </span>
                <span className="font-bold text-white">${(cn.monto || 0).toLocaleString('es-CO')}</span>
                <span className="text-xs text-stone-500">{new Date(cn.createdAt).toLocaleDateString('es-CO')}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    cn.status === 'accepted'
                      ? 'bg-green-900/30 text-green-500'
                      : cn.status === 'sent'
                        ? 'bg-blue-900/30 text-blue-500'
                        : 'bg-yellow-900/30 text-yellow-500'
                  }`}
                >
                  {cn.status}
                </span>
              </div>
              <p className="text-sm text-stone-400 mb-1">{cn.motivo}</p>
              {cn.cude && (
                <p className="text-[10px] text-stone-600 font-mono truncate" title={cn.cude}>
                  CUDE: {cn.cude}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ MODAL CREAR FACTURA ═══ */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-md bg-stone-950 border border-white/10 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-5">Nueva Factura Electrónica</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  ID de la Orden
                </label>
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Ej: ord_123456_abc123"
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-orange-600/50 outline-none"
                />
              </div>
              <p className="text-[10px] text-stone-600">
                Ingresá el ID de la orden completada para generar la factura con XML
              </p>
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
                  Generar Factura + XML
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL FIRMA MANUAL ═══ */}
      {showFirmaModal && firmaInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowFirmaModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-stone-950 border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-2">Firma Manual — {firmaInvoice.invoiceNumber}</h3>
            <p className="text-[10px] text-stone-600 mb-5">
              Completá estos campos con los datos devueltos por el proveedor DIAN
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  CUFE (Código Único de Factura Electrónica)
                </label>
                <input
                  value={cufeManual}
                  onChange={(e) => setCufeManual(e.target.value)}
                  placeholder="CUFE devuelto por DIAN (SHA-384)"
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-green-600/50 outline-none"
                />
                <p className="text-[9px] text-stone-600 mt-1">
                  El CUFE lo genera la DIAN después de validar el XML enviado
                </p>
              </div>

              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  XML Firmado (opcional — pegar XML con firma)
                </label>
                <textarea
                  value={xmlActualizado}
                  onChange={(e) => setXmlActualizado(e.target.value)}
                  placeholder="Pegar aquí el XML firmado devuelto por el proveedor DIAN"
                  rows={8}
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-[10px] text-white font-mono focus:border-green-600/50 outline-none resize-y"
                />
              </div>

              <div className="p-3 bg-yellow-900/10 border border-yellow-800/20 rounded-xl">
                <p className="text-[10px] text-yellow-500 font-bold mb-1">
                  <i className="fas fa-exclamation-triangle mr-1" />
                  [MANUAL] Campos pendientes
                </p>
                <ul className="text-[9px] text-stone-500 space-y-1 list-disc list-inside">
                  <li>Verificar que el CUFE sea válido (formato SHA-384)</li>
                  <li>El XML debe incluir la firma digital XAdES-EPES</li>
                  <li>Actualizar server/services/dianXml.js con datos reales del emisor</li>
                  <li>Configurar certificado digital en server/services/dianSigner.js</li>
                  <li>Ver docs/DIAN_MODULE_STATUS.md para instrucciones completas</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowFirmaModal(false)}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 rounded-xl text-sm font-bold text-stone-400 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveFirma}
                  disabled={!cufeManual}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                >
                  Guardar Firma
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
