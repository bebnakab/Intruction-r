/**
 * PHYSICS LEARNING HUB — Particle Background
 * Canvas-based animated particle system with constellation lines
 */

(function () {
  const canvas  = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx     = canvas.getContext('2d');

  let W, H, particles, rafId;
  const PARTICLE_COUNT = 90;
  const LINE_DIST      = 140;

  /* ---- Resize handling ---- */
  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
  }

  window.addEventListener('resize', () => {
    resize();
    initParticles();
  });

  /* ---- Particle factory ---- */
  function createParticle() {
    const hue = 220 + Math.random() * 80; // indigo–violet range
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      vx:   (Math.random() - 0.5) * 0.45,
      vy:   (Math.random() - 0.5) * 0.45,
      r:    Math.random() * 1.8 + 0.6,
      hue,
      alpha: Math.random() * 0.5 + 0.25,
    };
  }

  function initParticles() {
    particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
  }

  /* ---- Mouse parallax ---- */
  let mx = -9999, my = -9999;
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  /* ---- Animation loop ---- */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Subtle repulsion from mouse
      const dx = p.x - mx;
      const dy = p.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        const force = (120 - dist) / 120 * 0.012;
        p.vx += dx * force;
        p.vy += dy * force;
      }

      // Speed cap
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.9) { p.vx *= 0.9 / speed; p.vy *= 0.9 / speed; }

      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < -5)  p.x = W + 5;
      if (p.x > W+5) p.x = -5;
      if (p.y < -5)  p.y = H + 5;
      if (p.y > H+5) p.y = -5;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.alpha})`;
      ctx.fill();

      // Draw connection lines
      for (let j = i + 1; j < particles.length; j++) {
        const q    = particles[j];
        const ddx  = p.x - q.x;
        const ddy  = p.y - q.y;
        const d    = Math.sqrt(ddx * ddx + ddy * ddy);

        if (d < LINE_DIST) {
          const lineAlpha = (1 - d / LINE_DIST) * 0.18;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `hsla(240, 70%, 75%, ${lineAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  /* ---- Init ---- */
  resize();
  initParticles();
  draw();

  // Stop animation when hero leaves viewport (performance)
  const hero = document.getElementById('home');
  if (hero && window.IntersectionObserver) {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!rafId) rafId = requestAnimationFrame(draw);
        } else {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
      { threshold: 0 }
    );
    obs.observe(hero);
  }
})();
