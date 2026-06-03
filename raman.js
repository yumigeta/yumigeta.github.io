/* ============================================================
   Interactive Raman spectroscopy demo — vanilla JS, no deps.

   Module 00: Atom + E-field → electron cloud displacement
              (based on the colour slide: 光の散乱の仕組み)

   Module 01: Unified vibration → α(Q) → modulation → spectrum
              Incorporates the textbook figure:
              (a) light field + dipole timeline
              (b) CO₂ modes + α(Q) with ∂α/∂Q slope
              (c) AM decomposition into ν₀, ν₀±νₘ components

   Module 02: Jablonski energy-level diagram
   ============================================================ */

const TAU = Math.PI * 2;
const COL = {
  field:     '#fbbf24',
  vib:       '#38bdf8',
  dipole:    '#f5f5f4',
  rayleigh:  '#16a34a',
  stokes:    '#ef4444',
  anti:      '#3b82f6',
  axis:      'rgba(255,255,255,0.25)',
  now:       'rgba(251,191,36,0.55)',
  nucleus:   '#ef4444',
  cloud:     '#38bdf8',
  cloudDim:  'rgba(56,189,248,0.12)',
  cloudBright: 'rgba(56,189,248,0.28)'
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

/* ============================================================
   Module 00 — What is polarizability?
   Atom: nucleus (⊕) + electron cloud displaced by E(t).
   Matches the colour slide (光の散乱の仕組み).
   ============================================================ */
(function atomModule() {
  const cv = document.getElementById('c-atom');
  if (!cv) return;

  let t = 0;
  const OMEGA = 2.5;

  function frame() {
    const { ctx, w, h } = fitCanvas(cv);
    const cx = w / 2, cy = h / 2;
    const E = Math.sin(TAU * OMEGA * t);          // normalised E-field: -1..1
    const cloudShift = E * 36;                     // electron cloud displacement (px)
    const nucR = 14, cloudR = 56;

    // E-field arrows (uniform field, top & bottom)
    const arrowColor = E > 0 ? '#fbbf24' : '#f87171';
    ctx.strokeStyle = arrowColor; ctx.lineWidth = 2;
    ctx.fillStyle = arrowColor;
    const arrowY = cy + E * 6;
    for (const xOff of [-140, -70, 0, 70, 140]) {
      const ax = cx + xOff;
      const arrLen = 28 * Math.abs(E);
      if (arrLen < 3) continue;
      const dy = E > 0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(ax, cy + dy * 50);
      ctx.lineTo(ax, cy + dy * 50 - dy * arrLen);
      ctx.stroke();
      // arrowhead
      ctx.beginPath();
      const tipY = cy + dy * 50 - dy * arrLen;
      ctx.moveTo(ax - 4, tipY + dy * 7);
      ctx.lineTo(ax, tipY);
      ctx.lineTo(ax + 4, tipY + dy * 7);
      ctx.fill();
    }

    // E-field label
    ctx.fillStyle = '#a8a29e'; ctx.font = '11px DM Sans, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('E(t)', cx - 170, cy - 50);
    const sign = E > 0 ? '↑' : E < 0 ? '↓' : '·';
    ctx.fillStyle = arrowColor;
    ctx.fillText(sign, cx - 154, cy - 50);

    // electron cloud (displaced)
    const grd = ctx.createRadialGradient(cx, cy + cloudShift, 4, cx, cy + cloudShift, cloudR);
    grd.addColorStop(0, COL.cloudBright);
    grd.addColorStop(0.6, COL.cloudDim);
    grd.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy + cloudShift, cloudR, 0, TAU); ctx.fill();

    // cloud outline (dashed)
    ctx.strokeStyle = 'rgba(56,189,248,0.4)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(cx, cy + cloudShift, cloudR, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);

    // nucleus (stays mostly fixed)
    ctx.fillStyle = COL.nucleus;
    ctx.beginPath(); ctx.arc(cx, cy, nucR, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px DM Sans, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⊕', cx, cy);

    // induced dipole arrow μ
    if (Math.abs(cloudShift) > 3) {
      const muDir = -cloudShift;                   // μ points from − to +
      ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 90, cy);
      ctx.lineTo(cx + 90, cy + muDir * 0.7);
      ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      const tipY2 = cy + muDir * 0.7;
      const d2 = muDir > 0 ? 1 : -1;
      ctx.moveTo(cx + 90 - 5, tipY2 - d2 * 8);
      ctx.lineTo(cx + 90, tipY2);
      ctx.lineTo(cx + 90 + 5, tipY2 - d2 * 8);
      ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.font = '12px DM Sans, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('μ = α·E', cx + 100, cy);
    }

    // labels
    ctx.fillStyle = COL.nucleus; ctx.font = '11px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('nucleus (+)', cx, cy + nucR + 16);
    ctx.fillStyle = COL.cloud;
    ctx.fillText('electron cloud (−)', cx, cy + cloudShift - cloudR - 8);

    // equilibrium line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(cx - 100, cy); ctx.lineTo(cx + 80, cy); ctx.stroke();
    ctx.setLineDash([]);

    t += 0.003;
    requestAnimationFrame(frame);
  }
  frame();
})();


