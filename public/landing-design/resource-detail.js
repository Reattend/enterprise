(function () {
  if (typeof document === 'undefined') return;

  var resources = {
    'free-standup-bot': {
      title: 'Async Standup Bot',
      category: 'Slack app',
      glyph: '#',
      tint: '#eee4fb',
      description: 'Run focused daily standups in Slack without adding another meeting. Set the questions and schedule once; the team gets a clear summary automatically.',
      action: 'Build my standup',
      label: 'What should your team answer?',
      placeholder: 'What did you complete? What are you working on? What is blocked?',
      sample: 'Your standup is ready with three prompts and a 9:30 AM weekday schedule.',
      suggestions: ['Three quick prompts', 'Add a blocker check']
    },
    'tool/slack-memory-match': {
      title: 'Memory Match',
      category: 'Slack game',
      glyph: '◎',
      tint: '#e9f1ff',
      description: 'Reveal how differently teammates remember the same conversation. Collect anonymous recollections, compare the details and surface the context worth keeping.',
      action: 'Create a memory round',
      label: 'Name the moment to revisit',
      placeholder: 'The decision we made in Monday’s product review',
      sample: 'Round created. Invite your team and compare what everyone remembers.',
      suggestions: ['A recent decision', 'A customer conversation']
    },
    'free-meeting-recap': {
      title: 'Meeting Recap Collector',
      category: 'MS Teams app',
      glyph: '✓',
      tint: '#f3f7df',
      description: 'Collect decisions, action items and useful notes after every meeting, then turn them into one concise recap for the whole team.',
      action: 'Draft a recap',
      label: 'Paste rough meeting notes',
      placeholder: 'Decision: move the launch to Friday. Priya owns the migration checklist...',
      sample: 'Recap drafted with one decision, two action items and the original context.',
      suggestions: ['Capture decisions', 'Find action items']
    },
    'tool/memory-debt-calculator': {
      title: 'Memory Debt Calculator',
      category: 'Knowledge tool',
      glyph: '%',
      tint: '#f3f7df',
      description: 'Estimate how much knowledge your team is silently losing and see which gaps create the greatest operational risk.',
      action: 'Estimate memory debt',
      label: 'How many people are on your team?',
      placeholder: '25',
      sample: 'Assessment started. Your answers will produce a practical memory-risk score and action plan.',
      suggestions: ['Small team: 10', 'Growing team: 50']
    },
    'tool/decision-log-generator': {
      title: 'Decision Log Generator',
      category: 'Knowledge tool',
      glyph: '≡',
      tint: '#e7f4ea',
      description: 'Turn an informal outcome into a durable decision record with context, alternatives, rationale, owners and next steps.',
      action: 'Generate decision log',
      label: 'What did your team decide?',
      placeholder: 'We chose OIDC instead of SAML for the first release because...',
      sample: 'Decision record created with rationale, rejected alternatives, owner and review date.',
      suggestions: ['Include alternatives', 'Add a review date']
    },
    'tool/brain-dump-organizer': {
      title: 'Brain Dump Organizer',
      category: 'Thinking tool',
      glyph: '✳',
      tint: '#ffead8',
      description: 'Put every loose thought in one place and sort it into tasks, decisions, ideas and questions without interrupting your flow.',
      action: 'Organize my thoughts',
      label: 'What is on your mind?',
      placeholder: 'Follow up with Maya, rethink the onboarding question, book the research call...',
      sample: 'Organized into three tasks, one open question and two ideas to revisit.',
      suggestions: ['Sort by urgency', 'Group by project']
    },
    'tool/context-recall-timeline': {
      title: 'Context Recall Timeline',
      category: 'Knowledge tool',
      glyph: '↝',
      tint: '#eee4fb',
      description: 'Reconstruct what happened and when. Arrange meetings, decisions and notes into a timeline that preserves cause and effect.',
      action: 'Build my timeline',
      label: 'Describe the events',
      placeholder: 'Customer call on Monday, pricing decision Wednesday, proposal sent Friday...',
      sample: 'Timeline built with three events, two causal links and one missing-context prompt.',
      suggestions: ['Project history', 'Customer timeline']
    },
    'record': {
      title: 'Meeting Recorder',
      category: 'Recording tool',
      glyph: '●',
      tint: '#ffe9e3',
      description: 'Record a browser meeting and create a transcript, summary, decisions and action items without installing another app.',
      action: 'Prepare recorder',
      label: 'Name this recording',
      placeholder: 'Weekly product review',
      sample: 'Recorder is ready. Choose the browser tab or window you want to capture.',
      suggestions: ['Product review', 'Customer interview']
    },
    'free-screen-recorder': {
      title: 'Screen Recorder',
      category: 'Recording tool',
      glyph: '▣',
      tint: '#e9f1ff',
      description: 'Record your screen with one click, keep the result private and download the finished video immediately.',
      action: 'Prepare screen capture',
      label: 'Name this recording',
      placeholder: 'Design walkthrough',
      sample: 'Screen capture is ready. Select a window, tab or full display to begin.',
      suggestions: ['Product demo', 'Bug walkthrough']
    },
    'free-voice-recorder': {
      title: 'Voice Recorder',
      category: 'Recording tool',
      glyph: '♬',
      tint: '#ffead8',
      description: 'Capture a voice memo directly in your browser. It is simple, private and remains available when you are offline.',
      action: 'Prepare voice memo',
      label: 'Name this voice memo',
      placeholder: 'Idea from my walk',
      sample: 'Voice memo is ready. Allow microphone access when you are ready to record.',
      suggestions: ['Quick thought', 'Meeting reflection']
    },
    'free-daily-planner': {
      title: 'Daily Planner',
      category: 'Productivity tool',
      glyph: '□',
      tint: '#e7f4ea',
      description: 'Plan priorities, time blocks and focus sessions in a calm daily workspace that keeps the important work visible.',
      action: 'Plan my day',
      label: 'What matters most today?',
      placeholder: 'Finish the research brief before lunch',
      sample: 'Your day now has one priority, two focus blocks and room for follow-up work.',
      suggestions: ['Deep work morning', 'Add three priorities']
    },
    'free-work-journal': {
      title: 'Work Journal',
      category: 'Productivity tool',
      glyph: '✎',
      tint: '#eee4fb',
      description: 'Capture what you accomplished, learned and want to carry forward, creating a useful record of your work over time.',
      action: 'Create today’s entry',
      label: 'What changed today?',
      placeholder: 'Shipped the new flow, learned why customers pause at step three...',
      sample: 'Journal entry created with an accomplishment, a lesson and one follow-up.',
      suggestions: ['Daily reflection', 'Weekly review']
    },
    'free-timeline-maker': {
      title: 'Timeline Maker',
      category: 'Productivity tool',
      glyph: '↔',
      tint: '#ffe4ee',
      description: 'Create a polished timeline for projects, launches and milestones, then export it for the people who need the full story.',
      action: 'Create a timeline',
      label: 'List your milestones',
      placeholder: 'Research — Sep 12; Prototype — Sep 19; Launch — Oct 03',
      sample: 'Timeline created with three milestones and a clean share-ready layout.',
      suggestions: ['Project plan', 'Launch history']
    },
    'free-meeting-cost-calculator': {
      title: 'Meeting Cost Calculator',
      category: 'Management tool',
      glyph: '$',
      tint: '#f3f7df',
      description: 'See the true cost of recurring meetings across a week, month and year so your team can make time more intentionally.',
      action: 'Calculate meeting cost',
      label: 'People × minutes × average hourly cost',
      placeholder: '8 people, 60 minutes, $50 per hour',
      sample: 'This meeting costs about $400 per session and $20,800 across a working year.',
      suggestions: ['Weekly team sync', 'Daily status meeting']
    },
    'free-raci-chart-generator': {
      title: 'RACI Chart Generator',
      category: 'Management tool',
      glyph: '⊞',
      tint: '#e7f4ea',
      description: 'Map who is responsible, accountable, consulted and informed for each task, then export a clear matrix as a PDF.',
      action: 'Generate RACI chart',
      label: 'Describe the work and people',
      placeholder: 'Launch page — Maya, Arjun, Lina; analytics — Sam, Lina...',
      sample: 'RACI matrix created with clear ownership and two responsibility conflicts highlighted.',
      suggestions: ['Product launch', 'Client onboarding']
    },
    'free-one-on-one-template': {
      title: '1-on-1 Meeting Template',
      category: 'Management tool',
      glyph: '1:1',
      tint: '#e9f1ff',
      description: 'Build a thoughtful one-on-one agenda with proven questions, space for context and a clear record of follow-ups.',
      action: 'Build my agenda',
      label: 'What should this conversation cover?',
      placeholder: 'Progress, energy, current blockers and growth goals',
      sample: 'Agenda created with a check-in, three discussion prompts and follow-up space.',
      suggestions: ['Career conversation', 'Weekly check-in']
    },
    'free-retrospective-template': {
      title: 'Retrospective Template',
      category: 'Management tool',
      glyph: '↻',
      tint: '#ffead8',
      description: 'Create a retrospective that fits the moment, including Start/Stop/Continue, 4Ls and Mad/Sad/Glad formats.',
      action: 'Generate a retrospective',
      label: 'What is the team reflecting on?',
      placeholder: 'The September launch sprint',
      sample: 'Retrospective created with four prompts, a voting step and clear action-item ownership.',
      suggestions: ['Start/Stop/Continue', 'Mad/Sad/Glad']
    },
    'free-okr-template': {
      title: 'OKR Template',
      category: 'Management tool',
      glyph: '◎',
      tint: '#eee4fb',
      description: 'Turn a broad goal into a clear objective with measurable key results, owners and a review rhythm.',
      action: 'Create my OKR',
      label: 'What outcome are you aiming for?',
      placeholder: 'Make onboarding feel effortless for every new customer',
      sample: 'OKR drafted with one objective, three measurable key results and a monthly review.',
      suggestions: ['Company objective', 'Team objective']
    },
    'game/icebreaker-spinner': {
      title: 'Icebreaker Spinner',
      category: 'Team game',
      glyph: '↻',
      tint: '#ffead8',
      description: 'Spin the wheel and answer a question from four categories, moving naturally from light conversation to deeper connection.',
      action: 'Create a game',
      label: 'Name your team or gathering',
      placeholder: 'Friday design hangout',
      sample: 'Game ready with four question categories. Share the room link when everyone arrives.',
      suggestions: ['Keep it light', 'Mix in deeper questions'],
      game: true
    },
    'game/team-bingo': {
      title: 'Team Bingo',
      category: 'Team game',
      glyph: '⊞',
      tint: '#ffe4ee',
      description: 'Play “find someone who…” bingo with ready-made prompts or add your own details for a more personal round.',
      action: 'Build a bingo card',
      label: 'What group is playing?',
      placeholder: 'Our 20-person company offsite',
      sample: 'Bingo card created with 25 prompts and a shareable multiplayer room.',
      suggestions: ['Remote team', 'Company offsite'],
      game: true
    },
    'game/would-you-rather': {
      title: 'Would You Rather',
      category: 'Team game',
      glyph: '±',
      tint: '#e9f1ff',
      description: 'Vote on work-themed dilemmas, see where the team splits and discover the reasoning behind everyone’s choice.',
      action: 'Start a round',
      label: 'Name this room',
      placeholder: 'Product team social',
      sample: 'Room created with ten dilemmas, live voting and instant result reveals.',
      suggestions: ['Work edition', 'Wildcard edition'],
      game: true
    },
    'game/two-truths-one-lie': {
      title: 'Two Truths & A Lie',
      category: 'Team game',
      glyph: '◉',
      tint: '#e7f4ea',
      description: 'Each person shares three statements. The team votes on the lie and learns something memorable in the reveal.',
      action: 'Create a game',
      label: 'Who is playing?',
      placeholder: 'The customer success team',
      sample: 'Game ready. Invite at least three players to submit their statements.',
      suggestions: ['New team', 'Old friends'],
      game: true
    },
    'game/five-second-challenge': {
      title: '5-Second Challenge',
      category: 'Team game',
      glyph: '5',
      tint: '#ffe9e3',
      description: 'Name three things before the timer runs out. It sounds easy until five seconds becomes very, very short.',
      action: 'Start the timer',
      label: 'Name this match',
      placeholder: 'Friday five-second showdown',
      sample: 'Match created with mixed categories and a five-second round timer.',
      suggestions: ['Easy warm-up', 'Maximum chaos'],
      game: true
    },
    'game/this-or-that': {
      title: 'This or That',
      category: 'Team game',
      glyph: '⇆',
      tint: '#eee4fb',
      description: 'Make rapid-fire choices, compare the room and bond over the tiny preferences that divide a team.',
      action: 'Create a room',
      label: 'Who is this round for?',
      placeholder: 'The engineering team',
      sample: 'Room ready with 20 quick choices and live team splits.',
      suggestions: ['Work preferences', 'Just for fun'],
      game: true
    },
    'game/team-trivia': {
      title: 'Team Trivia',
      category: 'Team game',
      glyph: '?',
      tint: '#f6f0cf',
      description: 'Create custom trivia about your team or company and find out who really knows the people behind the work.',
      action: 'Build a trivia room',
      label: 'What is the trivia about?',
      placeholder: 'Our company, customers and memorable moments',
      sample: 'Trivia room created. Add questions or start with the suggested team pack.',
      suggestions: ['Company history', 'Know your team'],
      game: true
    },
    'game/hot-takes': {
      title: 'Hot Takes',
      category: 'Team game',
      glyph: '↑',
      tint: '#ffead8',
      description: 'Collect anonymous opinions, vote agree or disagree and uncover the room’s most surprising points of view.',
      action: 'Open submissions',
      label: 'Name this hot-takes room',
      placeholder: 'Our no-judgment Friday session',
      sample: 'Anonymous room created. Share the code and open voting when submissions are in.',
      suggestions: ['Work hot takes', 'Anything goes'],
      game: true
    },
    'game/guess-the-colleague': {
      title: 'Guess the Colleague',
      category: 'Team game',
      glyph: '⌕',
      tint: '#e3f4f2',
      description: 'Collect fun facts anonymously, then let everyone guess who each fact belongs to.',
      action: 'Create a guessing room',
      label: 'Which team is playing?',
      placeholder: 'The new operations team',
      sample: 'Room created. Invite four or more people to submit a fact.',
      suggestions: ['New team', 'Remote social'],
      game: true
    },
    'game/team-superlatives': {
      title: 'Team Superlatives',
      category: 'Team game',
      glyph: '★',
      tint: '#f6f0cf',
      description: 'Vote on playful “most likely to…” categories and celebrate the quirks that make your team distinctive.',
      action: 'Create superlatives',
      label: 'Name the group',
      placeholder: 'The marketing crew',
      sample: 'Game ready with 15 light-hearted categories and anonymous voting.',
      suggestions: ['Friendly awards', 'Custom categories'],
      game: true
    },
    'play': {
      title: 'Join a Team Game',
      category: 'Room access',
      glyph: '→',
      tint: '#eee4fb',
      description: 'Enter a room code and join the game from any phone or browser. No account and no app install required.',
      action: 'Join the room',
      label: 'Enter your room code',
      placeholder: 'ABC123',
      sample: 'Room found. Add your name and you are ready to play.',
      suggestions: ['Six-character code', 'Ask the host for help'],
      game: true
    }
  };

  function route(path) {
    return '/' + path.replace(/\.html$/, '').replace(/\/$/, '');
  }

  function header() {
    return [
      '<a class="skip" href="#main">Skip to content</a>',
      '<header class="topbar"><div class="topbar-inner">',
      '<a class="brand" href="/" aria-label="Reattend home"><img class="brand-logo" src="/landing-design/black_logo.svg" alt="" width="30" height="30"><span class="brand-word">Reattend</span></a>',
      '<nav class="nav" aria-label="Main navigation"><a class="nav-item" href="/">Home</a><a class="nav-item" href="/product">Product</a><a class="nav-item" href="/integrations">Integrations</a><a class="nav-item" href="/pricing">Pricing</a><a class="nav-item" href="/compliance">Compliance</a></nav>',
      '<div style="display:flex;gap:8px;"><a class="btn btn-ghost" href="/login">Sign in</a><a class="btn btn-outline" href="/sandbox">Sandbox</a><a class="btn btn-primary btn-fill" href="https://calendly.com/pb-reattend/30min" target="_blank" rel="noreferrer">Book a demo</a></div>',
      '</div></header>'
    ].join('');
  }

  function footer() {
    return [
      '<footer><div class="footer-grid">',
      '<div class="footer-col footer-brand"><a class="brand" href="/"><img class="brand-logo" src="/landing-design/black_logo.svg" alt="" width="30" height="30"><span class="brand-word">Reattend</span></a><p>Organizational memory for teams that can\'t afford to forget. Built by Reattend Technologies Private Limited.</p><p style="margin-top:12px;font-size:12px;">Researching the problem? Read our essays at <a href="https://organizationalamnesia.com" target="_blank" rel="noreferrer" style="color:var(--accent);text-decoration:underline;">organizationalamnesia.com</a>.</p></div>',
      '<div class="footer-col"><h5>Product</h5><a href="/product">Product</a><a href="/pricing">Pricing</a><a href="/compliance">Compliance</a><a href="/login">Sign in</a><a href="/integrations">Integrations</a></div>',
      '<div class="footer-col"><h5>Capabilities</h5><a href="/product#capture">Capture</a><a href="/product#connect">Connect</a><a href="/product#recall">Recall</a><a href="/product#run">Run</a><a href="/product#govern">Govern</a><a href="/product#deploy">Deploy</a></div>',
      '<div class="footer-col"><h5>Company</h5><a href="/about">About</a><a href="/coming-soon">Careers</a><a href="/coming-soon">Press</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div>',
      '<div class="footer-col"><h5>Resources</h5><a href="/blog">Blog</a><a href="/glossary">Glossary</a><a href="/help">Help center</a><a href="/tool">Free tools</a><a href="/game">Free games</a><a href="/compliance">Trust</a><a href="https://stats.uptimerobot.com/KNL7AXsPis" target="_blank" rel="noreferrer">Status</a></div>',
      '</div><div class="footer-bottom"><span>© 2026 Reattend Technologies Private Limited</span><span style="display:flex;gap:24px;"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/compliance">Compliance</a><a href="/support">Support</a></span></div></footer>'
    ].join('');
  }

  function featureMarkup(info) {
    var features = info.game ? [
      ['01', 'Start in seconds', 'Create a room, share one code and let everyone join from the browser they already have.'],
      ['02', 'Built for groups', 'The interface keeps every player oriented while the host moves the room through each round.'],
      ['03', 'Keep it human', 'Simple prompts and clear reveals make space for conversation instead of getting in its way.']
    ] : [
      ['01', 'Fast by default', 'Start with one focused input and get a useful, structured result without learning a complicated workflow.'],
      ['02', 'Calm and private', 'A quiet interface keeps the work clear and avoids collecting information the tool does not need.'],
      ['03', 'Ready to carry forward', 'Copy, download or share the output, then bring the lasting context into Reattend when it matters.']
    ];

    return features.map(function (feature) {
      return '<article class="detail-feature"><span>' + feature[0] + '</span><h3>' + feature[1] + '</h3><p>' + feature[2] + '</p></article>';
    }).join('');
  }

  function stepMarkup(info) {
    var steps = info.game ? [
      ['1', 'Create the room', 'Choose the mood and give the room a name.'],
      ['2', 'Invite everyone', 'Share the room code with the people playing.'],
      ['3', 'Play together', 'Follow the prompts and reveal each round as a group.']
    ] : [
      ['1', 'Add the raw material', 'Start with the thought, notes or details you already have.'],
      ['2', 'Shape the result', 'Use a suggestion or adjust the inputs to fit the work.'],
      ['3', 'Take it with you', 'Copy, save or share the result with the right people.']
    ];

    return steps.map(function (step) {
      return '<article class="detail-step"><span>' + step[0] + '</span><h3>' + step[1] + '</h3><p>' + step[2] + '</p></article>';
    }).join('');
  }

  function relatedMarkup(info) {
    var links = info.game ? [
      [route('game.html'), 'Explore every team game'],
      [route('game/icebreaker-spinner/'), 'Try Icebreaker Spinner'],
      [route('game/team-bingo/'), 'Play Team Bingo']
    ] : [
      [route('tool.html'), 'Explore every free tool'],
      [route('tool/brain-dump-organizer/'), 'Try Brain Dump Organizer'],
      [route('free-daily-planner/'), 'Open the Daily Planner']
    ];

    return links.map(function (link) {
      return '<a href="' + link[0] + '"><span>' + link[1] + '</span><span>↗</span></a>';
    }).join('');
  }

  function render() {
    var slug = document.body.getAttribute('data-resource');
    var info = resources[slug];
    var root = document.getElementById('detail-app');
    if (!root || !info) return;

    document.title = info.title + ' — Reattend';
    document.documentElement.style.setProperty('--detail-tint', info.tint);

    var suggestions = info.suggestions.map(function (suggestion) {
      return '<button class="detail-example" type="button" data-example="' + suggestion + '">' + suggestion + '</button>';
    }).join('');

    root.innerHTML = [
      header(),
      '<main id="main" class="detail-main">',
      '<section class="detail-hero"><div class="detail-hero-grid">',
      '<div class="detail-copy" data-reveal><a class="detail-back" href="' + (info.game ? route('game.html') : route('tool.html')) + '">← Back to ' + (info.game ? 'free games' : 'free tools') + '</a>',
      '<div class="detail-eyebrow">' + info.category + ' · Free to use</div>',
      '<h1>' + info.title.replace(/ ([^ ]+)$/, ' <span>$1</span>') + '</h1>',
      '<p class="detail-lede">' + info.description + '</p>',
      '<div class="detail-chips"><span class="detail-chip">No signup</span><span class="detail-chip">Works in your browser</span><span class="detail-chip">' + (info.game ? 'Made for teams' : 'Free forever') + '</span></div>',
      '<div class="detail-actions"><a class="detail-button primary" href="#try">' + info.action + ' ↘</a><a class="detail-button" href="/product">See how Reattend works</a></div></div>',
      '<div class="detail-stage" id="try" data-reveal style="--delay:120ms"><div class="detail-stage-window">',
      '<div class="detail-stage-bar"><span>Interactive preview</span><span class="detail-stage-dots"><i></i><i></i><i></i></span></div>',
      '<div class="detail-stage-body"><div class="detail-stage-icon">' + info.glyph + '</div><h2>' + info.action + '</h2><p class="detail-stage-copy">Try the refreshed interaction below. Your input stays in this preview.</p>',
      '<form class="detail-demo"><label for="detail-input">' + info.label + '</label>',
      (info.game ? '<input id="detail-input" type="text" placeholder="' + info.placeholder + '">' : '<textarea id="detail-input" placeholder="' + info.placeholder + '"></textarea>'),
      '<div class="detail-examples">' + suggestions + '</div><button class="detail-submit" type="submit">' + info.action + ' →</button><div class="detail-result" role="status" aria-live="polite"></div></form>',
      '</div></div></div></div></section>',
      '<section class="detail-section" data-reveal><div class="detail-section-intro"><div><div class="detail-eyebrow">Designed to stay simple</div><h2>Useful before it feels complicated.</h2></div><p>The details change for each tool, but the experience stays familiar: one clear starting point, an immediate result and a path back to the context behind the work.</p></div><div class="detail-feature-grid">' + featureMarkup(info) + '</div></section>',
      '<section class="detail-section" data-reveal><div class="detail-section-intro"><div><div class="detail-eyebrow">How it works</div><h2>Three small steps.</h2></div><p>Everything is designed to be understandable at a glance, responsive on any screen and easy to use with a keyboard.</p></div><div class="detail-step-grid">' + stepMarkup(info) + '</div></section>',
      '<section class="detail-section" data-reveal><div class="detail-section-intro"><div><div class="detail-eyebrow">Keep exploring</div><h2>More ways to make room.</h2></div><p>Use another free resource or see how Reattend connects the output to a second brain for you and your team.</p></div><div class="detail-related">' + relatedMarkup(info) + '</div></section>',
      '<section class="detail-closing" data-reveal><div class="detail-eyebrow">A little less remembering</div><h2>Keep the useful context after the moment passes.</h2><p>Reattend connects the thoughts, decisions and conversations behind the work, so you can find your way back whenever you need it.</p><div class="detail-actions"><a class="detail-button primary" href="/register">Try Reattend free ↗</a><a class="detail-button" href="/product">Explore the product</a></div></section>',
      '</main>',
      footer()
    ].join('');

    var form = root.querySelector('.detail-demo');
    var input = root.querySelector('#detail-input');
    var result = root.querySelector('.detail-result');

    root.querySelectorAll('[data-example]').forEach(function (button) {
      button.addEventListener('click', function () {
        input.value = button.getAttribute('data-example');
        input.focus();
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!input.value.trim()) input.value = info.placeholder;
      result.textContent = info.sample;
      result.classList.remove('show');
      window.requestAnimationFrame(function () { result.classList.add('show'); });
    });
  }

  render();
})();

