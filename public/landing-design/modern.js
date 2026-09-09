(() => {
  const $ = (s) => document.querySelector(s);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduceMotion) {
    document.documentElement.classList.add('js-motion');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
  const menuToggle = $('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const open = $('.site-header nav').classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.site-header nav a').forEach(a => a.addEventListener('click', () => {
      $('.site-header nav').classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }));
  }
  const memories = [
    ['What if onboarding felt like a conversation?', 'Instead of a checklist, welcome people with one thoughtful question: “What would you like to make room for?” Let their answer shape the first experience. Connected to: customer feedback, design sync, and first-run experience.'],
    ['The good stuff from our design sync', 'We agreed to simplify the first-run experience: one clear action, an optional tour, and a useful example. Next step: explore a conversational welcome. Decision recorded in the design sync and linked to the onboarding idea.'],
    ['A thread worth following', 'Your onboarding idea and the design sync both point to the same insight: people want to feel understood before they learn a new tool. Explore a welcome that starts with their goals, then introduces the features that help.']
  ];
  const dialog = $('#memory-dialog');
  const openMemory = (index) => {
    $('#memory-title').textContent = memories[index][0];
    $('#memory-detail').textContent = memories[index][1];
    dialog.showModal();
  };
  document.querySelectorAll('[data-memory]').forEach(button => button.addEventListener('click', () => openMemory(Number(button.dataset.memory))));
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  $('#connection-button').addEventListener('click', () => openMemory(2));
  $('#explore-button').addEventListener('click', () => openMemory(2));
  const views = {
    overview: ['A little clarity, Jamie ✳', 'Pick up a thought. Follow a connection. Make something great.', 'Fresh in your mind'],
    memories: ['Everything worth keeping.', 'Your sample memories, together in one thoughtful space.', 'Your memory collection'],
    connections: ['Follow a little curiosity.', 'Different thoughts. Shared threads. A new way to see what you know.', 'Connected by: a better first impression']
  };
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-selected', String(b === button)));
    const view = views[button.dataset.view];
    $('#view-title').textContent = view[0]; $('#view-subtitle').textContent = view[1]; $('#cards-title').textContent = view[2];
    $('.preview-top .muted').textContent = '/ ' + button.querySelector('span').textContent;
    $('.connection-strip').style.borderColor = button.dataset.view === 'connections' ? '#9ab782' : '';
  }));
  $('#ask-form').addEventListener('submit', event => {
    event.preventDefault();
    const query = $('#ask-input').value.trim();
    if (!query) { $('#ask-input').focus(); return; }
    const answer = $('#answer'); answer.hidden = false;
    answer.textContent = /onboard|design|welcome|customer|decision/i.test(query)
      ? '✧ In this sample workspace, the team decided to make onboarding feel more human: one clear action, an optional tour, and a welcome based on personal goals. Sources: Design sync + Onboarding idea.'
      : '✧ This interactive preview contains two sample memories about onboarding and a design sync. Try “What did we decide about onboarding?” Create your workspace to ask questions across your own knowledge.';
  });
  $('#search-trigger').addEventListener('click', () => $('#ask-input').focus());
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !dialog.open) { event.preventDefault(); $('#workspace').scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth' }); $('#ask-input').focus({ preventScroll: true }); }
    if (event.key === 'Escape' && menuToggle) {
      $('.site-header nav').classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelectorAll('[data-audience]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-audience]').forEach(b => b.setAttribute('aria-selected', String(b === button)));
    $('#audience-copy').textContent = button.dataset.audience === 'personal'
      ? 'Save your inspiration, connect your side projects, and return to an idea exactly where you left it.'
      : 'Keep decisions, conversations, and project context connected. Give everyone a shared place to find the why behind the work.';
  }));
  // Support keyboard navigation for both tab groups.
  document.querySelectorAll('[role="tablist"]').forEach(group => {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    const sync = () => tabs.forEach(tab => tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1);
    sync();
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', sync);
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); tabs[next].click(); tabs[next].focus(); }
      });
    });
  });
  fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(session => {
    if (!session?.user) return;
    document.querySelectorAll('a[href="/register"]').forEach(a => { a.href = '/app'; a.textContent = 'Open your workspace ↗'; });
    const login = $('.nav-actions a[href="/login"]'); if (login) login.hidden = true;
  }).catch(() => {});
})();
