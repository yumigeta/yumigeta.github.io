/* ============================================================
   Stimulated phonon emission in graphene — vanilla JS, no deps.

   Module 02a: Cherenkov wake — wavefronts from a drifting source
   Module 02b: Directional gain lobe — γ(θ) polar plot
   Module 04:  Phonon avalanche — n_q(t) below/above threshold
   ============================================================ */

'use strict';

const TAU = Math.PI * 2;
const FONT = "'Zen Kaku Gothic New', system-ui, sans-serif";

// ── colour palette (matches the laser page's dark-stage look) ───────
const C = {
  bg:        '#1b1711',
  axis:      'rgba(255,255,255,0.20)',
  axisLabel: 'rgba(255,255,255,0.55)',
  ink:       '#f5f5f4',
  faint:     'rgba(245,245,244,0.35)',
  source:    '#fbbf24',  // drifting electron sea — amber
  wave:      '#38bdf8',  // sound wavefronts — sky
  cone:      '#22c55e',  // Mach cone / amplification — green
  gain:      '#22c55e',
  loss:      '#ef4444',
  neutral:   '#fbbf24',
  threshold: 'rgba(239,68,68,0.70)',
  growth:    '#22c55e',
  decay:     '#a855f7',
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

function label(ctx, text, x, y, opts = {}) {
  ctx.save();
  ctx.font         = (opts.bold ? 'bold ' : '') + (opts.size || 12) + 'px ' + FONT;
  ctx.fillStyle    = opts.color || C.axisLabel;
  ctx.textAlign    = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function setCap(id, en, ja) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '<span class="i18n-en">' + en + '</span>' +
                 '<span class="i18n-ja">' + ja + '</span>';
  if (window.renderMathInElement) renderMathInElement(el, { delimiters: [{left:'$',right:'$',display:false}] });
}

/* ═══════════════════════════════════════════════════════════
   MODULE 02a — Cherenkov wake
   A source drifts to the right at v_d, emitting circular
   wavefronts that expand at v_s. Above v_d = v_s the fronts
   pile up on a Mach cone of half-angle asin(v_s/v_d).
   ═══════════════════════════════════════════════════════════ */
(function wakeModule() {
  const cv = document.getElementById('c-wake');
  if (!cv) return;
  const slider = document.getElementById('sl-mach');
  const out    = document.getElementById('out-mach');

  const VS = 42;            // sound speed, px/s
  let mach = parseFloat(slider.value);
  let fronts = [];          // {x, y, t0}
  let srcX = 0, srcY = 0;
  let lastT = null, emitAcc = 0;

  const caps = {
    sub: {
      en: 'The dot is the drifting electron sea; the rings are the sound waves it emits. Below $v_d = v_s$ the waves outrun the source and disperse harmlessly.',
      ja: '点がドリフトする電子の海、輪がそこから出ていく音波。$v_d = v_s$ より遅いうちは、波が発生源を置き去りにして、無害に散っていく。',
    },
    sonic: {
      en: 'At $v_d = v_s$ the source keeps pace with its own waves: the fronts begin to pile up directly ahead.',
      ja: '$v_d = v_s$ ちょうどでは、発生源が自分の波と並走する。波面が真正面に積み重なり始める。',
    },
    super: {
      en: '<b>Supersonic:</b> the source overtakes its own sound and the fronts pile up on a cone, the Mach cone, $\\sin\\theta_M = v_s/v_d$. Inside this wedge, emission outruns absorption: this is where phonons are amplified.',
      ja: '<b>超音速：</b>発生源が自分の音を追い越し、波面がマッハ円錐 $\\sin\\theta_M = v_s/v_d$ の上に積み重なる。このくさびの中では放出が吸収を追い越す。フォノンが増幅されるのはここだ。',
    },
  };
  let capState = '';

  function updateCap() {
    const s = mach < 0.97 ? 'sub' : (mach <= 1.03 ? 'sonic' : 'super');
    if (s === capState) return;
    capState = s;
    setCap('wake-cap', caps[s].en, caps[s].ja);
  }

  slider.addEventListener('input', () => {
    mach = parseFloat(slider.value);
    out.textContent = mach.toFixed(2);
    updateCap();
  });

  function frame(now) {
    const { ctx, w, h } = fitCanvas(cv);
    const t = now / 1000;
    if (lastT === null) { lastT = t; srcX = w * 0.18; srcY = h * 0.5; }
    let dt = Math.min(t - lastT, 0.05);
    lastT = t;

    // advance source
    srcX += mach * VS * dt;
    if (srcX > w + 30) {           // recycle: wrap and clear old fronts
      srcX = -20;
      fronts = [];
    }
    srcY = h * 0.5;

    // emit wavefronts at a steady rate
    emitAcc += dt;
    const EMIT_EVERY = 0.22;
    while (emitAcc >= EMIT_EVERY) {
      emitAcc -= EMIT_EVERY;
      fronts.push({ x: srcX, y: srcY, t0: t - emitAcc });
    }
    // age out
    const MAXAGE = 6;
    fronts = fronts.filter(f => t - f.t0 < MAXAGE);

    clearBg(ctx, w, h);

    // wavefronts
    for (const f of fronts) {
      const age = t - f.t0;
      const r = age * VS;
      const a = Math.max(0, 0.55 * (1 - age / MAXAGE));
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, TAU);
      ctx.strokeStyle = 'rgba(56,189,248,' + a.toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // Mach cone (drawn trailing the source)
    if (mach > 1.001) {
      const thM = Math.asin(Math.min(1, 1 / mach));   // half-angle from the *axis* behind the source
      const len = Math.max(w, h) * 1.5;
      ctx.save();
      ctx.translate(srcX, srcY);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-len * Math.cos(thM), -len * Math.sin(thM));
      ctx.moveTo(0, 0);
      ctx.lineTo(-len * Math.cos(thM),  len * Math.sin(thM));
      ctx.strokeStyle = 'rgba(34,197,94,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // soft fill of the wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-len * Math.cos(thM), -len * Math.sin(thM));
      ctx.lineTo(-len, -len * Math.tan(thM) * Math.cos(thM));
      ctx.lineTo(-len,  len * Math.tan(thM) * Math.cos(thM));
      ctx.lineTo(-len * Math.cos(thM),  len * Math.sin(thM));
      ctx.closePath();
      ctx.fillStyle = 'rgba(34,197,94,0.07)';
      ctx.fill();
      ctx.restore();
    }

    // source dot + drift arrow
    ctx.save();
    ctx.shadowColor = C.source; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(srcX, srcY, 6, 0, TAU);
    ctx.fillStyle = C.source;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(srcX + 10, srcY);
    ctx.lineTo(srcX + 34, srcY);
    ctx.moveTo(srcX + 34, srcY);
    ctx.lineTo(srcX + 27, srcY - 4);
    ctx.moveTo(srcX + 34, srcY);
    ctx.lineTo(srcX + 27, srcY + 4);
    ctx.strokeStyle = C.source;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    label(ctx, 'v_d', srcX + 22, srcY - 12, { color: C.source });

    // status readout
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    const sup = mach > 1.001;
    label(ctx,
      'v_d / v_s = ' + mach.toFixed(2) +
      (sup ? (lang === 'ja' ? '（超音速）' : '  (supersonic)')
           : (lang === 'ja' ? '（亜音速）' : '  (subsonic)')),
      12, 18, { align: 'left', color: sup ? C.cone : C.axisLabel, bold: sup });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ═══════════════════════════════════════════════════════════
   MODULE 02b — Directional gain lobe
   Polar plot of the net growth rate  -γ(θ) ∝ (M cosθ - 1)
   with M = v_d / v_s.  Green lobe: amplification; red: loss.
   ═══════════════════════════════════════════════════════════ */
(function lobeModule() {
  const cv = document.getElementById('c-lobe');
  if (!cv) return;
  const slider = document.getElementById('sl-vd');
  const out    = document.getElementById('out-vd');

  let M = parseFloat(slider.value);

  slider.addEventListener('input', () => {
    M = parseFloat(slider.value);
    out.textContent = M.toFixed(2);
    draw();
  });

  function draw() {
    const { ctx, w, h } = fitCanvas(cv);
    clearBg(ctx, w, h);
    const cx = w * 0.5, cy = h * 0.52;
    const R = Math.min(w, h) * 0.36;       // radius for |growth| = max scale
    const SCALE = R / Math.max(1.2, Math.abs(M - 1) + 1.2);

    // axes
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - R * 1.25, cy); ctx.lineTo(cx + R * 1.25, cy);
    ctx.moveTo(cx, cy - R * 1.1);  ctx.lineTo(cx, cy + R * 1.1);
    ctx.stroke();

    // reference circle: growth = 0
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 0.0001, 0, TAU);   // center marker (growth=0 is the origin in this plot)
    ctx.stroke();
    ctx.setLineDash([]);

    // polar curve: r(θ) = |M cosθ - 1|, colored by sign
    const N = 360;
    for (let pass = 0; pass < 2; pass++) {
      // pass 0 = loss (red), pass 1 = gain (green) so gain draws on top
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= N; i++) {
        const th = -Math.PI + (i / N) * TAU;
        const g = M * Math.cos(th) - 1;          // net growth rate (units of γ_q)
        const isGain = g > 0;
        if ((pass === 1) !== isGain) { started = false; continue; }
        const r = Math.abs(g) * SCALE;
        const x = cx + r * Math.cos(th);
        const y = cy - r * Math.sin(th);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = pass === 1 ? C.gain : C.loss;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // translucent gain fill
    if (M > 1) {
      const thc = Math.acos(1 / M);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let i = 0; i <= N; i++) {
        const th = -thc + (i / N) * 2 * thc;
        const r = (M * Math.cos(th) - 1) * SCALE;
        ctx.lineTo(cx + r * Math.cos(th), cy - r * Math.sin(th));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(34,197,94,0.15)';
      ctx.fill();

      // cone edge markers
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(34,197,94,0.5)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * 1.15 * Math.cos(thc), cy - R * 1.15 * Math.sin(thc));
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * 1.15 * Math.cos(thc), cy + R * 1.15 * Math.sin(thc));
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, 'θc = ' + (thc * 180 / Math.PI).toFixed(0) + '°',
            cx + R * 1.18 * Math.cos(thc), cy - R * 1.18 * Math.sin(thc) - 8,
            { color: C.gain });
    }

    // drift arrow
    ctx.strokeStyle = C.source;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * 0.55, cy);
    ctx.moveTo(cx + R * 0.55, cy);
    ctx.lineTo(cx + R * 0.55 - 8, cy - 5);
    ctx.moveTo(cx + R * 0.55, cy);
    ctx.lineTo(cx + R * 0.55 - 8, cy + 5);
    ctx.stroke();
    label(ctx, 'v_d', cx + R * 0.55, cy + 14, { color: C.source });

    // readout
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    if (M > 1) {
      label(ctx, lang === 'ja' ? '増幅ローブ（緑）' : 'amplification lobe (green)',
            12, 18, { align: 'left', color: C.gain, bold: true });
    } else {
      label(ctx, lang === 'ja' ? 'すべての方向で吸収（赤）' : 'absorption in every direction (red)',
            12, 18, { align: 'left', color: C.loss });
    }
    label(ctx, 'v_d / v_s = ' + M.toFixed(2), 12, 36, { align: 'left' });
  }

  // redraw on resize and on language toggle
  window.addEventListener('resize', draw);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
  // first draw once the layout settles
  requestAnimationFrame(draw);
})();

