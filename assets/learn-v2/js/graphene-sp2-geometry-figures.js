/* ════════════════════════════════════════════════════════════════════════
   graphene-figures.js — interactive figures for the graphene electronic-
   structure series, in one shared visual language (bright near-white plate,
   muted earth tones, thin axes, serif math labels). Canvas-based, following
   the existing site method. Each figure inits only if its <canvas id> exists.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var PI = Math.PI, sqrt3 = Math.sqrt(3), cos = Math.cos, sin = Math.sin,
      abs = Math.abs, sqrt = Math.sqrt, max = Math.max, min = Math.min, hypot = Math.hypot;

  // ── Figure palette: read ONCE from the shared CSS tokens (the same --color-*
  //    variables the site chrome uses), then derive the muted 蘇芳 family. No figure
  //    invents its own colour; change a token and every figure follows suit. ──
  var P = (function () {
    function cv(n, f) { try { var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || f; } catch (e) { return f; } }
    function toRGB(s) {
      s = (s || '').trim();
      if (s.charAt(0) === '#') { if (s.length === 4) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]; return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)]; }
      var m = s.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/); return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
    }
    function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
    function tint(a, t) { return mix(a, [255, 255, 255], t); }
    function s(a) { return 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')'; }
    function sa(a, al) { return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + al + ')'; }
    var suo = toRGB(cv('--color-accent-suo', '#bf2f25')),
        teal = toRGB(cv('--color-teal', '#3e6f6b')),
        sage = toRGB(cv('--color-sage', '#708a5c')),
        terra = toRGB(cv('--color-terracotta', '#b27a4d')),
        neut = toRGB(cv('--color-neutral', '#8a7d70')),
        text = toRGB(cv('--color-text', '#1e1913'));
    var suoF = mix(suo, neut, 0.24);                 // muted 蘇芳 for fills/marks (large areas stay restrained)
    return {
      rgb: s, rgba: sa, mix: mix, tint: tint,
      suo: suoF, teal: teal, sage: sage, terra: terra, neut: neut,
      ink: s(text), ink2: s(mix(text, neut, 0.5)), ink3: s(tint(neut, 0.18)),
      axis: s(neut), grid: sa(neut, 0.42), structure: sa(neut, 0.6), bond: s(mix(neut, text, 0.45)),
      curve: s(suoF), aSite: s(suoF), bSite: s(sage),
      kK: s(suoF), kKp: s(teal),
      up0: tint(suoF, 0.66), up1: suoF,              // upper band: WARM 蘇芳 (pale rose to muted 蘇芳)
      lo0: tint(teal, 0.66), lo1: teal,              // lower band: COOL teal (pale to muted teal)
      basis: s(terra), opArrow: s(teal), eLine: s(terra), plate: toRGB(cv('--color-plate', '#fdfcf9'))
    };
  })();
  var SERIF = 'Georgia, "Times New Roman", serif', MINCHO = '"Shippori Mincho", serif';
  var SANS = '"Zen Kaku Gothic New", sans-serif';
  var panelType = globalThis.LearnPanelCanvas;
  var grapheneLesson = !!document.querySelector('.learn-panel');
  function curLang() { return document.documentElement.getAttribute('data-lang') === 'ja' ? 'ja' : 'en'; }
  var langCbs = [];
  function onLang(cb) { langCbs.push(cb); }
  (function () { if (!window.MutationObserver) return;
    new MutationObserver(function () { langCbs.forEach(function (c) { c(); }); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] }); })();

  function dpr(canvas, cssH, maxR) {
    var r = window.devicePixelRatio || 1; maxR = maxR || 2; if (r > maxR) r = maxR;
    var w = Math.round(canvas.getBoundingClientRect().width) || 560;
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(w * r); canvas.height = Math.round(cssH * r);
    var ctx = canvas.getContext('2d'); ctx.setTransform(r, 0, 0, r, 0, 0);
    return { ctx: ctx, w: w, h: cssH };
  }
  function ground(ctx, w, h) { ctx.clearRect(0, 0, w, h); }   /* transparent — the CSS plate shows */

  function arrow(ctx, x0, y0, x1, y1, col, lw, head) {
    col = col || P.axis; lw = lw || 1.3; head = head || 7;
    var dx = x1 - x0, dy = y1 - y0, len = hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * head + uy * head * 0.52, y1 - uy * head - ux * head * 0.52);
    ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * head - uy * head * 0.52, y1 - uy * head + ux * head * 0.52);
    ctx.stroke();
  }
  function ahead(ctx, x, y, ux, uy, s) { s = s || 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ux * s + uy * s * 0.5, y - uy * s - ux * s * 0.5);
    ctx.moveTo(x, y); ctx.lineTo(x - ux * s - uy * s * 0.5, y - uy * s + ux * s * 0.5); ctx.stroke();
  }
  // arrow whose head stops `gap` px short of the end point (so it doesn't bury in a dot)
  function arrowShort(ctx, x0, y0, x1, y1, gap, col, lw, head) {
    var dx = x1 - x0, dy = y1 - y0, len = hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    arrow(ctx, x0, y0, x1 - ux * gap, y1 - uy * gap, col, lw, head);
  }
  function mvar(ctx, x, y, main, opt) {
    if (panelType) { opt = opt || {}; return panelType.draw(ctx, x, y, g01VariableRuns(main, opt.sub, opt.subRole), opt); }
    opt = opt || {}; var size = opt.size || 15, color = opt.color || P.ink, align = opt.align || 'left', w = opt.weight || 500;
    ctx.textBaseline = opt.baseline || 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = 'italic ' + w + ' ' + size + 'px ' + SERIF;
    var wMain = ctx.measureText(main).width, subSize = size * 0.7, wSub = 0;
    if (opt.sub != null) { ctx.font = (grapheneLesson && /^\d+$/.test(opt.sub) ? '' : 'italic ') + w + ' ' + subSize + 'px ' + (grapheneLesson && /^\d+$/.test(opt.sub) ? SANS : SERIF); wSub = ctx.measureText(opt.sub).width; }
    var total = wMain + wSub, sx = x; if (align === 'center') sx = x - total / 2; else if (align === 'right') sx = x - total;
    ctx.fillStyle = color; ctx.font = 'italic ' + w + ' ' + size + 'px ' + SERIF; ctx.fillText(main, sx, y);
    if (opt.sub != null) { ctx.font = (grapheneLesson && /^\d+$/.test(opt.sub) ? '' : 'italic ') + w + ' ' + subSize + 'px ' + (grapheneLesson && /^\d+$/.test(opt.sub) ? SANS : SERIF); ctx.fillText(opt.sub, sx + wMain + 0.5, y + size * 0.19); }
    return total;
  }
  function txt(ctx, x, y, s, opt) {
    opt = opt || {};
    if (panelType) {
      var compound=g01Compound(s); if(compound) return panelType.draw(ctx,x,y,compound,opt);
      if(/^(A′?|B)$/.test(s)) opt.role="identifier";
      var role = opt.role || (/^(K′?|Γ|M)$/.test(s) ? 'point' : opt.italic || /^[a-zα-ω][₀-₉]*$/.test(String(s)) ? 'variable' : /^[-−+]?\d/.test(s) ? 'number' : 'label');
      if (s === 'E/t') return panelType.draw(ctx, x, y, [{ text: 'E', role: 'variable' }, { text: '/', role: 'math' }, { text: 't', role: 'variable' }], opt);
      if (/^π\*?  E[₊₋]$/.test(s)) return panelType.draw(ctx, x, y, [{ text: 'π', role: 'math' }].concat(s.includes('*') ? [{ text: '*', role: 'math', sup: true, script: true }] : []).concat([{ text: '  ', role: 'label' }, { text: 'E', role: 'variable' }, { text: s.endsWith('₊') ? '+' : '−', role: 'math', sub: true, script: true }]), opt);
      return panelType.draw(ctx, x, y, s, Object.assign({}, opt, { role: role }));
    }
    ctx.font = opt.font || ((opt.italic ? 'italic ' : '') + (opt.weight || 500) + ' ' + (opt.size || 13) + 'px ' + SERIF);
    if (grapheneLesson) { var variable = /^[a-zα-ω][₀-₉]*$/.test(String(s)); ctx.font = (variable ? 'italic ' : '') + (opt.weight || 500) + ' ' + (opt.size || 13) + 'px ' + (variable ? SERIF : SANS); }
    ctx.fillStyle = opt.color || P.ink2; ctx.textAlign = opt.align || 'left'; ctx.textBaseline = opt.baseline || 'alphabetic';
    ctx.fillText(s, x, y);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
  // slider value readout (row-end, robust at any value)
  function bindBubble(input, out, fmt) {
    function upd() { out.textContent = fmt(+input.value); }
    input.addEventListener('input', upd); upd(); return upd;
  }



  function g01Reduced(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  function g01VariableRuns(main,index,indexRole){
    var minus=main.charAt(0)==='−',base=minus?main.slice(1):main;
    var vector=/^(δ|a|b|R|G)$/.test(base)&&!(/^[xy]$/.test(String(index))&&base==='G');
    return (minus?[{text:'−',role:'math'}]:[]).concat(panelType.variable(base,index,vector,indexRole));
  }
  function g01Compound(s){
    if(s==='R + a₁'||s==='R + a₂')return g01VariableRuns('R').concat([{text:' + ',role:'math'}],g01VariableRuns('a',s.endsWith('₁')?'1':'2'));
    var m=/^([+−])b([₁₂])$/.exec(String(s));return m?[{text:m[1],role:'math'}].concat(g01VariableRuns('b',m[2]==='₁'?'1':'2')):null;
  }
  function g01VectorHTML(name,index){return '<span class="rp-notation rp-variable rp-vector">'+name+'</span>'+(index==null?'':'<span class="rp-notation rp-sub rp-roman">'+index+'</span>');}
  function g01Bi(ja,en){return '<span class="i18n-ja">'+ja+'</span><span class="i18n-en">'+en+'</span>';}

  (function () {
    var canvas = document.getElementById('fig-nnvec'); if (!canvas) return;
    var hint = document.getElementById('nn-hint');
    var ids = ['nn-all', 'nn-d1', 'nn-d2', 'nn-d3', 'nn-a1', 'nn-a2'];
    var el = ids.map(function (id) { return document.getElementById(id); });
    var sel = 0, anim = 1, raf = null;
    var lengthHint='120° · |'+g01VectorHTML('δ')+'| = <span class="rp-notation rp-variable">a</span>';
    var HINTS = [[lengthHint,lengthHint],["",""],["",""],["",""],["",""],["",""]];
    function setHint() { if (!hint) return; var h=HINTS[sel],value=h[curLang()==='ja'?1:0];hint.hidden=!value;hint.innerHTML=value?'<span class="i18n-en">'+h[0]+'</span><span class="i18n-ja">'+h[1]+'</span>':''; }
    function setSel(s) {
      sel = s; el.forEach(function (b, i) { if (b) {b.classList.toggle('active', i === s);b.setAttribute('aria-pressed',String(i===s));} });
      setHint(); cancelAnimationFrame(raf);
      if (s >= 4 && !g01Reduced()) { anim = 0; tick(); } else { anim = 1; draw(); }
    }
    function tick() { anim = min(1, anim + 0.013); draw(); if (anim < 1) raf = requestAnimationFrame(tick); }
    el.forEach(function (b, i) { if (b) b.addEventListener('click', function () { setSel(i); }); });

    function draw() {
      var o = dpr(canvas, 320), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      canvas.dataset.selection=String(sel);canvas.dataset.progress=String(anim);
      canvas.setAttribute("aria-label",(curLang()==="ja"?"最近接結合と基本並進：":"Nearest-neighbor and primitive vectors: ")+[curLang()==="ja"?"三方向":"all three","δ1","δ2","δ3","a1=δ1−δ3","a2=δ1−δ2"][sel]);
      var s = 50, cx = W * 0.47, cy = H * 0.5;
      var dlt = [[0, -1], [sqrt3 / 2, 0.5], [-sqrt3 / 2, 0.5]];                                       // δ1 up, δ2 down-right, δ3 down-left (canvas y down)
      var a1 = [dlt[0][0] - dlt[2][0], dlt[0][1] - dlt[2][1]], a2 = [dlt[0][0] - dlt[1][0], dlt[0][1] - dlt[1][1]];   // a1 = δ1 − δ3, a2 = δ1 − δ2
      function P2(vx, vy) { return [cx + vx * s, cy + vy * s]; }
      var As = [];
      for (var m = -2; m <= 2; m++) for (var n = -2; n <= 2; n++) As.push([m * a1[0] + n * a2[0], m * a1[1] + n * a2[1]]);
      ctx.strokeStyle = P.rgba(P.neut, 0.28); ctx.lineWidth = 1.2; ctx.lineCap = 'round';     // faint honeycomb context
      As.forEach(function (A) { dlt.forEach(function (d) { var p0 = P2(A[0], A[1]), p1 = P2(A[0] + d[0], A[1] + d[1]); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }); });
      As.forEach(function (A) { var pA = P2(A[0], A[1]); ctx.fillStyle = P.rgba(P.suo, 0.42); ctx.beginPath(); ctx.arc(pA[0], pA[1], 3.1, 0, 2 * PI); ctx.fill(); var pB = P2(A[0] + dlt[0][0], A[1] + dlt[0][1]); ctx.fillStyle = P.rgba(P.sage, 0.5); ctx.beginPath(); ctx.arc(pB[0], pB[1], 3.1, 0, 2 * PI); ctx.fill(); });
      var pA0 = P2(0, 0);

      if (sel >= 4) {                                                                            // ── path mode: A →(δ1) B →(−δj) A′, sum = a1 or a2
        var j2 = (sel === 4) ? 2 : 1, av = (sel === 4) ? a1 : a2;
        var pB = P2(dlt[0][0], dlt[0][1]), pA2 = P2(av[0], av[1]);
        var f1 = min(1, anim * 2.2), f2 = max(0, min(1, anim * 2.2 - 1)), f3 = max(0, (anim - 0.92) / 0.08);
        dlt.forEach(function (d) { var pB2 = P2(d[0], d[1]); arrowShort(ctx, pA0[0], pA0[1], pB2[0], pB2[1], 8, P.rgba(P.suo, 0.16), 1.3, 7); });   // the other δ, faint
        ctx.fillStyle = P.bSite; ctx.beginPath(); ctx.arc(pB[0], pB[1], 4.6, 0, 2 * PI); ctx.fill();
        ctx.fillStyle = P.aSite; ctx.beginPath(); ctx.arc(pA2[0], pA2[1], 4.6, 0, 2 * PI); ctx.fill();
        if (f1 > 0) arrowShort(ctx, pA0[0], pA0[1], pA0[0] + (pB[0] - pA0[0]) * f1, pA0[1] + (pB[1] - pA0[1]) * f1, f1 >= 1 ? 8 : 0, P.curve, 2.4, 9);
        if (f1 >= 1) mvar(ctx, pA0[0] - 20, (pA0[1] + pB[1]) / 2 + 4, 'δ', { sub: '1', color: P.ink2, size: 14 });
        if (f2 > 0) arrowShort(ctx, pB[0], pB[1], pB[0] + (pA2[0] - pB[0]) * f2, pB[1] + (pA2[1] - pB[1]) * f2, f2 >= 1 ? 8 : 0, P.curve, 2.4, 9);
        if (f2 >= 1) { var mx = (pB[0] + pA2[0]) / 2, my = (pB[1] + pA2[1]) / 2; mvar(ctx, mx + (sel === 4 ? -36 : 8), my - 6, '−δ', { sub: String(j2 + 1), color: P.ink2, size: 14 }); }
        if (f3 > 0) {                                                                            // the resultant primitive vector, appearing last
          ctx.globalAlpha = f3;
          arrowShort(ctx, pA0[0], pA0[1], pA2[0], pA2[1], 8, P.basis, 2.2, 9);
          mvar(ctx, (pA0[0] + pA2[0]) / 2 + (sel === 4 ? 10 : -26), (pA0[1] + pA2[1]) / 2 + 6, 'a', { sub: (sel === 4 ? '1' : '2'), color: P.basis, size: 15 });
          ctx.globalAlpha = 1;
        }
        txt(ctx, pA2[0] + (sel === 4 ? 9 : -9), pA2[1] - 7, 'A′', { color: P.ink, italic: true, size: 13, align: sel === 4 ? 'left' : 'right' });
        txt(ctx, pB[0] + 9, pB[1] - 6, 'B', { color: P.ink, italic: true, size: 13 });
        txt(ctx, pA0[0] + 9, pA0[1] + 15, 'A', { color: P.ink, italic: true, size: 13 });
      } else {
        var aOn = (sel === 0);                                                                  // a1,a2 shown when not isolating a single δ
        [[a1, '1'], [a2, '2']].forEach(function (av) {
          var p1 = P2(av[0][0], av[0][1]);
          arrowShort(ctx, pA0[0], pA0[1], p1[0], p1[1], 8, aOn ? P.basis : P.rgba(P.terra, 0.28), 1.7, 8);
          if (aOn) { var axo = av[0][0] > 0 ? 3 : -15; mvar(ctx, pA0[0] + av[0][0] * s * 0.66 + axo, pA0[1] + av[0][1] * s * 0.66 + 4, 'a', { sub: av[1], color: P.basis, size: 14 }); }
        });
        dlt.forEach(function (d, j) {                                                            // the three δ arrows from the central A
          var on = (sel === 0 || sel === j + 1), pB = P2(d[0], d[1]);
          arrowShort(ctx, pA0[0], pA0[1], pB[0], pB[1], 8, on ? P.curve : P.rgba(P.suo, 0.16), on ? 2.4 : 1.3, on ? 9 : 7);
          if (on) { var dxo = d[0] > 0.1 ? 13 : (d[0] < -0.1 ? -26 : -17), dyo = d[1] > 0.1 ? 14 : (d[0] === 0 ? 4 : -7); mvar(ctx, pA0[0] + d[0] * s * 0.6 + dxo, pA0[1] + d[1] * s * 0.6 + dyo, 'δ', { sub: String(j + 1), color: P.ink2, size: 14 }); }
        });
        if (sel >= 2) {                                                                          // rotation arc from δ1 to the chosen δ (∓120°)
          var ang0 = -PI / 2, ang1 = Math.atan2(dlt[sel - 1][1], dlt[sel - 1][0]), ccw = (sel === 3);
          ctx.strokeStyle = P.rgba(P.neut, 0.75); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.arc(pA0[0], pA0[1], 22, ang0, ang1, ccw); ctx.stroke(); ctx.setLineDash([]);
          txt(ctx, pA0[0] + (sel === 2 ? 30 : -30), pA0[1] - 27, (sel === 2 ? '−120°' : '+120°'), { color: P.ink2, size: 12, align: (sel === 2 ? 'left' : 'right') });
        }
      }
      ctx.fillStyle = P.aSite; ctx.beginPath(); ctx.arc(pA0[0], pA0[1], 4.6, 0, 2 * PI); ctx.fill();   // central A on top
    }
    window.addEventListener('resize', draw);
    onLang(function(){setHint();draw();});setHint(); draw();
  })();
  (function () {
    var mapCanvas = document.getElementById('fig-recip'); if (!mapCanvas) return;
    var b1 = [2 * PI / sqrt3, 2 * PI / 3], b2 = [-2 * PI / sqrt3, 2 * PI / 3];
    var presets = [
      {id:'rc-b1', m:1, n:0, g:b1},
      {id:'rc-b2', m:0, n:1, g:b2},
      {id:'rc-double', m:2, n:0, g:b1.map(function (v) { return 2 * v; })},
      {id:'rc-b12', m:1, n:1, g:[0, 4 * PI / 3]}
    ];
    var selected = {m:1, n:0, g:b1.slice()}, mapGeom = null, latticePoints = [];
    var mapStatus = document.getElementById('rc-status');
    function symbolFor(m, n) {
      if (m === 1 && n === 0) return 'G = b₁';
      if (m === 0 && n === 1) return 'G = b₂';
      if (m === 2 && n === 0) return 'G = 2b₁';
      if (m === 1 && n === 1) return 'G = b₁ + b₂';
      return 'G = m′b₁ + n′b₂';
    }
    function updateStatus() {
      if (!mapStatus) return;
      var generic = symbolFor(selected.m, selected.n);
      var prefix = 'm′=' + selected.m + '、n′=' + selected.n + '：';
      var enPrefix = "m'=" + selected.m + ", n'=" + selected.n + ': ';
      var enSymbol = generic.replace('′', "'").replace('b₁', 'b1').replace('b₂', 'b2');
      var b1h=g01VectorHTML('b','1'),b2h=g01VectorHTML('b','2');
      var expression=selected.m===1&&selected.n===0?b1h:selected.m===0&&selected.n===1?b2h:selected.m===2&&selected.n===0?'2'+b1h:selected.m===1&&selected.n===1?b1h+' + '+b2h:'<span class="rp-notation rp-variable">m</span>′'+b1h+' + <span class="rp-notation rp-variable">n</span>′'+b2h;
      mapStatus.innerHTML='<span class="rp-notation rp-variable">m</span>′='+selected.m+'　<span class="rp-notation rp-variable">n</span>′='+selected.n+'：'+g01VectorHTML('G')+' = '+expression;
      mapCanvas.dataset.m=String(selected.m);mapCanvas.dataset.n=String(selected.n);mapCanvas.dataset.gx=String(selected.g[0]);mapCanvas.dataset.gy=String(selected.g[1]);
      mapCanvas.setAttribute('aria-label',(curLang()==='ja'?'逆格子点選択：':'Reciprocal-point selection: ')+"m'="+selected.m+", n'="+selected.n);
    }
    function drawMap() {
      var o = dpr(mapCanvas, 380), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      var cx = W * 0.5, cy = H * 0.53, radius = min(W * 0.38, H * 0.37), scale = radius / (3.7 * (4 * PI / 3));
      mapGeom = {cx:cx, cy:cy, scale:scale, radius:radius}; latticePoints = [];
      var ja = curLang() === 'ja';
      arrow(ctx, cx - radius, cy, cx + radius, cy, P.grid, 1, 5);
      arrow(ctx, cx, cy + radius, cx, cy - radius, P.grid, 1, 5);
      mvar(ctx, cx + radius + 6, cy, 'G', { sub: 'x', subRole: 'variable', color: P.ink2, sizeRole: 'label', baseline: 'middle' });
      mvar(ctx, cx, cy - radius - 8, 'G', { sub: 'y', subRole: 'variable', color: P.ink2, sizeRole: 'label', align: 'center', baseline: 'bottom' });
      txt(ctx, cx - 8, cy + 14, '0', {sizeRole:'tick', align:'right'});
      for (var m = -4; m <= 4; m++) for (var n = -4; n <= 4; n++) {
        var g = [m * b1[0] + n * b2[0], m * b1[1] + n * b2[1]];
        var x = cx + g[0] * scale, y = cy - g[1] * scale;
        if (abs(x - cx) > radius || abs(y - cy) > radius) continue;
        latticePoints.push({m:m, n:n, g:g, x:x, y:y});
        ctx.fillStyle = P.rgba(P.neut, 0.72); ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * PI); ctx.fill();
      }
      [b1, b2].forEach(function (b, i) {
        var x = cx + b[0] * scale, y = cy - b[1] * scale;
        arrowShort(ctx, cx, cy, x, y, 5, P.basis, 1.6, 7);
        mvar(ctx, x + (i ? -15 : 8), y + 15, 'b', {sub:String(i + 1), color:P.basis, size:14});
      });
      var sx = cx + selected.g[0] * scale, sy = cy - selected.g[1] * scale;
      arrowShort(ctx, cx, cy, sx, sy, 6, P.curve, 2.5, 8);
      ctx.fillStyle = P.rgb(P.plate); ctx.beginPath(); ctx.arc(sx, sy, 7, 0, 2 * PI); ctx.fill();
      ctx.strokeStyle = P.curve; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 2 * PI); ctx.stroke();
      ctx.fillStyle = P.curve; ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, 2 * PI); ctx.fill();
      presets.forEach(function (p) {
        var button = document.getElementById(p.id);
        if (button) {var active=selected.m===p.m&&selected.n===p.n;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
      });
      updateStatus();
    }
    function choose(point) { selected = {m:point.m, n:point.n, g:point.g.slice()}; drawMap(); }
    presets.forEach(function (p) {
      var button = document.getElementById(p.id); if (!button) return;
      button.addEventListener('click', function () { choose(p); });
    });
    mapCanvas.setAttribute('aria-describedby', 'rc-status');
    mapCanvas.addEventListener('click', function (event) {
      var rect = mapCanvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
      if (!mapGeom) return;
      var nearest = null, distance = 12;
      latticePoints.forEach(function (point) { var d = hypot(x - point.x, y - point.y); if (d < distance) { distance = d; nearest = point; } });
      if (nearest) choose(nearest);
    });
    window.addEventListener('resize', drawMap); onLang(drawMap); drawMap();
  })();
  function initBrillouinFigure(canvasId, cornersOnly) {
    var canvas = document.getElementById(canvasId); if (!canvas) return;

    var realCanvas = cornersOnly ? null : document.getElementById('fig-bz-real');
    var pair;
    if (realCanvas) {
      var brown = P.mix(P.terra, [0, 0, 0], 0.42);
      var gray = Math.round(0.2126 * P.neut[0] + 0.7152 * P.neut[1] + 0.0722 * P.neut[2]);
      pair = { red: P.rgb(P.mix(P.suo, [0, 0, 0], 0.16)), axis: P.rgb([gray, gray, gray]),
        reciprocal: P.rgb(brown) };
    }

    function drawRealSpace(height, ja) {
      var o = dpr(realCanvas, height), ctx = o.ctx, W = o.w, H = o.h;
      var cx = W * 0.5, cy = H * 0.5, S = max(1, min(W - 44, H - 44) / 4.6);
      var a1 = [0.5, sqrt3 / 2], a2 = [-0.5, sqrt3 / 2];
      var d1 = [0, 1 / sqrt3], d2 = [0.5, -1 / (2 * sqrt3)], d3 = [-0.5, -1 / (2 * sqrt3)];
      var origin = [cx, cy], span = Math.ceil((cx + cy / sqrt3) / S) + 2;
      function xy(p) { return [cx + S * p[0], cy - S * p[1]]; }
      function plus(p, q) { return [p[0] + q[0], p[1] + q[1]]; }
      function fade(p) {
        var r = hypot((p[0] - cx) / (cx - 8), (p[1] - cy) / (cy - 8));
        var t = max(0, min(1, (1 - r) / 0.47));
        return t * t * (3 - 2 * t);
      }
      function isOrigin(p) { return hypot(p[0] - cx, p[1] - cy) < 1e-6; }
      function radius(p) { return isOrigin(p) ? 4.6 : 3; }
      function dot(p, r, color) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * PI); ctx.fill();
      }
      function bond(p, q) {
        var dx = q[0] - p[0], dy = q[1] - p[1], length = hypot(dx, dy);
        var g0 = radius(p) + 1.4, g1 = radius(q) + 1.4;
        if (length <= g0 + g1) return;
        var from = [p[0] + dx * g0 / length, p[1] + dy * g0 / length];
        var to = [q[0] - dx * g1 / length, q[1] - dy * g1 / length];
        var mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
        var al = [fade(from), fade(mid), fade(to)]; if (!max.apply(null, al)) return;
        var grad = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
        al.forEach(function (a, i) { grad.addColorStop(i / 2, P.rgba(P.neut, 0.52 * a)); });
        ctx.strokeStyle = grad; ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
      }
      ground(ctx, W, H);
      realCanvas.setAttribute('aria-label', ja
        ? '同じ向きのx軸とy軸をもつ実空間の蜂の巣格子。原点はAサイト。基本並進a₂は逆空間図の垂直二等分線と平行。'
        : 'Real-space honeycomb lattice with x and y axes and an A site at the origin. The primitive translation a₂ is parallel to the perpendicular bisector in the reciprocal-space diagram.');
      var sites = [], deltas = [d1, d2, d3];
      ctx.lineWidth = 1.1; ctx.lineCap = 'butt';
      for (var n = -span; n <= span; n++) for (var m = -span; m <= span; m++) {
        var A = [n * a1[0] + m * a2[0], n * a1[1] + m * a2[1]], p = xy(A), B = xy(plus(A, d1));
        var pa = fade(p), pb = fade(B);
        if (pa) sites.push([p, P.rgba(P.suo, 0.69 * pa)]);
        if (pb) sites.push([B, P.rgba(P.sage, 0.72 * pb)]);
        deltas.forEach(function (d) { bond(p, xy(plus(A, d))); });
      }
      sites.forEach(function (s) { if (!isOrigin(s[0])) dot(s[0], 3, s[1]); });

      arrow(ctx, 17, cy, W - 25, cy, pair.axis, 1.2, 6);
      arrow(ctx, cx, H - 18, cx, 18, pair.axis, 1.2, 6);
      [a1, a2].forEach(function (v) {
        var q = xy(v);
        arrowShort(ctx, cx, cy, q[0], q[1], 5, P.ink2, 1.75, 8);
      });
      mvar(ctx, W - 18, cy, 'x', { color: P.ink2, sizeRole: 'label', baseline: 'middle' });
      mvar(ctx, cx + 9, 18, 'y', { color: P.ink2, sizeRole: 'label', baseline: 'middle' });
      [a1, a2].forEach(function (v, i) {
        var subscript = String(i + 1);
        var x = cx + (i ? -0.58 : 0.58) * S, y = cy - 0.34 * S;
        mvar(ctx, x, y, 'a', { sub: subscript, color: P.ink2, sizeRole: 'label', align: 'center', baseline: 'middle' });
      });
      dot(origin, radius(origin), P.aSite);
    }

    function draw() {
      var height = cornersOnly ? 228 : realCanvas ? max(250, min(380, Math.round(canvas.getBoundingClientRect().width) || 380)) : 380;
      var o = dpr(canvas, height), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      var ja = curLang() === 'ja';
      if (realCanvas) drawRealSpace(height, ja);
      canvas.setAttribute('aria-label',cornersOnly?(ja?"第一ブリルアンゾーンの六頂点が、Kを含む三点とK′を含む三点に分かれ、それぞれの組の中で逆格子並進によって移り合うことを示す図。":"Reciprocal lattice translations connect alternating corners in two separate groups, starting from K and K′"):(ja?"グラフェンの六つの最近接逆格子点と、原点との垂直二等分線から作った、正六角形の第一ブリルアンゾーン。":"Six nearest reciprocal-lattice points and their perpendicular bisectors enclosing graphene's first Brillouin zone"));

      // The corner comparison does not need room for the outer reciprocal-lattice points.
      var cx = W * 0.5, cy = H * 0.5;
      var R = cornersOnly ? min(88, max(1, cx - 46)) : min(max(1, (cx - 36) / 1.5), (cy - 38) / sqrt3);
      var xTip = cornersOnly ? min(W - 26, cx + R + 24) : min(W - 26, cx + 1.5 * R + 14);
      var yTip = cornersOnly ? max(16, cy - sqrt3 * R / 2 - 32) : cy - sqrt3 * R - 16;
      canvas.dataset.radius = String(R); canvas.dataset.centerY = String(cy);
      canvas.dataset.mode = cornersOnly ? 'kg' : 'build';
      var geometry = globalThis.GrapheneBZGeometry, origin = [cx, cy];
      function screen(p) { return geometry.screen(p, cx, cy, R); }
      var corners = geometry.corners.map(screen), neighbors = geometry.nearestReciprocal.map(screen);
      function line(from, to, color, width, dash) {
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width;
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
        ctx.restore();
      }
      function dot(p, r, color, open) {
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * PI);
        ctx.fillStyle = open ? P.rgb(P.plate) : color; ctx.fill();
        if (open) { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      function pointLabel(p, label, dx, dy, color, align) {
        txt(ctx, p[0] + dx, p[1] + dy, label, { color: color, sizeRole: 'label', role: 'point', align: align });
      }

      ctx.beginPath();
      corners.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.closePath();
      if (!cornersOnly) { ctx.fillStyle = P.rgba(P.terra, 0.08); ctx.fill(); }
      ctx.strokeStyle = P.rgba(P.neut, 0.9); ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.stroke();
      arrow(ctx, W - xTip, cy, xTip, cy, realCanvas ? pair.axis : P.axis, 1.2, 6);
      arrow(ctx, cx, H - yTip, cx, yTip, realCanvas ? pair.axis : P.axis, 1.2, 6);
      mvar(ctx, xTip + 6, cy, 'k', { sub: 'x', subRole: 'variable', color: P.ink2, sizeRole: 'label', baseline: 'middle' });
      mvar(ctx, cx + 9, yTip, 'k', { sub: 'y', subRole: 'variable', color: P.ink2, sizeRole: 'label', baseline: 'middle' });

      if (!cornersOnly) {
        function bisector(i, color, width, extent) {
          var p = screen(geometry.midpoints[i]), g = neighbors[i];
          var ux = (g[0] - cx) / (R * sqrt3), uy = (g[1] - cy) / (R * sqrt3);
          line([p[0] + uy * extent, p[1] - ux * extent],
               [p[0] - uy * extent, p[1] + ux * extent], color, width);
        }
        for (var i = 1; i < 6; i++) bisector(i, P.rgba(P.neut, 0.32), 1, R * 0.64);
        var b1 = neighbors[0], M = screen(geometry.midpoints[0]);
        if (!realCanvas) line(origin, b1, P.rgba(P.terra, 0.9), 1.1, [4, 4]);
        bisector(0, realCanvas ? pair.red : P.basis, realCanvas ? 2.2 : 1.6, R * 0.78);
        var ux = (b1[0] - cx) / (R * sqrt3), uy = (b1[1] - cy) / (R * sqrt3), q = 7;
        ctx.strokeStyle = realCanvas ? P.ink2 : P.basis; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(M[0] + ux * q, M[1] + uy * q);
        ctx.lineTo(M[0] + (ux - uy) * q, M[1] + (uy + ux) * q);
        ctx.lineTo(M[0] - uy * q, M[1] + ux * q); ctx.stroke();
        neighbors.forEach(function (g) { dot(g, 3, P.ink3, false); });
        if (realCanvas) {
          var b2 = screen(geometry.b2);
          arrow(ctx, cx, cy, b2[0], b2[1], pair.reciprocal, 2.05, 8);
          arrow(ctx, cx, cy, b1[0], b1[1], pair.reciprocal, 2.05, 8);
          mvar(ctx, b2[0] - 8, b2[1] - 7, 'b', { sub: '2', color: pair.reciprocal, sizeRole: 'label', align: 'right' });
        }
        dot(M, 3.2, realCanvas ? P.ink2 : P.basis, false);
        pointLabel(M, 'M', realCanvas ? 3 : 9, -11, P.ink, 'left');
        mvar(ctx, b1[0] + 8, b1[1] - 7, 'b', { sub: '1', color: realCanvas ? pair.reciprocal : P.basis, sizeRole: 'label' });
      } else {
        // Each translation keeps its original direction and ends at a corner of the same family.
        var moves = [
          [0, 2, '+b₂', P.kK, 6, -12],
          [0, 3, '−b₁', P.kK, 6, 20],
          [3, 0, '+b₁', P.kKp, -6, -12],
          [3, 5, '−b₂', P.kKp, -6, 20]
        ];
        moves.forEach(function (mv) {
          var p = corners[mv[0]], g = neighbors[mv[1]], dx = g[0] - cx, dy = g[1] - cy;
          arrowShort(ctx, p[0], p[1], p[0] + dx, p[1] + dy, 7, mv[3], 2.2, 9);
          txt(ctx, p[0] + dx * 0.28 + mv[4], p[1] + dy * 0.28 + mv[5], mv[2],
              { color: mv[3], sizeRole: 'label', align: 'center' });
        });
        [1, 2, 4, 5].forEach(function (i) {
          var prime = i % 2;
          pointLabel(corners[i], prime ? 'K′' : 'K', 0, i < 3 ? -10 : 18, prime ? P.kKp : P.kK, 'center');
        });
      }
      corners.forEach(function (p, i) {
        var prime = cornersOnly && i % 2;
        dot(p, 4, cornersOnly ? (prime ? P.kKp : P.kK) : P.ink, prime);
      });
      dot(origin, 3, P.ink, false);
      pointLabel(origin, 'Γ', -9, 17, P.ink, 'right');
      pointLabel(corners[0], 'K', realCanvas ? 6 : 10, realCanvas ? -5 : -8, cornersOnly ? P.kK : P.ink, 'left');
      pointLabel(corners[3], 'K′', realCanvas ? -6 : -10, realCanvas ? -5 : -8, cornersOnly ? P.kKp : P.ink, 'right');
    }
    window.addEventListener('resize', draw);
    onLang(draw);
    draw();
  }
  initBrillouinFigure('fig-bz', false);
  initBrillouinFigure('fig-bz-corners', true);
  (function () {
    var canvas = document.getElementById('fig-lattice'); if (!canvas) return;
    var fig = canvas.closest('.gfig');
    var status = document.getElementById('lat-status');
    var btnA = document.getElementById('lat-aa'), btnB = document.getElementById('lat-ab'), btnR = document.getElementById('lat-reset');

    var a1 = [0.5, sqrt3 / 2], a2 = [-0.5, sqrt3 / 2];      // a1 = δ1 − δ3, a2 = δ1 − δ2 (the choice used in the prose; bond length 1/√3)
    var d1 = [0, 1 / sqrt3], d2 = [0.5, -1 / (2 * sqrt3)], d3 = [-0.5, -1 / (2 * sqrt3)];
    var deltas = [d1, d2, d3], range = 4;
    var mode = null, vec = [0, 0], anim = 0, raf = null;

    function startMove(m) {
      mode = m; vec = (m === 'aa') ? a1.slice() : d1.slice(); anim = 0;
      btnA.classList.toggle('active', m === 'aa'); btnB.classList.toggle('active', m === 'ab');btnA.setAttribute('aria-pressed',String(m==='aa'));btnB.setAttribute('aria-pressed',String(m==='ab'));
      // Both lines share one structure: 説明（操作）：<結果>。 — colon + a single result
      // clause, no dashes (house style forbids — / ――; use 句点・コロン・接続語 only).
      if(status){status.hidden=false;status.innerHTML=m==='aa'?g01Bi('全配置：一致','Whole pattern: match'):g01Bi('全配置：不一致','Whole pattern: mismatch');}
      cancelAnimationFrame(raf); tick();
    }
    function tick() { anim = g01Reduced()?1:min(1, anim + 0.016); draw(); if (anim < 1) raf = requestAnimationFrame(tick); }
    function reset() {
      mode = null; vec = [0, 0]; anim = 0; btnA.classList.remove('active'); btnB.classList.remove('active');btnA.setAttribute('aria-pressed','false');btnB.setAttribute('aria-pressed','false');
      if(status){status.innerHTML='';status.hidden=true;}
      cancelAnimationFrame(raf); draw();
    }

    var W0, H0, CX, CY, SC;
    function fade(sx, sy) {   // rectangular falloff → lattice dissolves before the plate edge
      var fx = max(abs(sx - W0 / 2) / (W0 / 2), abs(sy - H0 / 2) / (H0 / 2));
      return max(0, min(1, (0.97 - fx) / 0.2));
    }

    // Two ways of showing the A→A / A→B translation, switchable via window.__latVariant
    // ('a' = whole-lattice overlap, 'i' = local emphasis). Both obey the same rule:
    // the PRE lattice stays as the reference and PRE vs POST differ by OPACITY ONLY
    // (same solid line style — no dashed), so the field never reads as doubly-coded.
    function draw() {
      var o = dpr(canvas, 420), ctx = o.ctx, W = o.w, H = o.h; W0 = W; H0 = H;
      ground(ctx, W, H);
      SC = min(W, H) * 0.205; CX = W * 0.5; CY = H * 0.53;
      var tx = function (x) { return CX + x * SC; }, ty = function (y) { return CY - y * SC; };
      var ox = vec[0] * anim, oy = vec[1] * anim;
      var moving = !!mode;

      if (!moving) {
        drawLattice(ctx, tx, ty, 0, 0, 1);
      } else {
        // Whole-overlap (案あ): the PRE lattice stays as a faint baseline, the POST copy
        // is drawn dark over it. Opacity is the ONLY distinction (same solid line style,
        // no dashing). A→A: dark coincides with the baseline (maps onto itself);
        // A→B: dark is offset by one bond; one sublattice lands in empty
        // hexagon centres, so the translated pattern does not map onto itself.
        drawLattice(ctx, tx, ty, 0, 0, 0.24);
        drawLattice(ctx, tx, ty, ox, oy, 1);
      }

      if (moving) drawOpArrow(ctx, tx, ty);
      drawOrigin(ctx, tx, ty);
      drawLegend(ctx);
      canvas.dataset.mode=mode||'initial';canvas.dataset.progress=String(anim);
      canvas.setAttribute('aria-label',(curLang()==='ja'?'A/B格子：':'A/B lattice: ')+(mode==='aa'?(curLang()==='ja'?'A→A、全配置一致':'A to A, complete match'):mode==='ab'?(curLang()==='ja'?'A→B、全配置不一致':'A to B, whole pattern mismatch'):(curLang()==='ja'?'移動前':'before translation')));
    }

    // full honeycomb at a given opacity — solid bonds + filled atoms, no dashing
    function drawLattice(ctx, tx, ty, ox, oy, alpha) {
      var n, m, di;
      ctx.setLineDash([]); ctx.lineCap = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = P.bond;
      for (n = -range; n <= range; n++) for (m = -range; m <= range; m++) {
        var ax = n * a1[0] + m * a2[0] + ox, ay = n * a1[1] + m * a2[1] + oy;
        for (di = 0; di < 3; di++) {
          var bx = ax + deltas[di][0], by = ay + deltas[di][1];
          var X0 = tx(ax), Y0 = ty(ay), X1 = tx(bx), Y1 = ty(by);
          var al = Math.min(fade(X0, Y0), fade(X1, Y1)) * alpha;
          if (al < 0.02) continue;
          var bdx = X1 - X0, bdy = Y1 - Y0, g = 4.7 / (hypot(bdx, bdy) || 1);   // stop the bond at the atom edge so the round atom (drawn after) caps it — no bond shows through a faded atom
          ctx.globalAlpha = al; ctx.beginPath(); ctx.moveTo(X0 + bdx * g, Y0 + bdy * g); ctx.lineTo(X1 - bdx * g, Y1 - bdy * g); ctx.stroke();
        }
      }
      for (n = -range; n <= range; n++) for (m = -range; m <= range; m++) {
        var px = n * a1[0] + m * a2[0] + ox, py = n * a1[1] + m * a2[1] + oy;
        atomDot(ctx, tx(px), ty(py), P.aSite, alpha);
        atomDot(ctx, tx(px + d1[0]), ty(py + d1[1]), P.bSite, alpha);
      }
      ctx.globalAlpha = 1;
    }
    function atomDot(ctx, X, Y, col, alpha) {
      var al = fade(X, Y) * alpha; if (al < 0.02) return;
      ctx.globalAlpha = al; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(X, Y, 5.4, 0, 2 * PI); ctx.fill(); ctx.globalAlpha = 1;
    }

    // the temporary translation arrow — bold haloed burnt-sienna, only during a move
    function drawOpArrow(ctx, tx, ty) {
      arrowShort(ctx, tx(0), ty(0), tx(vec[0]), ty(vec[1]), 10, P.rgba(P.plate, 0.95), 6, 12);
      arrowShort(ctx, tx(0), ty(0), tx(vec[0]), ty(vec[1]), 10, P.opArrow, 3.2, 12);
    }
    function drawOrigin(ctx, tx, ty) {
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(tx(0), ty(0), 4, 0, 2 * PI); ctx.fillStyle = P.ink; ctx.fill();
      ctx.beginPath(); ctx.arc(tx(0), ty(0), 9.5, 0, 2 * PI); ctx.lineWidth = 1.3; ctx.strokeStyle = P.ink.replace('rgb', 'rgba').replace(')', ',0.5)'); ctx.stroke();
    }
    function drawLegend(ctx) {
      var lx = 10, ly = 22;
      ctx.fillStyle = P.rgba(P.plate, 0.85); roundRect(ctx, lx - 6, ly - 17, 74, 23, 3); ctx.fill();
      ctx.beginPath(); ctx.arc(lx + 4, ly - 5, 5.2, 0, 2 * PI); ctx.fillStyle = P.aSite; ctx.fill();
      txt(ctx, lx + 14, ly, 'A', { color: P.ink, size: 13, weight: 600 });
      ctx.beginPath(); ctx.arc(lx + 38, ly - 5, 5.2, 0, 2 * PI); ctx.fillStyle = P.bSite; ctx.fill();
      txt(ctx, lx + 48, ly, 'B', { color: P.ink, size: 13, weight: 600 });
    }

    if (fig) fig.classList.add('is-grab');
    btnA.addEventListener('click', function () { startMove('aa'); });
    btnB.addEventListener('click', function () { startMove('ab'); });
    btnR.addEventListener('click', reset);
    window.addEventListener('resize', draw);onLang(draw);
    draw();
  })();
  (function () {
    var canvas = document.getElementById('fig-stamp'); if (!canvas) return;
    var status = document.getElementById('st-status');
    var bP = document.getElementById('st-press'), bR = document.getElementById('st-reset');
    var mode = null, prog = 0, t0 = 0, raf = null;
    var T = 5600;                                                     // ms for the whole field
    var a1 = [sqrt3 / 2, 1.5], a2 = [-sqrt3 / 2, 1.5];               // bond length 1, y up; B = A + (0, 1)
    var cells = [], W0 = 0, H0 = 0, SC = 24, CX = 0, CY = 0;

    function setStatus(html) { if (status) status.innerHTML = html || '<span class="i18n-en">&nbsp;</span><span class="i18n-ja">&nbsp;</span>'; }
    function setBtns() { if (bP) bP.classList.toggle('active', mode === 'press'); }
    function press() {
      mode = 'press'; prog = 0; t0 = 0; setBtns();
      setStatus(g01Bi('反復中','Stamping'));
      cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    }
    function reset() { mode = null; prog = 0; setBtns(); setStatus(g01Bi('待機','Ready')); cancelAnimationFrame(raf); draw(); }
    function tick(now) {
      if (!t0) t0 = now;
      prog = g01Reduced()?1:min(1, (now - t0) / T); draw();
      if (prog < 1) raf = requestAnimationFrame(tick);
      else setStatus(g01Bi('完了','Complete'));
    }

    function build(W, H) {
      W0 = W; H0 = H; CX = W / 2; CY = H * 0.5; cells = [];
      for (var m = -9; m <= 9; m++) for (var n = -9; n <= 9; n++) {
        var x = m * a1[0] + n * a2[0], y = m * a1[1] + n * a2[1], X = CX + x * SC, Y = CY - y * SC;
        if (X < -SC || X > W + SC || Y < -2 * SC || Y > H + SC) continue;
        cells.push({ m: m, n: n, x: x, y: y, X: X, Y: Y, d: hypot(X - CX, Y - CY + SC / 2), ang: Math.atan2(Y - CY, X - CX) });
      }
      cells.sort(function (p, q) { return (p.d - q.d) || (p.ang - q.ang); });          // spiral out from the centre
      var idx = {}; cells.forEach(function (c, i) { idx[c.m + ',' + c.n] = i; });
      cells.forEach(function (c) { c.nb = [idx[c.m + ',' + c.n], idx[c.m + ',' + (c.n - 1)], idx[(c.m - 1) + ',' + c.n]]; });   // cells whose B this A bonds to: own (δ1), R−a2 (δ2), R−a1 (δ3)
    }
    function fade(X, Y) { var fx = max(abs(X - W0 / 2) / (W0 / 2), abs(Y - H0 / 2) / (H0 / 2)); return max(0, min(1, (0.97 - fx) / 0.2)); }
    function ease(p) { return Math.pow(p, 2.4); }                                       // slow first presses, then the field fills fast
    function atom(ctx, X, Y, col, alpha, r) { var al = fade(X, Y) * alpha; if (al < 0.02) return; ctx.globalAlpha = al; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X, Y, r || 5.2, 0, 2 * PI); ctx.fill(); ctx.globalAlpha = 1; }

    function rhombus(ctx, X, Y) {                                                          // the unit cell centred on a lattice point: vertices ±(a1+a2)/2, ±(a1−a2)/2
      ctx.beginPath(); ctx.moveTo(X, Y - 1.5 * SC); ctx.lineTo(X + sqrt3 / 2 * SC, Y); ctx.lineTo(X, Y + 1.5 * SC); ctx.lineTo(X - sqrt3 / 2 * SC, Y); ctx.closePath();
    }
    function drawStamp(ctx, X, Y, lift, alpha) {                                          // X,Y = the lattice point (an A); the A mark lands there, the rhombus is centred half a bond above
      var s = 1 + 0.16 * lift;
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(X, Y - SC / 2); ctx.scale(s, s);
      ctx.fillStyle = P.rgba(P.plate, 0.92); ctx.strokeStyle = P.basis; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
      rhombus(ctx, 0, 0); ctx.fill(); ctx.stroke();                                          // rhombus seal = one unit cell
      ctx.strokeStyle = P.rgba(P.terra, 0.7); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, SC / 2 - 5); ctx.lineTo(0, -SC / 2 + 5); ctx.stroke();
      ctx.fillStyle = P.aSite; ctx.beginPath(); ctx.arc(0, SC / 2, 4.6, 0, 2 * PI); ctx.fill();     // carved A, half a bond below the centre
      ctx.fillStyle = P.bSite; ctx.beginPath(); ctx.arc(0, -SC / 2, 4.6, 0, 2 * PI); ctx.fill();    // carved B, half a bond above
      ctx.restore();
    }
    function drawLegend(ctx) {
      var lx = 10, ly = 22;
      ctx.fillStyle = P.rgba(P.plate, 0.85); roundRect(ctx, lx - 6, ly - 17, 74, 23, 3); ctx.fill();
      ctx.beginPath(); ctx.arc(lx + 4, ly - 5, 5.2, 0, 2 * PI); ctx.fillStyle = P.aSite; ctx.fill();
      txt(ctx, lx + 14, ly, 'A', { color: P.ink, size: 13, weight: 600 });
      ctx.beginPath(); ctx.arc(lx + 38, ly - 5, 5.2, 0, 2 * PI); ctx.fillStyle = P.bSite; ctx.fill();
      txt(ctx, lx + 48, ly, 'B', { color: P.ink, size: 13, weight: 600 });
    }
    function draw() {
      var o = dpr(canvas, 360), ctx = o.ctx, W = o.w, H = o.h; ground(ctx, W, H);
      if (W !== W0 || H !== H0 || !cells.length) build(W, H);
      var N = cells.length;
      var sReal = mode === 'press' ? N * ease(prog) : 0;
      var k = min(N, Math.floor(sReal)), phase = sReal - k;

      cells.forEach(function (c) { var al = fade(c.X, c.Y); if (al < 0.02) return; ctx.globalAlpha = al; ctx.fillStyle = P.rgba(P.neut, 0.6); ctx.beginPath(); ctx.arc(c.X, c.Y, 2.3, 0, 2 * PI); ctx.fill(); });   // bare lattice points
      ctx.globalAlpha = 1;

      ctx.lineCap = 'round'; ctx.lineWidth = 1.5; ctx.strokeStyle = P.bond;                 // bonds between stamped cells only
      for (var i = 0; i < k; i++) { (function (c) { c.nb.forEach(function (j) {
        if (j === undefined || j >= k) return; var b = cells[j], AX = c.X, AY = c.Y, BX = b.X, BY = b.Y - SC;
        var al = min(fade(AX, AY), fade(BX, BY)); if (al < 0.02) return;
        var dx = BX - AX, dy = BY - AY, g = 4.4 / (hypot(dx, dy) || 1);
        ctx.globalAlpha = al; ctx.beginPath(); ctx.moveTo(AX + dx * g, AY + dy * g); ctx.lineTo(BX - dx * g, BY - dy * g); ctx.stroke();
      }); })(cells[i]); }
      ctx.globalAlpha = 1;
      for (var i = 0; i < k; i++) { var c = cells[i]; atom(ctx, c.X, c.Y, P.aSite, 1); atom(ctx, c.X, c.Y - SC, P.bSite, 1); }
      if (mode === 'press') {                                                                // the pressed cells tile: faint outlines while the field fills, fading away at the end
        var oa = 0.22 * max(0, min(1, (1 - prog) / 0.08));
        if (oa > 0.01) { ctx.strokeStyle = P.rgba(P.terra, oa); ctx.lineWidth = 1; ctx.lineJoin = 'round'; for (var i = 0; i < k; i++) { var c = cells[i]; if (fade(c.X, c.Y) < 0.3) continue; rhombus(ctx, c.X, c.Y - SC / 2); ctx.stroke(); } }
      }

      if (mode === 'press' && k < N) {                                                     // the stamp on its way to the next point
        var to = cells[k], from = k > 0 ? cells[k - 1] : to, e = phase * phase * (3 - 2 * phase);
        drawStamp(ctx, from.X + (to.X - from.X) * e, from.Y + (to.Y - from.Y) * e, sin(PI * phase), 1);
      } else if (mode === null) {                                                          // at rest: R and its two neighbours R + a1, R + a2 (Eq. 1), and the stamp waiting to the left
        var R0 = cells[0], p1 = [R0.X + a1[0] * SC, R0.Y - a1[1] * SC], p2 = [R0.X + a2[0] * SC, R0.Y - a2[1] * SC];
        arrowShort(ctx, R0.X, R0.Y, p1[0], p1[1], 5, P.basis, 1.8, 8); arrowShort(ctx, R0.X, R0.Y, p2[0], p2[1], 5, P.basis, 1.8, 8);
        [R0, { X: p1[0], Y: p1[1] }, { X: p2[0], Y: p2[1] }].forEach(function (q) { ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(q.X, q.Y, 3.4, 0, 2 * PI); ctx.fill(); });
        mvar(ctx, R0.X + 8, R0.Y + 17, 'R', { color: P.ink, size: 14, weight: 700 });
        txt(ctx, p1[0] + 8, p1[1] + 5, 'R + a₁', { color: P.basis, italic: true, size: 13.5, weight: 600 });
        txt(ctx, p2[0] - 8, p2[1] + 5, 'R + a₂', { color: P.basis, italic: true, size: 13.5, weight: 600, align: 'right' });
        drawStamp(ctx, R0.X - 2 * sqrt3 * SC, R0.Y, 0.5, 1);                               // parked two lattice steps to the left, A mark on a lattice point
      }

      drawLegend(ctx);
      canvas.dataset.progress=String(prog);canvas.dataset.mode=mode||'initial';
      canvas.setAttribute('aria-label',(curLang()==='ja'?'二原子基底の判子：':'Two-atom basis stamp: ')+(mode==='press'?(prog<1?(curLang()==='ja'?'反復中':'stamping'):(curLang()==='ja'?'全格子へ配置完了':'complete lattice')):(curLang()==='ja'?'待機':'ready')));
    }
    if (bP) bP.addEventListener('click', press);
    if (bR) bR.addEventListener('click', reset);
    window.addEventListener('resize', draw); onLang(draw);
    draw();
  })();
})();
