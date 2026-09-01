/* ============================================================
   Laser physics demo — vanilla JS, no deps.

   Module 00: Animated energy-level diagram — 3 radiative processes
   Module 01: Population inversion — 2/3/4-level pumping schemes
   Module 02: Gain spectrum and exponential intensity growth
   Module 03: Fabry–Pérot cavity — bouncing beam animation
   Module 04: P–I (output vs pump) curve with threshold marker
   ============================================================ */

'use strict';

const TAU = Math.PI * 2;
const FONT = "'Zen Kaku Gothic New', system-ui, sans-serif";

// ── colour palette (matches style.css dark-stage look) ──────────────
const C = {
  bg:        '#1b1711',
  axis:      'rgba(255,255,255,0.20)',
  axisLabel: 'rgba(255,255,255,0.55)',
  ink:       '#f5f5f4',
  faint:     'rgba(245,245,244,0.35)',
  photonInc: '#fbbf24',  // incident / absorbed photon — amber
  photonSt:  '#22c55e',  // stimulated emission photon — green
  photonSp:  '#a855f7',  // spontaneous emission photon — violet
  level1:    '#38bdf8',  // lower level — sky
  level2:    '#f97316',  // upper level — orange
  atom:      '#ef4444',  // atom dot — red
  gain:      '#22c55e',  // gain positive — green
  loss:      '#ef4444',  // gain negative — red
  neutral:   '#fbbf24',  // zero — amber
  beam:      '#fbbf24',  // cavity beam
  ase:       'rgba(168,85,247,0.65)',  // ASE below threshold
  laser:     '#22c55e',  // laser output
  threshold: 'rgba(239,68,68,0.70)',
  mirror:    '#94a3b8',
};

/* ─── Canvas helper ─────────────────────────────────────── */
function fitCanvas(cv) {
  const dpr  = window.devicePixelRatio || 1;
  const rect = cv.getBoundingClientRect();
  const w    = Math.max(1, Math.round(rect.width));
  const h    = Math.max(1, Math.round(rect.height));
  if (cv.width !== w * dpr || cv.height !== h * dpr) {
    cv.width  = w * dpr;
    cv.height = h * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return { ctx: cv.getContext('2d'), w, h };
}

function clearBg(ctx, w, h) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
}

