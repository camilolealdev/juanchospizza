import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

// Panel de Notificaciones — consume el backend ya montado
// (server/routes/notifications.js, 3 endpoints). Cierra la P1 de
// docs/AUDITORIA_CRUD_GENERAL_2026-08-06.md: el backend existía pero ningún
// frontend lo usaba (solo un TODO en AdminLayout desde 2026-07-21).
//
// Propósito: que un ADMIN vea de un vistazo qué canales de notificación
// están configurados (email/push/webhook) y pueda disparar pruebas reales
// sin tocar la terminal. Los secretos solo viven como env vars del backend —
// acá nunca se ven ni se editan (mismo patrón que PaymentSettingsView).

interface NotificationsStatus {
  email: { configured: boolean; host: string; from: string };
  push: { configured: boolean; vapidPresent: boolean };
  webhook: { configured: boolean; orderUrl: string | null; paymentUrl: string | null };
}

const NotificacionesView: React.FC = () => {
  const [status, setStatus] = useState<NotificationsStatus | null>(null);
  const [error, setError] = useState('');
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const loadStatus = () => {
    setError('');
    api
      .getNotificationsStatus()
      .then(setStatus)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error cargando estado de notificaciones'));
  };

  useEffect(loadStatus, []);

  const runEmailTest = async () => {
    setFeedback(null);
    setSendingEmail(true);
    try {
      const res = await api.testNotificationEmail(testEmailTo || undefined);
      setFeedback({ kind: 'ok', text: `Email de prueba enviado a ${res.to}` });
    } catch (e) {
      setFeedback({ kind: 'err', text: e instanceof Error ? e.message : 'Error enviando email de prueba' });
    } finally {
      setSendingEmail(false);
    }
  };

  const runWebhookTest = async () => {
    setFeedback(null);
    setSendingWebhook(true);
    try {
      const res = await api.testNotificationWebhook();
      setFeedback({ kind: 'ok', text: `Webhook de prueba entregado (HTTP ${res.status})` });
    } catch (e) {
      setFeedback({ kind: 'err', text: e instanceof Error ? e.message : 'Error enviando webhook de prueba' });
    } finally {
      setSendingWebhook(false);
    }
  };

  const ChannelCard: React.FC<{
    icon: string;
    title: string;
    configured: boolean;
    missingLabel: string;
    children: React.ReactNode;
  }> = ({ icon, title, configured, missingLabel, children }) => (
    <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800/50">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/40 ring-1 ring-white/10">
            <i className={`fas fa-${icon} text-white text-sm`} />
          </div>
          <h3 className="text-xl font-black text-white">{title}</h3>
        </div>
        <span
          className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${
            configured
              ? 'bg-green-950 text-green-500 border-green-500/20'
              : 'bg-amber-950 text-amber-500 border-amber-500/20'
          }`}
        >
          {configured ? 'Configurado' : missingLabel}
        </span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="p-10 space-y-10 pb-40">
      <div>
        <h1 className="text-5xl font-brand">Notificaciones</h1>
        <p className="text-stone-500 mt-4 max-w-xl">
          Estado de los canales de notificación (email, push y webhooks) y pruebas manuales. Las credenciales reales
          solo viven como variables de entorno del backend — acá nunca se ven ni se editan.
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChannelCard icon="envelope" title="Email" configured={status.email.configured} missingLabel="Sin SMTP">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500 text-xs font-bold uppercase tracking-wider">Host</dt>
                  <dd className="text-stone-300 font-mono text-xs">{status.email.host}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500 text-xs font-bold uppercase tracking-wider">Remitente</dt>
                  <dd className="text-stone-300 font-mono text-xs">{status.email.from}</dd>
                </div>
              </dl>
              {!status.email.configured && (
                <p className="mt-4 text-[11px] text-amber-500/80 leading-relaxed">
                  Falta SMTP_USER/SMTP_PASS. Los emails de confirmación de pedido y campañas no se envían hasta
                  configurarlos (ver docs/PENDIENTES_PROVEEDORES.md).
                </p>
              )}
            </ChannelCard>

            <ChannelCard icon="bell" title="Push" configured={status.push.configured} missingLabel="Sin VAPID">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500 text-xs font-bold uppercase tracking-wider">VAPID keys</dt>
                  <dd className="text-stone-300 font-mono text-xs">
                    {status.push.vapidPresent ? 'presentes' : 'faltan'}
                  </dd>
                </div>
              </dl>
              {!status.push.configured && (
                <p className="mt-4 text-[11px] text-amber-500/80 leading-relaxed">
                  Falta el par VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_MAILTO. Sin esto no se pueden enviar
                  notificaciones push a los clientes suscritos.
                </p>
              )}
            </ChannelCard>

            <ChannelCard
              icon="code-branch"
              title="Webhooks salientes"
              configured={status.webhook.configured}
              missingLabel="Sin URL"
            >
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500 text-xs font-bold uppercase tracking-wider">Pedidos</dt>
                  <dd className="text-stone-300 font-mono text-xs truncate max-w-[60%]">
                    {status.webhook.orderUrl || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500 text-xs font-bold uppercase tracking-wider">Pagos</dt>
                  <dd className="text-stone-300 font-mono text-xs truncate max-w-[60%]">
                    {status.webhook.paymentUrl || '—'}
                  </dd>
                </div>
              </dl>
              {!status.webhook.configured && (
                <p className="mt-4 text-[11px] text-amber-500/80 leading-relaxed">
                  Sin ORDER_WEBHOOK_URL/PAYMENT_WEBHOOK_URL. Los eventos de pedido/pago no se notifican a servicios
                  externos (p. ej. n8n — ver docs/MONITOREO_N8N.md).
                </p>
              )}
            </ChannelCard>

            {/* Acciones de prueba */}
            <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center shadow-lg shadow-gold-900/40 ring-1 ring-white/10">
                  <i className="fas fa-vial text-white text-sm" />
                </div>
                <h3 className="text-xl font-black text-white">Pruebas manuales</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="email"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    placeholder="Destinatario (vacío = tu email)"
                    aria-label="Destinatario del email de prueba"
                    className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                  <button
                    onClick={runEmailTest}
                    disabled={sendingEmail}
                    className="shrink-0 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white transition-colors"
                  >
                    {sendingEmail ? 'Enviando...' : 'Email'}
                  </button>
                </div>
                <button
                  onClick={runWebhookTest}
                  disabled={sendingWebhook}
                  className="w-full px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-white transition-colors"
                >
                  {sendingWebhook ? 'Enviando...' : 'Probar webhook'}
                </button>
              </div>
            </div>
          </div>

          {feedback && (
            <div
              role="status"
              className={`p-4 rounded-2xl border text-sm font-bold ${
                feedback.kind === 'ok'
                  ? 'border-green-500/30 bg-green-950/30 text-green-400'
                  : 'border-red-500/30 bg-red-950/30 text-red-400'
              }`}
            >
              {feedback.text}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificacionesView;
