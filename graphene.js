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

  function dpr(canvas) {
    var r = window.devicePixelRatio || 1;
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
  })();

  // ================================================================
  //  Module 01 — E-k band structure along Γ-M-K-Γ
  // ================================================================
  var drawBands;
  (function () {
    var canvas = document.getElementById('c-bands');
    var hopSlider = document.getElementById('ctrl-hop');
    var hopVal = document.getElementById('v-hop');

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

    hopSlider.addEventListener('input', function () {
      tHop = +hopSlider.value;
      hopVal.textContent = tHop.toFixed(2) + ' eV';
      drawBands();
      if (typeof render3D === 'function') {
        document.getElementById('v-hop3d').textContent = tHop.toFixed(2) + ' eV';
        document.getElementById('ctrl-hop3d').value = tHop;
        render3D();
      }
    });

    drawBands();
  })();

  // ================================================================
  //  Module 02 — 3D Band Structure
  // ================================================================
  var render3D;
  (function () {
    var canvas = document.getElementById('c-3d');
    var hop3dSlider = document.getElementById('ctrl-hop3d');
    var hop3dVal = document.getElementById('v-hop3d');
    var btnReset = document.getElementById('btn-reset');
    var btnWire = document.getElementById('btn-wire');
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
      var o = dpr(canvas), ctx = o.ctx, W = o.w, H = o.h;
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
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + bl + ')';
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
    var IDLE_N = 96, DRAG_N = 48;   // multiples of 8 → K points stay exact
    var dirty = true, dragging = false;
    function frame() {
      if (autoRotate && !dragging) { phi += 0.0045; dirty = true; }
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
    hop3dSlider.addEventListener('input', function () {
      tHop = +hop3dSlider.value;
      hop3dVal.textContent = tHop.toFixed(2) + ' eV';
      document.getElementById('v-hop').textContent = tHop.toFixed(2) + ' eV';
      document.getElementById('ctrl-hop').value = tHop;
      drawBands();
      dirty = true;
    });
    btnReset.addEventListener('click', function () {
      theta = DEF_THETA; phi = DEF_PHI; zoom = DEF_ZOOM; dirty = true;
    });
    btnWire.addEventListener('click', function () {
      showWire = !showWire;
      btnWire.classList.toggle('active', showWire);
      dirty = true;
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
  //  Zone-folding of armchair GNR: allowed transverse modes are
  //  kx_q = 2qπ/(N+1) for q = 1…N.  Metallicity is NOT an input —
  //  it emerges when kx_q coincides with a K point (kx = 4π/3).
  //  That requires q = 2(N+1)/3 to be an integer → N = 3m+2.
  //  Cutting lines are VERTICAL (constant kx) on the BZ.
  // ================================================================
  (function () {
    var realC = document.getElementById('c-gnr-real');
    var cutC  = document.getElementById('c-gnr-cut');
    var bandC = document.getElementById('c-gnr-bands');
    var slider = document.getElementById('ctrl-width');
    var wval = document.getElementById('v-width');
    var classDiv = document.getElementById('gnr-class');
    if (!realC) return;

    var SUB = ['#fbbf24','#fb923c','#f87171','#c084fc','#60a5fa','#34d399',
               '#f472b6','#a3e635','#22d3ee'];

    // Minimum of the band energy along a whole vertical cutting line (over k∥).
    // f² = 3 + 2cos(kx) + 4cos(kx/2)·cos(k∥√3/2); the cos(k∥√3/2) term reaches
    // −sign(cos(kx/2)) somewhere on the line, so the minimum is
    //   t·√(max(0, 3 + 2cos(kx) − 4|cos(kx/2)|)).
    // This is what matters physically: a line is gapless when it passes through
    // ANY Dirac point — including the OFF-AXIS ones at (2π/3, ±2π/√3), which a
    // naïve check at k∥=0 would miss entirely.
    function lineGap(kx) {
      var v = 3 + 2*cos(kx) - 4*abs(cos(kx/2));
      return tHop * sqrt(max(0, v));
    }

    // ── GNR parameters derived solely from width N ──
    function gnrParams(N) {
      var dk = 2*PI / (N + 1);
      // Find the cutting line closest to a Dirac point — metallicity is a RESULT.
      var minGap = Infinity, qNearest = 1;
      for (var q = 1; q <= N; q++) {
        var g = lineGap(q * dk);
        if (g < minGap) { minGap = g; qNearest = q; }
      }
      var metallic = minGap < 1e-9;
      return { N:N, dk:dk, metallic:metallic, gapE:minGap, qNearest:qNearest };
    }

    // All allowed vertical cutting-line kx positions within the visual range.
    // Physical modes are q = 1…N within each period (N+1).  Equivalently,
    // all integer n EXCEPT multiples of (N+1) (those are the excluded modes).
    function cutLines(p) {
      var out = [], M = p.N + 1;
      for (var n = -120; n <= 120; n++) {
        if (n % M === 0) continue;
        var kx = n * p.dk;
        if (abs(kx) > R_out + 0.1) continue;
        var g = lineGap(kx);
        out.push({kx:kx, gap:g, near:g < p.gapE + 1e-6});
      }
      return out;
    }

    // Select modes for the subband plot (8 closest to a Dirac point).
    function subModes(p) {
      var modes = [];
      for (var q = 1; q <= p.N; q++)
        modes.push({q:q, kx:q*p.dk, gap:lineGap(q*p.dk)});
      modes.sort(function(a,b){ return a.gap - b.gap; });
      return modes.slice(0, min(8, p.N));
    }

    // ── Standing-wave modes ──
    function drawReal() {
      var o = dpr(realC), ctx = o.ctx, W = o.w, H = o.h;
      ctx.clearRect(0, 0, W, H);
      var modes = 3;
      var padL = 30, padR = 16, padT = 22, padB = 18;
      var boxL = padL, boxR = W - padR, boxW = boxR - boxL;
      var laneH = (H - padT - padB) / modes;

      ctx.font = '600 11px "DM Sans", sans-serif';
      ctx.fillStyle = '#a8a29e'; ctx.textAlign = 'left';
      ctx.fillText('Confined modes  ψ_q ∝ sin(qπx/W)', boxL, 14);

      for (var n = 1; n <= modes; n++) {
        var midY = padT + laneH * (n - 0.5);
        var amp = laneH * 0.32;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(boxL, midY - laneH*0.42); ctx.lineTo(boxL, midY + laneH*0.42);
        ctx.moveTo(boxR, midY - laneH*0.42); ctx.lineTo(boxR, midY + laneH*0.42); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.moveTo(boxL, midY); ctx.lineTo(boxR, midY); ctx.stroke();
        ctx.strokeStyle = SUB[n-1]; ctx.lineWidth = 2;
        ctx.beginPath();
        for (var s = 0; s <= 60; s++) {
          var f = s / 60, x = boxL + f * boxW, y = midY - amp * sin(n*PI*f);
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = SUB[n-1]; ctx.textAlign = 'left';
        ctx.fillText('q=' + n, 4, midY + 4);
      }
    }

    // ── 3D band surface (same region as Module 02) + vertical cutting lines ──
    var R_out = BZR * 1.62;
    var B1c = [2*PI, -2*PI/sqrt3], B2c = [0, 4*PI/sqrt3], UVc = 4/3;
    var CMN = 40;
    var cutPhi = -32*PI/180, CUT_THETA = 38*PI/180, cutZoom = 1;
    var cutDrag = false, cutLastX = 0, cutLastY = 0;

    function lerpC(a, b, t) { return a + (b-a)*t; }
    function coneCol(e, eMax) {
      var t = max(-1, min(1, e/eMax)), r, g, b;
      if (t >= 0) { r = lerpC(254,220,t); g = lerpC(243,38,t); b = lerpC(199,38,t); }
      else { var u = -t; r = lerpC(207,37,u); g = lerpC(250,99,u); b = lerpC(254,235,u); }
      return [r,g,b];
    }
    function insideHexRc(kx, ky, R) {
      var ap = R*sqrt3/2;
      for (var n = 0; n < 6; n++) {
        var ang = PI/6 + n*PI/3;
        if (cos(ang)*kx + sin(ang)*ky > ap + 1e-6) return false;
      }
      return true;
    }

    var coneMesh = null, coneT = null;
    function buildCone() {
      if (coneMesh && coneT === tHop) return;
      var N = CMN, verts = [];
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
      coneMesh = {verts:verts, faces:faces};
      coneT = tHop;
    }

    function drawCone(p) {
      buildCone();
      var o = dpr(cutC), ctx = o.ctx, W = o.w, H = o.h;
      ctx.clearRect(0, 0, W, H);
      var verts = coneMesh.verts, faces = coneMesh.faces;
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

      ctx.lineWidth = 1; ctx.setLineDash([4,3]);
      ctx.strokeStyle = 'rgba(251,191,36,0.30)';
      ctx.beginPath();
      for (var n = 0; n <= 6; n++) {
        var ang = n*PI/3, pp = proj(BZR*cos(ang), BZR*sin(ang), 0);
        if (n === 0) ctx.moveTo(pp.sx, pp.sy); else ctx.lineTo(pp.sx, pp.sy);
      }
      ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);

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

      // VERTICAL cutting lines at constant kx, traced along ky on the surface.
      var lines = cutLines(p);
      var LS = 60;
      for (var li = 0; li < lines.length; li++) {
        var kxF = lines[li].kx;
        var isNear = lines[li].near;
        var col = isNear ? (p.metallic ? '#34d399' : '#fbbf24') : 'rgba(147,197,253,0.7)';
        var lw = isNear ? 2.6 : 0.8;
        for (var band = -1; band <= 1; band += 2) {
          var prev = null;
          for (var s = 0; s <= LS; s++) {
            var ky = -R_out + 2*R_out*s/LS;
            if (!insideHexRc(kxF, ky, R_out)) { prev = null; continue; }
            var pt = proj(kxF, ky, band*bandE(kxF, ky));
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
          ctx.fillStyle = 'rgb('+r+','+g+','+bl+')';
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
      if (cutActive() === 0) { cutDrag = false; cutC.style.cursor = 'grab'; }
    }
    cutC.addEventListener('pointerup', endCutPointer);
    cutC.addEventListener('pointercancel', endCutPointer);
    cutC.addEventListener('wheel', function(e) {
      e.preventDefault();
      cutZoom = max(0.5, min(3, cutZoom * (e.deltaY < 0 ? 1.08 : 0.926)));
      cutDirty = true;
    }, {passive:false});

    // ── 1D subbands E_q(k∥) = ±bandE(kx_q, k∥) ──
    function drawSubbands(p) {
      var o = dpr(bandC), ctx = o.ctx, W = o.w, H = o.h;
      ctx.clearRect(0, 0, W, H);

      var modes = subModes(p);
      // Span the full BZ height so the OFF-AXIS Dirac points at k∥ = ±2π/√3
      // are visible — a line through them is gapless just like one through the
      // on-axis K point at k∥ = 0.  Matches the extent of the 3D cutting lines.
      var kyR = 2*PI/sqrt3 + 0.35;
      var NSAMP = 240;
      var maxE = 0.001;
      for (var mi = 0; mi < modes.length; mi++) {
        for (var s = 0; s <= NSAMP; s++) {
          var ky = -kyR + 2*kyR*s/NSAMP;
          var e = bandE(modes[mi].kx, ky);
          if (e > maxE) maxE = e;
        }
      }
      maxE *= 1.08;

      var pad = {l:46, r:16, t:18, b:28};
      var pw = W-pad.l-pad.r, ph = H-pad.t-pad.b;
      function sx(ky) { return pad.l + (ky+kyR)/(2*kyR)*pw; }
      function sy(e) { return pad.t + (1-(e+maxE)/(2*maxE))*ph; }

      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
      var step = parseFloat((maxE/3).toPrecision(1));
      if (step < 0.1) step = 0.1;
      for (var e = -maxE; e <= maxE+0.01; e += step) {
        if (abs(e) < step*0.05) continue;
        ctx.beginPath(); ctx.moveTo(pad.l, sy(e)); ctx.lineTo(pad.l+pw, sy(e)); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(pad.l+pw, sy(0)); ctx.stroke();

      for (var mi = modes.length-1; mi >= 0; mi--) {
        var m = modes[mi];
        var isFirst = (mi === 0);
        var col = isFirst ? (p.metallic ? '#34d399' : '#fbbf24') : SUB[min(SUB.length-1, mi)];
        ctx.strokeStyle = col;
        ctx.lineWidth = isFirst ? 2.2 : 1.3;
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          ctx.beginPath();
          var started = false;
          for (var s = 0; s <= NSAMP; s++) {
            var ky = -kyR + 2*kyR*s/NSAMP;
            var e = sgn * bandE(m.kx, ky);
            if (abs(e) > maxE) { if (started) { ctx.stroke(); ctx.beginPath(); started = false; } continue; }
            if (!started) { ctx.moveTo(sx(ky), sy(e)); started = true; }
            else ctx.lineTo(sx(ky), sy(e));
          }
          if (started) ctx.stroke();
        }
      }

      if (!p.metallic) {
        var gE = p.gapE;
        ctx.strokeStyle = 'rgba(251,191,36,0.45)'; ctx.setLineDash([3,3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, sy(gE)); ctx.lineTo(pad.l+pw, sy(gE));
        ctx.moveTo(pad.l, sy(-gE)); ctx.lineTo(pad.l+pw, sy(-gE)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fbbf24'; ctx.font = '600 10px "DM Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Eg = ' + (2*gE).toFixed(2) + ' eV', pad.l + pw - 80, sy(0) - 4);
      }

      ctx.fillStyle = '#78716c'; ctx.font = '500 10px "DM Sans", sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('k∥ (along cutting line)', pad.l + pw/2, H-8);
      ctx.save(); ctx.translate(12, pad.t+ph/2); ctx.rotate(-PI/2);
      ctx.fillText('E (eV)', 0, 0); ctx.restore();

      ctx.textAlign = 'right'; ctx.font = '500 9px "DM Sans", sans-serif';
      ctx.fillStyle = '#a8a29e';
      for (var e = -maxE; e <= maxE+0.01; e += step) {
        if (abs(e) < step*0.05) continue;
        ctx.fillText(e.toFixed(1), pad.l-5, sy(e)+3);
      }
      ctx.fillStyle = '#d6d3d1';
      ctx.fillText('0', pad.l-5, sy(0)+3);

      ctx.textAlign = 'left'; ctx.font = '600 10px "DM Sans", sans-serif';
      ctx.fillStyle = '#ef4444'; ctx.fillText('π*', pad.l+4, sy(maxE*0.7));
      ctx.fillStyle = '#3b82f6'; ctx.fillText('π', pad.l+4, sy(-maxE*0.7));
    }

    // ── Render loop (dirty-flag only) ──
    var curP = null, prevT = tHop;
    function cutFrame() {
      if (tHop !== prevT) { prevT = tHop; coneT = null; cutDirty = true; if (curP) drawSubbands(curP); }
      if (cutDirty && curP) { drawCone(curP); cutDirty = false; }
      requestAnimationFrame(cutFrame);
    }

    function update() {
      var N = +slider.value;
      curP = gnrParams(N);
      wval.textContent = N;
      drawReal();
      drawSubbands(curP);
      coneT = null;
      cutDirty = true;

      var gE2 = curP.metallic ? 0 : 2 * curP.gapE;
      var tag = curP.metallic
        ? '<b style="color:#6ee7b7">Metallic</b> — a cutting line coincides with a K point (zero gap).'
        : '<b style="color:#fbbf24">Semiconducting</b> — the nearest cutting line misses the K point, opening a gap E<sub>g</sub> ≈ '
          + gE2.toFixed(2) + ' eV.';
      classDiv.innerHTML = '<b>N = ' + N + '</b> &nbsp;(' + (N%3===2 ? 'N = 3m+2' :
        (N%3===0 ? 'N = 3m' : 'N = 3m+1')) + '): ' + tag
        + ' The allowed modes kx<sub>q</sub> = 2qπ/(N+1) are fixed by the boundary condition; '
        + 'metallicity follows as a <em>consequence</em> when 2(N+1)/3 is an integer.';
    }

    slider.addEventListener('input', update);
    window.addEventListener('resize', function() { cutDirty = true; update(); });
    update();
    requestAnimationFrame(cutFrame);
  })();
})();