/* ============================================================
   Module 01 — Unified: vibration → α(Q) → modulation → spectrum
   ============================================================ */
(function unified() {
  const cMol    = document.getElementById('c-molecule');
  const cAlphaQ = document.getElementById('c-alphaQ');
  const cField  = document.getElementById('c-field');
  const cAlpha  = document.getElementById('c-alpha');
  const cDip    = document.getElementById('c-dipole');
  const cSpec   = document.getElementById('c-spectrum');
  const cDecRay = document.getElementById('c-dec-ray');
  const cDecStk = document.getElementById('c-dec-stokes');
  const cDecAnt = document.getElementById('c-dec-anti');
  if (!cMol) return;

  const sVib   = document.getElementById('ctrl-vib');
  const vVib   = document.getElementById('v-vib');
  const btn    = document.getElementById('btn-play');
  const cap    = document.getElementById('spec-cap');
  const modeEl = document.getElementById('mode-explanation');

  const CARRIER = 16;
  let t0 = 0;
  let running = true;

  const MODES = {
    sym: {
      raman: true, dAdQ: 0.55,
      badge: '<span class="mol-activity raman">Raman-active</span>',
      text: '<b>Symmetric stretch</b>: both C=O bonds lengthen and shorten together → the electron cloud expands and contracts → <b>α oscillates</b> (∂α/∂Q ≠ 0 at Q=0). The induced dipole is amplitude-modulated, creating Stokes & anti-Stokes sidebands.'
    },
    asym: {
      raman: false, dAdQ: 0,
      badge: '<span class="mol-activity ir">Raman-inactive (IR-active)</span>',
      text: '<b>Asymmetric stretch</b>: one bond lengthens as the other shortens — the two polarizability changes cancel (∂α/∂Q = 0 at Q=0). The α(Q) curve has a <em>minimum</em> at equilibrium — no first-order α change, no Raman sidebands.'
    },
    bend: {
      raman: false, dAdQ: 0,
      badge: '<span class="mol-activity ir">Raman-inactive (IR-active)</span>',
      text: '<b>Bend</b>: the molecule flexes — by symmetry this does not change α to first order (∂α/∂Q = 0). The α(Q) curve again has a minimum at Q=0.'
    }
  };
  let mode = 'sym';
  let vib = +sVib.value;

  const effMod = () => MODES[mode].dAdQ;

  // master signals
  const Efn = t => Math.cos(TAU * CARRIER * t);
  const qfn = t => Math.cos(TAU * vib * t);
  const afn = t => 1 + effMod() * qfn(t);
  const pfn = t => afn(t) * Efn(t) / (1 + Math.max(effMod(), 0.001));

  // decomposed components (product-to-sum identity)
  const rayFn = t => Math.cos(TAU * CARRIER * t);
  const stkFn = t => Math.cos(TAU * (CARRIER - vib) * t);
  const antFn = t => Math.cos(TAU * (CARRIER + vib) * t);

  function readControls() {
    vib = +sVib.value;
    vVib.textContent = vib.toFixed(2) + '×';
    drawSpectrum();
  }
  sVib.addEventListener('input', readControls);
  btn.addEventListener('click', () => {
    running = !running;
    btn.textContent = running ? 'Pause' : 'Play';
    btn.classList.toggle('active', running);
    if (running) loop();
  });

  function setMode(m) {
    mode = m;
    modeEl.innerHTML = MODES[m].badge + ' ' + MODES[m].text;
    readControls();
  }
  document.getElementById('mol-btns').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    document.querySelectorAll('#mol-btns .demo-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    setMode(b.dataset.mode);
  });

  // ── drawing helpers ──
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
    const N = Math.max(180, w);
    for (let i = 0; i <= N; i++) {
      const t = t0 + (i / N);
      const y = h / 2 - fn(t) * (h / 2 - 6);
      i ? ctx.lineTo(i / N * w, y) : ctx.moveTo(0, y);
    }
    ctx.stroke();
  }

  // ── CO₂ molecule with electron cloud ellipse ──
  function drawMolecule() {
    const { ctx, w, h } = fitCanvas(cMol);
    const tNow = t0 + 1;
    const q = qfn(tNow);
    const cx = w / 2, cy = h / 2;
    const gap = Math.min(62, w * 0.22);

    // displacement per atom
    const A = 14;
    let pos;
    if (mode === 'sym')       pos = [[cx-gap - A*q, cy], [cx, cy], [cx+gap + A*q, cy]];
    else if (mode === 'asym') pos = [[cx-gap + A*q, cy], [cx - A*0.6*q, cy], [cx+gap + A*q, cy]];
    else                      pos = [[cx-gap, cy - A*q], [cx, cy + A*1.1*q], [cx+gap, cy - A*q]];

    // electron cloud ellipse — shape changes with mode
    const aNow = afn(tNow);
    let eRx, eRy;
    if (mode === 'sym') {
      // symmetric: ellipse elongates/contracts horizontally with vibration
      eRx = (gap + 42) * Math.sqrt(aNow);
      eRy = 36 / Math.sqrt(aNow);
    } else if (mode === 'asym') {
      // asymmetric: ellipse doesn't change (to 1st order)
      eRx = gap + 42;
      eRy = 36;
    } else {
      // bend: ellipse doesn't change (to 1st order)
      eRx = gap + 42;
      eRy = 36;
    }

    // draw cloud
    const grd = ctx.createRadialGradient(cx, cy, 6, cx, cy, Math.max(eRx, eRy));
    const brightness = MODES[mode].raman ? 0.22 : 0.10;
    grd.addColorStop(0, `rgba(56,189,248,${brightness + 0.08})`);
    grd.addColorStop(0.7, `rgba(56,189,248,${brightness * 0.4})`);
    grd.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(cx, cy, eRx, eRy, 0, 0, TAU); ctx.fill();

    // cloud outline
    ctx.strokeStyle = `rgba(56,189,248,${MODES[mode].raman ? 0.5 : 0.25})`;
    ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.ellipse(cx, cy, eRx, eRy, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);

    // label
    ctx.fillStyle = 'rgba(56,189,248,0.5)'; ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('electron cloud (α)', cx, cy - eRy - 6);

    // bonds
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pos[0][0], pos[0][1]);
    ctx.lineTo(pos[1][0], pos[1][1]);
    ctx.lineTo(pos[2][0], pos[2][1]);
    ctx.stroke();

    // double-bond marks
    for (const [a, b] of [[pos[0], pos[1]], [pos[1], pos[2]]]) {
      const mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(mx, my-7); ctx.lineTo(mx, my+7); ctx.stroke();
    }

    // atoms
    const atoms = [
      { p: pos[0], r: 15, c: '#ef4444', t: 'O' },
      { p: pos[1], r: 18, c: '#52525b', t: 'C' },
      { p: pos[2], r: 15, c: '#ef4444', t: 'O' }
    ];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const a of atoms) {
      const g2 = ctx.createRadialGradient(a.p[0]-a.r*0.3, a.p[1]-a.r*0.3, 2, a.p[0], a.p[1], a.r);
      g2.addColorStop(0, '#ffffff'); g2.addColorStop(0.25, a.c); g2.addColorStop(1, a.c);
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(a.p[0], a.p[1], a.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px DM Sans, sans-serif';
      ctx.fillText(a.t, a.p[0], a.p[1]);
    }
  }

  // ── α(Q) curve with moving dot (textbook figure 1b) ──
  function drawAlphaQ() {
    const { ctx, w, h } = fitCanvas(cAlphaQ);
    const pad = 36, plotW = w - pad * 2, plotH = h - pad * 2;
    const ox = pad, oy = pad;

    // axes
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox, oy + plotH); ctx.lineTo(ox + plotW, oy + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy + plotH); ctx.lineTo(ox, oy); ctx.stroke();

    // axis labels
    ctx.fillStyle = '#a8a29e'; ctx.font = '12px DM Sans, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Q', ox + plotW + 6, oy + plotH + 4);
    ctx.save(); ctx.translate(ox - 14, oy + plotH / 2);
    ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle';
    ctx.fillText('α', 0, 0); ctx.restore();

    // Q=0 tick
    const qx0 = ox + plotW / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(qx0, oy); ctx.lineTo(qx0, oy + plotH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#78716c'; ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('0', qx0, oy + plotH + 4);

    // α(Q) curve shape
    // symmetric stretch: α = α₀ + a·Q  (linear + small quadratic)
    // asymmetric/bend:   α = α₀ + b·Q² (parabola, minimum at 0)
    const isSym = (mode === 'sym');
    ctx.strokeStyle = COL.vib; ctx.lineWidth = 2.5;
    ctx.beginPath();
    const N = 120;
    for (let i = 0; i <= N; i++) {
      const Q = (i / N) * 2 - 1;                  // -1..1
      let alpha;
      if (isSym) {
        alpha = 0.5 + 0.35 * Q + 0.12 * Q * Q;   // has slope at Q=0
      } else {
        alpha = 0.35 + 0.45 * Q * Q;              // minimum at Q=0
      }
      const px = ox + (Q + 1) / 2 * plotW;
      const py = oy + plotH - alpha * plotH;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();

    // tangent line at Q=0 to show ∂α/∂Q
    const slope = isSym ? 0.35 : 0;               // matches the derivative at Q=0
    const alpha0 = isSym ? 0.5 : 0.35;
    if (isSym) {
      ctx.strokeStyle = 'rgba(251,191,36,0.6)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const Q = (i / N) * 2 - 1;
        const a = alpha0 + slope * Q;
        const px = ox + (Q + 1) / 2 * plotW;
        const py = oy + plotH - a * plotH;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ∂α/∂Q annotation
    ctx.fillStyle = isSym ? '#fbbf24' : '#78716c';
    ctx.font = 'bold 12px DM Sans, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(isSym ? '∂α/∂Q ≠ 0' : '∂α/∂Q = 0', ox + plotW - 4, oy + 18);

    // moving dot: Q oscillates sinusoidally
    const tNow = t0 + 1;
    const Q = qfn(tNow);
    let alphaVal;
    if (isSym) {
      alphaVal = 0.5 + 0.35 * Q + 0.12 * Q * Q;
    } else {
      alphaVal = 0.35 + 0.45 * Q * Q;
    }
    const dotX = ox + (Q + 1) / 2 * plotW;
    const dotY = oy + plotH - alphaVal * plotH;

    // dot trail (fading)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(dotX, dotY, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, TAU); ctx.fill();

    // horizontal line from dot to α axis
    ctx.strokeStyle = 'rgba(251,191,36,0.3)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(dotX, dotY); ctx.lineTo(ox, dotY); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── time-domain traces ──
  function drawTraces() {
    let g;
    g = fitCanvas(cField); axis(g.ctx, g.w, g.h);
    plot(g.ctx, g.w, g.h, Efn, COL.field); nowLine(g.ctx, g.w, g.h);

    g = fitCanvas(cAlpha); axis(g.ctx, g.w, g.h);
    const m = effMod();
    plot(g.ctx, g.w, g.h, t => (afn(t) - 1) / Math.max(m, 0.001), COL.vib, 2.2);
    nowLine(g.ctx, g.w, g.h);
    if (!MODES[mode].raman) {
      g.ctx.fillStyle = 'rgba(168,162,158,0.9)';
      g.ctx.font = '11px DM Sans, sans-serif'; g.ctx.textAlign = 'left';
      g.ctx.fillText('α constant — ∂α/∂Q = 0 at equilibrium', 8, 16);
    }

    g = fitCanvas(cDip); axis(g.ctx, g.w, g.h);
    // modulation envelope
    g.ctx.strokeStyle = 'rgba(56,189,248,0.3)'; g.ctx.lineWidth = 1.5;
    g.ctx.setLineDash([4, 4]);
    for (const s of [1, -1]) {
      g.ctx.beginPath();
      const N = g.w;
      for (let i = 0; i <= N; i++) {
        const t = t0 + i / N;
        const env = s * afn(t) / (1 + Math.max(m, 0.001));
        const y = g.h / 2 - env * (g.h / 2 - 6);
        i ? g.ctx.lineTo(i / N * g.w, y) : g.ctx.moveTo(0, y);
      }
      g.ctx.stroke();
    }
    g.ctx.setLineDash([]);
    plot(g.ctx, g.w, g.h, pfn, COL.dipole);
    nowLine(g.ctx, g.w, g.h);
  }

  // ── Decomposition traces (fig 1c) ──
  function drawDecomp() {
    const m = effMod();
    const amp0 = 1 / (1 + Math.max(m, 0.001));
    const ampSide = (m / 2) / (1 + Math.max(m, 0.001));

    function plotSmall(cv, fn, color, amplitude) {
      const { ctx, w, h } = fitCanvas(cv);
      ctx.strokeStyle = COL.axis; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
      if (amplitude < 0.001) {
        ctx.fillStyle = 'rgba(168,162,158,0.5)';
        ctx.font = '10px DM Sans, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('(zero)', w/2, h/2 - 5);
        return;
      }
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath();
      const N = Math.max(120, w);
      for (let i = 0; i <= N; i++) {
        const t = t0 + i / N;
        const y = h/2 - fn(t) * amplitude * (h/2 - 4);
        i ? ctx.lineTo(i/N * w, y) : ctx.moveTo(0, y);
      }
      ctx.stroke();
    }

    plotSmall(cDecRay, rayFn, COL.rayleigh, amp0);
    plotSmall(cDecStk, stkFn, COL.stokes, ampSide);
    plotSmall(cDecAnt, antFn, COL.anti, ampSide);
  }

  // ── Spectrum ──
  function drawSpectrum() {
    const { ctx, w, h } = fitCanvas(cSpec);
    const pad = 28, baseY = h - 22, topY = 14;
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(w - 8, baseY); ctx.stroke();

    const cx2 = w / 2;
    const span = (w / 2 - pad) / 3.2;
    const off = Math.min(vib, 3) * span;
    const m = effMod();
    const rayH = baseY - topY;
    const sideH = (baseY - topY) * (m / (1 + m)) * 1.6;

    const bars = [
      { x: cx2,       H: rayH,  c: COL.rayleigh },
      { x: cx2 - off, H: sideH, c: COL.stokes },
      { x: cx2 + off, H: sideH, c: COL.anti }
    ];
    for (const b of bars) {
      if (b.H < 1) continue;
      ctx.strokeStyle = b.c; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(b.x, baseY); ctx.lineTo(b.x, baseY - b.H); ctx.stroke();
      ctx.fillStyle = b.c;
      ctx.beginPath(); ctx.arc(b.x, baseY - b.H, 3.5, 0, TAU); ctx.fill();
    }
    ctx.font = '11px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#a8a29e';
    ctx.fillText('ω₀', cx2, baseY + 14);
    if (m > 0.001) {
      ctx.fillText('ω₀−ωᵥ', cx2 - off, baseY + 14);
      ctx.fillText('ω₀+ωᵥ', cx2 + off, baseY + 14);
    }
    ctx.textAlign = 'left'; ctx.fillText('intensity', 6, topY + 2);

    cap.innerHTML = m < 0.001
      ? 'This mode does not change α, so the induced dipole is a pure carrier — <b>only the elastic Rayleigh line</b> appears. No Raman sidebands.'
      : 'The Raman shift equals the vibrational frequency ω<sub>v</sub>. Classically Stokes and anti-Stokes are equal; Boltzmann population makes anti-Stokes weaker at room temperature.';
  }

  function loop() {
    if (!running) return;
    t0 += 0.004;
    drawMolecule();
    drawAlphaQ();
    drawTraces();
    drawDecomp();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    drawMolecule(); drawAlphaQ(); drawTraces(); drawDecomp(); drawSpectrum();
  });

  setMode('sym');
  drawMolecule(); drawAlphaQ(); drawTraces(); drawDecomp();
  loop();
})();


