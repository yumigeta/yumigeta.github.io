/* ============================================================
   Interactive Raman spectroscopy demo — vanilla JS, no deps.
   和紙パレット版: 色・書体・電子雲の描画のみ変更。構造・配置・内容は原版のまま。
   ============================================================ */

const TAU = Math.PI * 2;
const COL = {
  field:     '#9a9288',                 // 入射電場 E — 背景側の暖灰
  fieldTrace:'#a67c52',                 // 周波数パネルの E(t) — 暖色
  vib:       '#3d6b68',                 // 分極率 α — canonical 和紙 palette の青緑
  dipole:    '#d08a3c',                 // 誘起双極子 μ — 琥珀（橙）
  rayleigh:  '#8f8579',                 // 灰
  stokes:    '#b5452f',                 // 赤
  anti:      '#3d6b68',                 // 青緑
  axis:      'rgba(74,64,56,0.22)',
  now:       'rgba(208,138,60,0.48)',
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
const SERIF = "KaTeX_Main, Georgia, 'Times New Roman', 'Shippori Mincho', serif";
const MATH_ITALIC = "KaTeX_Math, 'Times New Roman', serif";

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
  return (tk.it ? 'italic ' + px + 'px ' + MATH_ITALIC : px + 'px ' + SERIF);
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


/* R01 uses the existing Canvas typography and SVG axis/grid components.
   Canvas geometry is in CSS pixels; no viewBox font-size compensation is needed. */
const PanelType = window.LearnPanelCanvas;
function panelMath(ctx, s, x, y, sizeRole, align) {
  const runs = tokenize(s).map(tk => ({
    text: tk.t,
    role: tk.it || (tk.sub && tk.t === 'k') ? 'variable' : 'math',
    script: tk.sub, sub: tk.sub
  }));
  return PanelType.draw(ctx, x, y, runs, { sizeRole: sizeRole || 'label', align: align || 'left', baseline: 'middle', weight: '400', color: COL.ink });
}
function panelLabel(ctx, text, x, y, options) {
  return PanelType.draw(ctx, x, y, text, Object.assign({ sizeRole: 'label', weight: '400', baseline: 'middle', color: COL.ink }, options));
}
function panelPlot(canvas, g, options) {
  const o = options || {}, ctx = g.ctx;
  const left = o.left == null ? (o.yMath || o.yLabel ? 50 : 30) : o.left, right = o.right == null ? g.w - 10 : o.right;
  const top = o.top == null ? 24 : o.top, bottom = o.bottom == null ? g.h - 39 : o.bottom;
  const zero = o.zero == null ? (top + bottom) / 2 : o.zero;
  const box = { left, right, top, bottom, zero, width: right - left, height: bottom - top };
  let layer = canvas.parentElement.querySelector(':scope > .r01-axis-layer');
  if (!layer) {
    layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    layer.setAttribute('class', 'learn-panel-plot learn-panel-unframed r01-axis-layer');
    layer.setAttribute('aria-hidden', 'true');
    canvas.parentElement.prepend(layer);
  }
  layer.style.left=canvas.offsetLeft+'px';layer.style.top=canvas.offsetTop+'px';layer.style.width=canvas.getBoundingClientRect().width+'px';layer.style.height=canvas.getBoundingClientRect().height+'px';
  const key = [g.w,g.h,left,right,top,bottom,zero].join(',');
  if (layer.dataset.geometry !== key) {
    layer.dataset.geometry = key;
    layer.setAttribute('viewBox', '0 0 '+g.w+' '+g.h);
    let lines = '';
    for (const r of [.25,.5,.75]) {
      const x=left+r*box.width, y=top+r*box.height;
      lines += '<path class="learn-panel-grid" d="M'+x+','+top+'V'+bottom+' M'+left+','+y+'H'+right+'"/>';
      lines += '<path class="learn-panel-axis" d="M'+x+','+bottom+'v4"/>';
    }
    lines += '<path class="learn-panel-axis" stroke-dasharray="4 4" d="M'+left+','+zero+'H'+right+'"/>';
    layer.innerHTML = lines+'<rect class="learn-panel-axis" x="'+left+'" y="'+top+'" width="'+box.width+'" height="'+box.height+'"/>';
  }
  // Y-axis titles use the site's left-side, centered, -90deg placement.
  // Figure headings and alpha0 reference labels keep their separate roles.
  if (o.yMath || o.yLabel) {
    ctx.save();
    ctx.translate(left-30,(top+bottom)/2);
    ctx.rotate(-Math.PI/2);
    if (o.yMath) panelMath(ctx,o.yMath,0,0,'label','center');
    if (o.yLabel) {
      const lines=o.yLabel.split('\n');
      lines.forEach((line,i)=>panelLabel(ctx,line,0,lines.length===1?0:(i===0?-6:10),{align:'center'}));
    }
    ctx.restore();
  }
  panelLabel(ctx,'0',left-6,zero,{sizeRole:'tick',align:'right'});
  if(o.xAxis !== false) {
  const xLabel = o.frequency ? (lang2()==='ja'?'角振動数 ':'Angular frequency ') : (lang2()==='ja'?'時間 ':'Time ');
  const variable = o.frequency ? '*ω*' : '*t*';
  ctx.font=PanelType.font(ctx,'label',{sizeRole:'label',weight:'400'});
  const nameWidth=ctx.measureText(xLabel).width;
  ctx.font=PanelType.font(ctx,'variable',{sizeRole:'label',weight:'400'});
  const mathWidth=ctx.measureText(variable.replaceAll('*','')).width;
  const x=(left+right-nameWidth-mathWidth)/2;
  panelLabel(ctx,xLabel,x,g.h-10);
  panelMath(ctx,variable,x+nameWidth,g.h-10,'label');
  }
  return box;
}
function panelCurve(g, box, fn, color, tStart, options) {
  const o=options||{},ctx=g.ctx;
  const N=o.segments==null?Math.max(180,Math.ceil(box.width)):Math.max(180,Math.ceil(box.width),Math.ceil(o.segments));
  const y=o.y || (v=>box.zero-v*(box.height/2-5));
  ctx.save();ctx.beginPath();ctx.rect(box.left,box.top,box.width,box.height);ctx.clip();
  ctx.strokeStyle=color;ctx.lineWidth=o.width||2;ctx.beginPath();
  for(let i=0;i<=N;i++){
    const x=box.left+i/N*box.width,py=y(fn(tStart+i/N));
    i?ctx.lineTo(x,py):ctx.moveTo(x,py);
  }
  ctx.stroke();
  if(o.dot!==false){ctx.fillStyle=color;ctx.beginPath();ctx.arc(box.right,y(fn(tStart+1)),2.7,0,TAU);ctx.fill();}
  ctx.restore();
}

/* ============================================================
   Interactive panel — E(t), α, and μ(t)
   ============================================================ */
(function atomModule() {
  const cv = document.getElementById('c-atom');
  if (!cv) return;

  const OMEGA   = 2.6;
  const OMEGA_V = 0.42;
  const AMP     = 22;
  const FIELD_ARROW_LENGTH = 22;
  const FIELD_MAX_OPACITY = 0.32;

  const slider   = document.getElementById('ctrl-alpha');
  const out      = document.getElementById('v-alpha');
  const sliderK  = document.getElementById('ctrl-alpha-k');
  const outK     = document.getElementById('v-alpha-k');
  const modeBtns = document.getElementById('atom-mode');
  let mode = 'const';
  const baseAlpha = () => slider ? parseFloat(slider.value) : 1.0;
  const modAlpha = () => sliderK ? parseFloat(sliderK.value) : 0.30;
  function resetTrace() { muHist.length = 0; t = 0; }
  function syncOut() { if (out) out.textContent = baseAlpha().toFixed(2); }
  function syncOutK() { if (outK) outK.textContent = modAlpha().toFixed(2); }
  if (slider) {
    slider.addEventListener('input', () => { syncOut(); resetTrace(); });
    syncOut();
  }
  if (sliderK) {
    sliderK.addEventListener('input', () => { syncOutK(); resetTrace(); });
    syncOutK();
  }
  if (modeBtns) modeBtns.addEventListener('click', e => {
    const b = e.target.closest('[data-amode]'); if (!b) return;
    mode = b.dataset.amode;
    if (sliderK) sliderK.disabled = mode !== 'mod';
    resetTrace();
    modeBtns.querySelectorAll('.demo-btn').forEach(x => {
      const active = x === b;
      x.classList.toggle('active', active);
      x.setAttribute('aria-pressed', String(active));
    });
  });

  // 電荷: 影(glow)を外し、紙地に馴染む平坦な円 + 生成りの縁
  function charge(ctx, x, y, r, fill, glyph) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = COL.paper;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    PanelType.draw(ctx,x,y,[{text:glyph,role:'math'}],{sizeRole:'symbol',align:'center',baseline:'middle',weight:'400',color:COL.paper});
  }
  // The shaft always occupies the same fixed segment. Only its arrowhead and
  // opacity change, so the field fades to zero and reappears in reverse.
  function fieldArrow(ctx, x, y, dir, len, col, opacity) {
    const half = len / 2;
    const tip = y + dir * half;
    const tail = y - dir * half;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, tail); ctx.lineTo(x, tip); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 3.5, tip - dir * 5.5); ctx.lineTo(x, tip); ctx.lineTo(x + 3.5, tip - dir * 5.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  let t = 0;
  const muHist = [];
  const HISTN = 560;
  function frame() {
    if (cv.offsetWidth === 0) { requestAnimationFrame(frame); return; }
    const { ctx, w, h } = fitCanvas(cv);
    const compact = PanelType.compact(cv);
    const diagramHeight = compact ? 210 : h;
    const cy = diagramHeight / 2;
    const divX = compact ? w : Math.round(w * 0.46);
    const cloudR = Math.max(34, Math.min(54, divX * 0.31));
    const nucR = w < 420 ? 12 : 14;
    const cxL = divX * 0.48;
    const plotX0 = compact ? 50 : divX + 50, plotX1 = w - 10;
    const plotW = plotX1 - plotX0;
    const plotTop = compact ? 250 : 42, plotBottom = h - 39;
    const plotZero = (plotTop + plotBottom) / 2;
    panelPlot(cv,{ctx,w,h},{left:plotX0,right:plotX1,top:plotTop,bottom:plotBottom,yMath:'*μ*(*t*)'});

    const E        = Math.sin(TAU * OMEGA * t);
    const alphaNow = baseAlpha() + (mode === 'mod' ? modAlpha() * Math.cos(TAU * OMEGA_V * t) : 0);
    const cloudShift = E * AMP * alphaNow;
    const negY = cy + cloudShift;
    const dir = E >= 0 ? -1 : 1;
    const mag = Math.abs(E);
    const fieldOpacity = mag * FIELD_MAX_OPACITY;

    muHist.push(cloudShift);
    if (muHist.length > HISTN) muHist.shift();

    // The grid stays quieter than both the field and the atom.
    ctx.strokeStyle = 'rgba(74,64,56,0.012)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let gx = (divX % 26); gx <= divX; gx += 26) { ctx.moveTo(gx, 0); ctx.lineTo(gx, diagramHeight); }
    for (let gy = (cy % 26); gy <= diagramHeight; gy += 26) { ctx.moveTo(0, gy); ctx.lineTo(divX, gy); }
    ctx.stroke();

    // divider
    ctx.strokeStyle = 'rgba(74,64,56,0.07)'; ctx.lineWidth = 1;
    ctx.beginPath(); compact ? ctx.moveTo(12, diagramHeight+10) : ctx.moveTo(divX,24);
    compact ? ctx.lineTo(w-12,diagramHeight+10) : ctx.lineTo(divX,h-24); ctx.stroke();

    // ════════ LEFT: fixed field lattice behind the vibrating atom ════════
    const fieldXs = [];
    const fieldCols = w < 420 ? 4 : 5;
    for (let i = 0; i < fieldCols; i++) fieldXs.push(20 + i * (divX - 40) / (fieldCols - 1));
    const fieldYs = [54, cy, diagramHeight - 54];
    for (const x of fieldXs) {
      for (const y of fieldYs) fieldArrow(ctx, x, y, dir, FIELD_ARROW_LENGTH, COL.field, fieldOpacity);
    }
    // A symbol is enough; the arrow lattice carries the visual explanation.
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = COL.ink;
    panelMath(ctx, '*E*(*t*)', 12, 20, 'symbol', 'left');
    ctx.restore();

    // 電子雲: 中心が濃く外側へ淡く消える青緑の雲 + 二重の等高線（水彩の滲みのように）
    const grd = ctx.createRadialGradient(cxL, negY, 2, cxL, negY, cloudR);
    grd.addColorStop(0,    'rgba(61,107,104,0.34)');
    grd.addColorStop(0.45, 'rgba(61,107,104,0.16)');
    grd.addColorStop(0.8,  'rgba(61,107,104,0.05)');
    grd.addColorStop(1,    'rgba(61,107,104,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cxL, negY, cloudR, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(61,107,104,0.45)'; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.arc(cxL, negY, cloudR, 0, TAU); ctx.stroke();

    // Charge signs replace prose labels and keep the atom as the visual focus.
    charge(ctx, cxL, cy, nucR, COL.nucleus, '+');
    // When both centres overlap, the nucleus naturally occludes the cloud marker.
    // As soon as they separate, draw the minus at the cloud's exact centre.
    if (Math.abs(cloudShift) > nucR * 0.8) {
      ctx.fillStyle = COL.paper;
      PanelType.draw(ctx,cxL,negY,[{text:'−',role:'math'}],{sizeRole:'symbol',align:'center',baseline:'middle',weight:'700',color:COL.paper});
    }

    if (Math.abs(cloudShift) > 2) {
      const sgn = Math.sign(cloudShift), ax = cxL + cloudR + 16;
      const headBaseY = cy + sgn * 7;
      ctx.strokeStyle = COL.dipole; ctx.lineWidth = 2.6;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, negY);
      ctx.lineTo(ax, cy);
      ctx.moveTo(ax - 4.5, headBaseY);
      ctx.lineTo(ax, cy);
      ctx.lineTo(ax + 4.5, headBaseY);
      ctx.stroke();
      ctx.fillStyle = COL.ink; ctx.textBaseline = 'middle';
      const muLabelY = Math.max(20, Math.min(negY, cy) - 13);
      panelMath(ctx, '*μ*', ax, muLabelY, 'symbol', 'center');
    }

    // ════════ RIGHT: μ(t) plot ════════
    const muS = (Math.min(plotZero - plotTop, plotBottom - plotZero) - 8) / (AMP * 2.4);
    ctx.save();
    ctx.beginPath(); ctx.rect(plotX0, plotTop, plotW, plotBottom - plotTop); ctx.clip();
    const n = muHist.length, dx = plotW / (HISTN - 1);
    ctx.strokeStyle = COL.dipole; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath();
    const traceStart = plotX1 - (n - 1) * dx;
    for (let i = 0; i < n; i++) {
      const x = traceStart + i * dx;
      const y = plotZero - muHist[i] * muS;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // The atom at left is the instantaneous state at this cursor.
    const nowX = plotX1;
    const nowY = plotZero - muHist[n - 1] * muS;
    ctx.strokeStyle = COL.now; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(nowX, plotTop); ctx.lineTo(nowX, plotBottom); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COL.paper; ctx.beginPath(); ctx.arc(nowX, nowY, 4.6, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.dipole; ctx.beginPath(); ctx.arc(nowX, nowY, 3.1, 0, TAU); ctx.fill();
    ctx.restore();


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
  const cSum    = document.getElementById('c-spectrum');
  const cDecRay = document.getElementById('c-dec-ray');
  const cDecStk = document.getElementById('c-dec-stokes');
  const cDecAnt = document.getElementById('c-dec-anti');
  if (!cField) return;

  const btn    = document.getElementById('btn-play');
  const modeEl = document.getElementById('mode-explanation');

  const CARRIER = 16;
  let t0 = 0;
  let running = true;
  const alpha0Ctrl = document.getElementById('ctrl-alpha');
  const alphaKCtrl = document.getElementById('ctrl-alpha-k');
  const alpha0 = () => alpha0Ctrl ? parseFloat(alpha0Ctrl.value) : 1.0;
  const alphaK = () => alphaKCtrl ? parseFloat(alphaKCtrl.value) : 0.30;

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
  const afn = t => alpha0() + alphaK() * Math.cos(TAU * vib * t);
  const overC = () => 0.5 * MODES[mode].c2 * amp * amp;
  const pnorm = () => alpha0() + alphaK() + 1e-6;
  const pfn   = t => afn(t) * Efn(t) / pnorm();
  const rayFn = t => Math.cos(TAU * CARRIER * t);
  const stkFn = t => Math.cos(TAU * (CARRIER - vib) * t);
  const antFn = t => Math.cos(TAU * (CARRIER + vib) * t);

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
    if (modeEl) {
      modeEl.innerHTML = MODES[m].badge + ' ' + MODES[m].text;
      renderMath(modeEl);
    }
  }
  const molButtons = document.getElementById('mol-btns');
  if (molButtons) {
    molButtons.addEventListener('click', e => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      document.querySelectorAll('#mol-btns .demo-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      setMode(b.dataset.mode);
    });
  }

  const traceRight = w => w * 0.92;
  function axis(ctx, w, h) {
    ctx.strokeStyle = COL.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(traceRight(w), h / 2); ctx.stroke();
  }
  function nowLine(ctx, w, h) {
    ctx.strokeStyle = COL.now; ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    const x = traceRight(w);
    ctx.beginPath(); ctx.moveTo(x, 5); ctx.lineTo(x, h - 5); ctx.stroke();
    ctx.setLineDash([]);
  }
  function plot(ctx, w, h, fn, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw || 2;
    ctx.beginPath();
    const N = Math.max(180, w);
    const x1 = traceRight(w);
    for (let i = 0; i <= N; i++) {
      const t = t0 + (i / N);
      const y = h / 2 - fn(t) * (h / 2 - 6);
      i ? ctx.lineTo(i / N * x1, y) : ctx.moveTo(0, y);
    }
    ctx.stroke();
    const yNow = h / 2 - fn(t0 + 1) * (h / 2 - 6);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x1, yNow, 2.7, 0, TAU); ctx.fill();
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
    if (!cMol) return;
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
    if (!cAlphaQ) return;
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

    ctx.fillStyle = isSym ? COL.tangent : COL.mute;
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

  // All time views share the same existing one-unit display interval t0..t0+1.
  function drawTraces() {
    const dpr=Math.max(1,window.devicePixelRatio||1);
    // Keep at least 64 steps per fastest cycle and one step per backing pixel.
    const segments=box=>Math.ceil(Math.max(180,box.width*dpr,64*(CARRIER+vib)));
    let g=fitCanvas(cField),b=panelPlot(cField,g,{left:40,right:g.w-8,top:12,bottom:g.h-31,yMath:'*E*~i~(*t*)'});
    panelCurve(g,b,Efn,COL.fieldTrace,t0,{segments:segments(b)});
    g=fitCanvas(cAlpha);
    const top=12,bottom=g.h-31,aTop=1.9;
    const aY=a=>bottom-a/aTop*(bottom-top);
    b=panelPlot(cAlpha,g,{left:40,right:g.w-8,top,bottom,zero:aY(0),yMath:'*α*(*t*)'});
    g.ctx.save();g.ctx.strokeStyle=COL.axis;g.ctx.lineWidth=1;g.ctx.setLineDash([5,4]);
    g.ctx.beginPath();g.ctx.moveTo(b.left,aY(alpha0()));g.ctx.lineTo(b.right,aY(alpha0()));g.ctx.stroke();g.ctx.restore();
    panelMath(g.ctx,'*α*~0~',b.left-6,aY(alpha0()),'label','right');
    panelCurve(g,b,afn,COL.vib,t0,{y:aY,segments:segments(b)});
    g=fitCanvas(cDip);b=panelPlot(cDip,g,{left:40,right:g.w-8,top:12,bottom:g.h-31,yMath:'*μ*(*t*)'});
    g.ctx.save();g.ctx.strokeStyle='rgba(208,138,60,0.28)';g.ctx.lineWidth=.8;g.ctx.setLineDash([3,4]);
    const envelopeSegments=segments(b);
    for(const s of [1,-1]){
      g.ctx.beginPath();
      for(let i=0;i<=envelopeSegments;i++){
        const N=envelopeSegments,t=t0+i/N,env=s*afn(t)/pnorm();
        const x=b.left+i/N*b.width,y=b.zero-env*(b.height/2-5);
        i?g.ctx.lineTo(x,y):g.ctx.moveTo(x,y);
      }
      g.ctx.stroke();
    }
    g.ctx.restore();
    panelCurve(g,b,pfn,COL.dipole,t0,{segments:segments(b)});
    for(const canvas of [cField,cAlpha,cDip]){
      const {ctx,w,h}=fitExistingCanvas(canvas),right=w-8,top=12,bottom=h-31;
      ctx.save();ctx.strokeStyle=COL.now;ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(right,top);ctx.lineTo(right,bottom);ctx.stroke();ctx.restore();
    }
  }
  function fitExistingCanvas(canvas) {
    const rect=canvas.getBoundingClientRect();
    return {ctx:canvas.getContext('2d'),w:Math.max(1,Math.round(rect.width)),h:Math.max(1,Math.round(rect.height))};
  }
  function drawDecomp() {
    const norm=pnorm(),rayAmplitude=alpha0()/norm,sideAmplitude=.5*alphaK()/norm;
    for(const [canvas,fn,color,amplitude] of [
      [cDecRay,rayFn,COL.rayleigh,rayAmplitude],
      [cDecStk,stkFn,COL.stokes,sideAmplitude],
      [cDecAnt,antFn,COL.anti,sideAmplitude]
    ]){
      const g=fitCanvas(canvas);
      const b=panelPlot(canvas,g,{left:18,right:g.w-8,top:10,bottom:g.h-10,xAxis:false});
      panelCurve(g,b,t=>fn(t)*amplitude,color,t0,{dot:false,width:1.5});
    }
  }
  // Schematic frequency spacing and max-amplitude normalization are unchanged.
  function drawSpectrum() {
    const g=fitCanvas(cSum),{ctx,w,h}=g,lang=lang2(),norm=pnorm();
    const top=24,bottom=h-59;
    const b=panelPlot(cSum,g,{
      top,bottom,zero:bottom,frequency:true,
      yLabel:lang==='ja'?'双極子成分振幅':'Dipole component\namplitude'
    });
    const peaks=[
      {x:.18,frequency:'*ω*~i~−*ω*~k~',name:lang==='ja'?'ストークス':'Stokes',color:COL.stokes,amplitude:.5*alphaK()/norm},
      {x:.50,frequency:'*ω*~i~',name:lang==='ja'?'レイリー':'Rayleigh',color:COL.rayleigh,amplitude:alpha0()/norm},
      {x:.82,frequency:'*ω*~i~+*ω*~k~',name:lang==='ja'?'反ストークス':'anti-Stokes',color:COL.anti,amplitude:.5*alphaK()/norm}
    ];
    const maxAmplitude=Math.max(...peaks.map(p=>p.amplitude),1e-6);
    for(const peak of peaks){
      const x=b.left+b.width*peak.x;
      const height=Math.max(5,peak.amplitude/maxAmplitude*(b.height-5)),yTop=bottom-height;
      ctx.strokeStyle=peak.color;ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(x,bottom);ctx.lineTo(x,yTop);ctx.stroke();
      ctx.fillStyle=peak.color;ctx.beginPath();ctx.arc(x,yTop,2.8,0,TAU);ctx.fill();
      panelMath(ctx,peak.frequency,x,bottom+20,'label','center');
    }
  }

  function loop() {
    if (!running) return;
    t0 += 0.004;
    drawMolecule();
    drawAlphaQ();
    drawTraces();
    drawDecomp();
    drawSpectrum();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    drawMolecule(); drawAlphaQ(); drawTraces(); drawDecomp(); drawSpectrum();
  });

  setMode('sym');
  new MutationObserver(() => { drawTraces(); drawDecomp(); drawSpectrum(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
  drawMolecule(); drawAlphaQ(); drawTraces(); drawDecomp(); drawSpectrum();
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
    ctx.fillStyle = COL.ink; ctx.font = 'italic ' + T.symSm + 'px ' + SERIF;
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
