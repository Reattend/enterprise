// Marketing-page auth-state script.
//
// Loaded on every public marketing page (landing, sandbox, support,
// integrations, pricing). On page load it asks NextAuth whether the
// visitor has a session; if yes, it collapses the topbar CTA cluster
// (Sign in / Try for free / Book a demo) down to a single "Go to
// dashboard" button.
//
// Runs as a deferred script — DOM is parsed by the time this fires.

(function () {
  if (typeof fetch !== 'function') return;
  fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.user) return;
      // The topbar's CTA cluster is the last direct child of .topbar-inner
      // (a flex row holding 2-3 buttons). Stable across all marketing pages.
      var inner = document.querySelector('.topbar .topbar-inner');
      if (!inner) return;
      var cluster = inner.lastElementChild;
      if (!cluster) return;
      cluster.innerHTML =
        '<a class="btn btn-primary btn-fill" href="/app" style="text-decoration:none;">Go to dashboard</a>';
    })
    .catch(function () { /* silent */ });
})();
