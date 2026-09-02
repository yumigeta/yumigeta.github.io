/* ============================================================
   Interactive Raman spectroscopy demo — vanilla JS, no deps.
   和紙パレット版: 色・書体・電子雲の描画のみ変更。構造・配置・内容は原版のまま。
   ============================================================ */

const TAU = Math.PI * 2;
const COL = {
  field:     '#a67c52',                 // 入射電場 E — 茶
  vib:       '#3d6b68',                 // 分極率 α — 青緑
  dipole:    '#d08a3c',                 // 誘起双極子 μ — 琥珀（橙）
  rayleigh:  '#8f8579',                 // 灰
  stokes:    '#b5452f',                 // 赤
  anti:      '#3d6b68',                 // 青緑
  axis:      'rgba(74,64,56,0.22)',
  now:       'rgba(166,124,82,0.55)',
  nucleus:   '#b5452f',                 // 原子核 — 赤
  oxygen:    '#b5452f',                 // CO₂ の O — 赤
  cloud:     '#3d6b68',
  cloudDim:  'rgba(61,107,104,0.10)',
  cloudBright: 'rgba(61,107,104,0.26)',
  ink:       '#4a4038',
  mute:      '#9a9288',
  faint:     '#b8b0a4',
  tangent:   '#d9a06e',                 // 接線・包絡線 — 橙
  paper:     '#f8f5ee'
};
const SANS  = "'Zen Kaku Gothic New', system-ui, sans-serif";
const SERIF = "Georgia, 'Times New Roman', 'Shippori Mincho', serif";

/* ── 組版規則 (ISO 80000-2) ──
   ・量記号 (E, μ, α, Q, t, ω) = セリフ斜体
   ・数字・演算子・括弧・∂・ラベル添字 (i, k, 0) = セリフ立体
   ・説明語（日本語/英語）= サンセリフ立体、太字は使わない
   ・階層: L1 記号 16px / L2 説明 12px / L3 目盛 10px          */
const T = { sym: 16, symSm: 13, label: 12, tick: 10 };
const txt = (px, w) => (w ? w + ' ' : '') + px + 'px ' + SANS;

/* 記法: *x* = 斜体量記号, ~x~ = 立体添字, それ以外は立体 */
function tokenize(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '*' || c === '~') {
      const end = s.indexOf(c, i + 1);
      if (end > i) { out.push({ t: s.slice(i + 1, end), it: c === '*', sub: c === '~' }); i = end + 1; continue; }
    }
    let j2 = i; while (j2 < s.length && s[j2] !== '*' && s[j2] !== '~') j2++;
    out.push({ t: s.slice(i, j2), it: false, sub: false }); i = j2;
  }
  return out;
}
function fontFor(tk, size) {
  const px = tk.sub ? Math.round(size * 0.72) : size;
  return (tk.it ? 'italic ' : '') + px + 'px ' + SERIF;
}
function measureMath(ctx, s, size) {
  let w = 0; for (const tk of tokenize(s)) { ctx.font = fontFor(tk, size); w += ctx.measureText(tk.t).width; }
  return w;
}
/* align: 'left' | 'right' | 'center'、baseline は middle 相当 */
function mathText(ctx, s, x, y, size, align) {
  const toks = tokenize(s);
  const w = measureMath(ctx, s, size);
  let px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  const prevAlign = ctx.textAlign, prevBase = ctx.textBaseline;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const tk of toks) {
    ctx.font = fontFor(tk, size);
    ctx.fillText(tk.t, px, y + (tk.sub ? size * 0.22 : 0));
    px += ctx.measureText(tk.t).width;
  }
  ctx.textAlign = prevAlign; ctx.textBaseline = prevBase;
  return w;
}

const lang2 = () => document.documentElement.getAttribute('data-lang') || 'en';

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
   ============================================================ */
