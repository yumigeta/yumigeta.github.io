/* Electronic Structure of Graphene II — interactive figures.
 * Self-contained; shares only CSS with the rest of the site. */
(function () {
  'use strict';
  var PI = Math.PI, sqrt3 = Math.sqrt(3),
      cos = Math.cos, sin = Math.sin, abs = Math.abs,
      sqrt = Math.sqrt, min = Math.min, max = Math.max;

  var a = 1;          // lattice constant
  var tHop = 2.8;     // eV

  // Nearest-neighbour vectors (units of a)
  var D1 = [0, 1/sqrt3], D2 = [-0.5, -1/(2*sqrt3)], D3 = [0.5, -1/(2*sqrt3)];
  var DELTAS = [D1, D2, D3];

  function fRe(kx, ky) {
    return cos(kx*D1[0] + ky*D1[1]) + cos(kx*D2[0] + ky*D2[1]) + cos(kx*D3[0] + ky*D3[1]);
  }
  function fIm(kx, ky) {
    return sin(kx*D1[0] + ky*D1[1]) + sin(kx*D2[0] + ky*D2[1]) + sin(kx*D3[0] + ky*D3[1]);
  }
  function fAbs(kx, ky) {
    var re = fRe(kx, ky), im = fIm(kx, ky);
    return sqrt(re*re + im*im);
  }

  var BZR = 4*PI/(3*a);            // Γ→K distance
  var APO = BZR*sqrt3/2;           // Γ→M distance
  var HSP = {
    G: {kx: 0,        ky: 0,           label: 'Γ'},
    M: {kx: PI/a,     ky: PI/(a*sqrt3), label: 'M'},
    K: {kx: 4*PI/(3*a), ky: 0,          label: 'K'}
  };
  var PATHSEG = ['#f472b6', '#34d399', '#60a5fa'];   // Γ→M, M→K, K→Γ
  var ACCENT = '#e0635a', INKDIM = 'rgba(255,255,255,0.45)';
  var BG = '#14110b';

  function insideBZ(kx, ky) {
    for (var n = 0; n < 6; n++) {
      var ang = PI/6 + n*PI/3;
      if (cos(ang)*kx + sin(ang)*ky > APO + 1e-9) return false;
    }
    return true;
  }
  function clampToBZ(kx, ky) {
    // pull the point back inside the hexagon along the violated normals
    for (var pass = 0; pass < 4; pass++) {
      var moved = false;
      for (var n = 0; n < 6; n++) {
        var ang = PI/6 + n*PI/3, nx = cos(ang), ny = sin(ang);
        var d = nx*kx + ny*ky;
        if (d > APO) { kx -= (d - APO)*nx; ky -= (d - APO)*ny; moved = true; }
      }
      if (!moved) break;
    }
    return [kx, ky];
  }

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

  // Canvas text must follow the EN/JA toggle: every module registers its
  // redraw here, and a MutationObserver on <html data-lang> replays them.
  var onLangChange = [];
  new MutationObserver(function () {
    onLangChange.forEach(function (fn) { fn(); });
  }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-lang']});

  // ================================================================
  //  00 — Dimer: bonding / antibonding seesaw
  // ================================================================
  (function () {
    var o = setup('c2-dimer'); if (!o) return;
    var state = {anti: false, t: 2.8};

    function orbital(x, yC, phaseUp, hl) {
      var ctx = o.x;
      // two lobes of a pz orbital; color encodes sign of the upper lobe
      var up = phaseUp ? '#fbbf24' : '#60a5fa';
      var dn = phaseUp ? '#60a5fa' : '#fbbf24';
      ctx.globalAlpha = hl ? 0.95 : 0.5;
      ctx.fillStyle = up;
      ctx.beginPath(); ctx.ellipse(x, yC - 26, 13, 24, 0, 0, 2*PI); ctx.fill();
      ctx.fillStyle = dn;
      ctx.beginPath(); ctx.ellipse(x, yC + 26, 13, 24, 0, 0, 2*PI); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e7e5e4';
      ctx.beginPath(); ctx.arc(x, yC, 4.5, 0, 2*PI); ctx.fill();
    }

    function draw() {
      clear(o);
      var ctx = o.x;
      var yC = o.h*0.46, xL = o.w*0.17, xR = o.w*0.40;

      // bond / node between the atoms
      if (!state.anti) {
        ctx.strokeStyle = 'rgba(251,191,36,0.55)'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(xL + 14, yC); ctx.lineTo(xR - 14, yC); ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo((xL + xR)/2, yC - 56); ctx.lineTo((xL + xR)/2, yC + 56); ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, JA() ? '節（振幅ゼロ）' : 'node (zero amplitude)', (xL + xR)/2, yC + 74, INKDIM, 11.5);
      }
      orbital(xL, yC, true, true);
      orbital(xR, yC, !state.anti, true);
      label(ctx, JA() ? (state.anti ? '逆位相' : '同位相') : (state.anti ? 'out of phase' : 'in phase'),
            (xL + xR)/2, o.h*0.13, '#e7e5e4', 14);

      // ---- level diagram ----
      var x0 = o.w*0.62, x1 = o.w*0.95, xm = (x0 + x1)/2;
      var scale = (o.h*0.30)/3.6;
      function yE(E) { return yC - E*scale; }
      // reference level
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(x0 - 8, yE(0)); ctx.lineTo(x1 + 4, yE(0)); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, JA() ? '孤立原子の準位' : 'isolated-atom level', xm, yE(0) - 12, INKDIM, 11);

      var lv = [{E: -state.t, on: !state.anti, name: JA() ? '結合  −t' : 'bonding  −t'},
                {E: +state.t, on: state.anti,  name: JA() ? '反結合  +t' : 'antibonding  +t'}];
      lv.forEach(function (l) {
        ctx.strokeStyle = l.on ? ACCENT : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = l.on ? 4 : 2;
        ctx.beginPath(); ctx.moveTo(x0, yE(l.E)); ctx.lineTo(x1, yE(l.E)); ctx.stroke();
        label(ctx, l.name, xm, yE(l.E) + (l.E < 0 ? 16 : -14), l.on ? '#fff' : INKDIM, 12.5);
      });
      // splitting arrows
      arrow(ctx, x1 + 14, yE(0), x1 + 14, yE(-state.t) - 2, INKDIM, 1.5, 6);
      arrow(ctx, x1 + 14, yE(0), x1 + 14, yE(+state.t) + 2, INKDIM, 1.5, 6);
    }

    var bB = document.getElementById('b2-bond'), bA = document.getElementById('b2-anti');
    var sT = document.getElementById('s2-t'), vT = document.getElementById('v2-t');
    bB.addEventListener('click', function () { state.anti = false; bB.classList.add('active'); bA.classList.remove('active'); draw(); });
    bA.addEventListener('click', function () { state.anti = true; bA.classList.add('active'); bB.classList.remove('active'); draw(); });
    sT.addEventListener('input', function () { state.t = +sT.value; vT.textContent = state.t.toFixed(1) + ' eV'; draw(); });
    draw();
    onLangChange.push(draw);
    window.addEventListener('resize', function () { o = setup('c2-dimer'); draw(); });
  })();

  // ================================================================
  //  01 — Chain: levels crowd into a band
  // ================================================================
  (function () {
    var o = setup('c2-chain'); if (!o) return;
    var N = 8;

    function draw() {
      clear(o);
      var ctx = o.x;
      var padL = 56, padR = 24, padT = 30, padB = 40;
      var W = o.w - padL - padR, H = o.h - padT - padB;
      function X(phi) { return padL + (phi + PI)/(2*PI)*W; }
      function Y(E) { return padT + (1 - (E + 2)/4)*H; }   // E in units of t, range −2..+2

      // axes
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(padL, padT, W, H);
      // Fermi level (half filling) at E = 0
      ctx.strokeStyle = ACCENT; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(padL + W, Y(0)); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, JA() ? 'フェルミ準位' : 'Fermi level', padL + W - 6, Y(0) - 11, ACCENT, 11.5, 'right');

      // band curve
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var i = 0; i <= 200; i++) {
        var p = -PI + 2*PI*i/200;
        var x = X(p), y = Y(-2*cos(p));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // discrete states
      var Rdot = N <= 12 ? 6 : (N <= 28 ? 4.5 : 3.4);
      for (var m = 0; m < N; m++) {
        var phi = 2*PI*m/N; if (phi > PI) phi -= 2*PI;
        var E = -2*cos(phi);
        var occupied = E < -1e-9 || (abs(E) < 1e-9 && phi <= 0);  // half filling
        ctx.beginPath();
        ctx.arc(X(phi), Y(E), Rdot, 0, 2*PI);
        if (occupied) { ctx.fillStyle = ACCENT; ctx.fill(); }
        else { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.6; ctx.stroke(); }
      }

      // axis labels
      label(ctx, JA() ? '隣との位相差 φ' : 'phase step φ', padL + W/2, o.h - 14, INKDIM, 12.5);
      label(ctx, '−π', X(-PI), padT + H + 14, INKDIM, 12);
      label(ctx, '0', X(0), padT + H + 14, INKDIM, 12);
      label(ctx, 'π', X(PI), padT + H + 14, INKDIM, 12);
      ctx.save();
      ctx.translate(18, padT + H/2); ctx.rotate(-PI/2);
      label(ctx, JA() ? 'エネルギー' : 'energy', 0, 0, INKDIM, 12.5);
      ctx.restore();
      label(ctx, '−2t', padL - 18, Y(-2), INKDIM, 12);
      label(ctx, '+2t', padL - 18, Y(2), INKDIM, 12);
      label(ctx, (JA() ? '準位の数 = ' : 'levels = ') + N, padL + 10, padT + 14, '#e7e5e4', 12.5, 'left');
      label(ctx, JA() ? '● 占有　○ 空席' : '● filled   ○ empty', padL + 10, padT + 32, INKDIM, 11.5, 'left');
    }

    var sN = document.getElementById('s2-n'), vN = document.getElementById('v2-n');
    sN.addEventListener('input', function () { N = +sN.value; vN.textContent = N; draw(); });
    draw();
    onLangChange.push(draw);
    window.addEventListener('resize', function () { o = setup('c2-chain'); draw(); });
  })();

  // ================================================================
  //  02a — Honeycomb lattice with A/B sublattices and the three arrows
  // ================================================================
  (function () {
    var o = setup('c2-lattice'); if (!o) return;
    function draw() {
    var ctx = o.x;
    clear(o);
    var s = min(o.w, o.h)*0.24, cx = o.w/2, cy = o.h/2;
    var a1 = [1, 0], a2 = [0.5, sqrt3/2];
    function tx(p) { return cx + p[0]*s; }
    function ty(p) { return cy - p[1]*s; }

    // bonds
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1.4;
    var R = 4;
    for (var n = -R; n <= R; n++) for (var m = -R; m <= R; m++) {
      var A = [n*a1[0] + m*a2[0], n*a1[1] + m*a2[1]];
      DELTAS.forEach(function (d) {
        var B = [A[0] + d[0], A[1] + d[1]];
        ctx.beginPath(); ctx.moveTo(tx(A), ty(A)); ctx.lineTo(tx(B), ty(B)); ctx.stroke();
      });
    }
    // atoms
    for (n = -R; n <= R; n++) for (m = -R; m <= R; m++) {
      var Ax = n*a1[0] + m*a2[0], Ay = n*a1[1] + m*a2[1];
      var Bx = Ax + D1[0], By = Ay + D1[1];
      if (abs(tx([Ax,Ay]) - cx) < o.w/2 + 10 && abs(ty([Ax,Ay]) - cy) < o.h/2 + 10) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(tx([Ax,Ay]), ty([Ax,Ay]), 5, 0, 2*PI); ctx.fill();
      }
      if (abs(tx([Bx,By]) - cx) < o.w/2 + 10 && abs(ty([Bx,By]) - cy) < o.h/2 + 10) {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath(); ctx.arc(tx([Bx,By]), ty([Bx,By]), 5, 0, 2*PI); ctx.fill();
      }
    }
    // unit cell (dashed parallelogram) around origin
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
    var P0 = [-0.25, -0.55];   // offset so the cell encloses one A and one B
    ctx.beginPath();
    ctx.moveTo(tx(P0), ty(P0));
    ctx.lineTo(tx([P0[0]+a1[0], P0[1]+a1[1]]), ty([P0[0]+a1[0], P0[1]+a1[1]]));
    ctx.lineTo(tx([P0[0]+a1[0]+a2[0], P0[1]+a1[1]+a2[1]]), ty([P0[0]+a1[0]+a2[0], P0[1]+a1[1]+a2[1]]));
    ctx.lineTo(tx([P0[0]+a2[0], P0[1]+a2[1]]), ty([P0[0]+a2[0], P0[1]+a2[1]]));
    ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);

    // three arrows from the central A atom
    var names = ['δ₁', 'δ₂', 'δ₃'];
    DELTAS.forEach(function (d, i) {
      arrow(ctx, tx([0,0]), ty([0,0]), tx([d[0]*0.92, d[1]*0.92]), ty([d[0]*0.92, d[1]*0.92]), '#fbbf24', 2.6, 8);
      label(ctx, names[i], tx([d[0]*1.32, d[1]*1.38]), ty([d[0]*1.32, d[1]*1.38]), '#fbbf24', 13);
    });
    label(ctx, 'A', tx([0,0]) - 13, ty([0,0]) + 11, '#ef4444', 13);
    }
    draw();
    onLangChange.push(draw);
    window.addEventListener('resize', function () { o = setup('c2-lattice'); draw(); });
  })();

  // ================================================================
  //  02b — Phasor explorer: drag k in the BZ, watch the three arrows
  // ================================================================
  (function () {
    var oBZ = setup('c2-bz'), oPH = setup('c2-ph');
    if (!oBZ || !oPH) return;
    var k = {x: 1.2, y: 0.8};

    function bzGeom() {
      var s = min(oBZ.w, oBZ.h)*0.40/BZR;
      return {s: s, cx: oBZ.w/2, cy: oBZ.h/2};
    }

    function drawBZ() {
      clear(oBZ);
      var ctx = oBZ.x, g = bzGeom();
      function X(kx) { return g.cx + kx*g.s; }
      function Y(ky) { return g.cy - ky*g.s; }
      // |f| heat shading (coarse)
      var step = 6;
      for (var px = 0; px < oBZ.w; px += step) for (var py = 0; py < oBZ.h; py += step) {
        var kx = (px + step/2 - g.cx)/g.s, ky = -(py + step/2 - g.cy)/g.s;
        if (!insideBZ(kx, ky)) continue;
        var v = fAbs(kx, ky)/3;
        ctx.fillStyle = 'rgba(224,99,90,' + (0.05 + 0.30*v).toFixed(3) + ')';
        ctx.fillRect(px, py, step, step);
      }
      // hexagon
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (var n = 0; n < 6; n++) {
        var ang = n*PI/3;
        var hx = X(BZR*cos(ang)), hy = Y(BZR*sin(ang));
        if (n === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
      }
      ctx.closePath(); ctx.stroke();
      // high-symmetry labels
      label(ctx, 'Γ', X(0) - 11, Y(0) - 10, '#e7e5e4', 13);
      label(ctx, 'M', X(HSP.M.kx) + 12, Y(HSP.M.ky) - 8, '#e7e5e4', 13);
      for (n = 0; n < 6; n++) {
        var angK = n*PI/3;
        var isK = (n % 2 === 0);
        label(ctx, isK ? 'K' : 'K′', X(BZR*1.13*cos(angK)), Y(BZR*1.13*sin(angK)), INKDIM, 12);
      }
      ctx.fillStyle = '#e7e5e4';
      ctx.beginPath(); ctx.arc(X(0), Y(0), 2.5, 0, 2*PI); ctx.fill();
      // dark-count overlay: where |f| ~ 0 mark small circles at all corners
      // marker
      ctx.beginPath(); ctx.arc(X(k.x), Y(k.y), 9, 0, 2*PI);
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
      ctx.strokeStyle = BG; ctx.lineWidth = 2; ctx.stroke();
      label(ctx, JA() ? 'ブリルアンゾーン（明るさ = |f|）' : 'Brillouin zone (brightness = |f|)', oBZ.w/2, oBZ.h - 14, INKDIM, 11.5);
    }

    function drawPH() {
      clear(oPH);
      var ctx = oPH.x;
      var re = fRe(k.x, k.y), im = fIm(k.x, k.y), mod = sqrt(re*re + im*im);
      var cx = oPH.w*0.36, cy = oPH.h*0.52;
      var s = min(oPH.w, oPH.h)*0.115;

      // unit circle guide at the start
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
      for (var r = 1; r <= 3; r++) {
        ctx.beginPath(); ctx.arc(cx, cy, r*s, 0, 2*PI); ctx.stroke();
      }
      // tip-to-tail arrows
      var px = cx, py = cy;
      var cols = ['#fbbf24', '#34d399', '#60a5fa'];
      DELTAS.forEach(function (d, i) {
        var ph = k.x*d[0] + k.y*d[1];
        var nx = px + s*cos(ph), ny = py - s*sin(ph);
        arrow(ctx, px, py, nx, ny, cols[i], 2.6, 8);
        px = nx; py = ny;
      });
      // resultant
      if (mod > 0.06) {
        arrow(ctx, cx, cy, px, py, '#ffffff', 3.4, 10);
      } else {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 2*PI); ctx.stroke();
        label(ctx, JA() ? '完全相殺！' : 'perfect cancellation!', cx, cy - 22, '#fff', 13);
      }
      label(ctx, '|f(k)| = ' + mod.toFixed(2), cx, oPH.h*0.10, '#e7e5e4', 14);

      // level ladder on the right
      var x0 = oPH.w*0.72, x1 = oPH.w*0.96, xm = (x0 + x1)/2;
      var yC = oPH.h*0.52, scl = (oPH.h*0.30)/3;
      function yE(E) { return yC - E*scl; }
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0 - 6, yE(0)); ctx.lineTo(x1 + 4, yE(0)); ctx.stroke();
      ctx.setLineDash([]);
      [-1, 1].forEach(function (sgn) {
        var E = sgn*mod;
        ctx.strokeStyle = sgn < 0 ? ACCENT : 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x0, yE(E)); ctx.lineTo(x1, yE(E)); ctx.stroke();
      });
      label(ctx, '+t|f|', xm, yE(mod) - 13, INKDIM, 12);
      label(ctx, '−t|f|', xm, yE(-mod) + 14, INKDIM, 12);
      label(ctx, JA() ? '分裂' : 'splitting', xm, oPH.h*0.10, INKDIM, 11.5);
    }

    function redraw() { drawBZ(); drawPH(); }

    // dragging
    function pick(ev) {
      var rect = oBZ.c.getBoundingClientRect();
      var px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
      var py = (ev.touches ? ev.touches[0].clientY : ev.clientY) - rect.top;
      var g = bzGeom();
      var kk = clampToBZ((px - g.cx)/g.s, -(py - g.cy)/g.s);
      k.x = kk[0]; k.y = kk[1];
      redraw();
    }
    var dragging = false;
    oBZ.c.addEventListener('pointerdown', function (e) { dragging = true; oBZ.c.setPointerCapture(e.pointerId); pick(e); });
    oBZ.c.addEventListener('pointermove', function (e) { if (dragging) pick(e); });
    oBZ.c.addEventListener('pointerup', function () { dragging = false; });
    oBZ.c.style.cursor = 'crosshair';
    oBZ.c.style.touchAction = 'none';

    [['b2-goG', HSP.G], ['b2-goM', HSP.M], ['b2-goK', HSP.K]].forEach(function (p) {
      var b = document.getElementById(p[0]);
      if (b) b.addEventListener('click', function () { k.x = p[1].kx; k.y = p[1].ky; redraw(); });
    });

    redraw();
    onLangChange.push(redraw);
    window.addEventListener('resize', function () { oBZ = setup('c2-bz'); oPH = setup('c2-ph'); redraw(); });
  })();

  // ================================================================
  //  03a — Bands along Γ→M→K→Γ
  // ================================================================
  (function () {
    var o = setup('c2-bands'); if (!o) return;

    function draw() {
      clear(o);
      var ctx = o.x;
      var padL = 46, padR = 16, padT = 24, padB = 34;
      var W = o.w - padL - padR, H = o.h - padT - padB;
      var Emax = 3.2;
      function Y(E) { return padT + (1 - (E + Emax)/(2*Emax))*H; }

      var segs = [
        {from: HSP.G, to: HSP.M, len: APO},
        {from: HSP.M, to: HSP.K, len: BZR/2},
        {from: HSP.K, to: HSP.G, len: BZR}
      ];
      var total = segs.reduce(function (s, g) { return s + g.len; }, 0);

      // frame + Fermi level
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(padL, padT, W, H);
      ctx.strokeStyle = ACCENT; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(padL + W, Y(0)); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, JA() ? 'フェルミ準位' : 'Fermi level', padL + 8, Y(0) - 10, ACCENT, 11.5, 'left');

      // filled (lower band) shading + curves
      var xAcc = 0;
      segs.forEach(function (g, si) {
        var steps = 120;
        var x0 = padL + xAcc/total*W, x1 = padL + (xAcc + g.len)/total*W;
        // shade the occupied band
        ctx.fillStyle = 'rgba(224,99,90,0.16)';
        ctx.beginPath(); ctx.moveTo(x0, Y(0));
        for (var i = 0; i <= steps; i++) {
          var u = i/steps;
          var kx = g.from.kx + (g.to.kx - g.from.kx)*u;
          var ky = g.from.ky + (g.to.ky - g.from.ky)*u;
          ctx.lineTo(x0 + (x1 - x0)*u, Y(-fAbs(kx, ky)));
        }
        ctx.lineTo(x1, Y(0)); ctx.closePath(); ctx.fill();
        // band curves
        [1, -1].forEach(function (sgn) {
          ctx.strokeStyle = PATHSEG[si]; ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (var i2 = 0; i2 <= steps; i2++) {
            var u2 = i2/steps;
            var kx2 = g.from.kx + (g.to.kx - g.from.kx)*u2;
            var ky2 = g.from.ky + (g.to.ky - g.from.ky)*u2;
            var x = x0 + (x1 - x0)*u2, y = Y(sgn*fAbs(kx2, ky2));
            if (i2 === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
        // tick at the segment start
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.moveTo(x0, padT); ctx.lineTo(x0, padT + H); ctx.stroke();
        label(ctx, g.from.label, x0, padT + H + 14, '#e7e5e4', 12.5);
        xAcc += g.len;
      });
      label(ctx, 'Γ', padL + W, padT + H + 14, '#e7e5e4', 12.5);
      // K marker: the touching point
      var xK = padL + (APO + BZR/2)/total*W;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(xK, Y(0), 4, 0, 2*PI); ctx.fill();

      ctx.save();
      ctx.translate(14, padT + H/2); ctx.rotate(-PI/2);
      label(ctx, JA() ? 'エネルギー (× t)' : 'energy (× t)', 0, 0, INKDIM, 12);
      ctx.restore();
      label(ctx, JA() ? '満席（結合バンド π）' : 'full (bonding band π)', padL + W*0.5, Y(-1.8), 'rgba(255,255,255,0.75)', 12);
      label(ctx, JA() ? '空席（反結合バンド π*）' : 'empty (antibonding band π*)', padL + W*0.5, Y(1.8), 'rgba(255,255,255,0.55)', 12);
    }

    draw();
    onLangChange.push(draw);
    window.addEventListener('resize', function () { o = setup('c2-bands'); draw(); });
  })();

  // ================================================================
  //  03b — 3-D band surfaces (wireframe, drag to rotate)
  // ================================================================
  (function () {
    var o = setup('c2-surf'); if (!o) return;
    var yaw = 0.6, pitch = 0.42, auto = true;
    var GRID = 36;

    // precompute mesh over the BZ bounding box
    function buildMesh() {
      var pts = [];
      var L = BZR*1.02;
      for (var i = 0; i <= GRID; i++) {
        var row = [];
        for (var j = 0; j <= GRID; j++) {
          var kx = -L + 2*L*i/GRID, ky = -L + 2*L*j/GRID;
          row.push(insideBZ(kx, ky) ? [kx, ky, fAbs(kx, ky)] : null);
        }
        pts.push(row);
      }
      return pts;
    }
    var mesh = buildMesh();

    function project(kx, ky, E) {
      var sc = min(o.w, o.h)*0.105;
      var x = kx/BZR, y = ky/BZR, z = E/3*1.15;
      var cy0 = cos(yaw), sy0 = sin(yaw);
      var x1 = x*cy0 - y*sy0, y1 = x*sy0 + y*cy0;
      var cp = cos(pitch), sp = sin(pitch);
      var y2 = y1*cp - z*sp, z2 = y1*sp + z*cp;
      return [o.w/2 + x1*sc*3.0, o.h/2 + y2*sc*3.0];
    }

    function draw() {
      clear(o);
      var ctx = o.x;
      [-1, 1].forEach(function (sgn) {
        ctx.lineWidth = 1;
        // rows then columns
        for (var pass = 0; pass < 2; pass++) {
          for (var i = 0; i <= GRID; i++) {
            ctx.beginPath();
            var pen = false;
            for (var j = 0; j <= GRID; j++) {
              var p = pass === 0 ? mesh[i][j] : mesh[j][i];
              if (!p) { pen = false; continue; }
              var pr = project(p[0], p[1], sgn*p[2]);
              if (!pen) { ctx.moveTo(pr[0], pr[1]); pen = true; }
              else ctx.lineTo(pr[0], pr[1]);
            }
            ctx.strokeStyle = sgn > 0 ? 'rgba(120,170,255,0.30)' : 'rgba(224,99,90,0.34)';
            ctx.stroke();
          }
        }
      });
      // K points
      for (var n = 0; n < 6; n++) {
        var ang = n*PI/3;
        var pr = project(BZR*cos(ang), BZR*sin(ang), 0);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(pr[0], pr[1], 3, 0, 2*PI); ctx.fill();
      }
      label(ctx, JA() ? '上: π*（空）　下: π（満席）' : 'top: π* (empty)   bottom: π (full)', o.w/2, o.h - 14, INKDIM, 11.5);
    }

    var raf = null;
    function tick() {
      if (auto) { yaw += 0.004; draw(); }
      raf = requestAnimationFrame(tick);
    }
    tick();

    var dragging = false, lx = 0, ly = 0;
    o.c.addEventListener('pointerdown', function (e) { dragging = true; lx = e.clientX; ly = e.clientY; o.c.setPointerCapture(e.pointerId); });
    o.c.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      yaw += (e.clientX - lx)*0.008;
      pitch = max(0.05, min(1.35, pitch + (e.clientY - ly)*0.006));
      lx = e.clientX; ly = e.clientY;
      if (!auto) draw();
    });
    o.c.addEventListener('pointerup', function () { dragging = false; });
    o.c.style.cursor = 'grab';
    o.c.style.touchAction = 'none';

    var bS = document.getElementById('b2-spin'), bR = document.getElementById('b2-rst');
    if (bS) bS.addEventListener('click', function () { auto = !auto; bS.classList.toggle('active', auto); if (!auto) draw(); });
    if (bR) bR.addEventListener('click', function () { yaw = 0.6; pitch = 0.42; draw(); });
    onLangChange.push(draw);
    window.addEventListener('resize', function () { o = setup('c2-surf'); draw(); });
  })();

  // ================================================================
  //  04 — Cone cross-section vs ordinary semiconductor
  // ================================================================
  (function () {
    var o = setup('c2-cone'); if (!o) return;
    function draw() {
    var ctx = o.x;
    clear(o);
    var cx = o.w/2, cy = o.h/2;
    var W = min(o.w*0.7, 420), H = o.h*0.74;

    // Fermi level
    ctx.strokeStyle = ACCENT; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - W/2 - 20, cy); ctx.lineTo(cx + W/2 + 20, cy); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, JA() ? 'フェルミ準位' : 'Fermi level', cx - W/2 - 18, cy - 12, ACCENT, 11.5, 'left');

    // ordinary semiconductor: parabolas with a gap (dashed)
    var gap = H*0.18, qm = W/2*0.9;
    ctx.strokeStyle = 'rgba(255,255,255,0.40)'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 5]);
    [1, -1].forEach(function (sgn) {
      ctx.beginPath();
      for (var i = -60; i <= 60; i++) {
        var q = i/60*qm;
        var y = cy - sgn*(gap + (q*q)/(qm*qm)*H*0.30);
        if (i === -60) ctx.moveTo(cx + q, y); else ctx.lineTo(cx + q, y);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    label(ctx, JA() ? 'ふつうの半導体（放物線 + ギャップ）' : 'ordinary semiconductor (parabolas + gap)', cx, cy - H*0.55, INKDIM, 12);

    // graphene: straight cone
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6;
    var slope = H*0.42/qm;
    [1, -1].forEach(function (sgn) {
      ctx.beginPath();
      ctx.moveTo(cx - qm, cy + sgn*qm*slope);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + qm, cy + sgn*qm*slope);
      ctx.stroke();
    });
    // fill the occupied lower cone lightly
    ctx.fillStyle = 'rgba(224,99,90,0.18)';
    ctx.beginPath();
    ctx.moveTo(cx - qm, cy + qm*slope); ctx.lineTo(cx, cy); ctx.lineTo(cx + qm, cy + qm*slope);
    ctx.closePath(); ctx.fill();
    label(ctx, JA() ? 'グラフェン（直線・ギャップなし）' : 'graphene (straight, no gap)', cx, cy + H*0.55, '#e7e5e4', 12.5);
    label(ctx, 'K', cx, cy + 16, '#fff', 12);
    label(ctx, 'q', cx + qm + 14, cy + qm*slope, INKDIM, 12.5, 'left');
    }
    draw();
    onLangChange.push(draw);
    window.addEventListener('resize', function () { o = setup('c2-cone'); draw(); });
  })();
})();
