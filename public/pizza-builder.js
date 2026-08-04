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
};
const PATH_TO_PAGE = { '/': 'inicio', '/crea-tu-pizza': 'crea-tu-pizza', '/menu': 'menu', '/domicilios': 'domicilios', '/carrito': 'carrito' };

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
