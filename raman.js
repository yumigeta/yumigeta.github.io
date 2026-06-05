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
  const cDecOvr = document.getElementById('c-dec-over');
  if (!cMol) return;

  const sVib   = document.getElementById('ctrl-vib');
  const sAmp   = document.getElementById('ctrl-amp');
  const vVib   = document.getElementById('v-vib');
  const vAmp   = document.getElementById('v-amp');
  const btn    = document.getElementById('btn-play');
  const cap    = document.getElementById('spec-cap');
  const modeEl = document.getElementById('mode-explanation');
  const noteEl = document.getElementById('physics-note');

  const CARRIER = 16;
  let t0 = 0;
  let running = true;

  // Each mode is defined by its polarizability expansion
  //   α(Q) = a₀ + c₁·Q + c₂·Q²   (c₁ = ∂α/∂Q,  c₂ = ½ ∂²α/∂Q²)
  const MODES = {
    sym: {
      raman: true, a0: 0.50, c1: 0.33, c2: 0.06,
      badge: '<span class="mol-activity raman">Raman-active</span>',
      text: '<b>Symmetric stretch</b>: both C=O bonds lengthen and shorten together → the electron cloud breathes → <b>α changes linearly with Q</b> (∂α/∂Q ≠ 0). This first-order change modulates the dipole at ω<sub>v</sub>, giving the fundamental Stokes & anti-Stokes lines.'
    },
    asym: {
      raman: false, a0: 0.30, c1: 0, c2: 0.50,
      badge: '<span class="mol-activity ir">Raman-inactive (IR-active)</span>',
      text: '<b>Asymmetric stretch</b>: one bond lengthens as the other shortens, so the two polarizability changes cancel — ∂α/∂Q = 0 at equilibrium. α(Q) is a <em>parabola</em> symmetric about Q = 0: no first-order modulation at ω<sub>v</sub>, so <b>no Raman signal</b>.'
    },
    bend: {
      raman: false, a0: 0.30, c1: 0, c2: 0.50,
      badge: '<span class="mol-activity ir">Raman-inactive (IR-active)</span>',
      text: '<b>Bend</b>: by symmetry ∂α/∂Q = 0 at equilibrium, so α(Q) is again a parabola — no first-order modulation, hence <b>Raman-inactive</b>.'
    }
  };
  let mode = 'sym';
  let vib = +sVib.value;
  const amp = 0.35;                       // vibration amplitude Q₀ (fixed)

  // polarizability vs the vibrational coordinate (the SAME curve drawn in α–Q)
  const alphaOfQ = Q => { const M = MODES[mode]; return M.a0 + M.c1 * Q + M.c2 * Q * Q; };

  // master signals — one shared clock
  const Efn = t => Math.cos(TAU * CARRIER * t);
  const Qfn = t => amp * Math.cos(TAU * vib * t);    // vibrational coordinate Q(t)
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

  function readControls() {
    vib = +sVib.value;
    vVib.textContent = vib.toFixed(2) + '×';
    updateNote();
    drawSpectrum();
  }
  sVib.addEventListener('input', readControls);
  btn.addEventListener('click', () => {
    running = !running;
    btn.textContent = running ? 'Pause' : 'Play';
    btn.classList.toggle('active', running);
    if (running) loop();
  });

  function updateNote() {
    if (MODES[mode].raman) {
      noteEl.innerHTML = '<b>Why the slope matters.</b> The fundamental Raman lines at ω₀±ω<sub>v</sub> are set by the <b>first derivative</b> ∂α/∂Q at equilibrium (the tangent in the α–Q plot). Here it is non-zero, so they appear and grow with amplitude Q₀.';
    } else {
      noteEl.innerHTML = '<b>Why no Raman line?</b> Because ∂α/∂Q = 0 at equilibrium, the polarizability does not oscillate at the vibrational frequency ω<sub>v</sub>. Even if α changes slightly at large amplitudes, the induced dipole carries <b>no first-order sideband</b> at ω₀±ω<sub>v</sub>. The selection rule is determined by the first derivative — if it is zero, the mode is Raman-inactive.';
    }
  }

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
    const q = Qfn(tNow);                       // vibrational coordinate Q(t) ∈ [−Q₀, Q₀]
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