/* ═══════════════════════════════════════════════════════════
   MODULE 04 — Phonon avalanche
   n_q(t) from  dn/dt = k n + S,  k = (M - 1) - L   (units of γ_q),
   for the forward mode θ = 0.  Animated trace.
   ═══════════════════════════════════════════════════════════ */
(function growthModule() {
  const cv = document.getElementById('c-growth');
  if (!cv) return;
  const slVd   = document.getElementById('sl-vd-g');
  const slLoss = document.getElementById('sl-loss');
  const outVd  = document.getElementById('out-vd-g');
  const outL   = document.getElementById('out-loss');

  let M = parseFloat(slVd.value);
  let L = parseFloat(slLoss.value);
  let t0 = null;

  const caps = {
    below: {
      en: 'Phonon number $n_q(t)$ for the forward mode ($\\theta=0$), from equation (8). Below threshold the mode idles at a small steady value set by spontaneous emission.',
      ja: '式 (8) による、前方モード（$\\theta=0$）のフォノン数 $n_q(t)$。閾値より下では、自然放出で決まる小さな定常値のあたりをうろつくだけである。',
    },
    above: {
      en: '<b>Above threshold:</b> the current\'s gain outpays the lattice losses and $n_q$ grows exponentially; every new phonon is a coherent clone of the seed. This is the phonon avalanche.',
      ja: '<b>閾値の上：</b>電流の利得が格子損失への支払いを上回り、$n_q$ は指数関数的に育つ。新しいフォノンはどれも種のコヒーレントなクローンだ。これがフォノンの雪崩である。',
    },
  };
  let capState = '';

  function netRate() { return (M - 1) - L; }
  function threshold() { return 1 + L; }   // M at threshold

  function updateCap() {
    const s = netRate() > 0 ? 'above' : 'below';
    if (s === capState) return;
    capState = s;
    setCap('growth-cap', caps[s].en, caps[s].ja);
  }

  function onInput() {
    M = parseFloat(slVd.value);
    L = parseFloat(slLoss.value);
    outVd.textContent = M.toFixed(2);
    outL.textContent  = L.toFixed(2);
    t0 = null;             // restart the trace
    updateCap();
  }
  slVd.addEventListener('input', onInput);
  slLoss.addEventListener('input', onInput);

  function frame(now) {
    const { ctx, w, h } = fitCanvas(cv);
    const t = now / 1000;
    if (t0 === null) t0 = t;
    const elapsed = (t - t0) % 9;          // loop the trace every 9 s

    clearBg(ctx, w, h);
    const padL = 52, padR = 18, padT = 22, padB = 34;
    const pw = w - padL - padR, ph = h - padT - padB;

    // model: dn/dt = k n + S, n(0)=0  →  n(t) = (S/k)(e^{kt} − 1); k→0: n = S t
    const k = netRate();
    const S = 0.15;
    const T = 8;                            // plotted time window (units of 1/γ_q)
    const NMAX = 8;                         // vertical scale
    const nOf = tt => {
      if (Math.abs(k) < 1e-4) return S * tt;
      return (S / k) * (Math.exp(k * tt) - 1);
    };

    // axes
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ph); ctx.lineTo(padL + pw, padT + ph);
    ctx.stroke();
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    label(ctx, lang === 'ja' ? '時間 t (1/γq)' : 'time t (1/γq)', padL + pw / 2, h - 12);
    ctx.save();
    ctx.translate(16, padT + ph / 2);
    ctx.rotate(-Math.PI / 2);
    label(ctx, 'n_q(t)', 0, 0);
    ctx.restore();

    // steady-state line when below threshold
    if (k < -1e-4) {
      const nss = -S / k;
      const yss = padT + ph - Math.min(1, nss / NMAX) * ph;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(168,85,247,0.55)';
      ctx.beginPath();
      ctx.moveTo(padL, yss); ctx.lineTo(padL + pw, yss);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, lang === 'ja' ? '定常値（自然放出が支える）' : 'steady value (held up by spont. emission)',
            padL + pw - 8, yss - 10, { align: 'right', color: 'rgba(168,85,247,0.8)' });
    }

    // animated trace up to `elapsed`
    const tMax = Math.min(elapsed, T);
    ctx.beginPath();
    let clipped = false;
    for (let i = 0; i <= 300; i++) {
      const tt = (i / 300) * tMax;
      let n = nOf(tt);
      if (n > NMAX) { n = NMAX; clipped = true; }
      const x = padL + (tt / T) * pw;
      const y = padT + ph - (n / NMAX) * ph;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      if (clipped) break;
    }
    ctx.strokeStyle = k > 0 ? C.growth : C.decay;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // readouts
    const Mth = threshold();
    label(ctx, 'v_d/v_s = ' + M.toFixed(2) + '   ·   ' +
          (lang === 'ja' ? '閾値 ' : 'threshold ') + Mth.toFixed(2),
          padL + 4, padT - 8, { align: 'left',
          color: k > 0 ? C.growth : C.axisLabel, bold: k > 0 });
    if (k > 0 && clipped) {
      label(ctx, lang === 'ja' ? '雪崩！' : 'avalanche!',
            padL + pw - 10, padT + 14, { align: 'right', color: C.growth, bold: true, size: 14 });
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
