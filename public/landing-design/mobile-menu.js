// Marketing-page mobile drawer.
//
// On every public marketing page, injects:
//   1. A hamburger trigger button into the topbar (visible only <760px via CSS).
//   2. A right-edge drawer + backdrop into <body>, populated with copies of
//      the nav links and the CTA buttons from the topbar.
//
// Runs deferred so the DOM is parsed when this fires. No-ops if the topbar
// is missing (signin.html for example) or the drawer was already injected
// (idempotent — safe if loaded twice).

(function () {
  if (typeof document === 'undefined') return;

  function init() {
    var inner = document.querySelector('.topbar .topbar-inner');
    if (!inner) return;
    if (document.querySelector('.mobile-menu-trigger')) return; // already injected

    // Find the source elements we'll mirror into the drawer.
    var srcNav = inner.querySelector('.nav');
    var srcCta = inner.lastElementChild;
    // If the brand IS the last element (one-element topbar), bail.
    if (srcCta === srcNav || srcCta === inner.firstElementChild) srcCta = null;

    // ── Build the trigger button ──
    var trigger = document.createElement('button');
    trigger.className = 'mobile-menu-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Open menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<line x1="3" y1="6" x2="21" y2="6"/>' +
      '<line x1="3" y1="12" x2="21" y2="12"/>' +
      '<line x1="3" y1="18" x2="21" y2="18"/>' +
      '</svg>';
    inner.appendChild(trigger);

    // ── Build the backdrop ──
    var backdrop = document.createElement('div');
    backdrop.className = 'mobile-menu-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    // ── Build the drawer ──
    var drawer = document.createElement('aside');
    drawer.className = 'mobile-menu-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Site navigation');

    // Header: brand + close
    var brandSrc = inner.querySelector('.brand');
    var head = document.createElement('div');
    head.className = 'mm-head';
    var brandClone = brandSrc ? brandSrc.cloneNode(true) : document.createElement('span');
    brandClone.className = 'mm-brand';
    head.appendChild(brandClone);
    var close = document.createElement('button');
    close.className = 'mm-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close menu');
    close.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<line x1="18" y1="6" x2="6" y2="18"/>' +
      '<line x1="6" y1="6" x2="18" y2="18"/>' +
      '</svg>';
    head.appendChild(close);
    drawer.appendChild(head);

    // Nav section
    if (srcNav) {
      var navLabel = document.createElement('div');
      navLabel.className = 'mm-section-label';
      navLabel.textContent = 'Browse';
      drawer.appendChild(navLabel);
      var nav = document.createElement('nav');
      nav.className = 'mm-nav';
      // Copy each nav-item as a plain link
      var items = srcNav.querySelectorAll('a');
      items.forEach(function (a) {
        var link = document.createElement('a');
        link.href = a.getAttribute('href') || '#';
        link.textContent = a.textContent.trim();
        if (a.hasAttribute('target')) link.setAttribute('target', a.getAttribute('target'));
        if (a.hasAttribute('rel')) link.setAttribute('rel', a.getAttribute('rel'));
        nav.appendChild(link);
      });
      drawer.appendChild(nav);
    }

    // CTA section (mirror the topbar's button cluster)
    if (srcCta) {
      var ctaWrap = document.createElement('div');
      ctaWrap.className = 'mm-cta';
      var ctaItems = srcCta.querySelectorAll('a, button');
      ctaItems.forEach(function (el) {
        var href = el.getAttribute('href') || '#';
        var link = document.createElement('a');
        link.href = href;
        link.textContent = el.textContent.trim();
        if (el.hasAttribute('target')) link.setAttribute('target', el.getAttribute('target'));
        if (el.hasAttribute('rel')) link.setAttribute('rel', el.getAttribute('rel'));
        // Style by hint from the source class names.
        var srcClasses = el.className || '';
        if (/btn-primary|btn-fill/.test(srcClasses)) {
          link.className = 'mm-primary';
        } else if (/btn-outline/.test(srcClasses)) {
          link.className = 'mm-secondary';
        } else {
          link.className = 'mm-ghost';
        }
        ctaWrap.appendChild(link);
      });
      drawer.appendChild(ctaWrap);
    }

    document.body.appendChild(drawer);

    // ── Wire open/close ──
    function open() {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      document.body.classList.add('mm-open');
      drawer.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.classList.remove('mm-open');
      drawer.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', open);
    close.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
    // Esc key closes the drawer
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });
    // Auto-close on resize back to desktop so the drawer doesn't linger.
    var mql = window.matchMedia('(min-width: 761px)');
    mql.addEventListener
      ? mql.addEventListener('change', function (ev) { if (ev.matches) closeDrawer(); })
      : mql.addListener(function (ev) { if (ev.matches) closeDrawer(); });

    // If auth-cta.js later collapses the topbar's CTA cluster (for logged-in
    // users), re-build the drawer's CTA section so it also shows "Go to
    // dashboard". A small MutationObserver does the trick.
    var observer = new MutationObserver(function () {
      var newCta = inner.lastElementChild;
      if (newCta && newCta !== srcCta && newCta !== trigger) {
        // Remove old CTA wrap, rebuild from new source.
        var oldCta = drawer.querySelector('.mm-cta');
        if (oldCta) oldCta.remove();
        var ctaWrap2 = document.createElement('div');
        ctaWrap2.className = 'mm-cta';
        newCta.querySelectorAll('a, button').forEach(function (el) {
          var link = document.createElement('a');
          link.href = el.getAttribute('href') || '#';
          link.textContent = el.textContent.trim();
          link.className = 'mm-primary';
          ctaWrap2.appendChild(link);
        });
        drawer.appendChild(ctaWrap2);
      }
    });
    observer.observe(inner, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
