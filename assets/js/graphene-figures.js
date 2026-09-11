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
    opt = opt || {}; var size = opt.size || 15, color = opt.color || P.ink, align = opt.align || 'left', w = opt.weight || 500;
    ctx.textBaseline = opt.baseline || 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = 'italic ' + w + ' ' + size + 'px ' + SERIF;
    var wMain = ctx.measureText(main).width, subSize = size * 0.7, wSub = 0;
    if (opt.sub != null) { ctx.font = 'italic ' + w + ' ' + subSize + 'px ' + SERIF; wSub = ctx.measureText(opt.sub).width; }
    var total = wMain + wSub, sx = x; if (align === 'center') sx = x - total / 2; else if (align === 'right') sx = x - total;
    ctx.fillStyle = color; ctx.font = 'italic ' + w + ' ' + size + 'px ' + SERIF; ctx.fillText(main, sx, y);
    if (opt.sub != null) { ctx.font = 'italic ' + w + ' ' + subSize + 'px ' + SERIF; ctx.fillText(opt.sub, sx + wMain + 0.5, y + size * 0.19); }
    return total;
  }
  function txt(ctx, x, y, s, opt) {
    opt = opt || {};
    ctx.font = opt.font || ((opt.italic ? 'italic ' : '') + (opt.weight || 500) + ' ' + (opt.size || 13) + 'px ' + SERIF);
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

  // ════════════════════════════════════════════════════════════════════
  //  Figure A — 1D tight-binding band curve  E(k) = ε − 2t cos(ka)
  //  Shows only: the cosine spread about ε, and the bandwidth 4|t|.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-bandcurve'); if (!canvas) return;
    var sT = document.getElementById('bc-t'), oT = document.getElementById('bc-t-o');
    var sE = document.getElementById('bc-e'), oE = document.getElementById('bc-e-o');
    var sN = document.getElementById('bc-n'), oN = document.getElementById('bc-n-o'), status = document.getElementById('bc-status');
    var kMax = PI, Emax = 9.6;
    var ubT = bindBubble(sT, oT, function (v) { return v.toFixed(2) + ' eV'; });
    var ubE = bindBubble(sE, oE, function (v) { return v.toFixed(1) + ' eV'; });
    var ubN = bindBubble(sN, oN, function (v) { return String(Math.round(v)); });

    function draw() {
      var o = dpr(canvas, 330), ctx = o.ctx, W = o.w, H = o.h;
      var t = +sT.value, eps = +sE.value, N = Math.round(+sN.value), ja = curLang() === 'ja';
      ground(ctx, W, H);
      var pad = { l: 46, r: 104, t: 32, b: 48 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
      function sx(k) { return pad.l + (k + kMax) / (2 * kMax) * pw; }
      function sy(E) { return pad.t + (1 - (E + Emax) / (2 * Emax)) * ph; }
      var x0 = sx(0), y0 = sy(0), Etop = eps + 2 * t, Ebot = eps - 2 * t;

      // band-edge level lines (faint, full width — they touch the curve at its extrema)
      ctx.lineWidth = 1; ctx.strokeStyle = P.rgba(P.neut, 0.2); ctx.setLineDash([5, 4]);
      [Etop, Ebot].forEach(function (E) { ctx.beginPath(); ctx.moveTo(pad.l, sy(E)); ctx.lineTo(pad.l + pw, sy(E)); ctx.stroke(); });
      ctx.setLineDash([]);
      // ε centre line
      ctx.strokeStyle = P.rgba(P.terra, 0.5); ctx.setLineDash([2, 3]); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(pad.l, sy(eps)); ctx.lineTo(pad.l + pw, sy(eps)); ctx.stroke(); ctx.setLineDash([]);

      // axes
      arrow(ctx, pad.l - 10, y0, pad.l + pw + 10, y0, P.axis);
      arrow(ctx, x0, sy(-Emax) + 2, x0, pad.t - 10, P.axis);
      mvar(ctx, pad.l + pw + 14, y0 + 5, 'k', { color: P.ink2, size: 16 });
      mvar(ctx, x0 - 8, pad.t - 13, 'E', { color: P.ink2, size: 16, align: 'right' });

      // ±π/a ticks + labels below the k axis
      ctx.strokeStyle = P.axis; ctx.lineWidth = 1;
      [[-kMax, '−π/a'], [kMax, 'π/a']].forEach(function (tk) {
        var xx = sx(tk[0]); ctx.beginPath(); ctx.moveTo(xx, y0 - 3); ctx.lineTo(xx, y0 + 3); ctx.stroke();
        txt(ctx, xx, y0 + 21, tk[1], { color: P.ink3, size: 13, align: 'center', italic: true });
      });

      // ε label (left, at the ε line)
      mvar(ctx, pad.l - 12, sy(eps) + 4, 'ε', { color: P.eLine, size: 15, align: 'right' });

      // 4|t| bandwidth dimension line, OUTSIDE the curve and well clear of the k-axis arrow/label
      var dimX = pad.l + pw + 56;
      if (abs(sy(Etop) - sy(Ebot)) > 3) {
        ctx.strokeStyle = P.rgba(P.neut, 0.32); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(pad.l + pw, sy(Etop)); ctx.lineTo(dimX, sy(Etop)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad.l + pw, sy(Ebot)); ctx.lineTo(dimX, sy(Ebot)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = P.ink2; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(dimX, sy(Etop)); ctx.lineTo(dimX, sy(Ebot)); ctx.stroke();
        ahead(ctx, dimX, sy(Etop), 0, -1); ahead(ctx, dimX, sy(Ebot), 0, 1);
        ctx.save(); ctx.translate(dimX + 12, (sy(Etop) + sy(Ebot)) / 2); ctx.rotate(-PI / 2);
        txt(ctx, 0, 0, '4|t|', { color: P.ink2, size: 13.5, align: 'center', italic: true }); ctx.restore();
      } else {
        txt(ctx, dimX - 4, y0 - 7, '4|t| = 0', { color: P.ink3, size: 12, italic: true });
      }

      // the band curve
      ctx.strokeStyle = P.curve; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (var i = 0; i <= 320; i++) { var k = -kMax + 2 * kMax * i / 320, E = eps - 2 * t * cos(k); var X = sx(k), Y = sy(E); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
      ctx.stroke();
      // anchor dots at the band extrema
      ctx.fillStyle = P.curve;
      [[0, eps - 2 * t], [kMax, eps + 2 * t], [-kMax, eps + 2 * t]].forEach(function (p) { ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), 3, 0, 2 * PI); ctx.fill(); });
      // N allowed k values for a finite periodic chain.  The points become a
      // visually continuous band as N grows, while their number stays explicit.
      for (var n = -N / 2 + 1; n <= N / 2; n++) {
        var kn = 2 * PI * n / N, En = eps - 2 * t * cos(kn);
        ctx.beginPath(); ctx.arc(sx(kn), sy(En), 4.2, 0, 2 * PI);
        ctx.fillStyle = P.rgb(P.plate); ctx.fill(); ctx.strokeStyle = P.curve; ctx.lineWidth = 1.5; ctx.stroke();
      }
      status.textContent = ja ? (N + ' 単位胞 → ' + N + ' 個の k と ' + N + ' 個のエネルギー準位。バンド幅 4|t| = ' + (4 * abs(t)).toFixed(2) + ' eV') : (N + ' cells → ' + N + ' k values and ' + N + ' energy levels; bandwidth 4|t| = ' + (4 * abs(t)).toFixed(2) + ' eV');
    }
    sT.addEventListener('input', function () { ubT(); draw(); });
    sE.addEventListener('input', function () { ubE(); draw(); });
    sN.addEventListener('input', function () { ubN(); draw(); });
    window.addEventListener('resize', function () { ubT(); ubE(); ubN(); draw(); });
    onLang(draw);
    draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure 1.1 — a chain of equally-spaced atoms with localized orbitals.
  //  Shows ONLY equal spacing, localized orbitals, and their TAILS OVERLAPPING
  //  between neighbours (narrow a ⇒ more overlap). No sign/phase, no energy axis.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-chain'); if (!canvas) return;
    var sA = document.getElementById('c11-a'), oA = document.getElementById('c11-a-o');
    var ubA = bindBubble(sA, oA, function (v) { return v.toFixed(2); });
    function draw() {
      var o = dpr(canvas, 250), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      var a = +sA.value, w = 24, aPx = a * 38, baseY = H * 0.64, cx = W / 2, amp = 60;
      function orb(d) { return amp * Math.exp(-(d * d) / (2 * w * w)); }   // localized, all-positive envelope (no sign / phase)
      var xs = [], half = Math.ceil(W / aPx / 2) + 1;
      for (var i = -half; i <= half; i++) xs.push(cx + i * aPx);
      ctx.strokeStyle = P.rgba(P.neut, 0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, baseY); ctx.lineTo(W - 12, baseY); ctx.stroke();
      // orbital fills — translucent 蘇芳; neighbours' overlapping tails ADD up (darker) ⇒ the overlap reads directly
      xs.forEach(function (xc) {
        ctx.beginPath(); ctx.moveTo(xc - 3.6 * w, baseY);
        for (var x = xc - 3.6 * w; x <= xc + 3.6 * w; x += 2) ctx.lineTo(x, baseY - orb(x - xc));
        ctx.lineTo(xc + 3.6 * w, baseY); ctx.closePath();
        ctx.fillStyle = P.rgba(P.suo, 0.15); ctx.fill();
      });
      // orbital outlines (each localized orbital stays legible through the overlap)
      ctx.strokeStyle = P.rgba(P.suo, 0.55); ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
      xs.forEach(function (xc) {
        ctx.beginPath(); var st = false;
        for (var x = xc - 3.6 * w; x <= xc + 3.6 * w; x += 2) { var Y = baseY - orb(x - xc); if (!st) { ctx.moveTo(x, Y); st = true; } else ctx.lineTo(x, Y); }
        ctx.stroke();
      });
      ctx.fillStyle = P.ink;                                   // atom cores on the baseline
      xs.forEach(function (xc) { ctx.beginPath(); ctx.arc(xc, baseY, 3.4, 0, 2 * PI); ctx.fill(); });
      // "a" — equal spacing, dimensioned between the two central atoms
      var xa = cx, xb = cx + aPx, dy = baseY + 22;
      ctx.strokeStyle = P.rgba(P.neut, 0.6); ctx.lineWidth = 1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(xa, baseY + 6); ctx.lineTo(xa, dy + 4); ctx.moveTo(xb, baseY + 6); ctx.lineTo(xb, dy + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xa, dy); ctx.lineTo(xb, dy); ctx.stroke();
      ahead(ctx, xa, dy, -1, 0); ahead(ctx, xb, dy, 1, 0);
      mvar(ctx, (xa + xb) / 2, dy + 16, 'a', { color: P.ink2, size: 14, align: 'center' });
    }
    sA.addEventListener('input', function () { ubA(); draw(); });
    window.addEventListener('resize', function () { ubA(); draw(); });
    draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure 1.2 — two atoms whose orbital tails overlap (left), and the level
  //  diagram (right): the single level ε splits into bonding ε−t (teal, the two
  //  amplitudes SAME sign) and antibonding ε+t (蘇芳, OPPOSITE sign). The ONLY
  //  variable is the hopping t — the split is 2t (linear in t), collapsing to a
  //  single level at ε when t = 0. The spacing a is fixed (not a control).
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-twoatom'); if (!canvas) return;
    var sT = document.getElementById('c12-t'), oT = document.getElementById('c12-t-o');
    function signGlyph(ctx, gx, gy, opposite, col) {   // two atoms + amplitude lobes; same sign vs opposite
      var d = 8.5, rx = 3.8, ry = 7;
      [-1, 1].forEach(function (s) {
        var ax = gx + s * d, up = opposite ? (s < 0) : true;
        ctx.fillStyle = col; ctx.beginPath();
        if (up) ctx.ellipse(ax, gy, rx, ry, 0, PI, 2 * PI); else ctx.ellipse(ax, gy, rx, ry, 0, 0, PI);
        ctx.fill();
        ctx.fillStyle = P.rgb(P.neut); ctx.beginPath(); ctx.arc(ax, gy, 2, 0, 2 * PI); ctx.fill();
      });
    }
    function draw() {
      var o = dpr(canvas, 300), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      var t = +sT.value, midR = H * 0.5, SCALE = H * 0.155;   // FIXED E→px: split = 2·t·SCALE (strictly linear in t)

      // ── LEFT: two atoms, localized orbitals, overlapping tails ──
      var cxA = W * 0.115, cxB = W * 0.285, yB = H * 0.62, ow = W * 0.072, amp = H * 0.30, x;
      function orb(xx, c) { return amp * Math.exp(-((xx - c) * (xx - c)) / (2 * ow * ow)); }
      var xL0 = W * 0.02, xL1 = W * 0.38;
      ctx.beginPath(); ctx.moveTo(xL0, yB);                    // overlap region = area under min of the two tails
      for (x = xL0; x <= xL1; x += 2) ctx.lineTo(x, yB - Math.min(orb(x, cxA), orb(x, cxB)));
      ctx.lineTo(xL1, yB); ctx.closePath(); ctx.fillStyle = P.rgba(P.neut, 0.22); ctx.fill();
      ctx.strokeStyle = P.rgba(P.neut, 0.45); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xL0, yB); ctx.lineTo(xL1, yB); ctx.stroke();
      ctx.strokeStyle = P.structure; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      [cxA, cxB].forEach(function (c) { ctx.beginPath(); var st = false; for (var xx = xL0; xx <= xL1; xx += 1.5) { var Y = yB - orb(xx, c); if (!st) { ctx.moveTo(xx, Y); st = true; } else ctx.lineTo(xx, Y); } ctx.stroke(); });
      ctx.fillStyle = P.rgb(P.neut); [cxA, cxB].forEach(function (c) { ctx.beginPath(); ctx.arc(c, yB, 3.6, 0, 2 * PI); ctx.fill(); });
      var dy = yB + 20;                                        // fixed spacing a (illustrative; not a control)
      ctx.strokeStyle = P.rgba(P.neut, 0.55); ctx.lineWidth = 1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cxA, yB + 6); ctx.lineTo(cxA, dy + 4); ctx.moveTo(cxB, yB + 6); ctx.lineTo(cxB, dy + 4); ctx.moveTo(cxA, dy); ctx.lineTo(cxB, dy); ctx.stroke();
      ahead(ctx, cxA, dy, -1, 0); ahead(ctx, cxB, dy, 1, 0);
      mvar(ctx, (cxA + cxB) / 2, dy + 16, 'a', { color: P.ink2, size: 13, align: 'center' });

      // ── RIGHT: level diagram (ε reference, bonding ε−t, antibonding ε+t) ──
      var axisX = W * 0.48, Lx0 = W * 0.585, Lx1 = W * 0.85, lblX = W * 0.862;
      var top = midR - 2 * SCALE - 16, bot = midR + 2 * SCALE + 16;
      arrow(ctx, axisX, bot, axisX, top, P.axis, 1.2, 6);
      mvar(ctx, axisX - 8, top + 2, 'E', { color: P.ink, size: 14, align: 'right' });
      ctx.strokeStyle = P.rgba(P.neut, 0.5); ctx.setLineDash([5, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(axisX, midR); ctx.lineTo(Lx1, midR); ctx.stroke(); ctx.setLineDash([]);
      mvar(ctx, lblX, midR + 4, 'ε', { color: P.ink, size: 13 });
      var yUp = midR - t * SCALE, yLo = midR + t * SCALE, split = t > 0.05;
      if (split) { signGlyph(ctx, W * 0.55, yUp, true, P.curve); signGlyph(ctx, W * 0.55, yLo, false, P.rgb(P.teal)); }
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.rgb(P.teal); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(Lx0, yLo); ctx.lineTo(Lx1, yLo); ctx.stroke();   // bonding (lower)
      ctx.strokeStyle = P.curve; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(Lx0, yUp); ctx.lineTo(Lx1, yUp); ctx.stroke();          // antibonding (upper)
      if (split) {
        txt(ctx, lblX, yUp + 4, 'ε + t', { color: P.ink, italic: true, size: 12.5, align: 'left' });
        txt(ctx, lblX, yLo + 4, 'ε − t', { color: P.ink, italic: true, size: 12.5, align: 'left' });
      }
    }
    sT.addEventListener('input', function () { oT.textContent = (+sT.value).toFixed(2) + ' eV'; draw(); });
    window.addEventListener('resize', draw);
    oT.textContent = (+sT.value).toFixed(2) + ' eV'; draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure 2.2 — nearest-neighbour vectors δ₁,δ₂,δ₃ (A → its three B's) plus
  //  the primitive vectors a₁,a₂. Geometry only. Highlight one δ at a time,
  //  or WALK the two-step path A→B→A′ that builds a₁ = δ₁ − δ₃ / a₂ = δ₁ − δ₂
  //  (the derivation in the prose, shown as motion).
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-nnvec'); if (!canvas) return;
    var hint = document.getElementById('nn-hint');
    var ids = ['nn-all', 'nn-d1', 'nn-d2', 'nn-d3', 'nn-a1', 'nn-a2'];
    var el = ids.map(function (id) { return document.getElementById(id); });
    var sel = 0, anim = 1, raf = null;
    var HINTS = [
      ['three nearest neighbours, 120° apart (length a)', '最近接の三方向、互いに120°（長さ a）'],
      ['δ₁: straight up, to the B directly above the A', 'δ₁：真上のBへ'],
      ['δ₂: δ₁ rotated by −120°', 'δ₂：δ₁ を −120° 回したもの'],
      ['δ₃: δ₁ rotated by +120°', 'δ₃：δ₁ を +120° 回したもの'],
      ['A → B along δ₁, then B → A′ along −δ₃: the two steps add up to a₁', 'δ₁ でAからBへ、次に −δ₃ でBから隣のAへ：二歩の合計が a₁'],
      ['A → B along δ₁, then B → A′ along −δ₂: the two steps add up to a₂', 'δ₁ でAからBへ、次に −δ₂ でBから隣のAへ：二歩の合計が a₂']
    ];
    function setHint() { if (!hint) return; var h = HINTS[sel]; hint.innerHTML = '<span class="i18n-en">' + h[0] + '</span><span class="i18n-ja">' + h[1] + '</span>'; }
    function setSel(s) {
      sel = s; el.forEach(function (b, i) { if (b) b.classList.toggle('active', i === s); });
      setHint(); cancelAnimationFrame(raf);
      if (s >= 4) { anim = 0; tick(); } else { anim = 1; draw(); }
    }
    function tick() { anim = min(1, anim + 0.013); draw(); if (anim < 1) raf = requestAnimationFrame(tick); }
    el.forEach(function (b, i) { if (b) b.addEventListener('click', function () { setSel(i); }); });

    function draw() {
      var o = dpr(canvas, 320), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
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
    setHint(); draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  // Wave crests on the A rows, followed by their wavevector map.
  // Coordinates use a = 1. The first figure deliberately uses only a1/a2;
  // b1/b2 appear on the map after the prose introduces them geometrically.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var fitCanvas = document.getElementById('fig-wavefit');
    var mapCanvas = document.getElementById('fig-recip');
    if (!fitCanvas && !mapCanvas) return;
    var a1 = [sqrt3 / 2, 1.5], a2 = [-sqrt3 / 2, 1.5];
    var b1 = [2 * PI / sqrt3, 2 * PI / 3], b2 = [-2 * PI / sqrt3, 2 * PI / 3];
    var bLength = 4 * PI / 3;
    function dot(u, v) { return u[0] * v[0] + u[1] * v[1]; }
    function cycles(g, a) { return dot(g, a) / (2 * PI); }
    function fits(g) { return [a1, a2].every(function (a) { var v = cycles(g, a); return abs(v - Math.round(v)) < 1e-7; }); }
    function number(v) { return abs(v - Math.round(v)) < 1e-7 ? String(Math.round(v)) : v.toFixed(2); }
    function label(ctx, x, y, en, ja, opt) {
      opt = opt || {}; opt.font = '500 ' + (opt.size || 12) + 'px ' + (curLang() === 'ja' ? MINCHO : SERIF);
      txt(ctx, x, y, curLang() === 'ja' ? ja : en, opt);
    }
    function wave(ctx, box, g, showMoves) {
      var gl = hypot(g[0], g[1]), ux = gl ? g[0] / gl : 1, uy = gl ? g[1] / gl : 0;
      var scale = min(box.w / 7.7, (box.h - 65) / 6.3, 43);
      var cx = box.x + box.w * 0.5, cy = box.y + box.h * 0.58;
      function pos(x, y) { return [cx + x * scale, cy - y * scale]; }
      ctx.save(); ctx.beginPath(); ctx.rect(box.x + 3, box.y + 34, box.w - 6, box.h - 73); ctx.clip();
      if (gl > 1e-7) {
        var length = hypot(box.w, box.h), lambda = 2 * PI / gl;
        var count = Math.ceil(length / (lambda * scale)) + 1;
        [false, true].forEach(function (trough) {
          ctx.strokeStyle = P.rgba(trough ? P.teal : P.suo, trough ? 0.23 : 0.5);
          ctx.lineWidth = trough ? 1 : 1.6; ctx.setLineDash(trough ? [3, 5] : []);
          for (var n = -count; n <= count; n++) {
            var d = (n + (trough ? 0.5 : 0)) * lambda, p = pos(ux * d, uy * d);
            ctx.beginPath(); ctx.moveTo(p[0] - uy * length, p[1] - ux * length); ctx.lineTo(p[0] + uy * length, p[1] + ux * length); ctx.stroke();
          }
        });
        ctx.setLineDash([]);
      }
      var sites = [];
      for (var m = -5; m <= 5; m++) for (var n = -5; n <= 5; n++) {
        var x = m * a1[0] + n * a2[0], y = m * a1[1] + n * a2[1], p = pos(x, y);
        if (p[0] < box.x - 30 || p[0] > box.x + box.w + 30 || p[1] < box.y || p[1] > box.y + box.h) continue;
        sites.push([x, y, p]);
      }
      ctx.strokeStyle = P.rgba(P.neut, 0.2); ctx.lineWidth = 1;
      sites.forEach(function (v) {
        [[0, 1], [sqrt3 / 2, -0.5], [-sqrt3 / 2, -0.5]].forEach(function (d) {
          var p = pos(v[0] + d[0], v[1] + d[1]); ctx.beginPath(); ctx.moveTo(v[2][0], v[2][1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        });
        var pb = pos(v[0], v[1] + 1); ctx.fillStyle = P.rgba(P.neut, 0.38); ctx.beginPath(); ctx.arc(pb[0], pb[1], 2, 0, 2 * PI); ctx.fill();
      });
      sites.forEach(function (v) {
        var value = (cos(g[0] * v[0] + g[1] * v[1]) + 1) / 2;
        ctx.fillStyle = P.rgb(P.mix(P.teal, P.suo, value)); ctx.beginPath(); ctx.arc(v[2][0], v[2][1], 4.8, 0, 2 * PI); ctx.fill();
      });
      if (showMoves) {
        [a1, a2].forEach(function (a, i) {
          var p = pos(a[0], a[1]); arrowShort(ctx, cx, cy, p[0], p[1], 7, P.ink, 2, 8);
          mvar(ctx, (cx + p[0]) / 2 + (i ? -22 : 10), (cy + p[1]) / 2 + 5, 'a', {sub: String(i + 1), color: P.ink, size: 16});
        });
      }
      if (gl > 1e-7) {
        var gArrowLength = 42 * gl / bLength;
        arrow(ctx, cx, cy, cx + ux * gArrowLength, cy - uy * gArrowLength, P.curve, 2, 7);
        mvar(ctx, cx + ux * (gArrowLength + 11), cy - uy * (gArrowLength + 11) + 5, 'G', {size: 15, color: P.curve});
      }
      // Mark the actual nearest-neighbour bond, so a is visibly distinct from a1/a2.
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy - scale + 4); ctx.stroke();
      ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(cx, cy - scale, 3.6, 0, 2 * PI); ctx.fill();
      txt(ctx, cx - 9, cy - scale - 7, 'B', {size: 12, color: P.ink, align: 'right'});
      mvar(ctx, cx + 7, cy - scale * 0.5 + 3, 'a', {size: 15, color: P.ink});
      ctx.strokeStyle = P.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, 2 * PI); ctx.stroke();
      txt(ctx, cx + 9, cy + 18, 'A', {italic: true, color: P.ink, size: 14});
      if (gl > 1e-7) {
        var q0 = pos(-uy * 2, ux * 2), q1 = pos(-uy * 2 + ux * lambda, ux * 2 + uy * lambda);
        arrow(ctx, q0[0], q0[1], q1[0], q1[1], P.ink2, 1.5, 6);
        ahead(ctx, q0[0], q0[1], -ux, uy, 6);
        txt(ctx, (q0[0] + q1[0]) / 2 - uy * 11, (q0[1] + q1[1]) / 2 - ux * 11, 'λ', {italic: true, size: 15, color: P.ink});
      }
      ctx.restore();
      label(ctx, box.x + 9, box.y + 20, 'Wave cos(G·r)', 'cos(G·r) の山と谷', {color: P.ink, size: 13});
      [[P.suo, 'crest', '山'], [P.teal, 'trough', '谷']].forEach(function (entry, i) {
        var x = box.x + 15 + i * (curLang() === 'ja' ? 44 : 62);
        ctx.fillStyle = P.rgb(entry[0]); ctx.beginPath(); ctx.arc(x, box.y + box.h - 18, 4, 0, 2 * PI); ctx.fill();
        label(ctx, x + 9, box.y + box.h - 14, entry[1], entry[2], {size: 11});
      });
      label(ctx, box.x + box.w - 12, box.y + box.h - 14, gl ? 'λ = ' + (2 * PI / gl).toFixed(2) + ' a' : 'λ → ∞', gl ? 'λ = ' + (2 * PI / gl).toFixed(2) + ' a' : 'λ → ∞', {align: 'right', color: P.ink2});
    }
    function profile(ctx, box, g, a, index) {
      var c = cycles(g, a), x0 = box.x + 29, x1 = box.x + box.w - 16;
      var y0 = box.y + 69, amp = 27;
      label(ctx, box.x + 10, box.y + 20, 'Along a' + index + ': ' + number(c) + ' cycles per step', 'a' + index + ' の移動で ' + number(c) + ' 周期', {color: P.ink, size: 12});
      ctx.strokeStyle = P.rgba(P.neut, 0.28); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      [y0 - amp, y0, y0 + amp].forEach(function (y) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }); ctx.setLineDash([]);
      label(ctx, x0 - 8, y0 - amp + 4, '+1', '山', {size: 10, align: 'right'});
      label(ctx, x0 - 8, y0 + amp + 4, '−1', '谷', {size: 10, align: 'right'});
      ctx.strokeStyle = P.curve; ctx.lineWidth = 2; ctx.beginPath();
      for (var i = 0; i <= 240; i++) { var t = 2 * i / 240, x = x0 + (x1 - x0) * i / 240, y = y0 - amp * cos(2 * PI * c * t); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      for (var j = 0; j <= 2; j++) {
        var x = x0 + (x1 - x0) * j / 2, v = cos(2 * PI * c * j), y = y0 - amp * v;
        ctx.fillStyle = P.rgb(P.mix(P.teal, P.suo, (v + 1) / 2)); ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 2 * PI); ctx.fill();
        txt(ctx, x, box.y + 121, j === 0 ? '0' : (j === 2 ? '2a' : 'a') + index, {size: 13, align: 'center', italic: true});
      }
    }
    function panels(canvas) {
      var width = canvas.getBoundingClientRect().width || 560, stacked = width < 500;
      var o = dpr(canvas, stacked ? 605 : 325); ground(o.ctx, o.w, o.h);
      o.left = {x: 0, y: 0, w: stacked ? o.w : o.w * 0.52, h: stacked ? 295 : 325};
      o.right = {x: stacked ? 0 : o.w * 0.52 + 12, y: stacked ? 310 : 0, w: stacked ? o.w : o.w * 0.48 - 12, h: stacked ? 290 : 325};
      return o;
    }
    if (fitCanvas) {
      var row = 2, slider = document.getElementById('wf-lambda'), output = document.getElementById('wf-lambda-out');
      var fitStatus = document.getElementById('wf-status');
      function drawFit() {
        var lambda = +slider.value, basis = row === 2 ? b1 : b2;
        var g = basis.map(function (v) { return v * 1.5 / lambda; });
        var o = panels(fitCanvas); wave(o.ctx, o.left, g, true);
        profile(o.ctx, {x:o.right.x, y:o.right.y + 10, w:o.right.w}, g, a1, '₁');
        profile(o.ctx, {x:o.right.x, y:o.right.y + 165, w:o.right.w}, g, a2, '₂');
        output.textContent = lambda.toFixed(2) + ' a';
        fitStatus.textContent = fits(g) ? (curLang() === 'ja' ? 'すべてのAで山がそろう' : 'Every A site lies on a crest') : (curLang() === 'ja' ? 'Aの位置で、山からのずれが生まれる' : 'Some A sites move away from the crests');
        fitStatus.classList.toggle('sok', fits(g));
        [['wf-row2', row === 2], ['wf-row1', row === 1]].forEach(function (choice) {
          var button = document.getElementById(choice[0]);
          button.classList.toggle('active', choice[1]);
          button.setAttribute('aria-pressed', String(choice[1]));
        });
      }
      document.getElementById('wf-row2').addEventListener('click', function () { row = 2; drawFit(); });
      document.getElementById('wf-row1').addEventListener('click', function () { row = 1; drawFit(); });
      slider.addEventListener('input', drawFit); window.addEventListener('resize', drawFit); onLang(drawFit); drawFit();
    }
    if (mapCanvas) {
      var selected = b1.slice(), mapGeom, latticePoints = [], dragging = false;
      var mapStatus = document.getElementById('rc-status');
      var statusPrefix = document.createTextNode('');
      var statusRef = document.createElement('button');
      statusRef.type = 'button'; statusRef.className = 'eqref';
      statusRef.setAttribute('data-eq', '6');
      var statusSuffix = document.createTextNode('');
      mapStatus.replaceChildren(statusPrefix, statusRef, statusSuffix);
      var presets = [['rc-b1', b1], ['rc-b2', b2], ['rc-double', b1.map(function(v){return 2*v;})], ['rc-b12', [0, 4 * PI / 3]], ['rc-no', b1.map(function(v){return 0.6*v;})]];
      function drawMap() {
        var o = panels(mapCanvas), ctx = o.ctx, box = o.left;
        wave(ctx, o.right, selected, false);
        var cx = box.x + box.w / 2, cy = box.y + box.h * 0.51;
        var radius = min(box.w / 2 - 27, box.h / 2 - 48), scale = radius / (2.4 * bLength);
        mapGeom = {cx:cx, cy:cy, scale:scale, radius:radius, box:box}; latticePoints = [];
        label(ctx, box.x + 9, box.y + 20, 'Select G (reciprocal space)', 'G を選ぶ（逆空間）', {color:P.ink, size:13});
        txt(ctx, box.x + 9, box.y + 40, 'G = (' + number(selected[0]) + '/a, ' + number(selected[1]) + '/a)', {size:12, color:P.curve});
        arrow(ctx, cx - radius, cy, cx + radius, cy, P.grid, 1, 5); arrow(ctx, cx, cy + radius, cx, cy - radius, P.grid, 1, 5);
        mvar(ctx, cx + radius + 4, cy + 14, 'G', {sub:'x', size:13}); mvar(ctx, cx + 7, cy - radius - 5, 'G', {sub:'y', size:13});
        txt(ctx, cx - 8, cy + 14, '0', {size:12, align:'right'});
        for (var m = -3; m <= 3; m++) for (var n = -3; n <= 3; n++) {
          var g = [m * b1[0] + n * b2[0], m * b1[1] + n * b2[1]], x = cx + g[0] * scale, y = cy - g[1] * scale;
          if (abs(x - cx) > radius || abs(y - cy) > radius) continue;
          latticePoints.push({g:g,x:x,y:y});
          ctx.fillStyle = P.rgba(P.neut, 0.7); ctx.beginPath(); ctx.arc(x,y,3,0,2*PI);ctx.fill();
        }
        [b1,b2].forEach(function(b,i){
          var x=cx+b[0]*scale,y=cy-b[1]*scale;
          arrowShort(ctx,cx,cy,x,y,5,P.basis,1.6,7);
          mvar(ctx,x+(i?-15:8),y+15,'b',{sub:String(i+1),color:P.basis,size:14});
        });
        var sx=cx+selected[0]*scale,sy=cy-selected[1]*scale;

        if (fits(selected) && hypot(selected[0], selected[1]) > 1e-7) {
          ctx.strokeStyle=P.rgba(P.terra,0.85);ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,18,-5*PI/6,-PI/6);ctx.stroke();
          txt(ctx,cx,cy-27,'120°',{size:11,align:'center',color:P.basis});
        }
        if(hypot(selected[0],selected[1])>1e-7) arrowShort(ctx,cx,cy,sx,sy,6,P.curve,2.5,8);
        ctx.fillStyle=P.rgb(P.plate);ctx.beginPath();ctx.arc(sx,sy,7,0,2*PI);ctx.fill();
        ctx.strokeStyle=P.curve;ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,sy,5,0,2*PI);ctx.stroke();
        ctx.fillStyle=P.curve;ctx.beginPath();ctx.arc(sx,sy,2.5,0,2*PI);ctx.fill();
        label(ctx,box.x+box.w/2,box.y+box.h-14,'Dots: every A lies on a crest','印の位置：すべてのAで山がそろう',{align:'center',size:11});
        var mag=hypot(selected[0],selected[1]);
        var ja = curLang() === 'ja';
        statusPrefix.nodeValue = (ja ? '原点からの距離 |G| = ' : 'Distance from origin |G| = ') + mag.toFixed(2) + ' /a  ·  λ = ' + (mag > 1e-7 ? (2 * PI / mag).toFixed(2) + ' a' : '∞') + '  ·  ';
        var referenceLabel = ja ? '式(6)' : 'Eq. (6)';
        if (statusRef.textContent !== referenceLabel) statusRef.textContent = referenceLabel;
        statusSuffix.nodeValue = ja ? (fits(selected) ? 'を満たす' : 'を満たさない') : (fits(selected) ? ' holds' : ' fails');
        presets.forEach(function(p){document.getElementById(p[0]).classList.toggle('active',hypot(selected[0]-p[1][0],selected[1]-p[1][1])<1e-7);});
      }
      function pick(event) {
        var rect=mapCanvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
        if(!mapGeom || abs(x-mapGeom.cx)>mapGeom.radius+10 || abs(y-mapGeom.cy)>mapGeom.radius+10) return false;
        var nearest=null, distance=10;
        latticePoints.forEach(function(p){var d=hypot(x-p.x,y-p.y);if(d<distance){distance=d;nearest=p;}});
        selected=nearest?nearest.g.slice():[(x-mapGeom.cx)/mapGeom.scale,(mapGeom.cy-y)/mapGeom.scale];drawMap();return true;
      }
      presets.forEach(function(p){document.getElementById(p[0]).addEventListener('click',function(){selected=p[1].slice();drawMap();});});
      mapCanvas.addEventListener('pointerdown',function(e){if(pick(e)){dragging=true;mapCanvas.setPointerCapture(e.pointerId);}});
      mapCanvas.addEventListener('pointermove',function(e){if(dragging)pick(e);});
      mapCanvas.addEventListener('pointerup',function(){dragging=false;});mapCanvas.addEventListener('pointercancel',function(){dragging=false;});
      window.addEventListener('resize',drawMap);onLang(drawMap);drawMap();
    }
  })();
  // ════════════════════════════════════════════════════════════════════
  //  Figure 2.3 — hexagonal first Brillouin zone + reciprocal lattice, with
  //  Γ, M, K, K′ and b₁, b₂. Two animated modes carry the two derivations in
  //  the prose: BUILD (the six perpendicular bisectors of the nearest G appear
  //  one by one and enclose the hexagon) and K+G (translate K by b₂ / −b₁ and
  //  K′ by b₁ / −b₂: each lands on a corner of its own family; the K→K′ step
  //  2K is not a G). At rest: K filled / K′ hollow ring (same diameter).
  // ════════════════════════════════════════════════════════════════════
  function initBrillouinFigure(canvasId, cornersOnly) {
    var canvas = document.getElementById(canvasId); if (!canvas) return;
    var splitViews = !!document.getElementById('fig-bz-corners');
    var status = document.getElementById(cornersOnly ? 'bz-corners-status' : 'bz-status');
    var bB = cornersOnly ? null : document.getElementById('bz-build');
    var bK = document.getElementById(cornersOnly ? 'bz-corners-play' : 'bz-kg');
    var bR = cornersOnly ? null : document.getElementById('bz-reset');
    var bF = cornersOnly ? null : document.getElementById('bz-fold');
    var mode = cornersOnly ? 'kg' : bF ? 'fold' : null, anim = 1, raf = null;
    var cornerStatus = '<span class="i18n-en">The filled corners connect to one another; the hollow corners form another group.</span><span class="i18n-ja">塗りつぶした三つの角がつながり、白抜きの三つの角がもう一組を作る。</span>';
    var foldStatus = '<span class="i18n-en">Subtract b₁: k and k − b₁ belong to the same group. The point moves from near b₁ to near Γ.</span><span class="i18n-ja">b₁ を引く：k と k − b₁ は同じ組。b₁ の近くにあった点が、Γ の近くへ移る。</span>';
    function setStatus(html) { if (status) status.innerHTML = html || '<span class="i18n-en">&nbsp;</span><span class="i18n-ja">&nbsp;</span>'; }
    function start(m) {
      mode = m; anim = 0;
      [[bF, 'fold'], [bB, 'build'], [cornersOnly ? null : bK, 'kg']].forEach(function (choice) { if (choice[0]) { choice[0].classList.toggle('active', m === choice[1]); choice[0].setAttribute('aria-pressed', String(m === choice[1])); } });
      setStatus(m === 'fold' ? foldStatus : m === 'build'
        ? '<span class="i18n-en">The boundaries with the six surrounding reciprocal lattice points enclose the hexagonal first Brillouin zone.</span><span class="i18n-ja">周りの六つの逆格子点との境界が、第一ブリルアンゾーンの六角形を囲む。</span>'
        : cornersOnly ? cornerStatus : '<span class="i18n-en">Reciprocal lattice translations connect K corners to K corners, and K′ corners to K′ corners.</span><span class="i18n-ja">逆格子ベクトルで移ると、K は K の角へ、K′ は K′ の角へ着く。</span>');
      cancelAnimationFrame(raf); tick();
    }
    function tick() { anim = min(1, anim + (mode === 'build' ? 0.0055 : 0.0065)); draw(); if (anim < 1) raf = requestAnimationFrame(tick); }
    function reset() { mode = null; anim = 0; [bB, bK, bF].forEach(function (button) { if (button) { button.classList.remove('active'); button.setAttribute('aria-pressed', 'false'); } }); setStatus(); cancelAnimationFrame(raf); draw(); }
    function clamp01(x) { return max(0, min(1, x)); }

    function draw() {
      var o = dpr(canvas, 380), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      var cx = W * 0.5, cy = H * 0.5, R = min(W * 0.24, H * 0.29);                                        // R = |K| on screen; |b| = R√3
      function corner(i) { var a = i * PI / 3; return [cx + R * cos(a), cy - R * sin(a)]; }                  // corners at 0°,60°,… (y up)
      function mid(i) { var a = PI / 6 + i * PI / 3, rm = R * sqrt3 / 2; return [cx + rm * cos(a), cy - rm * sin(a)]; }  // M edge midpoints at 30°,90°,…
      var gN = [];                                                                                            // six nearest G at 30°+60°i: b1, b1+b2, b2, −b1, −(b1+b2), −b2
      for (var i = 0; i < 6; i++) { var a = PI / 6 + i * PI / 3, d = R * sqrt3; gN.push([cx + d * cos(a), cy - d * sin(a)]); }
      var b1 = gN[0], b2 = gN[2], nb1 = gN[3], nb2 = gN[5];
      var build = mode === 'build', kg = mode === 'kg', fold = mode === 'fold';
      var stage = build ? anim * 7 : 0, hexA = build ? clamp01(stage - 6) : splitViews && fold ? 0 : 1;    // build: bisector i during stage∈[i,i+1), hexagon at the end

      ctx.strokeStyle = P.rgba(P.neut, 0.16); ctx.lineWidth = 1; ctx.lineJoin = 'round';                     // faint neighbour zones (context)
      ctx.globalAlpha = hexA;
      gN.forEach(function (g) { ctx.beginPath(); for (var i = 0; i <= 6; i++) { var a = i * PI / 3, X = g[0] + R * cos(a), Y = g[1] - R * sin(a); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } ctx.closePath(); ctx.stroke(); });
      ctx.globalAlpha = 1;
      ctx.fillStyle = P.rgba(P.neut, 0.5); gN.forEach(function (g) { ctx.beginPath(); ctx.arc(g[0], g[1], 2.6, 0, 2 * PI); ctx.fill(); });   // reciprocal lattice points
      var far = [];                                                                                           // next shell of G (context only)
      for (var i = 0; i < 6; i++) { var a = i * PI / 3, d = 3 * R; far.push([cx + d * cos(a), cy - d * sin(a)]); }
      far.forEach(function (g) { ctx.beginPath(); ctx.arc(g[0], g[1], 2.2, 0, 2 * PI); ctx.fill(); });
      var axL = min(R * 1.5, W * 0.5 - 28);   // kx axis stops short of the plate edge on narrow widths
      arrow(ctx, cx - axL, cy, cx + axL, cy, P.axis, 1.2, 7);                                         // kx, ky axes through Γ
      arrow(ctx, cx, cy + R * 1.3, cx, cy - R * 1.5, P.axis, 1.2, 7);
      mvar(ctx, cx + axL + 6, cy + 5, 'k', { sub: 'x', color: P.ink2, size: 14 });
      mvar(ctx, cx + 7, cy - R * 1.5 - 3, 'k', { sub: 'y', color: P.ink2, size: 14 });

      if (!kg && !fold) {                                                                                     // translation arrows stand alone in fold and K+G modes
        arrowShort(ctx, cx, cy, b1[0], b1[1], 5, P.basis, 1.7, 8);
        arrowShort(ctx, cx, cy, b2[0], b2[1], 5, P.basis, 1.7, 8);
        mvar(ctx, min(W - 20, b1[0] + 7), b1[1] + 13, 'b', { sub: '1', color: P.basis, size: 14 });
        mvar(ctx, max(4, b2[0] - 24), b2[1] + 13, 'b', { sub: '2', color: P.basis, size: 14 });
      }

      if (build) {                                                                                            // ── BUILD: Γ→G segment, midpoint, growing bisector, one G at a time
        var Lb = R * 1.9;
        for (var i = 0; i < 6; i++) {
          var p = clamp01(stage - i); if (p <= 0) continue;
          var g = gN[i], mx = (cx + g[0]) / 2, my = (cy + g[1]) / 2, ux = (g[0] - cx) / (R * sqrt3), uy = (g[1] - cy) / (R * sqrt3);
          var pS = clamp01(p * 2.5), pL = clamp01(p * 1.6 - 0.35);
          ctx.strokeStyle = P.rgba(P.terra, 0.55); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (g[0] - cx) * pS, cy + (g[1] - cy) * pS); ctx.stroke(); ctx.setLineDash([]);
          if (pS >= 1) { ctx.fillStyle = P.basis; ctx.beginPath(); ctx.arc(mx, my, 2.6, 0, 2 * PI); ctx.fill(); }
          if (pL > 0) {                                                                                       // bisector: ⊥ to Γ→G, through the midpoint, grows both ways
            ctx.strokeStyle = P.rgba(P.terra, 0.8); ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.moveTo(mx - uy * Lb * pL, my + ux * Lb * pL); ctx.lineTo(mx + uy * Lb * pL, my - ux * Lb * pL); ctx.stroke();
            ctx.strokeStyle = P.rgba(P.terra, 0.8); ctx.lineWidth = 1;                                        // right-angle mark at the midpoint
            var q = 5; ctx.beginPath(); ctx.moveTo(mx - ux * q, my - uy * q); ctx.lineTo(mx - ux * q + uy * q, my - uy * q - ux * q); ctx.lineTo(mx + uy * q, my - ux * q); ctx.stroke();
          }
        }
      }

      if (hexA > 0) {                                                                                         // first BZ (emphasised), with M ticks and corner marks
        ctx.globalAlpha = hexA;
        ctx.fillStyle = P.rgba(P.terra, build ? 0.10 : 0.0);
        ctx.beginPath(); for (var i = 0; i <= 6; i++) { var p = corner(i); if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); } ctx.closePath();
        if (build) ctx.fill();
        ctx.strokeStyle = P.structure; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round';                                   // M = short tick ⊥ the BZ edge
        if (!splitViews) for (var i = 0; i < 6; i++) { var pm = mid(i), a = PI / 6 + i * PI / 3, rx = cos(a), ry = -sin(a); ctx.beginPath(); ctx.moveTo(pm[0] - rx * 4.5, pm[1] - ry * 4.5); ctx.lineTo(pm[0] + rx * 4.5, pm[1] + ry * 4.5); ctx.stroke(); }
        for (var i = 0; i < 6; i++) {                                                                         // corners: K (even) filled, K′ (odd) hollow; K+G mode colours the two families
          var p = corner(i), isK = (i % 2 === 0), col = kg ? (isK ? P.kK : P.kKp) : P.ink;
          ctx.strokeStyle = col; ctx.fillStyle = col;
          if (isK || (splitViews && !cornersOnly)) { ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 2 * PI); ctx.fill(); }
          else { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p[0], p[1], 3.25, 0, 2 * PI); ctx.stroke(); }
        }
        var pK = corner(0), pKp = corner(3), pM = mid(0);
        if (!splitViews || cornersOnly) {
        txt(ctx, pK[0] + 14, pK[1] + 5, 'K', { color: kg ? P.kK : P.ink, italic: true, size: 14, align: 'center' });
        txt(ctx, pKp[0] - 15, pKp[1] + 5, cornersOnly ? '−K' : 'K′', { color: kg ? P.kKp : P.ink, italic: true, size: 14, align: 'center' });
        }
        if (!splitViews) {
        txt(ctx, pM[0] + 15, pM[1] - 6, 'M', { color: P.ink, italic: true, size: 13, align: 'center' });
        if (kg) { [2, 4].forEach(function (i) { var p = corner(i); txt(ctx, p[0] + (i === 2 ? -3 : -3), p[1] + (i === 2 ? -9 : 17), 'K', { color: P.kK, italic: true, size: 13, align: 'center' }); });
                  [1, 5].forEach(function (i) { var p = corner(i); txt(ctx, p[0] + 4, p[1] + (i === 1 ? -9 : 17), 'K′', { color: P.kKp, italic: true, size: 13, align: 'center' }); }); }
        }
        ctx.globalAlpha = 1;
      }
      txt(ctx, cx - 12, cy + 17, 'Γ', { color: P.ink, italic: true, size: 14, align: 'center' });

      if (fold) {
        var target = [cx + 0.18 * R, cy - 0.25 * R];
        var origin = [target[0] + b1[0] - cx, target[1] + b1[1] - cy];
        var moving = [origin[0] + (target[0] - origin[0]) * anim, origin[1] + (target[1] - origin[1]) * anim];
        ctx.strokeStyle = P.grid; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(b1[0], b1[1]); ctx.lineTo(origin[0], origin[1]); ctx.moveTo(cx, cy); ctx.lineTo(target[0], target[1]); ctx.stroke(); ctx.setLineDash([]);
        [origin, target].forEach(function (point) { ctx.strokeStyle = P.curve; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(point[0], point[1], 4, 0, 2 * PI); ctx.stroke(); });
        if (anim > 0.02) arrowShort(ctx, origin[0], origin[1], moving[0], moving[1], anim === 1 ? 5 : 0, P.curve, 2, 8);
        ctx.fillStyle = P.curve; ctx.beginPath(); ctx.arc(moving[0], moving[1], 3, 0, 2 * PI); ctx.fill();
        mvar(ctx, origin[0], origin[1] - 12, 'k', {color:P.curve, align:'center', size:15});
        txt(ctx, target[0] - 5, target[1] - 12, 'k − b₁', {color:P.curve, align:'right', italic:true, size:14});
        txt(ctx, (origin[0] + target[0])/2 + 10, (origin[1] + target[1])/2 - 12, '−b₁', {color:P.curve, italic:true, size:14});
        mvar(ctx, b1[0] + 8, b1[1] + 15, 'b', {sub:'1', color:P.basis, size:14});
      }

      if (kg) {                                                                                               // ── K+G: four translations, then the failing 2K step
        var moves = [                                                                                         // [from corner, G vector (screen), label, family colour, label offset]
          [0, [b2[0] - cx, b2[1] - cy], '+b₂', P.kK, [6, -12]],
          [0, [nb1[0] - cx, nb1[1] - cy], '−b₁', P.kK, [6, 20]],
          [3, [b1[0] - cx, b1[1] - cy], '+b₁', P.kKp, [-6, -12]],
          [3, [nb2[0] - cx, nb2[1] - cy], '−b₂', P.kKp, [-6, 20]]
        ];
        var st = anim * (cornersOnly ? 4 : 5.4);
        moves.forEach(function (mv, j) {
          var p = clamp01(st - j); if (p <= 0) return;
          var p0 = corner(mv[0]), ex = p0[0] + mv[1][0], ey = p0[1] + mv[1][1];
          var tx = p0[0] + mv[1][0] * p, ty = p0[1] + mv[1][1] * p;
          arrowShort(ctx, p0[0], p0[1], tx, ty, p >= 1 ? 7 : 0, mv[3], 2.2, 9);
          var mxx = p0[0] + mv[1][0] * 0.28, myy = p0[1] + mv[1][1] * 0.28;   // label near the START of the arrow (the four arrows cross at Γ)
          if (p >= 1) txt(ctx, mxx + mv[4][0], myy + mv[4][1], mv[2], { color: mv[3], italic: true, size: 12.5, align: 'center' });
          ctx.fillStyle = mv[3]; ctx.beginPath(); ctx.arc(tx, ty, 4.6, 0, 2 * PI); ctx.fill();               // the travelling point
          if (mv[0] === 3) { ctx.fillStyle = P.rgb(P.plate); ctx.beginPath(); ctx.arc(tx, ty, 2.4, 0, 2 * PI); ctx.fill(); }   // K′ family: hollow look
        });
        var pf = clamp01(st - 4);
        if (pf > 0 && !cornersOnly) {                                                                          // K → K′ attempt: dashed, ends in a cross
          var pK0 = corner(0), pK3 = corner(3);
          ctx.strokeStyle = P.rgba(P.neut, 0.9); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(pK0[0], pK0[1] + 30); ctx.lineTo(pK0[0] + (pK3[0] - pK0[0]) * pf, pK0[1] + 30); ctx.stroke(); ctx.setLineDash([]);
          if (pf >= 1) {
            var xm = cx, ym = cy + 30;
            ctx.strokeStyle = P.rgba(P.neut, 0.9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(xm - 5, ym - 5); ctx.lineTo(xm + 5, ym + 5); ctx.moveTo(xm - 5, ym + 5); ctx.lineTo(xm + 5, ym - 5); ctx.stroke();
            txt(ctx, xm, ym + 22, '−2K ≠ G', { color: P.ink2, italic: true, size: 12.5, align: 'center' });
          }
        }
      }
    }
    if (bB) bB.addEventListener('click', function () { start('build'); });
    if (bF) bF.addEventListener('click', function () { start('fold'); });
    if (bK) bK.addEventListener('click', function () { start('kg'); });
    if (bR) bR.addEventListener('click', reset);
    window.addEventListener('resize', draw);
    onLang(draw);
    if (bF) setStatus(foldStatus);
    if (cornersOnly) setStatus(cornerStatus);
    draw();
  }
  initBrillouinFigure('fig-bz', false);
  initBrillouinFigure('fig-bz-corners', true);
  // ════════════════════════════════════════════════════════════════════
  //  Optional dimensioned Brillouin-zone reference. Coordinates use |K| = 1.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-bz-metrics'); if (!canvas) return;
    var details = document.getElementById('bz-reference'), select = document.getElementById('bz-distance');
    var output = document.getElementById('bz-distance-out');
    var O = [0, 0], K = [1, 0], M = [0.75, sqrt3 / 4];
    var corners = Array.from({length:6}, function (_, i) { return [cos(i * PI / 3), sin(i * PI / 3)]; });
    var B1 = [1.5, sqrt3 / 2], B12 = [0, sqrt3];
    var segments = {
      gm: [O, M, '2π/(3a)'], gk: [O, K, '4π/(3√3a)'], mk: [M, K, '2π/(3√3a)'],
      edge: [K, corners[1], '4π/(3√3a)'], kk: [K, corners[2], '4π/(3a)'],
      opposite: [K, corners[3], '8π/(3√3a)'], gg: [B1, B12, '4π/(3a)'], bb: [B1, [-B1[0], B1[1]], '4π/(√3a)'],
      width: [M, [-M[0], -M[1]], '4π/(3a)']
    };
    function draw() {
      var ja = curLang() === 'ja';
      Array.prototype.forEach.call(select.options, function (option) { option.textContent = option.getAttribute(ja ? 'data-ja' : 'data-en'); });
      var segment = segments[select.value], length = hypot(segment[1][0] - segment[0][0], segment[1][1] - segment[0][1]);
      var nm = length * 4 * PI / (3 * sqrt3 * 0.142);
      output.textContent = select.options[select.selectedIndex].textContent + ' = ' + segment[2] + ' ≈ ' + nm.toFixed(2) + ' nm⁻¹ = ' + (nm / 10).toFixed(3) + ' Å⁻¹';
      if (!details.open) return;
      var o = dpr(canvas, 340), ctx = o.ctx, R = min(o.w * 0.25, 94), cx = o.w / 2, cy = 184;
      ground(ctx, o.w, o.h);
      function point(p) { return [cx + R * p[0], cy - R * p[1]]; }
      function line(a, b, col, width) { a = point(a); b = point(b); ctx.strokeStyle = col; ctx.lineWidth = width || 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      function label(p, text, dx, dy, color) { p = point(p); txt(ctx, p[0] + dx, p[1] + dy, text, {color:color || P.ink, size:14, italic:true, align:'center'}); }
      if (select.value === 'gg' || select.value === 'bb') {
        for (var i = 0; i < 6; i++) { var angle = PI / 6 + i * PI / 3, g = [sqrt3*cos(angle), sqrt3*sin(angle)], gp = point(g); ctx.fillStyle = P.ink3; ctx.beginPath(); ctx.arc(gp[0], gp[1], 3, 0, 2 * PI); ctx.fill(); }
        label(B1, 'b₁', 15, 8, P.basis);
        if (select.value === 'gg') label(B12, 'b₁ + b₂', 0, -12, P.basis);
        else label([-B1[0], B1[1]], 'b₂', -15, 8, P.basis);
      }
      ctx.fillStyle = P.rgba(P.terra, 0.06); ctx.strokeStyle = P.structure; ctx.lineWidth = 1.5;
      ctx.beginPath(); corners.forEach(function (p, i) { p = point(p); if (!i) ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]); }); ctx.closePath(); ctx.fill(); ctx.stroke();
      corners.forEach(function (p, i) { var q = point(p); ctx.strokeStyle = P.ink2; ctx.fillStyle = P.ink2; ctx.beginPath(); ctx.arc(q[0],q[1],3,0,2*PI); if (i%2) ctx.stroke(); else ctx.fill(); label(p, i%2 ? 'K′' : 'K', 16*p[0], -16*p[1] + (i===0 || i===3 ? 5 : 0)); });
      label(O,'Γ',-12,17); label(M,'M',14,-8);
      ctx.fillStyle=P.ink; [O,M].forEach(function(p) { p=point(p); ctx.beginPath(); ctx.arc(p[0],p[1],2.5,0,2*PI); ctx.fill(); });
      if (['gm','gk','mk'].indexOf(select.value)>=0) {
        ctx.setLineDash([3,4]); line(O,K,P.grid); line(O,M,P.grid); ctx.setLineDash([]);
        ctx.strokeStyle=P.grid; ctx.beginPath(); ctx.arc(cx,cy,30,-PI/6,0); ctx.stroke(); txt(ctx,cx+41,cy-7,'30°',{color:P.ink2,size:12});
        var mp=point(M), q=6, ux=sqrt3/2, uy=-.5, vx=.5, vy=sqrt3/2;
        ctx.beginPath(); ctx.moveTo(mp[0]-ux*q,mp[1]-uy*q); ctx.lineTo(mp[0]-ux*q+vx*q,mp[1]-uy*q+vy*q); ctx.lineTo(mp[0]+vx*q,mp[1]+vy*q); ctx.stroke();
      }
      var from=point(segment[0]), to=point(segment[1]);
      arrowShort(ctx,from[0],from[1],to[0],to[1],3,P.curve,2.3,7);
      var dx=from[0]-to[0], dy=from[1]-to[1], norm=hypot(dx,dy);
      ahead(ctx,from[0]-dx/norm*3,from[1]-dy/norm*3,dx/norm,dy/norm,7);
    }
    select.addEventListener('change',draw); details.addEventListener('toggle',draw);
    window.addEventListener('resize',draw); onLang(draw); draw();
  })();
  // ════════════════════════════════════════════════════════════════════
  //  Figure 3.1 — 1-component (1D chain) vs 2-component (graphene A/B) unit
  //  cell, side by side. The COUNT of coefficients in the boxed cell (c vs
  //  c_A,c_B) is the message. No matrix, no bands.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-cells'); if (!canvas) return;
    var dlt = [[0, -1], [sqrt3 / 2, 0.5], [-sqrt3 / 2, 0.5]];
    function draw() {
      var o = dpr(canvas, 250), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      ctx.strokeStyle = P.rgba(P.neut, 0.16); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W / 2, 26); ctx.lineTo(W / 2, H - 26); ctx.stroke();
      // LEFT — 1D chain: one cell holds ONE site ⇒ one coefficient c
      var yL = H * 0.46, cxL = W * 0.26, aL = 46;
      ctx.strokeStyle = P.rgba(P.neut, 0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cxL - 2.7 * aL, yL); ctx.lineTo(cxL + 2.7 * aL, yL); ctx.stroke();
      ctx.strokeStyle = P.rgba(P.terra, 0.65); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; roundRect(ctx, cxL - aL / 2, yL - 30, aL, 56, 4); ctx.stroke(); ctx.setLineDash([]);
      [-2, -1, 0, 1, 2].forEach(function (i) { var x = cxL + i * aL; ctx.beginPath(); ctx.arc(x, yL, i === 0 ? 5 : 3.2, 0, 2 * PI); ctx.fillStyle = i === 0 ? P.aSite : P.rgba(P.neut, 0.4); ctx.fill(); });
      mvar(ctx, cxL + 10, yL - 10, 'c', { color: P.ink2, size: 15 });
      // RIGHT — graphene: one cell holds A + B ⇒ two coefficients c_A, c_B
      var yR = H * 0.5, cxR = W * 0.74, s = 38;
      function P2(vx, vy) { return [cxR + vx * s, yR + vy * s]; }
      var a1 = [dlt[0][0] - dlt[2][0], dlt[0][1] - dlt[2][1]], a2 = [dlt[0][0] - dlt[1][0], dlt[0][1] - dlt[1][1]];
      ctx.strokeStyle = P.rgba(P.neut, 0.22); ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      for (var m = -1; m <= 1; m++) for (var n = -1; n <= 1; n++) { var A = [m * a1[0] + n * a2[0], m * a1[1] + n * a2[1]]; dlt.forEach(function (d) { var p0 = P2(A[0], A[1]), p1 = P2(A[0] + d[0], A[1] + d[1]); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }); }
      for (var m = -1; m <= 1; m++) for (var n = -1; n <= 1; n++) { var A = [m * a1[0] + n * a2[0], m * a1[1] + n * a2[1]], pa = P2(A[0], A[1]); ctx.beginPath(); ctx.arc(pa[0], pa[1], 3, 0, 2 * PI); ctx.fillStyle = P.rgba(P.suo, 0.32); ctx.fill(); var pb = P2(A[0] + dlt[0][0], A[1] + dlt[0][1]); ctx.beginPath(); ctx.arc(pb[0], pb[1], 3, 0, 2 * PI); ctx.fillStyle = P.rgba(P.sage, 0.38); ctx.fill(); }
      var pA = P2(0, 0), pB = P2(dlt[0][0], dlt[0][1]);
      ctx.strokeStyle = P.rgba(P.terra, 0.65); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; roundRect(ctx, cxR - 27, pB[1] - 13, 54, (pA[1] - pB[1]) + 26, 5); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(pA[0], pA[1], 5, 0, 2 * PI); ctx.fillStyle = P.aSite; ctx.fill();
      ctx.beginPath(); ctx.arc(pB[0], pB[1], 5, 0, 2 * PI); ctx.fillStyle = P.bSite; ctx.fill();
      mvar(ctx, pA[0] + 10, pA[1] + 5, 'c', { sub: 'A', color: P.ink2, size: 14 });
      mvar(ctx, pB[0] + 10, pB[1] - 2, 'c', { sub: 'B', color: P.ink2, size: 14 });
    }
    window.addEventListener('resize', draw); draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure 3.3 — π / π* bands along Γ→K→M→Γ (2-D plot, same design as the
  //  1-D band curve). Touch at K (E=0), max gap at Γ; a marker tracks the
  //  current point on the path (no t — that wouldn't move the central question).
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-pathband'); if (!canvas) return;
    var sP = document.getElementById('c33-p'), oP = document.getElementById('c33-p-o');
    var BZR = 4 * PI / 3, Kp = [BZR, 0], Mp = [BZR * 0.75, BZR * sqrt3 / 4];
    var isTB = canvas.hasAttribute("data-graphene-tb");
    var pathNodes = [[0, 0], Kp, Mp, [0, 0]], pathBreaks = [0], pathLength = 0;
    for (var n = 1; n < pathNodes.length; n++) {
      pathLength += hypot(pathNodes[n][0] - pathNodes[n-1][0], pathNodes[n][1] - pathNodes[n-1][1]);
      pathBreaks.push(pathLength);
    }
    pathBreaks = pathBreaks.map(function(s) { return s / pathLength; });
    if (!isTB) pathBreaks = [0, 1/3, 2/3, 1];
    var pathTicks = pathBreaks.map(function(s, i) { return [s, ["Γ", "K", "M", "Γ"][i]]; });
    if (isTB) sP.step = "any";
    function gOf(kx, ky) { var g = 3 + 2 * cos(kx) + 4 * cos(kx / 2) * cos(ky * sqrt3 / 2); return g < 0 ? 0 : g; }
    function kAt(p) {
      p = max(0, min(1, p));
      var j = p < pathBreaks[1] ? 0 : p < pathBreaks[2] ? 1 : 2;
      var u = (p - pathBreaks[j]) / (pathBreaks[j+1] - pathBreaks[j]);
      return [pathNodes[j][0] + u * (pathNodes[j+1][0] - pathNodes[j][0]), pathNodes[j][1] + u * (pathNodes[j+1][1] - pathNodes[j][1])];
    }
    function posLabel(p) {
      for (var i = 0; i < pathTicks.length; i++) if (abs(p - pathTicks[i][0]) < (isTB ? 1e-8 : 0.025)) return pathTicks[i][1];
      return p < pathBreaks[1] ? "Γ–K" : p < pathBreaks[2] ? "K–M" : "M–Γ";
    }
    var samples = [];
    for (var segment = 0; segment < 3; segment++) {
      var count = Math.ceil(300 * (pathBreaks[segment+1] - pathBreaks[segment]));
      for (var step = segment ? 1 : 0; step <= count; step++) samples.push(pathBreaks[segment] + (pathBreaks[segment+1] - pathBreaks[segment]) * step / count);
    }
    function draw() {
      var o = dpr(canvas, 320), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      var pad = { l: 42, r: 22, t: 26, b: 40 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b, Emax = 3.3;
      function sx(p) { return pad.l + p * pw; }
      function sy(E) { return pad.t + (1 - (E + Emax) / (2 * Emax)) * ph; }
      ctx.strokeStyle = P.rgba(P.neut, 0.32); ctx.setLineDash([5, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(pad.l + pw, sy(0)); ctx.stroke(); ctx.setLineDash([]);
      mvar(ctx, pad.l + pw - 32, sy(0) - 7, 'E', { sub: canvas.hasAttribute('data-graphene-tb') ? '' : 'F', size: 12, color: P.ink3 }); txt(ctx, pad.l + pw - 15, sy(0) - 7, '= 0', { size: 12, color: P.ink3 });
      arrow(ctx, pad.l, sy(-Emax) + 2, pad.l, pad.t - 8, P.axis, 1.2, 7);
      if (canvas.hasAttribute('data-graphene-tb')) txt(ctx, pad.l - 9, pad.t - 12, 'E/t', { color: P.ink2, size: 13, align: 'right' });
      else mvar(ctx, pad.l - 9, pad.t - 12, 'E', { color: P.ink2, size: 15, align: 'right' });
      if (canvas.hasAttribute('data-graphene-tb')) [-3,-1,0,1,3].forEach(function(e){txt(ctx,pad.l-8,sy(e)+4,String(e),{color:P.ink3,size:11,align:'right'});});
      pathTicks.forEach(function (tk) { var x = sx(tk[0]); ctx.strokeStyle = P.rgba(P.neut, 0.16); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke(); txt(ctx, x, pad.t + ph + 18, tk[1], { color: P.ink3, size: 13, align: 'center', italic: true }); });
      function band(sign, col) { ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); for (var i = 0; i < samples.length; i++) { var p = samples[i], k = kAt(p), E = sign * sqrt(gOf(k[0], k[1])); var X = sx(p), Y = sy(E); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } ctx.stroke(); }
      band(1, P.curve); band(-1, P.rgb(P.teal));
      var pm = +sP.value, km = kAt(pm), Eu = sqrt(gOf(km[0], km[1])), xm = sx(pm);
      var iR = 27, ix = pad.l + pw * 0.5, iy = pad.t + iR + 8, sc = iR / BZR;   // inset BZ-map geometry (shared by the marker clip + the inset below)
      var underInset = (xm > ix - iR - 4 && xm < ix + iR + 15);                 // when the marker sits under the map, the line passes behind it
      ctx.strokeStyle = P.ink2; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath();
      if (underInset) { ctx.moveTo(xm, iy + iR + 7); ctx.lineTo(xm, pad.t + ph); } else { ctx.moveTo(xm, pad.t); ctx.lineTo(xm, pad.t + ph); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = P.curve; ctx.beginPath(); ctx.arc(xm, sy(Eu), 4, 0, 2 * PI); ctx.fill();
      ctx.fillStyle = P.rgb(P.teal); ctx.beginPath(); ctx.arc(xm, sy(-Eu), 4, 0, 2 * PI); ctx.fill();

      // ── inset BZ map: the horizontal axis IS a closed Γ→K→M→Γ route through the
      //    2-D zone. A small hexagonal BZ in the empty sky above the K dip traces
      //    that route; the position dot rides the SAME kAt(pm) as the body marker,
      //    so the x-axis point and the 2-D BZ point move together — and dragging to
      //    either end returns the dot to Γ (the two Γ's are one point: a closed loop).
      //    Subordinate (a guide map): small, light, drawn last over an invisible
      //    plate mask (matches the CSS plate) so the marker line passes behind it. ──
      (function () {
        var n, a, c;
        function ki(k) { return [ix + k[0] * sc, iy - k[1] * sc]; }
        // hexagonal zone frame — warm grey, same token as the reference BZ (図2.3)
        ctx.strokeStyle = P.structure; ctx.lineWidth = 1; ctx.lineJoin = 'round';
        ctx.beginPath(); for (n = 0; n <= 6; n++) { a = n * PI / 3; c = ki([BZR * cos(a), BZR * sin(a)]); if (n === 0) ctx.moveTo(c[0], c[1]); else ctx.lineTo(c[0], c[1]); } ctx.closePath(); ctx.stroke();
        // the route Γ→K→M→Γ as a closed triangle (leaves Γ at the centre, returns to it)
        var G = ki([0, 0]), K = ki(Kp), M = ki(Mp);
        ctx.strokeStyle = P.ink2; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(G[0], G[1]); ctx.lineTo(K[0], K[1]); ctx.lineTo(M[0], M[1]); ctx.closePath(); ctx.stroke();
        // K and M are indicated by the route's own vertices + their labels only — no extra
        // dot or tick in this small guide map (the route line already lands on each point);
        // Γ is the centre. Labels are italic serif, matching the reference.
        txt(ctx, K[0] + 5, K[1] + 4, 'K', { color: P.ink, italic: true, size: 11, align: 'left' });
        txt(ctx, M[0] + 4, M[1] - 4, 'M', { color: P.ink, italic: true, size: 11, align: 'left' });
        txt(ctx, G[0] - 5, G[1] + 12, 'Γ', { color: P.ink, italic: true, size: 11, align: 'right' });
        // current position — rides the SAME kAt(pm) as the body marker (km), with a
        // plate halo to lift it off the route line
        var qi = ki(km);
        ctx.fillStyle = P.rgb(P.plate); ctx.beginPath(); ctx.arc(qi[0], qi[1], 4.4, 0, 2 * PI); ctx.fill();
        ctx.fillStyle = P.curve; ctx.beginPath(); ctx.arc(qi[0], qi[1], 3, 0, 2 * PI); ctx.fill();
      })();
    }
    function updatePath() {
      var p = +sP.value;
      if (isTB) {
        pathBreaks.forEach(function(s) { if (abs(p - s) < 0.002) p = s; });
        sP.value = p;
      }
      oP.textContent = posLabel(p);
      sP.setAttribute("aria-valuetext", posLabel(p));
      draw();
    }
    sP.addEventListener("input", updatePath);
    window.addEventListener("resize", draw); updatePath();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure 3.2 — structure factor f(k) = Σ_j e^{i k·δ_j}. A k-selector
  //  (left, drag in the BZ) drives three unit phasors drawn tip-to-tail
  //  (right); their closing vector is f(k). At K the chain closes → f = 0.
  //  No energy axis — this is purely the phase sum that builds the band.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-phase'); if (!canvas) return;
    var phaseSumOnly = canvas.hasAttribute('data-phase-sum');
    var BZR = 4 * PI / 3, SC = 1 / sqrt3;
    var dlt = [[0, 1], [sqrt3 / 2, -0.5], [-sqrt3 / 2, -0.5]];   // δ_j: 3 NN directions, 120° apart
    var kpt = [canvas.hasAttribute('data-graphene-tb') ? 0 : BZR * (phaseSumOnly ? 1 : 0.52), 0];
    var bz = { cx: 0, cy: 0, R: 0 };
    function phases() { return dlt.map(function (d) { return SC * (kpt[0] * d[0] + kpt[1] * d[1]); }); }
    function draw() {
      var stacked = canvas.hasAttribute('data-graphene-tb') && canvas.getBoundingClientRect().width < 420;
      var o = dpr(canvas, stacked ? 420 : 300), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      // ── LEFT: Brillouin zone, drag k here ──────────────────────────
      bz.cx = W * (stacked ? 0.5 : 0.26); bz.cy = stacked ? 100 : H * 0.52; bz.R = stacked ? min(W * 0.24,70) : min(W * 0.19, H * 0.36);
      var cx = bz.cx, cy = bz.cy, R = bz.R, i, a, X, Y;
      ctx.strokeStyle = P.structure; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.beginPath();
      for (i = 0; i <= 6; i++) { a = i * PI / 3; X = cx + R * cos(a); Y = cy - R * sin(a); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
      ctx.closePath(); ctx.stroke();
      for (i = 0; i < 6; i++) { a = i * PI / 3; X = cx + R * cos(a); Y = cy - R * sin(a); ctx.fillStyle = P.axis; ctx.strokeStyle = P.axis; if (i % 2 === 0) { ctx.beginPath(); ctx.arc(X, Y, 3.4, 0, 2 * PI); ctx.fill(); } else { ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(X, Y, 2.75, 0, 2 * PI); ctx.stroke(); } }
      txt(ctx, cx - 4, cy + 14, 'Γ', { color: P.axis, italic: true, size: 12, align: 'right' });
      txt(ctx, cx + R + 11, cy + 4, 'K', { color: P.axis, italic: true, size: 12, align: 'center' });
      if(canvas.hasAttribute('data-graphene-tb')) txt(ctx,cx-R-13,cy+4,'K′',{color:P.axis,italic:true,size:12,align:'center'});
      var ksx = cx + (kpt[0] / BZR) * R, ksy = cy - (kpt[1] / BZR) * R;
      ctx.fillStyle = P.curve; ctx.beginPath(); ctx.arc(ksx, ksy, 5, 0, 2 * PI); ctx.fill();
      mvar(ctx, ksx + 8, ksy - 7, 'k', { color: P.ink2, size: 13 });
      // ── RIGHT: phasors tip-to-tail, closing vector = f(k) ──────────
      var px = W * (stacked ? 0.35 : 0.64), py = stacked ? 315 : H * 0.54, pr = stacked ? min(W * 0.16,47) : min(W * 0.092, H * 0.2);
      ctx.strokeStyle = P.rgba(P.neut, 0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px - pr * 1.5, py); ctx.lineTo(px + pr * 3.25, py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py + pr * 1.9); ctx.lineTo(px, py - pr * 1.9); ctx.stroke();
      ctx.strokeStyle = P.rgba(P.neut, 0.16); ctx.beginPath(); ctx.arc(px, py, pr, 0, 2 * PI); ctx.stroke();
      var th = phases(), x = px, y = py, sub = ['1', '2', '3'];
      ctx.lineCap = 'round';
      th.forEach(function (t, j) {
        var nx = x + pr * cos(t), ny = y - pr * sin(t);
        arrowShort(ctx, x, y, nx, ny, 0, P.rgb(P.teal), 2, 6.5);
        var labelOffset = phaseSumOnly ? -14 : 8;
        var mxp = (x + nx) / 2 + labelOffset * cos(t + PI / 2), myp = (y + ny) / 2 - labelOffset * sin(t + PI / 2);
        if (phaseSumOnly) txt(ctx, mxp - 3, myp + 4, sub[j], { color: P.ink2, size: 13 });
        else mvar(ctx, mxp - 3, myp + 4, 'δ', { color: P.ink3, size: 11, sub: sub[j] });
        x = nx; y = ny;
      });
      var fm = hypot(x - px, y - py) / pr;
      if (fm > 0.045) arrowShort(ctx, px, py, x, y, 0, P.curve, 2.6, 9);
      else { ctx.fillStyle = P.curve; ctx.beginPath(); ctx.arc(px, py, 3.6, 0, 2 * PI); ctx.fill(); }
      var lx = px - pr * 1.5, ly = py - pr * 1.9 + 2;
      if (phaseSumOnly) {
        txt(ctx, lx, ly, (curLang() === 'ja' ? '和の大きさ = ' : 'Sum magnitude = ') + fm.toFixed(2), { color: P.ink2, size: 13 });
      } else {
        txt(ctx, lx, ly, '|', { color: P.ink3, size: 14 });
        mvar(ctx, lx + 5, ly, 'f', { color: P.ink2, size: 14, italic: true });
        txt(ctx, lx + 14, ly, '| = ' + fm.toFixed(2), { color: P.ink3, size: 13 });
      }
    }
    function setK(e) {
      var r = canvas.getBoundingClientRect();
      kpt = [((e.clientX - r.left - bz.cx) / bz.R) * BZR, -((e.clientY - r.top - bz.cy) / bz.R) * BZR];
      draw();
    }
    var dragging = false;
    canvas.addEventListener('pointerdown', function (e) { var r = canvas.getBoundingClientRect(), stacked = canvas.hasAttribute('data-graphene-tb') && r.width < 420; if (stacked ? e.clientY-r.top < 200 : e.clientX-r.left < r.width*0.5) { dragging = true; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} setK(e); } });
    canvas.addEventListener('pointermove', function (e) { if (dragging) setK(e); });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('pointercancel', function () { dragging = false; });
    var bK = document.getElementById('ph-toK'), bG = document.getElementById('ph-toG');
    if (bK) bK.addEventListener('click', function () { kpt = [BZR, 0]; draw(); });
    if (bG) bG.addEventListener('click', function () { kpt = [0, 0]; draw(); });
    var bKprime = document.getElementById('ph-toKprime');
    if (bKprime) bKprime.addEventListener('click', function () { kpt = [-BZR, 0]; draw(); });
    window.addEventListener('resize', draw); onLang(draw); draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure B — real-space honeycomb lattice (Bravais points, unit cell,
  //  A/B sites, a₁,a₂) with a translate-and-compare control.
  // ════════════════════════════════════════════════════════════════════
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
      btnA.classList.toggle('active', m === 'aa'); btnB.classList.toggle('active', m === 'ab');
      // Both lines share one structure: 説明（操作）：<結果>。 — colon + a single result
      // clause, no dashes (house style forbids — / ――; use 句点・コロン・接続語 only).
      if (status) status.innerHTML = (m === 'aa')
        ? '<span class="i18n-en">Move to an atom with the same orientation (A→A): <span class="sok">the whole pattern overlaps.</span></span><span class="i18n-ja">同じ向きの原子へ移動（A→A）：<span class="sok">模様全体が重なる。</span></span>'
        : '<span class="i18n-en">Move to a neighbouring atom (A→B): <span class="sno">one set of atoms falls in empty hexagon centres, so the patterns do not coincide.</span></span><span class="i18n-ja">隣の原子へ移動（A→B）：<span class="sno">一方の原子群が六角形中心の空所へ落ち、模様は重ならない。</span></span>';
      cancelAnimationFrame(raf); tick();
    }
    function tick() { anim = min(1, anim + 0.016); draw(); if (anim < 1) raf = requestAnimationFrame(tick); }
    function reset() {
      mode = null; vec = [0, 0]; anim = 0; btnA.classList.remove('active'); btnB.classList.remove('active');
      if (status) status.innerHTML = '<span class="i18n-en">&nbsp;</span><span class="i18n-ja">&nbsp;</span>';
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
    window.addEventListener('resize', draw);
    draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure B2 — a two-dot rhombic stamp with sides a1,a2. Its A mark lands on
  //  each point R of the triangular Bravais lattice and its B mark one bond above,
  //  building the honeycomb.
  // ════════════════════════════════════════════════════════════════════
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
      setStatus('<span class="i18n-en">The stamp lands on one lattice point after another. <span class="sok">Where it has landed, the honeycomb stands.</span></span><span class="i18n-ja">判子が格子点を一つずつ押していく。<span class="sok">押し終えたところから蜂の巣が立ち上がる。</span></span>');
      cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    }
    function reset() { mode = null; prog = 0; setBtns(); setStatus(); cancelAnimationFrame(raf); draw(); }
    function tick(now) {
      if (!t0) t0 = now;
      prog = min(1, (now - t0) / T); draw();
      if (prog < 1) raf = requestAnimationFrame(tick);
      else setStatus('<span class="i18n-en">Every lattice point has been stamped. <span class="sok">The landing positions are the Bravais lattice; the two carved dots are the basis; together they are the honeycomb.</span></span><span class="i18n-ja">すべての格子点を押し終えた。<span class="sok">押した位置の集合がブラベー格子、彫った二点が基底、合わせて蜂の巣。</span></span>');
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
    }
    if (bP) bP.addEventListener('click', press);
    if (bR) bR.addEventListener('click', reset);
    window.addEventListener('resize', draw); onLang(draw);
    draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure C — 3D energy surface E(k); Dirac cones at the BZ corners.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-band3d'); if (!canvas) return;
    var fig = canvas.closest('.gfig');
    var btnRot = document.getElementById('b3-rot'), btnEF = document.getElementById('b3-ef'), btnReset = document.getElementById('b3-reset');

    var BZR = 4 * PI / 3;                 // a = 1
    var kScale = 0.95 / BZR, eScale = 0.9 / (3 * 3.4);   // FIXED → surface scales with t; E exaggerated so the surface reads taller (band spread + contact convergence)
    var apo = BZR * sqrt3 / 2;
    var corners = [], Mpts = [];
    for (var n = 0; n < 6; n++) { var ang = n * PI / 3; corners.push([BZR * cos(ang), BZR * sin(ang), n % 2 === 0 ? 'K' : 'K′']); }
    for (var n = 0; n < 6; n++) { var am = PI / 6 + n * PI / 3; Mpts.push([apo * cos(am), apo * sin(am)]); }
    var L = (function () { var x = 0.34, y = 0.46, z = 0.82, m = sqrt(x * x + y * y + z * z); return [x / m, y / m, z / m]; })();

    // ── clip a polygon to the hexagon (Sutherland–Hodgman, 6 half-planes) ──
    function clipHex(poly) {
      for (var n = 0; n < 6; n++) {
        var a = PI / 6 + n * PI / 3, nx = cos(a), ny = sin(a), out = [], L2 = poly.length;
        for (var i = 0; i < L2; i++) {
          var A = poly[i], B = poly[(i + 1) % L2];
          var da = nx * A.kx + ny * A.ky - apo, db = nx * B.kx + ny * B.ky - apo;
          var inA = da <= 1e-9;
          if (inA) out.push(A);
          if (inA !== (db <= 1e-9)) { var tt = da / (da - db); out.push({ kx: A.kx + (B.kx - A.kx) * tt, ky: A.ky + (B.ky - A.ky) * tt }); }
        }
        poly = out; if (!poly.length) break;
      }
      return poly;
    }
    var cellC = {};
    function cells(N) {
      if (cellC[N]) return cellC[N];
      var out = [], step = 2 * BZR / N;
      for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
        var x0 = -BZR + i * step, y0 = -BZR + j * step;
        var c = clipHex([{ kx: x0, ky: y0 }, { kx: x0 + step, ky: y0 }, { kx: x0 + step, ky: y0 + step }, { kx: x0, ky: y0 + step }]);
        if (c.length >= 3) out.push(c);
      }
      cellC[N] = out; return out;
    }
    // ── per-vertex model position + analytic normal + energy (cached by N,t) ──
    var shaded = null;
    function buildShaded(N, t) {
      if (shaded && shaded.N === N && shaded.t === t) return shaded;
      var cl = cells(N), out = [];
      for (var ci = 0; ci < cl.length; ci++) {
        var poly = cl[ci], vs = [];
        for (var vi = 0; vi < poly.length; vi++) {
          var kx = poly[vi].kx, ky = poly[vi].ky;
          var g = 3 + 2 * cos(kx) + 4 * cos(kx / 2) * cos(ky * sqrt3 / 2); if (g < 0) g = 0;
          var E = t * sqrt(g), sq = sqrt(max(g, 0.03));
          var g_kx = -2 * sin(kx) - 2 * sin(kx / 2) * cos(ky * sqrt3 / 2);
          var g_ky = -2 * sqrt3 * cos(kx / 2) * sin(ky * sqrt3 / 2);
          var E_kx = t * g_kx / (2 * sq), E_ky = t * g_ky / (2 * sq);
          var nx = -eScale * E_kx * kScale, ny = -eScale * E_ky * kScale, nz = kScale * kScale;
          var nm = sqrt(nx * nx + ny * ny + nz * nz) || 1;
          vs.push({ X: kx * kScale, Y: ky * kScale, Z: E * eScale, e: E, nx: nx / nm, ny: ny / nm, nz: nz / nm });
        }
        out.push(vs);
      }
      shaded = { N: N, t: t, cells: out, eMax: 3 * t }; return shaded;
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function eColor(e, eMax) {
      var u = max(-1, min(1, e / eMax)), c0, c1, tt;
      if (u >= 0) { c0 = P.up0; c1 = P.up1; tt = u; } else { c0 = P.lo0; c1 = P.lo1; tt = -u; }
      return [lerp(c0[0], c1[0], tt), lerp(c0[1], c1[1], tt), lerp(c0[2], c1[2], tt)];
    }

    var DEF_THETA = 70 * PI / 180, DEF_PHI = -25 * PI / 180, DEF_ZOOM = 1;
    var theta = DEF_THETA, phi = DEF_PHI, zoom = DEF_ZOOM, panX = 0, panY = 0;
    var offU = null, offL = null;   // reused offscreen layers — each band rendered opaque here, then composited TRANSLUCENTLY (smooth & seamless; lets the back band + axes show through)
    var autoRotate = !canvas.hasAttribute('data-graphene-tb'), showEF = false, dragging = false, dirty = true;
    var tHop = 2.7;   // hopping t is fixed now (the t slider was removed) — it only sets the overall energy scale, not the band shape

    function draw(N) {
      var o = dpr(canvas, 470, 1.35), ctx = o.ctx, W = o.w, H = o.h;   // dpr capped low (translucent fill-rate is the cost; shading stays smooth)
      ground(ctx, W, H);
      var sh = buildShaded(N, tHop), eMax = sh.eMax;
      var cosT = cos(theta), sinT = sin(theta), cosP = cos(phi), sinP = sin(phi);
      var viewScale = min(W, H) * (canvas.hasAttribute('data-graphene-tb') && W < 420 ? 0.36 : 0.42) * zoom, cxp = W * (canvas.hasAttribute('data-graphene-tb') ? 0.5 : 0.52) + panX, cyp = H * 0.44 + panY;
      function proj(X, Y, Z) {
        var x1 = X * cosP - Y * sinP, y1 = X * sinP + Y * cosP, y2 = y1 * cosT + Z * sinT, z2 = Z * cosT - y1 * sinT;
        return { sx: cxp + x1 * viewScale, sy: cyp - y2 * viewScale, depth: z2 };
      }
      var _p = { sx: 0, sy: 0, depth: 0 };           // reused slot for the hot vertex loop (no per-vertex allocation)
      function projS(X, Y, Z) {
        var x1 = X * cosP - Y * sinP, y1 = X * sinP + Y * cosP, y2 = y1 * cosT + Z * sinT;
        _p.sx = cxp + x1 * viewScale; _p.sy = cyp - y2 * viewScale; _p.depth = Z * cosT - y1 * sinT; return _p;
      }
      var floorZ = -(eMax + 0.5 * tHop) * eScale;

      // ── floor hexagon + spokes (behind) ──
      function hex(Z) { ctx.beginPath(); for (var n = 0; n <= 6; n++) { var a = n * PI / 3, p = proj(BZR * cos(a) * kScale, BZR * sin(a) * kScale, Z); if (n === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy); } ctx.closePath(); }
      ctx.strokeStyle = P.structure; ctx.lineWidth = 1.2; hex(floorZ); ctx.stroke();
      var g0 = proj(0, 0, floorZ);
      ctx.strokeStyle = P.grid; ctx.lineWidth = 0.8;
      for (var n = 0; n < 6; n++) { var a = n * PI / 3, p = proj(BZR * cos(a) * kScale, BZR * sin(a) * kScale, floorZ); ctx.beginPath(); ctx.moveTo(g0.sx, g0.sy); ctx.lineTo(p.sx, p.sy); ctx.stroke(); }
      // E_F = 0 plane (optional)
      // (the E_F=0 plane is drawn ON TOP after the surfaces — see below — so it stays visible)

      // ── surface: TWO independent TRANSLUCENT sheets — upper dome (蘇芳), lower bowl (teal).
      //    Each band is rendered OPAQUE to its own offscreen layer (fill + matching stroke ⇒ no
      //    inter-cell cracks ⇒ smooth, NO "wireframe"), then the two layers are composited at
      //    SURF_A so the BACK band shows THROUGH the front one (translucency) while the front
      //    band's colour still dominates the overlap (no mud). The sheets are NOT joined by any
      //    wall; they meet only at the K/K′ corners. The axes are drawn solid underneath, so a
      //    band covering one makes it read through the glass — exactly the look asked for. ──
      var cl = sh.cells, up0 = P.up0, up1 = P.up1, lo0 = P.lo0, lo1 = P.lo1, Lx = L[0], Ly = L[1], Lz = L[2], SURF_A = 0.84;
      var loPolys = [], upPolys = [];
      for (var ci = 0; ci < cl.length; ci++) {
        var vs = cl[ci];
        for (var band = -1; band <= 1; band += 2) {
          var pv = [], dsum = 0, sr = 0, sg = 0, sb = 0, vn = vs.length, bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
          for (var kk = 0; kk < vn; kk++) {
            var v = vs[kk], pp = projS(v.X, v.Y, band * v.Z); dsum += pp.depth;
            var nx0 = band > 0 ? v.nx : -v.nx, ny0 = band > 0 ? v.ny : -v.ny;
            var rx = nx0 * cosP - ny0 * sinP, ry1 = nx0 * sinP + ny0 * cosP, ry = ry1 * cosT + v.nz * sinT, rz = v.nz * cosT - ry1 * sinT;
            var br = 0.74 + 0.26 * abs(rx * Lx + ry * Ly + rz * Lz);   // gentle range ⇒ smooth tonal form
            var u = (band * v.e) / eMax; if (u > 1) u = 1; else if (u < -1) u = -1;
            var t2, c0, c1; if (u >= 0) { c0 = up0; c1 = up1; t2 = u; } else { c0 = lo0; c1 = lo1; t2 = -u; }
            sr += (c0[0] + (c1[0] - c0[0]) * t2) * br; sg += (c0[1] + (c1[1] - c0[1]) * t2) * br; sb += (c0[2] + (c1[2] - c0[2]) * t2) * br;
            pv.push(pp.sx, pp.sy);
            if (pp.sx < bx0) bx0 = pp.sx; if (pp.sx > bx1) bx1 = pp.sx; if (pp.sy < by0) by0 = pp.sy; if (pp.sy > by1) by1 = pp.sy;
          }
          (band > 0 ? upPolys : loPolys).push({ d: dsum / vn, pv: pv, bx0: bx0, by0: by0, bx1: bx1, by1: by1, col: 'rgb(' + (min(255, sr / vn) | 0) + ',' + (min(255, sg / vn) | 0) + ',' + (min(255, sb / vn) | 0) + ')' });
        }
      }
      // render one band, depth-sorted within itself, OPAQUE (fill + same-colour stroke ⇒ no
      // inter-cell cracks ⇒ smooth, no "wireframe") to its reused offscreen layer.
      var R = canvas.width / W;
      if (!offU) { offU = document.createElement('canvas'); offL = document.createElement('canvas'); }
      function bandLayer(off, polys) {
        if (off.width !== canvas.width || off.height !== canvas.height) { off.width = canvas.width; off.height = canvas.height; }
        var bx = off.getContext('2d'); bx.setTransform(R, 0, 0, R, 0, 0); bx.clearRect(0, 0, W, H);
        bx.lineJoin = 'round'; bx.lineCap = 'round'; bx.lineWidth = 0.85;
        polys.sort(function (a, b) { return a.d - b.d; });
        for (var k = 0; k < polys.length; k++) {
          var it = polys[k], q = it.pv; bx.fillStyle = it.col; bx.strokeStyle = it.col;
          bx.beginPath(); for (var j = 0; j < q.length; j += 2) { if (j === 0) bx.moveTo(q[j], q[j + 1]); else bx.lineTo(q[j], q[j + 1]); } bx.closePath(); bx.fill(); bx.stroke();
        }
      }
      bandLayer(offL, loPolys); bandLayer(offU, upPolys);

      // ── axes (E, k_x, k_y), depth-tested PER SEGMENT against the surface cells. A segment in
      //    FRONT of the surface is drawn SOLID over the composite; a segment BEHIND it is drawn
      //    UNDERNEATH first, so the translucent band composites over it and it reads through the
      //    glass. "Covered by the 2-D footprint" is NOT the test — the E tip is above the dome
      //    (front), an axis can pass in front of the bowl's near rim (front), etc. ──
      function ptInPoly(x, y, q) {
        var inside = false, np = q.length / 2, jj = np - 1;
        for (var ii = 0; ii < np; ii++) { var xi = q[2 * ii], yi = q[2 * ii + 1], xj = q[2 * jj], yj = q[2 * jj + 1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside; jj = ii; }
        return inside;
      }
      function hitArr(arr, sx, sy, dep) {
        for (var ai = 0; ai < arr.length; ai++) { var cc = arr[ai]; if (cc.d <= dep) continue; if (sx < cc.bx0 || sx > cc.bx1 || sy < cc.by0 || sy > cc.by1) continue; if (ptInPoly(sx, sy, cc.pv)) return true; }
        return false;
      }
      function behindSurf(sx, sy, dep) { return hitArr(loPolys, sx, sy, dep) || hitArr(upPolys, sx, sy, dep); }  // is a surface cell NEARER than this point covering it?
      var axBack = [], axFront = [];
      function axisSplit(tx, ty, tz) {
        var nseg = 18, pa = proj(0, 0, floorZ);
        for (var i = 1; i <= nseg; i++) {
          var tt = i / nseg, pb = proj(tx * tt, ty * tt, floorZ + (tz - floorZ) * tt);
          (behindSurf((pa.sx + pb.sx) / 2, (pa.sy + pb.sy) / 2, (pa.depth + pb.depth) / 2) ? axBack : axFront).push({ x0: pa.sx, y0: pa.sy, x1: pb.sx, y1: pb.sy });
          if (i === nseg) { var dl = hypot(pb.sx - pa.sx, pb.sy - pa.sy) || 1; (behindSurf(pb.sx, pb.sy, pb.depth) ? axBack : axFront).push({ head: 1, x: pb.sx, y: pb.sy, ux: (pb.sx - pa.sx) / dl, uy: (pb.sy - pa.sy) / dl }); }
          pa = pb;
        }
      }
      axisSplit(BZR * 0.6 * kScale, 0, floorZ);
      axisSplit(0, BZR * 0.6 * kScale, floorZ);
      axisSplit(0, 0, eMax * eScale * 1.2);
      function drawAxisList(list) {
        ctx.strokeStyle = P.axis; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        for (var li = 0; li < list.length; li++) { var s = list[li]; if (s.head) ahead(ctx, s.x, s.y, s.ux, s.uy, 7); else { ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke(); } }
      }
      drawAxisList(axBack);   // BEHIND parts first — the translucent bands composite OVER them ⇒ read through the glass

      // composite the sheets translucently: lower band (back) → E_F=0 plane (between) → upper band.
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = SURF_A; ctx.drawImage(offL, 0, 0); ctx.globalAlpha = 1; ctx.restore();
      if (showEF) {
        var fpts = [];
        for (var fn = 0; fn <= 6; fn++) { var fa = fn * PI / 3; fpts.push(proj(BZR * cos(fa) * kScale, BZR * sin(fa) * kScale, 0)); }
        ctx.beginPath(); fpts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy); }); ctx.closePath();
        ctx.fillStyle = P.rgba(P.neut, 0.2); ctx.fill();
        ctx.strokeStyle = P.rgba(P.neut, 0.6); ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke();
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = SURF_A; ctx.drawImage(offU, 0, 0); ctx.globalAlpha = 1; ctx.restore();

      drawAxisList(axFront);   // FRONT parts over the composite — solid (in front of the surface)

      // (K/K′ are NOT marked at E=0 any more — all high-symmetry points live on the floor,
      //  drawn in the label block below. The contact above each K/K′ is read from the
      //  surface pinching to a point there.)

      // ── axes (3D — rotate with the surface), all three meeting at the origin g0
      //    (Γ: k_x=k_y=0). k_x,k_y are short coordinate arrows kept WELL INSIDE the
      //    zone so their labels never collide with the rim K/M/K′; E rises vertically
      //    from the same origin. ──
      // tip positions kept only for label placement; the axis shafts + heads are drawn
      // above as depth-sorted segments so they pass correctly behind the surface
      var kxp = proj(BZR * 0.6 * kScale, 0, floorZ), kyp = proj(0, BZR * 0.6 * kScale, floorZ), eAxT = proj(0, 0, eMax * eScale * 1.2);

      // ── labels: each sits at a FIXED offset from its point (no free-space search) so the
      //    direction never flips as the view rotates. High-symmetry points go radially OUTWARD
      //    from the BZ centre Γ (which rotates smoothly ⇒ no jitter); axis labels sit beside
      //    their arrow; k_x / k_y appear only while their head faces the viewer. ──
      mvar(ctx, eAxT.sx + 9, eAxT.sy - 1, 'E', { size: 16, color: P.ink2, align: 'center' });
      [[kxp, 'x', 0], [kyp, 'y', PI / 2]].forEach(function (a) {
        if (behindSurf(a[0].sx, a[0].sy, a[0].depth)) return;   // arrow head actually occluded by the surface → drop the label (same depth test as the shaft)
        var tp = a[0], dx = tp.sx - g0.sx, dy = tp.sy - g0.sy, dl = hypot(dx, dy) || 1, px = -dy / dl, py = dx / dl;
        mvar(ctx, tp.sx + px * 15, tp.sy + py * 15 + 5, 'k', { sub: a[1], size: 14, color: P.ink2, align: 'center' });
      });
      // ── high-symmetry points: ALL drawn in the SAME subordinate neutral as the axes & BZ
      //    frame (reference ticks, NOT the subject — the surface is). SHAPE encodes the physical
      //    category: K/K′ = Dirac contacts → SAME-diameter dots told apart by FILL only (K
      //    filled, K′ a hollow ring whose OUTER edge matches the dot — same size, not bigger);
      //    M = NOT a Dirac point → a short TICK (a line, a different shape ⇒ a different
      //    category); Γ = the axis crossing → NO marker (the axes already mark it). Fixed radial
      //    label + short leader. ──
      var hgc = P.axis;                 // subordinate neutral grey, shared by every high-sym marker + label
      txt(ctx, g0.sx - 12, g0.sy + 17, 'Γ', { color: hgc, italic: true, size: 14, align: 'center' });
      var RD = 4.0, RLW = 1.4;          // shared OUTER radius of K & K′ (ring outer edge = filled-dot edge)
      function floorLabel(p, lab, mr) {
        var od = hypot(p.sx - g0.sx, p.sy - g0.sy) || 1, ox = (p.sx - g0.sx) / od, oy = (p.sy - g0.sy) / od;
        var cx = p.sx + ox * 27, cy = p.sy + oy * 27;
        ctx.strokeStyle = hgc.replace('rgb', 'rgba').replace(')', ',0.5)'); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.sx + ox * (mr + 4), p.sy + oy * (mr + 4)); ctx.lineTo(cx - ox * 12, cy - oy * 12); ctx.stroke();
        txt(ctx, cx, cy + 5, lab, { color: hgc, italic: true, size: 13.5, align: 'center' });
      }
      for (var n = 0; n < 6; n++) {
        var ang = n * PI / 3; if (-sin(ang + phi) * sinT <= 0.05) continue;   // back-facing corner → hidden
        var c = corners[n], p = proj(c[0] * kScale, c[1] * kScale, floorZ), isK = (n % 2 === 0);
        ctx.strokeStyle = hgc; ctx.fillStyle = hgc;
        if (isK) { ctx.beginPath(); ctx.arc(p.sx, p.sy, RD, 0, 2 * PI); ctx.fill(); }
        else { ctx.lineWidth = RLW; ctx.beginPath(); ctx.arc(p.sx, p.sy, RD - RLW / 2, 0, 2 * PI); ctx.stroke(); }
        floorLabel(p, isK ? 'K' : 'K′', RD);
      }
      for (var n = 0; n < 6; n++) {
        var am = PI / 6 + n * PI / 3; if (-sin(am + phi) * sinT <= 0.05) continue;   // back-facing edge midpoint → hidden
        var mp = proj(Mpts[n][0] * kScale, Mpts[n][1] * kScale, floorZ);
        // M = a short tick PERPENDICULAR TO THE BZ EDGE *in the 3D floor plane* (so it crosses
        // the zone frame instead of hiding in it). The ⊥ direction is built from the edge vector
        // in k-space and then PROJECTED — it is NOT a right angle on the screen (perspective
        // tilts the floor), and it stays ⊥ to the edge in 3D as the view rotates.
        var mca = corners[n], mcb = corners[(n + 1) % 6];
        var epx = -(mcb[1] - mca[1]), epy = (mcb[0] - mca[0]);                    // ⊥ to the edge, in the floor plane (k-space)
        var mPerp = proj((Mpts[n][0] + epx * 0.25) * kScale, (Mpts[n][1] + epy * 0.25) * kScale, floorZ);
        var tdx = mPerp.sx - mp.sx, tdy = mPerp.sy - mp.sy, tdl = hypot(tdx, tdy) || 1, tux = tdx / tdl, tuy = tdy / tdl;
        ctx.strokeStyle = hgc; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(mp.sx - tux * 4, mp.sy - tuy * 4); ctx.lineTo(mp.sx + tux * 4, mp.sy + tuy * 4); ctx.stroke();
        floorLabel(mp, 'M', 4);
      }
    }

    var MESH_N = 42, raf = null, visible = true;   // mesh kept fine enough to read smooth under the translucent fill; perf comes from the low dpr cap
    function render() { draw(MESH_N); }            // immediate paint — used by every interaction (independent of the rAF loop)
    function loop() {                              // rAF loop runs ONLY while auto-rotating AND on-screen
      if (autoRotate && !dragging) { phi += 0.0016; render(); }
      raf = requestAnimationFrame(loop);
    }
    function startLoop() { if (!raf && visible && autoRotate) raf = requestAnimationFrame(loop); }
    function stopLoop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }   // halt loop + auto-rotate when off-screen / tab hidden / not rotating
    var pointers = {}, lastX, lastY, pinch = 0, panning = false;
    function nP() { return Object.keys(pointers).length; }
    canvas.addEventListener('mousedown', function (e) { if (e.button === 1) e.preventDefault(); });   // stop the browser's middle-button auto-scroll
    canvas.addEventListener('auxclick', function (e) { if (e.button === 1) e.preventDefault(); });
    canvas.addEventListener('pointerdown', function (e) { if (e.button === 1) { panning = true; e.preventDefault(); } pointers[e.pointerId] = { x: e.clientX, y: e.clientY }; dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return; pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (nP() >= 2) { var ids = Object.keys(pointers), A = pointers[ids[0]], B = pointers[ids[1]], dist = hypot(A.x - B.x, A.y - B.y); if (pinch) { zoom = max(0.55, min(2.6, zoom * dist / pinch)); render(); } pinch = dist; return; }
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (panning) { panX += dx; panY += dy; }                                          // middle (wheel) drag → pan / translate
      else { phi += dx * 0.008; theta = max(0.78, min(1.40, theta - dy * 0.008)); }      // left drag → rotate
      lastX = e.clientX; lastY = e.clientY; render();
    });
    function endP(e) { if (e.button === 1) panning = false; delete pointers[e.pointerId]; if (nP() < 2) pinch = 0; if (nP() === 0) { dragging = false; panning = false; } }
    canvas.addEventListener('pointerup', endP); canvas.addEventListener('pointercancel', endP);
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); zoom = max(0.55, min(2.6, zoom * (e.deltaY < 0 ? 1.08 : 0.926))); render(); }, { passive: false });

    btnRot.addEventListener('click', function () { autoRotate = !autoRotate; btnRot.classList.toggle('active', autoRotate); if (autoRotate) startLoop(); else stopLoop(); render(); });
    btnEF.addEventListener('click', function () { showEF = !showEF; btnEF.classList.toggle('active', showEF); render(); });
    btnReset.addEventListener('click', function () { theta = DEF_THETA; phi = DEF_PHI; zoom = DEF_ZOOM; panX = 0; panY = 0; render(); });
    window.addEventListener('resize', function () { render(); });
    onLang(function () { render(); });
    if (fig) fig.classList.add('is-grab');
    // pause the loop entirely when the figure is scrolled off-screen or the tab is hidden,
    // so nothing renders or accumulates while it is not being looked at
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { render(); startLoop(); } else stopLoop(); }, { threshold: 0.04 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopLoop(); else if (visible) { render(); startLoop(); } });
    render();      // first paint immediately (does not wait on rAF)
    startLoop();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure 4.1 — zoom into K. A cut of the two bands along k_x through K;
  //  a zoom control shrinks the window until the rounded band reads as two
  //  straight lines crossing at K (same 2-D plot design as the band curve).
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-zoomK'); if (!canvas) return;
    var sZ = document.getElementById('c41-z'), oZ = document.getElementById('c41-z-o');
    var BZR = 4 * PI / 3, ZMIN = 0.034;
    function gOf(k) { var g = 3 + 2 * cos(k) + 4 * cos(k / 2); return g < 0 ? 0 : g; }   // along k_y = 0
    function draw() {
      var o = dpr(canvas, 300), ctx = o.ctx, W = o.w, H = o.h; ground(ctx, W, H);
      var z = +sZ.value, D = BZR * 0.95 * Math.pow(ZMIN, z);
      var pad = { l: 34, r: 22, t: 24, b: 36 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
      var Emax = 0, i; for (i = 0; i <= 90; i++) { var s = -D + 2 * D * i / 90, E = sqrt(gOf(BZR + s)); if (E > Emax) Emax = E; }
      Emax = max(Emax, 0.2) * 1.1;
      var cx = pad.l + pw / 2;
      function sx(s) { return cx + (s / D) * (pw / 2); }
      function sy(E) { return pad.t + (1 - (E + Emax) / (2 * Emax)) * ph; }
      ctx.strokeStyle = P.rgba(P.neut, 0.32); ctx.setLineDash([5, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(pad.l + pw, sy(0)); ctx.stroke(); ctx.setLineDash([]);
      mvar(ctx, pad.l + pw - 2, sy(0) + 15, 'q', { color: P.ink3, size: 12, align: 'right', sub: 'x' });
      arrow(ctx, pad.l, sy(-Emax) + 2, pad.l, pad.t - 8, P.axis, 1.2, 7);
      mvar(ctx, pad.l - 9, pad.t - 12, 'E', { color: P.ink2, size: 15, align: 'right' });
      ctx.strokeStyle = P.rgba(P.neut, 0.18); ctx.setLineDash([2, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, pad.t + ph); ctx.stroke(); ctx.setLineDash([]);
      txt(ctx, cx, pad.t + ph + 17, 'K', { color: P.ink3, italic: true, size: 13, align: 'center' });
      function band(sign, col) { ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); for (var i = 0; i <= 260; i++) { var s = -D + 2 * D * i / 260, E = sign * sqrt(gOf(BZR + s)), X = sx(s), Y = sy(E); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } ctx.stroke(); }
      band(1, P.curve); band(-1, P.rgb(P.teal));
      ctx.fillStyle = P.ink2; ctx.beginPath(); ctx.arc(cx, sy(0), 3.2, 0, 2 * PI); ctx.fill();
    }
    sZ.addEventListener('input', function () { var f = 1 / Math.pow(ZMIN, +sZ.value); oZ.textContent = '×' + (f < 9.5 ? f.toFixed(1) : Math.round(f)); draw(); });
    window.addEventListener('resize', draw);
    oZ.textContent = '×' + (1 / Math.pow(ZMIN, +sZ.value)).toFixed(1); draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure 4.2 — tangent approximation. The true band along a cut through
  //  K and its straight tangent ±(√3/2)t|q| (terracotta dashes); a marker at
  //  distance |q| shows the two coincide near K and part as |q| grows.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-tangent'); if (!canvas) return;
    var sQ = document.getElementById('c42-q'), oQ = document.getElementById('c42-q-o');
    var BZR = 4 * PI / 3, slopeF = sqrt3 / 2;   // ħv_F = (3a/2)t → slope (√3/2)t along k_x
    function gOf(k) { var g = 3 + 2 * cos(k) + 4 * cos(k / 2); return g < 0 ? 0 : g; }
    function draw() {
      var o = dpr(canvas, 300), ctx = o.ctx, W = o.w, H = o.h; ground(ctx, W, H);
      var D = BZR * 0.5, pad = { l: 34, r: 22, t: 24, b: 36 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
      var Emax = 0, i; for (i = 0; i <= 90; i++) { var s = -D + 2 * D * i / 90, E = sqrt(gOf(BZR + s)); if (E > Emax) Emax = E; }
      Emax *= 1.1;
      var cx = pad.l + pw / 2;
      function sx(s) { return cx + (s / D) * (pw / 2); }
      function sy(E) { return pad.t + (1 - (E + Emax) / (2 * Emax)) * ph; }
      ctx.strokeStyle = P.rgba(P.neut, 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(pad.l + pw, sy(0)); ctx.stroke();
      mvar(ctx, pad.l + pw - 2, sy(0) + 15, 'q', { color: P.ink3, size: 12, align: 'right' });
      arrow(ctx, pad.l, sy(-Emax) + 2, pad.l, pad.t - 8, P.axis, 1.2, 7);
      mvar(ctx, pad.l - 9, pad.t - 12, 'E', { color: P.ink2, size: 15, align: 'right' });
      txt(ctx, cx, pad.t + ph + 17, 'K', { color: P.ink3, italic: true, size: 13, align: 'center' });
      // straight tangent V (linear approximation) — terracotta dashes
      ctx.strokeStyle = P.basis; ctx.lineWidth = 1.7; ctx.setLineDash([5, 4]); ctx.lineJoin = 'round';
      [1, -1].forEach(function (sg) { ctx.beginPath(); ctx.moveTo(sx(-D), sy(sg * slopeF * D)); ctx.lineTo(sx(0), sy(0)); ctx.lineTo(sx(D), sy(sg * slopeF * D)); ctx.stroke(); });
      ctx.setLineDash([]);
      // true bands (solid)
      function band(sign, col) { ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); for (var i = 0; i <= 260; i++) { var s = -D + 2 * D * i / 260, E = sign * sqrt(gOf(BZR + s)), X = sx(s), Y = sy(E); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } ctx.stroke(); }
      band(1, P.curve); band(-1, P.rgb(P.teal));
      // |q| marker: deviation between the true band and the tangent
      var qf = +sQ.value, sq = qf * D, Etrue = sqrt(gOf(BZR + sq)), Etan = slopeF * sq;
      ctx.strokeStyle = P.ink2; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(sx(sq), sy(0)); ctx.lineTo(sx(sq), sy(max(Etrue, Etan))); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = P.basis; ctx.beginPath(); ctx.arc(sx(sq), sy(Etan), 3.4, 0, 2 * PI); ctx.fill();
      ctx.fillStyle = P.curve; ctx.beginPath(); ctx.arc(sx(sq), sy(Etrue), 3.6, 0, 2 * PI); ctx.fill();
      // legend (band vs tangent)
      var lx = pad.l + 8, ly = pad.t + 6;
      ctx.strokeStyle = P.curve; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 16, ly); ctx.stroke();
      txt(ctx, lx + 21, ly + 4, curLang() === 'ja' ? 'バンド' : 'band', { color: P.ink3, size: 11, align: 'left' });
      ctx.strokeStyle = P.basis; ctx.lineWidth = 1.7; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(lx, ly + 15); ctx.lineTo(lx + 16, ly + 15); ctx.stroke(); ctx.setLineDash([]);
      txt(ctx, lx + 21, ly + 19, curLang() === 'ja' ? '接線近似' : 'tangent', { color: P.ink3, size: 11, align: 'left' });
    }
    sQ.addEventListener('input', function () { oQ.textContent = '|q| = ' + (+sQ.value * BZR * 0.5).toFixed(2); draw(); });
    window.addEventListener('resize', draw); onLang(draw);
    oQ.textContent = '|q| = ' + (+sQ.value * BZR * 0.5).toFixed(2); draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure 4.3 — the Dirac cones E = ±√((ħv_F|q|)² + Δ²). Same 3-D engine
  //  as the band surface (two TRANSLUCENT offscreen sheets composited over
  //  depth-tested axes), but the surface is an actual cone over the q-disk,
  //  so it READS as a cone. q sits on the floor with a dropline to the upper
  //  cone; v_F sets the slope; Δ splits the apex into a gap; a faint parabola
  //  (toggle) contrasts the linear cone with an ordinary (quadratic) edge.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-cone'); if (!canvas) return;
    var fig = canvas.closest('.gfig');
    var btnSpin = document.getElementById('cone-spin'), btnPara = document.getElementById('cone-para'), btnReset = document.getElementById('cone-reset');
    var sV = document.getElementById('c43-v'), oV = document.getElementById('c43-v-o');
    var sG = document.getElementById('c43-g'), oG = document.getElementById('c43-g-o');

    var Rk = 1.0, kS = 0.95, eS = 0.6, NR = 16, NS = 44;
    var SCt = []; for (var jj = 0; jj <= NS; jj++) { var aa = jj / NS * 2 * PI; SCt.push([cos(aa), sin(aa)]); }
    var L = (function () { var x = 0.34, y = 0.46, z = 0.82, m = sqrt(x * x + y * y + z * z); return [x / m, y / m, z / m]; })();

    var DEF_THETA = 68 * PI / 180, DEF_PHI = -25 * PI / 180, DEF_ZOOM = 1;
    var theta = DEF_THETA, phi = DEF_PHI, zoom = DEF_ZOOM, panX = 0, panY = 0;
    var vF = 1, gap = 0, showPara = false, autoRotate = true, dragging = false, visible = true;
    var offU = null, offL = null;

    function Eof(r) { return sqrt(vF * vF * r * r + gap * gap); }
    function slope(r) { var E = Eof(r); return E < 1e-9 ? (gap > 0 ? 0 : vF) : vF * vF * r / E; }

    function draw() {
      var o = dpr(canvas, 470, 1.35), ctx = o.ctx, W = o.w, H = o.h; ground(ctx, W, H);
      var eMax = Eof(Rk);
      var cosT = cos(theta), sinT = sin(theta), cosP = cos(phi), sinP = sin(phi);
      var viewScale = min(W, H) * 0.37 * zoom, cxp = W * 0.52 + panX, cyp = H * 0.47 + panY;
      function proj(X, Y, Z) { var x1 = X * cosP - Y * sinP, y1 = X * sinP + Y * cosP, y2 = y1 * cosT + Z * sinT, z2 = Z * cosT - y1 * sinT; return { sx: cxp + x1 * viewScale, sy: cyp - y2 * viewScale, depth: z2 }; }
      var _p = { sx: 0, sy: 0, depth: 0 };
      function projS(X, Y, Z) { var x1 = X * cosP - Y * sinP, y1 = X * sinP + Y * cosP, y2 = y1 * cosT + Z * sinT; _p.sx = cxp + x1 * viewScale; _p.sy = cyp - y2 * viewScale; _p.depth = Z * cosT - y1 * sinT; return _p; }
      var floorZ = -(eMax * eS) - 0.16, g0 = proj(0, 0, floorZ), j, i;

      // ── floor: q-disk + concentric guide + spokes (behind everything) ──
      ctx.strokeStyle = P.structure; ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
      ctx.beginPath(); for (j = 0; j <= NS; j++) { var pf = proj(Rk * SCt[j][0] * kS, Rk * SCt[j][1] * kS, floorZ); if (j === 0) ctx.moveTo(pf.sx, pf.sy); else ctx.lineTo(pf.sx, pf.sy); } ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = P.grid; ctx.lineWidth = 0.8;
      ctx.beginPath(); for (j = 0; j <= NS; j++) { var pg = proj(0.5 * Rk * SCt[j][0] * kS, 0.5 * Rk * SCt[j][1] * kS, floorZ); if (j === 0) ctx.moveTo(pg.sx, pg.sy); else ctx.lineTo(pg.sx, pg.sy); } ctx.closePath(); ctx.stroke();
      for (j = 0; j < NS; j += 11) { var ps = proj(Rk * SCt[j][0] * kS, Rk * SCt[j][1] * kS, floorZ); ctx.beginPath(); ctx.moveTo(g0.sx, g0.sy); ctx.lineTo(ps.sx, ps.sy); ctx.stroke(); }

      // ── cone cells: both bands, one quad per (ring, sector) ──
      var upPolys = [], loPolys = [], up0 = P.up0, up1 = P.up1, lo0 = P.lo0, lo1 = P.lo1, Lx = L[0], Ly = L[1], Lz = L[2], SURF_A = 0.84, en = eS / kS;
      for (i = 0; i < NR; i++) {
        var r0 = i / NR * Rk, r1 = (i + 1) / NR * Rk, E0 = Eof(r0), E1 = Eof(r1), m0 = slope(r0), m1 = slope(r1);
        for (j = 0; j < NS; j++) {
          var c0 = SCt[j], c1 = SCt[j + 1], rr = [r0, r1, r1, r0], cc = [c0, c0, c1, c1], EE = [E0, E1, E1, E0], mm = [m0, m1, m1, m0];
          for (var band = -1; band <= 1; band += 2) {
            var pv = [], dsum = 0, sr = 0, sg = 0, sb = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
            for (var kk = 0; kk < 4; kk++) {
              var rC = rr[kk], cs = cc[kk], EC = EE[kk], mC = mm[kk];
              var pp = projS(rC * cs[0] * kS, rC * cs[1] * kS, band * EC * eS); dsum += pp.depth;
              var nx = -en * mC * cs[0], ny = -en * mC * cs[1], nz = 1, nm = sqrt(nx * nx + ny * ny + 1) || 1; nx /= nm; ny /= nm; nz /= nm;
              var rx = nx * cosP - ny * sinP, ry1 = nx * sinP + ny * cosP, ry = ry1 * cosT + nz * sinT, rz = nz * cosT - ry1 * sinT;
              var br = 0.74 + 0.26 * abs(rx * Lx + ry * Ly + rz * Lz);
              var u = (band * EC) / eMax; if (u > 1) u = 1; else if (u < -1) u = -1;
              var t2, d0, d1; if (u >= 0) { d0 = up0; d1 = up1; t2 = u; } else { d0 = lo0; d1 = lo1; t2 = -u; }
              sr += (d0[0] + (d1[0] - d0[0]) * t2) * br; sg += (d0[1] + (d1[1] - d0[1]) * t2) * br; sb += (d0[2] + (d1[2] - d0[2]) * t2) * br;
              pv.push(pp.sx, pp.sy);
              if (pp.sx < bx0) bx0 = pp.sx; if (pp.sx > bx1) bx1 = pp.sx; if (pp.sy < by0) by0 = pp.sy; if (pp.sy > by1) by1 = pp.sy;
            }
            (band > 0 ? upPolys : loPolys).push({ d: dsum / 4, pv: pv, bx0: bx0, by0: by0, bx1: bx1, by1: by1, col: 'rgb(' + (min(255, sr / 4) | 0) + ',' + (min(255, sg / 4) | 0) + ',' + (min(255, sb / 4) | 0) + ')' });
          }
        }
      }
      var R = canvas.width / W;
      if (!offU) { offU = document.createElement('canvas'); offL = document.createElement('canvas'); }
      function bandLayer(off, polys) {
        if (off.width !== canvas.width || off.height !== canvas.height) { off.width = canvas.width; off.height = canvas.height; }
        var bx = off.getContext('2d'); bx.setTransform(R, 0, 0, R, 0, 0); bx.clearRect(0, 0, W, H);
        bx.lineJoin = 'round'; bx.lineCap = 'round'; bx.lineWidth = 0.8;
        polys.sort(function (a, b) { return a.d - b.d; });
        for (var k = 0; k < polys.length; k++) { var it = polys[k], q = it.pv; bx.fillStyle = it.col; bx.strokeStyle = it.col; bx.beginPath(); for (var t = 0; t < q.length; t += 2) { if (t === 0) bx.moveTo(q[t], q[t + 1]); else bx.lineTo(q[t], q[t + 1]); } bx.closePath(); bx.fill(); bx.stroke(); }
      }
      bandLayer(offL, loPolys); bandLayer(offU, upPolys);

      // ── axes (q_x, q_y on the floor; E vertical), depth-tested per segment ──
      function ptInPoly(x, y, q) { var inside = false, np = q.length / 2, jj = np - 1; for (var ii = 0; ii < np; ii++) { var xi = q[2 * ii], yi = q[2 * ii + 1], xj = q[2 * jj], yj = q[2 * jj + 1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside; jj = ii; } return inside; }
      function hitArr(arr, sx, sy, dep) { for (var ai = 0; ai < arr.length; ai++) { var c2 = arr[ai]; if (c2.d <= dep) continue; if (sx < c2.bx0 || sx > c2.bx1 || sy < c2.by0 || sy > c2.by1) continue; if (ptInPoly(sx, sy, c2.pv)) return true; } return false; }
      function behindSurf(sx, sy, dep) { return hitArr(loPolys, sx, sy, dep) || hitArr(upPolys, sx, sy, dep); }
      var axBack = [], axFront = [];
      function axisSplit(tx, ty, tz) { var nseg = 18, pa = proj(0, 0, floorZ); for (var i = 1; i <= nseg; i++) { var tt = i / nseg, pb = proj(tx * tt, ty * tt, floorZ + (tz - floorZ) * tt); (behindSurf((pa.sx + pb.sx) / 2, (pa.sy + pb.sy) / 2, (pa.depth + pb.depth) / 2) ? axBack : axFront).push({ x0: pa.sx, y0: pa.sy, x1: pb.sx, y1: pb.sy }); if (i === nseg) { var dl = hypot(pb.sx - pa.sx, pb.sy - pa.sy) || 1; (behindSurf(pb.sx, pb.sy, pb.depth) ? axBack : axFront).push({ head: 1, x: pb.sx, y: pb.sy, ux: (pb.sx - pa.sx) / dl, uy: (pb.sy - pa.sy) / dl }); } pa = pb; } }
      axisSplit(Rk * 0.66 * kS, 0, floorZ);
      axisSplit(0, Rk * 0.66 * kS, floorZ);
      axisSplit(0, 0, eMax * eS * 1.2);
      function drawAxisList(list) { ctx.strokeStyle = P.axis; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; for (var li = 0; li < list.length; li++) { var s = list[li]; if (s.head) ahead(ctx, s.x, s.y, s.ux, s.uy, 7); else { ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke(); } } }
      drawAxisList(axBack);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = SURF_A; ctx.drawImage(offL, 0, 0); ctx.globalAlpha = 1; ctx.restore();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = SURF_A; ctx.drawImage(offU, 0, 0); ctx.globalAlpha = 1; ctx.restore();
      drawAxisList(axFront);

      // ── parabola contrast (toggle): faint dashed U/∩ in the q_y = 0 plane ──
      if (showPara) {
        ctx.strokeStyle = P.rgba(P.terra, 0.9); ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.lineJoin = 'round';
        [1, -1].forEach(function (bd) { ctx.beginPath(); for (var i = 0; i <= 64; i++) { var x = -Rk + 2 * Rk * i / 64, Ep = bd * eMax * (x * x) / (Rk * Rk), p = proj(x * kS, 0, Ep * eS); if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy); } ctx.stroke(); });
        ctx.setLineDash([]);
        var plab = proj(Rk * kS, 0, eMax * eS * 1.0);
        txt(ctx, plab.sx + 7, plab.sy - 2, curLang() === 'ja' ? '放物線' : 'parabola', { color: P.terra, size: 11, align: 'left' });
      }

      // ── axis labels + K at the floor origin ──
      var eAxT = proj(0, 0, eMax * eS * 1.2), kxp = proj(Rk * 0.66 * kS, 0, floorZ), kyp = proj(0, Rk * 0.66 * kS, floorZ);
      mvar(ctx, eAxT.sx + 9, eAxT.sy - 1, 'E', { size: 16, color: P.ink2, align: 'center' });
      [[kxp, 'x'], [kyp, 'y']].forEach(function (a) { if (behindSurf(a[0].sx, a[0].sy, a[0].depth)) return; var tp = a[0], dx = tp.sx - g0.sx, dy = tp.sy - g0.sy, dl = hypot(dx, dy) || 1, pxx = -dy / dl, pyy = dx / dl; mvar(ctx, tp.sx + pxx * 15, tp.sy + pyy * 15 + 5, 'q', { sub: a[1], size: 13, color: P.ink2, align: 'center' }); });
      txt(ctx, g0.sx - 12, g0.sy + 17, 'K', { color: P.axis, italic: true, size: 14, align: 'center' });

      // ── small vector q on the floor + dropline up to the upper cone ──
      var qr = 0.6 * Rk, qa = 32 * PI / 180, qcs = [cos(qa), sin(qa)];
      var qFloor = proj(qr * qcs[0] * kS, qr * qcs[1] * kS, floorZ), qTopE = Eof(qr), qTop = proj(qr * qcs[0] * kS, qr * qcs[1] * kS, qTopE * eS);
      ctx.strokeStyle = P.rgba(P.suo, 0.5); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(qFloor.sx, qFloor.sy); ctx.lineTo(qTop.sx, qTop.sy); ctx.stroke(); ctx.setLineDash([]);
      arrowShort(ctx, g0.sx, g0.sy, qFloor.sx, qFloor.sy, 0, P.curve, 2, 8);
      ctx.fillStyle = P.curve; ctx.beginPath(); ctx.arc(qTop.sx, qTop.sy, 3.4, 0, 2 * PI); ctx.fill();
      mvar(ctx, qFloor.sx + 7, qFloor.sy + (qFloor.sy > g0.sy ? 13 : -5), 'q', { color: P.ink2, size: 13, italic: true });
    }

    var raf = null;
    function render() { draw(); }
    function loop() { if (autoRotate && !dragging) { phi += 0.0016; render(); } raf = requestAnimationFrame(loop); }
    function startLoop() { if (!raf && visible && autoRotate) raf = requestAnimationFrame(loop); }
    function stopLoop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    var pointers = {}, lastX, lastY, pinch = 0, panning = false;
    function nP() { return Object.keys(pointers).length; }
    canvas.addEventListener('mousedown', function (e) { if (e.button === 1) e.preventDefault(); });
    canvas.addEventListener('auxclick', function (e) { if (e.button === 1) e.preventDefault(); });
    canvas.addEventListener('pointerdown', function (e) { if (e.button === 1) { panning = true; e.preventDefault(); } pointers[e.pointerId] = { x: e.clientX, y: e.clientY }; dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return; pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (nP() >= 2) { var ids = Object.keys(pointers), A = pointers[ids[0]], B = pointers[ids[1]], dist = hypot(A.x - B.x, A.y - B.y); if (pinch) { zoom = max(0.55, min(2.6, zoom * dist / pinch)); render(); } pinch = dist; return; }
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (panning) { panX += dx; panY += dy; } else { phi += dx * 0.008; theta = max(0.5, min(1.45, theta - dy * 0.008)); }
      lastX = e.clientX; lastY = e.clientY; render();
    });
    function endP(e) { if (e.button === 1) panning = false; delete pointers[e.pointerId]; if (nP() < 2) pinch = 0; if (nP() === 0) { dragging = false; panning = false; } }
    canvas.addEventListener('pointerup', endP); canvas.addEventListener('pointercancel', endP);
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); zoom = max(0.55, min(2.6, zoom * (e.deltaY < 0 ? 1.08 : 0.926))); render(); }, { passive: false });

    btnSpin.addEventListener('click', function () { autoRotate = !autoRotate; btnSpin.classList.toggle('active', autoRotate); if (autoRotate) startLoop(); else stopLoop(); render(); });
    btnPara.addEventListener('click', function () { showPara = !showPara; btnPara.classList.toggle('active', showPara); render(); });
    btnReset.addEventListener('click', function () { theta = DEF_THETA; phi = DEF_PHI; zoom = DEF_ZOOM; panX = 0; panY = 0; render(); });
    sV.addEventListener('input', function () { vF = +sV.value; oV.textContent = vF.toFixed(2); render(); });
    sG.addEventListener('input', function () { gap = +sG.value; oG.textContent = gap.toFixed(2); render(); });
    window.addEventListener('resize', render); onLang(render);
    if (fig) fig.classList.add('is-grab');
    btnSpin.classList.add('active');
    oV.textContent = vF.toFixed(2); oG.textContent = gap.toFixed(2);
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { render(); startLoop(); } else stopLoop(); }, { threshold: 0.04 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopLoop(); else if (visible) { render(); startLoop(); } });
    render(); startLoop();
  })();
  // ════════════════════════════════════════════════════════════════════
  //  Electronic-states series (free-electron → nearly-free → fermi-level →
  //  band-formation → kronig-penney): shared 1D numerics. Units throughout:
  //  ħ²/2m = 1, a = 1, so E = k² for the free electron and the zone boundary
  //  sits at E = π².
  // ════════════════════════════════════════════════════════════════════
  // Eigenvalues (ascending) of a small real symmetric matrix by cyclic Jacobi.
  function symEig(A) {
    var n = A.length, a = [], i, j, p, q, k, sweep;
    for (i = 0; i < n; i++) a.push(A[i].slice());
    for (sweep = 0; sweep < 60; sweep++) {
      var off = 0;
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
      if (off < 1e-22) break;
      for (p = 0; p < n; p++) for (q = p + 1; q < n; q++) {
        if (abs(a[p][q]) < 1e-16) continue;
        var th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        var t = (th >= 0 ? 1 : -1) / (abs(th) + sqrt(th * th + 1));
        var c = 1 / sqrt(t * t + 1), s = t * c;
        for (k = 0; k < n; k++) { var akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (k = 0; k < n; k++) { var apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
      }
    }
    var ev = []; for (i = 0; i < n; i++) ev.push(a[i][i]);
    return ev.sort(function (x, y) { return x - y; });
  }
  // Lowest `nb` bands at Bloch wavenumber k for V(x) = 2·V1·cos(2πx): a 9-plane-wave basis.
  function nfeBands(k, V1, nb) {
    var M = 4, n = 2 * M + 1, A = [], i, j;
    for (i = 0; i < n; i++) { A.push([]); for (j = 0; j < n; j++) A[i].push(0); }
    for (i = 0; i < n; i++) { var g = k + 2 * PI * (i - M); A[i][i] = g * g; if (i + 1 < n) { A[i][i + 1] = V1; A[i + 1][i] = V1; } }
    return symEig(A).slice(0, nb);
  }
  function zoneAxes(ctx, sx, sy, pad, pw, kMax, ticks, top) {
    var y0 = sy(0), x0 = sx(0);
    ctx.strokeStyle = P.rgba(P.neut, 0.35); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ticks.forEach(function (tk) { if (abs(tk[0]) > 1e-9) { ctx.beginPath(); ctx.moveTo(sx(tk[0]), top); ctx.lineTo(sx(tk[0]), y0); ctx.stroke(); } });
    ctx.setLineDash([]);
    arrow(ctx, pad.l - 10, y0, pad.l + pw + 10, y0, P.axis);
    arrow(ctx, x0, y0 + 2, x0, top - 10, P.axis);
    mvar(ctx, pad.l + pw + 14, y0 + 5, 'k', { color: P.ink2, size: 16 });
    mvar(ctx, x0 - 8, top - 13, 'E', { color: P.ink2, size: 16, align: 'right' });
    ctx.strokeStyle = P.axis; ctx.lineWidth = 1;
    ticks.forEach(function (tk) { var xx = sx(tk[0]); ctx.beginPath(); ctx.moveTo(xx, y0 - 3); ctx.lineTo(xx, y0 + 3); ctx.stroke(); txt(ctx, xx, y0 + 21, tk[1], { color: P.ink3, size: 13, align: 'center', italic: true }); });
  }

  // ════════════════════════════════════════════════════════════════════
  //  free-electron — the parabola with the discrete k_n = 2πn/L (L = N·a):
  //  N cells ⇒ exactly N points in −π/a < k ≤ π/a.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-freecount'); if (!canvas) return;
    var sN = document.getElementById('fe-n'), oN = document.getElementById('fe-n-o');
    var ubN = bindBubble(sN, oN, function (v) { return String(v); });
    var kMax = 1.6 * PI, Emax = kMax * kMax * 1.04;
    function draw() {
      var o = dpr(canvas, 320), ctx = o.ctx, W = o.w, H = o.h, N = +sN.value, ja = curLang() === 'ja';
      ground(ctx, W, H);
      var pad = { l: 48, r: 40, t: 30, b: 52 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
      function sx(k) { return pad.l + (k + kMax) / (2 * kMax) * pw; }
      function sy(E) { return pad.t + (1 - E / Emax) * ph; }
      var y0 = sy(0);
      zoneAxes(ctx, sx, sy, pad, pw, kMax, [[-PI, '−π/a'], [PI, 'π/a']], pad.t);
      // the parabola
      ctx.strokeStyle = P.curve; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.beginPath();
      for (var i = 0; i <= 240; i++) { var k = -kMax + 2 * kMax * i / 240, X = sx(k), Y = sy(k * k); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
      ctx.stroke();
      // discrete k_n
      var dk = 2 * PI / N, inZone = 0, nMax = Math.ceil(kMax / dk);
      for (var n = -nMax; n <= nMax; n++) {
        var kn = n * dk; if (abs(kn) > kMax) continue;
        var inz = kn > -PI + 1e-9 && kn <= PI + 1e-9; if (inz) inZone++;
        ctx.strokeStyle = inz ? P.rgba(P.suo, 0.5) : P.rgba(P.neut, 0.4); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx(kn), y0 - 4); ctx.lineTo(sx(kn), y0 + 4); ctx.stroke();
        ctx.fillStyle = inz ? P.curve : P.rgba(P.neut, 0.75);
        ctx.beginPath(); ctx.arc(sx(kn), sy(kn * kn), inz ? 3.4 : 2.6, 0, 2 * PI); ctx.fill();
      }
      // spacing 2π/L between neighbouring points, shown under the axis near the origin
      var bx0 = sx(0), bx1 = sx(dk), by = y0 + 11;
      ctx.strokeStyle = P.ink2; ctx.lineWidth = 1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx0, by); ctx.lineTo(bx1, by); ctx.stroke(); ahead(ctx, bx0, by, -1, 0, 4); ahead(ctx, bx1, by, 1, 0, 4);
      txt(ctx, (bx0 + bx1) / 2 + 2, by + 15, '2π/L', { color: P.ink2, size: 12.5, align: 'center', italic: true });
      // count
      txt(ctx, pad.l + pw, H - 8, (ja ? 'ゾーンの中の k の数：' : 'k values inside the zone: ') + inZone + ' = N',
          { font: ja ? '500 13px ' + MINCHO : 'italic 500 13.5px ' + SERIF, color: P.ink2, align: 'right' });
    }
    sN.addEventListener('input', function () { ubN(); draw(); });
    window.addEventListener('resize', draw); onLang(draw); draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  nearly-free-electron — bands of a weak cosine potential (exact 9-wave
  //  diagonalisation): the folded parabola at V1 = 0, a gap 2|V1| at ±π/a.
  //  Reduced or extended zone scheme.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-nfe'); if (!canvas) return;
    var sV = document.getElementById('nfe-v'), oV = document.getElementById('nfe-v-o');
    var bRed = document.getElementById('nfe-red'), bExt = document.getElementById('nfe-ext');
    var ext = false, NB = 3, NK = 64;
    var ubV = bindBubble(sV, oV, function (v) { return v.toFixed(2); });
    function bandsFor(V) { var out = []; for (var i = 0; i <= NK; i++) out.push(nfeBands(-PI + 2 * PI * i / NK, V, NB)); return out; }
    var free = bandsFor(0), cache = { V: -1, b: null };
    function extK(k, j) { var s = (j % 2 === 0) ? j * PI : -(j + 1) * PI; return k >= 0 ? k + s : k - s; }
    function draw() {
      var o = dpr(canvas, 340), ctx = o.ctx, W = o.w, H = o.h, V = +sV.value;
      ground(ctx, W, H);
      if (cache.V !== V) { cache.V = V; cache.b = bandsFor(V); }
      var bands = cache.b;
      var kMax = ext ? NB * PI : PI, Emax = (NB * PI) * (NB * PI) * 1.02;
      var pad = { l: 48, r: 84, t: 28, b: 48 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
      function sx(k) { return pad.l + (k + kMax) / (2 * kMax) * pw; }
      function sy(E) { return pad.t + (1 - E / Emax) * ph; }
      var ticks = ext ? [[-3 * PI, '−3π/a'], [-2 * PI, '−2π/a'], [-PI, '−π/a'], [PI, 'π/a'], [2 * PI, '2π/a'], [3 * PI, '3π/a']] : [[-PI, '−π/a'], [PI, 'π/a']];
      zoneAxes(ctx, sx, sy, pad, pw, kMax, ticks, pad.t);
      function plot(bs, col, lw) {
        for (var j = 0; j < NB; j++) {
          ctx.strokeStyle = col(j); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
          var pen = false, lastX = null;
          for (var i = 0; i <= NK; i++) {
            var k = -PI + 2 * PI * i / NK, X = sx(ext ? extK(k, j) : k), Y = sy(bs[i][j]);
            if (lastX !== null && abs(X - lastX) > pw / 4) pen = false;
            if (!pen) { ctx.moveTo(X, Y); pen = true; } else ctx.lineTo(X, Y);
            lastX = X;
          }
          ctx.stroke();
        }
      }
      plot(free, function () { return P.rgba(P.neut, 0.38); }, 1.2);
      var cols = [P.curve, P.rgb(P.teal), P.rgb(P.sage)];
      plot(bands, function (j) { return cols[j]; }, 2.3);
      // gap 2|V1| at the first boundary (reduced scheme): a dimension line outside the plot
      if (!ext) {
        var Elo = bands[NK][0], Ehi = bands[NK][1], dimX = pad.l + pw + 34;
        if (sy(Elo) - sy(Ehi) > 3) {
          ctx.strokeStyle = P.rgba(P.neut, 0.32); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(sx(PI), sy(Ehi)); ctx.lineTo(dimX, sy(Ehi)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx(PI), sy(Elo)); ctx.lineTo(dimX, sy(Elo)); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = P.ink2; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(dimX, sy(Ehi)); ctx.lineTo(dimX, sy(Elo)); ctx.stroke();
          ahead(ctx, dimX, sy(Ehi), 0, -1); ahead(ctx, dimX, sy(Elo), 0, 1);
          txt(ctx, dimX + 7, (sy(Ehi) + sy(Elo)) / 2 + 4.5, '2|V₁|', { color: P.ink2, size: 13, italic: true });
        }
      }
    }
    function setExt(e) {
      ext = e;
      bRed.classList.toggle('active', !e); bExt.classList.toggle('active', e);
      bRed.setAttribute('aria-pressed', String(!e)); bExt.setAttribute('aria-pressed', String(e));
      draw();
    }
    bRed.addEventListener('click', function () { setExt(false); });
    bExt.addEventListener('click', function () { setExt(true); });
    sV.addEventListener('input', function () { ubV(); draw(); });
    window.addEventListener('resize', draw); setExt(false);
  })();

  // ════════════════════════════════════════════════════════════════════
  //  nearly-free-electron — the two zone-edge standing waves.  The lower
  //  state puts probability on attractive ions; the upper state puts it
  //  between them.  Buttons make the spatial origin of the gap explicit.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-nfe-wave'); if (!canvas) return;
    var bLow = document.getElementById('nfw-low'), bHigh = document.getElementById('nfw-high');
    var bPlay = document.getElementById('nfw-play'), status = document.getElementById('nfw-status');
    var mode = 'low', timer = null;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function stop() { if (timer) { clearInterval(timer); timer = null; } bPlay.classList.remove('active'); bPlay.setAttribute('aria-pressed', 'false'); }
    function setMode(next, keepTimer) {
      mode = next; bLow.classList.toggle('active', mode === 'low'); bHigh.classList.toggle('active', mode === 'high');
      bLow.setAttribute('aria-pressed', String(mode === 'low')); bHigh.setAttribute('aria-pressed', String(mode === 'high'));
      if (!keepTimer) stop(); draw();
    }
    function draw() {
      var o = dpr(canvas, 330), ctx = o.ctx, W = o.w, H = o.h, ja = curLang() === 'ja';
      ground(ctx, W, H);
      var pad = { l: 48, r: 28 }, pw = W - pad.l - pad.r;
      function sx(x) { return pad.l + (x + 3) / 6 * pw; }
      var potMid = 86, potAmp = 27, base = 270, denAmp = 92;
      // repeated attractive potential
      ctx.strokeStyle = P.rgba(P.neut, 0.45); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, potMid); ctx.lineTo(W - pad.r, potMid); ctx.stroke();
      ctx.strokeStyle = P.rgb(P.sage); ctx.lineWidth = 2; ctx.beginPath();
      for (var i = 0; i <= 360; i++) { var x = -3 + 6 * i / 360, y = potMid - potAmp * (-cos(2 * PI * x)); if (i === 0) ctx.moveTo(sx(x), y); else ctx.lineTo(sx(x), y); }
      ctx.stroke();
      for (var n = -3; n <= 3; n++) { ctx.fillStyle = P.rgb(P.neut); ctx.beginPath(); ctx.arc(sx(n), potMid + potAmp + 1, 3.5, 0, 2 * PI); ctx.fill(); }
      txt(ctx, pad.l, 27, ja ? 'イオンが作る、繰り返す引力の地形' : 'repeating attractive landscape from the ions', { color: P.ink3, size: 12.5, italic: !ja, font: ja ? '500 12.5px ' + MINCHO : undefined });
      // probability density of the selected standing wave
      ctx.strokeStyle = P.rgba(P.neut, 0.45); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, base); ctx.lineTo(W - pad.r, base); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.l, base);
      for (var j = 0; j <= 360; j++) { var xx = -3 + 6 * j / 360, amp = mode === 'low' ? cos(PI * xx) * cos(PI * xx) : sin(PI * xx) * sin(PI * xx); ctx.lineTo(sx(xx), base - denAmp * amp); }
      ctx.lineTo(W - pad.r, base); ctx.closePath();
      ctx.fillStyle = mode === 'low' ? P.rgba(P.teal, 0.23) : P.rgba(P.suo, 0.20); ctx.fill();
      ctx.strokeStyle = mode === 'low' ? P.rgb(P.teal) : P.curve; ctx.lineWidth = 2.2; ctx.beginPath();
      for (var k = 0; k <= 360; k++) { var xxx = -3 + 6 * k / 360, aa = mode === 'low' ? cos(PI * xxx) * cos(PI * xxx) : sin(PI * xxx) * sin(PI * xxx), yy = base - denAmp * aa; if (k === 0) ctx.moveTo(sx(xxx), yy); else ctx.lineTo(sx(xxx), yy); }
      ctx.stroke();
      txt(ctx, pad.l, 157, mode === 'low' ? (ja ? '低い状態：存在確率がイオン上に集まる' : 'lower state: probability gathers on the ions') : (ja ? '高い状態：存在確率がイオンの間に集まる' : 'upper state: probability gathers between ions'), { color: mode === 'low' ? P.rgb(P.teal) : P.curve, size: 13, italic: !ja, font: ja ? '600 13px ' + MINCHO : undefined });
      txt(ctx, W - pad.r, base + 25, ja ? '位置 x' : 'position x', { color: P.ink3, size: 12, align: 'right', italic: !ja, font: ja ? '500 12px ' + MINCHO : undefined });
      status.textContent = mode === 'low' ? (ja ? '低い状態：電子は引力のあるイオンの近くにいる' : 'lower state: the electron stays near the attractive ions') : (ja ? '高い状態：電子はイオンの間に押し出される' : 'upper state: the electron is pushed between the ions');
    }
    bLow.addEventListener('click', function () { setMode('low'); });
    bHigh.addEventListener('click', function () { setMode('high'); });
    bPlay.addEventListener('click', function () {
      if (timer) { stop(); return; }
      if (reduceMotion) { setMode(mode === 'low' ? 'high' : 'low'); return; }
      bPlay.classList.add('active'); bPlay.setAttribute('aria-pressed', 'true');
      timer = setInterval(function () { setMode(mode === 'low' ? 'high' : 'low', true); }, 900);
    });
    window.addEventListener('resize', draw); onLang(draw); setMode('low');
  })();

  // ════════════════════════════════════════════════════════════════════
  //  fermi-level — two bands with a gap, N discrete k states each; pour in ν
  //  electrons per cell (Pauli, 2 per k) and watch the water line; kT blurs
  //  the occupation with the Fermi–Dirac distribution.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-fill'); if (!canvas) return;
    var sNu = document.getElementById('fl-nu'), oNu = document.getElementById('fl-nu-o');
    var sT = document.getElementById('fl-t'), oT = document.getElementById('fl-t-o');
    var status = document.getElementById('fl-status');
    var fillPresets = { 'empty': 0, 'half': 1, 'full': 2, 'upper': 3 };
    var fillButtons = {}; Object.keys(fillPresets).forEach(function (key) { fillButtons[key] = document.getElementById('fl-' + key); });
    var N = 24, V = 2.0, NB = 2, NK = 64;
    var ubNu = bindBubble(sNu, oNu, function (v) { return v.toFixed(2) + (curLang() === 'ja' ? ' / 単位胞' : ' / cell'); });
    var ubT = bindBubble(sT, oT, function (v) { return v.toFixed(2); });
    var states = [], j, b;
    for (j = -N / 2 + 1; j <= N / 2; j++) { var k = 2 * PI * j / N, e = nfeBands(k, V, NB); for (b = 0; b < NB; b++) states.push({ k: k, b: b, E: e[b], f: 0 }); }
    var sorted = states.slice().sort(function (x, y) { return x.E - y.E; });
    var curves = []; for (var i = 0; i <= NK; i++) curves.push(nfeBands(-PI + 2 * PI * i / NK, V, NB));
    var Emin = sorted[0].E, Etop = sorted[sorted.length - 1].E, cap = 2 * states.length;
    function occupy(ne, kT) {
      var mu, i;
      if (kT < 1e-6) {
        var pairs = Math.floor(ne / 2), rem = ne - 2 * pairs;
        for (i = 0; i < sorted.length; i++) sorted[i].f = i < pairs ? 1 : (i === pairs ? rem / 2 : 0);
        if (ne <= 0) mu = null; else if (ne >= cap) mu = Etop + 1.5; else if (rem > 0) mu = sorted[pairs].E; else mu = (sorted[pairs - 1].E + sorted[pairs].E) / 2;
      } else {
        var lo = Emin - 30 * kT - 5, hi = Etop + 30 * kT + 5;
        for (var it = 0; it < 70; it++) { mu = (lo + hi) / 2; var s = 0; for (i = 0; i < sorted.length; i++) s += 2 / (Math.exp((sorted[i].E - mu) / kT) + 1); if (s > ne) hi = mu; else lo = mu; }
        for (i = 0; i < sorted.length; i++) sorted[i].f = 1 / (Math.exp((sorted[i].E - mu) / kT) + 1);
        if (ne <= 0) mu = null;
      }
      return mu;
    }
    function draw() {
      var o = dpr(canvas, 340), ctx = o.ctx, W = o.w, H = o.h, ja = curLang() === 'ja';
      var ne = Math.round(+sNu.value * N), kT = +sT.value, mu = occupy(ne, kT);
      ground(ctx, W, H);
      // the k axis is drawn a little below the lowest state (E = −4) so the bottom of the band floats clear of it
      var Eoff = 4, Emax = Etop * 1.12 + Eoff, pad = { l: 60, r: 48, t: 28, b: 48 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
      function sx(k) { return pad.l + (k + PI) / (2 * PI) * pw; }
      function sy(E) { return pad.t + (1 - (E + Eoff) / Emax) * ph; }
      zoneAxes(ctx, sx, function (E) { return sy(E - Eoff); }, pad, pw, PI, [[-PI, '−π/a'], [PI, 'π/a']], pad.t);
      // the two bands as thin guide curves
      for (b = 0; b < NB; b++) {
        ctx.strokeStyle = P.rgba(P.neut, 0.45); ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.beginPath();
        for (i = 0; i <= NK; i++) { var X = sx(-PI + 2 * PI * i / NK), Y = sy(curves[i][b]); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
        ctx.stroke();
      }
      // water line
      if (mu !== null) {
        ctx.strokeStyle = P.rgba(P.terra, 0.8); ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(pad.l - 8, sy(mu)); ctx.lineTo(pad.l + pw, sy(mu)); ctx.stroke(); ctx.setLineDash([]);
        mvar(ctx, pad.l - 14, sy(mu) + 5, kT < 1e-6 ? 'E' : 'μ', kT < 1e-6 ? { sub: 'F', color: P.eLine, size: 15, align: 'right' } : { color: P.eLine, size: 15, align: 'right' });
      }
      // the states: ring + occupation fill (alpha = f)
      var fillCol = [P.suo, P.teal];
      states.forEach(function (s) {
        var X = sx(s.k), Y = sy(s.E);
        ctx.beginPath(); ctx.arc(X, Y, 4, 0, 2 * PI);
        ctx.fillStyle = P.rgba(P.plate, 1); ctx.fill();
        if (s.f > 0.01) { ctx.fillStyle = P.rgba(fillCol[s.b], s.f); ctx.fill(); }
        ctx.strokeStyle = P.rgba(fillCol[s.b], 0.85); ctx.lineWidth = 1.1; ctx.stroke();
      });
      // short interpretation; at finite temperature avoid pretending that filling is perfectly sharp
      var nLower = 2 * N, msg;
      if (ne <= 0) msg = ja ? '電子がない' : 'no electrons';
      else if (ne === nLower && kT > 1e-6) msg = ja ? '温度ゼロでは下のバンドが満杯。熱で少数の電子が隙間を越える' : 'lower band full at zero temperature; heat moves a few electrons across the gap';
      else if (ne === nLower) msg = ja ? '下のバンドが満杯、水面は隙間の中：絶縁体' : 'lower band full, the surface sits in the gap: insulator';
      else if (ne >= cap) msg = ja ? '両方のバンドが満杯：絶縁体' : 'both bands full: insulator';
      else if (kT > 1e-6) msg = ja ? '途中まで埋まったバンドがあり、熱で境目がにじむ' : 'a partly filled band with a thermally blurred boundary';
      else msg = ja ? '途中まで埋まったバンドがある：金属' : 'a partly filled band: metal';
      var head = ja ? ('電子 ' + ne + ' 個（' + N + ' 単位胞）：') : (ne + ' electrons in ' + N + ' cells: ');
      status.textContent = head + msg;
    }
    function syncFillButtons() { Object.keys(fillPresets).forEach(function (key) { var on = abs(+sNu.value - fillPresets[key]) < 1e-6; fillButtons[key].classList.toggle('active', on); fillButtons[key].setAttribute('aria-pressed', String(on)); }); }
    Object.keys(fillPresets).forEach(function (key) { fillButtons[key].addEventListener('click', function () { sNu.value = fillPresets[key]; ubNu(); syncFillButtons(); draw(); }); });
    sNu.addEventListener('input', function () { ubNu(); syncFillButtons(); draw(); });
    sT.addEventListener('input', function () { ubT(); draw(); });
    window.addEventListener('resize', draw); onLang(function () { ubNu(); ubT(); draw(); }); syncFillButtons(); draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  kronig-penney — delta-comb walls of strength P. Left: f(E) = cos qa +
  //  P sin qa/qa against E with the |f| ≤ 1 corridor and the allowed bands
  //  marked; right: the resulting E(k) in the reduced zone, the P = 0 folded
  //  parabola left faint. One knob from free electrons to tight binding.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-kp'); if (!canvas) return;
    var sP = document.getElementById('kp-p'), oP = document.getElementById('kp-p-o'), status = document.getElementById('kp-status');
    var kpPresets = { 'free': 0, 'weak': 3, 'strong': 12, 'isolated': 25 };
    var kpButtons = {}; Object.keys(kpPresets).forEach(function (key) { kpButtons[key] = document.getElementById('kp-' + key); });
    var ubP = bindBubble(sP, oP, function (v) { return v.toFixed(1); });
    var Emax = 100, NE = 1000, Es = [];
    for (var i = 0; i <= NE; i++) Es.push(Emax * i / NE);
    function fOf(E, Pw) { var q = sqrt(E); return q < 1e-6 ? 1 + Pw : cos(q) + Pw * sin(q) / q; }
    function draw() {
      var o = dpr(canvas, 380), ctx = o.ctx, W = o.w, H = o.h, Pw = +sP.value, ja = curLang() === 'ja';
      ground(ctx, W, H);
      var top = 30, padB = 50, ph = H - top - padB, i;
      function sy(E) { return top + (1 - E / Emax) * ph; }
      var y0 = sy(0);
      var fMax = 2.4, Lx = 46, Lw = W * 0.34 - Lx;
      function lx(f) { return Lx + (f + fMax) / (2 * fMax) * Lw; }
      var Rl = W * 0.34 + 74, Rw = W - Rl - 44;
      function rx(k) { return Rl + (k + PI) / (2 * PI) * Rw; }
      var fs = [], allowed = [];
      for (i = 0; i <= NE; i++) { var f = fOf(Es[i], Pw); fs.push(f); allowed.push(abs(f) <= 1); }
      var bandsI = [], inb = false, st = 0;
      for (i = 0; i <= NE; i++) {
        if (allowed[i] && !inb) { inb = true; st = i; }
        if (inb && (!allowed[i] || i === NE)) { inb = false; bandsI.push([st, allowed[i] ? i : i - 1]); }
      }
      // ── left panel: f against E ──
      ctx.strokeStyle = P.rgba(P.neut, 0.5); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      [-1, 1].forEach(function (f) { ctx.beginPath(); ctx.moveTo(lx(f), top); ctx.lineTo(lx(f), y0); ctx.stroke(); });
      ctx.setLineDash([]);
      arrow(ctx, lx(-fMax) - 6, y0, lx(fMax) + 10, y0, P.axis);
      arrow(ctx, lx(0), y0 + 2, lx(0), top - 10, P.axis);
      mvar(ctx, lx(0) - 8, top - 13, 'E', { color: P.ink2, size: 16, align: 'right' });
      mvar(ctx, lx(fMax) + 14, y0 + 5, 'f', { color: P.ink2, size: 16 });
      ctx.strokeStyle = P.axis; ctx.lineWidth = 1;
      [[-1, '−1'], [1, '1']].forEach(function (tk) { ctx.beginPath(); ctx.moveTo(lx(tk[0]), y0 - 3); ctx.lineTo(lx(tk[0]), y0 + 3); ctx.stroke(); txt(ctx, lx(tk[0]), y0 + 21, tk[1], { color: P.ink3, size: 13, align: 'center', italic: true }); });
      txt(ctx, lx(0), H - 8, 'f = cos qa + P sin qa / qa', { color: P.ink2, size: 12.5, italic: true, align: 'center' });
      // the f curve (clipped to |f| ≤ fMax)
      ctx.strokeStyle = P.rgb(P.terra); ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.beginPath();
      var pen = false;
      for (i = 0; i <= NE; i++) { if (abs(fs[i]) > fMax) { pen = false; continue; } var X = lx(fs[i]), Y = sy(Es[i]); if (!pen) { ctx.moveTo(X, Y); pen = true; } else ctx.lineTo(X, Y); }
      ctx.stroke();
      // allowed bands as bars between the panels
      var barX = Lx + Lw + 30;
      bandsI.forEach(function (bi) { var yA = sy(Es[bi[1]]), yB = sy(Es[bi[0]]), h = max(1.5, yB - yA); ctx.fillStyle = P.rgba(P.suo, 0.85); ctx.fillRect(barX - 3, yA, 6, h); });
      // ── right panel: E(k) ──
      var padR = { l: Rl }, kTicks = [[-PI, '−π/a'], [PI, 'π/a']];
      ctx.strokeStyle = P.rgba(P.neut, 0.35); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      kTicks.forEach(function (tk) { ctx.beginPath(); ctx.moveTo(rx(tk[0]), top); ctx.lineTo(rx(tk[0]), y0); ctx.stroke(); }); ctx.setLineDash([]);
      arrow(ctx, Rl - 10, y0, Rl + Rw + 10, y0, P.axis);
      arrow(ctx, rx(0), y0 + 2, rx(0), top - 10, P.axis);
      mvar(ctx, Rl + Rw + 14, y0 + 5, 'k', { color: P.ink2, size: 16 });
      mvar(ctx, rx(0) - 8, top - 13, 'E', { color: P.ink2, size: 16, align: 'right' });
      ctx.strokeStyle = P.axis; ctx.lineWidth = 1;
      kTicks.forEach(function (tk) { ctx.beginPath(); ctx.moveTo(rx(tk[0]), y0 - 3); ctx.lineTo(rx(tk[0]), y0 + 3); ctx.stroke(); txt(ctx, rx(tk[0]), y0 + 21, tk[1], { color: P.ink3, size: 13, align: 'center', italic: true }); });
      // box levels E_n = n²π² as faint ticks at the right edge (the P → ∞ ladder)
      for (var n = 1; n <= 3; n++) {
        var En = n * n * PI * PI; if (En > Emax) break;
        ctx.strokeStyle = P.rgba(P.neut, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(rx(PI), sy(En)); ctx.lineTo(rx(PI) + 14, sy(En)); ctx.stroke(); ctx.setLineDash([]);
        mvar(ctx, rx(PI) + 18, sy(En) + 4, 'E', { sub: String(n), color: P.ink3, size: 12.5 });
      }
      // allowed intervals of a given P, with the band edges refined by bisection on |f| = 1
      function intervals(Pw2) {
        var out = [], inb2 = false, st2 = 0, m;
        function edge(lo, hi) { for (var it = 0; it < 30; it++) { var mid = (lo + hi) / 2; if (abs(fOf(mid, Pw2)) <= 1) hi = mid; else lo = mid; } return hi; }
        for (m = 0; m <= NE; m++) {
          var ok = abs(fOf(Es[m], Pw2)) <= 1;
          if (ok && !inb2) { inb2 = true; st2 = m > 0 ? edge(Es[m - 1], Es[m]) : 0; }
          if (inb2 && (!ok || m === NE)) { inb2 = false; out.push([st2, ok ? Es[m] : edge(Es[m], Es[m - 1])]); }
        }
        return out;
      }
      // each band as ONE path: down the −k side, through k = 0 (or the zone edge), up the +k side —
      // resampled finely inside the band so even a hair-thin tight-binding band draws smoothly
      function plotBands(Pw2, col, lw) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        intervals(Pw2).forEach(function (iv) {
          var M2 = 260, pts = [], m;
          for (m = 0; m <= M2; m++) { var E2 = iv[0] + (iv[1] - iv[0]) * m / M2, f2 = max(-1, min(1, fOf(E2, Pw2))); pts.push([Math.acos(f2), E2]); }
          // join the two halves where k = 0: at the band bottom (odd bands) or at the band top (even bands)
          var joinAtBottom = pts[0][0] <= pts[M2][0];
          ctx.beginPath();
          if (joinAtBottom) {
            for (m = M2; m >= 0; m--) { var X = rx(-pts[m][0]), Y = sy(pts[m][1]); if (m === M2) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
            for (m = 0; m <= M2; m++) ctx.lineTo(rx(pts[m][0]), sy(pts[m][1]));
          } else {
            for (m = 0; m <= M2; m++) { var X2 = rx(-pts[m][0]), Y2 = sy(pts[m][1]); if (m === 0) ctx.moveTo(X2, Y2); else ctx.lineTo(X2, Y2); }
            for (m = M2; m >= 0; m--) ctx.lineTo(rx(pts[m][0]), sy(pts[m][1]));
          }
          ctx.stroke();
        });
      }
      if (Pw > 0) plotBands(0, P.rgba(P.neut, 0.38), 1.2);
      plotBands(Pw, P.curve, 2.3);
      // readout: lowest band centre and width, in tight-binding language
      var ivs = intervals(Pw);
      if (Pw < 0.05) status.textContent = ja ? 'P = 0：隙間はなく、折り畳まれた放物線が一本つながっている' : 'P = 0: no gaps, one continuous folded parabola';
      else if (ivs.length) {
        var a = ivs[0][0], bE = ivs[0][1];
        status.textContent = ja
          ? '最下バンド：中心 ≈ ' + ((a + bE) / 2).toFixed(1) + '、幅 ≈ ' + (bE - a).toFixed(1) + '（孤立箱の最下準位 ≈ 9.9）'
          : 'lowest band: centre ≈ ' + ((a + bE) / 2).toFixed(1) + ', width ≈ ' + (bE - a).toFixed(1) + ' (lowest isolated-box level ≈ 9.9)';
      } else status.textContent = '';
    }
    function syncKpButtons() { Object.keys(kpPresets).forEach(function (key) { var on = abs(+sP.value - kpPresets[key]) < 1e-6; kpButtons[key].classList.toggle('active', on); kpButtons[key].setAttribute('aria-pressed', String(on)); }); }
    Object.keys(kpPresets).forEach(function (key) { kpButtons[key].addEventListener('click', function () { sP.value = kpPresets[key]; ubP(); syncKpButtons(); draw(); }); });
    sP.addEventListener('input', function () { ubP(); syncKpButtons(); draw(); });
    window.addEventListener('resize', draw); onLang(draw); syncKpButtons(); draw();
  })();
  // ════════════════════════════════════════════════════════════════════
  //  free-electron §03 — k-space cells. Each state is one cell of side 2π/L
  //  in d dimensions; the cells below E fill a segment / disc / ball, and
  //  D(E)dE is the number of cells in the shell between E and E+dE. The
  //  shell has a FIXED thickness in E, so it thins in k as k grows (that is
  //  where 1/√E, const, √E come from). 1D / 2D / 3D switch; the 3D view is
  //  the first octant cut out of the ball (counts are for the whole ball).
  //  The k range is FIXED (|k| ≤ 1, E = k² ≤ 1) and the L slider sets the
  //  cell side 2π/L = 1/M, so a larger L makes the grid finer and the
  //  counts converge onto the shell-volume line.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-kspace'); if (!canvas) return;
    var sE = document.getElementById('ks-e'), oE = document.getElementById('ks-e-o');
    var sD = document.getElementById('ks-de'), oD = document.getElementById('ks-de-o');
    var sM = document.getElementById('ks-m'), oM = document.getElementById('ks-m-o');
    var btns = [1, 2, 3].map(function (d) { return document.getElementById('ks-d' + d); });
    var status = document.getElementById('ks-status');
    var dim = 2;
    // The grid extends to |k| ≤ KG = 1.1 (beyond the largest shell radius √(0.9 + 0.2) ≈ 1.05) so the shell
    // never leaves the grid: a clipped shell would make the counts fall below the shell-volume line.
    var KG = 1.1;
    function gridM(M) { return Math.ceil(KG * M); }
    var ubE = bindBubble(sE, oE, function (v) { return v.toFixed(2); });
    var ubD = bindBubble(sD, oD, function (v) { return v.toFixed(2); });
    var ubM = bindBubble(sM, oM, function (v) { return '2π/L = 1/' + v.toFixed(0); });
    // histogram of grid points by integer r² over the FULL space (all sign combinations), per (d, M)
    var hist = {};
    function getHist(d, M) {
      var key = d + ':' + M; if (hist[key]) return hist[key];
      var G = gridM(M), h = new Float64Array(d * G * G + 1), i, j, k;
      if (d === 1) { for (i = -G; i <= G; i++) h[i * i]++; }
      else if (d === 2) { for (i = -G; i <= G; i++) for (j = -G; j <= G; j++) h[i * i + j * j]++; }
      else { for (i = -G; i <= G; i++) { var ii = i * i; for (j = -G; j <= G; j++) { var jj = ii + j * j; for (k = -G; k <= G; k++) h[jj + k * k]++; } } }
      hist[key] = h; return h;
    }
    // number of cells with E0 < (n/M)² ≤ E1, i.e. E0·M² < r² ≤ E1·M²
    function countRange(d, M, E0, E1) { var h = getHist(d, M), s = 0, a = max(0, Math.floor(E0 * M * M) + 1), b = min(Math.floor(E1 * M * M + 1e-9), h.length - 1); for (var r2 = a; r2 <= b; r2++) s += h[r2]; return s; }
    // shell volume between radii √E0 and √E1, in cells (cell side 1/M)
    function analytic(d, M, E0, E1) { var k0 = sqrt(max(0, E0)), k1 = sqrt(max(0, E1)); return d === 1 ? 2 * (k1 - k0) * M : d === 2 ? PI * (k1 * k1 - k0 * k0) * M * M : 4 * PI / 3 * (k1 * k1 * k1 - k0 * k0 * k0) * M * M * M; }
    var C_IN = P.rgb(P.tint(P.suo, 0.72)), C_SHELL = P.rgb(P.suo), C_EMPTY = P.rgba(P.neut, 0.28), C_EDGE = P.rgba(P.plate, 0.85);

    function drawK1(ctx, Lw, H, M, E, dE) {
      var K = sqrt(E), K1 = sqrt(E + dE), d = 1 / M, G = gridM(M), kmax = G * d + d / 2, x0 = 46, x1 = Lw - 24, yLine = H - 56, n;
      function kx(kk) { return x0 + (kk + kmax) / (2 * kmax) * (x1 - x0); }
      var cw = d / (2 * kmax) * (x1 - x0), yE0 = yLine - 30, yEtop = 30, EA = KG * KG;
      function ey(EE) { return yE0 - EE / EA * (yE0 - yEtop); }
      arrow(ctx, kx(-kmax) - 6, yE0, kx(-kmax) - 6, yEtop - 8, P.axis, 1.1, 6);
      mvar(ctx, kx(-kmax) - 12, yEtop - 2, 'E', { color: P.ink2, size: 14, align: 'right' });
      ctx.strokeStyle = P.rgba(P.neut, 0.55); ctx.lineWidth = 1.3; ctx.beginPath();
      for (var kk = -KG; kk <= KG + 0.0001; kk += 0.01) { var X = kx(kk), Y = ey(kk * kk); if (kk === -KG) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
      ctx.stroke();
      ctx.strokeStyle = P.rgba(P.terra, 0.8); ctx.lineWidth = 1.1; ctx.setLineDash([5, 4]);
      [E, E + dE].forEach(function (EE) { ctx.beginPath(); ctx.moveTo(kx(-kmax), ey(EE)); ctx.lineTo(kx(kmax) + 8, ey(EE)); ctx.stroke(); });
      ctx.setLineDash([]);
      mvar(ctx, kx(kmax) + 12, ey(E) + 4, 'E', { color: P.eLine, size: 13 });
      txt(ctx, kx(kmax) + 12, ey(E + dE) + 4, 'E + dE', { color: P.eLine, size: 12.5, italic: true });
      ctx.strokeStyle = P.rgba(P.neut, 0.4); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      [-K1, -K, K, K1].forEach(function (kk) { if (abs(kk) > KG) return; ctx.beginPath(); ctx.moveTo(kx(kk), ey(kk * kk)); ctx.lineTo(kx(kk), yLine - 9); ctx.stroke(); });
      ctx.setLineDash([]);
      var gap = cw >= 5 ? 1 : 0;
      for (n = -G; n <= G; n++) {
        var kn = n * d, r2 = kn * kn, X0 = kx(kn) - cw / 2 + gap / 2;
        if (r2 <= E + 1e-12) { ctx.fillStyle = C_IN; ctx.fillRect(X0, yLine - 7, cw - gap, 14); }
        else if (r2 <= E + dE + 1e-12) { ctx.fillStyle = C_SHELL; ctx.fillRect(X0, yLine - 7, cw - gap, 14); }
        if (gap) { ctx.strokeStyle = C_EMPTY; ctx.lineWidth = 1; ctx.strokeRect(X0, yLine - 7, cw - gap, 14); }
      }
      if (!gap) { ctx.strokeStyle = C_EMPTY; ctx.lineWidth = 1; ctx.strokeRect(kx(-kmax), yLine - 7, kx(kmax) - kx(-kmax), 14); }
      arrow(ctx, kx(-kmax) - 6, yLine, kx(kmax) + 14, yLine, P.axis, 1.1, 6);
      mvar(ctx, kx(kmax) + 18, yLine + 5, 'k', { color: P.ink2, size: 14 });
      if (K1 <= KG) {
        var bx0 = kx(K), bx1 = kx(K1), by = yLine + 18;
        ctx.strokeStyle = P.ink2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx0, by); ctx.lineTo(bx1, by); ctx.stroke();
        ahead(ctx, bx0, by, -1, 0, 4); ahead(ctx, bx1, by, 1, 0, 4);
        txt(ctx, (bx0 + bx1) / 2, by + 15, 'dk', { color: P.ink2, size: 12.5, align: 'center', italic: true });
      }
      txt(ctx, kx(-kmax), yLine + 30, '2π/L', { color: P.ink3, size: 12, italic: true });
    }

    function drawK2(ctx, Lw, H, M, E, dE) {
      var K = sqrt(E), K1 = sqrt(E + dE), d = 1 / M, G = gridM(M), kmax = G * d + d / 2, S = min(Lw - 44, H - 64), cx = 26 + S / 2, cy = 30 + S / 2, i, j;
      var sc = S / 2 / kmax, cs = d * sc, gap = cs >= 5 ? 1 : 0;
      function px(kk) { return cx + kk * sc; }
      function py(kk) { return cy - kk * sc; }
      if (!gap) { ctx.fillStyle = P.rgba(P.neut, 0.07); ctx.fillRect(px(-kmax), py(kmax), 2 * kmax * sc, 2 * kmax * sc); }
      for (i = -G; i <= G; i++) for (j = -G; j <= G; j++) {
        var r2 = (i * i + j * j) * d * d, X0 = px(i * d) - cs / 2 + gap / 2, Y0 = py(j * d) - cs / 2 + gap / 2;
        if (r2 <= E + 1e-12) { ctx.fillStyle = C_IN; ctx.fillRect(X0, Y0, cs - gap, cs - gap); }
        else if (r2 <= E + dE + 1e-12) { ctx.fillStyle = C_SHELL; ctx.fillRect(X0, Y0, cs - gap, cs - gap); }
        else if (gap) { ctx.strokeStyle = P.rgba(P.neut, 0.16); ctx.lineWidth = 1; ctx.strokeRect(X0, Y0, cs - gap, cs - gap); }
      }
      ctx.strokeStyle = P.rgba(P.terra, 0.85); ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      [K, K1].forEach(function (r) { ctx.beginPath(); ctx.arc(cx, cy, r * sc, 0, 2 * PI); ctx.stroke(); });
      ctx.setLineDash([]);
      arrow(ctx, px(-kmax) - 4, cy, px(kmax) + 10, cy, P.rgba(P.neut, 0.7), 1, 6);
      arrow(ctx, cx, py(-kmax) + 4, cx, py(kmax) - 10, P.rgba(P.neut, 0.7), 1, 6);
      mvar(ctx, px(kmax) + 14, cy + 5, 'k', { sub: 'x', color: P.ink2, size: 14 });
      mvar(ctx, cx + 8, py(kmax) - 10, 'k', { sub: 'y', color: P.ink2, size: 14 });
      ctx.strokeStyle = P.ink3; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px(-kmax), py(-kmax) + 5); ctx.lineTo(px(-kmax) + cs, py(-kmax) + 5); ctx.stroke();
      txt(ctx, px(-kmax), py(-kmax) + 18, '2π/L', { color: P.ink3, size: 12, italic: true });
    }

    function drawK3(ctx, Lw, H, M, E, dE) {
      // Viewed from the (−x, −y, +z) side, so the two CUT planes x = 0 and y = 0 face the viewer
      // (their common edge, the k_z axis, is the nearest line) and the dome is seen from above.
      // Screen: +x runs up-right, +y up-left, +z up. Visible cube faces: −x, −y, +z.
      var d = 1 / M, G = gridM(M), c30 = 0.866, U = min((Lw - 50) / (2.5 * c30), (H - 70) / 1.65), u = U * d, ox = Lw / 2 + 4, oy = H - 44, i, j, k;
      function pr(x, y, z) { return [ox + (x - y) * U * c30, oy - (x + y) * U * 0.5 - z * U]; }   // x, y, z in k units
      var axes = [[KG + 0.12, 0, 0, 'x'], [0, KG + 0.12, 0, 'y'], [0, 0, KG + 0.14, 'z']];
      axes.forEach(function (a) { var p1 = pr(a[0], a[1], a[2]); arrow(ctx, ox, oy, p1[0], p1[1], P.rgba(P.neut, 0.7), 1, 6); });
      function axisLabels() {   // drawn AFTER the cubes so the k_z label is never buried under the dome
        axes.forEach(function (a) { var p1 = pr(a[0], a[1], a[2]); mvar(ctx, p1[0] + (a[3] === 'x' ? 8 : a[3] === 'y' ? -8 : -6), p1[1] + (a[3] === 'z' ? -8 : 5), 'k', { sub: a[3], color: P.ink2, size: 14, align: a[3] === 'y' ? 'right' : 'left' }); });
      }
      // occupancy of the octant grid (index i,j,k ≥ 0, radius² in cells)
      var N1 = G + 1, R2 = (E + dE) * M * M + 1e-9, occ = new Uint8Array(N1 * N1 * N1);
      function idx(a, b, c) { return (a * N1 + b) * N1 + c; }
      for (i = 0; i <= G; i++) for (j = 0; j <= G; j++) for (k = 0; k <= G; k++) if (i * i + j * j + k * k <= R2) occ[idx(i, j, k)] = 1;
      // only cubes with an exposed −x, −y or +z face can be seen; sort them far → near (nearness = z − x − y)
      var cubes = [];
      for (i = 0; i <= G; i++) for (j = 0; j <= G; j++) for (k = 0; k <= G; k++) {
        if (!occ[idx(i, j, k)]) continue;
        var fx = i === 0 || !occ[idx(i - 1, j, k)], fy = j === 0 || !occ[idx(i, j - 1, k)], fz = k === G || !occ[idx(i, j, k + 1)];
        if (fx || fy || fz) cubes.push([i, j, k, (i * i + j * j + k * k) * d * d <= E + 1e-12 ? 0 : 1, fx, fy, fz]);
      }
      cubes.sort(function (a, b) { return (a[2] - a[0] - a[1]) - (b[2] - b[0] - b[1]); });
      var inCols = [P.rgb(P.tint(P.suo, 0.86)), P.rgb(P.tint(P.suo, 0.74)), P.rgb(P.tint(P.suo, 0.62))];
      var shCols = [P.rgb(P.tint(P.suo, 0.32)), P.rgb(P.suo), P.rgb(P.mix(P.suo, P.neut, 0.35))];
      var edge = u >= 6;
      function face(pts, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var q = 1; q < 4; q++) ctx.lineTo(pts[q][0], pts[q][1]); ctx.closePath(); ctx.fill(); if (edge) { ctx.strokeStyle = C_EDGE; ctx.lineWidth = 0.8; ctx.stroke(); } }
      cubes.forEach(function (c) {
        var x0 = (c[0] - 0.5) * d, y0 = (c[1] - 0.5) * d, z0 = (c[2] - 0.5) * d, x1 = x0 + d, y1 = y0 + d, z1 = z0 + d, cols = c[3] ? shCols : inCols;
        if (c[6]) face([pr(x0, y0, z1), pr(x1, y0, z1), pr(x1, y1, z1), pr(x0, y1, z1)], cols[0]);   // top (+z)
        if (c[4]) face([pr(x0, y0, z0), pr(x0, y1, z0), pr(x0, y1, z1), pr(x0, y0, z1)], cols[1]);   // −x face
        if (c[5]) face([pr(x0, y0, z0), pr(x1, y0, z0), pr(x1, y0, z1), pr(x0, y0, z1)], cols[2]);   // −y face
      });
      axisLabels();
      txt(ctx, 16, 22, curLang() === 'ja' ? '八分の一を切り出した' : 'one octant, cut out', { font: curLang() === 'ja' ? '500 12.5px ' + MINCHO : 'italic 500 12.5px ' + SERIF, color: P.ink3 });
    }

    function drawCount(ctx, Rl, Rw, H, M, E, dE) {
      var pad = { t: 30, b: 56 }, ph = H - pad.t - pad.b, ja = curLang() === 'ja', m, NS = 160, Emax = 1;
      var series = [], ymax = 0;
      for (m = 0; m <= NS; m++) { var E0 = Emax * m / NS, c = countRange(dim, M, E0, E0 + dE); series.push(c); if (c > ymax) ymax = c; }
      ymax = max(ymax, analytic(dim, M, Emax, Emax + dE)) * 1.12 || 1;
      function sx(EE) { return Rl + EE / Emax * Rw; }
      function sy(v) { return pad.t + (1 - v / ymax) * ph; }
      arrow(ctx, Rl - 8, sy(0), Rl + Rw + 10, sy(0), P.axis, 1.1, 6);
      arrow(ctx, Rl, sy(0) + 2, Rl, pad.t - 10, P.axis, 1.1, 6);
      mvar(ctx, Rl + Rw + 14, sy(0) + 5, 'E', { color: P.ink2, size: 14 });
      txt(ctx, Rl - 4, pad.t - 14, ja ? '殻の中の升目の数' : 'cells in the shell', { font: ja ? '500 12.5px ' + MINCHO : 'italic 500 13px ' + SERIF, color: P.ink2 });
      ctx.strokeStyle = P.rgba(P.terra, 0.9); ctx.lineWidth = 1.6; ctx.beginPath();
      for (m = 0; m <= 200; m++) { var EE = Emax * m / 200, X = sx(EE), Y = sy(analytic(dim, M, EE, EE + dE)); if (m === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
      ctx.stroke();
      ctx.fillStyle = P.rgba(P.suo, 0.75);
      for (m = 0; m <= NS; m++) { ctx.beginPath(); ctx.arc(sx(Emax * m / NS), sy(series[m]), 1.8, 0, 2 * PI); ctx.fill(); }
      ctx.strokeStyle = P.rgba(P.neut, 0.5); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(sx(E), sy(0)); ctx.lineTo(sx(E), pad.t); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = P.rgb(P.suo); ctx.beginPath(); ctx.arc(sx(E), sy(countRange(dim, M, E, E + dE)), 4, 0, 2 * PI); ctx.fill();
      txt(ctx, sx(E), sy(0) + 18, 'E', { color: P.ink3, size: 12.5, align: 'center', italic: true });
    }

    function draw() {
      var o = dpr(canvas, 400), ctx = o.ctx, W = o.w, H = o.h, E = +sE.value, dE = +sD.value, M = +sM.value, ja = curLang() === 'ja';
      ground(ctx, W, H);
      var Lw = W * 0.56, Rl = W * 0.62, Rw = W - Rl - 34;
      if (dim === 1) drawK1(ctx, Lw, H, M, E, dE); else if (dim === 2) drawK2(ctx, Lw, H, M, E, dE); else drawK3(ctx, Lw, H, M, E, dE);
      drawCount(ctx, Rl, Rw, H, M, E, dE);
      var inside = countRange(dim, M, -1, E), shell = countRange(dim, M, E, E + dE), an = analytic(dim, M, E, E + dE).toFixed(1);
      status.textContent = ja
        ? ('E 以下の升目 ' + inside + ' 個、殻 [E, E + dE] の升目 ' + shell + ' 個（殻の体積は ' + an + '）。スピンで ×2')
        : ('cells up to E: ' + inside + ', cells in the shell [E, E + dE]: ' + shell + ' (shell volume ' + an + '); ×2 for spin');
    }
    function setDim(d) { dim = d; btns.forEach(function (b, i) { b.classList.toggle('active', i + 1 === d); }); draw(); }
    btns.forEach(function (b, i) { b.addEventListener('click', function () { setDim(i + 1); }); });
    sE.addEventListener('input', function () { ubE(); draw(); });
    sD.addEventListener('input', function () { ubD(); draw(); });
    sM.addEventListener('input', function () { ubM(); draw(); });
    window.addEventListener('resize', draw); onLang(draw); draw();
  })();
  // ════════════════════════════════════════════════════════════════════
  //  free-electron §04 — shrink the box: the dimensional crossover.
  //  Hard-wall box Lx × Ly × Lz: k_i = n_i π/L_i, n_i ≥ 1 (first octant,
  //  zero-point energy). Units ħ²π²/2m = 1, L in units of L0 (= the
  //  wavelength at E = EMAX): E = Σ (n_i/L_i)², shown for 0 ≤ E ≤ EMAX = 4.
  //  Sliders run 1 … LMAX (log) and their top means macroscopic (L → ∞).
  //  D(E) is computed EXACTLY as a bin-averaged cumulative count: finite
  //  directions are summed one quantum number at a time, macroscopic ones
  //  integrated (N_c(E) = E^{c/2} × the octant volume prefactor), then
  //  D = ΔN/ΔE per bin and a WIN-bin moving average (≈1 % of the axis) is
  //  applied. Because a level comb finer than that window is identical to
  //  its integral after averaging, the curves join continuously across
  //  dimensions: √E (c=3) → steps (c=2) → 1/√ spikes (c=1) → δ sticks (c=0).
  //  Drawings: real-space box at a FIXED scale (frame = FRAME λ, longer
  //  sides cut with a break mark); k-space cells (cells finer than 1/LDRAW
  //  are sub-pixel and drawn at 1/LDRAW).
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-confine'); if (!canvas) return;
    var AX = ['x', 'y', 'z'];
    var sl = AX.map(function (a) { return document.getElementById('cf-l' + a); });
    var ol = AX.map(function (a) { return document.getElementById('cf-l' + a + '-o'); });
    // slider value v (0..100) ↔ L = LMIN·(LMAX/LMIN)^(v/100); v = 7.2 → L = 1.00 λ, v = 2.7 → L = 0.80 λ.
    // The 2D preset uses Lz = 0.8 λ so that the second subband (always at 4·E₁ for hard walls) lies above
    // the plotted range: with Lz = 1 λ it would sit exactly at the top edge, E = 4.
    var presets = { '3': [100, 100, 100], '2': [100, 100, 2.7], '1': [100, 7.2, 7.2], '0': [7.2, 7.2, 7.2] };
    var pb = {}; Object.keys(presets).forEach(function (k) { pb[k] = document.getElementById('cf-' + k + 'd'); });
    var status = document.getElementById('cf-status');
    var LMIN = 0.7, LMAX = 100, FRAME = 16, LDRAW = 20, EMAX = 4, KMAX = sqrt(EMAX), NS = 720, SIG_E = 0.03, H_BOX = 250, H_LOW = 330;
    var dE = EMAX / NS;
    function Lof(v) { return LMIN * Math.pow(LMAX / LMIN, v / 100); }
    function isInf(v) { return +v >= 100; }
    var ub = sl.map(function (s, i) { return bindBubble(s, ol[i], function (v) { return isInf(v) ? '∞' : Lof(v).toFixed(1); }); });
    function state() { var cont = sl.map(function (s) { return isInf(s.value); }), L = sl.map(function (s, i) { return cont[i] ? LMAX : Lof(+s.value); }); return { cont: cont, L: L }; }

    // levels of the box as DRAWN (cells finer than 1/LDRAW are sub-pixel)
    function enumerateCells(Ld) {
      var nmax = Ld.map(function (Li) { return Math.floor(KMAX * Li + 1e-9); }), cells = [], nx, ny, nz;
      for (nx = 1; nx <= nmax[0]; nx++) { var ex = (nx / Ld[0]) * (nx / Ld[0]); if (ex > EMAX) break;
        for (ny = 1; ny <= nmax[1]; ny++) { var ey = ex + (ny / Ld[1]) * (ny / Ld[1]); if (ey > EMAX) break;
          for (nz = 1; nz <= nmax[2]; nz++) { var e = ey + (nz / Ld[2]) * (nz / Ld[2]); if (e > EMAX) break; cells.push([nx, ny, nz, e]); } } }
      return { cells: cells, nmax: nmax };
    }
    // exact bin-averaged D(E)
    function dos(L, cont) {
      var cIdx = [], dIdx = [], i, b; for (i = 0; i < 3; i++) (cont[i] ? cIdx : dIdx).push(i);
      var c = cIdx.length, pref = c === 1 ? L[cIdx[0]] : c === 2 ? PI / 4 * L[cIdx[0]] * L[cIdx[1]] : c === 3 ? PI / 6 * L[0] * L[1] * L[2] : 1;
      function Nc(Ep) { return Ep <= 0 ? 0 : c === 0 ? 1 : c === 1 ? pref * sqrt(Ep) : c === 2 ? pref * Ep : pref * Ep * sqrt(Ep); }
      // subband bottoms (levels when c = 0) from the finite directions, binned with per-bin mean energy
      // levels are collected a little beyond EMAX (5σ) so the smoothing kernel sees no false edge at the top of the plot
      var EX = EMAX + 5 * SIG_E, NX = Math.ceil(EX / dE), cnt = new Float64Array(NX), sumE = new Float64Array(NX), nSub = 0, E1 = Infinity;
      function put(e) { if (e >= EX) return; var k = Math.floor(e / dE); cnt[k]++; sumE[k] += e; if (e < EMAX) nSub++; if (e < E1) E1 = e; }
      if (dIdx.length === 0) put(0);
      else if (dIdx.length === 1) { var La = L[dIdx[0]]; for (var n = 1; ; n++) { var e = (n / La) * (n / La); if (e >= EX) break; put(e); } }
      else if (dIdx.length === 2) { var La2 = L[dIdx[0]], Lb2 = L[dIdx[1]]; for (var na = 1; ; na++) { var ea = (na / La2) * (na / La2); if (ea >= EX) break; for (var nb = 1; ; nb++) { var eab = ea + (nb / Lb2) * (nb / Lb2); if (eab >= EX) break; put(eab); } } }
      else { for (var n1 = 1; ; n1++) { var e1 = (n1 / L[0]) * (n1 / L[0]); if (e1 >= EX) break; for (var n2 = 1; ; n2++) { var e2 = e1 + (n2 / L[1]) * (n2 / L[1]); if (e2 >= EX) break; for (var n3 = 1; ; n3++) { var e3 = e2 + (n3 / L[2]) * (n3 / L[2]); if (e3 >= EX) break; put(e3); } } } }
      // cumulative N at the bin edges, then D = ΔN/ΔE
      var N = new Float64Array(NX + 1), nb2 = [];
      for (b = 0; b < NX; b++) if (cnt[b]) nb2.push([sumE[b] / cnt[b], cnt[b]]);
      for (i = 0; i <= NX; i++) { var E = i * dE, s = 0; for (b = 0; b < nb2.length; b++) { if (nb2[b][0] >= E) break; s += nb2[b][1] * Nc(E - nb2[b][0]); } N[i] = s; }
      var Draw = new Float64Array(NX); for (i = 0; i < NX; i++) Draw[i] = (N[i + 1] - N[i]) / dE;
      // Gaussian drawing resolution SIG_E: a comb of levels spaced ≲ SIG_E is smoothed to its integral
      // (ripple ~ exp(−2π²σ²/s²)), while a lone δ stays a narrow stick and a 1/√ spike stays sharp
      var D = new Float64Array(NS), K = Math.ceil(3 * SIG_E / dE), wts = [], wsum = 0, j;
      for (j = -K; j <= K; j++) { var g = Math.exp(-0.5 * (j * dE / SIG_E) * (j * dE / SIG_E)); wts.push(g); wsum += g; }
      for (i = 0; i < NS; i++) { var acc = 0, m = 0; for (j = -K; j <= K; j++) { var q = i + j; if (q < 0 || q >= NX) continue; acc += Draw[q] * wts[j + K]; m += wts[j + K]; } D[i] = acc / m; }
      return { c: c, D: D, nSub: nSub, E1: isFinite(E1) ? E1 : NaN, pref3: PI / 4 * L[0] * L[1] * L[2] };
    }

    function proj(ox, oy, U) { return function (x, y, z) { return [ox + (x - y) * U * 0.866, oy - (x + y) * U * 0.5 - z * U]; }; }
    function facePath(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var q = 1; q < pts.length; q++) ctx.lineTo(pts[q][0], pts[q][1]); ctx.closePath(); }

    // ── real-space box at a FIXED scale (the frame holds FRAME λ); longer sides are cut with a break mark ──
    function drawBox(ctx, x0, y0, w, h, L, cont) {
      var ja = curLang() === 'ja', U = min((w - 60) / (2 * FRAME * 0.866), (h - 66) / (FRAME * 1.5)), ox = x0 + w / 2, oy = y0 + h - 30, pr = proj(ox, oy, U);
      var Ld = L.map(function (v, i) { return cont[i] ? FRAME : min(v, FRAME); }), cut = L.map(function (v, i) { return cont[i] || v > FRAME; });
      var Lx = Ld[0], Ly = Ld[1], Lz = Ld[2];
      ctx.lineWidth = 1; ctx.strokeStyle = P.rgba(P.neut, 0.8);
      ctx.fillStyle = P.rgba(P.neut, 0.16); facePath(ctx, [pr(0, 0, Lz), pr(Lx, 0, Lz), pr(Lx, Ly, Lz), pr(0, Ly, Lz)]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = P.rgba(P.neut, 0.28); facePath(ctx, [pr(0, 0, 0), pr(0, Ly, 0), pr(0, Ly, Lz), pr(0, 0, Lz)]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = P.rgba(P.neut, 0.4); facePath(ctx, [pr(0, 0, 0), pr(Lx, 0, 0), pr(Lx, 0, Lz), pr(0, 0, Lz)]); ctx.fill(); ctx.stroke();
      // break marks on cut sides (a short double tick across the far end of the side)
      ctx.strokeStyle = P.rgb(P.plate); ctx.lineWidth = 3;
      function breakMark(a, b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      if (cut[0]) { breakMark(pr(Lx * 0.93, 0, -0.3), pr(Lx * 0.96, 0, Lz + 0.3)); breakMark(pr(Lx * 0.93, Ly + 0.3, Lz), pr(Lx * 0.96, -0.3, Lz)); }
      if (cut[1]) { breakMark(pr(0, Ly * 0.93, -0.3), pr(0, Ly * 0.96, Lz + 0.3)); breakMark(pr(Lx + 0.3, Ly * 0.93, Lz), pr(-0.3, Ly * 0.96, Lz)); }
      if (cut[2]) { breakMark(pr(-0.3, 0, Lz * 0.93), pr(Lx + 0.3, 0, Lz * 0.96)); breakMark(pr(0, -0.3, Lz * 0.93), pr(0, Ly + 0.3, Lz * 0.96)); }
      // edge labels
      var lab = [[pr(Lx / 2, 0, 0), 8, 15, 'left'], [pr(0, Ly / 2, 0), -8, 15, 'right'], [pr(0, 0, Lz / 2), -10, 4, 'right']];
      lab.forEach(function (l, i) {
        if (Ld[i] * U < 22) return;
        var x = l[0][0] + l[1], y = l[0][1] + l[2], val = cont[i] ? '= ∞' : (L[i] > FRAME ? '= ' + L[i].toFixed(0) : '');
        if (!val) { mvar(ctx, x, y, 'L', { sub: AX[i], color: P.ink2, size: 12.5, align: l[3] }); return; }
        ctx.font = 'italic 500 12px ' + SERIF; var wv = ctx.measureText(val).width + 4;
        if (l[3] === 'right') { txt(ctx, x, y, val, { color: P.ink2, size: 12, italic: true, align: 'right' }); mvar(ctx, x - wv, y, 'L', { sub: AX[i], color: P.ink2, size: 12.5, align: 'right' }); }
        else { var t = mvar(ctx, x, y, 'L', { sub: AX[i], color: P.ink2, size: 12.5, align: 'left' }); txt(ctx, x + t + 4, y, val, { color: P.ink2, size: 12, italic: true, align: 'left' }); }
      });
      var bx = x0 + 10, by = y0 + h - 10;
      ctx.strokeStyle = P.rgb(P.terra); ctx.lineWidth = 3; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + U, by); ctx.stroke();
      txt(ctx, bx + U + 6, by + 4, 'λ(E = 4) = L₀', { color: P.eLine, size: 12, italic: true });
      txt(ctx, x0 + 10, y0 + 16, ja ? '実空間の箱（縮尺固定、枠 ≈ 16 λ、はみ出す辺は切って描く）' : 'the box in real space (fixed scale, frame ≈ 16 λ; longer sides are cut)', { font: ja ? '500 12.5px ' + MINCHO : 'italic 500 12.5px ' + SERIF, color: P.ink3 });
    }

    // ── k-space cells of the first octant ──
    function drawCells(ctx, x0, y0, w, h, Ld, data) {
      var ja = curLang() === 'ja', KR = KMAX + 0.5, U = min((w - 40) / (2 * KR * 0.866), (h - 50) / (1.6 * KR)), ox = x0 + w / 2, oy = y0 + h - 30, pr = proj(ox, oy, U);
      var axes = [[KR, 0, 0, 'x'], [0, KR, 0, 'y'], [0, 0, KR, 'z']];
      axes.forEach(function (a) { var p1 = pr(a[0], a[1], a[2]); arrow(ctx, ox, oy, p1[0], p1[1], P.rgba(P.neut, 0.7), 1, 6); });
      var nm = data.nmax, W2 = nm[1] + 2, W3 = nm[2] + 2, occ = new Uint8Array((nm[0] + 2) * W2 * W3);
      function idx(a, b, c) { return (a * W2 + b) * W3 + c; }
      data.cells.forEach(function (c) { occ[idx(c[0], c[1], c[2])] = 1; });
      var vis = [];
      data.cells.forEach(function (c) { var fx = !occ[idx(c[0] - 1, c[1], c[2])], fy = !occ[idx(c[0], c[1] - 1, c[2])], fz = !occ[idx(c[0], c[1], c[2] + 1)]; if (fx || fy || fz) vis.push([c[0], c[1], c[2], fx, fy, fz]); });
      vis.sort(function (a, b) { return (a[2] / Ld[2] - a[0] / Ld[0] - a[1] / Ld[1]) - (b[2] / Ld[2] - b[0] / Ld[0] - b[1] / Ld[1]); });
      var hx = 0.5 / Ld[0], hy = 0.5 / Ld[1], hz = 0.5 / Ld[2], edge = min(hx, hy, hz) * 2 * U >= 6, C_EDGE = P.rgba(P.plate, 0.85);
      var colsA = [P.rgb(P.tint(P.suo, 0.58)), P.rgb(P.tint(P.suo, 0.3)), P.rgb(P.tint(P.suo, 0.12))];
      var colsB = [P.rgb(P.tint(P.suo, 0.8)), P.rgb(P.tint(P.suo, 0.62)), P.rgb(P.tint(P.suo, 0.48))];
      function face(pts, col) { ctx.fillStyle = col; facePath(ctx, pts); ctx.fill(); if (edge) { ctx.strokeStyle = C_EDGE; ctx.lineWidth = 0.8; ctx.stroke(); } }
      vis.forEach(function (c) {
        var cx = c[0] / Ld[0], cy = c[1] / Ld[1], cz = c[2] / Ld[2], xa = cx - hx, xb = cx + hx, ya = cy - hy, yb = cy + hy, za = cz - hz, zb = cz + hz;
        var cols = (c[0] + c[1] + c[2]) % 2 ? colsA : colsB;
        if (c[5]) face([pr(xa, ya, zb), pr(xb, ya, zb), pr(xb, yb, zb), pr(xa, yb, zb)], cols[0]);
        if (c[3]) face([pr(xa, ya, za), pr(xa, yb, za), pr(xa, yb, zb), pr(xa, ya, zb)], cols[1]);
        if (c[4]) face([pr(xa, ya, za), pr(xb, ya, za), pr(xb, ya, zb), pr(xa, ya, zb)], cols[2]);
      });
      axes.forEach(function (a) { var p1 = pr(a[0], a[1], a[2]); mvar(ctx, p1[0] + (a[3] === 'x' ? 8 : a[3] === 'y' ? -8 : -6), p1[1] + (a[3] === 'z' ? -8 : 5), 'k', { sub: a[3], color: P.ink2, size: 14, align: a[3] === 'y' ? 'right' : 'left' }); });
      txt(ctx, x0 + 10, y0 + 16, ja ? 'k 空間：固定端、第一象限、n ≥ 1' : 'k space: hard walls, first octant, n ≥ 1', { font: ja ? '500 12.5px ' + MINCHO : 'italic 500 12.5px ' + SERIF, color: P.ink3 });
    }

    // ── D(E) ──
    function drawDOS(ctx, Rl, Rw, y0, h, res) {
      var pad = { t: 34, b: 50 }, ph = h - pad.t - pad.b, top = y0 + pad.t, ja = curLang() === 'ja', m;
      function line3(E) { return res.pref3 * sqrt(E); }
      var ymax;
      if (res.c >= 2) { ymax = 0; for (m = 0; m < NS; m++) if (res.D[m] > ymax) ymax = res.D[m]; ymax = max(ymax, res.c === 3 ? 0 : line3(EMAX) * 0.5) * 1.12 || 1; }
      else { var v = Array.prototype.slice.call(res.D).sort(function (a, b) { return a - b; }); ymax = max(v[Math.floor(v.length * 0.9)] * 1.8, v[v.length - 1] * 0.55, 1e-9); }
      function sx(E) { return Rl + E / EMAX * Rw; }
      function sy(val) { return top + (1 - min(val, ymax) / ymax) * ph; }
      arrow(ctx, Rl - 8, sy(0), Rl + Rw + 10, sy(0), P.axis, 1.1, 6);
      arrow(ctx, Rl, sy(0) + 2, Rl, top - 12, P.axis, 1.1, 6);
      mvar(ctx, Rl + Rw + 14, sy(0) + 5, 'E', { color: P.ink2, size: 14 });
      mvar(ctx, Rl - 6, top - 16, 'D', { color: P.ink2, size: 14 }); txt(ctx, Rl + 8, top - 16, '(E)', { color: P.ink2, size: 13, italic: true });
      ctx.beginPath(); ctx.moveTo(sx(0), sy(0));
      for (m = 0; m < NS; m++) ctx.lineTo(sx((m + 0.5) * dE), sy(res.D[m]));
      ctx.lineTo(sx(EMAX), sy(0)); ctx.closePath(); ctx.fillStyle = P.rgba(P.suo, 0.16); ctx.fill();
      ctx.strokeStyle = P.curve; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.beginPath();
      for (m = 0; m < NS; m++) { var X = sx((m + 0.5) * dE), Y = sy(res.D[m]); if (m === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
      ctx.stroke();
      ctx.strokeStyle = P.rgba(P.neut, 0.8); ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]); ctx.beginPath(); var pen = false;
      for (m = 0; m <= 200; m++) { var E = EMAX * m / 200, v2 = line3(E); if (v2 > ymax) { pen = false; continue; } var X2 = sx(E), Y2 = sy(v2); if (!pen) { ctx.moveTo(X2, Y2); pen = true; } else ctx.lineTo(X2, Y2); }
      ctx.stroke(); ctx.setLineDash([]);
      txt(ctx, Rl + Rw, top + 2, ja ? '3D の式' : '3D formula', { color: P.ink3, size: 12, italic: !ja, align: 'right', font: ja ? '500 12px ' + MINCHO : undefined, baseline: 'top' });
      if (!isNaN(res.E1)) { ctx.strokeStyle = P.rgba(P.terra, 0.8); ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(sx(res.E1), sy(0)); ctx.lineTo(sx(res.E1), top + 36); ctx.stroke(); ctx.setLineDash([]); mvar(ctx, sx(res.E1) + 4, sy(0) - 6, 'E', { sub: '1', color: P.eLine, size: 12.5 }); }
      [[0, '0'], [EMAX, String(EMAX)]].forEach(function (tk) { txt(ctx, sx(tk[0]), sy(0) + 18, tk[1], { color: P.ink3, size: 12, align: 'center', italic: true }); });
    }

    var lastKey = '', cache = null, res = null;
    function draw() {
      var o = dpr(canvas, H_BOX + H_LOW), ctx = o.ctx, W = o.w, st = state(), L = st.L, cont = st.cont, ja = curLang() === 'ja';
      ground(ctx, W, o.h);
      var Ld = L.map(function (v, i) { return cont[i] ? LDRAW : min(v, LDRAW); });
      var key = L.map(function (v) { return v.toFixed(3); }).join(',') + cont.join(''); if (key !== lastKey) { lastKey = key; cache = enumerateCells(Ld); res = dos(L, cont); }
      drawBox(ctx, 0, 0, W, H_BOX, L, cont);
      ctx.strokeStyle = P.rgba(P.neut, 0.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, H_BOX + 2); ctx.lineTo(W - 10, H_BOX + 2); ctx.stroke();
      var Lw = W * 0.56, Rl = W * 0.62, Rw = W - Rl - 34;
      drawCells(ctx, 0, H_BOX + 6, Lw, H_LOW - 6, Ld, cache);
      drawDOS(ctx, Rl, Rw, H_BOX + 6, H_LOW - 6, res);
      var c = res.c, lam = L.map(function (v, i) { return cont[i] ? '∞' : v.toFixed(1); });
      var form = ja
        ? (c === 3 ? '(π/4)√E·L_xL_yL_z' : c === 2 ? '有限な辺のサブバンドごとに (π/4)L_xL_y の段' : c === 1 ? 'サブバンドごとに (L_x/2)/√(E − E_n) の尖り' : 'δ(E − E_n) の列')
        : (c === 3 ? '(π/4)√E·LxLyLz' : c === 2 ? 'a step (π/4)LxLy per subband of the finite side' : c === 1 ? 'a spike (Lx/2)/√(E − En) per subband' : 'a row of δ(E − En)');
      status.textContent = ja
        ? ('辺は波長 λ の ' + lam.join('、') + ' 倍。連続として扱う方向は ' + c + ' 本、範囲内のサブバンドは ' + res.nSub + ' 本、最低準位 E₁ = ' + (isNaN(res.E1) ? '–' : res.E1.toFixed(2)) + '。D(E) = ' + form)
        : ('sides of ' + lam.join(', ') + ' wavelengths; ' + c + ' direction' + (c === 1 ? '' : 's') + ' treated as continuous, ' + res.nSub + ' subband' + (res.nSub === 1 ? '' : 's') + ' in range, lowest level E₁ = ' + (isNaN(res.E1) ? '–' : res.E1.toFixed(2)) + '. D(E) = ' + form);
    }
    function syncPresetButtons() { var v = sl.map(function (s) { return +s.value; }); Object.keys(presets).forEach(function (k) { pb[k].classList.toggle('active', presets[k].every(function (p, i) { return p === v[i]; })); }); }
    Object.keys(presets).forEach(function (k) { pb[k].addEventListener('click', function () { presets[k].forEach(function (p, i) { sl[i].value = p; ub[i](); }); syncPresetButtons(); draw(); }); });
    sl.forEach(function (s, i) { s.addEventListener('input', function () { ub[i](); syncPresetButtons(); draw(); }); });
    window.addEventListener('resize', draw); onLang(draw); syncPresetButtons(); draw();
  })();
})();
