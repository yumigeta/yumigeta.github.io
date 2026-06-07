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

  const FONT = "'Zen Kaku Gothic New', system-ui, sans-serif";
  const OMEGA   = 2.6;     // incident field   (fast)
  const OMEGA_V = 0.42;    // lattice vibration (slow)
  const MOD     = 0.45;    // α modulation depth
  const AMP     = 22;      // base displacement scale (px)

  // ── controls ───────────────────────────────────────────────
  const slider   = document.getElementById('ctrl-alpha');
  const out      = document.getElementById('v-alpha');
  const modeBtns = document.getElementById('atom-mode');
  let mode = 'const';                                   // 'const' | 'mod'
  const baseAlpha = () => slider ? parseFloat(slider.value) : 1.0;
  function syncOut() { if (out) out.textContent = 'α₀ = ' + baseAlpha().toFixed(2); }
  if (slider) { slider.addEventListener('input', syncOut); syncOut(); }
  if (modeBtns) modeBtns.addEventListener('click', e => {
    const b = e.target.closest('[data-amode]'); if (!b) return;
    mode = b.dataset.amode;
    modeBtns.querySelectorAll('.demo-btn').forEach(x => x.classList.toggle('active', x === b));
  });

  // ── drawing helpers ────────────────────────────────────────
  function charge(ctx, x, y, r, fill, glyph) {
    ctx.save();
    ctx.shadowColor = fill; ctx.shadowBlur = 14;
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(r * 1.25) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(glyph, x, y);
  }
  function fieldArrow(ctx, x, yb, dir, len, col) {
    if (len < 2) return;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    const tip = yb + dir * len;
    ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, tip); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 4.5, tip - dir * 6.5); ctx.lineTo(x, tip); ctx.lineTo(x + 4.5, tip - dir * 6.5);
    ctx.closePath(); ctx.fill();
  }

  let t = 0;
  const muHist = [];            // μ(t) history for the scrolling plot
  const HISTN = 560;            // long time window
  function frame() {
    if (cv.offsetWidth === 0) { requestAnimationFrame(frame); return; }
    const { ctx, w, h } = fitCanvas(cv);
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    const cy = h / 2;
    const divX = Math.round(w * 0.46);              // split: atom (left) | μ-plot (right)
    const cxL  = divX / 2;
    const pX0 = divX + 14, pX1 = w - 10, pW = pX1 - pX0;

    const E        = Math.sin(TAU * OMEGA * t);
    const aEnv     = mode === 'mod' ? (1 + MOD * Math.sin(TAU * OMEGA_V * t)) : 1;
    const alphaNow = baseAlpha() * aEnv;                             // α(t)
    const cloudShift = E * AMP * alphaNow;                            // displacement ∝ α(t)·E(t)
    const cloudR = 54, nucR = 14, negR = 12;
    const negY = cy + cloudShift;
    const up = E >= 0, dir = up ? -1 : 1, mag = Math.abs(E);
    const fcol = up ? '#fbbf24' : '#f87171';

    muHist.push(cloudShift);
    if (muHist.length > HISTN) muHist.shift();

    // ── background grid (whole canvas) ──
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let gx = (divX % 26); gx <= w; gx += 26) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h); }
    for (let gy = (cy % 26); gy <= h; gy += 26) { ctx.moveTo(0, gy); ctx.lineTo(w, gy); }
    ctx.stroke();

    // ── divider ──
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(divX, 14); ctx.lineTo(divX, h - 14); ctx.stroke();

    // ════════ LEFT: vibrating atom ════════
    for (const x of [cxL - 64, cxL - 22, cxL + 22, cxL + 64]) {
      fieldArrow(ctx, x, 26, dir, 20 * mag, fcol);
      fieldArrow(ctx, x, h - 26, dir, 20 * mag, fcol);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(18, cy); ctx.lineTo(divX - 16, cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#a8a29e'; ctx.font = '12px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('E(t)', 14, 20);

    const grd = ctx.createRadialGradient(cxL, negY, 4, cxL, negY, cloudR);
    grd.addColorStop(0,    'rgba(56,189,248,0.44)');
    grd.addColorStop(0.55, 'rgba(56,189,248,0.16)');
    grd.addColorStop(1,    'rgba(56,189,248,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cxL, negY, cloudR, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.5)'; ctx.lineWidth = 1.25; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(cxL, negY, cloudR, 0, TAU); ctx.stroke(); ctx.setLineDash([]);

    charge(ctx, cxL, negY, negR, COL.cloud,   '−');
    charge(ctx, cxL, cy,   nucR, COL.nucleus, '+');

    if (Math.abs(cloudShift) > 4) {
      const sgn = Math.sign(cloudShift), ax = cxL + cloudR + 16;
      ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, negY); ctx.lineTo(ax, cy); ctx.stroke();
      ctx.fillStyle = '#fcd34d'; ctx.beginPath();
      ctx.moveTo(ax - 5, cy + sgn * 9); ctx.lineTo(ax, cy); ctx.lineTo(ax + 5, cy + sgn * 9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fcd34d'; ctx.font = 'italic 15px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('μ', ax + 9, (negY + cy) / 2);
    }

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '12px ' + FONT;
    ctx.fillStyle = mode === 'mod' ? '#7dd3fc' : '#a8a29e';
    ctx.fillText(mode === 'mod' ? (lang === 'ja' ? 'α(t) 変調' : 'α(t) modulated')
                                : (lang === 'ja' ? 'α 一定' : 'α constant'), 14, h - 12);

    // ════════ RIGHT: μ(t) plot (flows left → right) ════════
    const muS = (h / 2 - 26) / (AMP * 2.4);
    ctx.save();
    ctx.beginPath(); ctx.rect(pX0, 12, pW, h - 24); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let gy = (cy % 24); gy <= h; gy += 24) { ctx.moveTo(pX0, gy); ctx.lineTo(pX1, gy); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pX0, cy); ctx.lineTo(pX1, cy); ctx.stroke(); ctx.setLineDash([]);
    const n = muHist.length, dx = pW / (HISTN - 1);
    ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = n - 1; i >= 0; i--) {                 // newest at the left, flowing right
      const x = pX0 + (n - 1 - i) * dx;
      const y = cy + muHist[i] * muS;                  // same vertical sense as the electron cloud
      (i === n - 1) ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fcd34d'; ctx.font = 'italic 13px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('μ(t)', pX0 + 4, 22);

    t += 0.0045;
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
  const cDecOvr = document.getElementById('c-dec-over');
  if (!cMol) return;

  const sAmp   = document.getElementById('ctrl-amp');
  const vAmp   = document.getElementById('v-amp');
  const btn    = document.getElementById('btn-play');
  const cap    = document.getElementById('spec-cap');
  const modeEl = document.getElementById('mode-explanation');

  const CARRIER = 16;
  let t0 = 0;
  let running = true;

  // Each mode is defined by its polarizability expansion
  //   α(Q) = a₀ + c₁·Q + c₂·Q²   (c₁ = ∂α/∂Q,  c₂ = ½ ∂²α/∂Q²)
  const MODES = {
    sym: {
      raman: true, a0: 0.50, c1: 0.55, c2: 0.06,
      badge: '<span class="mol-activity raman">Raman-active</span>',
      text: '<b>Symmetric stretch</b>: both C=O bonds lengthen and shorten together → the electron cloud breathes → <b>α changes linearly with Q</b> (∂α/∂Q ≠ 0). This first-order change modulates the dipole at ω<sub>v</sub>, giving the fundamental Stokes & anti-Stokes lines.'
    },
    asym: {
      raman: false, a0: 0.30, c1: 0, c2: 0.20,
      badge: '<span class="mol-activity ir">Raman-inactive (IR-active)</span>',
      text: '<b>Asymmetric stretch</b>: one bond lengthens as the other shortens, so the two polarizability changes cancel — ∂α/∂Q = 0 at equilibrium. α(Q) is a <em>parabola</em> symmetric about Q = 0: no first-order modulation at ω<sub>v</sub>, so <b>no Raman signal</b>.'
    },
    bend: {
      raman: false, a0: 0.30, c1: 0, c2: 0.20,
      badge: '<span class="mol-activity ir">Raman-inactive (IR-active)</span>',
      text: '<b>Bend</b>: by symmetry ∂α/∂Q = 0 at equilibrium, so α(Q) is again a parabola — no first-order modulation, hence <b>Raman-inactive</b>.'
    }
  };
  let mode = 'sym';
  const vib = 3;
  const amp = 0.15;                       // vibration amplitude Q₀ for α-Q plot (small)
  const molAmp = 0.7;                     // visual amplitude for molecule/electron-density panel

  // polarizability vs the vibrational coordinate (the SAME curve drawn in α–Q)
  const alphaOfQ = Q => { const M = MODES[mode]; return M.a0 + M.c1 * Q + M.c2 * Q * Q; };

  // master signals — one shared clock
  const Efn = t => Math.cos(TAU * CARRIER * t);
  const Qfn = t => amp * Math.cos(TAU * vib * t);    // vibrational coordinate Q(t)
  const QfnMol = t => molAmp * Math.cos(TAU * vib * t);  // molecule display coordinate
  const afn = t => alphaOfQ(Qfn(t));                  // polarizability α(t), always > 0

  // Fourier content of α(t):
  //   α(t) = ᾱ + (c₁Q₀)·cos(ωᵥt)
  // → fundamental sidebands ∝ c₁Q₀  (first derivative, ω₀±ωᵥ)
  const abar  = () => { const M = MODES[mode]; return M.a0 + 0.5 * M.c2 * amp * amp; };
  const fundC = () => Math.abs(MODES[mode].c1) * amp;
  const overC = () => 0.5 * MODES[mode].c2 * amp * amp;
  const pnorm = () => { const M = MODES[mode]; return M.a0 + Math.abs(M.c1) * amp + M.c2 * amp * amp + 1e-6; };
  const pfn   = t => afn(t) * Efn(t) / pnorm();

  // decomposed components (product-to-sum identity)
  const rayFn  = t => Math.cos(TAU * CARRIER * t);
  const stkFn  = t => Math.cos(TAU * (CARRIER - vib) * t);
  const antFn  = t => Math.cos(TAU * (CARRIER + vib) * t);
  const overFn = t => Math.cos(TAU * (CARRIER + 2 * vib) * t);

  drawSpectrum();
  btn.addEventListener('click', () => {
    running = !running;
    btn.textContent = running ? 'Pause' : 'Play';
    btn.classList.toggle('active', running);
    if (running) loop();
  });

  function setMode(m) {
    mode = m;
    modeEl.innerHTML = MODES[m].badge + ' ' + MODES[m].text;
    drawSpectrum();
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

  // ── CO₂ electron-density cloud ──
  // The cloud is NOT a drawn ellipse. It is a real electron-density field:
  // a superposition of Gaussian densities centred on each atom and bond,
  // ρ(r) = Σ wᵢ·exp(−|r−rᵢ|²/2σᵢ²). The shape (a peanut along the O=C=O
  // axis) is therefore emergent, and it deforms correctly with each mode.
  // We render the field as a heat map plus iso-density contour lines.
  let _off, _offctx, _field, _GW, _GH;

  function computeField(w, h, sources) {
    const cell = 4;
    const GW = Math.max(2, Math.round(w / cell));
    const GH = Math.max(2, Math.round(h / cell));
    if (!_field || _GW !== GW || _GH !== GH) {
      _GW = GW; _GH = GH; _field = new Float32Array(GW * GH);
      _off = document.createElement('canvas');
      _off.width = GW; _off.height = GH;
      _offctx = _off.getContext('2d');
    }
    let dmax = 0;
    for (let gy = 0; gy < GH; gy++) {
      const py = gy / (GH - 1) * h;
      for (let gx = 0; gx < GW; gx++) {
        const px = gx / (GW - 1) * w;
        let d = 0;
        for (const s of sources) {
          const dx = px - s.x, dy = py - s.y;
          d += s.w * Math.exp(-(dx * dx + dy * dy) / (2 * s.s * s.s));
        }
        _field[gy * GW + gx] = d;
        if (d > dmax) dmax = d;
      }
    }
    return dmax;
  }

  function drawHeat(ctx, w, h, dmax) {
    const img = _offctx.createImageData(_GW, _GH);
    const data = img.data;
    for (let i = 0; i < _GW * _GH; i++) {
      const n = Math.min(1, _field[i] / dmax);
      const a = Math.pow(n, 0.9) * 0.9;
      data[i * 4] = 56; data[i * 4 + 1] = 189; data[i * 4 + 2] = 248;
      data[i * 4 + 3] = a * 255;
    }
    _offctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(_off, 0, 0, w, h);
  }

  function drawContour(ctx, w, h, thr, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
    const sx = w / (_GW - 1), sy = h / (_GH - 1);
    const F = _field, GW = _GW;
    for (let y = 0; y < _GH - 1; y++) {
      for (let x = 0; x < GW - 1; x++) {
        const v0 = F[y*GW+x], v1 = F[y*GW+x+1], v2 = F[(y+1)*GW+x+1], v3 = F[(y+1)*GW+x];
        let idx = 0;
        if (v0 > thr) idx |= 1; if (v1 > thr) idx |= 2;
        if (v2 > thr) idx |= 4; if (v3 > thr) idx |= 8;
        if (idx === 0 || idx === 15) continue;
        const top   = () => [(x + (thr-v0)/(v1-v0)) * sx, y * sy];
        const right = () => [(x+1) * sx, (y + (thr-v1)/(v2-v1)) * sy];
        const bot   = () => [(x + (thr-v3)/(v2-v3)) * sx, (y+1) * sy];
        const left  = () => [x * sx, (y + (thr-v0)/(v3-v0)) * sy];
        const seg = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };
        switch (idx) {
          case 1: case 14: seg(left(), top()); break;
          case 2: case 13: seg(top(), right()); break;
          case 3: case 12: seg(left(), right()); break;
          case 4: case 11: seg(right(), bot()); break;
          case 6: case 9:  seg(top(), bot()); break;
          case 7: case 8:  seg(left(), bot()); break;
          case 5:  seg(left(), top()); seg(right(), bot()); break;
          case 10: seg(left(), bot()); seg(top(), right()); break;
        }
      }
    }
    ctx.stroke();
  }

  function drawMolecule() {
    const { ctx, w, h } = fitCanvas(cMol);
    const tNow = t0 + 1;
    const q = QfnMol(tNow);                    // vibrational coordinate (visual amplitude)
    const cx = w / 2, cy = h / 2;
    const gap = Math.min(58, w * 0.21);
    const A = 15;                              // displacement amplitude (px)

    // atom positions + per-bond relative stretch (drives local cloud diffuseness)
    let pos, relL, relR;
    if (mode === 'sym') {                      // both bonds in phase
      pos = [[cx-(gap+A*q), cy], [cx, cy], [cx+(gap+A*q), cy]];
      relL = relR = q;
    } else if (mode === 'asym') {              // one stretches, other compresses
      pos = [[cx-(gap+A*q), cy], [cx + A*0.45*q, cy], [cx+(gap-A*q), cy]];
      relL = q; relR = -q;
    } else {                                   // bend — bonds keep length
      pos = [[cx-gap, cy - A*q], [cx, cy + A*1.05*q], [cx+gap, cy - A*q]];
      relL = relR = 0;
    }

    // electron-density sources: atoms (valence-weighted) + bond charge clouds.
    // σ grows with bond length: stretched bonds hold electrons more loosely
    // → more diffuse, more polarizable (this is what makes the symmetric
    // stretch's mean polarizability oscillate).
    const sO = 0.42 * gap + 11, sC = 0.36 * gap + 8, sB = 0.30 * gap + 7;
    const bL = [(pos[0][0]+pos[1][0])/2, (pos[0][1]+pos[1][1])/2];
    const bR = [(pos[1][0]+pos[2][0])/2, (pos[1][1]+pos[2][1])/2];
    const sources = [
      { x: pos[0][0], y: pos[0][1], w: 1.00, s: sO * (1 + 0.30*relL) },
      { x: pos[1][0], y: pos[1][1], w: 0.80, s: sC },
      { x: pos[2][0], y: pos[2][1], w: 1.00, s: sO * (1 + 0.30*relR) },
      { x: bL[0], y: bL[1], w: 0.45, s: sB * (1 + 0.25*relL) },
      { x: bR[0], y: bR[1], w: 0.45, s: sB * (1 + 0.25*relR) }
    ];

    const dmax = computeField(w, h, sources);
    drawHeat(ctx, w, h, dmax);
    drawContour(ctx, w, h, 0.30 * dmax, 'rgba(125,211,252,0.45)', 1);
    drawContour(ctx, w, h, 0.58 * dmax, 'rgba(186,230,253,0.6)', 1);

    // bonds
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(pos[0][0], pos[0][1]);
    ctx.lineTo(pos[1][0], pos[1][1]);
    ctx.lineTo(pos[2][0], pos[2][1]);
    ctx.stroke();

    // atoms
    const atoms = [
      { p: pos[0], r: 14, c: '#ef4444', t: 'O' },
      { p: pos[1], r: 17, c: '#52525b', t: 'C' },
      { p: pos[2], r: 14, c: '#ef4444', t: 'O' }
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

    // label
    ctx.fillStyle = 'rgba(125,211,252,0.7)'; ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('electron density ρ (schematic)', 8, 8);
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

    const isSym = (mode === 'sym');
    const M = MODES[mode];
    const QX = Q => ox + (Q + 1) / 2 * plotW;     // map Q∈[-1,1] → px
    const AY = a => oy + plotH - a * plotH;        // map α∈[0,1]  → py

    // highlight the swept range [−Q₀, +Q₀] under the curve
    ctx.fillStyle = 'rgba(56,189,248,0.10)';
    ctx.fillRect(QX(-amp), oy, QX(amp) - QX(-amp), plotH);

    // α(Q) curve
    ctx.strokeStyle = COL.vib; ctx.lineWidth = 2.5;
    ctx.beginPath();
    const N = 120;
    for (let i = 0; i <= N; i++) {
      const Q = (i / N) * 2 - 1;
      const px = QX(Q), py = AY(alphaOfQ(Q));
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();

    // tangent line at Q=0 — its slope IS ∂α/∂Q (flat for inactive modes)
    ctx.strokeStyle = isSym ? 'rgba(251,191,36,0.7)' : 'rgba(120,113,108,0.7)';
    ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(QX(-1), AY(M.a0 + M.c1 * -1));
    ctx.lineTo(QX(1),  AY(M.a0 + M.c1 *  1));
    ctx.stroke();
    ctx.setLineDash([]);

    // ∂α/∂Q annotation
    ctx.fillStyle = isSym ? '#fbbf24' : '#a8a29e';
    ctx.font = 'bold 12px DM Sans, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(isSym ? '∂α/∂Q ≠ 0 (slope)' : '∂α/∂Q = 0 (flat tangent)', ox + plotW - 4, oy + 18);

    // moving dot at the current Q(t)
    const tNow = t0 + 1;
    const Q = Qfn(tNow);
    const dotX = QX(Q), dotY = AY(alphaOfQ(Q));
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(dotX, dotY, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, TAU); ctx.fill();
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

    // α(t): mapped on a POSITIVE axis [0, αTop] around the baseline α₀ — α never goes negative
    g = fitCanvas(cAlpha);
    const aTop = 1.0, pad = 6;
    const aY = a => (g.h - pad) - (a / aTop) * (g.h - 2 * pad);
    // α=0 axis + α₀ baseline
    g.ctx.strokeStyle = COL.axis; g.ctx.lineWidth = 1;
    g.ctx.beginPath(); g.ctx.moveTo(0, aY(0)); g.ctx.lineTo(g.w, aY(0)); g.ctx.stroke();
    g.ctx.strokeStyle = 'rgba(255,255,255,0.22)'; g.ctx.setLineDash([5, 4]);
    g.ctx.beginPath(); g.ctx.moveTo(0, aY(MODES[mode].a0)); g.ctx.lineTo(g.w, aY(MODES[mode].a0)); g.ctx.stroke();
    g.ctx.setLineDash([]);
    g.ctx.fillStyle = 'rgba(255,255,255,0.5)'; g.ctx.font = '10px DM Sans, sans-serif';
    g.ctx.textAlign = 'left'; g.ctx.textBaseline = 'bottom';
    g.ctx.fillText('α₀', 4, aY(MODES[mode].a0) - 2);
    // α(t) curve
    g.ctx.strokeStyle = COL.vib; g.ctx.lineWidth = 2.2;
    g.ctx.beginPath();
    const Na = Math.max(180, g.w);
    for (let i = 0; i <= Na; i++) {
      const t = t0 + i / Na;
      const y = aY(afn(t));
      i ? g.ctx.lineTo(i / Na * g.w, y) : g.ctx.moveTo(0, y);
    }
    g.ctx.stroke();
    nowLine(g.ctx, g.w, g.h);
    if (!MODES[mode].raman) {
      g.ctx.fillStyle = 'rgba(167,139,250,0.95)';
      g.ctx.font = '11px DM Sans, sans-serif'; g.ctx.textAlign = 'right'; g.ctx.textBaseline = 'top';
      g.ctx.fillText('no ωᵥ modulation — Raman-inactive', g.w - 6, 4);
    }

    // p(t): induced dipole (a real field — oscillates +/−), with modulation envelope
    g = fitCanvas(cDip); axis(g.ctx, g.w, g.h);
    g.ctx.strokeStyle = 'rgba(56,189,248,0.3)'; g.ctx.lineWidth = 1.5;
    g.ctx.setLineDash([4, 4]);
    for (const s of [1, -1]) {
      g.ctx.beginPath();
      const N = g.w;
      for (let i = 0; i <= N; i++) {
        const t = t0 + i / N;
        const env = s * afn(t) / pnorm();
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
    const nrm = pnorm();
    const aRay  = abar() / nrm;          // elastic carrier
    const aFund = 0.5 * fundC() / nrm;   // ω₀±ωᵥ  (∝ c₁Q₀)
    const aOver = 0.5 * overC() / nrm;   // ω₀±2ωᵥ (∝ ½c₂Q₀²)

    function plotSmall(cv, fn, color, amplitude) {
      const { ctx, w, h } = fitCanvas(cv);
      ctx.strokeStyle = COL.axis; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
      if (amplitude < 0.004) {
        ctx.fillStyle = 'rgba(168,162,158,0.5)';
        ctx.font = '10px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(amplitude < 1e-6 ? '(zero — forbidden)' : '(negligible)', w/2, h/2);
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

    plotSmall(cDecRay, rayFn,  COL.rayleigh, aRay);
    plotSmall(cDecStk, stkFn,  COL.stokes,   aFund);
    plotSmall(cDecAnt, antFn,  COL.anti,     aFund);
  }

  // ── Spectrum ──
  function drawSpectrum() {
    const { ctx, w, h } = fitCanvas(cSpec);
    const pad = 28, baseY = h - 22, topY = 14, Hfull = baseY - topY;
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(w - 8, baseY); ctx.stroke();

    const cx2 = w / 2;
    const span = (w / 2 - pad) / 3.4;
    const clampX = x => Math.max(pad + 4, Math.min(w - 10, x));
    const off1 = Math.min(vib, 3) * span;
    const off2 = Math.min(2 * vib, 3.3) * span;
    const clamp = v => Math.max(0, Math.min(Hfull, v));

    const rayH  = clamp(abar() * 1.6 * Hfull);
    const fundH = clamp(fundC() * 2.2 * Hfull);

    const bars = [
      { x: cx2,              H: rayH,  c: COL.rayleigh },
      { x: cx2 - off1,       H: fundH, c: COL.stokes },
      { x: cx2 + off1,       H: fundH, c: COL.anti }
    ];
    for (const b of bars) {
      if (b.H < 1) continue;
      ctx.strokeStyle = b.c; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(b.x, baseY); ctx.lineTo(b.x, baseY - b.H); ctx.stroke();
      ctx.fillStyle = b.c;
      ctx.beginPath(); ctx.arc(b.x, baseY - b.H, 3.5, 0, TAU); ctx.fill();
    }
    ctx.font = '10px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#a8a29e';
    ctx.fillText('ω₀', cx2, baseY + 14);
    if (fundH >= 1) {
      ctx.fillText('ω₀−ωᵥ', cx2 - off1, baseY + 14);
      ctx.fillText('ω₀+ωᵥ', cx2 + off1, baseY + 14);
    }
    ctx.fillStyle = '#a8a29e'; ctx.textAlign = 'left'; ctx.fillText('intensity', 6, topY + 2);

    cap.innerHTML = MODES[mode].raman
      ? 'The <b>Stokes</b> and <b>anti-Stokes</b> lines at ω₀±ω<sub>v</sub> appear because ∂α/∂Q ≠ 0 — their amplitude grows with Q₀. Classically Stokes ≈ anti-Stokes; Boltzmann statistics make anti-Stokes weaker at room temperature.'
      : 'Because ∂α/∂Q = 0, <b>no Stokes or anti-Stokes lines appear</b> at ω₀±ω<sub>v</sub>. Only the Rayleigh line remains — this mode is Raman-inactive.';
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


/* ============================================================
   Taylor reminder — sin x built term by term, approaching the
   curve as the polynomial degree increases.
   ============================================================ */
(function taylorSin() {
  const cv = document.getElementById('c-taylor-sin');
  if (!cv) return;
  const FONT = "'Zen Kaku Gothic New', system-ui, sans-serif";
  const X0 = -2 * Math.PI, X1 = 2 * Math.PI;
  const YR = 2.4;                 // vertical half-range shown
  const MAXTERMS = 6;            // up to x^11

  // partial sum of sin's Maclaurin series with `terms` terms
  function partial(x, terms) {
    let s = 0, term = x;
    for (let k = 0; k < terms; k++) {
      s += term;
      term *= -x * x / ((2 * k + 2) * (2 * k + 3));
    }
    return s;
  }

  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = n => String(n).split('').map(d => SUP[+d]).join('');
  function formula(tm) {
    if (tm <= 0) return 'f(x) = 0';
    let s = 'f(x) = ';
    for (let k = 0; k < tm; k++) {
      const p = 2 * k + 1;
      const body = (k === 0) ? 'x' : ('x' + sup(p) + '/' + p + '!');
      s += (k === 0) ? body : ((k % 2 === 0 ? ' + ' : ' − ') + body);
    }
    return s;
  }

  let terms = 0, morph = 0, phase = 'grow', hold = 0;   // start from the 0th-order term

  function frame() {
    // pause while the <details> panel is collapsed / off-screen
    if (cv.offsetWidth === 0) { requestAnimationFrame(frame); return; }
    const { ctx, w, h } = fitCanvas(cv);
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    const cx = w / 2, cy = h / 2, pad = 14;
    const sx = x => (x - X0) / (X1 - X0) * w;
    const sy = y => cy - (y / YR) * (h / 2 - pad);

    // grid: baseline + verticals at ±π, ±2π
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.fillStyle = '#78716c'; ctx.font = '11px ' + FONT; ctx.textAlign = 'center';
    [[-2*Math.PI,'−2π'],[-Math.PI,'−π'],[Math.PI,'π'],[2*Math.PI,'2π']].forEach(([xv,lb]) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.moveTo(sx(xv), 0); ctx.lineTo(sx(xv), h); ctx.stroke();
      ctx.fillText(lb, sx(xv), cy + 16);
    });

    function curve(fn, color, lw) {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      const N = Math.max(240, w); let pen = false;
      for (let i = 0; i <= N; i++) {
        const x = X0 + (i / N) * (X1 - X0);
        const y = fn(x);
        if (Math.abs(y) > YR * 3) { pen = false; continue; }   // break on divergence
        const px = sx(x), py = sy(y);
        pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        pen = true;
      }
      ctx.stroke();
    }

    // target sine
    curve(Math.sin, 'rgba(226,232,240,0.85)', 2);
    // morphing partial sum  (terms-1) -> terms
    const approx = x => partial(x, terms - 1) * (1 - morph) + partial(x, terms) * morph;
    curve(approx, '#fbbf24', 2.6);

    // current partial-sum formula, in f(x) form
    ctx.fillStyle = '#fcd34d'; ctx.font = '600 13px ' + FONT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(formula(terms), 12, 10);
    const ord = terms <= 0
      ? (lang === 'ja' ? '0 次（定数項）' : 'order 0 (constant term)')
      : (lang === 'ja' ? '最高次 x' + sup(2 * terms - 1) : 'up to x' + sup(2 * terms - 1));
    ctx.fillStyle = '#a8a29e'; ctx.font = '11px ' + FONT;
    ctx.fillText(ord, 12, 30);
    ctx.fillStyle = 'rgba(226,232,240,0.85)'; ctx.font = '12px ' + FONT;
    ctx.textAlign = 'right'; ctx.fillText('sin x', w - 12, 10);

    // advance the animation
    if (phase === 'grow') {
      morph += 0.02;
      if (morph >= 1) { morph = 1; phase = 'hold'; hold = 0; }
    } else {
      if (++hold > 55) {
        terms = terms >= MAXTERMS ? 0 : terms + 1;
        morph = 0; phase = 'grow';
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
})();
