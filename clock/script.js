/* Neon Digital Clock — Vanilla JS (no backend) */

(() => {
  const els = {
    time: document.getElementById('time'),
    date: document.getElementById('date'),
    dow: document.getElementById('dow'),
    greeting: document.getElementById('greeting'),
    themeToggle: document.getElementById('themeToggle'),
    formatToggle: document.getElementById('formatToggle'),
    canvas: document.getElementById('particles'),
  };

  const storage = {
    theme: 'clock.theme',
    format: 'clock.format24',
  };

  const state = {
    is24Hour: true,
    prefersReducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function getGreeting(hour24) {
    if (hour24 < 12) return 'Good Morning';
    if (hour24 < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  function updateThemeUI() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isLight = theme === 'light';

    // Button text/aria
    els.themeToggle.setAttribute('aria-pressed', String(isLight));
    els.themeToggle.textContent = isLight ? '☀️ Light' : '🌙 Dark';
  }

  function toggleTheme() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(storage.theme, next);
    updateThemeUI();
  }

  function updateFormatUI() {
    els.formatToggle.setAttribute('aria-pressed', String(state.is24Hour));
    els.formatToggle.textContent = state.is24Hour ? '24H' : '12H';
  }

  function toggleFormat() {
    state.is24Hour = !state.is24Hour;
    localStorage.setItem(storage.format, String(state.is24Hour));
    updateFormatUI();
    renderTime();
  }

  function formatTime(d) {
    const h = d.getHours();
    const m = d.getMinutes();
    const s = d.getSeconds();

    if (state.is24Hour) {
      return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
    }

    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${pad2(h12)}:${pad2(m)}:${pad2(s)} ${ampm}`;
  }

  function renderTime() {
    const now = new Date();

    els.time.textContent = formatTime(now);
    els.date.textContent = now.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    });

    els.dow.textContent = now.toLocaleDateString(undefined, { weekday: 'long' });
    els.greeting.textContent = getGreeting(now.getHours());
  }

  // Update every second (aligned to wall clock for better smoothness)
  function startClock() {
    const tick = () => {
      renderTime();

      const now = new Date();
      const msUntilNextSecond = 1000 - now.getMilliseconds();
      setTimeout(tick, msUntilNextSecond);
    };

    tick();
  }

  // ===== Particles background (Canvas) =====
  function startParticles() {
    if (!els.canvas) return;

    if (state.prefersReducedMotion) {
      // Keep it simple for reduced motion.
      const ctx = els.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
      }
      els.canvas.style.opacity = '0.35';
      return;
    }

    const canvas = els.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    let w = 0;
    let h = 0;

    const particleCount = Math.round(Math.min(170, Math.max(70, (window.innerWidth * window.innerHeight) / 8500)));

    const particles = [];
    const rand = (min, max) => Math.random() * (max - min) + min;

    function resize() {
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Re-seed particles on resize for consistent look.
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: rand(0, w),
          y: rand(0, h),
          vx: rand(-0.35, 0.35),
          vy: rand(-0.15, 0.45),
          r: rand(0.8, 2.2),
          a: rand(0.25, 0.75),
          hue: rand(175, 285),
        });
      }
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    let last = performance.now();

    function draw(now) {
      const dt = Math.min(40, now - last);
      last = now;

      ctx.clearRect(0, 0, w, h);

      // Subtle vignette
      const grd = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, Math.max(w, h));
      grd.addColorStop(0, 'rgba(255,255,255,0.03)');
      grd.addColorStop(1, 'rgba(0,0,0,0.20)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx * (dt / 16.67);
        p.y += p.vy * (dt / 16.67);

        // Wrap edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Neon glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

        const color = `hsla(${p.hue}, 95%, 65%, ${p.a})`;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.fill();
      }

      // Light connections
      ctx.shadowBlur = 0;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy;
          const maxDist = 110;
          if (dist2 < maxDist * maxDist) {
            const dist = Math.sqrt(dist2);
            const alpha = (1 - dist / maxDist) * 0.25;
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }

  // ===== Init =====
  function init() {
    // Theme init
    const savedTheme = localStorage.getItem(storage.theme);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Default: follow system if possible
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      document.documentElement.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
    }
    updateThemeUI();

    // Format init
    const savedFormat = localStorage.getItem(storage.format);
    state.is24Hour = savedFormat === null ? true : savedFormat === 'true';
    updateFormatUI();

    // Events
    els.themeToggle.addEventListener('click', toggleTheme);
    els.formatToggle.addEventListener('click', toggleFormat);

    renderTime();
    startClock();
    startParticles();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

