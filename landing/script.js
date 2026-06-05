(function () {
  'use strict';

  // ---------- HAMBURGER ----------
  const hamburger = document.getElementById('hamburgerBtn');
  const nav = document.getElementById('mainNav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', function () {
      this.classList.toggle('active');
      nav.classList.toggle('open');
      this.setAttribute('aria-label', nav.classList.contains('open') ? 'Cerrar menú' : 'Abrir menú');
    });

    document.querySelectorAll('.header__link').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('active');
        nav.classList.remove('open');
        hamburger.setAttribute('aria-label', 'Abrir menú');
      });
    });
  }

  // ---------- CART ----------
  let cartCount = 0;
  const countEl = document.getElementById('cartCount');
  const toastEl = document.getElementById('cartToast');
  const cartFloat = document.getElementById('cartFloat');

  function updateCart() {
    if (countEl) countEl.textContent = cartCount;
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastEl._hideTimer);
    toastEl._hideTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2200);
  }

  document.querySelectorAll('.add-to-cart').forEach(function (btn) {
    btn.addEventListener('click', function () {
      cartCount++;
      updateCart();
      var product = this.getAttribute('data-product') || 'Producto';
      showToast('\u2705 ' + product + ' a\u00f1adido al pedido');

      // pulse animation on cart float
      if (cartFloat) {
        cartFloat.style.transform = 'scale(1.25)';
        setTimeout(function () {
          cartFloat.style.transform = '';
        }, 250);
      }
    });
  });

  // scroll cart float to menu
  if (cartFloat) {
    cartFloat.addEventListener('click', function () {
      var menuSection = document.getElementById('menu');
      if (menuSection) menuSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ---------- SMOOTH SCROLL FOR OLD BROWSERS ----------
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ---------- INTERSECTION OBSERVER (reveal cards) ----------
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card').forEach(function (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(card);
    });
  }

})();
