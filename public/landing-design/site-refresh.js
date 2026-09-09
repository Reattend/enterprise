(function () {
  if (typeof document === 'undefined') return;

  function init() {
    var previewRoot = '/landing-design/';
    var previewRoutes = {
      '/': 'landing.html',
      '/about': 'about.html',
      '/app': 'landing.html',
      '/blog': 'coming-soon.html?topic=Blog',
      '/coming-soon': 'coming-soon.html',
      '/compliance': 'compliance.html',
      '/game': 'game.html',
      '/glossary': 'coming-soon.html?topic=Glossary',
      '/help': 'support.html',
      '/integrations': 'integrations.html',
      '/login': 'signin.html',
      '/personal': 'personal.html',
      '/personal/pricing': 'personal-pricing.html',
      '/pricing': 'pricing.html',
      '/privacy': 'privacy.html',
      '/product': 'product.html',
      '/register': 'coming-soon.html?topic=Create%20account',
      '/sandbox': 'sandbox.html',
      '/support': 'support.html',
      '/terms': 'terms.html',
      '/tool': 'tool.html'
    };

    if (window.location.pathname.indexOf(previewRoot) === 0) {
      var resolvePreviewDestination = function (rawHref) {
        var destination = new URL(rawHref, window.location.href);
        if (destination.origin !== window.location.origin) return null;

        var route = previewRoutes[destination.pathname];
        if (destination.pathname === '/' && destination.hash === '#product') {
          route = 'product.html';
          destination.hash = '';
        }
        if (destination.pathname === previewRoot + 'Compliance.html') route = 'compliance.html';
        if (!route) return null;

        var target = new URL(previewRoot + route, window.location.origin);
        if (destination.search) target.search = destination.search;
        target.hash = destination.hash;
        return target;
      };

      var rewritePreviewLinks = function (root) {
        var links = root.matches && root.matches('a[href]') ? [root] : root.querySelectorAll('a[href]');
        links.forEach(function (link) {
          var target = resolvePreviewDestination(link.getAttribute('href'));
          if (target) link.href = target.href;
        });
      };

      rewritePreviewLinks(document);

      new MutationObserver(function (records) {
        records.forEach(function (record) {
          record.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) rewritePreviewLinks(node);
          });
        });
      }).observe(document.body, { childList: true, subtree: true });

      document.addEventListener('click', function (event) {
        var link = event.target.closest('a[href]');
        if (!link || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var destination = resolvePreviewDestination(link.getAttribute('href'));
        if (!destination) return;

        event.preventDefault();
        window.location.href = destination.href;
      });
    }

    var header = document.querySelector('.topbar');
    if (header) {
      var headerBrand = header.querySelector('.brand');
      if (headerBrand && !headerBrand.querySelector('.brand-word')) {
        var wordmark = document.createElement('span');
        wordmark.className = 'brand-word';
        wordmark.textContent = 'Reattend';
        headerBrand.appendChild(wordmark);
      }

      var syncHeader = function () {
        header.classList.toggle('has-scrolled', window.scrollY > 12);
      };
      syncHeader();
      window.addEventListener('scroll', syncHeader, { passive: true });
    }

    document.querySelectorAll('footer a, .nav a').forEach(function (link) {
      link.addEventListener('focus', function () { link.classList.add('keyboard-focus'); });
      link.addEventListener('blur', function () { link.classList.remove('keyboard-focus'); });
    });

    var revealItems = document.querySelectorAll('[data-reveal]');
    if (revealItems.length) {
      if (!('IntersectionObserver' in window)) {
        revealItems.forEach(function (item) { item.classList.add('is-visible'); });
      } else {
        var revealObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          });
        }, { threshold: 0.02 });
        revealItems.forEach(function (item) { revealObserver.observe(item); });
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
