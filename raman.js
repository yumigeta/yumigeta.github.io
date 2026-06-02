/* ============================================================
   Interactive Raman spectroscopy demo — vanilla JS, no deps.
   Three independent modules share these small helpers.
   ============================================================ */

const TAU = Math.PI * 2;
const COL = {
  field:  '#fbbf24',  // incident carrier
  vib:    '#38bdf8',  // vibration / polarizability
  dipole: '#f5f5f4',  // induced dipole
  rayleigh: '#16a34a',
  stokes:   '#ef4444',
  anti:     '#3b82f6',
  grid:   'rgba(255,255,255,0.10)',
  axis:   'rgba(255,255,255,0.25)'
};

// Resize a canvas to its CSS box at device resolution. Returns {ctx,w,h}.
function fitCanvas(cv) {
  const dpr = window.devicePixelRatio || 1;
  const rect = cv.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  cv.width = w * dpr;
  cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/* ------------------------------------------------------------
   Module 1 — Classical picture
   p(t) = α(t)·E(t),  α(t)=α₀+α′·cos(ω_v t),  E(t)=cos(ω₀ t)
   The product is an AM wave → sidebands at ω₀ ± ω_v.
   ------------------------------------------------------------ */
(function classical() {
  const cField = document.getElementById('c-field');
  const cAlpha = document.getElementById('c-alpha');
  const cDip   = document.getElementById('c-dipole');
  const cSpec  = document.getElementById('c-spectrum');
  if (!cField) return;

  const sVib = document.getElementById('ctrl-vib');
  const sMod = document.getElementById('ctrl-mod');
  const vVib = document.getElementById('v-vib');
  const vMod = document.getElementById('v-mod');
  const btn  = document.getElementById('btn-play');
  const cap  = document.getElementById('spec-cap');

  const CARRIER = 14;        // carrier cycles across the canvas
  let phase = 0;             // animation phase (carrier cycles)
  let running = true;

  let vib = +sVib.value;     // vibration cycles across canvas
  let mod = +sMod.value;     // modulation depth (α′/α₀)

  function readControls() {
    vib = +sVib.value;
    mod = +sMod.value;
    vVib.textContent = vib.toFixed(2) + '× ';
    vMod.textContent = mod.toFixed(2);
    drawSpectrum();
  }
  sVib.addEventListener('input', readControls);
  sMod.addEventListener('input', readControls);
  btn.addEventListener('click', () => {
    running = !running;
    btn.textContent = running ? 'Pause' : 'Play';
    btn.classList.toggle('active', running);
    if (running) loop();
  });

  function axis(ctx, w, h) {
    ctx.strokeStyle = COL.axis;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  }

  function plot(ctx, w, h, fn, color, lw) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 2;
    ctx.beginPath();
    const N = Math.max(120, w);
    for (let i = 0; i <= N; i++) {
      const x = i / N;                 // 0..1 across width
      const y = h / 2 - fn(x) * (h / 2 - 6);
      i ? ctx.lineTo(x * w, y) : ctx.moveTo(x * w, y);
    }
    ctx.stroke();
  }

  // travelling AM wave with matched phase velocities
  const E = x => Math.cos(TAU * (CARRIER * x - phase));
  const Q = x => Math.cos(TAU * (vib * x - (vib / CARRIER) * phase));
  const A = x => 1 + mod * Q(x);                 // polarizability (≥0 when mod≤1)
  const P = x => A(x) * E(x) / (1 + mod);        // induced dipole, normalised

  function drawTraces() {
    let g;
    g = fitCanvas(cField); axis(g.ctx, g.w, g.h);
    plot(g.ctx, g.w, g.h, E, COL.field);

    g = fitCanvas(cAlpha); axis(g.ctx, g.w, g.h);
    // show vibration envelope (dim) + polarizability (bright)
    plot(g.ctx, g.w, g.h, x => Q(x), 'rgba(56,189,248,0.35)', 1.5);
    plot(g.ctx, g.w, g.h, x => (A(x) - 1) / Math.max(mod, 0.001), COL.vib);

    g = fitCanvas(cDip); axis(g.ctx, g.w, g.h);
    // draw the modulation envelope as a guide
    g.ctx.strokeStyle = 'rgba(56,189,248,0.30)';
    g.ctx.lineWidth = 1.5;
    g.ctx.setLineDash([4, 4]);
    for (const s of [1, -1]) {
      g.ctx.beginPath();
      const N = g.w;
      for (let i = 0; i <= N; i++) {
        const x = i / N;
        const env = s * A(x) / (1 + mod);
        const y = g.h / 2 - env * (g.h / 2 - 6);
        i ? g.ctx.lineTo(x * g.w, y) : g.ctx.moveTo(x * g.w, y);
      }
      g.ctx.stroke();
    }
    g.ctx.setLineDash([]);
    plot(g.ctx, g.w, g.h, P, COL.dipole);
  }

  function drawSpectrum() {
    const { ctx, w, h } = fitCanvas(cSpec);
    const pad = 28, baseY = h - 22, topY = 14;
    // axis
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(w - 8, baseY); ctx.stroke();

    // frequency axis: centre = ω₀, sidebands at ±vib (scaled)
    const cx = w / 2;
    const span = (w / 2 - pad) / 3.2;     // px per "vib unit", clamps within view
    const off = Math.min(vib, 3) * span;
    const rayH = baseY - topY;
    const sideH = (baseY - topY) * (mod / (1 + mod)) * 1.6;

    const bars = [
      { x: cx,        H: rayH,  c: COL.rayleigh, t: 'Rayleigh' },
      { x: cx - off,  H: sideH, c: COL.stokes,   t: 'Stokes' },
      { x: cx + off,  H: sideH, c: COL.anti,     t: 'anti-Stokes' }
    ];
    ctx.font = '11px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    for (const b of bars) {
      ctx.strokeStyle = b.c; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(b.x, baseY); ctx.lineTo(b.x, baseY - Math.max(b.H, 1)); ctx.stroke();
      ctx.fillStyle = b.c;
      ctx.beginPath(); ctx.arc(b.x, baseY - Math.max(b.H, 1), 3, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#a8a29e';
    ctx.fillText('ω₀', cx, baseY + 14);
    ctx.fillText('−ω', cx - off, baseY + 14);
    ctx.fillText('+ω', cx + off, baseY + 14);
    ctx.textAlign = 'left';
    ctx.fillText('intensity', 6, topY + 2);

    cap.innerHTML = mod < 0.02
      ? 'With no polarizability modulation (α′ = 0) only the elastic <b>Rayleigh</b> line survives — no Raman signal.'
      : 'The Raman shift of the sidebands equals the vibrational frequency ω<sub>v</sub>. Classically Stokes and anti-Stokes are equal; quantum statistics (Boltzmann population) make anti-Stokes weaker at room temperature.';
  }

  function loop() {
    if (!running) return;
    phase += 0.06;
    drawTraces();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { drawTraces(); drawSpectrum(); });
  readControls();
  drawTraces();
  loop();
})();

/* ------------------------------------------------------------
   Module 2 — Jablonski diagram (SVG)
   ------------------------------------------------------------ */
(function jablonski() {
  const wrap = document.getElementById('jab-wrap');
  if (!wrap) return;
  const cap = document.getElementById('jab-cap');
  const SVGNS = 'http://www.w3.org/2000/svg';

  const W = 460, H = 300;
  const Y = { virtual: 70, v1: 232, v0: 258 };   // y of energy levels
  const X = { up: 165, down: 285 };               // arrow x positions

  const procs = {
    rayleigh: {
      start: Y.v0, end: Y.v0, scattered: COL.rayleigh,
      text: 'Rayleigh (elastic): the molecule returns to its original level, so the scattered photon has the same energy as the incident photon. This is by far the strongest line — and carries no vibrational information.'
    },
    stokes: {
      start: Y.v0, end: Y.v1, scattered: COL.stokes,
      text: 'Stokes: the molecule ends in a higher vibrational level (v=1), so it keeps some energy. The scattered photon is red-shifted by exactly the vibrational energy ℏω_v.'
    },
    antistokes: {
      start: Y.v1, end: Y.v0, scattered: COL.anti,
      text: 'anti-Stokes: the molecule starts already vibrationally excited (v=1) and ends at v=0, handing energy to the photon. The scattered photon is blue-shifted by ℏω_v — and weaker, since few molecules start excited.'
    }
  };

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  wrap.appendChild(svg);

  function add(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    svg.appendChild(el);
    return el;
  }

  // marker for arrowheads
  const defs = add('defs', {});
  function marker(id, color) {
    const m = document.createElementNS(SVGNS, 'marker');
    m.setAttribute('id', id); m.setAttribute('markerWidth', '8'); m.setAttribute('markerHeight', '8');
    m.setAttribute('refX', '4'); m.setAttribute('refY', '4'); m.setAttribute('orient', 'auto');
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', 'M0,0 L8,4 L0,8 Z'); p.setAttribute('fill', color);
    m.appendChild(p); defs.appendChild(m);
  }
  marker('mUp', COL.field);

  // static scaffold: levels + labels
  function level(y, x1, x2, dashed, label) {
    add('line', { x1, y1: y, x2, y2: y, stroke: dashed ? 'rgba(255,255,255,0.4)' : '#e7e5e4',
      'stroke-width': dashed ? 1.4 : 2.2, 'stroke-dasharray': dashed ? '6 5' : '0' });
    if (label) add('text', { x: x1 - 8, y: y + 4, fill: '#a8a29e', 'font-size': 12,
      'font-family': 'DM Sans, sans-serif', 'text-anchor': 'end' }).textContent = label;
  }
  level(Y.virtual, 70, W - 20, true, 'virtual');
  level(Y.v1, 70, W - 20, false, 'v=1');
  level(Y.v0, 70, W - 20, false, 'v=0');
  add('text', { x: 70, y: 24, fill: '#78716c', 'font-size': 11, 'font-family': 'DM Sans, sans-serif' })
    .textContent = 'Energy ↑';

  // dynamic elements
  const upArrow   = add('line', { stroke: COL.field, 'stroke-width': 3, 'marker-end': 'url(#mUp)' });
  const downArrow = add('line', { stroke: COL.rayleigh, 'stroke-width': 3, 'marker-end': 'url(#mUp)' });
  const photon    = add('circle', { r: 6, fill: COL.field, opacity: 0 });

  let cur = 'rayleigh';
  let t = 0, dir = 1, animId = null;

  function setProc(name) {
    cur = name;
    const p = procs[name];
    upArrow.setAttribute('x1', X.up); upArrow.setAttribute('x2', X.up);
    upArrow.setAttribute('y1', p.start); upArrow.setAttribute('y2', Y.virtual + 6);
    downArrow.setAttribute('x1', X.down); downArrow.setAttribute('x2', X.down);
    downArrow.setAttribute('y1', Y.virtual); downArrow.setAttribute('y2', p.end - 6);
    downArrow.setAttribute('stroke', p.scattered);
    cap.innerHTML = p.text;
    t = 0; dir = 1;
  }

  function animate() {
    const p = procs[cur];
    t += 0.018;
    if (t >= 1) { t = 0; dir *= -1; }
    photon.setAttribute('opacity', 1);
    if (dir === 1) {            // incident photon going up
      photon.setAttribute('fill', COL.field);
      photon.setAttribute('cx', X.up);
      photon.setAttribute('cy', p.start + (Y.virtual - p.start) * t);
    } else {                    // scattered photon going down
      photon.setAttribute('fill', p.scattered);
      photon.setAttribute('cx', X.down);
      photon.setAttribute('cy', Y.virtual + (p.end - Y.virtual) * t);
    }
    animId = requestAnimationFrame(animate);
  }

  document.getElementById('jab-btns').addEventListener('click', e => {
    const b = e.target.closest('[data-proc]');
    if (!b) return;
    document.querySelectorAll('#jab-btns .demo-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    setProc(b.dataset.proc);
  });

  setProc('rayleigh');
  animate();
})();

/* ------------------------------------------------------------
   Module 3 — Normal modes of a linear triatomic
   ------------------------------------------------------------ */
(function molecule() {
  const cv = document.getElementById('c-molecule');
  if (!cv) return;
  const cap = document.getElementById('mol-cap');

  const modes = {
    sym:  { activity: 'raman', label: 'Raman-active',
      text: 'Symmetric stretch: both bonds lengthen and shorten together. The molecular size — and thus the polarizability — changes, so this mode scatters Raman light.' },
    asym: { activity: 'ir', label: 'IR-active',
      text: 'Asymmetric stretch: one bond lengthens as the other shortens. The dipole moment changes but (by symmetry) the polarizability does not — IR-active, Raman-inactive.' },
    bend: { activity: 'ir', label: 'IR-active',
      text: 'Bending: the molecule flexes away from linear. This also modulates the dipole moment rather than the polarizability — IR-active.' }
  };

  let mode = 'sym';
  let t = 0;

  function setMode(m) {
    mode = m;
    cap.innerHTML = `<span class="mol-activity ${modes[m].activity}">${modes[m].label}</span><br>${modes[m].text}`;
  }

  // displacement vectors per atom [left, center, right], normalised
  function disp(s) {                 // s = sin(phase), -1..1
    const A = 18;                    // amplitude px
    if (mode === 'sym')  return [[-A*s,0],[0,0],[ A*s,0]];
    if (mode === 'asym') return [[ A*s,0],[-A*0.9*s,0],[ A*s,0]];
    /* bend */            return [[0,-A*s],[0, A*1.2*s],[0,-A*s]];
  }

  function frame() {
    const { ctx, w, h } = fitCanvas(cv);
    const cy = h / 2, cx = w / 2, gap = Math.min(110, w * 0.28);
    const base = [[cx - gap, cy], [cx, cy], [cx + gap, cy]];
    const d = disp(Math.sin(t));
    const pos = base.map((b, i) => [b[0] + d[i][0], b[1] + d[i][1]]);

    // bonds
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pos[0][0], pos[0][1]); ctx.lineTo(pos[1][0], pos[1][1]);
    ctx.lineTo(pos[2][0], pos[2][1]); ctx.stroke();

    // atoms: O (outer, red) – C (center, dark) – O (outer, red)
    const atoms = [
      { p: pos[0], r: 20, c: '#ef4444', t: 'O' },
      { p: pos[1], r: 26, c: '#52525b', t: 'C' },
      { p: pos[2], r: 20, c: '#ef4444', t: 'O' }
    ];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const a of atoms) {
      const g = ctx.createRadialGradient(a.p[0]-a.r*0.3, a.p[1]-a.r*0.3, 2, a.p[0], a.p[1], a.r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, a.c); g.addColorStop(1, a.c);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(a.p[0], a.p[1], a.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px DM Sans, sans-serif';
      ctx.fillText(a.t, a.p[0], a.p[1]);
    }

    t += 0.08;
    requestAnimationFrame(frame);
  }

  document.getElementById('mol-btns').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    document.querySelectorAll('#mol-btns .demo-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    setMode(b.dataset.mode);
  });

  setMode('sym');
  frame();
})();
