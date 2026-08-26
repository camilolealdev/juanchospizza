import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

interface QueueTicket {
  id: string;
  ticketNumber: number;
  status: 'waiting' | 'preparing' | 'ready';
  guestCount: number | null;
  customerName: string | null;
  source: 'mesa' | 'local' | 'pickup';
  tableName: string | null;
  createdAt: string;
}

const SEDE_NAMES: Record<string, string> = {
  nemocon: 'Nemocón',
  zipaquira: 'Zipaquirá',
};

const COLUMNS: { status: QueueTicket['status']; label: string; accent: string }[] = [
  { status: 'waiting', label: 'Esperando', accent: 'border-queso text-queso' },
  { status: 'preparing', label: 'Preparando', accent: 'border-tomato text-tomato' },
  { status: 'ready', label: 'Listo — pasa por tu pedido', accent: 'border-green-400 text-green-400' },
];

const SOURCE_LABELS: Record<QueueTicket['source'], string> = {
  mesa: 'Mesa',
  local: 'Local',
  pickup: 'Para llevar',
};

// Pantalla pública de digiturno (sin login, pensada para un TV/monitor en la
// sede) -- el backend ya traía /api/digiturno/queue/live pensado para esto
// (comentario "pantalla de clientes" en server/routes/digiturno.js) pero
// nunca existió un componente público que lo consumiera; solo el
// DigiturnoView del CRM (con controles de staff, detrás de login). Esta
// página es de solo lectura -- ningún botón que cambie estado de un ticket.
export default function DigiturnoPublicPage() {
  const { sede } = useParams<{ sede: string }>();
  const isValidSede = sede === 'nemocon' || sede === 'zipaquira';

  useDocumentMeta(
    isValidSede ? `Pantalla de pedidos — ${SEDE_NAMES[sede!]}` : 'Pantalla de pedidos',
    'Estado de pedidos en tiempo real.',
    true
  );

  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isValidSede) return;

    const es = new EventSource(`/api/digiturno/queue/live?locationId=${sede}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        setTickets(JSON.parse(e.data));
      } catch {
        /* frame de keepalive o error puntual, se ignora -- el próximo tick (3s) trae datos frescos */
      }
    };
    es.onerror = () => setConnected(false);

    return () => es.close();
  }, [sede, isValidSede]);

  if (!isValidSede) {
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center text-crema text-center px-4">
        <p className="font-heading text-2xl">
          Sede no válida. Usá <code className="text-queso">/pantalla/nemocon</code> o{' '}
          <code className="text-queso">/pantalla/zipaquira</code>.
        </p>
      </div>
    );
  }

  const byStatus = (status: QueueTicket['status']) =>
    tickets.filter((t) => t.status === status).sort((a, b) => a.ticketNumber - b.ticketNumber);

  return (
    <div className="min-h-screen bg-carbon text-crema flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-8 py-6 border-b border-crema/10">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🍕</span>
          <div>
            <h1 className="font-heading text-2xl uppercase tracking-wider text-queso leading-none">
              Juancho&apos;s Pizza
            </h1>
            <p className="text-crema/50 text-sm">{SEDE_NAMES[sede!]}</p>
          </div>
        </div>
        <span
          className={`text-xs uppercase tracking-widest font-bold px-3 py-1.5 rounded-full ${
            connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {connected ? '● En vivo' : '○ Reconectando...'}
        </span>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-crema/10">
        {COLUMNS.map((col) => {
          const items = byStatus(col.status);
          return (
            <div key={col.status} className="p-6 flex flex-col min-h-[300px]">
              <h2 className={`font-heading text-xl uppercase tracking-wider mb-6 pb-3 border-b-4 ${col.accent}`}>
                {col.label} <span className="text-crema/40 text-base">({items.length})</span>
              </h2>
              {items.length === 0 ? (
                <p className="text-crema/30 text-sm">Sin pedidos</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="bg-carbon-700/60 border border-crema/10 rounded-xl p-4 text-center"
                    >
                      <p className="font-heading text-4xl text-crema leading-none mb-1">#{t.ticketNumber}</p>
                      <p className="text-crema/50 text-xs uppercase tracking-wide">
                        {SOURCE_LABELS[t.source]}
                        {t.tableName ? ` · ${t.tableName}` : ''}
                      </p>
                      {t.customerName && (
                        <p className="text-crema/70 text-sm mt-1 truncate">{t.customerName}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