/* ─── Text helpers ───────────────────────────────────────── */
function label(ctx, text, x, y, opts = {}) {
  ctx.save();
  ctx.font       = (opts.bold ? 'bold ' : '') + (opts.size || 12) + 'px ' + FONT;
  ctx.fillStyle  = opts.color || C.axisLabel;
  ctx.textAlign  = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════
   MODULE 00 — Three radiative processes
   ═══════════════════════════════════════════════════════════ */
(function transitionModule() {
  const cv = document.getElementById('c-transition');
  if (!cv) return;

  let mode = 'abs';        // 'abs' | 'sp' | 'st'
  let t    = 0;
  let raf  = null;

  const caps = {
    abs: { en: '<b>Absorption:</b> a photon is destroyed and the atom climbs to the excited state. Rate $\\propto N_1\\,\\rho(\\nu)$.',
           ja: '<b>吸収：</b>光子が消滅し、原子が励起状態へ遷移します。速度 $\\propto N_1\\,\\rho(\\nu)$。' },
    sp:  { en: '<b>Spontaneous emission:</b> the excited atom decays and emits a photon in a random direction and with random phase. Rate $\\propto N_2$ (field-independent).',
           ja: '<b>自然放出：</b>励起原子が崩壊し、ランダムな方向とランダムな位相で光子を放出します。速度 $\\propto N_2$（場に無依存）。' },
    st:  { en: '<b>Stimulated emission:</b> an incoming photon triggers the excited atom to emit an <em>identical</em> photon: same direction, phase, frequency, and polarisation. Rate $\\propto N_2\\,\\rho(\\nu)$.',
           ja: '<b>誘導放出：</b>入射光子が励起原子を誘導し、<em>同一の</em>光子を放出させます：同じ方向、位相、周波数、偏光。速度 $\\propto N_2\\,\\rho(\\nu)$。' },
  };

  function updateCap() {
    const el = document.getElementById('transition-cap');
    if (!el) return;
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    el.innerHTML = '<span class="i18n-en">' + caps[mode].en + '</span>' +
                   '<span class="i18n-ja">' + caps[mode].ja + '</span>';
    if (window.renderMathInElement) renderMathInElement(el, { delimiters: [{left:'$',right:'$',display:false}] });
  }

  // Button wiring
  ['btn-abs','btn-sp','btn-st'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      mode = id.replace('btn-', '');
      t = 0;
      document.querySelectorAll('#btn-abs,#btn-sp,#btn-st').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateCap();
    });
  });

  function drawAtom(ctx, x, y, r, excited, glow) {
    ctx.save();
    if (glow) { ctx.shadowColor = excited ? C.level2 : C.level1; ctx.shadowBlur = 14; }
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = excited ? C.level2 : C.level1;
    ctx.fill();
    ctx.restore();
  }

  function drawPhoton(ctx, x, y, dir, col, amp, phase) {
    // draw as a sinusoidal wave packet travelling in dir (+1 right, -1 left)
    const wl = 22;
    const len = 60;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = col; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= len; i++) {
      const px = x + dir * i;
      const py = y + amp * Math.sin(TAU * i / wl + phase);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    // arrowhead
    const ax = x + dir * len;
    const ay = y;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(ax + dir * 8, ay);
    ctx.lineTo(ax - dir * 4, ay - 5);
    ctx.lineTo(ax - dir * 4, ay + 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(cv);
    clearBg(ctx, w, h);
    t++;

    const cx  = w / 2;
    const E1y = h * 0.75;
    const E2y = h * 0.28;
    const lw  = Math.min(180, w * 0.45);

    // Energy levels
    ctx.save();
    ctx.strokeStyle = C.level1; ctx.lineWidth = 3;
    ctx.shadowColor = C.level1; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(cx - lw/2, E1y); ctx.lineTo(cx + lw/2, E1y); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = C.level2; ctx.lineWidth = 3;
    ctx.shadowColor = C.level2; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(cx - lw/2, E2y); ctx.lineTo(cx + lw/2, E2y); ctx.stroke();
    ctx.restore();

    // Level labels
    label(ctx, 'E₁ (ground)', cx - lw/2 - 6, E1y, { align: 'right', color: C.level1, size: 11 });
    label(ctx, 'E₂ (excited)', cx - lw/2 - 6, E2y, { align: 'right', color: C.level2, size: 11 });

    const progress = (t % 90) / 90;

    if (mode === 'abs') {
      // atom starts on E1, moves up
      const frac  = Math.min(progress * 1.4, 1);
      const atomY = E1y + (E2y - E1y) * frac;
      drawAtom(ctx, cx, atomY, 9, frac > 0.5, true);

      // photon travels right → cx, then disappears
      const ph = Math.max(0, 1 - progress * 1.6);
      if (ph > 0) {
        const px = cx - lw/2 - 30 + (lw * 0.3) * (1 - ph);
        drawPhoton(ctx, px, E1y - 8, 1, C.photonInc, 7, t * 0.28);
      }
    }

    if (mode === 'sp') {
      // atom on E2, drops, photon emitted in random-ish direction
      const frac  = Math.min(progress * 1.4, 1);
      const atomY = E2y + (E1y - E2y) * frac;
      drawAtom(ctx, cx, atomY, 9, frac < 0.5, true);

      const pe = Math.max(0, progress - 0.3);
      if (pe > 0) {
        // emit at a tilted angle to show random direction
        const angle = -0.4;
        const dist  = pe * 80;
        const ex = cx + dist * Math.cos(angle);
        const ey = (E2y + E1y) / 2 + dist * Math.sin(angle);
        ctx.save();
        ctx.strokeStyle = C.photonSp; ctx.lineWidth = 2; ctx.shadowColor = C.photonSp; ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i <= 50; i++) {
          const d = i / 50 * dist * 0.9;
          const px = cx + d * Math.cos(angle);
          const py = (E2y + E1y) / 2 + d * Math.sin(angle) + 6 * Math.sin(TAU * i / 12 + t * 0.3);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
        label(ctx, '(random direction)', ex + 8, ey - 10, { color: C.photonSp, size: 10, align: 'left' });
      }
    }

    if (mode === 'st') {
      // atom on E2, incoming photon triggers second identical photon
      const frac  = Math.min(progress * 1.4, 1);
      const atomY = E2y + (E1y - E2y) * frac;
      drawAtom(ctx, cx, atomY, 9, frac < 0.5, true);

      // incoming photon from left
      const px = cx - lw/2 - 80 + progress * (lw/2 + 80 + 40);
      drawPhoton(ctx, Math.min(px, cx + lw/2 + 40), E2y - 4, 1, C.photonInc, 7, t * 0.28);

      // stimulated photon appears after interaction
      if (progress > 0.45) {
        const pe2 = (progress - 0.45) / 0.55;
        const px2 = cx + pe2 * (lw/2 + 70);
        drawPhoton(ctx, cx + lw/4 + pe2 * 60, E2y + 6, 1, C.photonSt, 7, t * 0.28 + Math.PI);
      }

      if (progress > 0.4) {
        label(ctx, '+ 1 identical photon →', cx + lw/2 + 8, E2y + 20, { color: C.photonSt, size: 10, align: 'left' });
      }
    }

    raf = requestAnimationFrame(draw);
  }

  // start after fonts settle
  setTimeout(() => {
    updateCap();
    draw();
  }, 200);
})();

