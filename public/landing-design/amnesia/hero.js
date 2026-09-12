// Hero document-decay animation.
// Renders semi-transparent "documents" drifting upward; over time they
// lose lines (knowledge), fade, and dissolve into particles. New docs
// emerge to be forgotten in turn.
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const PAPER = '#ede7d6';
  const INK = '#1a1814';
  const ACCENT = '#7fb069';

  function rand(a, b) { return a + Math.random() * (b - a); }

  class Doc {
    constructor(initial) {
      this.reset(initial);
    }
    reset(initial) {
      this.w = rand(110, 170);
      this.h = this.w * rand(1.25, 1.45);
      this.x = rand(this.w / 2, W - this.w / 2);
      this.y = initial ? rand(-H * 0.2, H * 1.1) : H + this.h;
      this.vy = rand(-0.18, -0.42);
      this.vx = rand(-0.05, 0.05);
      this.rot = rand(-0.18, 0.18);
      this.vrot = rand(-0.0008, 0.0008);
      this.age = 0;
      this.life = rand(900, 1700);
      this.lines = Math.floor(rand(8, 13));
      this.lineSeeds = Array.from({length: this.lines}, () => ({
        w: rand(0.35, 0.95),
        x: rand(0.08, 0.15),
        decayed: false,
      }));
      this.alpha = 0;
      this.particles = null;
      this.dissolved = false;
      this.hasAccent = Math.random() < 0.18;
      this.accentLine = Math.floor(rand(2, this.lines - 1));
    }
    update() {
      this.age++;
      this.x += this.vx;
      this.y += this.vy;
      this.rot += this.vrot;

      if (this.age < 60) this.alpha = this.age / 60;
      else this.alpha = 1;

      const decayStart = this.life * 0.35;
      if (this.age > decayStart) {
        if (Math.random() < 0.06) {
          const candidates = this.lineSeeds.filter(s => !s.decayed);
          if (candidates.length) {
            candidates[Math.floor(Math.random() * candidates.length)].decayed = true;
          }
        }
      }

      if (this.age > this.life * 0.85 && !this.particles) {
        this.spawnParticles();
      }
      if (this.particles) {
        for (const p of this.particles) {
          p.x += p.vx; p.y += p.vy;
          p.vy += 0.005;
          p.alpha *= 0.985;
        }
        if (this.particles[0].alpha < 0.02) {
          this.dissolved = true;
        }
      }

      if (this.y < -this.h * 1.5 || this.dissolved) {
        this.reset(false);
      }
    }
    spawnParticles() {
      this.particles = [];
      const count = 60;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: this.x + rand(-this.w/2, this.w/2),
          y: this.y + rand(-this.h/2, this.h/2),
          vx: rand(-0.4, 0.4),
          vy: rand(-0.6, 0.1),
          alpha: rand(0.3, 0.8),
          size: rand(0.6, 1.6),
        });
      }
    }
    drawDoc() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot * 0.04);

      const remaining = this.lineSeeds.filter(s => !s.decayed).length / this.lines;
      const docAlpha = this.alpha * (0.22 + 0.18 * remaining) * (this.particles ? 0.4 : 1);

      ctx.fillStyle = PAPER;
      ctx.globalAlpha = docAlpha * 0.9;
      ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);

      ctx.fillStyle = '#c9c2af';
      ctx.globalAlpha = docAlpha * 0.6;
      ctx.fillRect(-this.w/2 + this.w*0.1, -this.h/2 + 10, this.w*0.4, 3);

      const top = -this.h/2 + 24;
      const lineGap = (this.h - 34) / this.lines;
      ctx.fillStyle = INK;
      for (let i = 0; i < this.lineSeeds.length; i++) {
        const s = this.lineSeeds[i];
        if (s.decayed) continue;
        const y = top + i * lineGap;
        const lw = (this.w - 24) * s.w;
        const lx = -this.w/2 + 12;
        const isAccent = this.hasAccent && i === this.accentLine;
        ctx.fillStyle = isAccent ? ACCENT : INK;
        ctx.globalAlpha = docAlpha * (isAccent ? 0.85 : 0.7);
        ctx.fillRect(lx, y, lw, 2);
      }

      ctx.globalAlpha = docAlpha * 0.4;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);

      ctx.restore();
    }
    drawParticles() {
      if (!this.particles) return;
      ctx.save();
      for (const p of this.particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = PAPER;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.restore();
    }
    draw() {
      if (!this.particles) this.drawDoc();
      else { this.drawDoc(); this.drawParticles(); }
    }
  }

  let docs = [];
  function init() {
    const count = Math.max(8, Math.min(18, Math.floor(W / 90)));
    docs = Array.from({length: count}, () => new Doc(true));
  }
  init();
  window.addEventListener('resize', () => { resize(); init(); });

  function loop() {
    ctx.clearRect(0, 0, W, H);
    const grd = ctx.createRadialGradient(W*0.42, H*0.5, 0, W*0.42, H*0.5, Math.max(W, H) * 0.55);
    grd.addColorStop(0, 'rgba(7,7,10,0.92)');
    grd.addColorStop(0.55, 'rgba(7,7,10,0.55)');
    grd.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    for (const d of docs) { d.update(); d.draw(); }
    requestAnimationFrame(loop);
  }
  loop();
})();
