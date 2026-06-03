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

    var showWire = true;
    var theta = 62 * PI/180;
    var phi = -28 * PI/180;

    var N = 44;
    var span = BZR * 1.08;

    function eColor(e, eMax) {
      var t = e / eMax;
      var at = abs(t);
      var r, g, b;
      if (t >= 0) {
        r = 239; g = Math.round(68 + 187*(1-at)); b = Math.round(68 + 187*(1-at));
      } else {
        r = Math.round(59 + 196*(1-at)); g = Math.round(130 + 125*(1-at)); b = 246;
      }
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function darken(col, f) {
      var m = col.match(/\d+/g);
      return 'rgb(' + Math.round(m[0]*f) + ',' + Math.round(m[1]*f) + ',' + Math.round(m[2]*f) + ')';
    }

    function buildFaces() {
      var verts = [];
      for (var i = 0; i <= N; i++) {
        for (var j = 0; j <= N; j++) {
          var kx = -span + 2*span*i/N;
          var ky = -span + 2*span*j/N;
          var ep = bandE(kx, ky);
          verts.push({kx:kx, ky:ky, ep:ep, em:-ep});
        }
      }
      var faces = [];
      for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
          var idx = i*(N+1)+j;
          var i0 = idx, i1 = idx+1, i2 = idx+N+2, i3 = idx+N+1;
          var any = insideBZ(verts[i0].kx, verts[i0].ky) ||
                    insideBZ(verts[i1].kx, verts[i1].ky) ||
                    insideBZ(verts[i2].kx, verts[i2].ky) ||
                    insideBZ(verts[i3].kx, verts[i3].ky);
          if (any) {
            faces.push({v:[i0,i1,i2,i3], band:1});
            faces.push({v:[i0,i1,i2,i3], band:-1});
          }
        }
      }
      return {verts:verts, faces:faces};
    }

    var mesh = buildFaces();

    render3D = function () {
      var o = dpr(canvas), ctx = o.ctx, W = o.w, H = o.h;
      var eMax = 3 * tHop;
      var cosT = cos(theta), sinT = sin(theta);
      var cosP = cos(phi), sinP = sin(phi);
      var kScale = 1 / span;
      var eScale = 0.35 / eMax;
      var viewScale = min(W, H) * 0.38;

      function project(kx, ky, e) {
        var x = kx * kScale, y = ky * kScale, z = e * eScale;
        var x1 = x*cosP - y*sinP;
        var y1 = x*sinP + y*cosP;
        var x2 = x1;
        var y2 = y1*cosT - z*sinT;
        var z2 = y1*sinT + z*cosT;
        return {sx: W/2 + x2*viewScale, sy: H/2 - y2*viewScale, depth: z2};
      }

      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, W*2, H*2);

      // BZ boundary at z=0
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (var n = 0; n <= 6; n++) {
        var ang = n * PI/3;
        var p = project(BZR*cos(ang), BZR*sin(ang), 0);
        if (n === 0) ctx.moveTo(p.sx, p.sy);
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Axes at origin
      var axLen = span * 0.6;
      var orig = project(0, 0, 0);
      var axX = project(axLen, 0, 0);
      var axY = project(0, axLen, 0);
      var axZ = project(0, 0, eMax * 0.8);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      [[orig, axX, 'kₓ'], [orig, axY, 'kₑ'], [orig, axZ, 'E']].forEach(function(ax) {
        ctx.beginPath();
        ctx.moveTo(ax[0].sx, ax[0].sy);
        ctx.lineTo(ax[1].sx, ax[1].sy);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '500 10px "DM Sans", sans-serif';
        ctx.fillText(ax[2], ax[1].sx+4, ax[1].sy-2);
      });

      // Compute face depths and colors
      var verts = mesh.verts;
      var sortable = [];
      for (var fi = 0; fi < mesh.faces.length; fi++) {
        var face = mesh.faces[fi];
        var vs = face.v;
        var projVerts = [];
        var depthSum = 0;
        var eSum = 0;
        for (var vi = 0; vi < 4; vi++) {
          var v = verts[vs[vi]];
          var e = face.band === 1 ? v.ep : v.em;
          var p = project(v.kx, v.ky, e);
          projVerts.push(p);
          depthSum += p.depth;
          eSum += e;
        }
        sortable.push({proj: projVerts, depth: depthSum/4, e: eSum/4, band: face.band});
      }

      sortable.sort(function(a, b) { return a.depth - b.depth; });

      // Draw faces back-to-front
      for (var i = 0; i < sortable.length; i++) {
        var f = sortable[i];
        var pv = f.proj;
        var col = eColor(f.e, eMax);

        // Back-face check
        var ux = pv[1].sx - pv[0].sx, uy = pv[1].sy - pv[0].sy;
        var vx = pv[3].sx - pv[0].sx, vy = pv[3].sy - pv[0].sy;
        var cross = ux*vy - uy*vx;
        var facing = cross > 0;

        ctx.fillStyle = facing ? col : darken(col, 0.55);
        ctx.beginPath();
        ctx.moveTo(pv[0].sx, pv[0].sy);
        ctx.lineTo(pv[1].sx, pv[1].sy);
        ctx.lineTo(pv[2].sx, pv[2].sy);
        ctx.lineTo(pv[3].sx, pv[3].sy);
        ctx.closePath();
        ctx.fill();

        if (showWire) {
          ctx.strokeStyle = facing ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // K point markers on surface
      ctx.fillStyle = '#fbbf24';
      for (var n = 0; n < 6; n++) {
        var ang = n * PI/3;
        var kx = BZR * cos(ang), ky = BZR * sin(ang);
        var p = project(kx, ky, 0);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 3, 0, 2*PI);
        ctx.fill();
      }

      // Γ marker
      var gp = project(0, 0, eMax);
      var gm = project(0, 0, -eMax);
      ctx.fillStyle = '#16a34a';
      ctx.beginPath(); ctx.arc(gp.sx, gp.sy, 3, 0, 2*PI); ctx.fill();
      ctx.beginPath(); ctx.arc(gm.sx, gm.sy, 3, 0, 2*PI); ctx.fill();
    };

    // Mouse / touch drag
    var dragging = false, lastX, lastY;
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      phi += dx * 0.008;
      theta = max(0.1, min(PI/2 - 0.05, theta - dy * 0.008));
      lastX = e.clientX; lastY = e.clientY;
      render3D();
    });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('pointercancel', function () { dragging = false; });

    // Slider sync
    hop3dSlider.addEventListener('input', function () {
      tHop = +hop3dSlider.value;
      hop3dVal.textContent = tHop.toFixed(2) + ' eV';
      mesh = buildFaces();
      render3D();
      document.getElementById('v-hop').textContent = tHop.toFixed(2) + ' eV';
      document.getElementById('ctrl-hop').value = tHop;
      drawBands();
    });

    btnReset.addEventListener('click', function () {
      theta = 62 * PI/180;
      phi = -28 * PI/180;
      render3D();
    });

    btnWire.addEventListener('click', function () {
      showWire = !showWire;
      btnWire.classList.toggle('active', showWire);
      render3D();
    });

    render3D();
  })();
})();