/* ═══════════════════════════════════════════════════════════
   MODULE 01 — Population inversion
   ═══════════════════════════════════════════════════════════ */
(function populationModule() {
  const cv = document.getElementById('c-population');
  if (!cv) return;

  let scheme = '2lvl';  // '2lvl' | '3lvl' | '4lvl'
  let t      = 0;

  const sl  = document.getElementById('sl-pump');
  const out = document.getElementById('out-pump');

  function pump() { return sl ? parseFloat(sl.value) : 0; }

  if (sl) sl.addEventListener('input', () => { if (out) out.textContent = pump().toFixed(2); });

  ['btn-2lvl','btn-3lvl','btn-4lvl'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      scheme = id.replace('btn-', '');
      document.querySelectorAll('#btn-2lvl,#btn-3lvl,#btn-4lvl').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePopCap();
    });
  });

  /* Steady-state populations (normalised to 1) */
  function populations(Wp) {
    // A21 = 1 (normalised)
    if (scheme === '2lvl') {
      const N2 = Wp / (2 * Wp + 1);
      const N1 = 1 - N2;
      return { levels: [N1, N2], labels: ['N₁', 'N₂'], inversion: N2 - N1 };
    }
    if (scheme === '3lvl') {
      // fast decay 3→2, lower laser level = ground
      // N2 ~ Wp/(Wp+1), N1 = 1 - N2, N3 ≈ 0
      const N2 = Wp / (Wp + 1);
      const N1 = 1 - N2;
      return { levels: [N1, N2, 0], labels: ['N₁ (lower)', 'N₂ (upper)', 'N₃ (pump)'],
               inversion: N2 - N1 };
    }
    // 4-level: lower laser level empty
    const N2 = Wp / (Wp + 1);
    const N3 = 0;  // fast relaxation
    const N1 = 1 - N2;
    return { levels: [N1, N2, N3, 0], labels: ['N₁ (gnd)', 'N₂ (upper)', 'N₃ (lower)', 'N₄ (pump)'],
             inversion: N2 - N3 };
  }

  const popCaps = {
    '2lvl': { en: 'In a <b>2-level</b> system the inversion $\\Delta N = N_2 - N_1$ can never become positive no matter how hard you pump.',
              ja: '<b>2準位</b>系では、どれだけ強くポンプしても反転数 $\\Delta N = N_2 - N_1$ が正になることはありません。' },
    '3lvl': { en: 'In a <b>3-level</b> system the lower laser level is the ground state, so inversion ($\\Delta N > 0$) requires pumping more than half the atoms.',
              ja: '<b>3準位</b>系では下レーザー準位が基底状態なので、原子の半数以上をポンプしなければ反転（$\\Delta N > 0$）が達成できません。' },
    '4lvl': { en: 'In a <b>4-level</b> system the lower laser level is rapidly emptied, so inversion occurs immediately above threshold, much easier than 3-level.',
              ja: '<b>4準位</b>系では下レーザー準位が高速に空にされるため、ごく低いポンプ速度でも反転が達成されます。3準位系より大幅に低い閾値。' },
  };

  function updatePopCap() {
    const el = document.getElementById('pop-cap');
    if (!el) return;
    el.innerHTML = '<span class="i18n-en">' + popCaps[scheme].en + '</span>' +
                   '<span class="i18n-ja">' + popCaps[scheme].ja + '</span>';
    if (window.renderMathInElement) renderMathInElement(el, { delimiters: [{left:'$',right:'$',display:false}] });
  }

  const levelColors = ['#38bdf8','#f97316','#a3e635','#e879f9'];

  function draw() {
    const { ctx, w, h } = fitCanvas(cv);
    clearBg(ctx, w, h);
    t++;

    const Wp   = pump();
    const pop  = populations(Wp);
    const n    = pop.levels.length;
    const inv  = pop.inversion;

    const margin  = { l: 16, r: 16, t: 28, b: 36 };
    const barW    = Math.min(64, (w - margin.l - margin.r) / n - 14);
    const chartH  = h - margin.t - margin.b;
    const midY    = margin.t + chartH / 2;

    // axes
    ctx.save();
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(margin.l, margin.t); ctx.lineTo(margin.l, h - margin.b); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(margin.l, midY); ctx.lineTo(w - margin.r, midY); ctx.stroke();
    ctx.restore();

    label(ctx, '1', margin.l - 4, margin.t + 4, { align: 'right', size: 10 });
    label(ctx, '0', margin.l - 4, midY,          { align: 'right', size: 10 });

    // bars
    const spacing = (w - margin.l - margin.r) / n;
    pop.levels.forEach((val, i) => {
      const bx  = margin.l + spacing * i + spacing / 2 - barW / 2;
      const bh  = Math.abs(val) * chartH / 2;
      const by  = midY - bh;

      ctx.save();
      ctx.fillStyle  = levelColors[i] + 'bb';
      ctx.shadowColor = levelColors[i]; ctx.shadowBlur = 8;
      ctx.fillRect(bx, by, barW, bh);
      ctx.strokeStyle = levelColors[i]; ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, barW, bh);
      ctx.restore();

      label(ctx, pop.labels[i], bx + barW/2, h - margin.b + 12, { size: 10, color: levelColors[i] });
      label(ctx, val.toFixed(2), bx + barW/2, by - 8, { size: 10, color: levelColors[i] });
    });

    // inversion indicator
    const invText = '∆N = ' + (inv >= 0 ? '+' : '') + inv.toFixed(3);
    const invColor = inv > 0.005 ? C.gain : inv < -0.005 ? C.loss : C.neutral;
    ctx.save();
    ctx.font       = 'bold 13px ' + FONT;
    ctx.fillStyle  = invColor;
    ctx.shadowColor = invColor; ctx.shadowBlur = 12;
    ctx.textAlign  = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(invText, w - margin.r, margin.t);
    if (inv > 0.005) ctx.fillText('▲ INVERTED', w - margin.r, margin.t + 16);
    ctx.restore();

    requestAnimationFrame(draw);
  }

  setTimeout(() => { updatePopCap(); draw(); }, 250);
})();