(function atomModule() {
  const cv = document.getElementById('c-atom');
  if (!cv) return;
  const card = cv.closest(".anim-card");

  const OMEGA   = 2.6;
  const OMEGA_V = 0.42;
  const MOD     = 0.45;
  const AMP     = 22;

  const slider   = document.getElementById('ctrl-alpha');
  const out      = document.getElementById('v-alpha');
  const modeBtns = document.getElementById('atom-mode');
  let mode = 'const';
  const baseAlpha = () => slider ? parseFloat(slider.value) : 1.0;
  function syncOut() { if (out) out.innerHTML = '<i>α</i><sub>0</sub>&nbsp;= ' + baseAlpha().toFixed(2); }
  if (slider) { slider.addEventListener('input', syncOut); syncOut(); }
  if (modeBtns) modeBtns.addEventListener('click', e => {
    const b = e.target.closest('[data-amode]'); if (!b) return;
    mode = b.dataset.amode;
    modeBtns.querySelectorAll('.demo-btn').forEach(x => x.classList.toggle('active', x === b));
  });

  // 電荷: 影(glow)を外し、紙地に馴染む平坦な円 + 生成りの縁
  function charge(ctx, x, y, r, fill, glyph) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = COL.paper;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = COL.paper; ctx.font = Math.round(r * 1.15) + 'px ' + SERIF;
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
  const muHist = [];
  const HISTN = 560;
  function frame() {
    if (cv.offsetWidth === 0) { requestAnimationFrame(frame); return; }
    const { ctx, w, h } = fitCanvas(cv);
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    const cy = h / 2;
    const divX = Math.round(w * 0.46);
    const cloudR = 54, nucR = 14;
    // 図中ラベル（雲の左外に右寄せ）を置くには、雲の左に文字幅ぶんの余白が要る。
    // 原子の中心を必要なだけ右へ寄せて余白を作る。ただし右は μ 矢印のレーンまで。
    // 核ラベルは雲と同じ高さなので雲の左端を避けるが、電子雲ラベルは雲より上に
    // 出るので、引き出し線の起点（雲の左上 45°）まで寄せてよい。
    const nl = lang === 'ja' ? '原子核 (+)' : 'nucleus (+)';
    const cl = lang === 'ja' ? '電子雲 (−)' : 'electron cloud (−)';
    const LPAD = 8, LGAP = 14;
    ctx.font = txt(T.label);
    const cxMin = Math.max(LPAD + ctx.measureText(nl).width + LGAP + cloudR,
                           LPAD + ctx.measureText(cl).width + 6 + cloudR * 0.7071);
    const cxMax = divX - cloudR - 34;                   // μ 矢印ぶんを残す
    // 上限を先に当てる。左半分が狭くて cxMin に届かない幅では中央のまま置き
    // （中央より左に寄せると雲そのものが左端で切れる）、ラベルは凡例に譲る。
    const cxL = Math.max(divX / 2, Math.min(cxMin, cxMax));
    // それでも入らない幅では図中ラベルを描かず、HTML の凡例に戻す（CSS 側の
    // .atom-labels-out）。判定を二重に持たないよう、実測するここだけが決める。
    const labelsFit = cxL >= cxMin - 0.5;
    if (card) card.classList.toggle('atom-labels-out', !labelsFit);
    const pX0 = divX + 14, pX1 = w - 10, pW = pX1 - pX0;

    const E        = Math.sin(TAU * OMEGA * t);
    const aEnv     = mode === 'mod' ? (1 + MOD * Math.sin(TAU * OMEGA_V * t)) : 1;
    const alphaNow = baseAlpha() * aEnv;
    const cloudShift = E * AMP * alphaNow;
    const negY = cy + cloudShift;
    const up = E >= 0, dir = up ? -1 : 1, mag = Math.abs(E);
    const fcol = COL.field;                                   // 上下とも同色（茶）

    muHist.push(cloudShift);
    if (muHist.length > HISTN) muHist.shift();

    // grid
    ctx.strokeStyle = 'rgba(74,64,56,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let gx = (divX % 26); gx <= divX; gx += 26) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h); }
    for (let gy = (cy % 26); gy <= h; gy += 26) { ctx.moveTo(0, gy); ctx.lineTo(divX, gy); }
    ctx.stroke();

    // divider
    ctx.strokeStyle = 'rgba(74,64,56,0.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(divX, 14); ctx.lineTo(divX, h - 14); ctx.stroke();

    // ════════ LEFT: vibrating atom ════════
    for (const x of [cxL - 64, cxL - 22, cxL + 22, cxL + 64]) {
      fieldArrow(ctx, x, 26, dir, 20 * mag, fcol);
      fieldArrow(ctx, x, h - 26, dir, 20 * mag, fcol);
    }
    ctx.strokeStyle = 'rgba(74,64,56,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(18, cy); ctx.lineTo(divX - 16, cy); ctx.stroke(); ctx.setLineDash([]);
    // E(t) ラベルは矢印列の左に置く。狭い幅では矢印列が左端まで来て文字と重なるので、
    // そのときだけ矢印の行を外して一段内側へ下げる（下の α ラベルも同じ扱い）。
    ctx.fillStyle = COL.field; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    const eLab = lang === 'ja' ? '入射電場' : 'incident field';
    ctx.font = txt(T.label); ctx.textAlign = 'left';
    const ew = measureMath(ctx, '*E*(*t*)', T.sym);
    const arrowL = cxL - 64;                            // 矢印列の左端
    const eW = ew + 8 + ctx.measureText(eLab).width;
    const eY = (14 + eW + 8 <= arrowL - 8) ? 26 : 54;
    mathText(ctx, '*E*(*t*)', 14, eY, T.sym, 'left');
    ctx.font = txt(T.label); ctx.fillText(eLab, 14 + ew + 8, eY);
    ctx.textBaseline = 'alphabetic';

    // 電子雲: 中心が濃く外側へ淡く消える青緑の雲 + 二重の等高線（水彩の滲みのように）
    const grd = ctx.createRadialGradient(cxL, negY, 2, cxL, negY, cloudR);
    grd.addColorStop(0,    'rgba(61,107,104,0.34)');
    grd.addColorStop(0.45, 'rgba(61,107,104,0.16)');
    grd.addColorStop(0.8,  'rgba(61,107,104,0.05)');
    grd.addColorStop(1,    'rgba(61,107,104,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cxL, negY, cloudR, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(61,107,104,0.45)'; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.arc(cxL, negY, cloudR, 0, TAU); ctx.stroke();

    charge(ctx, cxL, cy, nucR, COL.nucleus, '+');

    // 図中ラベル（凡例の代わり）。収まらない幅では描かず、凡例に譲る（上の labelsFit）
    if (labelsFit) {
      ctx.font = txt(T.label); ctx.textBaseline = 'middle';
      const leader = (x1, y1, x2, y2, col) => {
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      };
      // 原子核: 雲の左外に右寄せ、核の高さに固定
      const lxN = cxL - cloudR - LGAP;
      ctx.fillStyle = COL.paper; ctx.fillRect(lxN - ctx.measureText(nl).width - 4, cy - 9, ctx.measureText(nl).width + 8, 18);
      leader(lxN + 4, cy, cxL - nucR - 2, cy, 'rgba(181,69,47,0.55)');
      ctx.fillStyle = COL.nucleus; ctx.textAlign = 'right';
      ctx.fillText(nl, lxN, cy);
      // 電子雲: 雲より上なので引き出し線の起点まで右に寄せられる
      const cly = cy - cloudR - 18;
      const ex = cxL - cloudR * 0.7071, ey = negY - cloudR * 0.7071;
      const lxC = ex - 6;
      leader(lxC + 4, cly, ex, ey, 'rgba(61,107,104,0.55)');
      ctx.fillStyle = COL.cloud; ctx.textAlign = 'right';
      ctx.fillText(cl, lxC, cly);
    }

    if (Math.abs(cloudShift) > 4) {
      const sgn = Math.sign(cloudShift), ax = cxL + cloudR + 16;
      ctx.strokeStyle = COL.dipole; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, negY); ctx.lineTo(ax, cy); ctx.stroke();
      ctx.fillStyle = COL.dipole; ctx.beginPath();
      ctx.moveTo(ax - 5, cy + sgn * 9); ctx.lineTo(ax, cy); ctx.lineTo(ax + 5, cy + sgn * 9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = COL.dipole; ctx.textBaseline = 'middle';
      const mw = mathText(ctx, '*μ*', ax + 9, (negY + cy) / 2, T.sym, 'left');
      ctx.fillStyle = COL.mute; ctx.font = txt(T.label); ctx.textAlign = 'left';
      const dl = lang === 'ja' ? '誘起双極子' : 'induced dipole';
      const dx0 = ax + 9 + mw + 8;
      if (dx0 + ctx.measureText(dl).width < divX - 6) ctx.fillText(dl, dx0, (negY + cy) / 2);
      else { ctx.textAlign = 'right'; ctx.fillText(dl, divX - 8, (negY + cy) / 2 + 20); }
    }

    ctx.fillStyle = mode === 'mod' ? COL.vib : COL.mute;
    const aTxt = mode === 'mod' ? (lang === 'ja' ? '変調' : 'modulated') : (lang === 'ja' ? '一定' : 'constant');
    const aSym = mode === 'mod' ? '*α*(*t*)' : '*α*';
    ctx.font = txt(T.label);
    const aW = measureMath(ctx, aSym, T.symSm) + 6 + ctx.measureText(aTxt).width;
    const aY = (14 + aW + 8 <= arrowL - 8) ? h - 16 : h - 54;
    const aw = mathText(ctx, aSym, 14, aY, T.symSm, 'left');
    ctx.font = txt(T.label); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(aTxt, 14 + aw + 6, aY);
    ctx.textBaseline = 'alphabetic';

    // ════════ RIGHT: μ(t) plot ════════
    const muS = (h / 2 - 26) / (AMP * 2.4);
    ctx.save();
    ctx.beginPath(); ctx.rect(pX0, 12, pW, h - 24); ctx.clip();
    ctx.strokeStyle = 'rgba(74,64,56,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let gy = (cy % 24); gy <= h; gy += 24) { ctx.moveTo(pX0, gy); ctx.lineTo(pX1, gy); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(74,64,56,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pX0, cy); ctx.lineTo(pX1, cy); ctx.stroke(); ctx.setLineDash([]);
    const n = muHist.length, dx = pW / (HISTN - 1);
    ctx.strokeStyle = COL.dipole; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = n - 1; i >= 0; i--) {
      const x = pX0 + (n - 1 - i) * dx;
      const y = cy - muHist[i] * muS;
      (i === n - 1) ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COL.dipole;
    mathText(ctx, '*μ*(*t*)', pX0 + 4, 22, T.sym, 'left');

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
  if (!cMol) return;

  const btn    = document.getElementById('btn-play');
  const modeEl = document.getElementById('mode-explanation');

  const CARRIER = 16;
  let t0 = 0;
  let running = true;

  const MODES = {
    sym: {
      raman: true, a0: 0.50, c1: 0.55, c2: 0.06,
      badge: '<span class="mol-activity raman">Raman-active</span>',
      text: '<b>Symmetric stretch</b>: both bonds breathe together, so the equilibrium slope $\\left(\\partial\\alpha/\\partial Q\\right)_0 \\neq 0$.'
    },
    asym: {
      raman: false, a0: 0.30, c1: 0, c2: 0.20,
      badge: '<span class="mol-activity ir">Raman-inactive (IR-active)</span>',
      text: '<b>Asymmetric stretch</b>: the two $\\alpha$ changes cancel, so $\\left(\\partial\\alpha/\\partial Q\\right)_0 = 0$ at equilibrium.'
    },
    bend: {
      raman: false, a0: 0.30, c1: 0, c2: 0.20,
      badge: '<span class="mol-activity ir">Raman-inactive (IR-active)</span>',
      text: '<b>Bend</b>: by symmetry $\\left(\\partial\\alpha/\\partial Q\\right)_0 = 0$ at equilibrium.'
    }
  };
  let mode = 'sym';
  const vib = 3;
  const amp = 0.15;
  const molAmp = 0.7;

  const alphaOfQ = Q => { const M = MODES[mode]; return M.a0 + M.c1 * Q + M.c2 * Q * Q; };
  const Efn = t => Math.cos(TAU * CARRIER * t);
  const Qfn = t => amp * Math.cos(TAU * vib * t);
  const QfnMol = t => molAmp * Math.cos(TAU * vib * t);
  const afn = t => alphaOfQ(Qfn(t));
  const abar  = () => { const M = MODES[mode]; return M.a0 + 0.5 * M.c2 * amp * amp; };
  const fundC = () => Math.abs(MODES[mode].c1) * amp;
  const overC = () => 0.5 * MODES[mode].c2 * amp * amp;
  const pnorm = () => { const M = MODES[mode]; return M.a0 + Math.abs(M.c1) * amp + M.c2 * amp * amp + 1e-6; };
  const pfn   = t => afn(t) * Efn(t) / pnorm();
  const rayFn  = t => Math.cos(TAU * CARRIER * t);
  const stkFn  = t => Math.cos(TAU * (CARRIER - vib) * t);
  const antFn  = t => Math.cos(TAU * (CARRIER + vib) * t);

  drawSpectrum();
  if (btn) btn.addEventListener('click', () => {
    running = !running;
    btn.textContent = running ? 'Pause' : 'Play';
    btn.classList.toggle('active', running);
    if (running) loop();
  });

  function renderMath(el) {
    if (window.renderMathInElement) {
      try { window.renderMathInElement(el, { delimiters: [{ left: '$', right: '$', display: false }] }); } catch (e) {}
    }
  }
  function setMode(m) {
    mode = m;
    modeEl.innerHTML = MODES[m].badge + ' ' + MODES[m].text;
    renderMath(modeEl);
    drawSpectrum();
  }
  document.getElementById('mol-btns').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    document.querySelectorAll('#mol-btns .demo-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    setMode(b.dataset.mode);
  });

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

  // ── CO₂ electron-density cloud（ガウス密度場 → 濃淡 + 等高線） ──
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

  // 紙地に青緑の滲み: 中心へ向かって濃く、縁は淡く溶ける（最大でも半透明）
  function drawHeat(ctx, w, h, dmax) {
    const img = _offctx.createImageData(_GW, _GH);
    const data = img.data;
    for (let i = 0; i < _GW * _GH; i++) {
      const n = Math.min(1, _field[i] / dmax);
      const a = Math.pow(n, 1.4) * 0.42;
      data[i * 4] = 61; data[i * 4 + 1] = 107; data[i * 4 + 2] = 104;
      data[i * 4 + 3] = a * 255;
    }
    _offctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(_off, 0, 0, w, h);
  }

  function drawContour(ctx, w, h, thr, color, lw, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath();
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
    ctx.stroke(); ctx.setLineDash([]);
  }

  function drawMolecule() {
    const { ctx, w, h } = fitCanvas(cMol);
    const tNow = t0 + 1;
    const q = QfnMol(tNow);
    const cx = w / 2, cy = h / 2;
    const gap = Math.min(58, w * 0.21);
    const A = 15;

    let pos, relL, relR;
    if (mode === 'sym') {
      pos = [[cx-(gap+A*q), cy], [cx, cy], [cx+(gap+A*q), cy]];
      relL = relR = q;
    } else if (mode === 'asym') {
      pos = [[cx-(gap+A*q), cy], [cx + A*0.45*q, cy], [cx+(gap-A*q), cy]];
      relL = q; relR = -q;
    } else {
      pos = [[cx-gap, cy - A*q], [cx, cy + A*1.05*q], [cx+gap, cy - A*q]];
      relL = relR = 0;
    }

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
    // 外郭は点線で淡く、内側は実線で少し濃く — 等高線図の趣
    drawContour(ctx, w, h, 0.18 * dmax, 'rgba(61,107,104,0.30)', 1, [3, 4]);
    drawContour(ctx, w, h, 0.36 * dmax, 'rgba(61,107,104,0.50)', 1.1);
    drawContour(ctx, w, h, 0.62 * dmax, 'rgba(61,107,104,0.70)', 1.2);

    // bonds
    ctx.strokeStyle = 'rgba(74,64,56,0.32)'; ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(pos[0][0], pos[0][1]);
    ctx.lineTo(pos[1][0], pos[1][1]);
    ctx.lineTo(pos[2][0], pos[2][1]);
    ctx.stroke();

    // atoms: 平坦な塗り + 生成りの縁（光沢のグラデーションは外す）
    const atoms = [
      { p: pos[0], r: 14, c: COL.oxygen, t: 'O' },
      { p: pos[1], r: 17, c: '#7c766b',  t: 'C' },
      { p: pos[2], r: 14, c: COL.oxygen, t: 'O' }
    ];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const a of atoms) {
      ctx.fillStyle = a.c;
      ctx.beginPath(); ctx.arc(a.p[0], a.p[1], a.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = COL.paper; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = COL.paper; ctx.font = '13px ' + SERIF;
      ctx.fillText(a.t, a.p[0], a.p[1]);
    }

    // label
    ctx.fillStyle = 'rgba(61,107,104,0.75)'; ctx.textBaseline = 'middle';
    const rw = mathText(ctx, '*ρ*', 8, 14, T.symSm, 'left');
    ctx.font = txt(T.label); ctx.textAlign = 'left';
    ctx.fillText(lang2() === 'ja' ? '電子密度（模式図）' : 'electron density (schematic)', 8 + rw + 6, 14);
  }

  // ── α(Q) curve with moving dot ──
  function drawAlphaQ() {
    const { ctx, w, h } = fitCanvas(cAlphaQ);
    const pad = 36, plotW = w - pad * 2, plotH = h - pad * 2;
    const ox = pad, oy = pad;

    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox, oy + plotH); ctx.lineTo(ox + plotW, oy + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy + plotH); ctx.lineTo(ox, oy); ctx.stroke();

    ctx.fillStyle = COL.ink;
    mathText(ctx, '*Q*', ox + plotW + 10, oy + plotH + 12, T.sym, 'center');
    ctx.save(); ctx.translate(ox - 16, oy + plotH / 2); ctx.rotate(-Math.PI / 2);
    mathText(ctx, '*α*', 0, 0, T.sym, 'center'); ctx.restore();

    const qx0 = ox + plotW / 2;
    ctx.strokeStyle = 'rgba(74,64,56,0.15)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(qx0, oy); ctx.lineTo(qx0, oy + plotH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COL.mute;
    mathText(ctx, '0', qx0, oy + plotH + 12, T.tick, 'center');

    const isSym = (mode === 'sym');
    const M = MODES[mode];
    const QX = Q => ox + (Q + 1) / 2 * plotW;
    const AY = a => oy + plotH - a * plotH;

    ctx.fillStyle = 'rgba(61,107,104,0.07)';
    ctx.fillRect(QX(-amp), oy, QX(amp) - QX(-amp), plotH);

    ctx.strokeStyle = COL.vib; ctx.lineWidth = 2.5;
    ctx.beginPath();
    const N = 120;
    for (let i = 0; i <= N; i++) {
      const Q = (i / N) * 2 - 1;
      const px = QX(Q), py = AY(alphaOfQ(Q));
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();

    // tangent at Q=0（橙の破線 / 不活性は灰）
    ctx.strokeStyle = isSym ? 'rgba(217,160,110,0.95)' : 'rgba(143,133,121,0.7)';
    ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(QX(-1), AY(M.a0 + M.c1 * -1));
    ctx.lineTo(QX(1),  AY(M.a0 + M.c1 *  1));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = isSym ? '#c4814a' : COL.mute;
    mathText(ctx, isSym ? '(∂*α*/∂*Q*)~0~ ≠ 0' : '(∂*α*/∂*Q*)~0~ = 0', ox + plotW, h - 12, T.symSm, 'right');

    const tNow = t0 + 1;
    const Q = Qfn(tNow);
    const dotX = QX(Q), dotY = AY(alphaOfQ(Q));
    ctx.fillStyle = '#b5452f';
    ctx.beginPath(); ctx.arc(dotX, dotY, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.paper;
    ctx.beginPath(); ctx.arc(dotX, dotY, 3.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(181,69,47,0.35)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(dotX, dotY); ctx.lineTo(ox, dotY); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── time-domain traces ──
  function drawTraces() {
    let g;
    g = fitCanvas(cField); axis(g.ctx, g.w, g.h);
    plot(g.ctx, g.w, g.h, Efn, COL.field); nowLine(g.ctx, g.w, g.h);

    g = fitCanvas(cAlpha);
    const aTop = 1.0, pad = 6;
    const aY = a => (g.h - pad) - (a / aTop) * (g.h - 2 * pad);
    g.ctx.strokeStyle = COL.axis; g.ctx.lineWidth = 1;
    g.ctx.beginPath(); g.ctx.moveTo(0, aY(0)); g.ctx.lineTo(g.w, aY(0)); g.ctx.stroke();
    g.ctx.strokeStyle = 'rgba(74,64,56,0.22)'; g.ctx.setLineDash([5, 4]);
    g.ctx.beginPath(); g.ctx.moveTo(0, aY(MODES[mode].a0)); g.ctx.lineTo(g.w, aY(MODES[mode].a0)); g.ctx.stroke();
    g.ctx.setLineDash([]);
    g.ctx.fillStyle = COL.mute;
    mathText(g.ctx, '*α*~0~', 4, aY(MODES[mode].a0) - 8, T.symSm, 'left');
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
      g.ctx.fillStyle = COL.mute; g.ctx.textBaseline = 'middle';
      const lg = lang2() === 'ja' ? 'ラマン不活性' : 'Raman-inactive';
      g.ctx.font = txt(T.label); g.ctx.textAlign = 'right';
      g.ctx.fillText(lg, g.w - 6, 12);
      mathText(g.ctx, '*ω*~k~ 変調なし', g.w - 6 - g.ctx.measureText(lg).width - 8, 12, T.symSm, 'right');
    }

    // μ(t) with modulation envelope（橙の破線）
    g = fitCanvas(cDip); axis(g.ctx, g.w, g.h);
    g.ctx.strokeStyle = 'rgba(217,160,110,0.8)'; g.ctx.lineWidth = 1.3;
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

  // ── Decomposition traces ──
  function drawDecomp() {
    const nrm = pnorm();
    const aRay  = abar() / nrm;
    const aFund = 0.5 * fundC() / nrm;

    function plotSmall(cv, fn, color, amplitude) {
      const { ctx, w, h } = fitCanvas(cv);
      ctx.strokeStyle = COL.axis; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
      if (amplitude < 0.004) {
        ctx.fillStyle = 'rgba(154,146,136,0.75)';
        ctx.font = txt(T.tick); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(amplitude < 1e-6 ? (lang2() === 'ja' ? '振幅ゼロ（禁制）' : 'zero — forbidden')
                                      : (lang2() === 'ja' ? '無視できる大きさ' : 'negligible'), w/2, h/2);
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
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    const pad = 28, baseY = h - 22, topY = 14, Hfull = baseY - topY;
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(w - 8, baseY); ctx.stroke();

    const cx2 = w / 2;
    const span = (w / 2 - pad) / 3.4;
    const off1 = Math.min(vib, 3) * span;
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
    ctx.fillStyle = COL.ink;
    mathText(ctx, '*ω*~i~', cx2, baseY + 16, T.symSm, 'center');
    if (fundH >= 1) {
      mathText(ctx, '*ω*~i~ − *ω*~k~', cx2 - off1, baseY + 16, T.symSm, 'center');
      mathText(ctx, '*ω*~i~ + *ω*~k~', cx2 + off1, baseY + 16, T.symSm, 'center');
    }
    ctx.fillStyle = COL.mute;
    const dw = mathText(ctx, '*μ*', 6, topY + 6, T.symSm, 'left');
    ctx.font = txt(T.label); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(lang === 'ja' ? '双極子振幅' : 'dipole amplitude', 6 + dw + 6, topY + 6);
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
  new MutationObserver(drawSpectrum).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
  drawMolecule(); drawAlphaQ(); drawTraces(); drawDecomp();
  loop();
})();


/* ============================================================
   Module 02 — Jablonski diagram (SVG) — このページには無いが色だけ追従
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
      text: 'Rayleigh (elastic): the molecule returns to its original level; the scattered photon has the same energy. Strongest line, but carries no vibrational information.' },
    stokes: { start: Y.v0, end: Y.v1, scattered: COL.stokes,
      text: 'Stokes: the molecule ends in a higher vibrational level (v=1), keeping energy ℏω<sub>v</sub>. The scattered photon is red-shifted.' },
    antistokes: { start: Y.v1, end: Y.v0, scattered: COL.anti,
      text: 'anti-Stokes: the molecule starts at v=1, ends at v=0, giving energy ℏω<sub>v</sub> to the photon. Blue-shifted, and weaker, since few molecules start excited.' }
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
    add('line', { x1, y1: y, x2, y2: y, stroke: dashed ? 'rgba(74,64,56,0.4)' : COL.ink,
      'stroke-width': dashed ? 1.4 : 2.2, 'stroke-dasharray': dashed ? '6 5' : '0' });
    if (label) add('text', { x: x1 - 8, y: y + 4, fill: COL.mute, 'font-size': 12,
      'font-family': SANS, 'text-anchor': 'end' }).textContent = label;
  }
  level(Y.virtual, 70, W - 20, true, 'virtual');
  level(Y.v1, 70, W - 20, false, 'v=1');
  level(Y.v0, 70, W - 20, false, 'v=0');
  add('text', { x: 70, y: 24, fill: COL.mute, 'font-size': 11, 'font-family': SANS }).textContent = 'Energy ↑';
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
   Taylor reminder — sin x（このページには無いが色だけ追従）
   ============================================================ */
(function taylorSin() {
  const cv = document.getElementById('c-taylor-sin');
  if (!cv) return;
  const X0 = -2 * Math.PI, X1 = 2 * Math.PI;
  const YR = 2.4;
  const MAXTERMS = 6;
  function partial(x, terms) {
    let s = 0, term = x;
    for (let k = 0; k < terms; k++) { s += term; term *= -x * x / ((2 * k + 2) * (2 * k + 3)); }
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
  let terms = 0, morph = 0, phase = 'grow', hold = 0;
  function frame() {
    if (cv.offsetWidth === 0) { requestAnimationFrame(frame); return; }
    const { ctx, w, h } = fitCanvas(cv);
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    const cy = h / 2, pad = 14;
    const sx = x => (x - X0) / (X1 - X0) * w;
    const sy = y => cy - (y / YR) * (h / 2 - pad);
    ctx.strokeStyle = 'rgba(74,64,56,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.fillStyle = COL.mute; ctx.font = txt(T.tick); ctx.textAlign = 'center';
    [[-2*Math.PI,'−2π'],[-Math.PI,'−π'],[Math.PI,'π'],[2*Math.PI,'2π']].forEach(([xv,lb]) => {
      ctx.strokeStyle = 'rgba(74,64,56,0.07)';
      ctx.beginPath(); ctx.moveTo(sx(xv), 0); ctx.lineTo(sx(xv), h); ctx.stroke();
      ctx.fillText(lb, sx(xv), cy + 16);
    });
    function curve(fn, color, lw) {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      const N = Math.max(240, w); let pen = false;
      for (let i = 0; i <= N; i++) {
        const x = X0 + (i / N) * (X1 - X0);
        const y = fn(x);
        if (Math.abs(y) > YR * 3) { pen = false; continue; }
        const px = sx(x), py = sy(y);
        pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        pen = true;
      }
      ctx.stroke();
    }
    curve(Math.sin, COL.rayleigh, 2);
    const approx = x => partial(x, terms - 1) * (1 - morph) + partial(x, terms) * morph;
    curve(approx, COL.dipole, 2.6);
    ctx.fillStyle = COL.dipole; ctx.font = 'italic ' + T.symSm + 'px ' + SERIF;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(formula(terms), 12, 10);
    const ord = terms <= 0
      ? (lang === 'ja' ? '0 次（定数項）' : 'order 0 (constant term)')
      : (lang === 'ja' ? '最高次 x' + sup(2 * terms - 1) : 'up to x' + sup(2 * terms - 1));
    ctx.fillStyle = COL.mute; ctx.font = txt(T.label);
    ctx.fillText(ord, 12, 30);
    ctx.fillStyle = COL.rayleigh; ctx.font = 'italic ' + T.symSm + 'px ' + SERIF;
    ctx.textAlign = 'right'; ctx.fillText('sin x', w - 12, 10);
    if (phase === 'grow') {
      morph += 0.02;
      if (morph >= 1) { morph = 1; phase = 'hold'; hold = 0; }
    } else {
      if (++hold > 55) { terms = terms >= MAXTERMS ? 0 : terms + 1; morph = 0; phase = 'grow'; }
    }
    requestAnimationFrame(frame);
  }
  frame();
})();
