/* Small, viewport-aware stories. No backend calls: all examples are labeled. */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sourceMemories = {
    walk: ['An idea on my walk', 'Sample voice note · “What if onboarding started with a question instead of a checklist? Ask people what they want to make room for, then help them reach one small win.” Captured as a voice memo and connected to the onboarding project.'],
    spark: ['People want to feel understood first.', 'Sample brain dump · A first experience should feel like it was made for you. Less setup, more relevance. This thought connects to the interview research and the idea recorded during a walk.'],
    research: ['Customer interviews', 'Sample research memory · The recurring theme: “Help me get to my first small win.” These illustrative notes connect the customer’s perspective to a more personal onboarding experience.'],
    sketch: ['The first hello, sketched out', 'Sample whiteboard capture · Say hello → Find their why → One small win. The illustration shows how a captured image can become part of a searchable memory.'],
    decision: ['Start with one thoughtful question.', 'Sample design-sync decision · Explore a conversational welcome instead of a fixed checklist. Preserve the context: the walk idea, customer research, and the team’s discussion all informed this direction.'],
    connection: ['Different moments. Same insight.', 'Sample connection · A voice note, a brain dump, customer interviews, a whiteboard, and a design decision share one thread: make the first experience personal. Your next step is to sketch the first question.']
  };
  document.querySelectorAll('[data-story-memory]').forEach(button => button.addEventListener('click', () => {
    const memory = sourceMemories[button.dataset.storyMemory];
    if (!memory) return;
    document.querySelector('#memory-title').textContent = memory[0];
    document.querySelector('#memory-detail').textContent = memory[1];
    document.querySelector('#memory-dialog').showModal();
  }));

  // Advance only while visible. Once complete, keep the full story on screen.
  function makeStory(element, duration, render) {
    let elapsed = 0;
    let lastTime = 0;
    let frame = 0;
    let inView = false;
    let paused = false;
    const pauseButton = element.querySelector('[data-story-pause]');
    const replayButton = element.querySelector('[data-story-replay]');
    element.classList.add('story-ready');
    function update() {
      render(elapsed, reduced.matches);
      element.classList.toggle('story-paused', paused || !inView);
      pauseButton.textContent = elapsed >= duration ? '✓ Complete' : paused ? '▷ Play' : 'Ⅱ Pause';
      pauseButton.setAttribute('aria-label', elapsed >= duration ? 'Animation complete' : `${paused ? 'Play' : 'Pause'} ${element.dataset.story === 'board' ? 'memory board' : 'conversation'} animation`);
      pauseButton.disabled = reduced.matches || elapsed >= duration;
      replayButton.disabled = reduced.matches;
      if (reduced.matches) pauseButton.textContent = 'Motion reduced';
    }
    function stop() { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    function tick(now) {
      frame = 0;
      if (!inView || paused || reduced.matches || document.hidden) { lastTime = 0; return; }
      if (lastTime) elapsed = Math.min(duration, elapsed + Math.min(now - lastTime, 100));
      lastTime = now;
      update();
      if (elapsed < duration) frame = requestAnimationFrame(tick);
    }
    function start() { if (!frame && inView && !paused && !reduced.matches && !document.hidden && elapsed < duration) frame = requestAnimationFrame(tick); }
    function reset() { stop(); elapsed = reduced.matches ? duration : 0; paused = false; update(); start(); }
    pauseButton.addEventListener('click', () => { paused = !paused; stop(); update(); start(); });
    replayButton.addEventListener('click', reset);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        if (!inView) stop();
        update(); start();
      }, { threshold: 0.18 });
      observer.observe(element);
    } else { inView = true; }
    document.addEventListener('visibilitychange', () => { stop(); start(); });
    reduced.addEventListener('change', reset);
    reset();
    return { reset };
  }

  const board = document.querySelector('[data-story="board"]');
  const boardScroller = board.querySelector('.board-scroll');
  if (boardScroller.clientWidth < 1120) {
    boardScroller.scrollLeft = Math.max(0, (boardScroller.scrollWidth - boardScroller.clientWidth) / 2);
  }
  const positions = [[650,400],[215,180],[222,397],[561,134],[958,201],[962,407],[667,552]];
  let lastBoardStep = -1;
  makeStory(board, 12000, (elapsed, noMotion) => {
    const step = noMotion ? 6 : Math.min(6, Math.floor(elapsed / 1750));
    if (step === lastBoardStep) return;
    lastBoardStep = step;
    board.querySelectorAll('[data-story-step]').forEach(node => node.classList.toggle('arrived', Number(node.dataset.storyStep) <= step));
    board.querySelector('.board-cursor').style.transform = `translate(${positions[step][0]}px, ${positions[step][1]}px)`;
    board.querySelector('[data-board-status]').textContent = [
      'A project. A little room to think.', '1 memory captured · An idea on a walk', '2 memories captured · A thought worth keeping',
      '3 memories captured · Research joins the picture', '4 memories captured · A sketch becomes searchable',
      '5 memories captured · A decision, with its context', '5 memories connected · One new insight'
    ][step];
  });

  const scenarios = {
    personal: {
      question: 'What was that idea I had on my walk?',
      answer: 'You wanted onboarding to feel like a conversation, not a checklist. Start by asking people what they want to make room for — then guide them to one small win.',
      followup: 'Did I ever mention it to the team?',
      reply: 'You did. It came up in the design sync, and the team agreed to explore a more personal welcome. Your customer interviews point in the same direction.',
      next: 'Your next step: sketch the first question.',
      first: '♬ Your walk · Voice note ↗', second: '✣ Design sync · Decision ↗', firstMemory: 'walk', secondMemory: 'decision'
    },
    team: {
      question: 'Why did we change the onboarding plan?',
      answer: 'The interviews suggested that a fixed checklist wasn’t helping people get to their first useful moment. The team explored a welcome based on each person’s goals instead.',
      followup: 'What should I know before I pick this up?',
      reply: 'Start with the customer research and the design-sync decision. The early sketch shows the intended flow: say hello, understand their why, then guide them to one small win.',
      next: 'Your starting point: the welcome-flow sketch.',
      first: '▧ Customer interviews · Research ↗', second: '▣ Welcome flow · Whiteboard ↗', firstMemory: 'research', secondMemory: 'sketch'
    }
  };
  let scenario = scenarios.personal;
  const chat = document.querySelector('[data-story="chat"]');
  function fillCopy(key, value) { const el = chat.querySelector(`[data-chat-copy="${key}"]`); if (el.textContent !== value) el.textContent = value; }
  const chatStory = makeStory(chat, 23500, (elapsed, noMotion) => {
    const times = [0, 900, 3100, 11700, 14400];
    chat.querySelectorAll('[data-chat-step]').forEach(node => node.classList.toggle('arrived', noMotion || elapsed >= times[Number(node.dataset.chatStep)]));
    fillCopy('question', scenario.question); fillCopy('followup', scenario.followup); fillCopy('next', scenario.next);
    const firstProgress = noMotion ? 1 : Math.min(1, Math.max(0, (elapsed - 3100) / 6800));
    const secondProgress = noMotion ? 1 : Math.min(1, Math.max(0, (elapsed - 14400) / 7000));
    fillCopy('answer', scenario.answer.slice(0, Math.ceil(scenario.answer.length * firstProgress)));
    fillCopy('reply', scenario.reply.slice(0, Math.ceil(scenario.reply.length * secondProgress)));
    chat.querySelector('[data-chat-source="first"]').hidden = firstProgress < 1;
    chat.querySelector('[data-chat-source="second"]').hidden = secondProgress < 1;
    chat.querySelector('.chat-next-step').hidden = secondProgress < 1;
    chat.querySelector('.recall-status').textContent = firstProgress < 1 ? '✧ Connecting your memories…' : '✧ Found in your memories';
    chat.classList.toggle('is-typing', !noMotion && ((elapsed >= 1800 && elapsed < 3100) || (elapsed >= 12600 && elapsed < 14400)));
  });
  document.querySelectorAll('[data-chat-scenario]').forEach(button => button.addEventListener('click', () => {
    scenario = scenarios[button.dataset.chatScenario];
    document.querySelectorAll('[data-chat-scenario]').forEach(tab => tab.setAttribute('aria-selected', String(tab === button)));
    chat.querySelector('[data-chat-source="first"]').textContent = scenario.first;
    chat.querySelector('[data-chat-source="second"]').textContent = scenario.second;
    chat.querySelector('[data-chat-source="first"]').dataset.storyMemory = scenario.firstMemory;
    chat.querySelector('[data-chat-source="second"]').dataset.storyMemory = scenario.secondMemory;
    chatStory.reset();
  }));
  const moments = [
    ['JANUARY · THE STARTING POINT', 'A guided checklist.', 'The first plan: walk every new user through the same five setup steps.', '↳ Kickoff notes · Initial proposal'],
    ['FEBRUARY · A NEW PERSPECTIVE', 'Listen before you lead.', 'Customer interviews pointed to a different need: help people find one useful moment, without asking them to set everything up first.', '↳ Customer interviews · Research'],
    ['MARCH · THE NEXT CHAPTER', 'A more personal welcome.', 'The team chose to explore a conversational first step, shaped around what each person wants to achieve.', '↳ Design sync · Updated direction']
  ];
  document.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-time]').forEach(tab => tab.setAttribute('aria-selected', String(tab === button)));
    const values = moments[Number(button.dataset.time)];
    ['time-label', 'time-title', 'time-description', 'time-source'].forEach((id, index) => document.getElementById(id).textContent = values[index]);
  }));
})();
