/**
 * PHYSICS LEARNING HUB — Main Application Script
 * Handles: navbar, search/filter, demo tabs,
 *          projectile motion, pendulum, wave interference,
 *          topic modals, scroll reveals
 */

'use strict';

/* =====================================================
   1. NAVBAR — scroll effect + mobile toggle
   ===================================================== */
(function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const toggle    = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  toggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    toggle.classList.toggle('open');
  });

  // Close mobile menu on link click
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      toggle.classList.remove('open');
    });
  });
})();


/* =====================================================
   2. SEARCH & FILTER
   ===================================================== */
(function initSearch() {
  const searchInput = document.getElementById('topicSearch');
  const clearBtn    = document.getElementById('searchClear');
  const chips       = document.querySelectorAll('.chip');
  const cards       = document.querySelectorAll('.topic-card');
  const noResults   = document.getElementById('noResults');

  let activeFilter  = 'all';
  let searchQuery   = '';

  function applyFilters() {
    let anyVisible = false;
    cards.forEach(card => {
      const cat      = card.dataset.category;
      const keywords = (card.dataset.keywords || '') + ' ' + (card.querySelector('.card-title')?.textContent || '');
      const matchCat = activeFilter === 'all' || cat === activeFilter;
      const matchQ   = !searchQuery || keywords.toLowerCase().includes(searchQuery.toLowerCase());

      const show = matchCat && matchQ;
      card.classList.toggle('hidden', !show);
      if (show) anyVisible = true;
    });
    noResults.style.display = anyVisible ? 'none' : 'block';
  }

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    clearBtn.style.display = searchQuery ? 'flex' : 'none';
    applyFilters();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearBtn.style.display = 'none';
    applyFilters();
    searchInput.focus();
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      applyFilters();
    });
  });
})();


/* =====================================================
   3. DEMO TABS
   ===================================================== */
(function initDemoTabs() {
  const tabs   = document.querySelectorAll('.demo-tab');
  const panels = document.querySelectorAll('.demo-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const target = document.getElementById('demo-' + tab.dataset.demo);
      if (target) target.classList.add('active');
    });
  });
})();


/* =====================================================
   4. PROJECTILE MOTION SIMULATION
   ===================================================== */
