/* ════════════════════════════════════════════════════════════════════
   Measurement, Error & Data Analysis — interactive demos
   Vanilla JS, no dependencies. Four modules:
     00  Types of error      — accuracy-vs-precision target board
     01  Significant figures — sig-fig calculator
     02  Error propagation   — quadrature + Monte-Carlo check
     03  Statistics          — sample stats, CLT + noisy voltmeter
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── i18n helper: read current page language ── */
  const lang = () => document.documentElement.getAttribute('data-lang') || 'en';
  const t = (en, ja) => (lang() === 'ja' ? ja : en);

  /* ── canvas helpers (device-pixel-ratio aware) ── */
  function fitCanvas(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || cv.parentElement.clientWidth;
    // Read the intended logical height ONCE and cache it. Setting cv.height
    // (the draw-buffer) overwrites the HTML height attribute, so re-reading it
    // would make the canvas grow on every redraw.
    if (!cv.dataset.h) cv.dataset.h = cv.getAttribute('height') || cv.clientHeight || 200;
    const h = +cv.dataset.h;
    cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* ── numeric utilities (pure) ── */
  function gaussian(mean, sd) {                       // Box–Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  function stdev(a) {                                 // sample sd (N-1)
    if (a.length < 2) return 0;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1));
  }

  /* round to n significant figures; return a string preserving trailing zeros */
  function roundSig(x, n) {
    if (x === 0) return (0).toFixed(Math.max(0, n - 1));
    const d = Math.ceil(Math.log10(Math.abs(x)));
    const power = n - d;
    const factor = Math.pow(10, power);
    const rounded = Math.round(x * factor) / factor;
    return power > 0 ? rounded.toFixed(power) : String(rounded);
  }
  /* count significant figures of a numeric string */
  function countSig(str) {
    str = str.trim().replace(/^[+-]/, '');
    if (!/^\d*\.?\d+$|^\d+\.?\d*$/.test(str)) return null;
    const hasDot = str.indexOf('.') >= 0;
    let s = str.replace('.', '');
    s = s.replace(/^0+/, '');                         // strip leading zeros
    if (s === '') return 1;                           // value is 0
    if (!hasDot) s = s.replace(/0+$/, '') || '0';     // integer: trailing zeros ambiguous → drop
    return s.length;
  }
  /* decimal places of a numeric string */
  function decimals(str) {
    const i = str.indexOf('.');
    return i < 0 ? 0 : str.length - i - 1;
  }

  /* small DOM helper */
  const $ = id => document.getElementById(id);

  /* number format with fixed sig figs for display */
  function fmt(x, sig = 3) {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    const a = Math.abs(x);
    if (a >= 1e4 || a < 1e-3) return x.toExponential(sig - 1);
    return roundSig(x, sig);
  }

  /* draw a histogram on a dark canvas; returns nothing */
  function drawHistogram(cv, data, opts) {
    opts = opts || {};
    const { ctx, w, h } = fitCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    const density = opts.density || null;
    // Only bail when there's nothing to draw AND no explicit range — an explicit
    // lo/hi means callers (e.g. the voltmeter) still want axes + fixed overlays
    // drawn even before any data has been collected.
    if (!density && !data.length && !opts.countData && (opts.lo === undefined || opts.hi === undefined)) return;
    const pad = { l: opts.yAxis ? 40 : 8, r: 8, t: 10, b: 22 };
    const lo = opts.lo !== undefined ? opts.lo : Math.min(...data);
    const hi = opts.hi !== undefined ? opts.hi : Math.max(...data);
    const span = (hi - lo) || 1;
    const bins = density ? density.length : (opts.countData ? opts.countData.length : (opts.bins || Math.max(8, Math.min(30, Math.round(Math.sqrt(data.length))))));
    let counts;
    if (density) {
      counts = density;
    } else if (opts.countData) {
      counts = opts.countData;            // precomputed, unbounded count array
    } else {
      counts = new Array(bins).fill(0);
      data.forEach(v => {
        const k = Math.floor((v - lo) / span * bins);
        if (k >= 0 && k < bins) counts[k]++;   // ignore out-of-range — no edge pile-up
      });
    }
    // total sample count (drives the data-scaled fit overlay)
    const total = opts.countData ? counts.reduce((s, c) => s + c, 0) : data.length;
    const maxC = Math.max(...counts) || 1;
    const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
    const bw = plotW / bins;
    // bars (keep a small gap when wide, but stay visible when bins are fine)
    const gap = bw > 3 ? 1 : bw * 0.08;
    const barW = Math.max(0.6, bw - 2 * gap);
    ctx.fillStyle = opts.color || '#38bdf8';
    for (let i = 0; i < bins; i++) {
      const bh = counts[i] / maxC * plotH;
      ctx.fillRect(pad.l + i * bw + gap, pad.t + plotH - bh, barW, bh);
    }
    // overlay normal curve (scaled to count space — grows with data)
    if (opts.normal) {
      const { mu, sd } = opts.normal;
      ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.beginPath();
      const binW = span / bins;
      for (let px = 0; px <= plotW; px++) {
        const xv = lo + px / plotW * span;
        const g = Math.exp(-0.5 * ((xv - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
        // scale pdf to count space: expected count per bin = pdf * binW * N
        const expected = g * binW * data.length;
        const y = pad.t + plotH - expected / maxC * plotH;
        px === 0 ? ctx.moveTo(pad.l + px, y) : ctx.lineTo(pad.l + px, y);
      }
      ctx.stroke();
    }
    // generic Gaussian curve. mode 'fixed' → constant amplitude (peak at 0.9·plotH),
    // independent of how much data is collected; mode 'data' → scaled to the bars.
    function gaussCurve(mu, sd, color, mode) {
      if (!(sd > 0)) return;
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      const binW = span / bins;
      const peak = 1 / (sd * Math.sqrt(2 * Math.PI));
      const fixedScale = 0.9 * plotH / peak;
      for (let px = 0; px <= plotW; px++) {
        const xv = lo + px / plotW * span;
        const g = Math.exp(-0.5 * ((xv - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
        const yval = mode === 'fixed' ? g * fixedScale : g * binW * total / maxC * plotH;
        const y = pad.t + plotH - yval;
        px === 0 ? ctx.moveTo(pad.l + px, y) : ctx.lineTo(pad.l + px, y);
      }
      ctx.stroke();
    }
    // parent distribution — fixed amplitude reference curve
    if (opts.fixedCurve) gaussCurve(opts.fixedCurve.mu, opts.fixedCurve.sd, opts.fixedCurve.color || '#34d399', 'fixed');
    // Gaussian fit to the collected data — scaled to the histogram
    if (opts.fitCurve && total >= 2) gaussCurve(opts.fitCurve.mu, opts.fitCurve.sd, opts.fitCurve.color || '#fbbf24', 'data');
    // true (parent) mean — green dashed line
    if (opts.trueMean !== undefined) {
      const tx = pad.l + (opts.trueMean - lo) / span * plotW;
      ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(tx, pad.t); ctx.lineTo(tx, pad.t + plotH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#34d399'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('μ = ' + fmt(opts.trueMean, 3), tx, pad.t + 11);
    }
    // sample mean ± standard-error markers
    if (opts.markMean) {
      const m = mean(data);
      const mx = pad.l + (m - lo) / span * plotW;
      if (opts.sem) {
        const ex = opts.sem / span * plotW;
        ctx.fillStyle = 'rgba(251,191,36,0.18)';
        ctx.fillRect(mx - ex, pad.t, 2 * ex, plotH);
      }
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, pad.t); ctx.lineTo(mx, pad.t + plotH); ctx.stroke();
      ctx.fillStyle = '#fbbf24'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('x̄ = ' + fmt(m, 4), mx, pad.t + plotH + 12 > h ? pad.t + plotH - 4 : pad.t + 24);
    }
    // live marker at an explicit value (e.g. the current sample mean)
    if (opts.liveMark && isFinite(opts.liveMark.x)) {
      const cl = opts.liveMark.color || '#fbbf24';
      let frac = (opts.liveMark.x - lo) / span;
      frac = Math.max(0, Math.min(1, frac));
      const mx = pad.l + frac * plotW;
      ctx.strokeStyle = cl; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, pad.t); ctx.lineTo(mx, pad.t + plotH); ctx.stroke();
      ctx.fillStyle = cl;
      ctx.beginPath(); ctx.moveTo(mx - 5, pad.t); ctx.lineTo(mx + 5, pad.t); ctx.lineTo(mx, pad.t + 7); ctx.closePath(); ctx.fill();
      if (opts.liveMark.label) {
        ctx.font = '11px sans-serif'; ctx.textAlign = mx > w - pad.r - 50 ? 'right' : 'left';
        ctx.fillText(opts.liveMark.label + ' = ' + fmt(opts.liveMark.x, 4), mx + (mx > w - pad.r - 50 ? -6 : 6), pad.t + 16);
      }
    }
    // axis baseline + labels
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t + plotH); ctx.lineTo(w - pad.r, pad.t + plotH); ctx.stroke();
    ctx.fillStyle = '#a8a29e'; ctx.font = '11px sans-serif';
    ctx.textAlign = 'left'; ctx.fillText(fmt(lo, 3), pad.l, h - 7);
    ctx.textAlign = 'right'; ctx.fillText(fmt(hi, 3), w - pad.r, h - 7);
    // always mark the position of x = 0 on the axis (when it lies in range)
    if (lo <= 0 && 0 <= hi) {
      const x0 = pad.l + (0 - lo) / span * plotW;
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, pad.t); ctx.lineTo(x0, pad.t + plotH); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.moveTo(x0, pad.t + plotH); ctx.lineTo(x0, pad.t + plotH + 3); ctx.stroke();
      if (x0 > pad.l + 14 && x0 < w - pad.r - 14) {
        ctx.fillStyle = '#a8a29e'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('0', x0, h - 7);
      }
    }
    // vertical (count) axis — line, 0/max ticks and a rotated label
    if (opts.yAxis) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + plotH); ctx.stroke();
      ctx.fillStyle = '#a8a29e'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      if (!opts.density) ctx.fillText(String(maxC), pad.l - 6, pad.t + 9);
      ctx.fillText('0', pad.l - 6, pad.t + plotH);
      ctx.save();
      ctx.translate(12, pad.t + plotH / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillStyle = '#a8a29e';
      ctx.fillText(opts.density ? t('probability density', '確率密度') : t('count', '度数'), 0, 0);
      ctx.restore();
    }
  }

  /* ════════════════ Module 00 — Target board ════════════════ */
  function initTarget() {
    const cv = $('c-target'); if (!cv) return;
    const sSys = $('ctrl-sys'), sRand = $('ctrl-rand');
    const vSys = $('v-sys'), vRand = $('v-rand');
    let shots = [];
    const ANGLE = -0.6;                               // fixed systematic direction

    function draw() {
      const { ctx, w, h } = fitCanvas(cv);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 * 0.94;
      const RINGS = 6, BLACK = 3;                     // inner 3 rings are the black bull

      // paper face
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI);
      ctx.fillStyle = '#e9e2d0'; ctx.fill();
      // black bullseye disc
      ctx.beginPath(); ctx.arc(cx, cy, R * BLACK / RINGS, 0, 2 * Math.PI);
      ctx.fillStyle = '#1b1916'; ctx.fill();
      // scoring rings
      for (let i = 1; i <= RINGS; i++) {
        const rr = R * i / RINGS;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 2 * Math.PI);
        ctx.lineWidth = i === BLACK ? 1.6 : 1.1;
        ctx.strokeStyle = i <= BLACK ? 'rgba(255,255,255,0.55)' : 'rgba(20,18,15,0.45)';
        ctx.stroke();
      }
      // sighting crosshair through the centre
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(120,110,90,0.45)';
      ctx.beginPath();
      ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
      ctx.stroke();
      // score numbers down the vertical axis (10 at centre → 5 at the rim)
      ctx.font = '600 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 1; i <= RINGS; i++) {
        const rMid = R * (i - 0.5) / RINGS;
        ctx.fillStyle = i <= BLACK ? 'rgba(233,226,208,0.8)' : 'rgba(40,36,30,0.7)';
        ctx.fillText(String(11 - i), cx, cy - rMid);
      }
      ctx.textBaseline = 'alphabetic';

      // shots — translucent red bullet holes. Set the per-dot opacity from the
      // DENSEST overlap so even the most-stacked spot never goes fully opaque:
      // estimate peak overlap k, then solve 1-(1-a)^k = target.
      let k = 1;
      if (shots.length) {
        const cell = 3.6;                 // ≈ dot radius
        const g = new Map();
        shots.forEach(p => {
          const gx = Math.floor((cx + p.x * R) / cell), gy = Math.floor((cy + p.y * R) / cell);
          const key = gx + ',' + gy; g.set(key, (g.get(key) || 0) + 1);
        });
        g.forEach((_, key) => {           // sum each 2×2 block (≈ one dot footprint)
          const c = key.split(',').map(Number);
          let s = 0;
          for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) s += g.get((c[0] + dx) + ',' + (c[1] + dy)) || 0;
          if (s > k) k = s;
        });
      }
      const TARGET = 0.78;                 // max opacity allowed at the densest point
      const a = Math.max(0.05, Math.min(0.78, 1 - Math.pow(1 - TARGET, 1 / k)));
      const fill = 'rgba(206,30,30,' + a.toFixed(3) + ')';
      const edge = 'rgba(120,8,8,' + (a * 0.8).toFixed(3) + ')';
      shots.forEach(p => {
        const x = cx + p.x * R, y = cy + p.y * R;
        ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 2 * Math.PI);
        ctx.fillStyle = fill; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = edge; ctx.stroke();
      });
      // group centroid (mean of shots)
      if (shots.length) {
        const mx = mean(shots.map(p => p.x)), my = mean(shots.map(p => p.y));
        const x = cx + mx * R, y = cy + my * R;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI);
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#fbbf24'; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 11, y); ctx.lineTo(x + 11, y);
        ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 11);
        ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    function shoot(n) {
      const sys = +sSys.value, rnd = +sRand.value;
      const ox = Math.cos(ANGLE) * sys * 0.62, oy = Math.sin(ANGLE) * sys * 0.62;
      for (let i = 0; i < n; i++) {
        shots.push({ x: gaussian(ox, rnd * 0.34), y: gaussian(oy, rnd * 0.34) });
      }
      // keep a generous safety cap so shots persist until the user resets
      if (shots.length > 3000) shots = shots.slice(-3000);
      update();
    }

    function update() {
      vSys.textContent = (+sSys.value).toFixed(2);
      vRand.textContent = (+sRand.value).toFixed(2);
      draw();
      const el = $('target-verdict');
      if (!shots.length) { $('st-acc').textContent = '—'; $('st-prec').textContent = '—'; el.innerHTML = ''; return; }
      const mx = mean(shots.map(p => p.x)), my = mean(shots.map(p => p.y));
      const offset = Math.hypot(mx, my);
      const spread = Math.sqrt(mean(shots.map(p => (p.x - mx) ** 2 + (p.y - my) ** 2)));
      $('st-acc').textContent = fmt(offset, 4);
      $('st-prec').textContent = fmt(spread, 4);
      const accGood = offset < 0.12, precGood = spread < 0.16;
      let cls, msg;
      if (accGood && precGood) { cls = 'good'; msg = t('Accurate & precise — the ideal measurement.', '正確かつ精密 — 理想的な測定。'); }
      else if (!accGood && precGood) { cls = 'mid'; msg = t('Precise but inaccurate — a systematic error. Averaging will NOT fix this.', '精密だが不正確 — 系統誤差。平均をとっても直らない。'); }
      else if (accGood && !precGood) { cls = 'mid'; msg = t('Accurate but imprecise — random error. Averaging more shots WILL help.', '正確だが精密でない — 偶然誤差。測定を増やせば改善する。'); }
      else { cls = 'bad'; msg = t('Neither accurate nor precise — both error types present.', '不正確かつ精密でない — 両方の誤差が存在。'); }
      el.innerHTML = '<span class="me-verdict ' + cls + '">' + msg + '</span>';
    }

    sSys.addEventListener('input', update);
    sRand.addEventListener('input', update);
    $('btn-shoot').addEventListener('click', () => shoot(30));
    $('btn-reset').addEventListener('click', () => { shots = []; update(); });
    window.addEventListener('resize', draw);
    document.querySelector('.lang-btn') && document.querySelector('.lang-btn').addEventListener('click', () => setTimeout(update, 0));
    shoot(30);
  }

  /* ════════════════ Module 01 — Significant figures ════════════════ */
  function initSigFig() {
    const a = $('sf-a'), b = $('sf-b'), op = $('sf-op'), out = $('sf-out');
    if (!a) return;

    /* split a numeric string into integer / decimal-point / fraction cells so
       the worksheet can line up every value on its decimal point. With
       `color`, paint significant digits vs leading placeholder zeros. */
    function numCells(str, color) {
      str = String(str).trim();
      const sign = /^[+-]/.test(str) ? str[0] : '';
      let body = sign ? str.slice(1) : str;
      if (/[eE]/.test(body)) return { int: sign + body, dot: '', frac: '' };  // scientific → whole
      const di = body.indexOf('.');
      const intPart = di < 0 ? body : body.slice(0, di);
      const fracPart = di < 0 ? '' : body.slice(di + 1);
      if (!color) return { int: sign + intPart, dot: di < 0 ? '' : '.', frac: fracPart };
      let seen = false;
      const paint = part => {
        let h = '';
        for (const ch of part) {
          if (!seen && ch === '0') h += '<span class="digit-pad">0</span>';
          else { seen = true; h += '<span class="digit-sig">' + ch + '</span>'; }
        }
        return h;
      };
      return { int: sign + paint(intPart), dot: di < 0 ? '' : '.', frac: paint(fracPart) };
    }

    function sfRow(opSym, cells, note, cls) {
      cls = cls ? ' ' + cls : '';
      return '<span class="c-op' + cls + '">' + opSym + '</span>' +
             '<span class="c-int' + cls + '">' + cells.int + '</span>' +
             '<span class="c-dot' + cls + '">' + cells.dot + '</span>' +
             '<span class="c-frac' + cls + '">' + cells.frac + '</span>' +
             '<span class="c-note' + cls + '">' + note + '</span>';
    }

    function compute() {
      const sa = a.value, sb = b.value, o = op.value;
      const na = parseFloat(sa), nb = parseFloat(sb);
      const ca = countSig(sa), cb = countSig(sb);
      if (ca === null || cb === null || !isFinite(na) || !isFinite(nb)) {
        out.innerHTML = '<span class="sf-rule">' + t('Enter two valid numbers.', '有効な数値を2つ入力してください。') + '</span>';
        return;
      }
      let raw, resStr, rule;
      if (o === '*' || o === '/') {
        raw = o === '*' ? na * nb : na / nb;
        const sig = Math.min(ca, cb);
        resStr = roundSig(raw, sig);
        rule = t(
          'Multiplication / division → keep the smallest sig-fig count: min(' + ca + ', ' + cb + ') = <b>' + sig + ' significant figures</b>.',
          '乗算・除算 → 最小の有効数字に合わせる：min(' + ca + ', ' + cb + ') = <b>有効数字 ' + sig + ' 桁</b>。');
      } else {
        raw = o === '+' ? na + nb : na - nb;
        const dp = Math.min(decimals(sa), decimals(sb));
        resStr = raw.toFixed(dp);
        rule = t(
          'Addition / subtraction → keep the fewest decimal places: min(' + decimals(sa) + ', ' + decimals(sb) + ') = <b>' + dp + ' decimal place(s)</b>.',
          '加算・減算 → 最小の小数位に合わせる：min(' + decimals(sa) + ', ' + decimals(sb) + ') = <b>小数第 ' + dp + ' 位</b>。');
      }
      const opSym = { '*': '×', '/': '÷', '+': '+', '-': '−' }[o];
      const rawStr = raw.toPrecision(8).replace(/0+$/, '').replace(/\.$/, '');
      out.innerHTML =
        '<div class="sf-calc">' +
          sfRow('', numCells(sa, true), ca + ' s.f.') +
          sfRow(opSym, numCells(sb, true), cb + ' s.f.') +
          '<span class="c-rule"></span>' +
          sfRow('=', numCells(rawStr, false), t('raw', '素の値'), 'r-raw') +
          sfRow('', numCells(resStr, false), t('result', '結果'), 'r-final') +
        '</div>' +
        '<div class="sf-rule">' + rule + '</div>';
    }

    [a, b].forEach(el => el.addEventListener('input', compute));
    op.addEventListener('change', compute);
    document.querySelector('.lang-btn') && document.querySelector('.lang-btn').addEventListener('click', () => setTimeout(compute, 0));
    compute();
  }

  /* ════════════════ Module 02 — Error propagation ════════════════ */
  function initPropagation() {
    const varsBox = $('prop-vars'); if (!varsBox) return;
    const exprInput = $('prop-expr');
    const mcN = $('ctrl-mc-n'), mcOut = $('v-mc-n');

    // persistent per-variable state (kept across formula changes)
    const state = { x: { val: 10, del: 0.3 }, y: { val: 4, del: 0.2 }, z: { val: 2, del: 0.1 } };
    let compiled = null, activeVars = [], shownKey = '';
    let mcRAF = 0, lastDfA = 0, lastFval = 0;

    /* compile a user expression in x,y,z into a function (^ → **) */
    function compile(expr) {
      if (!/^[-+*/^(). ,0-9a-zA-Z]*$/.test(expr)) return null;   // basic allow-list
      const js = expr.replace(/\^/g, '**');
      try {
        const fn = new Function('x', 'y', 'z',
          'const {sin,cos,tan,asin,acos,atan,exp,log,sqrt,abs,pow,min,max,PI,E}=Math; return (' + js + ');');
        if (!isFinite(fn(1, 1, 1)) && !isFinite(fn(2, 2, 2))) { /* still allow */ }
        return fn;
      } catch (e) { return null; }
    }
    /* which of x,y,z appear as standalone variables (not inside sin/exp/…) */
    function detectVars(expr) {
      return ['x', 'y', 'z'].filter(v => new RegExp('(?<![a-zA-Z])' + v + '(?![a-zA-Z])').test(expr));
    }
    function evalAt(vals) { return compiled(vals.x, vals.y, vals.z); }
    /* central-difference partial derivative ∂f/∂key at vals */
    function numPartial(vals, key) {
      const x0 = vals[key];
      const hstep = Math.max(1e-6, 1e-4 * Math.abs(x0));
      const vp = Object.assign({}, vals); vp[key] = x0 + hstep;
      const vm = Object.assign({}, vals); vm[key] = x0 - hstep;
      return (evalAt(vp) - evalAt(vm)) / (2 * hstep);
    }

    function buildControls() {
      varsBox.innerHTML = '';
      activeVars.forEach(name => {
        const st = state[name];
        const wrap = document.createElement('div');
        wrap.style.cssText = 'flex:1 1 100%;display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center';
        wrap.innerHTML =
          '<div class="me-slider"><label>' + name + ' =</label>' +
          '<input type="range" min="' + (name === 'z' ? 0.5 : -10) + '" max="20" step="0.1" value="' + st.val + '" data-k="' + name + '" data-p="val">' +
          '<output data-o="' + name + '-val">' + st.val.toFixed(2) + '</output></div>' +
          '<div class="me-slider"><label>δ' + name + ' =</label>' +
          '<input type="range" min="0" max="3" step="0.02" value="' + st.del + '" data-k="' + name + '" data-p="del">' +
          '<output data-o="' + name + '-del">' + st.del.toFixed(2) + '</output></div>';
        varsBox.appendChild(wrap);
      });
      varsBox.querySelectorAll('input').forEach(inp =>
        inp.addEventListener('input', () => {
          state[inp.dataset.k][inp.dataset.p] = +inp.value;
          varsBox.querySelector('[data-o="' + inp.dataset.k + '-' + inp.dataset.p + '"]').textContent = (+inp.value).toFixed(2);
          recompute();
        }));
    }

    function recompute() {
      const expr = exprInput.value.trim();
      compiled = compile(expr);
      const vars = compiled ? detectVars(expr) : [];
      exprInput.style.borderColor = compiled ? '' : 'var(--accent)';
      if (!compiled || vars.length === 0) {
        $('prop-result').innerHTML = '<small style="color:#fda4af">' +
          t('Invalid formula — use x, y, z and the allowed functions.',
            '式が無効です — x, y, z と許可された関数を使ってください。') + '</small>';
        ['c-prop-bars', 'c-prop-mc'].forEach(id => { const c = $(id), o = fitCanvas(c); o.ctx.clearRect(0, 0, o.w, o.h); });
        $('prop-df-a').textContent = '—'; $('prop-df-mc').textContent = '—'; $('prop-agree').textContent = '—';
        return;
      }
      // rebuild sliders only when the variable set changes
      if (vars.join() !== shownKey) { activeVars = vars; shownKey = vars.join(); buildControls(); }

      const vals = { x: state.x.val, y: state.y.val, z: state.z.val };
      const fval = evalAt(vals);
      // analytic contributions via numeric partials
      const contrib = activeVars.map(n => {
        const c = numPartial(vals, n) * state[n].del;
        return { name: n, var2: c * c };
      });
      const totVar = contrib.reduce((s, c) => s + c.var2, 0);
      const dfA = Math.sqrt(totVar);
      $('prop-result').innerHTML = 'f = ' + fmt(fval, 4) + ' <small>± ' + fmt(dfA, 2) + '</small>';
      $('prop-df-a').textContent = fmt(dfA, 3);
      drawInputs(vals);
      drawBars(contrib, totVar);

      lastFval = fval; lastDfA = dfA;
      // a quick full Monte-Carlo run keeps the read-outs live while sliders move
      cancelAnimationFrame(mcRAF); mcRAF = 0;
      const N = mcN ? +mcN.value : 8000;
      const samples = sampleMC(N, vals);
      const mcMean = samples.length ? mean(samples) : fval;
      const mcSd = stdev(samples);
      $('prop-df-mc').textContent = fmt(mcSd, 3);
      if ($('mc-progress')) $('mc-progress').textContent = N.toLocaleString() + ' / ' + N.toLocaleString() + ' ' + t('trials', '試行');
      setAgreement(dfA, mcSd);
      drawComparison($('c-prop-mc'), samples, mcMean, dfA, mcSd);
    }

    /* agreement badge between the analytic and Monte-Carlo standard deviations */
    function setAgreement(dfA, mcSd) {
      const rel = mcSd > 0 ? Math.abs(dfA - mcSd) / mcSd : 0;
      $('prop-agree').innerHTML = rel < 0.05
        ? '<span style="color:#6ee7b7">' + t('match', '一致') + ' (' + (rel * 100).toFixed(1) + '%)</span>'
        : (rel < 0.2
          ? '<span style="color:#fbbf24">~ ' + (rel * 100).toFixed(0) + '%</span>'
          : '<span style="color:#fda4af">' + t('differs', '相違') + ' ' + (rel * 100).toFixed(0) + '%</span>');
    }

    /* run `count` Monte-Carlo trials at the given input centres */
    function sampleMC(count, vals) {
      const out = [];
      for (let i = 0; i < count; i++) {
        const s = { x: vals.x, y: vals.y, z: vals.z };
        activeVars.forEach(n => { s[n] = gaussian(state[n].val, state[n].del); });
        const fv = evalAt(s);
        if (isFinite(fv)) out.push(fv);
      }
      return out;
    }

    /* animated Monte-Carlo: accumulate trials a small batch per frame so the
       histogram visibly builds up — one set of random draws at a time. This is
       what makes "Monte-Carlo" concrete: each trial = one random sample of f. */
    function animateMC() {
      if (!compiled || activeVars.length === 0) return;
      cancelAnimationFrame(mcRAF);
      const vals = { x: state.x.val, y: state.y.val, z: state.z.val };
      const dfA = lastDfA, fval = lastFval;
      const N = mcN ? +mcN.value : 8000;
      const btn = $('btn-mc-run');
      const samples = [];
      let drawn = 0;
      const batch = Math.max(1, Math.round(N / 90));
      if (btn) btn.disabled = true;
      function step() {
        const end = Math.min(N, drawn + batch);
        for (; drawn < end; drawn++) {
          const s = { x: vals.x, y: vals.y, z: vals.z };
          activeVars.forEach(n => { s[n] = gaussian(state[n].val, state[n].del); });
          const fv = evalAt(s);
          if (isFinite(fv)) samples.push(fv);
        }
        const mcSd = stdev(samples);
        $('prop-df-mc').textContent = fmt(mcSd, 3);
        if ($('mc-progress')) $('mc-progress').textContent = drawn.toLocaleString() + ' / ' + N.toLocaleString() + ' ' + t('trials', '試行');
        setAgreement(dfA, mcSd);
        drawComparison($('c-prop-mc'), samples, fval, dfA, mcSd);
        if (drawn < N) { mcRAF = requestAnimationFrame(step); }
        else { mcRAF = 0; if (btn) btn.disabled = false; }
      }
      step();
    }

    /* MC histogram with the analytic Normal(mu, dfA) curve overlaid, plus
       ±δf width bars so the two variances can be compared by eye. */
    function drawComparison(cv, data, mu, sdA, sdMC) {
      const { ctx, w, h } = fitCanvas(cv);
      ctx.clearRect(0, 0, w, h);
      if (!data.length) return;
      const pad = { l: 8, r: 8, t: 26, b: 18 };
      const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
      const S = Math.max(sdA, sdMC, 1e-9);
      const lo = mu - 4 * S, hi = mu + 4 * S, span = (hi - lo) || 1;
      const bins = 40;
      const counts = new Array(bins).fill(0);
      data.forEach(v => { let k = Math.floor((v - lo) / span * bins); if (k >= 0 && k < bins) counts[k]++; });
      const maxC = Math.max(...counts) || 1;
      const X = v => pad.l + (v - lo) / span * plotW;
      const bw = plotW / bins;
      // histogram bars
      ctx.fillStyle = '#a78bfa';
      counts.forEach((c, i) => {
        const bh = c / maxC * plotH;
        ctx.fillRect(pad.l + i * bw + 0.5, pad.t + plotH - bh, bw - 1, bh);
      });
      // analytic Normal curve, scaled so its peak matches the histogram height
      const peakPdf = 1 / (sdA * Math.sqrt(2 * Math.PI));
      ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let px = 0; px <= plotW; px++) {
        const xv = lo + px / plotW * span;
        const g = Math.exp(-0.5 * ((xv - mu) / sdA) ** 2) / (sdA * Math.sqrt(2 * Math.PI));
        // match areas: expected count per bin = pdf * binWidth * N
        const expected = g * (span / bins) * data.length;
        const y = pad.t + plotH - Math.min(1, expected / maxC) * plotH;
        px === 0 ? ctx.moveTo(pad.l + px, y) : ctx.lineTo(pad.l + px, y);
      }
      ctx.stroke();
      // width bars: analytic (green) above, MC (amber) below
      function widthBar(yy, half, color, label) {
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
        const x1 = X(mu - half), x2 = X(mu + half);
        ctx.beginPath(); ctx.moveTo(x1, yy); ctx.lineTo(x2, yy); ctx.stroke();
        [x1, x2].forEach(xx => { ctx.beginPath(); ctx.moveTo(xx, yy - 3); ctx.lineTo(xx, yy + 3); ctx.stroke(); });
        ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(label, Math.min(x2 + 5, w - 60), yy + 3);
      }
      widthBar(pad.t - 16, sdA, '#34d399', '±δf');
      widthBar(pad.t - 6, sdMC, '#fbbf24', '±MC');
      // mean marker
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(X(mu), pad.t); ctx.lineTo(X(mu), pad.t + plotH); ctx.stroke(); ctx.setLineDash([]);
      // x labels
      ctx.fillStyle = '#a8a29e'; ctx.font = '10px sans-serif';
      ctx.textAlign = 'left'; ctx.fillText(fmt(lo, 3), pad.l, h - 5);
      ctx.textAlign = 'right'; ctx.fillText(fmt(hi, 3), w - pad.r, h - 5);
    }

    /* input panel: each active variable as a point at its value with a
       horizontal ±δ error bar, so the inputs and their spreads are visible. */
    function drawInputs(vals) {
      const cv = $('c-prop-inputs');
      const { ctx, w, h } = fitCanvas(cv);
      ctx.clearRect(0, 0, w, h);
      const cols = ['#38bdf8', '#fbbf24', '#f472b6', '#34d399'];
      const pad = { l: 30, r: 14, t: 12, b: 18 };
      const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
      // shared value axis spanning all variables' (value ± δ)
      let lo = Infinity, hi = -Infinity;
      activeVars.forEach(n => {
        lo = Math.min(lo, vals[n] - state[n].del);
        hi = Math.max(hi, vals[n] + state[n].del);
      });
      if (!isFinite(lo) || lo === hi) { lo -= 1; hi += 1; }
      const m = (hi - lo) * 0.12 || 1; lo -= m; hi += m;
      const span = hi - lo;
      const X = v => pad.l + (v - lo) / span * plotW;
      // axis
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();
      ctx.fillStyle = '#a8a29e'; ctx.font = '10px sans-serif';
      ctx.textAlign = 'left'; ctx.fillText(fmt(lo, 3), pad.l, h - 5);
      ctx.textAlign = 'right'; ctx.fillText(fmt(hi, 3), w - pad.r, h - 5);
      // one row per variable
      const rowH = plotH / activeVars.length;
      activeVars.forEach((n, i) => {
        const y = pad.t + (i + 0.5) * rowH;
        const v = vals[n], d = state[n].del;
        const xc = X(v), x1 = X(v - d), x2 = X(v + d);
        const col = cols[i % cols.length];
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
        // error bar + caps
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        [x1, x2].forEach(xx => { ctx.beginPath(); ctx.moveTo(xx, y - 5); ctx.lineTo(xx, y + 5); ctx.stroke(); });
        // central point
        ctx.beginPath(); ctx.arc(xc, y, 3.5, 0, 2 * Math.PI); ctx.fill();
        // variable label (left) and numeric value (right of bar)
        ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(n, pad.l - 6, y + 4);
        ctx.font = '10px sans-serif'; ctx.fillStyle = '#d6d3d1'; ctx.textAlign = 'left';
        ctx.fillText(fmt(v, 3) + ' ± ' + fmt(d, 2), Math.min(x2 + 7, w - 70), y - 6);
      });
    }

    function drawBars(contrib, totVar) {
      const cv = $('c-prop-bars');
      const { ctx, w, h } = fitCanvas(cv);
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 36, r: 10, t: 10, b: 22 };
      const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
      const n = contrib.length, gap = 14;
      const bw = (plotW - gap * (n - 1)) / n;
      const cols = ['#38bdf8', '#fbbf24', '#f472b6', '#34d399'];
      contrib.forEach((c, i) => {
        const frac = totVar > 0 ? c.var2 / totVar : 0;
        const bh = frac * plotH;
        const x = pad.l + i * (bw + gap);
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(x, pad.t + plotH - bh, bw, bh);
        ctx.fillStyle = '#e7e5e4'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText((frac * 100).toFixed(0) + '%', x + bw / 2, pad.t + plotH - bh - 5);
        ctx.fillStyle = '#a8a29e';
        ctx.fillText('δ' + c.name, x + bw / 2, h - 7);
      });
      // y axis 0..100%
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + plotH); ctx.lineTo(w - pad.r, pad.t + plotH); ctx.stroke();
      ctx.fillStyle = '#a8a29e'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('100%', pad.l - 5, pad.t + 8); ctx.fillText('0', pad.l - 5, pad.t + plotH);
    }

    document.querySelectorAll('#prop-formula .demo-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        document.querySelectorAll('#prop-formula .demo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        exprInput.value = btn.dataset.expr;
        recompute();
        animateMC();
      }));
    exprInput.addEventListener('input', () => {
      document.querySelectorAll('#prop-formula .demo-btn').forEach(b => b.classList.remove('active'));
      recompute();
    });
    if (mcN) mcN.addEventListener('input', () => {
      mcOut.textContent = (+mcN.value).toLocaleString();
      recompute();
    });
    window.addEventListener('resize', recompute);
    document.querySelector('.lang-btn') && document.querySelector('.lang-btn').addEventListener('click', () => setTimeout(recompute, 0));
    const mcRunBtn = $('btn-mc-run');
    if (mcRunBtn) mcRunBtn.addEventListener('click', animateMC);
    if (mcN) mcOut.textContent = (+mcN.value).toLocaleString();
    recompute();
    animateMC();
  }

  /* ════════════════ Module 03a — Sample statistics ════════════════ */
  function initStats() {
    const cv = $('c-hist'); if (!cv) return;
    const MU = 50, SIGMA = 8;
    const sN = $('ctrl-n'), vN = $('v-n');
    let data = [];

    function gen() {
      const n = +sN.value;
      data = Array.from({ length: n }, () => gaussian(MU, SIGMA));
      update();
    }
    function update() {
      vN.textContent = sN.value;
      if (!data.length) return;
      const m = mean(data), sd = stdev(data), sem = sd / Math.sqrt(data.length);
      $('st-mean').textContent = fmt(m, 4);
      $('st-sd').textContent = fmt(sd, 3);
      $('st-sem').textContent = fmt(sem, 3);
      drawHistogram(cv, data, {
        lo: MU - 4 * SIGMA, hi: MU + 4 * SIGMA, bins: 24,
        normal: { mu: MU, sd: SIGMA }, markMean: true, sem: sem, trueMean: MU,
      });
    }
    sN.addEventListener('input', () => { vN.textContent = sN.value; gen(); });
    $('btn-gen').addEventListener('click', gen);
    window.addEventListener('resize', update);
    gen();
  }

  /* ════════════════ Module 03a — Central Limit Theorem ════════════════ */
  function initCLT() {
    const cvP = $('c-clt-parent'); if (!cvP) return;
    const cvM = $('c-clt-means'), sN = $('ctrl-clt-n');

    const PARENTS = {
      uniform:     { mu: 0.5, sd: Math.sqrt(1 / 12), lo: 0,    hi: 1,   sample: () => Math.random(),
                     pdf: x => (x >= 0 && x <= 1 ? 1 : 0) },
      exponential: { mu: 1,   sd: 1,                 lo: 0,    hi: 6,   sample: () => -Math.log(1 - Math.random()),
                     pdf: x => (x >= 0 ? Math.exp(-x) : 0) },
      bimodal:     { mu: 0.5, sd: 0.5,               lo: -0.2, hi: 1.2, sample: () => (Math.random() < 0.5 ? 0 : 1),
                     mass: [{ x: 0, p: 0.5 }, { x: 1, p: 0.5 }] },
      normal:      { mu: 0.5, sd: 0.16,              lo: -0.2, hi: 1.2, sample: () => gaussian(0.5, 0.16),
                     pdf: x => Math.exp(-0.5 * ((x - 0.5) / 0.16) ** 2) / (0.16 * Math.sqrt(2 * Math.PI)) },
    };

    /* exact theoretical density of the parent over [lo,hi] in `bins` bins.
       The parent distribution is a fixed truth, not random — so we draw the
       analytic pdf (continuous) or point masses (discrete), no sampling noise. */
    function parentDensity(P, lo, hi, bins) {
      const span = hi - lo, bw = span / bins;
      const d = new Array(bins).fill(0);
      if (P.mass) {
        P.mass.forEach(m => {
          let k = Math.floor((m.x - lo) / span * bins);
          if (k < 0) k = 0; if (k >= bins) k = bins - 1;
          d[k] += m.p;
        });
      } else if (P.pdf) {
        for (let i = 0; i < bins; i++) d[i] = P.pdf(lo + (i + 0.5) * bw);
      }
      return d;
    }
    let cur = 'uniform';

    function update() {
      const P = PARENTS[cur];
      const n = +sN.value;
      $('v-clt-n').textContent = n;
      // Both panels share the SAME x-axis range AND the SAME bin count, so the
      // bin size is identical and the two histograms are directly comparable.
      const BINS = 100;
      // parent panel: the EXACT parent density (deterministic, not a sample)
      const dens = parentDensity(P, P.lo, P.hi, BINS);
      drawHistogram(cvP, [], { lo: P.lo, hi: P.hi, density: dens, color: '#7dd3fc', trueMean: P.mu, yAxis: true });
      // means panel: distribution of the mean of n draws
      const trials = 4000, means = new Array(trials);
      for (let i = 0; i < trials; i++) {
        let s = 0; for (let k = 0; k < n; k++) s += P.sample();
        means[i] = s / n;
      }
      const sePred = P.sd / Math.sqrt(n);
      const seObs = stdev(means);
      $('clt-se-pred').textContent = fmt(sePred, 3);
      $('clt-se-obs').textContent = fmt(seObs, 3);
      drawHistogram(cvM, means, {
        lo: P.lo, hi: P.hi, bins: BINS, color: '#a78bfa',
        normal: { mu: P.mu, sd: sePred }, trueMean: P.mu, yAxis: true,
      });
    }

    document.querySelectorAll('#clt-parent .demo-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        document.querySelectorAll('#clt-parent .demo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); cur = btn.dataset.parent; update();
      }));
    sN.addEventListener('input', update);
    window.addEventListener('resize', update);
    update();
  }

  /* ════════════════ Module 03b — Worked example: noisy voltmeter ════════════════ */
  function initVoltmeter() {
    const cvS = $('c-volt-strip'); if (!cvS) return;
    const cvD = $('c-volt-dist'), sN = $('ctrl-volt-n');
    const MU = 5, NOISE = 0.5;          // true voltage and single-reading noise sd
    const Y_HALF = 3.2 * NOISE;         // strip y half-range
    const D_HALF = 1.5;                 // distribution x half-range (volts)
    const VIS = 60;                     // readings visible in the strip
    const SPEEDS = [                    // meter speed presets (× relative to 2 readings/s)
      { label: '1×', ms: 500, step: 1 }, { label: '5×', ms: 100, step: 1 },
      { label: '25×', ms: 20, step: 1 }, { label: '100×', ms: 20, step: 4 },
      { label: '1000×', ms: 16, step: 32 },
    ];
    const HBINS = 60, H_LO = MU - D_HALF, H_HI = MU + D_HALF;
    // readings: rolling display buffer · batch: current experiment in progress
    // hist/cN/cSum/cSum2: persistent, unbounded tally of completed sample means
    let readings = [], batch = [], liveX = NaN;
    let hist = new Array(HBINS).fill(0), cN = 0, cSum = 0, cSum2 = 0;
    let paused = false, timer = 0, speedIdx = 0;

    function se() { return NOISE / Math.sqrt(+sN.value); }

    function drawStrip() {
      const { ctx, w, h } = fitCanvas(cvS);
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 42, r: 10, t: 12, b: 18 };
      const yLo = MU - Y_HALF, yHi = MU + Y_HALF, ySpan = yHi - yLo;
      const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
      const yP = v => pad.t + plotH - (v - yLo) / ySpan * plotH;
      // true-value line
      const ty = yP(MU);
      ctx.strokeStyle = '#34d399'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(pad.l, ty); ctx.lineTo(w - pad.r, ty); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#34d399'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(t('true 5 V', '真値 5 V'), pad.l + 3, ty - 3);
      // visible slice
      const vis = readings.slice(-VIS);
      const xP = i => pad.l + (VIS <= 1 ? plotW : i / (VIS - 1) * plotW);
      // connecting polyline
      ctx.strokeStyle = 'rgba(125,211,252,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
      vis.forEach((v, i) => { const x = xP(i), y = yP(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      // highlight the readings of the CURRENT experiment (the trailing batch).
      // On the frame a batch just completed (batch empty) show the whole n.
      const hi = batch.length > 0 ? batch.length : Math.min(+sN.value, vis.length);
      vis.forEach((v, i) => {
        const inBatch = i >= vis.length - hi;
        ctx.fillStyle = inBatch ? '#fbbf24' : '#7dd3fc';
        ctx.beginPath(); ctx.arc(xP(i), yP(v), inBatch ? 3 : 2, 0, 2 * Math.PI); ctx.fill();
      });
      // axes
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + plotH); ctx.lineTo(w - pad.r, pad.t + plotH); ctx.stroke();
      ctx.fillStyle = '#a8a29e'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(fmt(yHi, 2), pad.l - 4, pad.t + 8);
      ctx.fillText(fmt(yLo, 2), pad.l - 4, pad.t + plotH);
      ctx.save(); ctx.translate(12, pad.t + plotH / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillText(t('volts', '電圧'), 0, 0); ctx.restore();
      ctx.textAlign = 'right'; ctx.fillStyle = '#a8a29e';
      ctx.fillText(t('time →', '時間 →'), w - pad.r, h - 5);
    }

    function drawDist() {
      const fitMu = cN ? cSum / cN : MU;
      const fitVar = cN >= 2 ? (cSum2 - cSum * cSum / cN) / (cN - 1) : 0;
      const fitSd = fitVar > 0 ? Math.sqrt(fitVar) : 0;
      drawHistogram(cvD, [], {
        lo: H_LO, hi: H_HI, countData: hist, color: '#a78bfa',
        fixedCurve: { mu: MU, sd: NOISE, color: '#34d399' },      // parent f(x), fixed size
        fitCurve: { mu: fitMu, sd: fitSd, color: '#facc15' },     // normal fit to collected x̄
        trueMean: MU, yAxis: true,
        liveMark: isFinite(liveX) ? { x: liveX, color: '#38bdf8', label: 'x̄' } : null,
      });
    }

    function refreshStats() {
      const n = +sN.value;
      $('v-volt-n').textContent = n;
      $('volt-se').textContent = fmt(se(), 3) + ' V';
      $('volt-xbar').textContent = isFinite(liveX) ? fmt(liveX, 4) + ' V' : '—';
      $('volt-count').textContent = cN;
      $('volt-batch').textContent = t(
        'collecting reading ' + batch.length + ' / ' + n,
        '測定中 ' + batch.length + ' / ' + n + ' 個');
    }

    function tick() {
      const step = SPEEDS[speedIdx].step || 1;
      let lastV = NaN;
      for (let s = 0; s < step; s++) {
        const v = gaussian(MU, NOISE); lastV = v;
        readings.push(v);
        if (readings.length > 400) readings.shift();
        batch.push(v);
        // one experiment = exactly n readings → compute its mean, then start fresh
        if (batch.length >= +sN.value) {
          liveX = mean(batch);
          cN++; cSum += liveX; cSum2 += liveX * liveX;
          const k = Math.floor((liveX - H_LO) / (H_HI - H_LO) * HBINS);
          if (k >= 0 && k < HBINS) hist[k]++;     // unbounded tally
          batch = [];
        }
      }
      $('volt-now').textContent = fmt(lastV, 4);
      refreshStats(); drawStrip(); drawDist();
    }

    function start() { if (!timer && !paused) timer = setInterval(tick, SPEEDS[speedIdx].ms); }
    function stop() { if (timer) { clearInterval(timer); timer = 0; } }
    function restart() { stop(); start(); }

    function resetRun() {        // distribution shape changed → start the tally over
      hist = new Array(HBINS).fill(0); cN = 0; cSum = 0; cSum2 = 0;
      batch = []; liveX = NaN;
      refreshStats(); drawStrip(); drawDist();
    }

    sN.addEventListener('input', resetRun);

    // segmented speed control — every option visible at a glance, active highlighted
    const speedOpts = $('volt-speed-opts');
    if (speedOpts) {
      SPEEDS.forEach((sp, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'vs-opt' + (i === speedIdx ? ' active' : '');
        b.textContent = sp.label;
        b.setAttribute('aria-label', 'Speed ' + sp.label);
        b.addEventListener('click', () => {
          speedIdx = i;
          speedOpts.querySelectorAll('.vs-opt').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          restart();
        });
        speedOpts.appendChild(b);
      });
    }

    const pauseBtn = $('btn-volt-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.innerHTML = paused
        ? '<span class="i18n-en">▶ Resume</span><span class="i18n-ja">▶ 再開</span>'
        : '<span class="i18n-en">❚❚ Pause</span><span class="i18n-ja">❚❚ 一時停止</span>';
      paused ? stop() : start();
    });
    window.addEventListener('resize', () => { drawStrip(); drawDist(); });

    // seed a partial batch so the strip isn't empty, then run
    for (let i = 0; i < 8; i++) { const v = gaussian(MU, NOISE); readings.push(v); batch.push(v); }
    refreshStats(); drawStrip(); drawDist();
    start();
  }

  /* ── boot once fonts/layout are ready ── */
  function boot() {
    initTarget();
    initSigFig();
    initPropagation();
    initStats();
    initCLT();
    initVoltmeter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
