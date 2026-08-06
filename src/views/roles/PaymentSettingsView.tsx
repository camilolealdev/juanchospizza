import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

type ProviderStatus = { configured: boolean; webhookSecret: boolean | null };

// Pago online: SOLO Bold (decisión 2026-08-06). MercadoPago/Wompi/PayPal
// quedaron fuera del proyecto (backend y servicio eliminados).
const PROVIDERS: { key: string; label: string; envVar: string; webhookVar: string | null }[] = [
  { key: 'bold', label: 'Bold', envVar: 'BOLD_API_KEY', webhookVar: 'BOLD_WEBHOOK_SECRET' },
];

// Read-only status board -- deliberately never shows or accepts real secret
// values. Keys/webhook secrets live only as backend env vars; this just asks
// the backend which ones are present so an admin can see what's missing
// before going live, without a raw-secret-in-the-database anti-pattern.
const PaymentSettingsView: React.FC = () => {
  const [status, setStatus] = useState<Record<string, ProviderStatus> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getPaymentStatus()
      .then(setStatus)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error cargando estado de pagos'));
  }, []);

  return (
    <div className="p-10 space-y-10 pb-40">
      <div>
        <h1 className="text-5xl font-brand">Pagos</h1>
        <p className="text-stone-500 mt-4 max-w-xl">
          Estado de credenciales por proveedor. Las claves reales solo viven como variables de entorno en el backend --
          acá nunca se ven ni se editan.
        </p>
      </div>

      {error && (
        <div className="p-6 rounded-2xl border border-red-500/30 bg-red-950/30 text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      {!status && !error && (
        <div className="text-stone-500 text-sm font-bold uppercase tracking-widest">Cargando...</div>
      )}

      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PROVIDERS.map((p) => {
            const s = status[p.key];
            const ok = !!s?.configured;
            return (
              <div key={p.key} className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800/50">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-black text-white">{p.label}</h3>
                  <span
                    className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${
                      ok
                        ? 'bg-green-950 text-green-500 border-green-500/20'
                        : 'bg-red-950 text-red-500 border-red-500/20'
                    }`}
                  >
                    {ok ? 'Configurado' : 'Falta configurar'}
                  </span>
                </div>
                <p className="text-stone-500 text-xs font-mono mb-2">{p.envVar}</p>
                {p.webhookVar && (
                  <p className="text-stone-600 text-[11px]">
                    Webhook secret ({p.webhookVar}):{' '}
                    <span className={s?.webhookSecret ? 'text-green-500 font-bold' : 'text-amber-500 font-bold'}>
                      {s?.webhookSecret ? 'configurado' : 'sin configurar -- webhooks sin verificar'}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentSettingsView;