/* ═══════════════════════════════════════════════════════════
   MODULE 02 — Gain spectrum and intensity growth
   ═══════════════════════════════════════════════════════════ */
(function gainModule() {
  const cv = document.getElementById('c-gain');
  if (!cv) return;

  const slInv = document.getElementById('sl-inversion');
  const slLen = document.getElementById('sl-length');
  const outInv = document.getElementById('out-inversion');
  const outLen = document.getElementById('out-length');

  function invNorm() { return slInv ? parseFloat(slInv.value) : 0.5; }
  function medLen()  { return slLen ? parseFloat(slLen.value)  : 1.0; }

  if (slInv) slInv.addEventListener('input', () => { if (outInv) outInv.textContent = (invNorm() >= 0 ? '+' : '') + invNorm().toFixed(2); });
  if (slLen) slLen.addEventListener('input', () => { if (outLen) outLen.textContent = medLen().toFixed(2); });

  // Lorentzian lineshape
  function lorentz(nu, nu0, dnu) {
    return (dnu / 2) ** 2 / ((nu - nu0) ** 2 + (dnu / 2) ** 2);
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(cv);
    clearBg(ctx, w, h);

    const margin = { l: 44, r: 24, t: 20, b: 36 };
    const plotW  = (w - margin.l - margin.r) / 2 - 8;
    const plotH  = h - margin.t - margin.b;

    // ── left: gain spectrum ──────────────────────────
    const lx = margin.l;
    const dN = invNorm();   // -1 … +1
    const g0 = dN * 0.85;  // peak gain coefficient (normalised)
    const midY = margin.t + plotH / 2;

    ctx.save();
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx, margin.t); ctx.lineTo(lx, h - margin.b); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, midY); ctx.lineTo(lx + plotW, midY); ctx.stroke();
    ctx.restore();

    label(ctx, 'g(ν)', lx - 10, margin.t + 4, { align: 'right', size: 11 });
    label(ctx, '0',    lx - 8,  midY,          { align: 'right', size: 10 });
    label(ctx, 'ν',    lx + plotW, h - margin.b + 14, { align: 'center', size: 11 });
    label(ctx, 'ν₀',   lx + plotW/2, h - margin.b + 14, { align: 'center', size: 10, color: C.faint });

    ctx.save();
    const gainColor = dN > 0.02 ? C.gain : dN < -0.02 ? C.loss : C.neutral;
    ctx.strokeStyle = gainColor; ctx.lineWidth = 2.5;
    ctx.shadowColor = gainColor; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const nu = (i / plotW - 0.5) * 4;  // -2 … +2 in units of half-linewidth
      const gv = g0 * lorentz(nu, 0, 1.2);
      const py = midY - gv * plotH * 0.42;
      i === 0 ? ctx.moveTo(lx + i, py) : ctx.lineTo(lx + i, py);
    }
    ctx.stroke();
    ctx.restore();

    // ── right: intensity vs z ────────────────────────
    const rx   = lx + plotW + 24;
    const L    = medLen();
    const gPeak = dN * 0.85;

    ctx.save();
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(rx, margin.t); ctx.lineTo(rx, h - margin.b); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx, h - margin.b); ctx.lineTo(rx + plotW, h - margin.b); ctx.stroke();
    ctx.restore();

    label(ctx, 'I(z)/I₀', rx - 12, margin.t + 4, { align: 'right', size: 11 });
    label(ctx, 'z', rx + plotW, h - margin.b + 14, { align: 'center', size: 11 });
    label(ctx, '0', rx, h - margin.b + 14, { align: 'center', size: 10, color: C.faint });
    label(ctx, 'L', rx + plotW - 2, h - margin.b + 14, { align: 'center', size: 10, color: C.faint });

    const Ifinal = Math.exp(gPeak * L * 2.0);
    const Imax   = Math.max(Ifinal, 1 / Math.exp(gPeak * L * 2.0), 2);

    ctx.save();
    const iColor = gPeak > 0.02 ? C.gain : gPeak < -0.02 ? C.loss : C.neutral;
    ctx.strokeStyle = iColor; ctx.lineWidth = 2.5;
    ctx.shadowColor = iColor; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const z  = (i / plotW) * L;
      const Iz = Math.exp(gPeak * z * 2.0);
      const py = h - margin.b - Math.min((Iz / Imax) * plotH * 0.9, plotH * 0.95);
      i === 0 ? ctx.moveTo(rx + i, py) : ctx.lineTo(rx + i, py);
    }
    ctx.stroke();
    ctx.restore();

    // final value annotation
    label(ctx, 'I(L)/I₀ = ' + Ifinal.toFixed(2) + '×',
          rx + plotW - 4, margin.t + 10, { align: 'right', size: 10, color: iColor });

    requestAnimationFrame(draw);
  }

  setTimeout(draw, 300);
})();

