/* Crystal Structure II — interactive figures.
 * Self-contained; shares only CSS with the rest of the site. */
(function () {
  'use strict';
  var PI = Math.PI, sqrt3 = Math.sqrt(3),
      cos = Math.cos, sin = Math.sin, abs = Math.abs,
      sqrt = Math.sqrt, min = Math.min, max = Math.max, round = Math.round;

  var ACCENT = '#e0635a', INKDIM = 'rgba(255,255,255,0.45)';
  var BG = '#14110b';

  function setup(id) {
    var canvas = document.getElementById(id);
    if (!canvas) return null;
    var r = window.devicePixelRatio || 1; if (r > 2) r = 2;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width*r; canvas.height = rect.height*r;
    var ctx = canvas.getContext('2d');
    ctx.scale(r, r);
    return {c: canvas, x: ctx, w: rect.width, h: rect.height};
  }
  function clear(o) {
    o.x.fillStyle = BG;
    o.x.fillRect(0, 0, o.w, o.h);
  }
  function arrow(ctx, x0, y0, x1, y1, color, width, headLen) {
    var ang = Math.atan2(y1 - y0, x1 - x0);
    headLen = headLen || 9;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - headLen*cos(ang - 0.45), y1 - headLen*sin(ang - 0.45));
    ctx.lineTo(x1 - headLen*cos(ang + 0.45), y1 - headLen*sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
  }
  function label(ctx, text, x, y, color, size, align) {
    ctx.fillStyle = color || INKDIM;
    ctx.font = (size || 12) + 'px "Zen Kaku Gothic New", sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }
  var JA = function () { return document.documentElement.getAttribute('data-lang') === 'ja'; };

  // Canvas text must follow the EN/JA toggle.
  var onLangChange = [];
  new MutationObserver(function () {
    onLangChange.forEach(function (fn) { fn(); });
  }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-lang']});

  // ================================================================
  //  00 — Strobe wheel (wagon-wheel aliasing)
  // ================================================================
  (function () {
    var o = setup('c4-strobe'); if (!o) return;
    var SPOKES = 8, PERIOD = 360/SPOKES;          // pattern repeats every 45°
    var state = {deg: 42, theta: 0, run: true};

    function apparent(deg) {
      // fold into (−PERIOD/2, PERIOD/2]
      var d = ((deg % PERIOD) + PERIOD) % PERIOD;
      if (d > PERIOD/2) d -= PERIOD;
      return d;
    }

    function draw() {
      clear(o);
      var ctx = o.x;
      var cx = o.w*0.5, cy = o.h*0.52, R = min(o.w, o.h)*0.36;

      // rim
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2*PI); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, 2*PI); ctx.stroke();

      // spokes
      for (var s = 0; s < SPOKES; s++) {
        var ang = (state.theta + s*PERIOD)*PI/180;
        var x1 = cx + R*cos(ang), y1 = cy - R*sin(ang);
        ctx.strokeStyle = s === 0 ? ACCENT : 'rgba(255,255,255,0.75)';
        ctx.lineWidth = s === 0 ? 4 : 3;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.stroke();
        if (s === 0) {
          ctx.fillStyle = ACCENT;
          ctx.beginPath(); ctx.arc(x1, y1, 7, 0, 2*PI); ctx.fill();
        }
      }
      ctx.fillStyle = '#e7e5e4';
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 2*PI); ctx.fill();

      label(ctx, JA() ? 'カメラの1コマごとに描画' : 'drawn once per camera frame', cx, o.h - 14, INKDIM, 11.5);
      label(ctx, JA() ? '赤い先端＝真実 / 模様＝見かけ' : 'red tip = truth / pattern = appearance', cx, 16, INKDIM, 11.5);
    }

    function readouts() {
      var ap = apparent(state.deg);
      var elT = document.getElementById('st4-true'), elA = document.getElementById('st4-app');
      if (elT) elT.textContent = state.deg.toFixed(1) + '°';
      if (elA) elA.textContent = (ap >= 0 ? '+' : '') + ap.toFixed(1) + '°' +
        (abs(ap) < 0.26 ? (JA() ? '（静止！）' : ' (frozen!)') : (ap < 0 ? (JA() ? '（逆走）' : ' (backwards)') : ''));
    }

    // strobe: advance once per STROBE_MS, like a movie camera
    var STROBE_MS = 220, last = 0;
    function tick(ts) {
      if (state.run && ts - last >= STROBE_MS) {
        state.theta = (state.theta + state.deg) % 360;
        last = ts;
        draw();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    var sR = document.getElementById('s4-rot'), vR = document.getElementById('v4-rot');
    sR.addEventListener('input', function () {
      state.deg = +sR.value;
      vR.textContent = state.deg.toFixed(1) + '°';
      readouts();
    });
    var bP = document.getElementById('b4-play');
    bP.addEventListener('click', function () {
      state.run = !state.run;
      bP.classList.toggle('active', state.run);
    });

    draw(); readouts();
    onLangChange.push(function () { draw(); readouts(); });
    window.addEventListener('resize', function () { o = setup('c4-strobe'); draw(); });
  })();

  // ================================================================
  //  01 — 1D aliasing on a chain of atoms
  // ================================================================
  (function () {
    var o = setup('c4-alias'); if (!o) return;
    var k = 2.2;             // in units of 1/a, a = 1
    var XMAX = 10;           // atoms at x = 0..10

    function draw() {
      clear(o);
      var ctx = o.x;
      var padL = 30, padR = 18, padT = 34, padB = 56;
      var W = o.w - padL - padR, H = o.h - padT - padB;
      var y0 = padT + H/2, amp = H/2*0.85;
      function X(x) { return padL + x/XMAX*W; }
      function Y(v) { return y0 - v*amp; }

      // axis
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y0); ctx.lineTo(padL + W, y0); ctx.stroke();

      var k2 = k - 2*PI;
      // alias curve (dashed, blue)
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
      ctx.beginPath();
      for (var i = 0; i <= 500; i++) {
        var x = XMAX*i/500;
        var p = [X(x), Y(cos(k2*x))];
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke(); ctx.setLineDash([]);
      // main curve (accent, solid)
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (i = 0; i <= 500; i++) {
        x = XMAX*i/500;
        p = [X(x), Y(cos(k*x))];
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();

      // atoms: ticks on axis + sample dots on the curves
      for (var n = 0; n <= XMAX; n++) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(n), padT + H + 6); ctx.lineTo(X(n), padT + H + 14); ctx.stroke();
        ctx.fillStyle = '#e7e5e4';
        ctx.beginPath(); ctx.arc(X(n), Y(cos(k*n)), 5, 0, 2*PI); ctx.fill();
        ctx.strokeStyle = BG; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(X(n), Y(cos(k*n)), 5, 0, 2*PI); ctx.stroke();
      }
      label(ctx, JA() ? '原子の位置（間隔 a）' : 'atom positions (spacing a)', padL + W/2, o.h - 12, INKDIM, 11.5);

      // legend + readout
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(padL + 4, 16); ctx.lineTo(padL + 30, 16); ctx.stroke();
      label(ctx, 'cos(kx),  k = ' + k.toFixed(2) + '/a', padL + 38, 16, '#e7e5e4', 12, 'left');
      ctx.strokeStyle = '#60a5fa'; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.moveTo(padL + 4, 34); ctx.lineTo(padL + 30, 34); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, 'cos((k−2π/a)x) = cos(' + k2.toFixed(2) + 'x/a)', padL + 38, 34, '#9ec4f8', 12, 'left');

      var inside = (k > -PI && k <= PI);
      label(ctx,
        JA() ? ('ブリルアンゾーン内の代表者: ' + (inside ? 'k 自身' : 'k − 2π/a（破線のほう）'))
             : ('representative inside the BZ: ' + (inside ? 'k itself' : 'k − 2π/a (the dashed one)')),
        padL + W - 4, 16, inside ? INKDIM : '#fbbf24', 12, 'right');
    }

    var sK = document.getElementById('s4-k'), vK = document.getElementById('v4-k');
    sK.addEventListener('input', function () { k = +sK.value; vK.textContent = k.toFixed(2); draw(); });
    draw();
    onLangChange.push(draw);
    window.addEventListener('resize', function () { o = setup('c4-alias'); draw(); });
  })();

  // ================================================================
  //  02 — Lattice + basis builder
  // ================================================================
  (function () {
    var o = setup('c4-builder'); if (!o) return;
    var state = {len: 1, ang: 60, basis: 1};

    function a2vec() {
      return [state.len*cos(state.ang*PI/180), state.len*sin(state.ang*PI/180)];
    }
    function latticeName() {
      var L = abs(state.len - 1) < 0.03, A90 = abs(state.ang - 90) < 2;
      var A60 = abs(state.ang - 60) < 2 || abs(state.ang - 120) < 2;
      if (L && A90) return JA() ? '正方格子' : 'square lattice';
      if (L && A60) return JA() ? '三角格子' : 'triangular lattice';
      if (A90) return JA() ? '長方格子' : 'rectangular lattice';
      if (L) return JA() ? '菱形（面心長方）格子' : 'rhombic (centered rect.) lattice';
      return JA() ? '斜方格子' : 'oblique lattice';
    }

    function draw() {
      clear(o);
      var ctx = o.x;
      var s = min(o.w, o.h)*0.21, cx = o.w/2, cy = o.h/2;
      var a1 = [1, 0], a2 = a2vec();
      function tx(p) { return cx + p[0]*s; }
      function ty(p) { return cy - p[1]*s; }

      var bas = state.basis === 2 ? [[0, 0], [(a1[0] + a2[0])/3, (a1[1] + a2[1])/3]] : [[0, 0]];
      var R = 6;
      // bonds for the 2-atom (honeycomb-like) basis: connect each B to 3 nearest A
      if (state.basis === 2) {
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.2;
        for (var n = -R; n <= R; n++) for (var m = -R; m <= R; m++) {
          var Bx = n*a1[0] + m*a2[0] + bas[1][0], By = n*a1[1] + m*a2[1] + bas[1][1];
          [[0,0],[1,0],[0,1]].forEach(function (d) {
            var Ax = (n + d[0])*a1[0] + (m + d[1])*a2[0], Ay = (n + d[0])*a1[1] + (m + d[1])*a2[1];
            ctx.beginPath(); ctx.moveTo(tx([Bx,By]), ty([Bx,By])); ctx.lineTo(tx([Ax,Ay]), ty([Ax,Ay])); ctx.stroke();
          });
        }
      }
      // atoms
      for (n = -R; n <= R; n++) for (m = -R; m <= R; m++) {
        for (var bi = 0; bi < bas.length; bi++) {
          var px = n*a1[0] + m*a2[0] + bas[bi][0], py = n*a1[1] + m*a2[1] + bas[bi][1];
          var sx = tx([px, py]), sy = ty([px, py]);
          if (sx < -10 || sx > o.w + 10 || sy < -10 || sy > o.h + 10) continue;
          ctx.fillStyle = bi === 0 ? '#ef4444' : '#3b82f6';
          ctx.beginPath(); ctx.arc(sx, sy, 4.6, 0, 2*PI); ctx.fill();
        }
      }
      // unit cell
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(tx([0,0]), ty([0,0]));
      ctx.lineTo(tx(a1), ty(a1));
      ctx.lineTo(tx([a1[0]+a2[0], a1[1]+a2[1]]), ty([a1[0]+a2[0], a1[1]+a2[1]]));
      ctx.lineTo(tx(a2), ty(a2));
      ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]);
      // lattice vectors
      arrow(ctx, tx([0,0]), ty([0,0]), tx(a1), ty(a1), '#fbbf24', 2.6, 8);
      arrow(ctx, tx([0,0]), ty([0,0]), tx(a2), ty(a2), '#34d399', 2.6, 8);
      label(ctx, 'a₁', tx([a1[0]*0.55, a1[1]*0.55]), ty([a1[0]*0.55, a1[1]*0.55]) + 14, '#fbbf24', 13);
      label(ctx, 'a₂', tx([a2[0]*0.55, a2[1]*0.55]) - 14, ty([a2[0]*0.55, a2[1]*0.55]), '#34d399', 13);

      // type readout
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(8, 8, 230, 26);
      label(ctx, (JA() ? 'いまの格子: ' : 'current lattice: ') + latticeName(), 16, 21, '#e7e5e4', 12.5, 'left');
      if (state.basis === 2) label(ctx, JA() ? '基底2原子 → ハニカム模様' : '2-atom basis → honeycomb pattern', 16, 44, '#9ec4f8', 11.5, 'left');
    }

    var sL = document.getElementById('s4-len'), vL = document.getElementById('v4-len');
    var sA = document.getElementById('s4-ang'), vA = document.getElementById('v4-ang');
    var sB = document.getElementById('s4-basis'), vB = document.getElementById('v4-basis');
    function syncOutputs() {
      vL.textContent = state.len.toFixed(2);
      vA.textContent = state.ang.toFixed(0) + '°';
      vB.textContent = state.basis;
      sL.value = state.len; sA.value = state.ang; sB.value = state.basis;
    }
    sL.addEventListener('input', function () { state.len = +sL.value; syncOutputs(); draw(); });
    sA.addEventListener('input', function () { state.ang = +sA.value; syncOutputs(); draw(); });
    sB.addEventListener('input', function () { state.basis = +sB.value; syncOutputs(); draw(); });

    var presets = {
      'b4-sq': {len: 1, ang: 90, basis: 1},
      'b4-rc': {len: 1.45, ang: 90, basis: 1},
      'b4-tr': {len: 1, ang: 60, basis: 1},
      'b4-gr': {len: 1, ang: 60, basis: 2}
    };
    Object.keys(presets).forEach(function (id) {
      var b = document.getElementById(id);
      if (!b) return;
      b.addEventListener('click', function () {
        state.len = presets[id].len; state.ang = presets[id].ang; state.basis = presets[id].basis;
        Object.keys(presets).forEach(function (j) { document.getElementById(j).classList.toggle('active', j === id); });
        syncOutputs(); draw();
      });
    });

    syncOutputs(); draw();
    onLangChange.push(draw);
    window.addEventListener('resize', function () { o = setup('c4-builder'); draw(); });
  })();

  // ================================================================
  //  03 — Invisible shifts: k vs k + G on a triangular lattice
  // ================================================================
  (function () {
    var o = setup('c4-invis'); if (!o) return;
    var a1 = [1, 0], a2 = [0.5, sqrt3/2];
    // reciprocal vectors: b_i · a_j = 2π δ_ij
    var b1 = [2*PI, -2*PI/sqrt3], b2 = [0, 4*PI/sqrt3];
    var k0 = [1.6, 1.1];
    var k = k0.slice();

    function waveColor(v) {
      // v in [-1,1] → blue..red through dark
      var r = round(127 + 110*v), b = round(127 - 110*v);
      return 'rgb(' + r + ',' + round(80 - 30*abs(v)) + ',' + b + ')';
    }

    function draw() {
      clear(o);
      var ctx = o.x;
      var s = min(o.w, o.h)*0.155, cx = o.w/2, cy = o.h/2;
      function tx(p) { return cx + p[0]*s; }
      function ty(p) { return cy - p[1]*s; }

      // continuous wave as faint background stripes (coarse pixels)
      var step = 4;
      for (var px = 0; px < o.w; px += step) for (var py = 0; py < o.h; py += step) {
        var rx = (px - cx)/s, ry = -(py - cy)/s;
        var v = cos(k[0]*rx + k[1]*ry);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.04 + 0.07*(v + 1)/2).toFixed(3) + ')';
        ctx.fillRect(px, py, step, step);
      }

      // lattice points colored by sampled value
      var R = 7;
      for (var n = -R; n <= R; n++) for (var m = -R; m <= R; m++) {
        var X = n*a1[0] + m*a2[0], Y = n*a1[1] + m*a2[1];
        var sx = tx([X, Y]), sy = ty([X, Y]);
        if (sx < -8 || sx > o.w + 8 || sy < -8 || sy > o.h + 8) continue;
        var val = cos(k[0]*X + k[1]*Y);
        ctx.fillStyle = waveColor(val);
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, 2*PI); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, 2*PI); ctx.stroke();
      }

      label(ctx, JA() ? '背景の縞＝連続な波　点の色＝原子が感じる値' : 'stripes = continuous wave   dot color = value felt by atoms',
            o.w/2, o.h - 14, INKDIM, 11.5);

      var el = document.getElementById('st4-k');
      if (el) el.textContent = 'k = (' + k[0].toFixed(2) + ', ' + k[1].toFixed(2) + ')/a';
    }

    function shift(b) { k[0] += b[0]; k[1] += b[1]; draw(); }
    var B1 = document.getElementById('b4-pb1'), B2 = document.getElementById('b4-pb2'), BR = document.getElementById('b4-prst');
    if (B1) B1.addEventListener('click', function () { shift(b1); });
    if (B2) B2.addEventListener('click', function () { shift(b2); });
    if (BR) BR.addEventListener('click', function () { k = k0.slice(); draw(); });

    draw();
    onLangChange.push(draw);
    window.addEventListener('resize', function () { o = setup('c4-invis'); draw(); });
  })();

  // ================================================================
  //  04 — Real lattice ↔ reciprocal lattice + first Brillouin zone
  // ================================================================
  (function () {
    var oR = setup('c4-real'), oK = setup('c4-recip');
    if (!oR || !oK) return;

    var presets = {
      'b4-r-sq': {a1: [1, 0], a2: [0, 1],            name: function () { return JA() ? '正方格子' : 'square'; }},
      'b4-r-rc': {a1: [1, 0], a2: [0, 1.5],          name: function () { return JA() ? '長方格子' : 'rectangular'; }},
      'b4-r-ob': {a1: [1, 0], a2: [0.45, 1.15],      name: function () { return JA() ? '斜方格子' : 'oblique'; }},
      'b4-r-tr': {a1: [1, 0], a2: [0.5, sqrt3/2],    name: function () { return JA() ? '三角格子' : 'triangular'; }}
    };
    var cur = 'b4-r-tr';

    function recip(a1, a2) {
      var cr = a1[0]*a2[1] - a1[1]*a2[0];
      return [[2*PI*a2[1]/cr, -2*PI*a2[0]/cr], [-2*PI*a1[1]/cr, 2*PI*a1[0]/cr]];
    }

    function drawReal() {
      clear(oR);
      var ctx = oR.x, p = presets[cur];
      var s = min(oR.w, oR.h)*0.16, cx = oR.w/2, cy = oR.h/2;
      var R = 7;
      for (var n = -R; n <= R; n++) for (var m = -R; m <= R; m++) {
        var x = cx + (n*p.a1[0] + m*p.a2[0])*s, y = cy - (n*p.a1[1] + m*p.a2[1])*s;
        if (x < -6 || x > oR.w + 6 || y < -6 || y > oR.h + 6) continue;
        ctx.fillStyle = '#e7e5e4';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, 2*PI); ctx.fill();
      }
      arrow(ctx, cx, cy, cx + p.a1[0]*s, cy - p.a1[1]*s, '#fbbf24', 2.4, 8);
      arrow(ctx, cx, cy, cx + p.a2[0]*s, cy - p.a2[1]*s, '#34d399', 2.4, 8);
      label(ctx, 'a₁', cx + p.a1[0]*s*0.6, cy - p.a1[1]*s*0.6 + 14, '#fbbf24', 12.5);
      label(ctx, 'a₂', cx + p.a2[0]*s*0.6 - 14, cy - p.a2[1]*s*0.6, '#34d399', 12.5);
      label(ctx, (JA() ? '実空間: ' : 'real space: ') + p.name(), oR.w/2, 16, '#e7e5e4', 12.5);
    }

    // clip a polygon against the half-plane n·k ≤ d (Sutherland–Hodgman)
    function clipHalf(poly, nx, ny, d) {
      var out = [];
      for (var i = 0; i < poly.length; i++) {
        var A = poly[i], B = poly[(i + 1) % poly.length];
        var da = nx*A[0] + ny*A[1] - d, db = nx*B[0] + ny*B[1] - d;
        if (da <= 0) out.push(A);
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
          var u = da/(da - db);
          out.push([A[0] + (B[0] - A[0])*u, A[1] + (B[1] - A[1])*u]);
        }
      }
      return out;
    }

    function drawRecip() {
      clear(oK);
      var ctx = oK.x, p = presets[cur];
      var bb = recip(p.a1, p.a2), b1 = bb[0], b2 = bb[1];
      // scale so the BZ fits nicely
      var bmax = max(sqrt(b1[0]*b1[0] + b1[1]*b1[1]), sqrt(b2[0]*b2[0] + b2[1]*b2[1]));
      var s = min(oK.w, oK.h)*0.30/(bmax/(2*PI));
      var cx = oK.w/2, cy = oK.h/2;
      function tx(k) { return cx + k[0]/(2*PI)*s; }
      function ty(k) { return cy - k[1]/(2*PI)*s; }

      // first BZ = Wigner–Seitz cell of the reciprocal lattice: start from a
      // big square and clip by the perpendicular bisector of every nearby G.
      var L = 4*bmax;
      var poly = [[-L, -L], [L, -L], [L, L], [-L, L]];
      for (var h = -2; h <= 2; h++) for (var l = -2; l <= 2; l++) {
        if (h === 0 && l === 0) continue;
        var gx = h*b1[0] + l*b2[0], gy = h*b1[1] + l*b2[1];
        var g2 = gx*gx + gy*gy;
        poly = clipHalf(poly, gx, gy, g2/2);
        if (!poly.length) break;
      }
      if (poly.length) {
        ctx.beginPath();
        ctx.moveTo(tx(poly[0]), ty(poly[0]));
        for (var pi = 1; pi < poly.length; pi++) ctx.lineTo(tx(poly[pi]), ty(poly[pi]));
        ctx.closePath();
        ctx.fillStyle = 'rgba(224,99,90,0.22)'; ctx.fill();
        ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.8; ctx.stroke();
      }

      // reciprocal lattice points
      for (h = -3; h <= 3; h++) for (l = -3; l <= 3; l++) {
        var gx = h*b1[0] + l*b2[0], gy = h*b1[1] + l*b2[1];
        var sx = tx([gx, gy]), sy = ty([gx, gy]);
        if (sx < -6 || sx > oK.w + 6 || sy < -6 || sy > oK.h + 6) continue;
        ctx.fillStyle = (h === 0 && l === 0) ? '#fff' : '#9ec4f8';
        ctx.beginPath(); ctx.arc(sx, sy, h === 0 && l === 0 ? 4.5 : 3.5, 0, 2*PI); ctx.fill();
      }
      arrow(ctx, tx([0,0]), ty([0,0]), tx(b1), ty(b1), '#fbbf24', 2, 7);
      arrow(ctx, tx([0,0]), ty([0,0]), tx(b2), ty(b2), '#34d399', 2, 7);
      label(ctx, 'b₁', tx([b1[0]*0.6, b1[1]*0.6]), ty([b1[0]*0.6, b1[1]*0.6]) + 13, '#fbbf24', 12.5);
      label(ctx, 'b₂', tx([b2[0]*0.6, b2[1]*0.6]) - 13, ty([b2[0]*0.6, b2[1]*0.6]), '#34d399', 12.5);

      // Γ, and for the triangular lattice also M and K
      label(ctx, 'Γ', tx([0,0]) - 11, ty([0,0]) - 10, '#fff', 13);
      if (cur === 'b4-r-tr') {
        var K = [4*PI/3, 0], M = [PI, PI/sqrt3];
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(tx(K), ty(K), 3, 0, 2*PI); ctx.fill();
        label(ctx, 'K', tx(K) + 11, ty(K) - 8, '#fff', 13);
        label(ctx, 'M', tx(M) + 11, ty(M) - 8, '#e7e5e4', 12);
        label(ctx, JA() ? '六角形！ — グラフェンの舞台' : 'a hexagon! — graphene’s stage', oK.w/2, oK.h - 14, '#fbbf24', 12);
      } else {
        label(ctx, JA() ? '塗りつぶし＝第一ブリルアンゾーン' : 'shaded = first Brillouin zone', oK.w/2, oK.h - 14, INKDIM, 11.5);
      }
      label(ctx, (JA() ? '逆格子空間（k空間）' : 'reciprocal (k) space'), oK.w/2, 16, '#e7e5e4', 12.5);
    }

    function redraw() { drawReal(); drawRecip(); }
    Object.keys(presets).forEach(function (id) {
      var b = document.getElementById(id);
      if (!b) return;
      b.addEventListener('click', function () {
        cur = id;
        Object.keys(presets).forEach(function (j) { document.getElementById(j).classList.toggle('active', j === id); });
        redraw();
      });
    });

    redraw();
    onLangChange.push(redraw);
    window.addEventListener('resize', function () { oR = setup('c4-real'); oK = setup('c4-recip'); redraw(); });
  })();

  // ================================================================
  //  05 — Nature's FFT: lattice image → spectrum → Bragg / manual filtering
  // ================================================================
  (function () {
    var oI = setup('c5-real'), oF = setup('c5-k');
    if (!oI || !oF) return;
    var N = 128;
    var APX = 10.5;            // lattice constant of the test image, in pixels
    var state = {
      basis2: false, noise: 0,
      mode: 'orig',            // 'orig' | 'spots' | 'manual'
      pen: true, brush: 4,     // manual tool: pen/eraser, radius in image px
      zoom: 1, vcx: N/2, vcy: N/2   // k-panel view: zoom + view centre (image coords)
    };
    var manKeep = new Uint8Array(N*N);   // manual mask, shifted (display) coords
    var selSpots = {};                   // selected Bragg spots, key 'h,l'
    var cursor = {x: 0, y: 0, inside: false};

    // ---- Bragg spot catalogue: positions of G = h b1 + l b2 in display px ----
    // reciprocal vectors of the image lattice, in FFT bins (y runs downward)
    var DET = APX*APX*sqrt3/2;
    var G1 = [N*(APX*sqrt3/2)/DET, N*(-APX/2)/DET];
    var G2 = [0, N*APX/DET];
    var SPOTS = (function () {
      var list = [];
      for (var h = -3; h <= 3; h++) for (var l = -3; l <= 3; l++) {
        if (h === 0 && l === 0) continue;
        var x = N/2 + h*G1[0] + l*G2[0], y = N/2 + h*G1[1] + l*G2[1];
        if (x < 4 || x > N - 4 || y < 4 || y > N - 4) continue;
        list.push({h: h, l: l, x: x, y: y, key: h + ',' + l});
      }
      return list;
    })();
    var SPOT_R = 2.2;          // ring radius drawn around a spot, image px
    var SPOT_MR = 3;           // mask radius around a selected spot, image px
    function spotLabel(sp) {
      var mi = '\u2212';      // minus sign
      return (sp.h < 0 ? mi + (-sp.h) : '' + sp.h) + ',' + (sp.l < 0 ? mi + (-sp.l) : '' + sp.l);
    }

    // deterministic pseudo-randoms so the sliders replay identically
    function rnd(x) { var s = sin(x)*43758.5453123; return s - Math.floor(s); }
    function gauss(i) {
      var u = rnd(i*0.6180339887 + 11.31) + 1e-7, v = rnd(i*2.3344556 + 5.97);
      return sqrt(-2*Math.log(u))*cos(2*PI*v);
    }

    // in-place radix-2 FFT on (re, im)
    function fft1(re, im, inv) {
      var n = re.length, i, j, bit, t;
      for (i = 1, j = 0; i < n; i++) {
        bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
          t = re[i]; re[i] = re[j]; re[j] = t;
          t = im[i]; im[i] = im[j]; im[j] = t;
        }
      }
      for (var len = 2; len <= n; len <<= 1) {
        var ang = (inv ? 1 : -1)*2*PI/len;
        var wr = cos(ang), wi = sin(ang);
        for (i = 0; i < n; i += len) {
          var cr = 1, ci = 0;
          for (var k2 = 0; k2 < len/2; k2++) {
            var i1 = i + k2, i2 = i + k2 + len/2;
            var vr = re[i2]*cr - im[i2]*ci;
            var vi = re[i2]*ci + im[i2]*cr;
            re[i2] = re[i1] - vr; im[i2] = im[i1] - vi;
            re[i1] += vr; im[i1] += vi;
            var ncr = cr*wr - ci*wi; ci = cr*wi + ci*wr; cr = ncr;
          }
        }
      }
      if (inv) for (i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
    }
    function fft2(re, im, inv) {
      var tr = new Float64Array(N), ti = new Float64Array(N), x, y;
      for (y = 0; y < N; y++) fft1(re.subarray(y*N, y*N + N), im.subarray(y*N, y*N + N), inv);
      for (x = 0; x < N; x++) {
        for (y = 0; y < N; y++) { tr[y] = re[y*N + x]; ti[y] = im[y*N + x]; }
        fft1(tr, ti, inv);
        for (y = 0; y < N; y++) { re[y*N + x] = tr[y]; im[y*N + x] = ti[y]; }
      }
    }

    // two-octave correlated random field — the mottled background of an
    // amorphous support film in a TEM image
    function mottleField() {
      function octave(cell, seed) {
        var g = Math.floor(N/cell) + 2, grid = new Float64Array(g*g);
        for (var i = 0; i < g*g; i++) grid[i] = rnd(i*7.137 + seed)*2 - 1;
        return function (x, y) {
          var fx = x/cell, fy = y/cell;
          var x0 = Math.floor(fx), y0 = Math.floor(fy);
          var tx = fx - x0, ty = fy - y0;
          var a = grid[y0*g + x0], b = grid[y0*g + x0 + 1];
          var c = grid[(y0 + 1)*g + x0], d = grid[(y0 + 1)*g + x0 + 1];
          return (a*(1 - tx) + b*tx)*(1 - ty) + (c*(1 - tx) + d*tx)*ty;
        };
      }
      var o1 = octave(9, 3.7), o2 = octave(4, 19.3);
      var f = new Float64Array(N*N);
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        f[y*N + x] = 0.7*o1(x, y) + 0.45*o2(x, y);
      }
      return f;
    }
    var MOTTLE = mottleField();

    function buildImage() {
      var img = new Float64Array(N*N);
      var a1 = [APX, 0], a2 = [APX*0.5, APX*sqrt3/2];
      var bas = state.basis2 ? [[0, 0], [(a1[0] + a2[0])/3, (a1[1] + a2[1])/3]] : [[0, 0]];
      var R = 16, sig = 1.35, rad = 4;
      for (var n = -R; n <= R; n++) for (var m = -R; m <= R; m++) {
        for (var bi = 0; bi < bas.length; bi++) {
          var x = n*a1[0] + m*a2[0] + bas[bi][0] + N/2;
          var y = n*a1[1] + m*a2[1] + bas[bi][1] + N/2;
          if (x < -rad || x > N + rad || y < -rad || y > N + rad) continue;
          var x0 = max(0, Math.floor(x - rad)), x1 = min(N - 1, Math.ceil(x + rad));
          var y0 = max(0, Math.floor(y - rad)), y1 = min(N - 1, Math.ceil(y + rad));
          for (var py = y0; py <= y1; py++) for (var px = x0; px <= x1; px++) {
            var d2 = (px - x)*(px - x) + (py - y)*(py - y);
            img[py*N + px] += Math.exp(-d2/(2*sig*sig));
          }
        }
      }
      if (state.noise > 0) {
        for (var i = 0; i < N*N; i++) {
          // mottled amorphous background + signal-dependent shot grain
          img[i] += state.noise*(0.55*MOTTLE[i] + 0.5*sqrt(max(img[i], 0) + 0.12)*gauss(i));
        }
      }
      // Hann window: suppresses the artificial edges of the finite image
      for (var yk = 0; yk < N; yk++) {
        var wy = 0.5 - 0.5*cos(2*PI*yk/(N - 1));
        for (var xk = 0; xk < N; xk++) {
          img[yk*N + xk] *= wy*(0.5 - 0.5*cos(2*PI*xk/(N - 1)));
        }
      }
      return img;
    }

    // shifted (display) index <-> unshifted index — the same map both ways
    function shIdx(i) {
      var x = i % N, y = (i - x)/N;
      return ((y + N/2) % N)*N + ((x + N/2) % N);
    }
    // shifted-coords index of the −k partner (keeps the inverse FFT real)
    function conjIdx(i) {
      var x = i % N, y = (i - x)/N;
      var ux = (N - ((x + N/2) % N)) % N, uy = (N - ((y + N/2) % N)) % N;
      return ((uy + N/2) % N)*N + ((ux + N/2) % N);
    }

    function makeOff(data, lo, hi, kind, dimMask) {
      var off = document.createElement('canvas');
      off.width = N; off.height = N;
      var octx = off.getContext('2d');
      var id = octx.createImageData(N, N);
      for (var i = 0; i < N*N; i++) {
        var v = (data[i] - lo)/(hi - lo);
        v = v < 0 ? 0 : (v > 1 ? 1 : v);
        if (dimMask && dimMask[i]) v *= 0.18;
        var r, g, b;
        if (kind === 'real') { r = v*255; g = v*240; b = v*208; }
        else { r = min(255, v*440); g = max(0, v*330 - 60); b = max(0, v*560 - 320); }
        id.data[4*i] = r; id.data[4*i + 1] = g; id.data[4*i + 2] = b; id.data[4*i + 3] = 255;
      }
      octx.putImageData(id, 0, 0);
      return off;
    }

    // disk stamp into a shifted-coords keep mask
    function stampDisk(keep, cx0, cy0, R) {
      var xi = Math.round(cx0), yi = Math.round(cy0);
      for (var dy = -R; dy <= R; dy++) for (var dx = -R; dx <= R; dx++) {
        if (dx*dx + dy*dy > R*R) continue;
        var x = xi + dx, y = yi + dy;
        if (x < 0 || x >= N || y < 0 || y >= N) continue;
        keep[y*N + x] = 1;
      }
    }

    function compute() {
      var img = buildImage();
      var re = Float64Array.from(img), im = new Float64Array(N*N);
      fft2(re, im, false);
      var mag = new Float64Array(N*N), maxm = 0, i;
      for (i = 0; i < N*N; i++) {
        mag[i] = sqrt(re[i]*re[i] + im[i]*im[i]);
        if (i !== 0 && mag[i] > maxm) maxm = mag[i];   // exclude DC from the scale
      }
      // keep-mask in shifted (display) coords; DC is always kept
      var keep = null;
      if (state.mode === 'spots') {
        keep = new Uint8Array(N*N);
        SPOTS.forEach(function (sp) {
          if (selSpots[sp.key]) stampDisk(keep, sp.x, sp.y, SPOT_MR);
        });
        keep[shIdx(0)] = 1;
      } else if (state.mode === 'manual') {
        keep = Uint8Array.from(manKeep);
        keep[shIdx(0)] = 1;
      }
      var recon = null;
      if (keep) {
        var fr = Float64Array.from(re), fi = Float64Array.from(im);
        for (i = 1; i < N*N; i++) if (!keep[shIdx(i)]) { fr[i] = 0; fi[i] = 0; }
        fft2(fr, fi, true);
        recon = fr;
      }
      return {img: img, mag: mag, maxm: maxm, keep: keep, recon: recon};
    }

    function shifted(arr) {
      var out = new Float64Array(N*N);
      for (var i = 0; i < N*N; i++) out[shIdx(i)] = arr[i];
      return out;
    }

    // ---- cached offscreens; cursor moves only re-blit the k panel ----
    var realOff = null, specOff = null;

    function panel(o) {
      var side = min(o.w, o.h) - 44;
      return {dx: (o.w - side)/2, dy: (o.h - side)/2 + 8, side: side};
    }
    function viewRect() {
      var vw = N/state.zoom;
      state.vcx = max(vw/2, min(N - vw/2, state.vcx));
      state.vcy = max(vw/2, min(N - vw/2, state.vcy));
      return {vx: state.vcx - vw/2, vy: state.vcy - vw/2, vw: vw};
    }
    function toCanvas(g, v, ix, iy) {
      return [g.dx + (ix - v.vx)/v.vw*g.side, g.dy + (iy - v.vy)/v.vw*g.side];
    }

    function renderReal() {
      var ctx = oI.x;
      clear(oI);
      var g = panel(oI);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(realOff, g.dx, g.dy, g.side, g.side);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.strokeRect(g.dx, g.dy, g.side, g.side);
      label(ctx, state.mode === 'orig'
        ? (JA() ? '実空間 — 格子の「写真」' : 'real space — a “photograph” of the lattice')
        : (state.mode === 'spots'
          ? (JA() ? '選択したBragg点のみで再構成' : 'rebuilt from the selected Bragg spots')
          : (JA() ? 'マスクした領域のみで再構成' : 'rebuilt from the painted mask only')),
        oI.w/2, 16, '#e7e5e4', 12.5);
    }

    function renderK() {
      var ctx = oF.x;
      clear(oF);
      var g = panel(oF), v = viewRect();
      ctx.imageSmoothingEnabled = state.zoom < 1.5;
      ctx.drawImage(specOff, v.vx, v.vy, v.vw, v.vw, g.dx, g.dy, g.side, g.side);
      ctx.imageSmoothingEnabled = true;

      // Bragg spot rings + index labels
      ctx.save();
      ctx.beginPath(); ctx.rect(g.dx, g.dy, g.side, g.side); ctx.clip();
      var sc = g.side/v.vw;
      SPOTS.forEach(function (sp) {
        // +0.5: an FFT bin at index i is displayed as a pixel centred at i+0.5
        var pcv = toCanvas(g, v, sp.x + 0.5, sp.y + 0.5);
        if (pcv[0] < g.dx - 20 || pcv[0] > g.dx + g.side + 20 || pcv[1] < g.dy - 20 || pcv[1] > g.dy + g.side + 20) return;
        if (state.mode === 'spots') {
          var on = !!selSpots[sp.key];
          ctx.strokeStyle = on ? '#6ee7b7' : 'rgba(255,255,255,0.45)';
          ctx.lineWidth = on ? 2.2 : 1.1;
          ctx.beginPath(); ctx.arc(pcv[0], pcv[1], SPOT_R*sc, 0, 2*PI); ctx.stroke();
        }
        // labels: only the first-order spots at low zoom, everything when zoomed in
        if (state.zoom >= 1.8 || (abs(sp.h) <= 1 && abs(sp.l) <= 1)) {
          label(ctx, spotLabel(sp), pcv[0] + SPOT_R*sc*0.8 + 3, pcv[1] - SPOT_R*sc*0.8 - 3,
                state.mode === 'spots' && selSpots[sp.key] ? '#6ee7b7' : 'rgba(255,255,255,0.6)',
                state.zoom > 2 ? 12 : 9.5, 'left');
        }
      });
      // Γ at the centre
      var pc0 = toCanvas(g, v, N/2 + 0.5, N/2 + 0.5);
      label(ctx, 'Γ (0,0)', pc0[0] + 6, pc0[1] - 8, 'rgba(255,255,255,0.6)', state.zoom > 2 ? 12 : 9.5, 'left');
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.strokeRect(g.dx, g.dy, g.side, g.side);
      label(ctx, JA() ? 'k空間 — |FFT|（対数表示）＝回折写真' : 'k space — |FFT| (log scale) = the diffraction photo',
        oF.w/2, 16, '#e7e5e4', 12.5);
      if (state.zoom > 1.01) {
        label(ctx, '×' + state.zoom.toFixed(1), g.dx + g.side - 6, g.dy + 12, '#fbbf24', 12, 'right');
      }
      label(ctx, state.mode === 'spots'
        ? (JA() ? 'Bragg点をクリックで選択／解除（複数可・−k の相方は自動）' : 'click Bragg spots to select/deselect (multiple; −k partner included)')
        : (state.mode === 'manual'
          ? (JA() ? (state.pen ? 'ペン：残す領域を塗る（−k の相方は自動）' : '消しゴム：マスクを削る（−k の相方も同時に）')
                  : (state.pen ? 'pen: paint the regions to keep (−k partner added for you)' : 'eraser: remove mask (the −k partner too)'))
          : (JA() ? '輝点の並び＝逆格子（ホイールで拡大縮小）' : 'spot arrangement = the reciprocal lattice (wheel to zoom)')),
        oF.w/2, oF.h - 12, state.mode !== 'orig' ? '#fbbf24' : INKDIM, 11.5);
      // brush-size cursor preview (manual mode only)
      if (state.mode === 'manual' && cursor.inside) {
        var rPix = state.brush*sc;
        ctx.strokeStyle = state.pen ? 'rgba(110,231,183,0.95)' : 'rgba(253,164,175,0.95)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cursor.x, cursor.y, rPix, 0, 2*PI); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cursor.x, cursor.y, rPix + 1.4, 0, 2*PI); ctx.stroke();
      }
    }

    function recompute() {
      var r = compute();
      var src = r.recon || r.img;
      var lo = 0, hi = 0;
      for (var i = 0; i < N*N; i++) { if (src[i] > hi) hi = src[i]; if (src[i] < lo) lo = src[i]; }
      if (hi <= lo) hi = lo + 1;
      realOff = makeOff(src, lo, hi, 'real', null);

      var disp = new Float64Array(N*N), lmax = Math.log(1 + r.maxm);
      for (i = 0; i < N*N; i++) disp[i] = Math.log(1 + r.mag[i])/lmax;
      var dim = null;
      if (r.keep) {
        dim = new Uint8Array(N*N);
        for (i = 0; i < N*N; i++) dim[i] = r.keep[i] ? 0 : 1;
      }
      specOff = makeOff(shifted(disp), 0, 1, 'k', dim);
      renderReal(); renderK();
    }

    // coalesce expensive recomputes while painting
    var rafPending = false;
    function scheduleRecompute() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function () { rafPending = false; recompute(); });
    }

    // ---- pointer handling on the k panel: select, paint, cursor, zoom ----
    function imgCoords(ev) {
      var rect = oF.c.getBoundingClientRect();
      var g = panel(oF), v = viewRect();
      var cxp = ev.clientX - rect.left, cyp = ev.clientY - rect.top;
      return {
        cx: cxp, cy: cyp,
        ix: v.vx + (cxp - g.dx)/g.side*v.vw,
        iy: v.vy + (cyp - g.dy)/g.side*v.vw,
        inPanel: cxp >= g.dx && cxp <= g.dx + g.side && cyp >= g.dy && cyp <= g.dy + g.side
      };
    }
    function paintAt(pt) {
      if (!pt.inPanel) return;
      var R = state.brush, val = state.pen ? 1 : 0;
      var cx0 = Math.round(pt.ix), cy0 = Math.round(pt.iy);
      for (var dy = -R; dy <= R; dy++) for (var dx = -R; dx <= R; dx++) {
        if (dx*dx + dy*dy > R*R) continue;
        var x = cx0 + dx, y = cy0 + dy;
        if (x < 0 || x >= N || y < 0 || y >= N) continue;
        var i = y*N + x;
        manKeep[i] = val; manKeep[conjIdx(i)] = val;
      }
      scheduleRecompute();
    }
    function toggleSpotAt(pt) {
      if (!pt.inPanel) return;
      var best = null, bestD = 36;   // threshold: 6 image px, squared
      SPOTS.forEach(function (sp) {
        var d = (sp.x + 0.5 - pt.ix)*(sp.x + 0.5 - pt.ix) + (sp.y + 0.5 - pt.iy)*(sp.y + 0.5 - pt.iy);
        if (d < bestD) { bestD = d; best = sp; }
      });
      if (!best) return;
      var k1 = best.key, k2 = (-best.h) + ',' + (-best.l);
      var on = !selSpots[k1];
      if (on) { selSpots[k1] = true; selSpots[k2] = true; }
      else { delete selSpots[k1]; delete selSpots[k2]; }
      recompute();
    }
    var painting = false;
    oF.c.addEventListener('pointerdown', function (e) {
      if (state.mode === 'manual') {
        painting = true; oF.c.setPointerCapture(e.pointerId);
        paintAt(imgCoords(e));
      } else if (state.mode === 'spots') {
        toggleSpotAt(imgCoords(e));
      }
    });
    oF.c.addEventListener('pointermove', function (e) {
      var pt = imgCoords(e);
      cursor.x = pt.cx; cursor.y = pt.cy; cursor.inside = pt.inPanel;
      if (painting) paintAt(pt);
      else if (state.mode === 'manual') renderK();   // cheap re-blit for the cursor circle
    });
    oF.c.addEventListener('pointerup', function () { painting = false; });
    oF.c.addEventListener('pointerleave', function () {
      cursor.inside = false;
      if (state.mode === 'manual') renderK();
    });
    oF.c.style.touchAction = 'none';

    // wheel zoom, anchored at the cursor
    oF.c.addEventListener('wheel', function (e) {
      e.preventDefault();
      var pt = imgCoords(e);
      if (!pt.inPanel) return;
      var z0 = state.zoom;
      state.zoom = max(1, min(6, z0*(e.deltaY < 0 ? 1.25 : 0.8)));
      if (state.zoom !== z0) {
        // keep the image point under the cursor fixed
        var g = panel(oF), f = (pt.cx - g.dx)/g.side - 0.5, f2 = (pt.cy - g.dy)/g.side - 0.5;
        state.vcx = pt.ix - f*(N/state.zoom);
        state.vcy = pt.iy - f2*(N/state.zoom);
      }
      renderK();
    }, {passive: false});

    function setZoom(z) {
      state.zoom = max(1, min(6, z));
      if (state.zoom === 1) { state.vcx = N/2; state.vcy = N/2; }
      renderK();
    }

    // ---- controls ----
    var sN2 = document.getElementById('s5-noise'), vN2 = document.getElementById('v5-noise');
    sN2.addEventListener('input', function () { state.noise = +sN2.value; vN2.textContent = state.noise.toFixed(2); recompute(); });
    var sB = document.getElementById('s5-brush'), vB = document.getElementById('v5-brush');
    if (sB) sB.addEventListener('input', function () { state.brush = +sB.value; vB.textContent = state.brush; if (state.mode === 'manual') renderK(); });

    var bT = document.getElementById('b5-tri'), bG = document.getElementById('b5-gra');
    bT.addEventListener('click', function () { state.basis2 = false; bT.classList.add('active'); bG.classList.remove('active'); recompute(); });
    bG.addEventListener('click', function () { state.basis2 = true; bG.classList.add('active'); bT.classList.remove('active'); recompute(); });

    var modeBtns = {orig: document.getElementById('b5-orig'), spots: document.getElementById('b5-filt'), manual: document.getElementById('b5-man')};
    function setMode(m) {
      state.mode = m;
      Object.keys(modeBtns).forEach(function (k2) { modeBtns[k2].classList.toggle('active', k2 === m); });
      oF.c.style.cursor = m === 'manual' ? 'none' : (m === 'spots' ? 'pointer' : 'default');
      recompute();
    }
    modeBtns.orig.addEventListener('click', function () { setMode('orig'); });
    modeBtns.spots.addEventListener('click', function () { setMode('spots'); });
    modeBtns.manual.addEventListener('click', function () { setMode('manual'); });

    var bAll = document.getElementById('b5-all');
    if (bAll) bAll.addEventListener('click', function () {
      SPOTS.forEach(function (sp) { selSpots[sp.key] = true; });
      if (state.mode !== 'spots') setMode('spots'); else recompute();
    });
    var bC = document.getElementById('b5-clr');
    if (bC) bC.addEventListener('click', function () {
      if (state.mode === 'manual') { manKeep = new Uint8Array(N*N); recompute(); }
      else { selSpots = {}; if (state.mode === 'spots') recompute(); }
    });

    var bPen = document.getElementById('b5-pen'), bErs = document.getElementById('b5-ers');
    function setPen(p2) {
      state.pen = p2;
      if (bPen) bPen.classList.toggle('active', p2);
      if (bErs) bErs.classList.toggle('active', !p2);
      if (state.mode === 'manual') renderK();
    }
    if (bPen) bPen.addEventListener('click', function () { setPen(true); });
    if (bErs) bErs.addEventListener('click', function () { setPen(false); });

    var bZi = document.getElementById('b5-zin'), bZo = document.getElementById('b5-zout'), bZr = document.getElementById('b5-zrst');
    if (bZi) bZi.addEventListener('click', function () { setZoom(state.zoom*1.5); });
    if (bZo) bZo.addEventListener('click', function () { setZoom(state.zoom/1.5); });
    if (bZr) bZr.addEventListener('click', function () { setZoom(1); });

    recompute();
    onLangChange.push(recompute);
    window.addEventListener('resize', function () { oI = setup('c5-real'); oF = setup('c5-k'); recompute(); });
  })();
})();
