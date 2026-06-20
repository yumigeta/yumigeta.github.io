/* ====================================================================
   Electronic Structure of Graphene Ⅱ — interactive figures (F1–F6).

   Vanilla JS, SVG only (no canvas/WebGL). All physics comes from
   GV2Physics (graphene-v2-physics.js). Two house rules, which fix the
   bugs the old canvas figures had:
     · text inherits the site font (set in CSS via font-family:inherit) —
       no hard-coded family anywhere here;
     · every formula is real KaTeX, set in absolutely-placed HTML labels
       (.gv-lab) layered over the SVG — never plain text like "e^(ik·δ)".

   Each figure exposes build() (full reconstruct, used on first paint and
   on resize) and render() (cheap per-frame update from state).
   ==================================================================== */
'use strict';
(function () {
  var PH = window.GV2Physics;
  if (!PH) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var T_EV = 2.8;                       // hopping, eV — used for the energy read-outs

  /* muted palette, mirrors the CSS custom properties in graphene-v2.css */
  var COL = {
    d1: '#5fb7b0', d2: '#d8a25c', d3: '#a78fd0', sum: '#f4efe6',
    A: '#d98c6a', B: '#6fa8d6', bond: '#5fb7b0', anti: '#d8a25c',
    elec: '#6fb7d6', hole: '#d98c6a', semi: 'rgba(245,245,244,.34)',
    grid: 'rgba(255,255,255,.07)', grid2: 'rgba(255,255,255,.16)',
    axis: 'rgba(255,255,255,.34)', axlab: 'rgba(245,245,244,.62)',
    fermi: '#e7e5e4', zone: '#cdb78a', snap: '#e0584c',
    ink: '#e7e5e4', faint: '#a8a29e'
  };

  /* ── tiny DOM/SVG helpers ── */
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function htm(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /* HTML label (KaTeX-friendly), positioned in stage pixels */
  function label(stage, x, y, html, cls) {
    var d = htm('div', 'gv-lab' + (cls ? ' ' + cls : ''), stage);
    d.style.left = x + 'px'; d.style.top = y + 'px';
    d.innerHTML = html;
    return d;
  }
  function bi(en, ja) { return '<span class="i18n-en">' + en + '</span><span class="i18n-ja">' + ja + '</span>'; }

  /* render any $…$ inside a subtree once KaTeX is available */
  function renderMath(root) {
    if (!window.renderMathInElement) return;
    try {
      window.renderMathInElement(root, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false
      });
    } catch (e) { /* leave raw text rather than break the page */ }
  }
  function whenKatex(cb) {
    if (window.katex && window.renderMathInElement) { cb(); return; }
    var n = 0, id = setInterval(function () {
      if (window.katex && window.renderMathInElement) { clearInterval(id); cb(); }
      else if (++n > 240) { clearInterval(id); cb(); }
    }, 25);
  }

  /* a drawing panel: tag (〔定量〕/〔模式図〕) + a stage holding the svg + labels.
     kind is 'quant' or 'schematic'; the tag is rendered bilingually. */
  function panel(parent, kind, nameEn, nameJa) {
    var el0 = htm('div', 'gv-panel', parent);
    if (kind) {
      var kEn = kind === 'schematic' ? 'schematic' : 'quantitative';
      var kJa = kind === 'schematic' ? '模式図' : '定量';
      var tag = htm('div', 'gv-tag', el0);
      tag.innerHTML = '<span class="gv-kind">〔' + bi(kEn, kJa) + '〕</span>' +
        '<span class="gv-name">' + bi(nameEn, nameJa) + '</span>';
    }
    var stage = htm('div', 'gv-stage', el0);
    var svg = el('svg', {}, stage);
    return { panel: el0, stage: stage, svg: svg };
  }
  function size(p, w, h) {
    p.svg.setAttribute('width', w); p.svg.setAttribute('height', h);
    p.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  }
  function stageW(p) { return p.stage.clientWidth || (p.panel.clientWidth - 24) || 0; }

  /* dynamic arrow = line + filled head, both updatable */
  function mkArrow(parent, color, width, headSize) {
    var ln = el('line', { stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' }, parent);
    var hd = el('polygon', { fill: color }, parent);
    var s = headSize || 7;
    return {
      set: function (x1, y1, x2, y2) {
        ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
        ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
        if (Math.hypot(x2 - x1, y2 - y1) < 1.2) { hd.style.display = 'none'; return; }
        hd.style.display = '';
        var a = Math.atan2(y2 - y1, x2 - x1);
        var p = [[x2, y2],
          [x2 - s * Math.cos(a - 0.42), y2 - s * Math.sin(a - 0.42)],
          [x2 - s * Math.cos(a + 0.42), y2 - s * Math.sin(a + 0.42)]];
        hd.setAttribute('points', p.map(function (q) { return q[0].toFixed(2) + ',' + q[1].toFixed(2); }).join(' '));
      },
      color: function (c) { ln.setAttribute('stroke', c); hd.setAttribute('fill', c); },
      show: function (v) { ln.style.display = hd.style.display = (v ? '' : 'none'); }
    };
  }

  function lerpHex(a, b, t) {
    function p(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    var x = p(a), y = p(b);
    function c(i) { return Math.round(x[i] + (y[i] - x[i]) * t); }
    return 'rgb(' + c(0) + ',' + c(1) + ',' + c(2) + ')';
  }
  function rafThrottle(fn) {
    var q = false, args;
    return function () { args = arguments; if (q) return; q = true; requestAnimationFrame(function () { q = false; fn.apply(null, args); }); };
  }
  function onResize(node, cb) {
    if (window.ResizeObserver) { var ro = new ResizeObserver(rafThrottle(cb)); ro.observe(node); }
    else { window.addEventListener('resize', rafThrottle(cb)); }
  }
  function tweenVec(from, to, dur, step, done) {
    if (REDUCED) { step(to[0], to[1]); if (done) done(); return; }
    var t0 = performance.now();
    (function frame(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      step(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e);
      if (p < 1) requestAnimationFrame(frame); else if (done) done();
    })(performance.now());
  }

  /* ══════════════════════════════════════════════════════════════════
     F3 — k → three arrows → f(k) → splitting   (the heart)
     ══════════════════════════════════════════════════════════════════ */
  (function F3() {
    var root = document.getElementById('gv-f3');
    if (!root) return;
    var card = root.closest('.anim-card');
    var toast = document.getElementById('f3-toast');

    var k = [0, 0];                       // default Γ
    var P = {};                           // panel refs, rebuilt each build
    var toastShown = false, toastTimer = null, activeTab = 'cplx';

    function bzNormals() {                // 6 inward edge normals (M directions)
      var n = [];
      for (var i = 0; i < 6; i++) { var a = (30 + 60 * i) * Math.PI / 180; n.push([Math.cos(a), Math.sin(a)]); }
      return n;
    }
    function clampK(kx, ky) {              // clamp to the hexagonal zone
      var n = bzNormals(), mx = 0;
      for (var i = 0; i < 6; i++) { var d = (kx * n[i][0] + ky * n[i][1]) / PH.RM; if (d > mx) mx = d; }
      if (mx > 1) { kx /= mx; ky /= mx; }
      return [kx, ky];
    }

    function build() {
      clear(root);
      var grid = htm('div', 'gv-row gv3', root);

      var bz = panel(grid, 'quant', 'Brillouin zone — drag $k$', 'ブリルアンゾーン — $k$をドラッグ');
      bz.panel.classList.add('gv3-bz');

      var tabs = htm('div', 'gv3-tabs', grid);
      [['real', '実空間', 'Real space'], ['cplx', '複素平面', 'Complex plane'], ['ladder', '分裂', 'Splitting']]
        .forEach(function (tb) {
          var b = htm('button', 'gv3-tab' + (tb[0] === activeTab ? ' is-active' : ''), tabs);
          b.type = 'button'; b.innerHTML = bi(tb[2], tb[1]);
          b.onclick = function () { activeTab = tb[0]; build(); };
        });

      var cplx = panel(grid, 'quant', 'Complex plane', '複素平面');
      cplx.panel.classList.add('gv3-result', 'gv3-cplx'); if (activeTab === 'cplx') cplx.panel.classList.add('is-active');
      var real = panel(grid, 'quant', 'Real space', '実空間');
      real.panel.classList.add('gv3-result', 'gv3-real'); if (activeTab === 'real') real.panel.classList.add('is-active');
      var lad = panel(grid, 'quant', 'Energy split', '分裂');
      lad.panel.classList.add('gv3-result', 'gv3-ladder'); if (activeTab === 'ladder') lad.panel.classList.add('is-active');

      var legend = htm('div', 'gv-legend', root);
      legend.innerHTML =
        '<span><i style="background:' + COL.d1 + '"></i><i style="background:' + COL.d2 + '"></i><i style="background:' + COL.d3 + '"></i>$e^{ik\\cdot\\delta_j}$</span>' +
        '<span><i style="background:' + COL.sum + '"></i>$f(k)=\\sum_j e^{ik\\cdot\\delta_j}$</span>' +
        '<span><i class="dot" style="background:' + COL.snap + '"></i>' + bi('high-symmetry point', '高対称点') + '</span>';

      P = { bz: bz, cplx: cplx, real: real, lad: lad };
      drawBZ(bz); drawCplx(cplx); drawReal(real); drawLadder(lad);
      whenKatex(function () { renderMath(root); });
      render();
    }

    /* ---- BZ controller ---- */
    function drawBZ(p) {
      var W = stageW(p); if (!W) return;
      var H = Math.min(W, 234); size(p, W, H);
      var s = (Math.min(W, H) / 2 - 30) / PH.RK, cx = W / 2, cy = H / 2;
      p.cx = cx; p.cy = cy; p.s = s; p.W = W; p.H = H;
      function px(kx, ky) { return [cx + kx * s, cy - ky * s]; }
      p.px = px;

      var corners = PH.bzCorners().map(function (c) { return px(c[0], c[1]); });
      el('polygon', { points: corners.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '),
        fill: 'rgba(205,183,138,.06)', stroke: COL.zone, 'stroke-width': 1.4 }, p.svg);
      el('line', { x1: cx - s * PH.RK, y1: cy, x2: cx + s * PH.RK, y2: cy, stroke: COL.grid }, p.svg);
      el('line', { x1: cx, y1: cy - s * PH.RK, x2: cx, y2: cy + s * PH.RK, stroke: COL.grid }, p.svg);

      bzNormals().forEach(function (nn) {
        var m = px(nn[0] * PH.RM, nn[1] * PH.RM);
        el('circle', { cx: m[0], cy: m[1], r: 2.6, fill: 'none', stroke: COL.zone, 'stroke-width': 1.1 }, p.svg);
      });
      PH.bzCorners().forEach(function (c, i) {
        var q = px(c[0], c[1]);
        if (i % 2 === 0) el('rect', { x: q[0] - 3, y: q[1] - 3, width: 6, height: 6, fill: COL.snap }, p.svg);
        else el('polygon', { points: q[0] + ',' + (q[1] - 3.6) + ' ' + (q[0] - 3.4) + ',' + (q[1] + 2.6) + ' ' + (q[0] + 3.4) + ',' + (q[1] + 2.6), fill: '#e8b6ad' }, p.svg);
      });
      el('circle', { cx: cx, cy: cy, r: 2.4, fill: COL.axlab }, p.svg);

      label(p.stage, cx + 8, cy + 12, '$\\Gamma$', 'gv-mut');
      var Kp0 = px(PH.HS.K[0], PH.HS.K[1]); label(p.stage, Kp0[0] - 9, Kp0[1] - 2, '$K$', 'gv-mut');
      var Kpp = px(PH.HS.Kp[0], PH.HS.Kp[1]); label(p.stage, Kpp[0] + 2, Kpp[1] - 12, '$K^{\\prime}$', 'gv-mut');
      var Mp = px(PH.HS.M[0], PH.HS.M[1]); label(p.stage, Mp[0] + 11, Mp[1] - 4, '$M$', 'gv-mut');

      p.dotHalo = el('circle', { r: 12, fill: 'none', stroke: COL.snap, 'stroke-width': 1, opacity: .35 }, p.svg);
      p.dot = el('circle', { r: 6.5, fill: COL.snap, stroke: '#fff', 'stroke-width': 1.6 }, p.svg);
      label(p.stage, 11, H - 12, bi('drag $k$', '$k$をドラッグ'), 'gv-mut gv-tl');

      var stg = p.stage;
      stg.classList.add('gv-drag');
      stg.setAttribute('tabindex', '0');
      stg.setAttribute('role', 'application');
      stg.setAttribute('aria-label', 'Brillouin zone: drag k, or use arrow keys');
      function fromEvent(ev) {
        var r = p.svg.getBoundingClientRect();
        var kx = (ev.clientX - r.left - cx) / s, ky = -(ev.clientY - r.top - cy) / s;
        var c = clampK(kx, ky);
        var hs = snapTargets(px), bestD = 15 * 15, best = null, mp = px(c[0], c[1]);
        hs.forEach(function (t) { var d = (t.p[0] - mp[0]) * (t.p[0] - mp[0]) + (t.p[1] - mp[1]) * (t.p[1] - mp[1]); if (d < bestD) { bestD = d; best = t.k; } });
        k = best || c; render();
      }
      var dragging = false;
      stg.addEventListener('pointerdown', function (ev) { dragging = true; try { stg.setPointerCapture(ev.pointerId); } catch (e) {} fromEvent(ev); ev.preventDefault(); });
      stg.addEventListener('pointermove', function (ev) { if (dragging) fromEvent(ev); });
      stg.addEventListener('pointerup', function () { dragging = false; });
      stg.addEventListener('pointercancel', function () { dragging = false; });
      stg.addEventListener('keydown', function (ev) {
        var st = PH.RK * 0.06, d = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[ev.key];
        if (!d) return; ev.preventDefault();
        k = clampK(k[0] + d[0], k[1] + d[1]); render();
      });
    }
    function snapTargets(px) {
      var out = [{ k: PH.HS.G, p: px(0, 0) }];
      bzNormals().forEach(function (n) { out.push({ k: [n[0] * PH.RM, n[1] * PH.RM], p: px(n[0] * PH.RM, n[1] * PH.RM) }); });
      PH.bzCorners().forEach(function (c) { out.push({ k: c, p: px(c[0], c[1]) }); });
      return out;
    }

    /* ---- complex plane ---- */
    function drawCplx(p) {
      var W = stageW(p); if (!W) return; var H = Math.min(W, 250); size(p, W, H);
      var cx = W / 2, cy = H / 2, u = Math.min(W, H) * 0.165;
      p.cx = cx; p.cy = cy; p.u = u;
      for (var g = -3; g <= 3; g++) {
        el('line', { x1: cx + g * u, y1: cy - 3.2 * u, x2: cx + g * u, y2: cy + 3.2 * u, stroke: g === 0 ? COL.axis : COL.grid }, p.svg);
        el('line', { x1: cx - 3.2 * u, y1: cy + g * u, x2: cx + 3.2 * u, y2: cy + g * u, stroke: g === 0 ? COL.axis : COL.grid }, p.svg);
      }
      el('circle', { cx: cx, cy: cy, r: u, fill: 'none', stroke: COL.grid2, 'stroke-dasharray': '3 3' }, p.svg);
      label(p.stage, cx + 3.2 * u - 4, cy - 11, '$\\mathrm{Re}$', 'gv-mut');
      label(p.stage, cx + 13, cy - 3.2 * u + 6, '$\\mathrm{Im}$', 'gv-mut');
      p.chain = el('polyline', { points: '', fill: 'none', stroke: 'rgba(244,239,230,.28)', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, p.svg);
      p.nd = [mkArrow(p.svg, COL.d1, 2, 6), mkArrow(p.svg, COL.d2, 2, 6), mkArrow(p.svg, COL.d3, 2, 6)];
      p.res = mkArrow(p.svg, COL.sum, 3.2, 9);
      p.fdot = el('circle', { r: 3, fill: COL.sum }, p.svg);
      p.fzero = label(p.stage, cx, cy - u - 14, '$f=0$', 'gv-mut'); p.fzero.style.display = 'none';
      p.read = label(p.stage, 11, 14, '$|f|$&nbsp;=&nbsp;<span class="num">3.00</span>', 'gv-num gv-tl');
      htm('div', 'gv-pin', p.panel).innerHTML = bi('These are what turn: phase arrows $e^{ik\\cdot\\delta}$', '回るのはこちら：位相の矢印 $e^{ik\\cdot\\delta}$');
    }

    /* ---- real space (δ fixed) ---- */
    function drawReal(p) {
      var W = stageW(p); if (!W) return; var H = Math.min(W, 250); size(p, W, H);
      var cx = W / 2, cy = H / 2, L = Math.min(W, H) * 0.30, sd = L * PH.SQRT3;
      function px(x, y) { return [cx + x * sd, cy - y * sd]; }
      var a1 = [0.5, PH.SQRT3 / 2], a2 = [-0.5, PH.SQRT3 / 2];
      for (var m = -2; m <= 2; m++) for (var nn = -2; nn <= 2; nn++) {
        var ax = m * a1[0] + nn * a2[0], ay = m * a1[1] + nn * a2[1];
        for (var j = 0; j < 3; j++) {
          var d = PH.DELTA[j], A = px(ax, ay), B = px(ax + d[0], ay + d[1]);
          el('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: COL.grid, 'stroke-width': 1 }, p.svg);
        }
      }
      var A0 = px(0, 0);
      PH.DELTA.forEach(function (d, j) {
        var B = px(d[0], d[1]);
        el('line', { x1: A0[0], y1: A0[1], x2: B[0], y2: B[1], stroke: [COL.d1, COL.d2, COL.d3][j], 'stroke-width': 5, 'stroke-linecap': 'round' }, p.svg);
        el('circle', { cx: B[0], cy: B[1], r: 6, fill: COL.B }, p.svg);
        var lx = A0[0] + (B[0] - A0[0]) * 0.6 + (j === 0 ? 13 : 0), ly = A0[1] + (B[1] - A0[1]) * 0.6 + (j === 0 ? 0 : -2);
        label(p.stage, lx, ly, '$\\delta_' + (j + 1) + '$', 'gv-mut');
      });
      el('circle', { cx: A0[0], cy: A0[1], r: 7, fill: COL.A }, p.svg);
      label(p.stage, A0[0] - 13, A0[1] + 11, '$A$', 'gv-mut');
      htm('div', 'gv-pin', p.panel).innerHTML = bi('$\\delta$: fixed (never rotates)', '$\\delta$：固定（回らない）');
    }

    /* ---- splitting ladder ---- */
    function drawLadder(p) {
      var W = stageW(p); if (!W) return; var H = Math.min(W, 250); size(p, W, H);
      var cx = W / 2, cy = H / 2, mTop = 26, sE = (H / 2 - mTop) / (3 * T_EV), bw = Math.min(W * 0.34, 70);
      p.cx = cx; p.cy = cy; p.sE = sE; p.bw = bw;
      el('line', { x1: cx, y1: mTop, x2: cx, y2: H - mTop, stroke: COL.axis }, p.svg);
      el('line', { x1: cx - bw, y1: cy, x2: cx + bw, y2: cy, stroke: COL.grid2, 'stroke-dasharray': '4 3' }, p.svg);
      label(p.stage, cx, mTop - 12, '$E$', 'gv-mut');
      label(p.stage, cx + bw + 6, cy, '$\\varepsilon_0$', 'gv-mut');
      p.barU = el('line', { x1: cx - bw, x2: cx + bw, stroke: COL.anti, 'stroke-width': 4, 'stroke-linecap': 'round' }, p.svg);
      p.barL = el('line', { x1: cx - bw, x2: cx + bw, stroke: COL.bond, 'stroke-width': 4, 'stroke-linecap': 'round' }, p.svg);
      p.labU = label(p.stage, cx - bw - 6, cy, '$+t|f|$', 'gv-mut'); p.labU.style.transform = 'translate(-100%,-50%)';
      p.labL = label(p.stage, cx - bw - 6, cy, '$-t|f|$', 'gv-mut'); p.labL.style.transform = 'translate(-100%,-50%)';
      p.gap = label(p.stage, cx + bw + 8, cy, '$2t|f|=$&nbsp;<span class="num">16.8</span>&nbsp;eV', 'gv-num gv-al');
    }

    /* ---- update everything from k ---- */
    function render() {
      if (!P.bz) return;
      var f = PH.fOfK(k[0], k[1]), ph = PH.phases(k[0], k[1]);
      if (P.bz.px) { var m = P.bz.px(k[0], k[1]); P.bz.dot.setAttribute('cx', m[0]); P.bz.dot.setAttribute('cy', m[1]); P.bz.dotHalo.setAttribute('cx', m[0]); P.bz.dotHalo.setAttribute('cy', m[1]); }
      var c = P.cplx;
      if (c && c.cx != null) {
        var O = [c.cx, c.cy], u = c.u, tip = [O[0], O[1]], chain = [O[0].toFixed(1) + ',' + O[1].toFixed(1)];
        for (var j = 0; j < 3; j++) {
          var vx = Math.cos(ph[j]) * u, vy = -Math.sin(ph[j]) * u;
          c.nd[j].set(O[0], O[1], O[0] + vx, O[1] + vy);
          tip = [tip[0] + vx, tip[1] + vy]; chain.push(tip[0].toFixed(1) + ',' + tip[1].toFixed(1));
        }
        c.chain.setAttribute('points', chain.join(' '));
        var fx = O[0] + f.re * u, fy = O[1] - f.im * u;
        c.res.set(O[0], O[1], fx, fy); c.res.show(f.mod > 0.04);
        c.fdot.setAttribute('cx', fx); c.fdot.setAttribute('cy', fy);
        c.fzero.style.display = f.mod < 1e-2 ? '' : 'none';
        c.read.querySelector('.num').textContent = f.mod.toFixed(2);
      }
      var L = P.lad;
      if (L && L.cx != null) {
        var Eu = T_EV * f.mod, yU = L.cy - Eu * L.sE, yL = L.cy + Eu * L.sE;
        L.barU.setAttribute('y1', yU); L.barU.setAttribute('y2', yU);
        L.barL.setAttribute('y1', yL); L.barL.setAttribute('y2', yL);
        L.labU.style.top = yU + 'px'; L.labL.style.top = yL + 'px';
        L.gap.style.top = L.cy + 'px';
        L.gap.querySelector('.num').textContent = (2 * Eu).toFixed(2);
      }
      var small = f.mod < 0.15;
      if (small && !toastShown) { toastShown = true; fireToast(); }
      else if (f.mod > 0.4) { toastShown = false; }
      var atName = nearestHS();
      document.querySelectorAll('#f3-hs .demo-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-hs') === atName); });
    }
    function nearestHS() {
      var names = ['G', 'M', 'K', 'Kp'], best = null, bd = 1e9;
      names.forEach(function (name) {
        var set = name === 'M' ? bzNormals().map(function (n) { return [n[0] * PH.RM, n[1] * PH.RM]; })
          : name === 'K' ? PH.bzCorners().filter(function (_, i) { return i % 2 === 0; })
          : name === 'Kp' ? PH.bzCorners().filter(function (_, i) { return i % 2 === 1; })
          : [PH.HS.G];
        set.forEach(function (q) { var d = (q[0] - k[0]) * (q[0] - k[0]) + (q[1] - k[1]) * (q[1] - k[1]); if (d < bd) { bd = d; best = name; } });
      });
      return bd < (PH.RK * 0.04) * (PH.RK * 0.04) ? best : null;
    }
    function fireToast() {
      if (!toast) return;
      toast.innerHTML = bi('All three paths remain — what vanished is the phase-weighted sum.',
        '三本の経路は残っている。消えたのは位相つき和。');
      whenKatex(function () { renderMath(toast); });
      toast.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2000);
    }

    document.querySelectorAll('#f3-hs .demo-btn').forEach(function (b) {
      b.onclick = function () {
        var tgt = PH.HS[b.getAttribute('data-hs')];
        tweenVec(k.slice(), tgt, 460, function (x, y) { k = [x, y]; render(); }, function () { k = tgt.slice(); render(); });
      };
    });
    if (card) { var rb = card.querySelector('[data-reset="f3"]'); if (rb) rb.onclick = function () { k = [0, 0]; toastShown = false; render(); }; }

    onResize(root, build);
    build();
  })();

  /* ══════════════════════════════════════════════════════════════════
     F5 — gap slider Δ_AB
     ══════════════════════════════════════════════════════════════════ */
  (function F5() {
    var root = document.getElementById('gv-f5');
    if (!root) return;
    var card = root.closest('.anim-card');
    var slider = document.getElementById('f5-d'), out = document.getElementById('f5-d-o');
    var eqBtn = document.getElementById('f5-eqbtn'), eqBox = document.getElementById('f5-eq');
    var delta = parseFloat(slider.value);
    var HVF = 0.9, QMAX = 1, EMAX = 1.18, P = {};

    function build() {
      clear(root);
      var row = htm('div', 'gv-row gv-one', root);
      var p = panel(row, 'quant', 'Bands near K', 'K点近傍のバンド');
      var W = stageW(p); if (!W) { P = {}; return; }
      var H = Math.max(210, Math.min(W * 0.5, 280)); size(p, W, H);
      var padL = 40, padR = 18, padT = 16, padB = 30, cx = (padL + W - padR) / 2, cy = (padT + H - padB) / 2;
      var sx = (W - padL - padR) / 2 / QMAX, sy = (H - padT - padB) / 2 / EMAX;
      function X(q) { return cx + q * sx; } function Y(E) { return cy - E * sy; }
      P = { p: p, X: X, Y: Y, cx: cx, cy: cy, padT: padT };

      el('line', { x1: padL, y1: cy, x2: W - padR, y2: cy, stroke: COL.axis }, p.svg);
      el('line', { x1: cx, y1: padT, x2: cx, y2: H - padB, stroke: COL.grid2 }, p.svg);
      label(p.stage, W - padR, cy + 13, '$q$', 'gv-mut');
      label(p.stage, cx - 4, padT - 1, '$E$', 'gv-mut');
      label(p.stage, cx, H - padB + 14, '$K$', 'gv-mut');

      function para(sgn) {
        var d = []; for (var i = 0; i <= 40; i++) { var q = -QMAX + 2 * QMAX * i / 40; d.push((i ? 'L' : 'M') + X(q).toFixed(1) + ' ' + Y(sgn * (0.34 + 0.62 * q * q)).toFixed(1)); }
        return d.join(' ');
      }
      el('path', { d: para(1), fill: 'none', stroke: COL.semi, 'stroke-width': 1.3, 'stroke-dasharray': '4 4' }, p.svg);
      el('path', { d: para(-1), fill: 'none', stroke: COL.semi, 'stroke-width': 1.3, 'stroke-dasharray': '4 4' }, p.svg);

      P.asy = [
        el('line', { x1: X(0), y1: Y(0), x2: X(QMAX), y2: Y(HVF * QMAX), stroke: 'rgba(245,245,244,.22)', 'stroke-dasharray': '2 3' }, p.svg),
        el('line', { x1: X(0), y1: Y(0), x2: X(-QMAX), y2: Y(HVF * QMAX), stroke: 'rgba(245,245,244,.22)', 'stroke-dasharray': '2 3' }, p.svg),
        el('line', { x1: X(0), y1: Y(0), x2: X(QMAX), y2: Y(-HVF * QMAX), stroke: 'rgba(245,245,244,.22)', 'stroke-dasharray': '2 3' }, p.svg),
        el('line', { x1: X(0), y1: Y(0), x2: X(-QMAX), y2: Y(-HVF * QMAX), stroke: 'rgba(245,245,244,.22)', 'stroke-dasharray': '2 3' }, p.svg)
      ];

      P.up = el('path', { d: '', fill: 'none', stroke: COL.anti, 'stroke-width': 2.4 }, p.svg);
      P.lo = el('path', { d: '', fill: 'none', stroke: COL.bond, 'stroke-width': 2.4 }, p.svg);
      P.gapline = el('line', { stroke: COL.snap, 'stroke-width': 1.4, 'stroke-dasharray': '3 2' }, p.svg);
      P.gapTxt = label(p.stage, X(0) + 8, cy, '', 'gv-num gv-al');

      P.insA = el('circle', { cx: W - padR - 30, r: 4.5, fill: COL.A }, p.svg);
      P.insB = el('circle', { cx: W - padR - 12, r: 4.5, fill: COL.B }, p.svg);
      label(p.stage, W - padR - 21, padT + 2, bi('A / B seats', 'A / B 席'), 'gv-mut');

      var lg = htm('div', 'gv-legend', root);
      lg.innerHTML =
        '<span><i style="background:' + COL.anti + '"></i><i style="background:' + COL.bond + '"></i>' + bi('graphene', 'グラフェン') + '</span>' +
        '<span><i style="background:' + COL.semi + '"></i>' + bi('ordinary semiconductor (parabolic, gapped)', 'ふつうの半導体（放物線・ギャップ）') + '</span>';

      whenKatex(function () { renderMath(root); });
      render();
    }

    function render() {
      if (!P.X) return;
      var X = P.X, Y = P.Y, m = delta / 2;
      function path(sgn) {
        var d = [];
        for (var i = 0; i <= 60; i++) {
          var q = -QMAX + 2 * QMAX * i / 60;
          d.push((i ? 'L' : 'M') + X(q).toFixed(1) + ' ' + Y(sgn * Math.sqrt(HVF * HVF * q * q + m * m)).toFixed(1));
        }
        return d.join(' ');
      }
      P.up.setAttribute('d', path(1));
      P.lo.setAttribute('d', path(-1));
      var gapped = delta > 1e-6;
      P.asy.forEach(function (a) { a.style.display = gapped ? '' : 'none'; });
      P.gapline.setAttribute('x1', X(0)); P.gapline.setAttribute('x2', X(0));
      P.gapline.setAttribute('y1', Y(m)); P.gapline.setAttribute('y2', Y(-m));
      P.gapline.style.display = gapped ? '' : 'none';
      P.gapTxt.style.top = P.cy + 'px';
      P.gapTxt.innerHTML = '$\\mathrm{gap}=$&nbsp;<span class="num">' + delta.toFixed(2) + '</span>&nbsp;eV';
      whenKatex(function () { renderMath(P.gapTxt); });
      var off = delta * 9;
      P.insA.setAttribute('cy', P.padT + 12 + off / 2);
      P.insB.setAttribute('cy', P.padT + 12 - off / 2);
    }

    slider.addEventListener('input', function () { delta = parseFloat(slider.value); out.textContent = delta.toFixed(2) + ' eV'; render(); });
    eqBtn.onclick = function () { eqBox.classList.toggle('is-open'); eqBtn.innerHTML = eqBox.classList.contains('is-open') ? bi('Hide the formula', '式を隠す') : bi('Show the formula', '式を見る'); };
    if (card) { var rb = card.querySelector('[data-reset="f5"]'); if (rb) rb.onclick = function () { delta = 0; slider.value = '0'; out.textContent = '0.00 eV'; render(); }; }
    onResize(root, build);
    build();
  })();

  /* ══════════════════════════════════════════════════════════════════
     F2 — N-ring → band
     ══════════════════════════════════════════════════════════════════ */
  (function F2() {
    var root = document.getElementById('gv-f2');
    if (!root) return;
    var card = root.closest('.anim-card');
    var slider = document.getElementById('f2-n'), out = document.getElementById('f2-n-o');
    var NS = [4, 6, 8, 12, 20, 40, 80];
    var N = NS[parseInt(slider.value, 10)] || 8, P = {}, pts = [];

    function build() {
      clear(root);
      var row = htm('div', 'gv-row gv-one', root);
      var p = panel(row, 'quant', 'Ring states on $E(\\phi)$', '$E(\\phi)$上の輪の状態');
      var W = stageW(p); if (!W) { P = {}; return; }
      var H = Math.max(210, Math.min(W * 0.52, 280)); size(p, W, H);
      var padL = 52, padR = 56, padT = 18, padB = 32, x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
      var amp = 2 * T_EV;
      function X(phi) { return x0 + (phi / (2 * Math.PI)) * (x1 - x0); }
      function Y(E) { return (y0 + y1) / 2 - (E / (2 * amp)) * (y0 - y1); }
      P = { p: p, X: X, Y: Y };

      el('line', { x1: x0, y1: Y(0), x2: x1, y2: Y(0), stroke: COL.grid2 }, p.svg);
      el('line', { x1: x0, y1: y1, x2: x0, y2: y0, stroke: COL.axis }, p.svg);
      ['0', '\\pi', '2\\pi'].forEach(function (tx, i) { label(p.stage, X(i * Math.PI), y0 + 12, '$' + tx + '$', 'gv-mut'); });
      label(p.stage, (x0 + x1) / 2, y0 + 24, '$\\phi$', 'gv-mut');
      label(p.stage, x0 - 7, y1 + 4, '$E$', 'gv-mut');
      label(p.stage, x0 - 26, Y(amp), '$\\varepsilon_0\\!+\\!2t$', 'gv-mut');
      label(p.stage, x0 - 26, Y(-amp), '$\\varepsilon_0\\!-\\!2t$', 'gv-mut');

      var d = [];
      for (var i = 0; i <= 120; i++) { var phi = 2 * Math.PI * i / 120; d.push((i ? 'L' : 'M') + X(phi).toFixed(1) + ' ' + Y(PH.chainE(phi, T_EV, 0)).toFixed(1)); }
      el('path', { d: d.join(' '), fill: 'none', stroke: 'rgba(245,245,244,.28)', 'stroke-width': 1.4 }, p.svg);

      el('line', { x1: x1 + 16, y1: Y(amp), x2: x1 + 16, y2: Y(-amp), stroke: COL.grid2 }, p.svg);
      label(p.stage, x1 + 32, (Y(amp) + Y(-amp)) / 2, bi('band', 'バンド'), 'gv-mut');

      P.layer = el('g', {}, p.svg);
      pts = [];
      whenKatex(function () { renderMath(root); });
      draw(true);
    }

    function draw(initial) {
      if (!P.layer) return;
      var X = P.X, Y = P.Y, allowed = PH.allowedPhi(N);
      pts.forEach(function (c) { c.style.transition = REDUCED ? '' : 'opacity .32s ease'; c.style.opacity = '0'; setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, REDUCED ? 0 : 340); });
      pts = [];
      allowed.forEach(function (phi) {
        var col = lerpHex(COL.elec, COL.snap, (1 - Math.cos(phi)) / 2);
        var c = el('circle', { cx: X(phi), cy: Y(PH.chainE(phi, T_EV, 0)), r: 4.2, fill: col, stroke: 'rgba(0,0,0,.25)', 'stroke-width': .6 }, P.layer);
        if (!REDUCED && !initial) { c.style.opacity = '0'; c.style.transition = 'opacity .34s ease'; requestAnimationFrame(function () { c.style.opacity = '1'; }); }
        pts.push(c);
      });
    }

    slider.addEventListener('input', function () { N = NS[parseInt(slider.value, 10)]; out.textContent = N; draw(false); });
    if (card) { var rb = card.querySelector('[data-reset="f2"]'); if (rb) rb.onclick = function () { slider.value = '2'; N = 8; out.textContent = '8'; draw(false); }; }
    onResize(root, build);
    build();
  })();

  /* ══════════════════════════════════════════════════════════════════
     F6 — Fermi level: cone fill + density of states
     ══════════════════════════════════════════════════════════════════ */
  (function F6() {
    var root = document.getElementById('gv-f6');
    if (!root) return;
    var card = root.closest('.anim-card');
    var slider = document.getElementById('f6-ef'), out = document.getElementById('f6-ef-o');
    var EF = parseFloat(slider.value), VF = 0.6, QMAX = 1, EMAX = 0.62, P = {};

    function build() {
      clear(root);
      var row = htm('div', 'gv-row gv6', root);
      var cone = panel(row, 'quant', 'Dirac cone (cross-section)', 'ディラック錐（断面）');
      var dos = panel(row, 'quant', 'Density of states', '状態密度');
      drawCone(cone); drawDOS(dos);
      P = { cone: cone, dos: dos };
      var lg = htm('div', 'gv-legend', root);
      lg.innerHTML = '<span><i class="dot" style="background:' + COL.elec + '"></i>' + bi('electrons (filled)', '電子（占有）') + '</span>' +
        '<span><i class="dot" style="background:' + COL.hole + '"></i>' + bi('holes (empty seats)', '正孔（空席）') + '</span>';
      whenKatex(function () { renderMath(root); });
      render();
    }

    function drawCone(p) {
      var W = stageW(p); if (!W) { p.X = null; return; }
      var H = Math.max(200, Math.min(W, 250)); size(p, W, H);
      var padL = 34, padR = 16, padT = 16, padB = 28, cx = (padL + W - padR) / 2, cy = (padT + H - padB) / 2;
      var sx = (W - padL - padR) / 2 / QMAX, sy = (H - padT - padB) / 2 / EMAX;
      function X(q) { return cx + q * sx; } function Y(E) { return cy - E * sy; }
      p.X = X; p.Y = Y; p.cx = cx; p.cy = cy; p.padL = padL;
      el('line', { x1: padL, y1: cy, x2: W - padR, y2: cy, stroke: COL.grid2 }, p.svg);
      el('line', { x1: cx, y1: padT, x2: cx, y2: H - padB, stroke: COL.grid2 }, p.svg);
      label(p.stage, W - padR, cy + 13, '$q$', 'gv-mut');
      label(p.stage, cx - 4, padT - 1, '$E$', 'gv-mut');
      p.fill = el('polygon', { points: '', opacity: .5 }, p.svg);
      el('line', { x1: X(-QMAX), y1: Y(VF * QMAX), x2: X(0), y2: Y(0), stroke: COL.anti, 'stroke-width': 2.2 }, p.svg);
      el('line', { x1: X(0), y1: Y(0), x2: X(QMAX), y2: Y(VF * QMAX), stroke: COL.anti, 'stroke-width': 2.2 }, p.svg);
      el('line', { x1: X(-QMAX), y1: Y(-VF * QMAX), x2: X(0), y2: Y(0), stroke: COL.bond, 'stroke-width': 2.2 }, p.svg);
      el('line', { x1: X(0), y1: Y(0), x2: X(QMAX), y2: Y(-VF * QMAX), stroke: COL.bond, 'stroke-width': 2.2 }, p.svg);
      p.ef = el('line', { x1: padL, x2: W - padR, stroke: COL.fermi, 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }, p.svg);
      p.efLab = label(p.stage, padL + 2, Y(0), '$E_F$', 'gv-mut'); p.efLab.style.transform = 'translateY(-50%)';
    }
    function drawDOS(p) {
      // conventional graphene DOS: E on the horizontal axis, D(E) (states per
      // unit energy) on the vertical — a V with its zero at the Dirac point.
      var W = stageW(p); if (!W) { p.X = null; return; }
      var H = Math.max(200, Math.min(W, 250)); size(p, W, H);
      var padL = 30, padR = 16, padT = 18, padB = 30, x0 = padL, x1 = W - padR, y0 = H - padB, yT = padT, cE = (x0 + x1) / 2;
      var DMAX = EMAX, sX = (x1 - x0) / 2 / EMAX, sY = (y0 - yT) / DMAX;
      function Xe(E) { return cE + E * sX; } function Yd(D) { return y0 - D * sY; }
      p.Xe = Xe; p.Yd = Yd; p.cE = cE; p.X = Xe;
      el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: COL.axis }, p.svg);     // E axis (D = 0)
      el('line', { x1: cE, y1: yT, x2: cE, y2: y0, stroke: COL.grid }, p.svg);      // E = 0 guide
      label(p.stage, x1, y0 + 13, '$E$', 'gv-mut');
      label(p.stage, x0 + 9, yT + 2, '$D(E)$', 'gv-mut gv-tl');
      label(p.stage, cE, y0 + 13, '$0$', 'gv-mut');
      el('path', { d: 'M' + Xe(-EMAX) + ' ' + Yd(EMAX) + ' L' + Xe(0) + ' ' + Yd(0), fill: 'none', stroke: COL.bond, 'stroke-width': 2.2 }, p.svg);
      el('path', { d: 'M' + Xe(0) + ' ' + Yd(0) + ' L' + Xe(EMAX) + ' ' + Yd(EMAX), fill: 'none', stroke: COL.anti, 'stroke-width': 2.2 }, p.svg);
      p.efLine = el('line', { y1: yT, y2: y0, stroke: COL.fermi, 'stroke-width': 1.4, 'stroke-dasharray': '5 3' }, p.svg);   // vertical at E_F
      p.efMark = el('circle', { r: 4, fill: COL.snap }, p.svg);
      p.dval = label(p.stage, x0 + 9, yT + 18, '', 'gv-num gv-tl');
    }

    function render() {
      if (!P.cone || P.cone.X == null || P.dos.X == null) return;
      var c = P.cone, X = c.X, Y = c.Y, yEF = Y(EF);
      c.ef.setAttribute('y1', yEF); c.ef.setAttribute('y2', yEF);
      c.efLab.style.top = yEF + 'px';
      if (EF >= 0) {
        var qf = EF / VF;
        c.fill.setAttribute('points', [X(0) + ',' + Y(0), X(-qf) + ',' + Y(EF), X(qf) + ',' + Y(EF)].join(' '));
        c.fill.setAttribute('fill', COL.elec);
      } else {
        var qh = (-EF) / VF;
        c.fill.setAttribute('points', [X(0) + ',' + Y(0), X(-qh) + ',' + Y(EF), X(qh) + ',' + Y(EF)].join(' '));
        c.fill.setAttribute('fill', COL.hole);
      }
      c.fill.style.display = Math.abs(EF) < 1e-3 ? 'none' : '';
      var d = P.dos, xef = d.Xe(EF), Dv = PH.diracDOS(EF, 1);
      d.efLine.setAttribute('x1', xef); d.efLine.setAttribute('x2', xef);
      d.efMark.setAttribute('cx', xef); d.efMark.setAttribute('cy', d.Yd(Dv));
      d.dval.innerHTML = '$D(E_F)=$&nbsp;<span class="num">' + Dv.toFixed(2) + '</span>' + (Math.abs(EF) < 1e-3 ? '&nbsp;(=0)' : '');
      whenKatex(function () { renderMath(d.dval); });
    }

    slider.addEventListener('input', function () { EF = parseFloat(slider.value); out.textContent = (EF < 0 ? '−' : '') + Math.abs(EF).toFixed(2) + ' eV'; render(); });
    if (card) { var rb = card.querySelector('[data-reset="f6"]'); if (rb) rb.onclick = function () { EF = 0; slider.value = '0'; out.textContent = '0.00 eV'; render(); }; }
    onResize(root, build);
    build();
  })();

  /* ══════════════════════════════════════════════════════════════════
     F1 — bonding / antibonding seesaw  (lightweight)
     ══════════════════════════════════════════════════════════════════ */
  (function F1() {
    var root = document.getElementById('gv-f1');
    if (!root) return;
    var card = root.closest('.anim-card');
    var slider = document.getElementById('f1-t'), out = document.getElementById('f1-t-o');
    var t = parseFloat(slider.value), P = {};

    function build() {
      clear(root);
      var row = htm('div', 'gv-row gv1', root);
      var orb = panel(row, 'schematic', 'Two orbitals', '二つの軌道');
      var wav = panel(row, 'quant', 'Amplitudes', '振幅の形');
      var lev = panel(row, 'quant', 'Energy levels', 'エネルギー準位');
      drawOrb(orb); drawWav(wav); drawLev(lev);
      P = { lev: lev };
      whenKatex(function () { renderMath(root); });
      render();
    }

    function drawOrb(p) {
      var W = stageW(p); if (!W) return; var H = Math.max(150, Math.min(W * 0.9, 190)); size(p, W, H);
      var cy = H / 2, xA = W * 0.32, xB = W * 0.68, r = Math.min(W, H) * 0.17;
      el('ellipse', { cx: (xA + xB) / 2, cy: cy, rx: (xB - xA) / 2 + r, ry: r * 0.9, fill: 'rgba(245,245,244,.05)' }, p.svg);
      el('circle', { cx: xA, cy: cy, r: r, fill: 'none', stroke: COL.A, 'stroke-width': 2 }, p.svg);
      el('circle', { cx: xB, cy: cy, r: r, fill: 'none', stroke: COL.B, 'stroke-width': 2 }, p.svg);
      el('circle', { cx: xA, cy: cy, r: 3, fill: COL.A }, p.svg);
      el('circle', { cx: xB, cy: cy, r: 3, fill: COL.B }, p.svg);
      label(p.stage, xA, cy + r + 12, '$|A\\rangle$', 'gv-mut');
      label(p.stage, xB, cy + r + 12, '$|B\\rangle$', 'gv-mut');
      htm('div', 'gv-pin', p.panel).innerHTML = bi('overlap lets the electron hop with $t$', '重なりで電子が $t$ で飛び移る');
    }

    function drawWav(p) {
      var W = stageW(p); if (!W) return; var H = Math.max(170, Math.min(W * 0.9, 210)); size(p, W, H);
      var xA = W * 0.30, xB = W * 0.70, sp = (xB - xA), midY1 = H * 0.30, midY2 = H * 0.74, amp = H * 0.14;
      function wave(yc, anti) {
        var d = [], n = 80;
        for (var i = 0; i <= n; i++) {
          var x = W * 0.12 + (W * 0.76) * i / n;
          var gA = Math.exp(-Math.pow((x - xA) / (sp * 0.34), 2));
          var gB = Math.exp(-Math.pow((x - xB) / (sp * 0.34), 2)) * (anti ? -1 : 1);
          d.push((i ? 'L' : 'M') + x.toFixed(1) + ' ' + (yc - (gA + gB) * amp).toFixed(1));
        }
        return d.join(' ');
      }
      el('line', { x1: W * 0.1, y1: midY1, x2: W * 0.9, y2: midY1, stroke: COL.grid }, p.svg);
      el('path', { d: wave(midY1, false), fill: 'none', stroke: COL.bond, 'stroke-width': 2.4 }, p.svg);
      label(p.stage, W * 0.14, midY1 - amp - 7, bi('bonding · 0 nodes', '結合・節0'), 'gv-mut');
      el('line', { x1: W * 0.1, y1: midY2, x2: W * 0.9, y2: midY2, stroke: COL.grid }, p.svg);
      el('path', { d: wave(midY2, true), fill: 'none', stroke: COL.anti, 'stroke-width': 2.4 }, p.svg);
      el('circle', { cx: (xA + xB) / 2, cy: midY2, r: 2.6, fill: COL.snap }, p.svg);
      label(p.stage, (xA + xB) / 2, midY2 + amp + 9, bi('node', '節'), 'gv-mut');
      label(p.stage, W * 0.16, midY2 - amp - 7, bi('antibonding · 1 node', '反結合・節1'), 'gv-mut');
      [xA, xB].forEach(function (x) { el('line', { x1: x, y1: midY1 + amp + 3, x2: x, y2: midY1 + amp + 8, stroke: COL.faint }, p.svg); });
    }

    function drawLev(p) {
      var W = stageW(p); if (!W) return; var H = Math.max(170, Math.min(W * 1.1, 210)); size(p, W, H);
      var cx = W / 2, cy = H / 2, bw = Math.min(W * 0.32, 64), sE = (H / 2 - 34) / 1;
      p.cx = cx; p.cy = cy; p.bw = bw; p.sE = sE;
      el('line', { x1: cx, y1: 18, x2: cx, y2: H - 18, stroke: COL.axis }, p.svg);
      el('line', { x1: cx - bw, y1: cy, x2: cx + bw, y2: cy, stroke: COL.grid2, 'stroke-dasharray': '4 3' }, p.svg);
      label(p.stage, cx, 7, '$E$', 'gv-mut');
      label(p.stage, cx + bw + 6, cy, '$\\varepsilon_0$', 'gv-mut');
      p.barU = el('line', { x1: cx - bw, x2: cx + bw, stroke: COL.anti, 'stroke-width': 4, 'stroke-linecap': 'round' }, p.svg);
      p.barL = el('line', { x1: cx - bw, x2: cx + bw, stroke: COL.bond, 'stroke-width': 4, 'stroke-linecap': 'round' }, p.svg);
      p.labU = label(p.stage, cx - bw - 6, cy, '$\\varepsilon_0+t$', 'gv-mut'); p.labU.style.transform = 'translate(-100%,-50%)';
      p.labL = label(p.stage, cx - bw - 6, cy, '$\\varepsilon_0-t$', 'gv-mut'); p.labL.style.transform = 'translate(-100%,-50%)';
      p.gap = label(p.stage, cx + bw + 6, cy, '$2t$', 'gv-mut');
      p.far = label(p.stage, cx, cy - 14, bi('far apart (degenerate)', '離れている（縮退）'), 'gv-mut');
      p.far.style.display = 'none';
    }

    function render() {
      var p = P.lev; if (!p || p.cx == null) return;
      var off = t * p.sE, yU = p.cy - off, yL = p.cy + off;
      p.barU.setAttribute('y1', yU); p.barU.setAttribute('y2', yU);
      p.barL.setAttribute('y1', yL); p.barL.setAttribute('y2', yL);
      p.labU.style.top = yU + 'px'; p.labL.style.top = yL + 'px';
      p.gap.style.top = p.cy + 'px';
      var deg = t < 0.04;
      p.far.style.display = deg ? '' : 'none';
      p.labU.style.opacity = p.labL.style.opacity = deg ? '0.25' : '1';
    }

    slider.addEventListener('input', function () { t = parseFloat(slider.value); out.textContent = t.toFixed(2); render(); });
    if (card) { var rb = card.querySelector('[data-reset="f1"]'); if (rb) rb.onclick = function () { t = 0.4; slider.value = '0.4'; out.textContent = '0.40'; render(); }; }
    onResize(root, build);
    build();
  })();

  /* ══════════════════════════════════════════════════════════════════
     F4 — two bands along Γ→M→K→Γ  (static)
     ══════════════════════════════════════════════════════════════════ */
  (function F4() {
    var root = document.getElementById('gv-f4');
    if (!root) return;

    function build() {
      clear(root);
      var row = htm('div', 'gv-row gv-one', root);
      var p = panel(row, 'quant', 'Bands along $\\Gamma\\!\\to\\!M\\!\\to\\!K\\!\\to\\!\\Gamma$', 'バンド $\\Gamma\\!\\to\\!M\\!\\to\\!K\\!\\to\\!\\Gamma$');
      var W = stageW(p); if (!W) return;
      var H = Math.max(220, Math.min(W * 0.52, 300)); size(p, W, H);
      var padL = 44, padR = 18, padT = 18, padB = 30, x0 = padL, x1 = W - padR, yMid = (padT + H - padB) / 2;
      var sE = (H / 2 - padT) / (3 * T_EV);
      function Y(E) { return yMid - E * sE; }

      var legs = [[PH.HS.G, PH.HS.M], [PH.HS.M, PH.HS.K], [PH.HS.K, PH.HS.G]];
      var lens = legs.map(function (lg) { return Math.hypot(lg[1][0] - lg[0][0], lg[1][1] - lg[0][1]); });
      var total = lens[0] + lens[1] + lens[2], samples = [], cum = 0, marks = [0];
      legs.forEach(function (lg, li) {
        var nseg = 60;
        for (var i = 0; i <= nseg; i++) {
          if (li > 0 && i === 0) continue;
          var u = i / nseg, kx = lg[0][0] + (lg[1][0] - lg[0][0]) * u, ky = lg[0][1] + (lg[1][1] - lg[0][1]) * u;
          var frac = (cum + lens[li] * u) / total;
          samples.push({ x: x0 + frac * (x1 - x0), m: PH.fOfK(kx, ky).mod });
        }
        cum += lens[li]; marks.push(cum / total);
      });
      function X(frac) { return x0 + frac * (x1 - x0); }

      var lowPath = samples.map(function (s, i) { return (i ? 'L' : 'M') + s.x.toFixed(1) + ' ' + Y(-T_EV * s.m).toFixed(1); }).join(' ');
      var fill = lowPath + ' L' + x1.toFixed(1) + ' ' + (H - padB).toFixed(1) + ' L' + x0.toFixed(1) + ' ' + (H - padB).toFixed(1) + ' Z';
      el('path', { d: fill, fill: 'rgba(95,183,176,.16)', stroke: 'none' }, p.svg);

      el('line', { x1: x0, y1: padT, x2: x0, y2: H - padB, stroke: COL.axis }, p.svg);
      el('line', { x1: x0, y1: Y(0), x2: x1, y2: Y(0), stroke: COL.grid2, 'stroke-dasharray': '5 3' }, p.svg);
      label(p.stage, x1 - 2, Y(0) - 9, bi('$E_F$ (Fermi)', '$E_F$（フェルミ）'), 'gv-mut');
      label(p.stage, x0 - 8, padT, '$E$', 'gv-mut');

      el('path', { d: samples.map(function (s, i) { return (i ? 'L' : 'M') + s.x.toFixed(1) + ' ' + Y(T_EV * s.m).toFixed(1); }).join(' '), fill: 'none', stroke: COL.anti, 'stroke-width': 2.4 }, p.svg);
      el('path', { d: lowPath, fill: 'none', stroke: COL.bond, 'stroke-width': 2.4 }, p.svg);

      var names = ['$\\Gamma$', '$M$', '$K$', '$\\Gamma$'];
      marks.forEach(function (fr, i) {
        el('line', { x1: X(fr), y1: padT, x2: X(fr), y2: H - padB, stroke: COL.grid }, p.svg);
        label(p.stage, X(fr), H - padB + 13, names[i], 'gv-mut');
      });
      el('circle', { cx: X(marks[2]), cy: Y(0), r: 4, fill: COL.snap }, p.svg);
      label(p.stage, X(marks[2]), Y(0) + 16, bi('$K,K^{\\prime}$: touch', '$K,K^{\\prime}$：接触'), 'gv-mut');
      label(p.stage, X(0.06), Y(2.5 * T_EV), bi('upper (empty)', '上（空）'), 'gv-mut');
      label(p.stage, X(0.06), Y(-2.5 * T_EV), bi('lower (full)', '下（満席）'), 'gv-mut');

      whenKatex(function () { renderMath(root); });
    }
    onResize(root, build);
    build();
  })();

})();