/* ═══════════════════════════════════════════════════════════
   MODULE 03 — Fabry–Pérot cavity
   ═══════════════════════════════════════════════════════════ */
(function cavityModule() {
  const cv = document.getElementById('c-cavity');
  if (!cv) return;

  let t   = 0;
  let beams = [];

  const slR2  = document.getElementById('sl-r2');
  const slG   = document.getElementById('sl-cavgain');
  const outR2 = document.getElementById('out-r2');
  const outG  = document.getElementById('out-cavgain');

  function R2()        { return slR2 ? parseFloat(slR2.value) : 0.70; }
  function singleG()   { return slG  ? parseFloat(slG.value)  : 1.50; }

  if (slR2) slR2.addEventListener('input', () => { if (outR2) outR2.textContent = R2().toFixed(2); });
  if (slG)  slG.addEventListener('input',  () => { if (outG)  outG.textContent  = singleG().toFixed(2) + '×'; });

  // Beam state: { x, dir (+1/-1), intensity, pass }
  function spawnBeam(w) {
    beams = [{ x: 60, dir: 1, intensity: 0.6, pass: 0 }];
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(cv);
    clearBg(ctx, w, h);
    t++;

    const R1  = 1.0;
    const R2v = R2();
    const G   = singleG();

    const mirrorW = 14;
    const lx      = 36;        // left mirror x
    const rx      = w - 36;    // right mirror x
    const cy      = h / 2;
    const cavL    = rx - lx;

    // ── mirrors ─────────────────────────────────────
    // HR mirror (left) — full height
    ctx.save();
    ctx.fillStyle = C.mirror;
    ctx.shadowColor = C.mirror; ctx.shadowBlur = 6;
    ctx.fillRect(lx - mirrorW, cy - 60, mirrorW, 120);
    ctx.restore();
    label(ctx, 'HR', lx - mirrorW/2 - 2, cy - 68, { size: 10, color: C.mirror });
    label(ctx, 'R₁=1', lx - mirrorW/2 - 2, cy + 68, { size: 10, color: C.mirror });

    // Output coupler (right) — partial
    ctx.save();
    ctx.fillStyle = C.mirror + 'aa';
    ctx.strokeStyle = C.mirror; ctx.lineWidth = 2;
    ctx.shadowColor = C.mirror; ctx.shadowBlur = 6;
    ctx.fillRect(rx, cy - 60, mirrorW, 120);
    ctx.strokeRect(rx, cy - 60, mirrorW, 120);
    ctx.restore();
    label(ctx, 'OC', rx + mirrorW/2 + 2, cy - 68, { size: 10, color: C.mirror });
    label(ctx, 'R₂=' + R2v.toFixed(2), rx + mirrorW/2 + 2, cy + 68, { size: 10, color: C.mirror });

    // ── gain medium ──────────────────────────────────
    const gmX  = lx + cavL * 0.18;
    const gmW  = cavL * 0.64;
    ctx.save();
    ctx.fillStyle = 'rgba(34,197,94,0.06)';
    ctx.strokeStyle = 'rgba(34,197,94,0.35)'; ctx.lineWidth = 1.5;
    ctx.fillRect(gmX, cy - 30, gmW, 60);
    ctx.strokeRect(gmX, cy - 30, gmW, 60);
    ctx.restore();
    label(ctx, 'gain medium', gmX + gmW/2, cy, { size: 10, color: 'rgba(34,197,94,0.7)' });

    // ── beam animation ───────────────────────────────
    const speed = 3;
    if (beams.length === 0 || t % 80 === 0) spawnBeam(w);

    const nextBeams = [];
    beams.forEach(b => {
      b.x += b.dir * speed;

      // draw beam as a thick horizontal line whose width encodes intensity
      const bh  = Math.max(1.5, Math.min(b.intensity * 18, 40));
      const alpha = Math.min(b.intensity, 1);
      ctx.save();
      ctx.fillStyle   = `rgba(251,191,36,${alpha * 0.75})`;
      ctx.shadowColor = C.photonInc;
      ctx.shadowBlur  = bh * 1.2;
      ctx.fillRect(b.dir > 0 ? b.x - 30 : b.x, cy - bh/2, 30, bh);
      ctx.restore();

      // reflect / transmit at mirrors
      if (b.dir > 0 && b.x >= rx) {
        // hit output coupler: fraction transmitted, fraction reflected
        // spawn output beam
        const outI = b.intensity * (1 - R2v);
        if (outI > 0.02) {
          // draw as a short pulse exiting to the right
          ctx.save();
          ctx.fillStyle = `rgba(34,197,94,${Math.min(outI, 1) * 0.85})`;
          ctx.shadowColor = C.gain; ctx.shadowBlur = outI * 14;
          ctx.fillRect(rx + mirrorW, cy - Math.max(2, outI * 14)/2, 26, Math.max(2, outI * 14));
          ctx.restore();
        }
        // reflected beam
        const rI = b.intensity * R2v * G;
        if (rI > 0.01 && b.pass < 18) nextBeams.push({ x: rx, dir: -1, intensity: rI, pass: b.pass + 1 });
      } else if (b.dir < 0 && b.x <= lx) {
        // hit HR mirror: fully reflected, apply gain
        const rI = b.intensity * R1 * G;
        if (rI > 0.01 && b.pass < 18) nextBeams.push({ x: lx, dir: 1, intensity: rI, pass: b.pass + 1 });
      } else {
        nextBeams.push(b);
      }
    });
    beams = nextBeams.slice(-12);  // cap active beams

    // round-trip gain annotation
    const Grt = R1 * R2v * G * G;
    const rtColor = Grt > 1.02 ? C.gain : Grt < 0.98 ? C.loss : C.neutral;
    label(ctx, 'Round-trip gain G_rt = ' + Grt.toFixed(3), w/2, h - 14,
          { size: 11, color: rtColor, bold: true });

    requestAnimationFrame(draw);
  }

  setTimeout(draw, 350);
})();

