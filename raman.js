/* ============================================================
   Interactive Raman spectroscopy demo — vanilla JS, no deps.

   Module 1 unifies the molecular vibration with the classical
   scattering picture: one master clock drives the CO2 normal
   mode, the polarizability α(t), the induced dipole p(t), and
   the spectrum — so you can see that only modes which change α
   (the symmetric stretch) produce Raman sidebands.

   Module 2 is the Jablonski energy-level diagram.
   ============================================================ */

const TAU = Math.PI * 2;
const COL = {
  field:  '#fbbf24',
  vib:    '#38bdf8',
  dipole: '#f5f5f4',
  rayleigh: '#16a34a',
  stokes:   '#ef4444',
  anti:     '#3b82f6',
  axis:   'rgba(255,255,255,0.25)',
  now:    'rgba(251,191,36,0.55)'
};

function fitCanvas(cv) {
  const dpr = window.devicePixelRatio || 1;
  const rect = cv.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/* ------------------------------------------------------------
   Module 1 — vibration → polarizability → signal (synchronised)
   ------------------------------------------------------------ */
(function unified() {
  const cMol  = document.getElementById('c-molecule');
  const cField = document.getElementById('c-field');
  const cAlpha = document.getElementById('c-alpha');
  const cDip   = document.getElementById('c-dipole');
  const cSpec  = document.getElementById('c-spectrum');
  if (!cMol) return;

  const sVib = document.getElementById('ctrl-vib');
  const sMod = document.getElementById('ctrl-mod');
  const vVib = document.getElementById('v-vib');
  const vMod = document.getElementById('v-mod');
  const btn  = document.getElementById('btn-play');
  const cap  = document.getElementById('spec-cap');
  const molCap = document.getElementById('mol-cap');
  const badge  = document.getElementById('activity-badge');
  const arFill = document.getElementById('ar-fill');

  const CARRIER = 16;        // carrier cycles across the time window
  let t0 = 0;                // left edge of the scrolling time window
  let running = true;

  // mode definitions: does the mode change α to first order?
  const MODES = {
    sym:  { raman: true,  label: 'Raman-active',
      text: 'Symmetric stretch: both C=O bonds lengthen and shorten together, so the electron cloud expands and contracts — the polarizability oscillates (∂α/∂Q ≠ 0). Sidebands appear.' },
    asym: { raman: false, label: 'Raman-inactive',
      text: 'Asymmetric stretch: one bond lengthens as the other shortens. The two polarizability changes cancel by symmetry (∂α/∂Q = 0 at equilibrium), so α stays constant — no Raman sidebands. (This mode is IR-active instead.)' },
    bend: { raman: false, label: 'Raman-inactive',
      text: 'Bend: the molecule flexes away from linear. By symmetry this does not change the polarizability to first order (∂α/∂Q = 0) — no Raman sidebands. (IR-active instead.)' }
  };
  let mode = 'sym';

  let vib = +sVib.value;     // vibration cycles across the window
  let alphaP = +sMod.value;  // ∂α/∂Q magnitude (only meaningful when Raman-active)

  // effective modulation depth: zero unless the mode changes α
  const effMod = () => (MODES[mode].raman ? alphaP : 0);

  // ---- master signals as functions of absolute time t ----
  const Efn = t => Math.cos(TAU * CARRIER * t);
  const qfn = t => Math.cos(TAU * vib * t);                 // vibrational coordinate
  const afn = t => 1 + effMod() * qfn(t);                   // polarizability
  const pfn = t => afn(t) * Efn(t) / (1 + Math.max(effMod(), 0.0001));

  function readControls() {
    vib = +sVib.value;
    alphaP = +sMod.value;
    vVib.textContent = vib.toFixed(2) + '×';
    sMod.disabled = !MODES[mode].raman;
    vMod.textContent = MODES[mode].raman ? alphaP.toFixed(2) : '0 (forbidden)';
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

  function setMode(m) {
    mode = m;
    badge.textContent = MODES[m].label;
    badge.className = 'mol-activity ' + (MODES[m].raman ? 'raman' : 'ir');
    molCap.textContent = MODES[m].text;
    readControls();
  }
  document.getElementById('mol-btns').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    document.querySelectorAll('#mol-btns .demo-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    setMode(b.dataset.mode);
  });

  // ---- trace drawing (time on x-axis, right edge = "now") ----
  function axis(ctx, w, h) {
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  }
  function nowLine(ctx, w, h) {
    ctx.strokeStyle = COL.now; ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(w - 1, 0); ctx.lineTo(w - 1, h); ctx.stroke();
    ctx.setLineDash([]);
  }
  function plot(ctx, w, h, fn, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw || 2;
    ctx.beginPath();
    const N = Math.max(160, w);
    for (let i = 0; i <= N; i++) {
      const t = t0 + (i / N);                 // window spans 1 time unit
      const y = h / 2 - fn(t) * (h / 2 - 6);
      i ? ctx.lineTo(i / N * w, y) : ctx.moveTo(0, y);
    }
    ctx.stroke();
  }

  function drawTraces() {
    let g;
    g = fitCanvas(cField); axis(g.ctx, g.w, g.h);
    plot(g.ctx, g.w, g.h, Efn, COL.field); nowLine(g.ctx, g.w, g.h);

    g = fitCanvas(cAlpha); axis(g.ctx, g.w, g.h);
    // α relative to α₀, scaled so full slider fills the panel
    plot(g.ctx, g.w, g.h, t => (afn(t) - 1) / 1, COL.vib, 2.2);
    nowLine(g.ctx, g.w, g.h);
    if (!MODES[mode].raman) {
      g.ctx.fillStyle = 'rgba(168,162,158,0.9)';
      g.ctx.font = '11px DM Sans, sans-serif';
      g.ctx.fillText('α constant → ∂α/∂Q = 0', 8, 16);
    }

    g = fitCanvas(cDip); axis(g.ctx, g.w, g.h);
    // modulation envelope guide
    const m = effMod();
    g.ctx.strokeStyle = 'rgba(56,189,248,0.3)'; g.ctx.lineWidth = 1.5;
    g.ctx.setLineDash([4, 4]);
    for (const s of [1, -1]) {
      g.ctx.beginPath();
      const N = g.w;
      for (let i = 0; i <= N; i++) {
        const t = t0 + i / N;
        const env = s * afn(t) / (1 + Math.max(m, 0.0001));
        const y = g.h / 2 - env * (g.h / 2 - 6);
        i ? g.ctx.lineTo(i / N * g.w, y) : g.ctx.moveTo(0, y);
      }
      g.ctx.stroke();
    }
    g.ctx.setLineDash([]);
    plot(g.ctx, g.w, g.h, pfn, COL.dipole);
    nowLine(g.ctx, g.w, g.h);
  }

  function drawSpectrum() {
    const { ctx, w, h } = fitCanvas(cSpec);
    const pad = 28, baseY = h - 22, topY = 14;
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(w - 8, baseY); ctx.stroke();

    const cx = w / 2;
    const span = (w / 2 - pad) / 3.2;
    const off = Math.min(vib, 3) * span;
    const m = effMod();
    const rayH = baseY - topY;
    const sideH = (baseY - topY) * (m / (1 + m)) * 1.6;

    const bars = [
      { x: cx,       H: rayH,  c: COL.rayleigh },
      { x: cx - off, H: sideH, c: COL.stokes },
      { x: cx + off, H: sideH, c: COL.anti }
    ];
    for (const b of bars) {
      if (b.H < 1) continue;
      ctx.strokeStyle = b.c; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(b.x, baseY); ctx.lineTo(b.x, baseY - b.H); ctx.stroke();
      ctx.fillStyle = b.c;
      ctx.beginPath(); ctx.arc(b.x, baseY - b.H, 3, 0, TAU); ctx.fill();
    }
    ctx.font = '11px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#a8a29e';
    ctx.fillText('ω₀', cx, baseY + 14);
    if (m > 0.001) { ctx.fillText('−ω', cx - off, baseY + 14); ctx.fillText('+ω', cx + off, baseY + 14); }
    ctx.textAlign = 'left'; ctx.fillText('intensity', 6, topY + 2);

    cap.innerHTML = m < 0.001
      ? 'This mode does not change α, so the induced dipole is a pure carrier — <b>only the elastic Rayleigh line</b> appears. No Raman signal.'
      : 'The Raman shift of the sidebands equals the vibrational frequency ω<sub>v</sub>. Classically Stokes and anti-Stokes are equal; quantum statistics (Boltzmann population) make anti-Stokes weaker at room temperature.';
  }

  // ---- molecule + polarizability cloud (uses q at the "now" edge) ----
  function disp(q) {                 // q in [-1,1], +q = symmetric stretch outward
    const A = 16;
    if (mode === 'sym')  return [[-A*q,0],[0,0],[ A*q,0]];
    if (mode === 'asym') return [[ A*q,0],[-A*0.9*q,0],[ A*q,0]];
    return [[0,-A*q],[0, A*1.2*q],[0,-A*q]];   // bend
  }

  function drawMolecule() {
    const { ctx, w, h } = fitCanvas(cMol);
    const tNow = t0 + 1;
    const q = qfn(tNow);
    const aNow = afn(tNow);             // 1 ± effMod
    const cx = w / 2, cy = h / 2, gap = Math.min(96, w * 0.26);
    const base = [[cx - gap, cy], [cx, cy], [cx + gap, cy]];
    const d = disp(q);
    const pos = base.map((b, i) => [b[0] + d[i][0], b[1] + d[i][1]]);

    // polarizability cloud: area ∝ α  → radius ∝ sqrt(α)
    const scale = Math.sqrt(aNow);
    const rx = (gap + 46) * scale, ry = 46 * scale;
    const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx);
    const glow = MODES[mode].raman ? 0.16 : 0.07;
    grd.addColorStop(0, `rgba(56,189,248,${glow + 0.06})`);
    grd.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(56,189,248,${MODES[mode].raman ? 0.5 : 0.25})`;
    ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);

    // bonds
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pos[0][0], pos[0][1]); ctx.lineTo(pos[1][0], pos[1][1]);
    ctx.lineTo(pos[2][0], pos[2][1]); ctx.stroke();

    // atoms
    const atoms = [
      { p: pos[0], r: 17, c: '#ef4444', t: 'O' },
      { p: pos[1], r: 22, c: '#52525b', t: 'C' },
      { p: pos[2], r: 17, c: '#ef4444', t: 'O' }
    ];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const a of atoms) {
      const g2 = ctx.createRadialGradient(a.p[0]-a.r*0.3, a.p[1]-a.r*0.3, 2, a.p[0], a.p[1], a.r);
      g2.addColorStop(0, '#ffffff'); g2.addColorStop(0.25, a.c); g2.addColorStop(1, a.c);
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(a.p[0], a.p[1], a.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px DM Sans, sans-serif';
      ctx.fillText(a.t, a.p[0], a.p[1]);
    }

    // α gauge bar (0.5..1.5 → 0..100%)
    if (arFill) {
      const pct = Math.max(0, Math.min(1, (aNow - 0.5) / 1)) * 100;
      arFill.style.width = pct + '%';
    }
  }

  function loop() {
    if (!running) return;
    t0 += 0.004;
    drawTraces();
    drawMolecule();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { drawTraces(); drawMolecule(); drawSpectrum(); });
  setMode('sym');
  drawTraces(); drawMolecule();
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
  const Y = { virtual: 70, v1: 232, v0: 258 };
  const X = { up: 165, down: 285 };

  const procs = {
    rayleigh: { start: Y.v0, end: Y.v0, scattered: COL.rayleigh,
      text: 'Rayleigh (elastic): the molecule returns to its original level, so the scattered photon has the same energy as the incident photon — the strongest line, carrying no vibrational information.' },
    stokes: { start: Y.v0, end: Y.v1, scattered: COL.stokes,
      text: 'Stokes: the molecule ends in a higher vibrational level (v=1), keeping some energy. The scattered photon is red-shifted by exactly the vibrational energy ℏω_v.' },
    antistokes: { start: Y.v1, end: Y.v0, scattered: COL.anti,
      text: 'anti-Stokes: the molecule starts vibrationally excited (v=1) and ends at v=0, handing energy to the photon. The scattered photon is blue-shifted by ℏω_v — and weaker, since few molecules start excited.' }
  };

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  wrap.appendChild(svg);
  function add(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    svg.appendChild(el); return el;
  }
  const defs = add('defs', {});
  (function marker(id, color) {
    const m = document.createElementNS(SVGNS, 'marker');
    m.setAttribute('id', id); m.setAttribute('markerWidth', '8'); m.setAttribute('markerHeight', '8');
    m.setAttribute('refX', '4'); m.setAttribute('refY', '4'); m.setAttribute('orient', 'auto');
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', 'M0,0 L8,4 L0,8 Z'); p.setAttribute('fill', color);
    m.appendChild(p); defs.appendChild(m);
  })('mUp', COL.field);

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

  const upArrow   = add('line', { stroke: COL.field, 'stroke-width': 3, 'marker-end': 'url(#mUp)' });
  const downArrow = add('line', { stroke: COL.rayleigh, 'stroke-width': 3, 'marker-end': 'url(#mUp)' });
  const photon    = add('circle', { r: 6, fill: COL.field, opacity: 0 });

  let cur = 'rayleigh', t = 0, dir = 1;

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
    if (dir === 1) {
      photon.setAttribute('fill', COL.field);
      photon.setAttribute('cx', X.up);
      photon.setAttribute('cy', p.start + (Y.virtual - p.start) * t);
    } else {
      photon.setAttribute('fill', p.scattered);
      photon.setAttribute('cx', X.down);
      photon.setAttribute('cy', Y.virtual + (p.end - Y.virtual) * t);
    }
    requestAnimationFrame(animate);
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
