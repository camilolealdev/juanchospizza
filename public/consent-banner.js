// ══════════════════════════════════════════════════════════════════════════
//  Banner de Consentimiento — Ley 1581/2012 (Habeas Data, Colombia)
//
//  Aparece en el primer load solo si el usuario aún no ha decidido.
//  La preferencia se persiste en localStorage Y se reporta al backend
//  vía POST /api/consent (capturando IP y UA para evidencia de consentimiento,
//  exigido por la SIC).
//
//  Cumple:
//   - Artículo 7: consentimiento expreso del titular antes de Tratamiento
//     de Datos Personales.
//   - Decreto 1377/2013: el responsable debe conservar prueba del
//     consentimiento (acá: tabla clients.consent_at + consent_ip +
//     consent_user_agent, migración #005).
//
//  NO bloquea campos sensibles del carrito/compra para no romper conversión:
//  el visitante puede navegar el menú y precios libremente. Sólo cuando
//  acepta (o persiste "rechazar marketing"), se decide qué datos pueden
//  recolectarse para Pedidos / Notificaciones Push.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  var STORAGE_KEY = 'juanchos_consent_v1';
  var banner = null;
  var decisions = loadDecisions();

  function loadDecisions() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && typeof stored === 'object') return stored;
    } catch (_e) {
      /* localStorage corrupto o inaccesible -- tratar como sin decisión */
    }
    return { privacy: null, marketing: null, recordedAt: null };
  }

  function saveDecisions(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_e) {
      /* modo privado -- sin persistencia, banner reaparece cada load */
    }
    decisions = next;
  }

  function hasAnyDecision() {
    return decisions.privacy !== null || decisions.marketing !== null;
  }

  function sendToBackend(consentType, granted) {
    // POST sin autenticación (endpoint público). Best-effort: si el backend
    // está caído, la preferencia local sigue contando, simplemente no hay
    // evidencia server-side de este evento específico.
    try {
      var body = JSON.stringify({
        consent_type: consentType,
        granted: !!granted,
        path: window.location.pathname,
      });
      fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        credentials: 'include',
      }).catch(function () {
        /* silencioso -- el cliente puede usar el sitio localmente */
      });
    } catch (_e) {
      /* silencioso */
    }
  }

  function buildStyles() {
    var css =
      '#juanchos-consent-banner{position:fixed;left:0;right:0;bottom:0;z-index:20000;' +
      'background:rgba(20,11,7,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);' +
      'border-top:2px solid rgba(192,57,43,.6);color:#F4EFEA;font-family:"Poppins",sans-serif;' +
      'padding:18px 22px;box-shadow:0 -10px 30px rgba(0,0,0,.5);display:flex;gap:18px;' +
      'flex-wrap:wrap;align-items:center;justify-content:space-between;animation:jc-slideUp .4s ease both}' +
      '@keyframes jc-slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}' +
      '#juanchos-consent-banner .jc-text{flex:1;min-width:280px;font-size:13px;line-height:1.5}' +
      '#juanchos-consent-banner .jc-text strong{color:#F9DC5C;font-size:11px;letter-spacing:1.5px;' +
      'text-transform:uppercase;display:block;margin-bottom:6px}' +
      '#juanchos-consent-banner .jc-text a{color:#F9DC5C;text-decoration:underline}' +
      '#juanchos-consent-banner .jc-buttons{display:flex;gap:10px;flex-wrap:wrap}' +
      '#juanchos-consent-banner button{font-family:inherit;font-size:11px;font-weight:700;' +
      'text-transform:uppercase;letter-spacing:1.2px;padding:12px 18px;border-radius:999px;' +
      'border:none;cursor:pointer;transition:all .2s ease}' +
      '#juanchos-consent-banner .jc-accept-all{background:#C0392B;color:#fff}' +
      '#juanchos-consent-banner .jc-accept{background:rgba(255,255,255,.08);color:#F4EFEA;' +
      'border:1px solid rgba(255,255,255,.18)}' +
      '#juanchos-consent-banner .jc-reject{background:transparent;color:#bbb;' +
      'border:1px solid rgba(255,255,255,.12)}' +
      '#juanchos-consent-banner button:hover{transform:translateY(-1px)}' +
      '#juanchos-consent-banner .jc-accept-all:hover{background:#962D22}' +
      '#juanchos-consent-banner .jc-details{font-size:10px;color:#999;margin-top:6px;display:block;' +
      'letter-spacing:.5px}';
    return css;
  }

  function injectBanner() {
    if (banner) return;
    var styleEl = document.createElement('style');
    styleEl.setAttribute('data-jc-consent', 'true');
    styleEl.textContent = buildStyles();
    document.head.appendChild(styleEl);

    banner = document.createElement('div');
    banner.id = 'juanchos-consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Aviso de privacidad y consentimiento');
    banner.innerHTML =
      '<div class="jc-text">' +
      '<strong>Tu privacidad — Ley 1581 de 2012 (Colombia)</strong>' +
      'Tratamos tus datos personales para gestionar pedidos, entregas y notificaciones sobre tu cuenta. ' +
      '¿Autorizas el tratamiento de tus datos según nuestra ' +
      '<a href="/politica-de-privacidad" target="_blank" rel="noopener">política de privacidad</a>' +
      ' y los términos de la SIC?' +
      '<span class="jc-details">Puedes cambiar tu decisión cuando quieras desde el pie de página.</span>' +
      '</div>' +
      '<div class="jc-buttons">' +
      '<button class="jc-accept-all" data-jc-action="accept-all">Aceptar todo</button>' +
      '<button class="jc-accept" data-jc-action="accept-privacy">Solo lo necesario</button>' +
      '<button class="jc-reject" data-jc-action="reject">Rechazar marketing</button>' +
      '</div>';
    document.body.appendChild(banner);

    banner.querySelectorAll('button[data-jc-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-jc-action');
        decide(action);
      });
    });
  }

  function decide(action) {
    var now = new Date().toISOString();
    var next = Object.assign({}, decisions, { recordedAt: now });
    if (action === 'accept-all') {
      next.privacy = true;
      next.marketing = true;
      sendToBackend('all', true);
    } else if (action === 'accept-privacy') {
      next.privacy = true;
      next.marketing = false;
      sendToBackend('privacy_only', true);
      sendToBackend('marketing', false);
    } else if (action === 'reject') {
      next.privacy = true;
      next.marketing = false;
      sendToBackend('marketing', false);
    }
    saveDecisions(next);
    if (banner) {
      banner.style.transition = 'transform .3s ease, opacity .3s ease';
      banner.style.transform = 'translateY(100%)';
      banner.style.opacity = '0';
      setTimeout(function () {
        if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
        banner = null;
      }, 320);
    }
  }

  function init() {
    if (hasAnyDecision()) return;
    injectBanner();
  }

  // Exponer API mínima para que el bundle React u otros scripts puedan
  // reabrir el banner manualmente (ej. link "Cambiar privacidad" en footer).
  window.JuanchosConsent = {
    reopen: function () {
      saveDecisions({ privacy: null, marketing: null, recordedAt: null });
      injectBanner();
    },
    decisions: function () {
      return Object.assign({}, decisions);
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
