import webPush from 'web-push';

let pushEnabled = false;

// A missing/invalid VAPID config must never crash the server (this is the
// exact bug found in the reference Next.js project: it called
// setVapidDetails() unconditionally at module load and took down the whole
// production build when the env vars were unset). Push is best-effort.
export function initPush() {
  const { VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;

  if (!VAPID_MAILTO || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️  Push notifications disabled: falta VAPID_MAILTO/VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY');
    return;
  }

  try {
    webPush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    pushEnabled = true;
    console.log('✅ Push notifications enabled');
  } catch (e) {
    console.warn('⚠️  Push notifications disabled: VAPID config inválida:', e.message);
  }
}

export function isPushEnabled() {
  return pushEnabled;
}

// Envía una notificación a todas las suscripciones registradas para un
// teléfono. Nunca lanza: cada fallo se loguea y las suscripciones
// caducadas/inválidas (404/410) se limpian solas.
export async function sendPushToPhone(pool, phone, payload) {
  if (!pushEnabled || !phone) return;

  try {
    const subs = await pool.query('SELECT * FROM push_subscriptions WHERE phone = $1', [phone]);
    for (const sub of subs.rows) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          JSON.stringify(payload)
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]).catch(() => {});
        } else {
          console.error('Push send error:', err.message);
        }
      }
    }
  } catch (e) {
    console.error('Push lookup error:', e.message);
  }
}