(function initProjectile() {
  const canvas  = document.getElementById('projectileCanvas');
  if (!canvas) return;
  const ctx     = canvas.getContext('2d');

  const angleSlider = document.getElementById('projAngle');
  const velSlider   = document.getElementById('projVelocity');
  const gravSlider  = document.getElementById('projGravity');
  const angleVal    = document.getElementById('angleVal');
  const velVal      = document.getElementById('velVal');
  const gravVal     = document.getElementById('gravVal');
  const launchBtn   = document.getElementById('launchBtn');
  const resetBtn    = document.getElementById('resetProjBtn');
  const overlay     = document.getElementById('projectileOverlay');

  const readMaxH  = document.getElementById('readMaxH');
  const readRange = document.getElementById('readRange');
  const readTime  = document.getElementById('readTime');

  let animId  = null;
  let state   = 'idle'; // 'idle' | 'flying' | 'done'

  // Simulation parameters (in "physics units", scaled to canvas px)
  let angle, vel, grav;
  let simT     = 0;
  let dt       = 0.016; // ~60fps step
  let scale    = 14;     // px per meter
  let originX, originY;
  let trailPoints = [];

  function getParams() {
    angle = parseFloat(angleSlider.value) * Math.PI / 180;
    vel   = parseFloat(velSlider.value);
    grav  = parseFloat(gravSlider.value);
  }

  function updateLabels() {
    angleVal.textContent = angleSlider.value + '°';
    velVal.textContent   = velSlider.value + ' m/s';
    gravVal.textContent  = parseFloat(gravSlider.value).toFixed(1) + ' m/s²';
  }

  function computeStats() {
    getParams();
    const vx   = vel * Math.cos(angle);
    const vy   = vel * Math.sin(angle);
    const tFly = (2 * vy) / grav;
    const maxH = (vy * vy) / (2 * grav);
    const rng  = vx * tFly;
    readMaxH.textContent  = maxH.toFixed(1)  + ' m';
    readRange.textContent = rng.toFixed(1)   + ' m';
    readTime.textContent  = tFly.toFixed(2)  + ' s';
  }

  function drawStatic(showPreview = false) {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // Ground
    ctx.fillStyle   = 'rgba(99, 102, 241, 0.15)';
    ctx.fillRect(0, originY, W, H - originY);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.moveTo(0, originY); ctx.lineTo(W, originY); ctx.stroke();

    // Axis labels
    ctx.fillStyle   = 'rgba(100,116,139,0.8)';
    ctx.font        = '11px Inter, sans-serif';
    ctx.textAlign   = 'left';
    for (let m = 10; m < (W - originX) / scale; m += 10) {
      const px = originX + m * scale;
      if (px > W - 20) break;
      ctx.fillText(m + 'm', px - 8, originY + 14);
    }

    if (showPreview) {
      getParams();
      drawAnglePreview();
    }
  }

  function drawAnglePreview() {
    const previewLen = 50;
    ctx.strokeStyle = 'rgba(99,102,241,0.6)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + Math.cos(angle) * previewLen, originY - Math.sin(angle) * previewLen);
    ctx.stroke();
    ctx.setLineDash([]);

    // Angle arc
    ctx.strokeStyle = 'rgba(6,182,212,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(originX, originY, 28, -angle, 0);
    ctx.stroke();

    ctx.fillStyle   = '#67e8f9';
    ctx.font        = '11px Inter';
    ctx.textAlign   = 'left';
    ctx.fillText(angleSlider.value + '°', originX + 32, originY - 6);
  }

  function drawTrail() {
    if (trailPoints.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(trailPoints[0].px, trailPoints[0].py);
    for (let i = 1; i < trailPoints.length; i++) {
      ctx.lineTo(trailPoints[i].px, trailPoints[i].py);
    }
    ctx.strokeStyle = 'rgba(99,102,241,0.7)';
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.stroke();
  }

  function drawBall(px, py) {
    // Glow
    const grad = ctx.createRadialGradient(px, py, 0, px, py, 18);
    grad.addColorStop(0, 'rgba(99,102,241,0.5)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI*2);
    ctx.fillStyle = grad; ctx.fill();

    // Ball
    ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI*2);
    ctx.fillStyle = '#818cf8'; ctx.fill();
    ctx.strokeStyle = '#a5b4fc'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function animate() {
    if (state !== 'flying') return;
    getParams();

    const vx  = vel * Math.cos(angle);
    const vy  = vel * Math.sin(angle);
    const px  = originX + vx * simT * scale;
    const py  = originY - (vy * simT - 0.5 * grav * simT * simT) * scale;

    if (py >= originY) {
      state = 'done';
      launchBtn.textContent = '▶ Launch';
      computeStats();

      // Draw final dot at landing
      drawStatic();
      drawTrail();
      const landX = originX + vx * (2 * vy / grav) * scale;
      ctx.beginPath(); ctx.arc(landX, originY, 6, 0, Math.PI*2);
      ctx.fillStyle = '#f59e0b'; ctx.fill();

      // Landing label
      ctx.fillStyle   = '#fbbf24';
      ctx.font        = 'bold 12px Inter';
      ctx.textAlign   = 'center';
      ctx.fillText('Landing', landX, originY - 14);
      return;
    }

    trailPoints.push({ px, py });

    drawStatic();
    drawTrail();
    drawBall(px, py);

    // Velocity vector
    const vxCur = vx;
    const vyCur = vy - grav * simT;
    const vecScale = 4;
    ctx.strokeStyle = 'rgba(245,158,11,0.7)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + vxCur * vecScale, py - vyCur * vecScale);
    ctx.stroke();

    // Height readout live
    const heightNow = (vy * simT - 0.5 * grav * simT * simT);
    readMaxH.textContent  = Math.max(0, heightNow).toFixed(1) + ' m';

    simT += dt;
    animId = requestAnimationFrame(animate);
  }

  function launch() {
    if (state === 'flying') return;
    cancelAnimationFrame(animId);
    state       = 'flying';
    simT        = 0;
    trailPoints = [];
    overlay.classList.add('hidden');
    launchBtn.textContent = '● Flying...';
    computeStats();
    animate();
  }

  function reset() {
    cancelAnimationFrame(animId);
    state       = 'idle';
    simT        = 0;
    trailPoints = [];
    launchBtn.textContent = '▶ Launch';
    readMaxH.textContent  = '—';
    readRange.textContent = '—';
    readTime.textContent  = '—';
    overlay.classList.remove('hidden');
    drawStatic(true);
  }

  function setOrigin() {
    originX = 50;
    originY = canvas.height - 50;
  }

  function onSlider() {
    updateLabels();
    if (state !== 'flying') {
      drawStatic(true);
      if (state === 'idle') {
        readMaxH.textContent  = '—';
        readRange.textContent = '—';
        readTime.textContent  = '—';
      }
    }
  }

  angleSlider.addEventListener('input', onSlider);
  velSlider.addEventListener('input', onSlider);
  gravSlider.addEventListener('input', onSlider);
  launchBtn.addEventListener('click', launch);
  resetBtn.addEventListener('click', reset);

  setOrigin();
  updateLabels();
  drawStatic(true);
})();


/* =====================================================
   5. PENDULUM SIMULATION
   ===================================================== */
(function initPendulum() {
  const canvas      = document.getElementById('pendulumCanvas');
  if (!canvas) return;
  const ctx         = canvas.getContext('2d');

  const lenSlider   = document.getElementById('pendLength');
  const angSlider   = document.getElementById('pendAngle');
  const dampSlider  = document.getElementById('pendDamping');
  const lenVal      = document.getElementById('lenVal');
  const pendAngVal  = document.getElementById('pendAngleVal');
  const dampVal     = document.getElementById('dampVal');
  const toggleBtn   = document.getElementById('pendToggleBtn');
  const resetBtn    = document.getElementById('resetPendBtn');
  const readPeriod  = document.getElementById('readPeriod');
  const readAngle   = document.getElementById('readAngle');

  const g  = 9.8;  // m/s² (scaled)
  let len, theta0, damping;
  let theta, omega;
  let running = true;
  let animId  = null;
  let trail   = [];

  function getParams() {
    len      = parseFloat(lenSlider.value);
    theta0   = parseFloat(angSlider.value) * Math.PI / 180;
    damping  = parseFloat(dampSlider.value);
  }

  function updateLabels() {
    lenVal.textContent      = lenSlider.value + ' px';
    pendAngVal.textContent  = angSlider.value + '°';
    dampVal.textContent     = parseFloat(dampSlider.value).toFixed(3);
  }

  function init() {
    getParams();
    theta = theta0;
    omega = 0;
    trail = [];
    computePeriod();
  }

  function computePeriod() {
    getParams();
    // T ≈ 2π√(L/g) using L in pixel units / g-scale (display only)
    const T = 2 * Math.PI * Math.sqrt(len / (g * 16));
    readPeriod.textContent = T.toFixed(2) + ' s';
  }

  const CX = canvas.width  / 2;
  const CY = 40;

  function drawFrame() {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, W, H);

    // Support bar
    ctx.fillStyle   = 'rgba(99,102,241,0.3)';
    ctx.fillRect(CX - 60, 20, 120, 10);
    ctx.fillStyle   = 'rgba(99,102,241,0.6)';
    ctx.fillRect(CX - 4, 25, 8, 10);

    getParams();

    // Ball position
    const bx = CX + Math.sin(theta) * len;
    const by = CY + Math.cos(theta) * len;

    // Trail
    trail.push({ x: bx, y: by });
    if (trail.length > 120) trail.shift();

    if (trail.length > 2) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.strokeStyle = 'rgba(139,92,246,0.3)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // Rod shadow
    const grad = ctx.createLinearGradient(CX, CY, bx, by);
    grad.addColorStop(0, 'rgba(99,102,241,0.8)');
    grad.addColorStop(1, 'rgba(139,92,246,0.4)');
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.moveTo(CX, CY + 10); ctx.lineTo(bx, by); ctx.stroke();

    // Ball glow
    const glow = ctx.createRadialGradient(bx, by, 0, bx, by, 22);
    glow.addColorStop(0, 'rgba(139,92,246,0.5)');
    glow.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.beginPath(); ctx.arc(bx, by, 22, 0, Math.PI * 2);
    ctx.fillStyle = glow; ctx.fill();

    // Ball
    ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#a78bfa'; ctx.fill();
    ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1.5; ctx.stroke();

    // Angle readout
    readAngle.textContent = (theta * 180 / Math.PI).toFixed(1) + '°';

    // Equilibrium dotted line
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX, CY + len + 20); ctx.stroke();
    ctx.setLineDash([]);

    // Energy bar
    const maxKE   = 0.5 * 1 * (omega * omega) * len * len;
    const PE      = 1 * g * len * (1 - Math.cos(theta)) * 0.5;
    const maxE    = 1 * g * len * (1 - Math.cos(theta0)) * 0.5 + 0.001;
    const barW    = 120;
    const barX    = 16;
    const barY    = H - 36;

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(barX, barY, barW, 8);
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(barX, barY, Math.min(barW, barW * (PE / maxE + maxKE / maxE) * 0.5), 8);

    ctx.fillStyle   = 'rgba(100,116,139,0.8)';
    ctx.font        = '10px Inter';
    ctx.textAlign   = 'left';
    ctx.fillText('Energy', barX, barY - 4);
  }

  function step() {
    if (!running) { drawFrame(); return; }
    getParams();

    // Euler integration: α = -(g/L)·sin(θ) - b·ω
    const alpha = -(g / len) * Math.sin(theta) - damping * omega;
    omega += alpha * 0.016;
    theta += omega * 0.016;

    drawFrame();
    animId = requestAnimationFrame(step);
  }

  toggleBtn.addEventListener('click', () => {
    running = !running;
    toggleBtn.innerHTML = running ? '&#9646;&#9646; Pause' : '&#9654; Play';
    if (running) { cancelAnimationFrame(animId); animId = requestAnimationFrame(step); }
  });

  resetBtn.addEventListener('click', () => {
    init();
    if (!running) { running = true; toggleBtn.innerHTML = '&#9646;&#9646; Pause'; }
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(step);
  });

  [lenSlider, angSlider, dampSlider].forEach(s => {
    s.addEventListener('input', () => { updateLabels(); computePeriod(); });
  });

  init();
  updateLabels();
  animId = requestAnimationFrame(step);
})();