/* ═══════════════════════════════════════════════════════════
   MODULE 04 — Threshold and P–I curve
   ═══════════════════════════════════════════════════════════ */
(function thresholdModule() {
  const cv = document.getElementById('c-threshold');
  if (!cv) return;

  const slLoss   = document.getElementById('sl-loss');
  const slPumpTh = document.getElementById('sl-pump-th');
  const outLoss  = document.getElementById('out-loss');
  const outPump  = document.getElementById('out-pump-th');

  function loss() { return slLoss   ? parseFloat(slLoss.value)   : 0.4; }
  function Rp()   { return slPumpTh ? parseFloat(slPumpTh.value) : 1.0; }

  if (slLoss)   slLoss.addEventListener('input',   () => { if (outLoss) outLoss.textContent   = loss().toFixed(2); });
  if (slPumpTh) slPumpTh.addEventListener('input', () => { if (outPump) outPump.textContent = Rp().toFixed(2); });

  function draw() {
    const { ctx, w, h } = fitCanvas(cv);
    clearBg(ctx, w, h);

    const margin = { l: 54, r: 24, t: 24, b: 40 };
    const plotW  = w - margin.l - margin.r;
    const plotH  = h - margin.t - margin.b;

    const Rth    = loss();  // threshold pump (normalised to [0,1])
    const maxRp  = 2.0;
    const slope  = 0.9;     // differential efficiency

    // axis
    ctx.save();
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(margin.l, margin.t); ctx.lineTo(margin.l, h - margin.b); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(margin.l, h - margin.b); ctx.lineTo(margin.l + plotW, h - margin.b); ctx.stroke();
    ctx.restore();
    label(ctx, 'P_out', margin.l - 10, margin.t + 6, { align: 'right', size: 11 });
    label(ctx, 'R_p',   margin.l + plotW, h - margin.b + 18, { align: 'center', size: 11 });
    label(ctx, '0',     margin.l - 6, h - margin.b,         { align: 'right',  size: 10 });

    // ── ASE region (below threshold) ──────────────────
    ctx.save();
    ctx.strokeStyle = C.ase; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const rp = (i / plotW) * maxRp;
      if (rp > Rth) break;
      const py = h - margin.b - (rp / maxRp) * plotH * 0.06;
      i === 0 ? ctx.moveTo(margin.l + i, py) : ctx.lineTo(margin.l + i, py);
    }
    ctx.stroke();
    ctx.restore();

    // ── Laser output (above threshold) ───────────────
    ctx.save();
    ctx.strokeStyle = C.laser; ctx.lineWidth = 2.5;
    ctx.shadowColor = C.laser; ctx.shadowBlur = 8;
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= plotW; i++) {
      const rp = (i / plotW) * maxRp;
      if (rp < Rth) continue;
      const Pout = slope * (rp - Rth);
      const py   = h - margin.b - Math.min((Pout / (slope * maxRp)) * plotH, plotH);
      first ? ctx.moveTo(margin.l + i, py) : ctx.lineTo(margin.l + i, py);
      first = false;
    }
    ctx.stroke();
    ctx.restore();

    // ── threshold vertical line ──────────────────────
    const thX = margin.l + (Rth / maxRp) * plotW;
    ctx.save();
    ctx.strokeStyle = C.threshold; ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(thX, margin.t); ctx.lineTo(thX, h - margin.b); ctx.stroke();
    ctx.restore();
    label(ctx, 'R_th', thX, margin.t + 8, { size: 10, color: C.threshold });

    // ── operating point ──────────────────────────────
    const rpNow = Rp();
    const opX   = margin.l + (rpNow / maxRp) * plotW;
    let opY, opLabel;
    if (rpNow < Rth) {
      opY     = h - margin.b - (rpNow / maxRp) * plotH * 0.06;
      opLabel = 'ASE only';
    } else {
      const Pout = slope * (rpNow - Rth);
      opY        = h - margin.b - Math.min((Pout / (slope * maxRp)) * plotH, plotH);
      opLabel    = 'P_out = ' + Pout.toFixed(2) + ' (a.u.)';
    }

    ctx.save();
    ctx.fillStyle   = '#ef4444';
    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(opX, opY, 6, 0, TAU); ctx.fill();
    ctx.restore();
    label(ctx, opLabel, opX + 10, opY - 10, { size: 10, color: '#ef4444', align: 'left' });

    // ── legend ──────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = C.ase; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(margin.l + 8, margin.t + 10); ctx.lineTo(margin.l + 34, margin.t + 10); ctx.stroke();
    ctx.fillStyle = C.axisLabel; ctx.font = '10px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('ASE', margin.l + 38, margin.t + 10);
    ctx.strokeStyle = C.laser; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(margin.l + 8, margin.t + 24); ctx.lineTo(margin.l + 34, margin.t + 24); ctx.stroke();
    ctx.fillText('laser output', margin.l + 38, margin.t + 24);
    ctx.restore();

    requestAnimationFrame(draw);
  }

  setTimeout(draw, 400);
})();
