/* ════════════════════════════════════════════════════════════════════
   Measurement, Error & Data Analysis — interactive demos
   Vanilla JS, no dependencies. Four modules:
     00  Types of error      — accuracy-vs-precision target board
     01  Significant figures — sig-fig calculator
     02  Error propagation   — quadrature + Monte-Carlo check
     03  Statistics          — sample stats + least-squares fit
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
  function linearFit(xs, ys) {
    const n = xs.length;
    if (n < 2) return null;
    const sx = xs.reduce((s, x) => s + x, 0);
    const sy = ys.reduce((s, y) => s + y, 0);
    const sxx = xs.reduce((s, x) => s + x * x, 0);
    const sxy = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const d = n * sxx - sx * sx;
    if (Math.abs(d) < 1e-12) return null;
    const a = (n * sxy - sx * sy) / d;                // slope
    const b = (sy - a * sx) / n;                      // intercept
    // residual statistics → parameter uncertainties
    let ssr = 0;
    for (let i = 0; i < n; i++) { const r = ys[i] - (a * xs[i] + b); ssr += r * r; }
    const s2 = n > 2 ? ssr / (n - 2) : 0;
    const da = Math.sqrt(s2 * n / d);
    const db = Math.sqrt(s2 * sxx / d);
    // R²
    const my = sy / n;
    let sst = 0; for (let i = 0; i < n; i++) sst += (ys[i] - my) * (ys[i] - my);
    const r2 = sst > 0 ? 1 - ssr / sst : 1;
    return { a, b, da, db, r2 };
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
    if (!data.length) return;
    const pad = { l: 8, r: 8, t: 10, b: 22 };
    const lo = opts.lo !== undefined ? opts.lo : Math.min(...data);
    const hi = opts.hi !== undefined ? opts.hi : Math.max(...data);
    const span = (hi - lo) || 1;
    const bins = opts.bins || Math.max(8, Math.min(30, Math.round(Math.sqrt(data.length))));
    const counts = new Array(bins).fill(0);
    data.forEach(v => {
      let k = Math.floor((v - lo) / span * bins);
      if (k < 0) k = 0; if (k >= bins) k = bins - 1;
      counts[k]++;
    });
    const maxC = Math.max(...counts) || 1;
    const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
    const bw = plotW / bins;
    // bars
    ctx.fillStyle = opts.color || '#38bdf8';
    for (let i = 0; i < bins; i++) {
      const bh = counts[i] / maxC * plotH;
      ctx.fillRect(pad.l + i * bw + 1, pad.t + plotH - bh, bw - 2, bh);
    }
    // overlay normal curve
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
    // mean ± error markers
    if (opts.markMean) {
      const m = mean(data);
      const mx = pad.l + (m - lo) / span * plotW;
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, pad.t); ctx.lineTo(mx, pad.t + plotH); ctx.stroke();
      if (opts.sem) {
        const ex = opts.sem / span * plotW;
        ctx.fillStyle = 'rgba(251,191,36,0.18)';
        ctx.fillRect(mx - ex, pad.t, 2 * ex, plotH);
      }
    }
    // axis baseline + labels
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t + plotH); ctx.lineTo(w - pad.r, pad.t + plotH); ctx.stroke();
    ctx.fillStyle = '#a8a29e'; ctx.font = '11px sans-serif';
    ctx.textAlign = 'left'; ctx.fillText(fmt(lo, 3), pad.l, h - 7);
    ctx.textAlign = 'right'; ctx.fillText(fmt(hi, 3), w - pad.r, h - 7);
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
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 * 0.92;
      // rings
      for (let i = 4; i >= 1; i--) {
        ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, 2 * Math.PI);
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
      }
      // bullseye (true value)
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#34d399'; ctx.fill();
      // shots
      ctx.fillStyle = 'rgba(125,211,252,0.85)';
      shots.forEach(p => {
        ctx.beginPath(); ctx.arc(cx + p.x * R, cy + p.y * R, 3.3, 0, 2 * Math.PI); ctx.fill();
      });
      // mean
      if (shots.length) {
        const mx = mean(shots.map(p => p.x)), my = mean(shots.map(p => p.y));
        ctx.beginPath(); ctx.arc(cx + mx * R, cy + my * R, 6, 0, 2 * Math.PI);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5; ctx.stroke();
      }
    }

    function shoot(n) {
      const sys = +sSys.value, rnd = +sRand.value;
      const ox = Math.cos(ANGLE) * sys * 0.62, oy = Math.sin(ANGLE) * sys * 0.62;
      for (let i = 0; i < n; i++) {
        shots.push({ x: gaussian(ox, rnd * 0.34), y: gaussian(oy, rnd * 0.34) });
      }
      if (shots.length > 240) shots = shots.slice(-240);
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

    function highlight(str) {
      // colour significant digits blue, leading placeholder zeros grey
      str = str.trim();
      const sign = /^[+-]/.test(str) ? str[0] : '';
      const body = sign ? str.slice(1) : str;
      let seenSig = false, html = '';
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === '.') { html += '.'; continue; }
        if (!seenSig && ch === '0') {
          html += '<span class="digit-pad">' + ch + '</span>';      // leading placeholder zero
        } else {
          seenSig = true;
          html += '<span class="digit-sig">' + ch + '</span>';      // significant digit
        }
      }
      return sign + html;
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
      out.innerHTML =
        '<div>' + highlight(sa) + ' <span style="color:#a8a29e">(' + ca + ' s.f.)</span> &nbsp;' + opSym + '&nbsp; ' +
        highlight(sb) + ' <span style="color:#a8a29e">(' + cb + ' s.f.)</span></div>' +
        '<div style="margin:8px 0 4px">' + t('Raw result', '素の結果') + ': <span style="color:#d6d3d1">' + raw.toPrecision(8).replace(/0+$/, '').replace(/\.$/, '') + '</span></div>' +
        '<div class="sf-result">= ' + resStr + '</div>' +
        '<div class="sf-rule" style="margin-top:6px">' + rule + '</div>';
    }

    [a, b].forEach(el => el.addEventListener('input', compute));
    op.addEventListener('change', compute);
    document.querySelector('.lang-btn') && document.querySelector('.lang-btn').addEventListener('click', () => setTimeout(compute, 0));
    compute();
  }

  /* ════════════════ Module 02 — Error propagation ════════════════ */
  function initPropagation() {
    const varsBox = $('prop-vars'); if (!varsBox) return;

    const FORMULAS = {
      sum: {
        vars: ['x', 'y'],
        init: { x: [10, 0.3], y: [4, 0.2] },
        eval: v => v.x + v.y,
        partial: { x: () => 1, y: () => 1 },
      },
      prodquot: {
        vars: ['x', 'y', 'z'],
        init: { x: [10, 0.3], y: [4, 0.2], z: [2, 0.1] },
        eval: v => v.x * v.y / v.z,
        partial: { x: v => v.y / v.z, y: v => v.x / v.z, z: v => -v.x * v.y / (v.z * v.z) },
      },
      power: {
        vars: ['x'],
        init: { x: [5, 0.2] },
        eval: v => v.x * v.x,
        partial: { x: v => 2 * v.x },
      },
    };
    let cur = 'sum';
    const state = {};   // name -> {val, del}

    function buildControls() {
      const f = FORMULAS[cur];
      varsBox.innerHTML = '';
      f.vars.forEach(name => {
        const [val, del] = f.init[name];
        state[name] = { val, del };
        const wrap = document.createElement('div');
        wrap.style.cssText = 'flex:1 1 100%;display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center';
        wrap.innerHTML =
          '<div class="me-slider"><label>' + name + ' =</label>' +
          '<input type="range" min="' + (name === 'z' ? 0.5 : -5) + '" max="20" step="0.1" value="' + val + '" data-k="' + name + '" data-p="val">' +
          '<output data-o="' + name + '-val">' + val + '</output></div>' +
          '<div class="me-slider"><label>δ' + name + ' =</label>' +
          '<input type="range" min="0" max="3" step="0.02" value="' + del + '" data-k="' + name + '" data-p="del">' +
          '<output data-o="' + name + '-del">' + del + '</output></div>';
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
      const f = FORMULAS[cur];
      const v = {}; f.vars.forEach(n => v[n] = state[n].val);
      const fval = f.eval(v);
      // analytic contributions
      const contrib = f.vars.map(n => {
        const c = f.partial[n](v) * state[n].del;
        return { name: n, var2: c * c };
      });
      const totVar = contrib.reduce((s, c) => s + c.var2, 0);
      const df = Math.sqrt(totVar);
      $('prop-result').innerHTML = 'f = ' + fmt(fval, 4) + ' <small>± ' + fmt(df, 2) + '</small>';
      $('prop-df-a').textContent = fmt(df, 3);
      drawBars(contrib, totVar);
      // Monte-Carlo
      const N = 6000, samples = new Array(N);
      for (let i = 0; i < N; i++) {
        const s = {}; f.vars.forEach(n => s[n] = gaussian(state[n].val, state[n].del));
        samples[i] = f.eval(s);
      }
      const mcSd = stdev(samples);
      $('prop-df-mc').textContent = fmt(mcSd, 3);
      drawHistogram($('c-prop-mc'), samples, { color: '#a78bfa' });
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
        cur = btn.dataset.formula;
        buildControls(); recompute();
      }));
    window.addEventListener('resize', recompute);
    buildControls(); recompute();
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
        normal: { mu: MU, sd: SIGMA }, markMean: true, sem: sem,
      });
    }
    sN.addEventListener('input', () => { vN.textContent = sN.value; gen(); });
    $('btn-gen').addEventListener('click', gen);
    window.addEventListener('resize', update);
    gen();
  }

  /* ════════════════ Module 03b — Least-squares fit ════════════════ */
  function initFit() {
    const cv = $('c-fit'); if (!cv) return;
    // data domain in plot units
    const X0 = 0, X1 = 10, Y0 = 0, Y1 = 10;
    let pts = [];                                     // {x,y} in data units

    function toPx(p, w, h, pad) {
      return {
        px: pad.l + (p.x - X0) / (X1 - X0) * (w - pad.l - pad.r),
        py: h - pad.b - (p.y - Y0) / (Y1 - Y0) * (h - pad.t - pad.b),
      };
    }
    function toData(px, py, w, h, pad) {
      return {
        x: X0 + (px - pad.l) / (w - pad.l - pad.r) * (X1 - X0),
        y: Y0 + (h - pad.b - py) / (h - pad.t - pad.b) * (Y1 - Y0),
      };
    }
    const PAD = { l: 34, r: 12, t: 12, b: 26 };

    function draw() {
      const { ctx, w, h } = fitCanvas(cv);
      ctx.clearRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i += 2) {
        const x = PAD.l + i / 10 * (w - PAD.l - PAD.r);
        const y = h - PAD.b - i / 10 * (h - PAD.t - PAD.b);
        ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, h - PAD.b); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(w - PAD.r, y); ctx.stroke();
      }
      // axes
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, h - PAD.b); ctx.lineTo(w - PAD.r, h - PAD.b); ctx.stroke();
      ctx.fillStyle = '#a8a29e'; ctx.font = '11px sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('x', w - PAD.r, h - 8);
      ctx.textAlign = 'left'; ctx.fillText('y', PAD.l + 4, PAD.t + 4);

      const fit = linearFit(pts.map(p => p.x), pts.map(p => p.y));
      if (fit) {
        // residual stems
        ctx.strokeStyle = 'rgba(168,162,158,0.6)'; ctx.lineWidth = 1;
        pts.forEach(p => {
          const a = toPx(p, w, h, PAD);
          const yhat = fit.a * p.x + fit.b;
          const b = toPx({ x: p.x, y: yhat }, w, h, PAD);
          ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
        });
        // best-fit line (clipped to plot box)
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.4;
        const p1 = toPx({ x: X0, y: fit.a * X0 + fit.b }, w, h, PAD);
        const p2 = toPx({ x: X1, y: fit.a * X1 + fit.b }, w, h, PAD);
        ctx.save();
        ctx.beginPath(); ctx.rect(PAD.l, PAD.t, w - PAD.l - PAD.r, h - PAD.t - PAD.b); ctx.clip();
        ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py); ctx.stroke();
        ctx.restore();
        $('st-slope').innerHTML = fmt(fit.a, 3) + ' <small>± ' + fmt(fit.da, 2) + '</small>';
        $('st-int').innerHTML = fmt(fit.b, 3) + ' <small>± ' + fmt(fit.db, 2) + '</small>';
        $('st-r2').textContent = fit.r2.toFixed(4);
      } else {
        $('st-slope').textContent = '—'; $('st-int').textContent = '—'; $('st-r2').textContent = '—';
      }
      // points
      ctx.fillStyle = '#7dd3fc';
      pts.forEach(p => {
        const a = toPx(p, w, h, PAD);
        ctx.beginPath(); ctx.arc(a.px, a.py, 4, 0, 2 * Math.PI); ctx.fill();
      });
      if (!pts.length) {
        ctx.fillStyle = '#78716c'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(t('click to add points, or load sample data', 'クリックで点を追加、またはサンプルデータを読み込み'), w / 2, h / 2);
      }
    }

    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect();
      const { ctx, w, h } = fitCanvas(cv);   // ensures same coords; redraw afterwards
      const d = toData(e.clientX - r.left, e.clientY - r.top, w, h, PAD);
      if (d.x >= X0 && d.x <= X1 && d.y >= Y0 && d.y <= Y1) { pts.push(d); draw(); }
    });
    $('btn-fit-demo').addEventListener('click', () => {
      pts = [];
      const a = 0.7, b = 1.5;
      for (let x = 0.5; x < 10; x += 1) pts.push({ x, y: Math.max(0.2, Math.min(9.8, a * x + b + gaussian(0, 1.0))) });
      draw();
    });
    $('btn-fit-clear').addEventListener('click', () => { pts = []; draw(); });
    window.addEventListener('resize', draw);
    document.querySelector('.lang-btn') && document.querySelector('.lang-btn').addEventListener('click', () => setTimeout(draw, 0));
    // start with sample data
    $('btn-fit-demo').click();
  }

  /* ── boot once fonts/layout are ready ── */
  function boot() {
    initTarget();
    initSigFig();
    initPropagation();
    initStats();
    initFit();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
