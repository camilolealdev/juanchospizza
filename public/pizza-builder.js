// ══════════════════════════════════════════════════════════════════════════
//  Vanilla Page Navigation
//  Extraído de index.html en Sprint S2 (Habeas Data + CSP). El armador de
//  pizza (antes acá + un builder "avanzado" duplicado y desincronizado de la
//  DB) fue reemplazado por src/components/PizzaBuilder.tsx (React), montado
//  vía portal en #pizza-builder-mount y en el modal "Personalizar" de
//  MenuDigital.tsx -- ambos usan CartContext.addToCart directamente, así que
//  el puente window.__pizzaBuilderAddToCart ya no tiene consumidores y se
//  quitó junto con su contraparte en CartContext.tsx.
// ══════════════════════════════════════════════════════════════════════════

// Badge del carrito en el nav estático -- sembrado desde localStorage para
// el primer paint (antes de que React/CartContext hidrate), luego mantenido
// en vivo por el listener 'cart-updated' que CartContext despacha en cada
// cambio del carrito.
let itemsInCart = parseInt(localStorage.getItem('juanchos_cart') || '0') || 0;
const cartCounter = document.getElementById('cartCounter');
if (cartCounter) cartCounter.textContent = itemsInCart;

window.addEventListener('cart-updated', function (e) {
  if (cartCounter) cartCounter.textContent = e.detail.toString();
});

// Page navigation (vanilla). No choca con React porque #root no muestra
// /menu /crea-tu-pizza /domicilios /carrito -- esos los renderizan los
// portals createPortal en App.tsx.
const PAGE_PATHS = {
    'inicio': '/',
    'crea-tu-pizza': '/crea-tu-pizza',
    'menu': '/menu',
    'domicilios': '/domicilios',
    'carrito': '/carrito',
    'politica-de-privacidad': '/politica-de-privacidad',
    'terminos-y-condiciones': '/terminos-y-condiciones',
    'eliminacion-de-datos': '/eliminacion-de-datos',
};
const PATH_TO_PAGE = {
    '/': 'inicio',
    '/crea-tu-pizza': 'crea-tu-pizza',
    '/menu': 'menu',
    '/domicilios': 'domicilios',
    '/carrito': 'carrito',
    '/politica-de-privacidad': 'politica-de-privacidad',
    '/terminos-y-condiciones': 'terminos-y-condiciones',
    '/eliminacion-de-datos': 'eliminacion-de-datos',
};

// ── SEO por página (SPA de un solo index.html) ─────────────────────
// Cada página actualiza document.title, la meta description y el
// canonical en tiempo real, para que Google/Meta indexen la URL
// correcta con su título y descripción propios.
var SITE_ORIGIN = 'https://juanchospizza.com';
var PAGE_SEO = {
    'inicio': {
        title: "Juancho's Pizza y Comidas Rápidas - Nemocón & Zipaquirá",
        description: "Juancho's Pizza con sedes en Nemocón y Zipaquirá. Pizzas artesanales, lasañas y spaguettis. Domicilios rápidos. Pizzería en Nemocón y Zipaquirá, Cundinamarca.",
    },
    'politica-de-privacidad': {
        title: "Política de Privacidad | Juancho's Pizza",
        description: "Política de Tratamiento de Datos Personales de Juancho's Pizza conforme a la Ley 1581 de 2012. Conoce qué datos recopilamos, para qué y cómo ejercer tus derechos.",
    },
    'terminos-y-condiciones': {
        title: "Términos y Condiciones | Juancho's Pizza",
        description: "Términos y Condiciones de Juancho's Pizza conforme a la Ley 1480 de 2011. Pedidos, pagos, domicilios, derecho de retracto y reversión de pago.",
    },
    'eliminacion-de-datos': {
        title: "Eliminación de Datos | Juancho's Pizza",
        description: "Solicita la eliminación de tus datos personales en Juancho's Pizza. Derecho a la supresión conforme al artículo 15 de la Ley 1581 de 2012.",
    },
};

function applyPageSeo(pageId) {
    var seo = PAGE_SEO[pageId];
    if (!seo) return;
    if (seo.title) document.title = seo.title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta && seo.description) meta.setAttribute('content', seo.description);
    var canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    var canonicalUrl = SITE_ORIGIN + (PAGE_PATHS[pageId] === '/' ? '/' : PAGE_PATHS[pageId]);
    canonical.href = canonicalUrl;
}

function showPage(pageId, skipPushState) {
    document.querySelectorAll('.page-container').forEach(function(el) {
        el.classList.remove('active');
    });
    var page = document.querySelector('.page-container[data-page="' + pageId + '"]');
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-links a[data-nav-page]').forEach(function(a) {
        a.style.color = '';
        a.style.fontWeight = '';
    });
    var activeLink = document.querySelector('.nav-links a[data-nav-page="' + pageId + '"]');
    if (activeLink) {
        activeLink.style.color = 'var(--amarillo-calido)';
        activeLink.style.fontWeight = '700';
    }
    if (!skipPushState && PAGE_PATHS[pageId] && window.location.pathname !== PAGE_PATHS[pageId]) {
        history.pushState({ page: pageId }, '', PAGE_PATHS[pageId]);
    }
    applyPageSeo(pageId);
    // Las páginas legales son documentos largos: siempre abren desde arriba.
    if (pageId === 'politica-de-privacidad' || pageId === 'terminos-y-condiciones' || pageId === 'eliminacion-de-datos') {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }
}

window.addEventListener('popstate', function() {
    var target = PATH_TO_PAGE[window.location.pathname];
    if (target) showPage(target, true);
});

// Navegación delegada -- reemplaza los onclick="" inline que index.html tenía
// antes (logo, nav links, botón carrito, CTA del hero). CSP en producción no
// permite 'unsafe-inline' en script-src, así que esos atributos quedaban
// bloqueados en silencio; data-nav-page + un solo listener delegado cubre
// los mismos 8 elementos sin necesitar nonce/hash.
document.addEventListener('click', function(e) {
  const target = e.target.closest('[data-nav-page]');
  if (!target) return;
  e.preventDefault();
  showPage(target.dataset.navPage);
});

const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const headerEl = document.querySelector('header');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => navMenu.classList.toggle('active'));
    document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => navMenu.classList.remove('active')));
}

if (headerEl) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) headerEl.classList.add('scrolled');
        else headerEl.classList.remove('scrolled');
    });
}

(function initialPage() {
    var initial = PATH_TO_PAGE[window.location.pathname];
    showPage(initial || 'inicio', true);
})();