/* =====================================================
   6. WAVE INTERFERENCE SIMULATION
   ===================================================== */
(function initWave() {
  const canvas   = document.getElementById('waveCanvas');
  if (!canvas) return;
  const ctx      = canvas.getContext('2d');

  const f1Slider = document.getElementById('wave1Freq');
  const f2Slider = document.getElementById('wave2Freq');
  const aSlider  = document.getElementById('waveAmp');
  const f1Val    = document.getElementById('w1FreqVal');
  const f2Val    = document.getElementById('w2FreqVal');
  const aVal     = document.getElementById('wAmpVal');
  const toggleBtn= document.getElementById('waveToggleBtn');
  const resetBtn = document.getElementById('resetWaveBtn');
  const readBeat = document.getElementById('readBeat');
  const readPat  = document.getElementById('readPattern');

  let running = true;
  let animId  = null;
  let t       = 0;

  function getParams() {
    return {
      f1: parseFloat(f1Slider.value),
      f2: parseFloat(f2Slider.value),
      amp: parseFloat(aSlider.value),
    };
  }

  function updateLabels() {
    const { f1, f2, amp } = getParams();
    f1Val.textContent = f1.toFixed(1) + ' Hz';
    f2Val.textContent = f2.toFixed(1) + ' Hz';
    aVal.textContent  = amp.toFixed(1);

    const beat = Math.abs(f1 - f2);
    readBeat.textContent = beat.toFixed(1) + ' Hz';
    readPat.textContent  = beat < 0.05 ? 'Constructive' : beat < 1 ? 'Beats' : 'Destructive';
  }

  function drawWave() {
    const W  = canvas.width;
    const H  = canvas.height;
    const cy = H / 2;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth   = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();

    const { f1, f2, amp } = getParams();
    const xStep   = 2;
    const yScale  = (H * 0.15) * amp;

    // Wave 1 — indigo
    ctx.beginPath();
    for (let x = 0; x <= W; x += xStep) {
      const phase = (x / W) * Math.PI * 6 - t * f1 * 1.5;
      const y     = cy - Math.sin(phase) * yScale;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(99,102,241,0.7)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Wave 2 — cyan
    ctx.beginPath();
    for (let x = 0; x <= W; x += xStep) {
      const phase = (x / W) * Math.PI * 6 - t * f2 * 1.5;
      const y     = cy + Math.sin(phase) * yScale;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(6,182,212,0.7)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Superposition — white/gold
    ctx.beginPath();
    for (let x = 0; x <= W; x += xStep) {
      const ph1 = (x / W) * Math.PI * 6 - t * f1 * 1.5;
      const ph2 = (x / W) * Math.PI * 6 - t * f2 * 1.5;
      const y   = cy - (Math.sin(ph1) - Math.sin(ph2)) * yScale * 0.75;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(245,158,11,0.85)';
    ctx.lineWidth   = 2.5;
    ctx.stroke();

    // Legend
    const items = [
      { color: 'rgba(99,102,241,1)',  label: 'Wave 1 (f₁ = ' + f1.toFixed(1) + ' Hz)' },
      { color: 'rgba(6,182,212,1)',   label: 'Wave 2 (f₂ = ' + f2.toFixed(1) + ' Hz)' },
      { color: 'rgba(245,158,11,1)',  label: 'Superposition' },
    ];
    items.forEach(({ color, label }, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(16, 16 + i * 22, 24, 3);
      ctx.fillStyle = 'rgba(148,163,184,0.9)';
      ctx.font      = '11px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(label, 48, 21 + i * 22);
    });

    // Source dots
    const src1y = cy - yScale * 0.8;
    const src2y = cy + yScale * 0.8;
    [src1y, src2y].forEach((sy, i) => {
      ctx.beginPath(); ctx.arc(W - 14, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#818cf8' : '#22d3ee';
      ctx.fill();
    });
  }

  function loop() {
    if (running) {
      t += 0.035;
      drawWave();
      updateLabels();
    }
    animId = requestAnimationFrame(loop);
  }

  toggleBtn.addEventListener('click', () => {
    running = !running;
    toggleBtn.innerHTML = running ? '&#9646;&#9646; Pause' : '&#9654; Play';
  });

  resetBtn.addEventListener('click', () => {
    t = 0;
    running = true;
    toggleBtn.innerHTML = '&#9646;&#9646; Pause';
  });

  [f1Slider, f2Slider, aSlider].forEach(s => s.addEventListener('input', updateLabels));

  updateLabels();
  drawWave();
  animId = requestAnimationFrame(loop);
})();


/* =====================================================
   7. TOPIC MODALS
   ===================================================== */
const TOPIC_DATA = {
  mechanics: {
    icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="2.5"/>
      <path d="M24 4v6M24 38v6M4 24h6M38 24h6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
    iconClass:  'mechanics-icon',
    title:      'Mechanics',
    subtitle:   'The study of motion, forces, and energy',
    lessons: [
      { icon: '📐', title: 'Kinematics in 1D', desc: 'Displacement, velocity, acceleration, and the kinematic equations' },
      { icon: '🎯', title: 'Projectile Motion', desc: 'Two-dimensional motion under constant gravitational acceleration' },
      { icon: '⚖️', title: "Newton's Three Laws", desc: 'Inertia, F=ma, and action-reaction pairs in real systems' },
      { icon: '🔄', title: 'Circular Motion', desc: 'Centripetal force, angular velocity, and uniform circular motion' },
      { icon: '⚡', title: 'Work & Energy Theorem', desc: 'Kinetic energy, potential energy, and conservation of energy' },
      { icon: '💥', title: 'Momentum & Impulse', desc: 'Linear momentum, conservation laws, elastic and inelastic collisions' },
      { icon: '🌀', title: 'Rotational Dynamics', desc: 'Torque, moment of inertia, and angular momentum' },
    ],
    resources: [
      { icon: '▶', label: 'Walter Lewin — Classical Mechanics (MIT OCW)' },
      { icon: '📄', label: 'Unit 1 Study Guide (PDF)' },
      { icon: '🧪', label: 'PhET: Projectile Motion Simulation' },
    ],
  },
  thermo: {
    icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <path d="M24 6v24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M24 30a8 8 0 100 16 8 8 0 000-16z" stroke="currentColor" stroke-width="2.5"/>
      <circle cx="24" cy="38" r="4" fill="currentColor"/>
    </svg>`,
    iconClass:  'thermo-icon',
    title:      'Thermodynamics',
    subtitle:   'Heat, energy, and the laws governing thermal systems',
    lessons: [
      { icon: '🌡️', title: 'Temperature & Heat', desc: 'Thermal equilibrium, heat capacity, and calorimetry' },
      { icon: '0️⃣', title: 'Zeroth Law', desc: 'Thermal equilibrium and the basis of temperature measurement' },
      { icon: '1️⃣', title: 'First Law', desc: 'Conservation of energy: ΔU = Q − W' },
      { icon: '2️⃣', title: 'Second Law & Entropy', desc: 'Heat engines, efficiency, and the direction of time' },
      { icon: '💨', title: 'Ideal Gas Law', desc: 'PV = nRT and kinetic theory of gases' },
      { icon: '🔁', title: 'Thermodynamic Cycles', desc: 'Carnot, Otto, and refrigeration cycles' },
    ],
    resources: [
      { icon: '▶', label: 'Thermodynamics Lecture Series — Yale OCW' },
      { icon: '📄', label: 'Entropy and the Second Law — Reading' },
      { icon: '🧪', label: 'PhET: Gas Properties Simulation' },
    ],
  },
  waves: {
    icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <path d="M4 24 C8 14, 12 34, 16 24 C20 14, 24 34, 28 24 C32 14, 36 34, 40 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`,
    iconClass:  'waves-icon',
    title:      'Waves & Optics',
    subtitle:   'Mechanical waves, electromagnetic radiation, and light',
    lessons: [
      { icon: '〰️', title: 'Wave Properties', desc: 'Amplitude, frequency, wavelength, and wave speed: v = fλ' },
      { icon: '🔊', title: 'Sound Waves', desc: 'Longitudinal waves, intensity, decibels, and the Doppler effect' },
      { icon: '🌈', title: 'Electromagnetic Spectrum', desc: 'Radio to gamma rays — frequency, energy, and applications' },
      { icon: '🪞', title: 'Reflection & Refraction', desc: "Snell's law, critical angle, and total internal reflection" },
      { icon: '🔬', title: 'Lenses & Mirrors', desc: 'Ray diagrams, focal length, and the thin lens equation' },
      { icon: '🎛️', title: 'Wave Interference', desc: 'Constructive/destructive interference, standing waves, beats' },
      { icon: '🌊', title: 'Diffraction', desc: 'Single-slit, double-slit, and diffraction gratings' },
    ],
    resources: [
      { icon: '▶', label: 'Light and Optics — Khan Academy' },
      { icon: '🧪', label: 'PhET: Wave Interference Simulation' },
      { icon: '📄', label: 'Waves & Optics Equation Sheet' },
    ],
  },
  em: {
    icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <path d="M28 6L16 26h12l-8 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    iconClass:  'em-icon',
    title:      'Electricity & Magnetism',
    subtitle:   'Electric and magnetic fields, circuits, and induction',
    lessons: [
      { icon: '⚡', title: 'Electric Charge & Force', desc: "Coulomb's law, charge conservation, and the electric force" },
      { icon: '🔮', title: 'Electric Fields & Potential', desc: 'Field lines, electric potential energy, and voltage' },
      { icon: '🔌', title: 'DC Circuits', desc: "Ohm's law, resistors in series/parallel, and Kirchhoff's rules" },
      { icon: '🔋', title: 'Capacitors', desc: 'Capacitance, energy storage, and RC circuits' },
      { icon: '🧲', title: 'Magnetic Fields & Forces', desc: 'Magnetic force on charges and current-carrying wires' },
      { icon: '🌀', title: "Faraday's Law", desc: 'Electromagnetic induction, Lenz\'s law, and motional EMF' },
      { icon: '📡', title: 'Inductors & AC Circuits', desc: 'Inductance, transformers, and RLC circuit behavior' },
    ],
    resources: [
      { icon: '▶', label: 'Electricity & Magnetism — MIT 8.02 (Lewin)' },
      { icon: '🧪', label: 'Falstad Circuit Simulator' },
      { icon: '📄', label: 'E&M Concept Review Sheet' },
    ],
  },
  modern: {
    icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <circle cx="24" cy="24" r="3" fill="currentColor"/>
      <ellipse cx="24" cy="24" rx="18" ry="8" stroke="currentColor" stroke-width="2" fill="none"/>
      <ellipse cx="24" cy="24" rx="18" ry="8" stroke="currentColor" stroke-width="2" fill="none" transform="rotate(60 24 24)"/>
      <ellipse cx="24" cy="24" rx="18" ry="8" stroke="currentColor" stroke-width="2" fill="none" transform="rotate(120 24 24)"/>
    </svg>`,
    iconClass:  'modern-icon',
    title:      'Modern Physics',
    subtitle:   'Quantum mechanics, relativity, and the subatomic world',
    lessons: [
      { icon: '✨', title: 'Blackbody Radiation & Quantization', desc: "Planck's hypothesis and the ultraviolet catastrophe" },
      { icon: '☀️', title: 'Photoelectric Effect', desc: "Einstein's explanation: E = hf and the photon concept" },
      { icon: '🌊', title: 'Wave-Particle Duality', desc: "de Broglie wavelength and double-slit experiment with particles" },
      { icon: '🎯', title: 'Heisenberg Uncertainty Principle', desc: 'ΔxΔp ≥ ℏ/2 — the fundamental limit of measurement' },
      { icon: '⚛️', title: 'Atomic Structure', desc: 'Bohr model, electron orbitals, and spectral lines' },
      { icon: '🚀', title: 'Special Relativity', desc: 'Time dilation, length contraction, E = mc², and the Lorentz factor' },
      { icon: '☢️', title: 'Nuclear Physics', desc: 'Radioactive decay, fission, fusion, and binding energy' },
    ],
    resources: [
      { icon: '▶', label: 'Quantum Mechanics — Richard Feynman Lectures' },
      { icon: '▶', label: 'Special Relativity — MinutePhysics' },
      { icon: '📄', label: 'Modern Physics Problem Set' },
    ],
  },
};

window.openTopicModal = function (topicKey) {
  const data    = TOPIC_DATA[topicKey];
  if (!data) return;
  const overlay = document.getElementById('modalOverlay');
  const icon    = document.getElementById('modalIcon');
  const title   = document.getElementById('modalTitle');
  const subtitle= document.getElementById('modalSubtitle');
  const body    = document.getElementById('modalBody');

  icon.className   = 'modal-icon ' + data.iconClass;
  icon.innerHTML   = data.icon;
  title.textContent   = data.title;
  subtitle.textContent = data.subtitle;

  const lessonsHTML = data.lessons.map(l => `
    <li>
      <span class="li-icon">${l.icon}</span>
      <div>
        <strong>${l.title}</strong>
        <div style="font-size:0.8rem;margin-top:2px;color:var(--text-muted)">${l.desc}</div>
      </div>
    </li>`).join('');

  const resourcesHTML = data.resources.map(r => `
    <li>
      <span class="li-icon">${r.icon}</span>
      <span>${r.label}</span>
    </li>`).join('');

  body.innerHTML = `
    <h4>Lessons (${data.lessons.length})</h4>
    <ul>${lessonsHTML}</ul>
    <h4>Resources</h4>
    <ul>${resourcesHTML}</ul>
  `;

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

(function initModal() {
  const overlay  = document.getElementById('modalOverlay');
  const closeBtn = document.getElementById('modalClose');

  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();


/* =====================================================
   8. SCROLL REVEAL
   ===================================================== */
(function initScrollReveal() {
  const revealTargets = [
    '.topic-card',
    '.formula-card',
    '.resource-group',
    '.about-text',
    '.instructor-card',
    '.demo-section .section-header',
    '.formulas-section .section-header',
    '.resources-section .section-header',
    '.about-section .section-header',
  ];

  const allRevealEls = document.querySelectorAll(revealTargets.join(','));
  allRevealEls.forEach(el => el.classList.add('reveal'));

  if (!window.IntersectionObserver) {
    allRevealEls.forEach(el => el.classList.add('visible'));
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  allRevealEls.forEach(el => obs.observe(el));
})();


/* =====================================================
   9. ACTIVE NAV LINK (scroll spy)
   ===================================================== */
(function initScrollSpy() {
  const sections = ['home', 'topics', 'demo', 'resources', 'about'].map(id => document.getElementById(id)).filter(Boolean);
  const links    = document.querySelectorAll('.nav-link');

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(l => l.style.color = '');
          const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
          if (active) active.style.color = 'var(--text-primary)';
        }
      });
    },
    { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
  );

  sections.forEach(s => obs.observe(s));
})();
