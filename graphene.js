(function () {
  'use strict';
  var PI = Math.PI, sqrt3 = Math.sqrt(3), cos = Math.cos, sin = Math.sin,
      abs = Math.abs, sqrt = Math.sqrt, max = Math.max, min = Math.min;

  var a = 1;
  var tHop = 2.7;

  function bandE(kx, ky) {
    var v = 3 + 2*cos(kx*a) + 4*cos(kx*a/2)*cos(ky*a*sqrt3/2);
    return tHop * sqrt(max(0, v));
  }

  var BZR = 4*PI/(3*a);
  var BZapothem = BZR * sqrt3/2;

  function insideBZ(kx, ky) {
    for (var n = 0; n < 6; n++) {
      var ang = PI/6 + n*PI/3;
      if (cos(ang)*kx + sin(ang)*ky > BZapothem + 0.05) return false;
    }
    return true;
  }

  var HSP = {
    G: {kx:0, ky:0, label:'Γ'},
    M: {kx:PI/a, ky:PI/(a*sqrt3), label:'M'},
    K: {kx:4*PI/(3*a), ky:0, label:'K'}
  };

  function dpr(canvas, maxR) {
    var r = window.devicePixelRatio || 1;
    if (maxR && r > maxR) r = maxR;   // cap pixel ratio for heavy 3-D canvases
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * r;
    canvas.height = rect.height * r;
    var ctx = canvas.getContext('2d');
    ctx.scale(r, r);
    return {ctx: ctx, w: rect.width, h: rect.height};
  }

  // ================================================================
  //  Module 00 — Lattice
  // ================================================================
  (function () {
    var canvas = document.getElementById('c-lattice');
    var o = dpr(canvas), ctx = o.ctx, W = o.w, H = o.h;

    var scale = min(W, H) * 0.14;
    var cx = W/2, cy = H/2;

    var a1 = [1, 0];
    var a2 = [0.5, sqrt3/2];
    var d1 = [0, 1/sqrt3];
    var d2 = [-0.5, -1/(2*sqrt3)];
    var d3 = [0.5, -1/(2*sqrt3)];
    var deltas = [d1, d2, d3];

    function tx(x) { return cx + x * scale; }
    function ty(y) { return cy - y * scale; }

    var range = 4;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, W*2, H*2);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (var n = -range; n <= range; n++) {
      for (var m = -range; m <= range; m++) {
        var ax = n*a1[0] + m*a2[0];
        var ay = n*a1[1] + m*a2[1];
        for (var di = 0; di < 3; di++) {
          var bx = ax + deltas[di][0];
          var by = ay + deltas[di][1];
          if (abs(tx(bx)-cx) < W/2+5 && abs(ty(by)-cy) < H/2+5) {
            ctx.beginPath();
            ctx.moveTo(tx(ax), ty(ay));
            ctx.lineTo(tx(bx), ty(by));
            ctx.stroke();
          }
        }
      }
    }

    // Unit cell parallelogram
    ctx.strokeStyle = 'rgba(180,83,9,0.6)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx(0), ty(0));
    ctx.lineTo(tx(a1[0]), ty(a1[1]));
    ctx.lineTo(tx(a1[0]+a2[0]), ty(a1[1]+a2[1]));
    ctx.lineTo(tx(a2[0]), ty(a2[1]));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Lattice vectors
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    function arrow(x0, y0, x1, y1) {
      var dx = x1-x0, dy = y1-y0;
      var len = sqrt(dx*dx+dy*dy);
      var ux = dx/len, uy = dy/len;
      ctx.beginPath();
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1-ux*8+uy*4, y1-uy*8-ux*4);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1-ux*8-uy*4, y1-uy*8+ux*4);
      ctx.stroke();
    }
    arrow(tx(0), ty(0), tx(a1[0]), ty(a1[1]));
    arrow(tx(0), ty(0), tx(a2[0]), ty(a2[1]));

    ctx.font = '600 12px "DM Sans", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('a₁', tx(a1[0])+6, ty(a1[1])+4);
    ctx.fillText('a₂', tx(a2[0])-4, ty(a2[1])-8);

    // Atoms
    for (var n = -range; n <= range; n++) {
      for (var m = -range; m <= range; m++) {
        var ax = n*a1[0] + m*a2[0];
        var ay = n*a1[1] + m*a2[1];
        // A sublattice
        if (abs(tx(ax)-cx) < W/2+5 && abs(ty(ay)-cy) < H/2+5) {
          ctx.beginPath();
          ctx.arc(tx(ax), ty(ay), 5, 0, 2*PI);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
        }
        // B sublattice
        var bx = ax + d1[0], by = ay + d1[1];
        if (abs(tx(bx)-cx) < W/2+5 && abs(ty(by)-cy) < H/2+5) {
          ctx.beginPath();
          ctx.arc(tx(bx), ty(by), 5, 0, 2*PI);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
        }
      }
    }

    // Labels
    ctx.font = '700 11px "DM Sans", sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('A', 8, 18);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('B', 28, 18);
  })();

  // ================================================================
  //  Module 00 — Brillouin Zone
  // ================================================================
  (function () {
    var canvas = document.getElementById('c-bz');
    var o = dpr(canvas), ctx = o.ctx, W = o.w, H = o.h;
    var cx = W/2, cy = H/2;
    var scale = min(W, H) * 0.2 / BZR;

    function tx(kx) { return cx + kx * scale; }
    function ty(ky) { return cy - ky * scale; }

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, W*2, H*2);

    // Hexagonal BZ
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var n = 0; n <= 6; n++) {
      var ang = n * PI/3;
      var vx = BZR * cos(ang), vy = BZR * sin(ang);
      if (n === 0) ctx.moveTo(tx(vx), ty(vy));
      else ctx.lineTo(tx(vx), ty(vy));
    }
    ctx.closePath();
    ctx.stroke();

    // Fill lightly
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fill();

    // Reciprocal lattice points (beyond BZ, faded)
    var b1 = [2*PI, -2*PI/sqrt3];
    var b2 = [0, 4*PI/sqrt3];
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        var gx = i*b1[0]+j*b2[0], gy = i*b1[1]+j*b2[1];
        ctx.beginPath();
        ctx.arc(tx(gx), ty(gy), 3, 0, 2*PI);
        ctx.fill();
      }
    }

    // High symmetry path: Γ → M → K → Γ
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(tx(0), ty(0));
    ctx.lineTo(tx(HSP.M.kx), ty(HSP.M.ky));
    ctx.lineTo(tx(HSP.K.kx), ty(HSP.K.ky));
    ctx.lineTo(tx(0), ty(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // K points (all 6 corners)
    var Kpoints = [];
    var Kprime = [];
    for (var n = 0; n < 6; n++) {
      var ang = n * PI/3;
      var kx = BZR * cos(ang), ky = BZR * sin(ang);
      if (n % 2 === 0) Kpoints.push([kx, ky]);
      else Kprime.push([kx, ky]);
    }

    ctx.fillStyle = '#ef4444';
    Kpoints.forEach(function(p) {
      ctx.beginPath(); ctx.arc(tx(p[0]), ty(p[1]), 4, 0, 2*PI); ctx.fill();
    });
    ctx.fillStyle = '#3b82f6';
    Kprime.forEach(function(p) {
      ctx.beginPath(); ctx.arc(tx(p[0]), ty(p[1]), 4, 0, 2*PI); ctx.fill();
    });

    // Γ
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.arc(tx(0), ty(0), 4, 0, 2*PI); ctx.fill();

    // M point
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath(); ctx.arc(tx(HSP.M.kx), ty(HSP.M.ky), 4, 0, 2*PI); ctx.fill();

    // Labels
    ctx.font = '700 12px "DM Sans", sans-serif';
    ctx.fillStyle = '#16a34a';
    ctx.fillText('Γ', tx(0)-14, ty(0)+4);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('K', tx(HSP.K.kx)+7, ty(HSP.K.ky)+4);
    ctx.fillStyle = '#3b82f6';
    var kp = Kprime[0];
    ctx.fillText("K'", tx(kp[0])+7, ty(kp[1])+4);
    ctx.fillStyle = '#a78bfa';
    ctx.fillText('M', tx(HSP.M.kx)+7, ty(HSP.M.ky)-6);

    // Reciprocal-space distances between high-symmetry points.
    // Internal units use a = 1; convert to Å⁻¹ with the real lattice
    // constant so the labels read as physical wavevectors.
    var aPhys = 2.46;                       // graphene lattice constant (Å)
    function kdist(p1, p2) {
      var dx = p2.kx - p1.kx, dy = p2.ky - p1.ky;
      return sqrt(dx*dx + dy*dy) / aPhys;   // Å⁻¹
    }
    function distLabel(p1, p2, ox, oy) {
      var mx = (p1.kx + p2.kx) / 2, my = (p1.ky + p2.ky) / 2;
      ctx.fillText(kdist(p1, p2).toFixed(2), tx(mx) + ox, ty(my) + oy);
    }
    ctx.font = '600 10px "DM Sans", sans-serif';
    ctx.fillStyle = '#fcd34d';
    ctx.textAlign = 'center';
    distLabel(HSP.G, HSP.M, -16, -4);   // Γ–M
    distLabel(HSP.M, HSP.K,  26, -2);   // M–K
    distLabel(HSP.K, HSP.G,   0, 16);   // K–Γ
    ctx.font = '600 8px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(252,211,77,0.7)';
    ctx.fillText('Å⁻¹', tx((HSP.K.kx)/2), ty(0) + 26);
    ctx.textAlign = 'start';
  })();

  // ================================================================
  //  Module 01 — E-k band structure along Γ-M-K-Γ
  // ================================================================
  var drawBands;
  (function () {
    var canvas = document.getElementById('c-bands');

    function pathDist(a, b) {
      var dx = b.kx - a.kx, dy = b.ky - a.ky;
      return sqrt(dx*dx + dy*dy);
    }
    var dGM = pathDist(HSP.G, HSP.M);
    var dMK = pathDist(HSP.M, HSP.K);
    var dKG = pathDist(HSP.K, HSP.G);
    var totalLen = dGM + dMK + dKG;

    var segments = [
      {from: HSP.G, to: HSP.M, cumStart: 0, len: dGM},
      {from: HSP.M, to: HSP.K, cumStart: dGM, len: dMK},
      {from: HSP.K, to: HSP.G, cumStart: dGM+dMK, len: dKG}
    ];

    var NPTS = 400;
    function samplePath() {
      var pts = [];
      for (var i = 0; i <= NPTS; i++) {
        var s = i / NPTS * totalLen;
        var kx, ky, seg;
        for (var si = 0; si < 3; si++) {
          seg = segments[si];
          if (s <= seg.cumStart + seg.len + 0.001 || si === 2) {
            var frac = (s - seg.cumStart) / seg.len;
            frac = max(0, min(1, frac));
            kx = seg.from.kx + frac * (seg.to.kx - seg.from.kx);
            ky = seg.from.ky + frac * (seg.to.ky - seg.from.ky);
            break;
          }
        }
        pts.push({s: s, ep: bandE(kx, ky), em: -bandE(kx, ky)});
      }
      return pts;
    }

    drawBands = function () {
      var o = dpr(canvas), ctx = o.ctx, W = o.w, H = o.h;
      var eMax = 3 * tHop;
      var pad = {l: 44, r: 16, t: 20, b: 32};
      var pw = W - pad.l - pad.r;
      var ph = H - pad.t - pad.b;
      var pts = samplePath();

      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, W*2, H*2);

      function sx(s) { return pad.l + s / totalLen * pw; }
      function sy(e) { return pad.t + (1 - (e + eMax) / (2*eMax)) * ph; }

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (var e = -eMax; e <= eMax; e += tHop) {
        ctx.beginPath(); ctx.moveTo(pad.l, sy(e)); ctx.lineTo(pad.l+pw, sy(e)); ctx.stroke();
      }

      // Vertical lines at segment boundaries
      var ticks = [
        {s: 0, label: 'Γ'},
        {s: dGM, label: 'M'},
        {s: dGM+dMK, label: 'K'},
        {s: totalLen, label: 'Γ'}
      ];
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.setLineDash([3, 3]);
      ticks.forEach(function(tk) {
        ctx.beginPath(); ctx.moveTo(sx(tk.s), pad.t); ctx.lineTo(sx(tk.s), pad.t+ph); ctx.stroke();
      });
      ctx.setLineDash([]);

      // Zero line
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(pad.l+pw, sy(0)); ctx.stroke();

      // Bands — fill
      ctx.globalAlpha = 0.15;
      // Conduction fill
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(sx(pts[0].s), sy(0));
      pts.forEach(function(p) { ctx.lineTo(sx(p.s), sy(p.ep)); });
      ctx.lineTo(sx(pts[NPTS].s), sy(0));
      ctx.closePath();
      ctx.fill();
      // Valence fill
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(sx(pts[0].s), sy(0));
      pts.forEach(function(p) { ctx.lineTo(sx(p.s), sy(p.em)); });
      ctx.lineTo(sx(pts[NPTS].s), sy(0));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Bands — lines
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      pts.forEach(function(p, i) {
        if (i === 0) ctx.moveTo(sx(p.s), sy(p.ep));
        else ctx.lineTo(sx(p.s), sy(p.ep));
      });
      ctx.stroke();

      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      pts.forEach(function(p, i) {
        if (i === 0) ctx.moveTo(sx(p.s), sy(p.em));
        else ctx.lineTo(sx(p.s), sy(p.em));
      });
      ctx.stroke();

      // Dirac point marker
      var kIdx = Math.round(NPTS * (dGM+dMK) / totalLen);
      ctx.beginPath();
      ctx.arc(sx(pts[kIdx].s), sy(0), 5, 0, 2*PI);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();

      // Labels
      ctx.font = '600 11px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a8a29e';
      ticks.forEach(function(tk) {
        ctx.fillText(tk.label, sx(tk.s), pad.t + ph + 18);
      });

      // Y-axis labels
      ctx.textAlign = 'right';
      ctx.font = '500 10px "DM Sans", sans-serif';
      for (var e = -eMax; e <= eMax; e += tHop) {
        if (abs(e) < 0.01) continue;
        ctx.fillText(e.toFixed(1), pad.l - 6, sy(e) + 3);
      }
      ctx.fillStyle = '#d6d3d1';
      ctx.fillText('0', pad.l - 6, sy(0) + 3);

      // Band labels
      ctx.textAlign = 'left';
      ctx.font = '600 11px "DM Sans", sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('π* (conduction)', pad.l + 6, sy(eMax * 0.7));
      ctx.fillStyle = '#3b82f6';
      ctx.fillText('π (valence)', pad.l + 6, sy(-eMax * 0.7));

      // E(eV) axis label
      ctx.save();
      ctx.translate(12, H/2);
      ctx.rotate(-PI/2);
      ctx.textAlign = 'center';
      ctx.font = '600 10px "DM Sans", sans-serif';
      ctx.fillStyle = '#78716c';
      ctx.fillText('E (eV)', 0, 0);
      ctx.restore();

      // Dirac label
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 10px "DM Sans", sans-serif';
      ctx.fillText('Dirac point', sx(pts[kIdx].s), sy(0) - 10);
    };

    drawBands();
  })();

  // ================================================================
  //  Module 02 — 3D Band Structure
  // ================================================================
  var render3D;
  (function () {
    var canvas = document.getElementById('c-3d');
    var btnReset = document.getElementById('btn-reset');
    var btnRotate = document.getElementById('btn-rotate');

    var DEF_THETA = 38 * PI/180, DEF_PHI = -32 * PI/180, DEF_ZOOM = 1;
    var showWire = false;
    var autoRotate = true;
    var theta = DEF_THETA, phi = DEF_PHI, zoom = DEF_ZOOM;

    // Extend well beyond the first BZ so every corner Dirac cone is complete.
    var R_out = BZR * 1.62;

    // Reciprocal lattice vectors (match the BZ module). Sampling k-space in
    // these fractional coordinates guarantees the Dirac points — which sit at
    // 1/3-multiples of (b1,b2), e.g. K = (2/3,1/3) — land exactly on mesh
    // vertices, so the cone tips close to E = 0 instead of being missed by a
    // regular Cartesian grid.
    var B1 = [2*PI, -2*PI/sqrt3];
    var B2 = [0, 4*PI/sqrt3];
    var UV = 4/3;   // fractional half-range; covers the extended hexagon

    // Normalized fixed light (view space): upper-right, toward viewer.
    var LL = (function () {
      var x = 0.35, y = 0.55, z = 0.75, m = sqrt(x*x+y*y+z*z);
      return [x/m, y/m, z/m];
    })();

    function insideHexR(kx, ky, R) {
      var ap = R * sqrt3/2;
      for (var n = 0; n < 6; n++) {
        var ang = PI/6 + n*PI/3;
        if (cos(ang)*kx + sin(ang)*ky > ap + 1e-6) return false;
      }
      return true;
    }

    function lerp(a, b, t) { return a + (b-a)*t; }

    // Diverging colormap: valence cool, conduction warm, pale near Dirac.
    function eColor(e, eMax) {
      var t = max(-1, min(1, e/eMax)), r, g, b;
      if (t >= 0) { r = lerp(254,220,t);  g = lerp(243,38,t);  b = lerp(199,38,t); }
      else        { var u = -t; r = lerp(207,37,u); g = lerp(250,99,u); b = lerp(254,235,u); }
      return [r, g, b];
    }

    // ── Mesh cache (rebuilt when N or t changes) ──
    var meshCache = {};
    function getMesh(N) {
      var c = meshCache[N];
      if (c && c.t === tHop) return c;
      // With UV = 4/3, N must be a multiple of 8 so that u,v = ±1/3, ±2/3
      // (the K/K' points) fall exactly on grid nodes.
      var verts = [];
      for (var i = 0; i <= N; i++) {
        for (var j = 0; j <= N; j++) {
          var u = -UV + 2*UV*i/N;
          var v = -UV + 2*UV*j/N;
          var kx = u*B1[0] + v*B2[0];
          var ky = u*B1[1] + v*B2[1];
          verts.push({kx:kx, ky:ky, ep:bandE(kx,ky)});
        }
      }
      var faces = [];
      for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
          var idx = i*(N+1)+j;
          var q = [idx, idx+1, idx+N+2, idx+N+1];
          var cgx = 0, cgy = 0;
          for (var k = 0; k < 4; k++) { cgx += verts[q[k]].kx; cgy += verts[q[k]].ky; }
          if (insideHexR(cgx/4, cgy/4, R_out)) {
            faces.push({v:q, band:1});
            faces.push({v:q, band:-1});
          }
        }
      }
      c = {verts:verts, faces:faces, t:tHop};
      meshCache[N] = c;
      return c;
    }

    function draw(mesh) {
      var o = dpr(canvas, 1.5), ctx = o.ctx, W = o.w, H = o.h;
      var eMax = 3 * tHop;
      var cosT = cos(theta), sinT = sin(theta);
      var cosP = cos(phi), sinP = sin(phi);
      var kScale = 0.92 / R_out;
      var eScale = 0.58 / eMax;
      var viewScale = min(W, H) * 0.42 * zoom;

      function project(kx, ky, e) {
        var x = kx*kScale, y = ky*kScale, z = e*eScale;
        var x1 = x*cosP - y*sinP, y1 = x*sinP + y*cosP;
        var y2 = y1*cosT + z*sinT, z2 = z*cosT - y1*sinT;
        return { sx: W/2 + x1*viewScale, sy: H/2 - y2*viewScale,
                 x2:x1, y2:y2, z2:z2, depth:z2 };
      }

      ctx.clearRect(0, 0, W, H);

      // First-BZ boundary on the z=0 plane (drawn behind the surface).
      function hexPath(R) {
        ctx.beginPath();
        for (var n = 0; n <= 6; n++) {
          var ang = n*PI/3, p = project(R*cos(ang), R*sin(ang), 0);
          if (n === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy);
        }
        ctx.closePath();
      }
      ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(251,191,36,0.35)';
      hexPath(BZR); ctx.stroke();
      ctx.setLineDash([]);

      // ── Build & depth-sort faces ──
      var verts = mesh.verts;
      var faces = mesh.faces;
      var draws = [];
      for (var fi = 0; fi < faces.length; fi++) {
        var f = faces[fi], vs = f.v, band = f.band;
        var p0 = project(verts[vs[0]].kx, verts[vs[0]].ky, band*verts[vs[0]].ep);
        var p1 = project(verts[vs[1]].kx, verts[vs[1]].ky, band*verts[vs[1]].ep);
        var p2 = project(verts[vs[2]].kx, verts[vs[2]].ky, band*verts[vs[2]].ep);
        var p3 = project(verts[vs[3]].kx, verts[vs[3]].ky, band*verts[vs[3]].ep);

        // View-space normal from quad diagonals.
        var ax = p2.x2-p0.x2, ay = p2.y2-p0.y2, az = p2.z2-p0.z2;
        var bx = p3.x2-p1.x2, by = p3.y2-p1.y2, bz = p3.z2-p1.z2;
        var nx = ay*bz - az*by, ny = az*bx - ax*bz, nz = ax*by - ay*bx;
        var nm = sqrt(nx*nx+ny*ny+nz*nz) || 1;
        var ndl = abs((nx*LL[0]+ny*LL[1]+nz*LL[2]) / nm);
        var bright = 0.40 + 0.60*ndl;

        var eAvg = band * (verts[vs[0]].ep+verts[vs[1]].ep+verts[vs[2]].ep+verts[vs[3]].ep)/4;
        draws.push({
          p:[p0,p1,p2,p3],
          depth:(p0.depth+p1.depth+p2.depth+p3.depth)/4,
          e:eAvg, bright:bright
        });
      }
      draws.sort(function(a, b){ return a.depth - b.depth; });

      for (var i = 0; i < draws.length; i++) {
        var d = draws[i], pv = d.p, c = eColor(d.e, eMax);
        var r = min(255, c[0]*d.bright)|0;
        var g = min(255, c[1]*d.bright)|0;
        var bl = min(255, c[2]*d.bright)|0;
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + bl + ',0.55)';
        ctx.beginPath();
        ctx.moveTo(pv[0].sx, pv[0].sy);
        ctx.lineTo(pv[1].sx, pv[1].sy);
        ctx.lineTo(pv[2].sx, pv[2].sy);
        ctx.lineTo(pv[3].sx, pv[3].sy);
        ctx.closePath();
        ctx.fill();
        if (showWire) {
          ctx.strokeStyle = 'rgba(15,12,10,0.22)';
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }

      // ── Dirac-point markers at the six K corners (E = 0) ──
      var frontMost = null;
      for (var n = 0; n < 6; n++) {
        var ang = n*PI/3;
        var p = project(BZR*cos(ang), BZR*sin(ang), 0);
        ctx.beginPath(); ctx.arc(p.sx, p.sy, 6, 0, 2*PI);
        ctx.fillStyle = 'rgba(251,191,36,0.25)'; ctx.fill();
        ctx.beginPath(); ctx.arc(p.sx, p.sy, 3, 0, 2*PI);
        ctx.fillStyle = '#fde68a'; ctx.fill();
        if (!frontMost || p.depth > frontMost.depth) frontMost = p;
      }
      if (frontMost) {
        ctx.fillStyle = '#fde68a';
        ctx.font = '600 11px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Dirac point', frontMost.sx, frontMost.sy + 20);
      }

      // ── Orientation gizmo (bottom-left) ──
      drawGizmo(ctx, 44, H - 44, cosT, sinT, cosP, sinP);

      // ── Energy colour legend (right) ──
      drawLegend(ctx, W - 24, 24, 12, H - 70, eMax);
    }

    function drawGizmo(ctx, ox, oy, cosT, sinT, cosP, sinP) {
      var L = 26;
      function pr(x, y, z) {
        var x1 = x*cosP - y*sinP, y1 = x*sinP + y*cosP;
        var y2 = y1*cosT + z*sinT;
        return [ox + x1*L, oy - y2*L];
      }
      var axes = [
        {v:pr(1,0,0), c:'#f87171', t:'kx'},
        {v:pr(0,1,0), c:'#60a5fa', t:'ky'},
        {v:pr(0,0,1), c:'#34d399', t:'E'}
      ];
      ctx.lineWidth = 1.5;
      ctx.font = '600 9px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      axes.forEach(function(a) {
        ctx.strokeStyle = a.c; ctx.fillStyle = a.c;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(a.v[0], a.v[1]); ctx.stroke();
        ctx.fillText(a.t, a.v[0], a.v[1] - 4);
      });
    }

    function drawLegend(ctx, x, y, w, h, eMax) {
      for (var i = 0; i < h; i++) {
        var e = eMax * (1 - 2*i/h);
        var c = eColor(e, eMax);
        ctx.fillStyle = 'rgb(' + (c[0]|0) + ',' + (c[1]|0) + ',' + (c[2]|0) + ')';
        ctx.fillRect(x, y + i, w, 1);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#a8a29e';
      ctx.font = '500 9px "DM Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('+3t', x - 4, y + 8);
      ctx.fillText('0', x - 4, y + h/2 + 3);
      ctx.fillText('−3t', x - 4, y + h - 2);
    }

    // ── Render loop with dirty flag + adaptive resolution ──
    var IDLE_N = 144, DRAG_N = 48;   // multiples of 8 → K points stay exact
    var dirty = true, dragging = false;
    function frame() {
      if (autoRotate && !dragging) { phi += 0.0018; dirty = true; }
      if (dirty) {
        var N = (dragging || autoRotate) ? DRAG_N : IDLE_N;
        draw(getMesh(N));
        dirty = false;
      }
      requestAnimationFrame(frame);
    }
    render3D = function () { dirty = true; };   // exposed: request a redraw

    // ── Pointer interaction (drag-rotate + pinch-zoom) ──
    var pointers = {};
    function activePointers() { return Object.keys(pointers).length; }
    var lastX, lastY, pinchDist = 0;

    canvas.addEventListener('pointerdown', function (e) {
      pointers[e.pointerId] = {x:e.clientX, y:e.clientY};
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = {x:e.clientX, y:e.clientY};
      if (activePointers() >= 2) {
        var ids = Object.keys(pointers);
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var dist = Math.hypot(a.x-b.x, a.y-b.y);
        if (pinchDist) { zoom = max(0.5, min(3, zoom * dist/pinchDist)); dirty = true; }
        pinchDist = dist;
        return;
      }
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      phi += dx * 0.008;
      theta = max(0.12, min(PI/2 - 0.02, theta - dy * 0.008));
      lastX = e.clientX; lastY = e.clientY;
      dirty = true;
    });
    function endPointer(e) {
      delete pointers[e.pointerId];
      if (activePointers() < 2) pinchDist = 0;
      if (activePointers() === 0) dragging = false;
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoom = max(0.5, min(3, zoom * (e.deltaY < 0 ? 1.08 : 0.926)));
      dirty = true;
    }, {passive:false});

    // ── Controls ──
    btnReset.addEventListener('click', function () {
      theta = DEF_THETA; phi = DEF_PHI; zoom = DEF_ZOOM; dirty = true;
    });
    btnRotate.addEventListener('click', function () {
      autoRotate = !autoRotate;
      btnRotate.classList.toggle('active', autoRotate);
      dirty = true;
    });
    window.addEventListener('resize', function () { dirty = true; });

    requestAnimationFrame(frame);
  })();

  // ================================================================
  //  Module 03 — Quantum confinement: graphene nanoribbons
  //
  //  Zone-folding for ANY edge orientation.  Confinement across the
  //  ribbon width collapses the allowed momenta onto a family of
  //  parallel CUTTING LINES in the Brillouin zone.  Their orientation
  //  is the chiral angle θ (0° = zigzag, 30° = armchair, between =
  //  chiral); their spacing is set by the width N.  A line is gapless
  //  wherever it passes through a Dirac point, so metallicity is a
  //  RESULT of the geometry, never an input:
  //    • armchair → metallic only when N = 3m+2
  //    • zigzag   → always metallic (the line through Γ hits the K's
  //                 that project onto it)
  //    • chiral   → generically semiconducting
  // ================================================================
  (function () {
    var cellCV  = document.getElementById('c-cell-ribbon'); // real-space cell (single panel)
    var bzC     = document.getElementById('c-gnr-real');   // 2D BZ top view
    var cutC    = document.getElementById('c-gnr-cut');    // 3D band surface
    var bandC   = document.getElementById('c-gnr-bands');  // 1D subbands
    var aVal    = document.getElementById('v-angle');
    var wSlider = document.getElementById('ctrl-width');
    var wVal    = document.getElementById('v-width');
    var classDiv = document.getElementById('gnr-class');
    var btnZ = document.getElementById('btn-zigzag');
    var btnA = document.getElementById('btn-armchair');
    var btnWDec = document.getElementById('btn-width-dec');
    var btnWInc = document.getElementById('btn-width-inc');
    var btnZoneR = document.getElementById('btn-zone-reduced');
    var btnZoneE = document.getElementById('btn-zone-extended');
    if (!bzC) return;

    var curTheta = 30;   // edge orientation: 0 = zigzag, 30 = armchair
    var zoneScheme = 'reduced';   // BZ figure: 'reduced' (folded) | 'extended'

    // One stable colour per transverse mode, shared by the cutting-line figure,
    // the 3-D cut, and the band plot so the SAME cutting line is the SAME colour
    // everywhere.  Modes are ranked by gap (distance to a Dirac point), so the
    // hue order is identical across panels regardless of edge type or N.
    function colorFor(rank, n) {
      var h = n <= 1 ? 200 : (rank * 300 / (n - 1));
      return 'hsl(' + h.toFixed(0) + ',72%,62%)';
    }

    var R_out = BZR * 1.62;   // rendered region (matches Module 02)

    // Hexagonal BZ membership with a scalable radius.
    function insideHexRc(kx, ky, R) {
      var ap = R*sqrt3/2;
      for (var n = 0; n < 6; n++) {
        var ang = PI/6 + n*PI/3;
        if (cos(ang)*kx + sin(ang)*ky > ap + 1e-6) return false;
      }
      return true;
    }

    // Fold a k-point into the first (hexagonal) Brillouin zone by subtracting
    // the nearest reciprocal-lattice vector.  Used for umklapp drawing of the
    // armchair cutting lines, whose true transverse momenta run past the zone.
    var RB1x = 2*PI, RB1y = -2*PI/sqrt3, RB2x = 0, RB2y = 4*PI/sqrt3;
    function foldBZ(kx, ky) {
      var bx = kx, by = ky, bd = kx*kx + ky*ky;
      for (var i = -3; i <= 3; i++) for (var j = -3; j <= 3; j++) {
        var gx = i*RB1x + j*RB2x, gy = i*RB1y + j*RB2y;
        var dx = kx-gx, dy = ky-gy, d = dx*dx + dy*dy;
        if (d < bd - 1e-9) { bd = d; bx = dx; by = dy; }
      }
      return [bx, by];
    }

    // Minimum band energy of the subband along the line { k : k·n̂ = c }, taken
    // over ONE ribbon Brillouin zone k∥ ∈ [−kpar, kpar] (kpar = π/T).  This is
    // the subband's gap; scanning wider would pick up Dirac points from higher
    // zones that are not part of the first-BZ band.
    function lineMinGap(nx, ny, c, kpar) {
      var tx = -ny, ty = nx, bx = c*nx, by = c*ny;
      var S = 400, best = Infinity, bi = 0;
      for (var i = -S; i <= S; i++) {
        var s = kpar*i/S, e = bandE(bx+s*tx, by+s*ty);
        if (e < best) { best = e; bi = i; }
      }
      var s0 = kpar*(bi-1)/S, s1 = kpar*(bi+1)/S;
      for (var j = 0; j <= 60; j++) {
        var s = s0 + (s1-s0)*j/60, e = bandE(bx+s*tx, by+s*ty);
        if (e < best) best = e;
      }
      return best;
    }

    // Cutting-line family for a GNR with hard-wall (open) edges.
    // The transverse momentum that enters the band energy is, per mode n:
    //   armchair: k⊥ = 2nπ/(N+1)   (so E_n = bandE(k⊥, k∥) reproduces the exact
    //             analytic AGNR bands; the n = 2(N+1)/3 line reaches the K point
    //             k⊥ = 4π/3 → metallic iff N = 3m+2),
    //   zigzag:   k⊥ = nπ/(N+1)     (zone-folding approximation; true zigzag
    //             metallicity comes from edge states handled in drawSubbands).
    // The armchair lines run past the first zone, so they are drawn with umklapp
    // folding back into the hexagon.
    function ribbon(theta, N) {
      var A = (30 - theta) * PI/180;     // normal direction of the cutting lines
      var nx = cos(A), ny = sin(A);
      var isZig = (theta === 0);
      var qfac = isZig ? 1 : 2;          // transverse-mode prefactor (see above)
      var kpar = PI / (isZig ? 1 : sqrt3);   // 1-D BZ half-width π/T
      var lines = [];
      for (var n = 1; n <= N; n++) {
        var c = qfac * n * PI / (N + 1);
        var g = lineMinGap(nx, ny, c, kpar);
        lines.push({ c: c, gap: g });
        lines.push({ c: -c, gap: g });
      }
      var minG = Infinity;
      for (var i = 0; i < lines.length; i++) if (lines[i].gap < minG) minG = lines[i].gap;
      var metallic = isZig ? true : (minG < 0.025);
      // Assign each transverse mode (a ±c pair) a colour index, ranked by gap,
      // so the cutting line and its subband share one colour across all panels.
      var modes = [];
      for (var m = 0; m < N; m++) modes.push({ m: m, gap: lines[2*m].gap });
      modes.sort(function (a, b) { return a.gap - b.gap; });
      for (var r = 0; r < modes.length; r++) {
        lines[2*modes[r].m].ci = r;
        lines[2*modes[r].m + 1].ci = r;
      }
      return { theta:theta, N:N, A:A, nx:nx, ny:ny,
               lines:lines, gapE:metallic ? 0 : minG, metallic:metallic };
    }

    // Lines nearest a Dirac point, for the 1D subband plot (lowest gap first).
    function selectModes(p) {
      var ls = p.lines.slice().sort(function(a,b){ return a.gap - b.gap; });
      return ls.slice(0, min(8, ls.length));
    }

    // ── Real-space honeycomb cut into a ribbon ──
    // The honeycomb keeps ONE fixed orientation on screen in both panels — just
    // like the Brillouin-zone panel keeps the hexagon fixed and only rotates the
    // cutting lines.  Graphene is never rotated; only the *cut* changes:
    // a zigzag ribbon runs along a zigzag direction (0°, period T = a), an
    // armchair ribbon along an armchair direction (30°, period T = √3·a).  The
    // strip is trimmed to the chosen width N, and the shaded slice is the
    // ribbon's 1-D translational unit cell (T along the axis × the full width).
    var d1y = 1/sqrt3;                                   // C–C bond length
    var bondDirs = [[0, d1y], [-0.5, -0.5*d1y], [0.5, -0.5*d1y]];
    function drawRibbonCell(cv, type, active, N) {
      if (!cv) return;
      var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#161310'; ctx.fillRect(0, 0, W, H);

      var isZig = (type === 'zigzag');
      var accent = isZig ? '#34d399' : '#fbbf24';
      var aRGB   = isZig ? '52,211,153' : '251,191,36';
      var dim    = active ? 1 : 0.34;

      // axis (â, periodic) and width (ŵ, confined) unit vectors — fixed lattice
      var th = isZig ? 2*PI/3 : PI/2;                       // 120° zigzag · 90° armchair (match BZ cutting lines)
      var ax_ = cos(th), ay_ = sin(th), wx_ = -sin(th), wy_ = cos(th);
      function lc(x, y) { return x*ax_ + y*ay_; }         // longitudinal (axis)
      function wc(x, y) { return x*wx_ + y*wy_; }         // transverse (width)

      // distinct transverse levels → keep N, centred ⇒ ribbon width
      // Tag each level with its sublattice (0 = A, 1 = B) so we can choose
      // proper edge termination: zigzag edges need B at the bottom (coord 2).
      var RA = 24, levSeen = {}, levArr = [];
      for (var n = -RA; n <= RA; n++) for (var m = -RA; m <= RA; m++) {
        var px = n + m*0.5, py = m*sqrt3/2;
        var kA = Math.round(wc(px, py)*1e3);
        var kB = Math.round(wc(px, py + d1y)*1e3);
        if (!(kA in levSeen)) { levSeen[kA] = 1; levArr.push({w: kA/1e3, sub: 0}); }
        if (!(kB in levSeen)) { levSeen[kB] = 1; levArr.push({w: kB/1e3, sub: 1}); }
      }
      levArr.sort(function(a,b){ return a.w - b.w; });
      var levels = levArr.map(function(d){ return d.w; });
      // For zigzag N counts zigzag chains (2 levels/chain); for armchair
      // N counts dimer lines (1 level each).  Always select B-A pairs so
      // both edges have proper coordination-2 zigzag/armchair termination.
      var Nlev = isZig ? 2 * N : N;
      Nlev = min(Nlev, levels.length);
      var ci = 0, bd = Infinity;
      for (var i = 0; i < levels.length; i++)
        if (abs(levels[i]) < bd) { bd = abs(levels[i]); ci = i; }
      var st = max(0, min(levels.length - Nlev, ci - ((Nlev/2)|0)));
      if (isZig && st + 1 <= levels.length - Nlev && levArr[st].sub === 0) st++;
      var wmin = levels[st], wmax = levels[st + Nlev - 1], wmid = (wmin+wmax)/2;
      var missLo = st > 0 ? levels[st - 1] : null;
      var missHi = st + Nlev < levels.length ? levels[st + Nlev] : null;
      function inBand(x, y) { var v = wc(x, y); return v >= wmin-0.01 && v <= wmax+0.01; }

      // scale: fit the N-wide strip into ~74% of the smaller screen dimension
      var sc = max(8, min(0.74*min(W,H)/((wmax-wmin)||1), 40));
      var cx = W/2, cy = H/2, Cx = wmid*wx_, Cy = wmid*wy_;   // band centre
      function S(x, y) { return [cx + (x-Cx)*sc, cy - (y-Cy)*sc]; }

      // longitudinal half-length to fill the panel along the (tilted) axis
      var lmx = abs(ax_) > 0.01 ? W/2/(sc*abs(ax_)) : 1e3;
      var lmy = abs(ay_) > 0.01 ? H/2/(sc*abs(ay_)) : 1e3;
      var lmax = min(lmx, lmy) + 0.6;
      function fade(l) {                                  // soft ribbon ends
        var t = (lmax - abs(l)) / (0.24*lmax);
        return max(0, min(1, t));
      }
      function vis(x, y) { return inBand(x, y) && abs(lc(x, y)) <= lmax; }

      // bonds
      var bw = max(0.8, sc*0.045);
      for (var n = -RA; n <= RA; n++) for (var m = -RA; m <= RA; m++) {
        var px = n + m*0.5, py = m*sqrt3/2;
        if (!vis(px, py)) continue;
        var pA = S(px, py);
        for (var di = 0; di < 3; di++) {
          var bx = px + bondDirs[di][0], by = py + bondDirs[di][1];
          if (!vis(bx, by)) continue;
          var fa = dim * fade((lc(px,py)+lc(bx,by))/2);
          if (fa <= 0.01) continue;
          var pB = S(bx, by);
          ctx.globalAlpha = 0.24*fa; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = bw;
          ctx.beginPath(); ctx.moveTo(pA[0], pA[1]); ctx.lineTo(pB[0], pB[1]); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // ribbon translational unit cell: slice l∈[l0,l0+T] across the full width
      var Tper = isZig ? 1 : sqrt3, l0 = -Tper/2, pad = 0.34;
      function RS(l, w) { return S(l*ax_ + w*wx_, l*ay_ + w*wy_); }
      var corners = [RS(l0, wmin-pad), RS(l0+Tper, wmin-pad), RS(l0+Tper, wmax+pad), RS(l0, wmax+pad)];
      ctx.beginPath(); ctx.moveTo(corners[0][0], corners[0][1]);
      for (var i = 1; i < 4; i++) ctx.lineTo(corners[i][0], corners[i][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(' + aRGB + ',' + (0.13*dim) + ')'; ctx.fill();
      ctx.strokeStyle = 'rgba(' + aRGB + ',' + (0.85*dim) + ')'; ctx.lineWidth = 1.6; ctx.stroke();

      // atoms (A red, B blue); the unit-cell slice gets outlined atoms
      function inSlice(x, y) { var l = lc(x, y); return l >= l0-0.01 && l < l0+Tper-0.01; }
      var rr = max(1.8, min(sc*0.12, 5));
      for (var n = -RA; n <= RA; n++) for (var m = -RA; m <= RA; m++) {
        var px = n + m*0.5, py = m*sqrt3/2;
        var subs = [[px, py, '#ef4444'], [px, py + d1y, '#3b82f6']];
        for (var s = 0; s < 2; s++) {
          var x = subs[s][0], y = subs[s][1];
          if (!vis(x, y)) continue;
          var fa = dim * fade(lc(x, y));
          if (fa <= 0.01) continue;
          var p = S(x, y), here = inSlice(x, y);
          ctx.globalAlpha = fa;
          ctx.beginPath(); ctx.arc(p[0], p[1], here ? rr+0.6 : rr, 0, 2*PI);
          ctx.fillStyle = subs[s][2]; ctx.fill();
          if (here) { ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke(); }
        }
      }
      ctx.globalAlpha = 1;

      // Missing atoms (hard-wall BC sites) — drawn as × marks beyond each edge
      // with dashed bonds connecting them to the physical edge atoms
      var missLevels = [];
      if (missLo !== null) missLevels.push(missLo);
      if (missHi !== null) missLevels.push(missHi);
      function isMissing(x, y) {
        if (abs(lc(x, y)) > lmax) return false;
        var wv = wc(x, y);
        for (var mi = 0; mi < missLevels.length; mi++)
          if (abs(wv - missLevels[mi]) < 0.01) return true;
        return false;
      }
      if (missLevels.length > 0) {
        var xsz = max(2.5, rr * 0.7);
        // dashed bonds from edge atoms to missing sites
        ctx.setLineDash([max(2, sc*0.06), max(2, sc*0.06)]);
        ctx.lineWidth = bw; ctx.lineCap = 'round';
        for (var n = -RA; n <= RA; n++) for (var m = -RA; m <= RA; m++) {
          var px = n + m*0.5, py = m*sqrt3/2;
          var msubs = [[px, py, 0], [px, py + d1y, 1]];
          for (var s = 0; s < 2; s++) {
            var x = msubs[s][0], y = msubs[s][1], sub = msubs[s][2];
            if (!isMissing(x, y)) continue;
            var fa = dim * fade(lc(x, y));
            if (fa <= 0.01) continue;
            var pM = S(x, y);
            var dirs = sub === 0 ? bondDirs : [[0, -d1y], [-0.5, 0.5*d1y], [0.5, 0.5*d1y]];
            for (var di = 0; di < 3; di++) {
              var bx = x + dirs[di][0], by = y + dirs[di][1];
              if (!vis(bx, by)) continue;
              var pE = S(bx, by);
              ctx.globalAlpha = 0.3 * fa;
              ctx.strokeStyle = '#a8a29e';
              ctx.beginPath(); ctx.moveTo(pM[0], pM[1]); ctx.lineTo(pE[0], pE[1]); ctx.stroke();
            }
          }
        }
        ctx.setLineDash([]);
        // × marks
        ctx.lineWidth = max(1.2, xsz * 0.45); ctx.lineCap = 'round';
        for (var n = -RA; n <= RA; n++) for (var m = -RA; m <= RA; m++) {
          var px = n + m*0.5, py = m*sqrt3/2;
          var msubs = [[px, py], [px, py + d1y]];
          for (var s = 0; s < 2; s++) {
            var x = msubs[s][0], y = msubs[s][1];
            if (!isMissing(x, y)) continue;
            var fa = dim * fade(lc(x, y));
            if (fa <= 0.01) continue;
            var p = S(x, y);
            ctx.globalAlpha = 0.55 * fa;
            ctx.strokeStyle = '#a8a29e';
            ctx.beginPath();
            ctx.moveTo(p[0]-xsz, p[1]-xsz); ctx.lineTo(p[0]+xsz, p[1]+xsz);
            ctx.moveTo(p[0]+xsz, p[1]-xsz); ctx.lineTo(p[0]-xsz, p[1]+xsz);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      // translation-vector arrow T along the axis (through the band centre)
      var a0 = RS(l0, wmid), a1 = RS(l0+Tper, wmid);
      ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2.4;
      (function arrow(x0,y0,x1,y1){
        var dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L;
        ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1,y1); ctx.lineTo(x1-ux*9+uy*5, y1-uy*9-ux*5);
        ctx.moveTo(x1,y1); ctx.lineTo(x1-ux*9-uy*5, y1-uy*9+ux*5);
        ctx.stroke();
      })(a0[0],a0[1],a1[0],a1[1]);
      ctx.font = '700 11px "DM Sans", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(isZig ? 'T = a' : 'T = √3 a', (a0[0]+a1[0])/2, (a0[1]+a1[1])/2 - 8);

      // width marker
      ctx.fillStyle = active ? accent : '#78716c';
      ctx.font = '700 11px "DM Sans", sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('width N = ' + N, 10, H - 10);

      // title
      ctx.textAlign = 'left'; ctx.fillStyle = active ? '#fafaf9' : '#a8a29e';
      ctx.font = '700 12px "DM Sans", sans-serif';
      ctx.fillText((isZig ? 'Zigzag' : 'Armchair') + ' ribbon', 10, 18);
      ctx.fillStyle = active ? accent : '#78716c';
      ctx.font = '600 10px "DM Sans", sans-serif';
      ctx.fillText(isZig ? 'cut ∥ zigzag edge (0°)' : 'cut ∥ armchair edge (30°)', 10, 33);
    }
    function drawCells(theta, N) {
      var type = theta === 0 ? 'zigzag' : 'armchair';
      drawRibbonCell(cellCV, type, true, N);
    }

    // ── 2D top-down Brillouin zone with the cutting-line family ──
    function drawBZ(p) {
      var o = dpr(bzC), ctx = o.ctx, W = o.w, H = o.h;
      ctx.clearRect(0, 0, W, H);
      var cx = W/2, cy = H/2;
      var isZig = (p.theta === 0);
      var reduced = (zoneScheme === 'reduced');
      // Some armchair offsets run past the first zone; fit them in reduced view.
      var maxC = BZR;
      for (var li = 0; li < p.lines.length; li++)
        if (abs(p.lines[li].c) > maxC) maxC = abs(p.lines[li].c);
      // Zoom out (~2 BZR, or further if armchair offsets run past it) so the
      // neighbouring Γ points and 2nd-BZ boundary are visible in both schemes.
      var viewR = max(2.0*BZR, maxC);
      var sc = min(W, H) * 0.40 / viewR;
      function P(kx, ky) { return [cx + kx*sc, cy - ky*sc]; }

      ctx.fillStyle = '#a8a29e'; ctx.font = '600 11px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Cutting lines in the Brillouin zone', 8, 14);

      var Tint = isZig ? 1 : sqrt3;                    // axial period (a = 1)
      var kpar = PI / Tint;                            // 1-D BZ boundary at ±π/T
      var axdx = -p.ny, axdy = p.nx;                   // axis (k∥) direction
      var trdx = p.nx, trdy = p.ny;                    // transverse (k⊥) direction

      // Repeated-zone context (both schemes): the neighbouring reciprocal-lattice
      // Γ points, a faint 1st-BZ hexagon centred on each, and the 2nd-BZ boundary.
      var Gn = [[RB1x,RB1y], [-RB1x,-RB1y], [RB2x,RB2y], [-RB2x,-RB2y],
                [RB1x+RB2x,RB1y+RB2y], [-(RB1x+RB2x),-(RB1y+RB2y)]];
      ctx.strokeStyle = 'rgba(251,191,36,0.16)'; ctx.lineWidth = 1;
      for (var gi = 0; gi < Gn.length; gi++) {
        ctx.beginPath();
        for (var nb = 0; nb <= 6; nb++) {
          var ah = nb*PI/3, hp = P(Gn[gi][0] + BZR*cos(ah), Gn[gi][1] + BZR*sin(ah));
          if (nb === 0) ctx.moveTo(hp[0], hp[1]); else ctx.lineTo(hp[0], hp[1]);
        }
        ctx.closePath(); ctx.stroke();
      }
      // 2nd-BZ boundary = hexagon through the 6 nearest Γ (rotated 30°).
      ctx.strokeStyle = 'rgba(226,232,240,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var nb = 0; nb <= 6; nb++) {
        var ab = PI/6 + nb*PI/3, pb = P(sqrt3*BZR*cos(ab), sqrt3*BZR*sin(ab));
        if (nb === 0) ctx.moveTo(pb[0], pb[1]); else ctx.lineTo(pb[0], pb[1]);
      }
      ctx.closePath(); ctx.stroke();
      // neighbour Γ markers
      ctx.fillStyle = 'rgba(168,162,158,0.8)'; ctx.font = '600 8px "DM Sans", sans-serif';
      for (var gi = 0; gi < Gn.length; gi++) {
        var gp = P(Gn[gi][0], Gn[gi][1]);
        ctx.beginPath(); ctx.arc(gp[0], gp[1], 2, 0, 2*PI); ctx.fill();
        ctx.fillText('Γ', gp[0]+4, gp[1]+3);
      }

      // Central first BZ hexagon (the ribbon lives here).
      ctx.strokeStyle = 'rgba(251,191,36,0.6)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var n = 0; n <= 6; n++) {
        var ang = n*PI/3, pp = P(BZR*cos(ang), BZR*sin(ang));
        if (n === 0) ctx.moveTo(pp[0], pp[1]); else ctx.lineTo(pp[0], pp[1]);
      }
      ctx.closePath(); ctx.stroke();

      if (reduced) {
        // ── (A) Reduced / folded scheme ──
        // The ribbon is 1-D: the only zone boundaries are k∥ = ±π/T.  Each line
        // is drawn at its true transverse momentum over one period |k∥| ≤ π/T,
        // and the bulk Dirac points are folded along the axis into the strip —
        // a folded point sitting on a line ⇒ metallic.
        var ktrMax = maxC;
        ctx.strokeStyle = 'rgba(226,232,240,0.8)'; ctx.lineWidth = 1.3;
        ctx.setLineDash([5,4]);
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var b1 = P(sgn*kpar*axdx - ktrMax*trdx, sgn*kpar*axdy - ktrMax*trdy);
          var b2 = P(sgn*kpar*axdx + ktrMax*trdx, sgn*kpar*axdy + ktrMax*trdy);
          ctx.beginPath(); ctx.moveTo(b1[0],b1[1]); ctx.lineTo(b2[0],b2[1]); ctx.stroke();
        }
        ctx.setLineDash([]);
        for (var li = 0; li < p.lines.length; li++) {
          var L = p.lines[li];
          ctx.strokeStyle = colorFor(L.ci, p.N); ctx.lineWidth = 1.6;
          var a1 = P(L.c*trdx - kpar*axdx, L.c*trdy - kpar*axdy);
          var a2 = P(L.c*trdx + kpar*axdx, L.c*trdy + kpar*axdy);
          ctx.beginPath(); ctx.moveTo(a1[0],a1[1]); ctx.lineTo(a2[0],a2[1]); ctx.stroke();
        }
        ctx.fillStyle = '#fde68a';
        for (var n = 0; n < 6; n++) {
          var ang2 = n*PI/3, kc = BZR*cos(ang2), ks = BZR*sin(ang2);
          var kpa = kc*axdx + ks*axdy, kpe = kc*trdx + ks*trdy;
          kpa -= 2*kpar*Math.round(kpa/(2*kpar));      // fold along the axis only
          if (abs(kpe) > ktrMax + 1e-6) continue;
          var dp = P(kpa*axdx + kpe*trdx, kpa*axdy + kpe*trdy);
          ctx.beginPath(); ctx.arc(dp[0], dp[1], 3, 0, 2*PI); ctx.fill();
        }
      } else {
        // ── (B) Extended scheme ──
        // Lines drawn across the bulk BZ with umklapp folding (armchair offsets
        // run past the zone); Dirac points stay at the hexagon corners.
        var ext = 1.8*BZR, nseg = 420;
        for (var li = 0; li < p.lines.length; li++) {
          var L = p.lines[li];
          ctx.strokeStyle = colorFor(L.ci, p.N); ctx.lineWidth = 1.6;
          var bx = L.c*trdx, by = L.c*trdy, prevf = null;
          ctx.beginPath();
          for (var is = 0; is <= nseg; is++) {
            var s = -ext + 2*ext*is/nseg;
            var f = foldBZ(bx + s*axdx, by + s*axdy);
            var pf = P(f[0], f[1]);
            if (prevf && Math.hypot(f[0]-prevf[0], f[1]-prevf[1]) < 0.5)
              ctx.lineTo(pf[0], pf[1]);
            else ctx.moveTo(pf[0], pf[1]);
            prevf = f;
          }
          ctx.stroke();
        }
        ctx.fillStyle = '#fde68a';
        for (var n = 0; n < 6; n++) {
          var ang3 = n*PI/3, pc = P(BZR*cos(ang3), BZR*sin(ang3));
          ctx.beginPath(); ctx.arc(pc[0], pc[1], 3, 0, 2*PI); ctx.fill();
        }
      }

      // Γ
      var g = P(0, 0);
      ctx.beginPath(); ctx.arc(g[0], g[1], 2.2, 0, 2*PI);
      ctx.fillStyle = '#a8a29e'; ctx.fill();
      ctx.fillStyle = '#78716c'; ctx.font = '600 9px "DM Sans", sans-serif';
      ctx.textAlign = 'left'; ctx.fillText('Γ', g[0]+5, g[1]+3);

      // annotation per scheme
      var kperpRule = (isZig ? 'nπ' : '2nπ') + '/(N+1), n = 1…' + p.N;
      if (reduced) {
        ctx.setLineDash([5,4]); ctx.strokeStyle = 'rgba(226,232,240,0.8)';
        ctx.lineWidth = 1.2; ctx.beginPath();
        ctx.moveTo(8, H-21); ctx.lineTo(26, H-21); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#cbd5e1'; ctx.font = '600 9px "DM Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('reduced zone |k∥| ≤ π/T · Dirac points folded in', 30, H-18);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('cutting lines k⊥ = ' + kperpRule, 8, H-6);
      } else {
        ctx.fillStyle = '#cbd5e1'; ctx.font = '600 9px "DM Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('extended zone: umklapp-folded lines · Dirac at corners', 8, H-18);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('k⊥ = ' + kperpRule, 8, H-6);
      }

      // orientation readout
      var nm = p.theta === 0 ? 'zigzag' : p.theta === 30 ? 'armchair' : 'chiral';
      ctx.fillStyle = '#d6d3d1'; ctx.font = '600 10px "DM Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('θ = ' + p.theta + '°  ·  ' + nm, W-8, H-8);
    }

    // ── 3D band surface (same region as Module 02) + cutting lines ──
    var B1c = [2*PI, -2*PI/sqrt3], B2c = [0, 4*PI/sqrt3], UVc = 4/3;
    var CMN = 80, CMN_DRAG = 40;   // fine when settled · coarse while dragging
    var cutPhi = -32*PI/180, CUT_THETA = 58*PI/180, cutZoom = 1.7;
    var cutDrag = false, cutLastX = 0, cutLastY = 0;

    function lerpC(a, b, t) { return a + (b-a)*t; }
    function coneCol(e, eMax) {
      var t = max(-1, min(1, e/eMax)), r, g, b;
      if (t >= 0) { r = lerpC(254,220,t); g = lerpC(243,38,t); b = lerpC(199,38,t); }
      else { var u = -t; r = lerpC(207,37,u); g = lerpC(250,99,u); b = lerpC(254,235,u); }
      return [r,g,b];
    }
    var coneMeshes = {};
    function buildCone(N) {
      var cm = coneMeshes[N];
      if (cm && cm.t === tHop) return cm;
      var verts = [];
      for (var i = 0; i <= N; i++) {
        for (var j = 0; j <= N; j++) {
          var u = -UVc + 2*UVc*i/N, v = -UVc + 2*UVc*j/N;
          var kx = u*B1c[0] + v*B2c[0], ky = u*B1c[1] + v*B2c[1];
          verts.push({kx:kx, ky:ky, ep:bandE(kx, ky)});
        }
      }
      var faces = [];
      for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
          var idx = i*(N+1)+j, q = [idx, idx+1, idx+N+2, idx+N+1];
          var cx = 0, cy = 0;
          for (var k = 0; k < 4; k++) { cx += verts[q[k]].kx; cy += verts[q[k]].ky; }
          if (insideHexRc(cx/4, cy/4, R_out)) {
            faces.push({v:q, band:1}); faces.push({v:q, band:-1});
          }
        }
      }
      cm = {verts:verts, faces:faces, t:tHop};
      coneMeshes[N] = cm;
      return cm;
    }

    function drawCone(p) {
      // Coarse mesh while dragging/pinching, fine mesh when settled.
      var mesh = buildCone(cutDrag ? CMN_DRAG : CMN);
      var o = dpr(cutC, 1.5), ctx = o.ctx, W = o.w, H = o.h;
      ctx.clearRect(0, 0, W, H);
      var verts = mesh.verts, faces = mesh.faces;
      var eMax = 3 * tHop;

      var cosT = cos(CUT_THETA), sinT = sin(CUT_THETA);
      var cosP = cos(cutPhi), sinP = sin(cutPhi);
      var kSc = 0.92/R_out, eSc = 0.52/eMax;
      var vSc = min(W,H) * 0.40 * cutZoom;
      var Lx=0.35, Ly=0.55, Lz=0.75;
      var Lm = sqrt(Lx*Lx+Ly*Ly+Lz*Lz); Lx/=Lm; Ly/=Lm; Lz/=Lm;

      function proj(kx, ky, e) {
        var x=kx*kSc, y=ky*kSc, z=e*eSc;
        var x1=x*cosP-y*sinP, y1=x*sinP+y*cosP;
        var y2=y1*cosT+z*sinT, z2=z*cosT-y1*sinT;
        return {sx:W/2+x1*vSc, sy:H/2-y2*vSc, depth:z2, x2:x1, y2:y2, z2:z2};
      }

      var draws = [];

      for (var fi = 0; fi < faces.length; fi++) {
        var f = faces[fi], q = f.v, band = f.band, ps = [];
        for (var k = 0; k < 4; k++) { var vv = verts[q[k]]; ps.push(proj(vv.kx, vv.ky, band*vv.ep)); }
        var ax=ps[2].x2-ps[0].x2, ay=ps[2].y2-ps[0].y2, az=ps[2].z2-ps[0].z2;
        var bx=ps[3].x2-ps[1].x2, by=ps[3].y2-ps[1].y2, bz=ps[3].z2-ps[1].z2;
        var nx=ay*bz-az*by, ny=az*bx-ax*bz, nz=ax*by-ay*bx;
        var nm=sqrt(nx*nx+ny*ny+nz*nz)||1;
        var ndl=abs((nx*Lx+ny*Ly+nz*Lz)/nm);
        var bright=0.34+0.66*ndl;
        var eAvg=band*(verts[q[0]].ep+verts[q[1]].ep+verts[q[2]].ep+verts[q[3]].ep)/4;
        draws.push({t:0, p:ps,
          depth:(ps[0].depth+ps[1].depth+ps[2].depth+ps[3].depth)/4,
          e:eAvg, bright:bright});
      }

      // Cutting lines at constant k·n, traced along the surface in both bands.
      var lines = p.lines, ltx = -p.ny, lty = p.nx, lext = 1.35*R_out, LS = 90;
      for (var li = 0; li < lines.length; li++) {
        var L = lines[li];
        var col = colorFor(L.ci, p.N);
        var lw = 1.8;
        var bx = L.c*p.nx, by = L.c*p.ny;
        for (var band = -1; band <= 1; band += 2) {
          var prev = null;
          for (var si = 0; si <= LS; si++) {
            var s = -lext + 2*lext*si/LS, kx = bx+s*ltx, ky = by+s*lty;
            if (!insideHexRc(kx, ky, R_out)) { prev = null; continue; }
            var pt = proj(kx, ky, band*bandE(kx, ky));
            if (prev) draws.push({t:1, p1:prev, p2:pt,
              depth:(prev.depth+pt.depth)/2 + 0.0015, col:col, lw:lw});
            prev = pt;
          }
        }
      }

      draws.sort(function(a,b){ return a.depth - b.depth; });

      for (var i = 0; i < draws.length; i++) {
        var d = draws[i];
        if (d.t === 0) {
          var c = coneCol(d.e, eMax);
          var r = min(255, c[0]*d.bright)|0, g = min(255, c[1]*d.bright)|0, bl = min(255, c[2]*d.bright)|0;
          ctx.fillStyle = 'rgba('+r+','+g+','+bl+',0.6)';   // semi-transparent surface
          ctx.beginPath();
          ctx.moveTo(d.p[0].sx, d.p[0].sy);
          ctx.lineTo(d.p[1].sx, d.p[1].sy);
          ctx.lineTo(d.p[2].sx, d.p[2].sy);
          ctx.lineTo(d.p[3].sx, d.p[3].sy);
          ctx.closePath(); ctx.fill();
        } else {
          ctx.strokeStyle = d.col; ctx.lineWidth = d.lw;
          ctx.beginPath(); ctx.moveTo(d.p1.sx, d.p1.sy); ctx.lineTo(d.p2.sx, d.p2.sy); ctx.stroke();
        }
      }

      // GNR first Brillouin-zone boundary: the ribbon zone is 1-D, so its edges
      // are the two lines k∥ = ±π/T (perpendicular to the ribbon axis), drawn at
      // E = 0 across the surface — NOT graphene's 2-D hexagon.
      var gaxx = -p.ny, gaxy = p.nx, gtrx = p.nx, gtry = p.ny;
      var gkpar = PI / (p.theta === 0 ? 1 : sqrt3);
      ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(251,191,36,0.9)';
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        var bxg = sgn*gkpar*gaxx, byg = sgn*gkpar*gaxy, prevg = false;
        ctx.beginPath();
        for (var sg = -1.35*R_out; sg <= 1.35*R_out; sg += R_out/120) {
          var kxx = bxg + sg*gtrx, kyy = byg + sg*gtry;
          if (!insideHexRc(kxx, kyy, R_out)) { prevg = false; continue; }
          var gpp = proj(kxx, kyy, 0);
          if (prevg) ctx.lineTo(gpp.sx, gpp.sy); else ctx.moveTo(gpp.sx, gpp.sy);
          prevg = true;
        }
        ctx.stroke();
      }

      for (var n = 0; n < 6; n++) {
        var ang = n*PI/3, dpm = proj(BZR*cos(ang), BZR*sin(ang), 0);
        ctx.beginPath(); ctx.arc(dpm.sx, dpm.sy, 2.5, 0, 2*PI);
        ctx.fillStyle = '#fde68a'; ctx.fill();
      }

      ctx.fillStyle = '#a8a29e'; ctx.font = '600 10px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Cutting lines on the band surface', 6, 13);
    }

    // ── Pointer interaction (drag-rotate + scroll/pinch zoom) ──
    var cutDirty = true;
    var cutPointers = {}, cutPinch = 0;
    function cutActive() { return Object.keys(cutPointers).length; }
    cutC.style.cursor = 'grab';
    cutC.style.touchAction = 'none';
    cutC.addEventListener('pointerdown', function(e) {
      cutPointers[e.pointerId] = {x:e.clientX, y:e.clientY};
      cutDrag = true; cutLastX = e.clientX; cutLastY = e.clientY;
      cutC.setPointerCapture(e.pointerId);
      cutC.style.cursor = 'grabbing';
    });
    cutC.addEventListener('pointermove', function(e) {
      if (!cutPointers[e.pointerId]) return;
      cutPointers[e.pointerId] = {x:e.clientX, y:e.clientY};
      if (cutActive() >= 2) {
        var ids = Object.keys(cutPointers);
        var a = cutPointers[ids[0]], b = cutPointers[ids[1]];
        var dist = Math.hypot(a.x-b.x, a.y-b.y);
        if (cutPinch) { cutZoom = max(0.5, min(3, cutZoom * dist/cutPinch)); cutDirty = true; }
        cutPinch = dist;
        return;
      }
      cutPhi += (e.clientX - cutLastX) * 0.008;
      CUT_THETA = max(0.12, min(PI/2-0.02, CUT_THETA - (e.clientY - cutLastY)*0.008));
      cutLastX = e.clientX; cutLastY = e.clientY;
      cutDirty = true;
    });
    function endCutPointer(e) {
      delete cutPointers[e.pointerId];
      if (cutActive() < 2) cutPinch = 0;
      if (cutActive() === 0) { cutDrag = false; cutC.style.cursor = 'grab'; cutDirty = true; }
    }
    cutC.addEventListener('pointerup', endCutPointer);
    cutC.addEventListener('pointercancel', endCutPointer);
    cutC.addEventListener('wheel', function(e) {
      e.preventDefault();
      cutZoom = max(0.5, min(3, cutZoom * (e.deltaY < 0 ? 1.08 : 0.926)));
      cutDirty = true;
    }, {passive:false});

    // ── Real GNR band structure (hard-wall edges) ──
    //
    // A nanoribbon has actual edges, so the correct boundary condition is the
    // open / hard-wall one (the wavefunction vanishes on the missing sites just
    // beyond each edge), NOT the periodic condition that the zone-folding
    // cutting lines assume.  The two disagree dramatically for zigzag, where the
    // hard wall produces the flat E≈0 edge band that folding cannot capture.
    // The bands below come from diagonalising the actual ribbon Hamiltonian and
    // are plotted along the ribbon's own 1D path Γ→X (armchair) / Γ→Z (zigzag).

    // Eigenvalues of a real symmetric tridiagonal matrix (QL w/ implicit shifts,
    // values only).  d[0..n-1] diagonal (overwritten), e[1..n-1] sub-diagonal.
    function triEig(d, e, n) {
      var E = new Array(n);
      for (var i = 1; i < n; i++) E[i-1] = e[i];
      E[n-1] = 0;
      for (var l = 0; l < n; l++) {
        var iter = 0, m;
        do {
          for (m = l; m < n-1; m++) {
            var dd = abs(d[m]) + abs(d[m+1]);
            if (abs(E[m]) <= 1e-14 * dd) break;
          }
          if (m !== l) {
            if (iter++ === 60) break;
            var g = (d[l+1] - d[l]) / (2*E[l]);
            var r = Math.hypot(g, 1);
            g = d[m] - d[l] + E[l] / (g + (g >= 0 ? abs(r) : -abs(r)));
            var s = 1, c = 1, pp = 0, i2;
            for (i2 = m-1; i2 >= l; i2--) {
              var f = s*E[i2], b = c*E[i2];
              r = Math.hypot(f, g);
              E[i2+1] = r;
              if (r === 0) { d[i2+1] -= pp; E[m] = 0; break; }
              s = f/r; c = g/r;
              g = d[i2+1] - pp;
              r = (d[i2] - g)*s + 2*c*b;
              pp = s*r;
              d[i2+1] = g + pp;
              g = c*r - b;
            }
            if (r === 0 && i2 >= l) continue;
            d[l] -= pp; E[l] = g; E[m] = 0;
          }
        } while (m !== l);
      }
      return d;
    }

    // Zigzag GNR: bipartite trick E = ±σ, σ = singular values of the N×N
    // sub→super coupling h(k).  M = hh† is tridiagonal with diagonal
    // {c², 1+c², …, 1+c²} and off-diagonal c, where c = 2cos(k/2).  k ∈ [0,π].
    function zgnrE(N, k) {
      var c = 2*cos(k/2), c2 = c*c;
      var d = new Array(N), e = new Array(N);
      for (var i = 0; i < N; i++) d[i] = (i === 0 ? c2 : 1 + c2);
      e[0] = 0; for (var j = 1; j < N; j++) e[j] = c;
      triEig(d, e, N);
      d.sort(function (a, b) { return a - b; });
      var out = new Array(N);
      for (var i = 0; i < N; i++) out[i] = tHop * sqrt(max(0, d[i]));
      return out;            // N non-negative energies; bands are ±out
    }

    // Armchair GNR: exact hard-wall closed form, computed per transverse mode
    // p_n = nπ/(N+1) inline in drawSubbands so each subband keeps its own
    // identity (and colour); E_n = ±t√(1 + 4cos p_n cos(√3k/2) + 4cos²p_n).

    // Armchair half-gap (min positive band, at k=0); 0 ⇔ metallic (N=3m+2).
    function agnrGap(N) {
      var g = Infinity;
      for (var n = 1; n <= N; n++) {
        var v = abs(1 + 2*cos(n*PI/(N+1)));
        if (v < g) g = v;
      }
      return tHop * g;
    }

    // ── 1D subband dispersion along the ribbon's own Brillouin zone ──
    function drawSubbands(p) {
      var o = dpr(bandC), ctx = o.ctx, W = o.w, H = o.h;
      ctx.clearRect(0, 0, W, H);

      var isZig = (p.theta === 0), N = p.N;
      var kMax = isZig ? PI : PI/sqrt3;          // Z = π (zig) · X = π/√3 (arm)
      var metallic = isZig ? true : (N % 3 === 2);
      var NSAMP = 240;

      // Sample the ribbon bands across the full first 1D Brillouin zone, but
      // keep one continuous curve PER transverse mode (not per energy rank), so
      // each subband can be coloured to match its own cutting line.
      //  · armchair: mode n ⇒ p_n = nπ/(N+1) is an exact subband (bulk energy
      //    along cutting line n) — an exact one-to-one match.
      //  · zigzag: the exact hard-wall bands are used (edge states included);
      //    curves are ordered low→high so curve i pairs with the i-th cutting
      //    line by gap rank.
      var ks = [], curves = [], maxE = 0.001, gMin = Infinity;
      for (var m = 0; m < N; m++) curves.push(new Array(NSAMP + 1));
      for (var i = 0; i <= NSAMP; i++) {
        var k = -kMax + 2*kMax*i/NSAMP;
        ks.push(k);
        if (isZig) {
          var b = zgnrE(N, abs(k));               // sorted low→high
          for (var m = 0; m < N; m++) curves[m][i] = b[m];
        } else {
          var ck = cos(sqrt3 * abs(k) / 2);
          for (var m = 1; m <= N; m++) {
            var cp = cos(m*PI/(N+1));
            curves[m-1][i] = tHop * sqrt(max(0, 1 + 4*cp*ck + 4*cp*cp));
          }
        }
        for (var m = 0; m < N; m++) {
          if (curves[m][i] > maxE) maxE = curves[m][i];
          if (curves[m][i] < gMin) gMin = curves[m][i];
        }
      }
      maxE *= 1.08;

      // gap (min |E|) per curve → colour rank, matching the cutting-line ranks.
      var order = [];
      for (var m = 0; m < N; m++) {
        var gm = Infinity;
        for (var i = 0; i <= NSAMP; i++) if (curves[m][i] < gm) gm = curves[m][i];
        order.push({ m: m, gap: gm });
      }
      order.sort(function (a, b) { return a.gap - b.gap; });
      var colIdx = new Array(N);
      for (var r = 0; r < N; r++) colIdx[order[r].m] = r;

      var pad = {l:46, r:16, t:18, b:36};
      var pw = W-pad.l-pad.r, ph = H-pad.t-pad.b;
      function sx(k) { return pad.l + (k+kMax)/(2*kMax)*pw; }
      function sy(e) { return pad.t + (1-(e+maxE)/(2*maxE))*ph; }

      // grids
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
      var step = parseFloat((maxE/3).toPrecision(1));
      if (step < 0.1) step = 0.1;
      for (var e = -maxE; e <= maxE+0.01; e += step) {
        if (abs(e) < step*0.05) continue;
        ctx.beginPath(); ctx.moveTo(pad.l, sy(e)); ctx.lineTo(pad.l+pw, sy(e)); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(pad.l+pw, sy(0)); ctx.stroke();

      // zone-centre (Γ) marker
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx(0), pad.t); ctx.lineTo(sx(0), pad.t+ph); ctx.stroke();

      // Dirac projection / edge-state onset marker (zigzag: k = ±2π/3).
      if (isZig) {
        var kK = 2*PI/3;
        ctx.strokeStyle = 'rgba(52,211,153,0.35)'; ctx.setLineDash([4,3]); ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx(kK), pad.t); ctx.lineTo(sx(kK), pad.t+ph);
        ctx.moveTo(sx(-kK), pad.t); ctx.lineTo(sx(-kK), pad.t+ph);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(52,211,153,0.85)'; ctx.font = '600 9px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('edge states', (sx(kK)+sx(kMax))/2, pad.t+11);
      }

      // subbands: each curve coloured to match its own cutting line.
      for (var m = 0; m < N; m++) {
        ctx.strokeStyle = colorFor(colIdx[m], N); ctx.lineWidth = 1.6;
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          ctx.beginPath();
          for (var i = 0; i <= NSAMP; i++) {
            var x = sx(ks[i]), y = sy(sgn*curves[m][i]);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // gap markers (semiconducting armchair)
      if (!metallic) {
        ctx.strokeStyle = 'rgba(251,191,36,0.45)'; ctx.setLineDash([3,3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, sy(gMin)); ctx.lineTo(pad.l+pw, sy(gMin));
        ctx.moveTo(pad.l, sy(-gMin)); ctx.lineTo(pad.l+pw, sy(-gMin)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fbbf24'; ctx.font = '600 10px "DM Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Eg = ' + (2*gMin).toFixed(2) + ' eV', pad.l+pw-80, sy(0)-4);
      }

      // axes labels
      ctx.save(); ctx.translate(12, pad.t+ph/2); ctx.rotate(-PI/2);
      ctx.fillStyle = '#78716c'; ctx.font = '500 10px "DM Sans", sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('E (eV)', 0, 0); ctx.restore();

      ctx.textAlign = 'right'; ctx.font = '500 9px "DM Sans", sans-serif';
      ctx.fillStyle = '#a8a29e';
      for (var e = -maxE; e <= maxE+0.01; e += step) {
        if (abs(e) < step*0.05) continue;
        ctx.fillText(e.toFixed(1), pad.l-5, sy(e)+3);
      }
      ctx.fillStyle = '#d6d3d1'; ctx.fillText('0', pad.l-5, sy(0)+3);

      // high-symmetry points across the full first 1D BZ: −Z … Γ … Z
      ctx.font = '600 11px "DM Sans", sans-serif'; ctx.textAlign = 'center';
      var yHSP = pad.t + ph + 15;
      var zb = isZig ? 'Z' : 'X';
      ctx.fillStyle = '#d6d3d1';
      ctx.fillText('−' + zb, sx(-kMax), yHSP);
      ctx.fillText('Γ', sx(0), yHSP);
      ctx.fillText(zb, sx(kMax), yHSP);
      ctx.fillStyle = '#57534e'; ctx.font = '500 9px "DM Sans", sans-serif';
      ctx.fillText(isZig ? 'zigzag GNR · k∥ along ribbon axis · first BZ −Z→Z  (T = a)'
                         : 'armchair GNR · k∥ along ribbon axis · first BZ −X→X  (T = √3 a)',
                   pad.l+pw/2, H-4);

      // 1D Brillouin-zone length = 2π/T.  It is fixed by the edge type
      // (the axial repeat T), NOT by the ribbon width N — increasing N only
      // adds more subbands, it never rescales the zone.
      var aPhys = 2.46;                      // graphene lattice constant (Å)
      var bzLen = (2 * kMax / aPhys);        // full 1D BZ length (Å⁻¹)
      ctx.textAlign = 'right'; ctx.font = '600 9px "DM Sans", sans-serif';
      ctx.fillStyle = '#a8a29e';
      ctx.fillText('1D BZ = 2π/T = ' + bzLen.toFixed(2) + ' Å⁻¹', pad.l+pw, pad.t+10);
      ctx.fillStyle = '#78716c'; ctx.font = '500 8px "DM Sans", sans-serif';
      ctx.fillText('(set by edge, independent of N)', pad.l+pw, pad.t+21);

      ctx.textAlign = 'left'; ctx.font = '600 10px "DM Sans", sans-serif';
      ctx.fillStyle = '#ef4444'; ctx.fillText('π*', pad.l+4, sy(maxE*0.7));
      ctx.fillStyle = '#3b82f6'; ctx.fillText('π', pad.l+4, sy(-maxE*0.7));
    }

    // ── Render loop (dirty-flag only) ──
    var curP = null, prevT = tHop;
    function cutFrame() {
      if (tHop !== prevT) { prevT = tHop; coneMeshes = {}; cutDirty = true; if (curP) drawSubbands(curP); }
      if (cutDirty && curP) { drawCone(curP); cutDirty = false; }
      requestAnimationFrame(cutFrame);
    }

    function typeName(t) { return t === 0 ? 'zigzag' : t === 30 ? 'armchair' : 'chiral'; }

    function update() {
      var theta = curTheta, N = +wSlider.value;
      curP = ribbon(theta, N);
      var nm = typeName(theta);
      if (aVal) aVal.textContent = nm + ' · θ = ' + theta + '°';
      wVal.textContent = N;
      btnZ.classList.toggle('active', theta === 0);
      btnA.classList.toggle('active', theta === 30);
      btnWDec.disabled = (N <= +wSlider.min);
      btnWInc.disabled = (N >= +wSlider.max);
      drawCells(theta, N);
      drawBZ(curP);
      drawSubbands(curP);
      cutDirty = true;        // surface mesh is ribbon-independent; just redraw

      var isZig = (theta === 0);
      var metallic = isZig ? true : (N % 3 === 2);
      var gapHalf = isZig ? 0 : agnrGap(N);
      var nmC = nm.charAt(0).toUpperCase() + nm.slice(1);
      var tag = metallic
        ? '<b style="color:#6ee7b7">Metallic</b> — a band reaches the Fermi level (zero gap).'
        : '<b style="color:#fbbf24">Semiconducting</b> — the lowest subband opens a gap E<sub>g</sub> ≈ '
          + (2*gapHalf).toFixed(2) + ' eV at Γ.';
      var bc = ' Hard-wall BC: ' + N + ' transverse modes n = 1…' + N +
               ' (k<sub>⊥</sub> = ' + (isZig ? 'nπ' : '2nπ') + '/(' + N + '+1))' +
               ' — the wavefunction vanishes at missing atom sites beyond each edge.';
      var detail = isZig
        ? ' Zigzag ribbons carry <b style="color:#6ee7b7">edge states</b> — a flat E≈0 band for ' +
          'k between 2π/3 and Z — so they are always metallic (hard-wall edges, ' +
          'invisible to zone-folding).'
        : ' Armchair ribbons are metallic only when <b>N = 3m+2</b>; the gap closes at Γ.';
      var Ndesc = isZig ? N + ' chains' : N;
      classDiv.innerHTML = '<b>' + nmC + '</b>, θ = ' + theta + '°, N = ' + Ndesc + ': ' + tag + bc + detail;
    }

    function setSliderRange(isZig) {
      if (isZig) { wSlider.min = 2; wSlider.max = 10; }
      else       { wSlider.min = 3; wSlider.max = 20; }
      var v = +wSlider.value;
      if (v < +wSlider.min) wSlider.value = wSlider.min;
      if (v > +wSlider.max) wSlider.value = wSlider.max;
    }
    wSlider.addEventListener('input', update);
    btnZ.addEventListener('click', function () { curTheta = 0;  setSliderRange(true);  update(); });
    btnA.addEventListener('click', function () { curTheta = 30; setSliderRange(false); update(); });
    function stepWidth(d) {
      var v = max(+wSlider.min, min(+wSlider.max, (+wSlider.value) + d));
      wSlider.value = v; update();
    }
    btnWDec.addEventListener('click', function () { stepWidth(-1); });
    btnWInc.addEventListener('click', function () { stepWidth(+1); });
    if (btnZoneR && btnZoneE) {
      btnZoneR.addEventListener('click', function () {
        zoneScheme = 'reduced';
        btnZoneR.classList.add('active'); btnZoneE.classList.remove('active');
        if (curP) drawBZ(curP);
      });
      btnZoneE.addEventListener('click', function () {
        zoneScheme = 'extended';
        btnZoneE.classList.add('active'); btnZoneR.classList.remove('active');
        if (curP) drawBZ(curP);
      });
    }
    window.addEventListener('resize', function () { cutDirty = true; update(); });
    setSliderRange(curTheta === 0);
    update();
    requestAnimationFrame(cutFrame);
  })();
})();
