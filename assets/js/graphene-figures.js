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
    var kMax = PI, Emax = 9.6;
    var ubT = bindBubble(sT, oT, function (v) { return v.toFixed(2) + ' eV'; });
    var ubE = bindBubble(sE, oE, function (v) { return v.toFixed(1) + ' eV'; });

    function draw() {
      var o = dpr(canvas, 330), ctx = o.ctx, W = o.w, H = o.h;
      var t = +sT.value, eps = +sE.value;
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
    }
    sT.addEventListener('input', function () { ubT(); draw(); });
    sE.addEventListener('input', function () { ubE(); draw(); });
    window.addEventListener('resize', function () { ubT(); ubE(); draw(); });
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
  //  the primitive vectors a₁,a₂. Geometry only; highlight one δ at a time.
  //  No phase factor (that is Page 3's job).
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-nnvec'); if (!canvas) return;
    var sel = 0, bAll = document.getElementById('nn-all');
    var bd = [1, 2, 3].map(function (j) { return document.getElementById('nn-d' + j); });
    function setSel(s) { sel = s; bAll.classList.toggle('active', s === 0); bd.forEach(function (b, i) { b.classList.toggle('active', s === i + 1); }); draw(); }
    bAll.addEventListener('click', function () { setSel(0); });
    bd.forEach(function (b, i) { b.addEventListener('click', function () { setSel(i + 1); }); });
    function draw() {
      var o = dpr(canvas, 320), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      var s = 50, cx = W * 0.47, cy = H * 0.5;
      var dlt = [[0, -1], [sqrt3 / 2, 0.5], [-sqrt3 / 2, 0.5]];                                       // δ1 up, δ2 down-right, δ3 down-left
      var a1 = [dlt[0][0] - dlt[2][0], dlt[0][1] - dlt[2][1]], a2 = [dlt[0][0] - dlt[1][0], dlt[0][1] - dlt[1][1]];   // A→A Bravais vectors
      function P2(vx, vy) { return [cx + vx * s, cy + vy * s]; }
      var As = [];
      for (var m = -2; m <= 2; m++) for (var n = -2; n <= 2; n++) As.push([m * a1[0] + n * a2[0], m * a1[1] + n * a2[1]]);
      ctx.strokeStyle = P.rgba(P.neut, 0.28); ctx.lineWidth = 1.2; ctx.lineCap = 'round';     // faint honeycomb context
      As.forEach(function (A) { dlt.forEach(function (d) { var p0 = P2(A[0], A[1]), p1 = P2(A[0] + d[0], A[1] + d[1]); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }); });
      As.forEach(function (A) { var pA = P2(A[0], A[1]); ctx.fillStyle = P.rgba(P.suo, 0.42); ctx.beginPath(); ctx.arc(pA[0], pA[1], 3.1, 0, 2 * PI); ctx.fill(); var pB = P2(A[0] + dlt[0][0], A[1] + dlt[0][1]); ctx.fillStyle = P.rgba(P.sage, 0.5); ctx.beginPath(); ctx.arc(pB[0], pB[1], 3.1, 0, 2 * PI); ctx.fill(); });
      var pA0 = P2(0, 0);
      var aOn = (sel === 0);                                                                  // a1,a2 shown when not isolating a single δ
      [[a1, '1'], [a2, '2']].forEach(function (av) {
        var p1 = P2(av[0][0], av[0][1]);
        arrowShort(ctx, pA0[0], pA0[1], p1[0], p1[1], 8, aOn ? P.basis : P.rgba(P.terra, 0.28), 1.7, 8);
        if (aOn) { var axo = av[0][0] > 0 ? 3 : -15; mvar(ctx, pA0[0] + av[0][0] * s * 0.66 + axo, pA0[1] + av[0][1] * s * 0.66 + 4, 'a', { sub: av[1], color: P.basis, size: 14 }); }
      });
      dlt.forEach(function (d, j) {                                                            // the three δ arrows from the central A
        var on = (sel === 0 || sel === j + 1), pB = P2(d[0], d[1]);
        arrowShort(ctx, pA0[0], pA0[1], pB[0], pB[1], 8, on ? P.curve : P.rgba(P.suo, 0.16), on ? 2.4 : 1.3, on ? 9 : 7);
        if (on) { var dxo = d[0] > 0.1 ? 8 : -17, dyo = d[1] > 0.1 ? 16 : (d[0] === 0 ? 4 : -7); mvar(ctx, pA0[0] + d[0] * s * 0.6 + dxo, pA0[1] + d[1] * s * 0.6 + dyo, 'δ', { sub: String(j + 1), color: P.ink2, size: 14 }); }
      });
      ctx.fillStyle = P.aSite; ctx.beginPath(); ctx.arc(pA0[0], pA0[1], 4.6, 0, 2 * PI); ctx.fill();   // central A on top
    }
    window.addEventListener('resize', draw);
    draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure 2.3 — hexagonal first Brillouin zone + reciprocal lattice, with
  //  Γ, M, K, K′. K filled / K′ hollow ring (same diameter) gives the two
  //  inequivalent corners by SHAPE; geometry only (no band contact / meaning).
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-bz'); if (!canvas) return;
    function draw() {
      var o = dpr(canvas, 340), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      var cx = W * 0.5, cy = H * 0.5, R = min(W, H) * 0.3;
      function corner(i) { var a = i * PI / 3; return [cx + R * cos(a), cy - R * sin(a)]; }                  // K/K′ corners (y up)
      function mid(i) { var a = PI / 6 + i * PI / 3, rm = R * sqrt3 / 2; return [cx + rm * cos(a), cy - rm * sin(a)]; }  // M edge midpoints
      var gN = [];                                                                                            // neighbouring Γ (reciprocal lattice)
      for (var i = 0; i < 6; i++) { var a = PI / 6 + i * PI / 3, d = R * sqrt3; gN.push([cx + d * cos(a), cy - d * sin(a)]); }
      ctx.strokeStyle = P.rgba(P.neut, 0.16); ctx.lineWidth = 1; ctx.lineJoin = 'round';                     // faint neighbour BZ hexagons (context)
      gN.forEach(function (g) { ctx.beginPath(); for (var i = 0; i <= 6; i++) { var a = i * PI / 3, X = g[0] + R * cos(a), Y = g[1] - R * sin(a); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } ctx.closePath(); ctx.stroke(); });
      ctx.fillStyle = P.rgba(P.neut, 0.5); gN.forEach(function (g) { ctx.beginPath(); ctx.arc(g[0], g[1], 2.6, 0, 2 * PI); ctx.fill(); });   // reciprocal lattice points
      arrow(ctx, cx - R * 1.45, cy, cx + R * 1.45, cy, P.axis, 1.2, 7);                                       // kx, ky axes through Γ
      arrow(ctx, cx, cy + R * 1.25, cx, cy - R * 1.45, P.axis, 1.2, 7);
      mvar(ctx, cx + R * 1.45 + 6, cy + 5, 'k', { sub: 'x', color: P.ink2, size: 14 });
      mvar(ctx, cx + 7, cy - R * 1.45 - 3, 'k', { sub: 'y', color: P.ink2, size: 14 });
      ctx.strokeStyle = P.structure; ctx.lineWidth = 1.7; ctx.lineJoin = 'round';                            // first BZ (emphasised)
      ctx.beginPath(); for (var i = 0; i <= 6; i++) { var p = corner(i); if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); } ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round';                                   // M = short tick ⊥ the BZ edge
      for (var i = 0; i < 6; i++) { var pm = mid(i), a = PI / 6 + i * PI / 3, rx = cos(a), ry = -sin(a); ctx.beginPath(); ctx.moveTo(pm[0] - rx * 4.5, pm[1] - ry * 4.5); ctx.lineTo(pm[0] + rx * 4.5, pm[1] + ry * 4.5); ctx.stroke(); }
      for (var i = 0; i < 6; i++) { var p = corner(i), isK = (i % 2 === 0); ctx.strokeStyle = P.ink; ctx.fillStyle = P.ink; if (isK) { ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 2 * PI); ctx.fill(); } else { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p[0], p[1], 3.25, 0, 2 * PI); ctx.stroke(); } }
      txt(ctx, cx - 12, cy + 17, 'Γ', { color: P.ink, italic: true, size: 14, align: 'center' });            // Γ at the axis crossing (no marker)
      var pK = corner(0), pKp = corner(1), pM = mid(0);
      txt(ctx, pK[0] + 14, pK[1] + 5, 'K', { color: P.ink, italic: true, size: 14, align: 'center' });
      txt(ctx, pKp[0] + 12, pKp[1] - 9, 'K′', { color: P.ink, italic: true, size: 14, align: 'center' });
      txt(ctx, pM[0] + 15, pM[1] - 6, 'M', { color: P.ink, italic: true, size: 13, align: 'center' });
    }
    window.addEventListener('resize', draw);
    draw();
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
    function gOf(kx, ky) { var g = 3 + 2 * cos(kx) + 4 * cos(kx / 2) * cos(ky * sqrt3 / 2); return g < 0 ? 0 : g; }
    function kAt(p) {
      if (p < 1 / 3) { var u = p * 3; return [Kp[0] * u, Kp[1] * u]; }
      if (p < 2 / 3) { var u = (p - 1 / 3) * 3; return [Kp[0] + (Mp[0] - Kp[0]) * u, Kp[1] + (Mp[1] - Kp[1]) * u]; }
      var u = (p - 2 / 3) * 3; return [Mp[0] * (1 - u), Mp[1] * (1 - u)];
    }
    function posLabel(p) { var pts = [[0, 'Γ'], [1 / 3, 'K'], [2 / 3, 'M'], [1, 'Γ']]; for (var i = 0; i < pts.length; i++) if (abs(p - pts[i][0]) < 0.025) return pts[i][1]; return p < 1 / 3 ? 'Γ–K' : p < 2 / 3 ? 'K–M' : 'M–Γ'; }
    function draw() {
      var o = dpr(canvas, 320), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      var pad = { l: 42, r: 22, t: 26, b: 40 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b, Emax = 3.3;
      function sx(p) { return pad.l + p * pw; }
      function sy(E) { return pad.t + (1 - (E + Emax) / (2 * Emax)) * ph; }
      ctx.strokeStyle = P.rgba(P.neut, 0.32); ctx.setLineDash([5, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(pad.l + pw, sy(0)); ctx.stroke(); ctx.setLineDash([]);
      mvar(ctx, pad.l + pw - 32, sy(0) - 7, 'E', { sub: 'F', size: 12, color: P.ink3 }); txt(ctx, pad.l + pw - 15, sy(0) - 7, '= 0', { size: 12, color: P.ink3 });
      arrow(ctx, pad.l, sy(-Emax) + 2, pad.l, pad.t - 8, P.axis, 1.2, 7);
      mvar(ctx, pad.l - 9, pad.t - 12, 'E', { color: P.ink2, size: 15, align: 'right' });
      [[0, 'Γ'], [1 / 3, 'K'], [2 / 3, 'M'], [1, 'Γ']].forEach(function (tk) { var x = sx(tk[0]); ctx.strokeStyle = P.rgba(P.neut, 0.16); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke(); txt(ctx, x, pad.t + ph + 18, tk[1], { color: P.ink3, size: 13, align: 'center', italic: true }); });
      function band(sign, col) { ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); for (var i = 0; i <= 300; i++) { var p = i / 300, k = kAt(p), E = sign * sqrt(gOf(k[0], k[1])); var X = sx(p), Y = sy(E); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } ctx.stroke(); }
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
    sP.addEventListener('input', function () { oP.textContent = posLabel(+sP.value); draw(); });
    window.addEventListener('resize', draw); oP.textContent = posLabel(+sP.value); draw();
  })();

  // ════════════════════════════════════════════════════════════════════
  //  Figure 3.2 — structure factor f(k) = Σ_j e^{i k·δ_j}. A k-selector
  //  (left, drag in the BZ) drives three unit phasors drawn tip-to-tail
  //  (right); their closing vector is f(k). At K the chain closes → f = 0.
  //  No energy axis — this is purely the phase sum that builds the band.
  // ════════════════════════════════════════════════════════════════════
  (function () {
    var canvas = document.getElementById('fig-phase'); if (!canvas) return;
    var BZR = 4 * PI / 3, SC = 1 / sqrt3;
    var dlt = [[0, 1], [sqrt3 / 2, -0.5], [-sqrt3 / 2, -0.5]];   // δ_j: 3 NN directions, 120° apart
    var kpt = [BZR * 0.52, 0];                                   // current k (default Γ→K)
    var bz = { cx: 0, cy: 0, R: 0 };
    function phases() { return dlt.map(function (d) { return SC * (kpt[0] * d[0] + kpt[1] * d[1]); }); }
    function draw() {
      var o = dpr(canvas, 300), ctx = o.ctx, W = o.w, H = o.h;
      ground(ctx, W, H);
      // ── LEFT: Brillouin zone, drag k here ──────────────────────────
      bz.cx = W * 0.26; bz.cy = H * 0.52; bz.R = min(W * 0.19, H * 0.36);
      var cx = bz.cx, cy = bz.cy, R = bz.R, i, a, X, Y;
      ctx.strokeStyle = P.structure; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.beginPath();
      for (i = 0; i <= 6; i++) { a = i * PI / 3; X = cx + R * cos(a); Y = cy - R * sin(a); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
      ctx.closePath(); ctx.stroke();
      for (i = 0; i < 6; i++) { a = i * PI / 3; X = cx + R * cos(a); Y = cy - R * sin(a); ctx.fillStyle = P.axis; ctx.strokeStyle = P.axis; if (i % 2 === 0) { ctx.beginPath(); ctx.arc(X, Y, 3.4, 0, 2 * PI); ctx.fill(); } else { ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(X, Y, 2.75, 0, 2 * PI); ctx.stroke(); } }
      txt(ctx, cx - 4, cy + 14, 'Γ', { color: P.axis, italic: true, size: 12, align: 'right' });
      txt(ctx, cx + R + 11, cy + 4, 'K', { color: P.axis, italic: true, size: 12, align: 'center' });
      var ksx = cx + (kpt[0] / BZR) * R, ksy = cy - (kpt[1] / BZR) * R;
      ctx.fillStyle = P.curve; ctx.beginPath(); ctx.arc(ksx, ksy, 5, 0, 2 * PI); ctx.fill();
      mvar(ctx, ksx + 8, ksy - 7, 'k', { color: P.ink2, size: 13 });
      // ── RIGHT: phasors tip-to-tail, closing vector = f(k) ──────────
      var px = W * 0.64, py = H * 0.54, pr = min(W * 0.092, H * 0.2);
      ctx.strokeStyle = P.rgba(P.neut, 0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px - pr * 1.5, py); ctx.lineTo(px + pr * 3.25, py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py + pr * 1.9); ctx.lineTo(px, py - pr * 1.9); ctx.stroke();
      ctx.strokeStyle = P.rgba(P.neut, 0.16); ctx.beginPath(); ctx.arc(px, py, pr, 0, 2 * PI); ctx.stroke();
      var th = phases(), x = px, y = py, sub = ['1', '2', '3'];
      ctx.lineCap = 'round';
      th.forEach(function (t, j) {
        var nx = x + pr * cos(t), ny = y - pr * sin(t);
        arrowShort(ctx, x, y, nx, ny, 0, P.rgb(P.teal), 2, 6.5);
        var mxp = (x + nx) / 2 + 8 * cos(t + PI / 2), myp = (y + ny) / 2 - 8 * sin(t + PI / 2);
        mvar(ctx, mxp - 3, myp + 4, 'δ', { color: P.ink3, size: 11, sub: sub[j] });
        x = nx; y = ny;
      });
      var fm = hypot(x - px, y - py) / pr;
      if (fm > 0.045) arrowShort(ctx, px, py, x, y, 0, P.curve, 2.6, 9);
      else { ctx.fillStyle = P.curve; ctx.beginPath(); ctx.arc(px, py, 3.6, 0, 2 * PI); ctx.fill(); }
      var lx = px - pr * 1.5, ly = py - pr * 1.9 + 2;
      txt(ctx, lx, ly, '|', { color: P.ink3, size: 14 });
      mvar(ctx, lx + 5, ly, 'f', { color: P.ink2, size: 14, italic: true });
      txt(ctx, lx + 14, ly, '| = ' + fm.toFixed(2), { color: P.ink3, size: 13 });
    }
    function setK(e) {
      var r = canvas.getBoundingClientRect();
      kpt = [((e.clientX - r.left - bz.cx) / bz.R) * BZR, -((e.clientY - r.top - bz.cy) / bz.R) * BZR];
      draw();
    }
    var dragging = false;
    canvas.addEventListener('pointerdown', function (e) { var r = canvas.getBoundingClientRect(); if ((e.clientX - r.left) < r.width * 0.5) { dragging = true; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} setK(e); } });
    canvas.addEventListener('pointermove', function (e) { if (dragging) setK(e); });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('pointercancel', function () { dragging = false; });
    var bK = document.getElementById('ph-toK'), bG = document.getElementById('ph-toG');
    if (bK) bK.addEventListener('click', function () { kpt = [BZR, 0]; draw(); });
    if (bG) bG.addEventListener('click', function () { kpt = [0, 0]; draw(); });
    window.addEventListener('resize', draw); draw();
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

    var a1 = [1, 0], a2 = [0.5, sqrt3 / 2];
    var d1 = [0, 1 / sqrt3], d2 = [-0.5, -1 / (2 * sqrt3)], d3 = [0.5, -1 / (2 * sqrt3)];
    var deltas = [d1, d2, d3], range = 4;
    var mode = null, vec = [0, 0], anim = 0, raf = null;

    function startMove(m) {
      mode = m; vec = (m === 'aa') ? a1.slice() : d1.slice(); anim = 0;
      btnA.classList.toggle('active', m === 'aa'); btnB.classList.toggle('active', m === 'ab');
      // Both lines share one structure: 説明（操作）：<結果>。 — colon + a single result
      // clause, no dashes (house style forbids — / ――; use 句点・コロン・接続語 only).
      if (status) status.innerHTML = (m === 'aa')
        ? '<span class="i18n-en">Translate by a lattice vector (A→A): <span class="sok">the lattice maps onto itself.</span></span><span class="i18n-ja">格子ベクトルで並進（A→A）：<span class="sok">格子全体が重なる。</span></span>'
        : '<span class="i18n-en">Move to the neighbouring carbon (A→B): <span class="sno">the bonds reverse, so it does not map onto itself.</span></span><span class="i18n-ja">隣の炭素へ並進（A→B）：<span class="sno">結合の向きが反転して重ならない。</span></span>';
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
        drawLattice(ctx, tx, ty, 0, 0, 1);          // at rest: one normal lattice…
        drawAnnotations(ctx, tx, ty);               // …with the unit cell + a1,a2 reference
      } else {
        // Whole-overlap (案あ): the PRE lattice stays as a faint baseline, the POST copy
        // is drawn dark over it. Opacity is the ONLY distinction (same solid line style,
        // no dashing). A→A: dark coincides with the baseline (maps onto itself);
        // A→B: dark is offset by one bond (does not map, bonds reverse).
        drawLattice(ctx, tx, ty, 0, 0, 0.24);
        drawLattice(ctx, tx, ty, ox, oy, 1);
      }

      if (moving) drawOpArrow(ctx, tx, ty);          // temporary cue; a1,a2 hidden while moving so the two vector kinds never mix
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

    // rest-only reference geometry: unit-cell rhombus + four corner points + a1,a2
    function drawAnnotations(ctx, tx, ty) {
      var corners = [[0, 0], [a1[0], a1[1]], [a1[0] + a2[0], a1[1] + a2[1]], [a2[0], a2[1]]];
      ctx.strokeStyle = P.rgba(P.terra, 0.55); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); corners.forEach(function (c, i) { var X = tx(c[0]), Y = ty(c[1]); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 1.6; ctx.strokeStyle = P.rgba(P.terra, 0.72);
      corners.forEach(function (c) { ctx.beginPath(); ctx.arc(tx(c[0]), ty(c[1]), 8.5, 0, 2 * PI); ctx.stroke(); });
      arrowShort(ctx, tx(0), ty(0), tx(a1[0]), ty(a1[1]), 11, P.basis, 2, 8);
      arrowShort(ctx, tx(0), ty(0), tx(a2[0]), ty(a2[1]), 11, P.basis, 2, 8);
      mvar(ctx, tx(a1[0]) + 7, ty(a1[1]) + 17, 'a', { sub: '1', color: P.basis, size: 15 });
      mvar(ctx, tx(a2[0]) - 24, ty(a2[1]) - 5, 'a', { sub: '2', color: P.basis, size: 15 });
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
    var autoRotate = true, showEF = false, dragging = false, dirty = true;
    var tHop = 2.7;   // hopping t is fixed now (the t slider was removed) — it only sets the overall energy scale, not the band shape

    function draw(N) {
      var o = dpr(canvas, 470, 1.35), ctx = o.ctx, W = o.w, H = o.h;   // dpr capped low (translucent fill-rate is the cost; shading stays smooth)
      ground(ctx, W, H);
      var sh = buildShaded(N, tHop), eMax = sh.eMax;
      var cosT = cos(theta), sinT = sin(theta), cosP = cos(phi), sinP = sin(phi);
      var viewScale = min(W, H) * 0.42 * zoom, cxp = W * 0.52 + panX, cyp = H * 0.44 + panY;   // origin nudged UP; panX/panY (middle-drag) translate it in screen space
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
})();