/* ============================================================
   Module 02 — Jablonski diagram (SVG)
   ============================================================ */
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
      text: 'Rayleigh (elastic): the molecule returns to its original level — the scattered photon has the same energy. Strongest line, but carries no vibrational information.' },
    stokes: { start: Y.v0, end: Y.v1, scattered: COL.stokes,
      text: 'Stokes: the molecule ends in a higher vibrational level (v=1), keeping energy ℏω<sub>v</sub>. The scattered photon is red-shifted.' },
    antistokes: { start: Y.v1, end: Y.v0, scattered: COL.anti,
      text: 'anti-Stokes: the molecule starts at v=1, ends at v=0, giving energy ℏω<sub>v</sub> to the photon. Blue-shifted — and weaker, since few molecules start excited.' }
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
  function mkMarker(id, color) {
    const m = document.createElementNS(SVGNS, 'marker');
    m.setAttribute('id', id); m.setAttribute('markerWidth', '8'); m.setAttribute('markerHeight', '8');
    m.setAttribute('refX', '4'); m.setAttribute('refY', '4'); m.setAttribute('orient', 'auto');
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', 'M0,0 L8,4 L0,8 Z'); p.setAttribute('fill', color);
    m.appendChild(p); defs.appendChild(m);
  }
  mkMarker('mUp', COL.field);

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
    cur = name; const p = procs[name];
    upArrow.setAttribute('x1', X.up); upArrow.setAttribute('x2', X.up);
    upArrow.setAttribute('y1', p.start); upArrow.setAttribute('y2', Y.virtual + 6);
    downArrow.setAttribute('x1', X.down); downArrow.setAttribute('x2', X.down);
    downArrow.setAttribute('y1', Y.virtual); downArrow.setAttribute('y2', p.end - 6);
    downArrow.setAttribute('stroke', p.scattered);
    cap.innerHTML = p.text; t = 0; dir = 1;
  }
  function animate() {
    const p = procs[cur]; t += 0.018;
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
  setProc('rayleigh'); animate();
})();
