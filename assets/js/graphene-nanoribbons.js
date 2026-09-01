(function () {
  'use strict';
  var PI = Math.PI, sqrt3 = Math.sqrt(3), cos = Math.cos, sin = Math.sin,
      abs = Math.abs, sqrt = Math.sqrt, max = Math.max, min = Math.min,
      atan2 = Math.atan2;

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
  // Shared colours for the three path segments Γ→M, M→K, K→Γ, so the E-k plot
  // and the 3-D surface use the same colour for the same segment.
  var PATHSEG = ['#f472b6', '#34d399', '#60a5fa'];

  // ── Figure theme (dark plate ↔ washi light plate) ──────────────────
  // Light plates (washi grounds) draw dark-on-light with a hand-picked 和
  // palette; dark plates keep the original light-on-dark set. window.__gnrLight
  // is toggled by the Tweaks "Plate" control; redraw is triggered there too.
  var GNR_DARK = {
    ink:'#e7e5e4', inkSoft:'#a8a29e', faint:'#78716c',
    bond:'255,255,255', grid:'255,255,255',
    gFaint:0.06, gZero:0.20, gMid:0.12, hexLine:'226,232,240', hexLineA:0.18,
    accentArm:'#fbbf24', accentArmRGB:'251,191,36',
    accentZig:'#34d399', accentZigRGB:'52,211,153',
    atomA:'#ef4444', atomB:'#3b82f6', diracKp:'#60a5fa', diracKRGB:'239,68,68',
    amberRGB:'251,191,36',
    famA:'#60a5fa', famB:'#34d399', famC:'#f472b6', zigBar:'#f59e0b',
    cur:'#ffffff', lineL:62, lineS:72
  };
  var GNR_LIGHT = {
    ink:'#2a2620', inkSoft:'#6f675b', faint:'#8c8475',
    bond:'46,40,33', grid:'46,40,33',
    gFaint:0.10, gZero:0.34, gMid:0.18, hexLine:'46,40,33', hexLineA:0.20,
    accentArm:'#c98a1c', accentArmRGB:'201,138,28',
    accentZig:'#1f9168', accentZigRGB:'31,145,104',
    atomA:'#d23b2c', atomB:'#2f63c0', diracKp:'#2f63c0', diracKRGB:'210,59,44',
    amberRGB:'201,138,28',
    famA:'#2f63c0', famB:'#1f9168', famC:'#c0417a', zigBar:'#cf8a1a',
    cur:'#2a2620', lineL:46, lineS:78
  };
  function pal(){ return window.__gnrLight ? GNR_LIGHT : GNR_DARK; }
  // dark cutting-line spectrum used by the (always-dark) 3-D viewport
  function colorForD(rank, n) {
    var h = n <= 1 ? 200 : (rank * 300 / (n - 1));
    return 'hsl(' + h.toFixed(0) + ',72%,62%)';
  }

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
    var btnBZplane = document.getElementById('btn-bz-plane');
    var showBZplane = true;
    if (!bzC) return;

    var curTheta = 30;   // edge orientation: 0 = zigzag, 30 = armchair
    var zoneScheme = 'reduced';   // BZ figure: 'reduced' (folded) | 'extended'
    var bzZoom = 1.7;    // BZ top-view zoom (1 = fit neighbours; >1 zooms in)

    // One stable colour per transverse mode, shared by the cutting-line figure,
    // the 3-D cut, and the band plot so the SAME cutting line is the SAME colour
    // everywhere.  Modes are ranked by gap (distance to a Dirac point), so the
    // hue order is identical across panels regardless of edge type or N.
    function colorFor(rank, n) {
      var h = n <= 1 ? 200 : (rank * 300 / (n - 1));
      var pp = pal();
      return 'hsl(' + h.toFixed(0) + ',' + pp.lineS + '%,' + pp.lineL + '%)';
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
      /* plate background is supplied by CSS (--plate), so the figure follows
         the Tweaks plate selection; leave the canvas transparent here. */
      var TH = pal();

      var isZig = (type === 'zigzag');
      var accent = isZig ? TH.accentZig : TH.accentArm;
      var aRGB   = isZig ? TH.accentZigRGB : TH.accentArmRGB;
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
          ctx.globalAlpha = 0.24*fa; ctx.strokeStyle = 'rgb(' + TH.bond + ')'; ctx.lineWidth = bw;
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
        var subs = [[px, py, TH.atomA], [px, py + d1y, TH.atomB]];
        for (var s = 0; s < 2; s++) {
          var x = subs[s][0], y = subs[s][1];
          if (!vis(x, y)) continue;
          var fa = dim * fade(lc(x, y));
          if (fa <= 0.01) continue;
          var p = S(x, y), here = inSlice(x, y);
          ctx.globalAlpha = fa;
          ctx.beginPath(); ctx.arc(p[0], p[1], here ? rr+0.6 : rr, 0, 2*PI);
          ctx.fillStyle = subs[s][2]; ctx.fill();
          if (here) { ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(' + TH.bond + ',.9)'; ctx.stroke(); }
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
              ctx.strokeStyle = TH.inkSoft;
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
            ctx.strokeStyle = TH.inkSoft;
            ctx.beginPath();
            ctx.moveTo(p[0]-xsz, p[1]-xsz); ctx.lineTo(p[0]+xsz, p[1]+xsz);
            ctx.moveTo(p[0]+xsz, p[1]-xsz); ctx.lineTo(p[0]-xsz, p[1]+xsz);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      // translation-vector arrow T — placed well OUTSIDE the ribbon edge, in the
      // gutter clear of the atoms and the × hard-wall markers.
      // Outward screen direction (ribbon centre → width edge):
      var ribCtrScr  = RS(l0+Tper/2, wmid);
      var ribEdgeScr = RS(l0+Tper/2, wmax + pad);
      var outScrDx = ribEdgeScr[0]-ribCtrScr[0], outScrDy = ribEdgeScr[1]-ribCtrScr[1];
      var outLen = Math.hypot(outScrDx, outScrDy)||1;
      var oux = outScrDx/outLen, ouy = outScrDy/outLen;
      // Axis (k∥) screen direction, for orienting the rotated label.
      var axScr0 = RS(l0, wmid), axScr1 = RS(l0+Tper, wmid);
      var axAng = Math.atan2(axScr1[1]-axScr0[1], axScr1[0]-axScr0[0]);
      // Push the bracket beyond the shaded edge so it clears the × marks, but
      // clamp into the canvas margin so it never runs off the slim panel.
      var aOff = 26;
      var a0s = RS(l0, wmax + pad), a1s = RS(l0+Tper, wmax + pad);
      var a0 = [a0s[0]+oux*aOff, a0s[1]+ouy*aOff];
      var a1 = [a1s[0]+oux*aOff, a1s[1]+ouy*aOff];
      var labMargin = 20;   // room reserved for the rotated label outside the arrow
      var minX = labMargin, maxX = W - labMargin;
      var shift = 0;
      var loX = min(a0[0], a1[0]), hiX = max(a0[0], a1[0]);
      if (loX < minX) shift = minX - loX;
      else if (hiX > maxX) shift = maxX - hiX;
      a0[0] += shift; a1[0] += shift;
      var aMx = (a0[0]+a1[0])/2, aMy = (a0[1]+a1[1])/2;
      ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2.4;
      (function arrow(x0,y0,x1,y1){
        var dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L;
        // double-headed bracket so both ends of the period read clearly
        ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1,y1); ctx.lineTo(x1-ux*9+uy*5, y1-uy*9-ux*5);
        ctx.moveTo(x1,y1); ctx.lineTo(x1-ux*9-uy*5, y1-uy*9+ux*5);
        ctx.moveTo(x0,y0); ctx.lineTo(x0+ux*9+uy*5, y0+uy*9-ux*5);
        ctx.moveTo(x0,y0); ctx.lineTo(x0+ux*9-uy*5, y0+uy*9+ux*5);
        ctx.stroke();
      })(a0[0],a0[1],a1[0],a1[1]);
      // Label rotated to run along the arrow, offset a little further outward so
      // it never sits on the arrow line (keeps it compact in the slim panel).
      ctx.save();
      ctx.translate(aMx + oux*13, aMy + ouy*13);
      var rot = axAng;
      if (rot > PI/2 || rot < -PI/2) rot += PI;   // keep text upright
      ctx.rotate(rot);
      ctx.font = '700 13px "Zen Kaku Gothic New", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = accent;
      ctx.fillText(isZig ? 'T = a' : 'T = √3·a', 0, 0);
      ctx.restore();
    }
    function drawCells(theta, N) {
      var type = theta === 0 ? 'zigzag' : 'armchair';
      drawRibbonCell(cellCV, type, true, N);
    }

    // ── 2D top-down Brillouin zone with the cutting-line family ──
    function drawBZ(p) {
      var o = dpr(bzC), ctx = o.ctx, W = o.w, H = o.h;
      ctx.clearRect(0, 0, W, H);
      var TH = pal();
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
      var sc = min(W, H) * 0.40 / viewR * bzZoom;
      function P(kx, ky) { return [cx + kx*sc, cy - ky*sc]; }

      var Tint = isZig ? 1 : sqrt3;                    // axial period (a = 1)
      var kpar = PI / Tint;                            // 1-D BZ boundary at ±π/T
      var axdx = -p.ny, axdy = p.nx;                   // axis (k∥) direction
      var trdx = p.nx, trdy = p.ny;                    // transverse (k⊥) direction

      // Repeated-zone context (both schemes): the neighbouring reciprocal-lattice
      // Γ points, a faint 1st-BZ hexagon centred on each, and the 2nd-BZ boundary.
      var Gn = [[RB1x,RB1y], [-RB1x,-RB1y], [RB2x,RB2y], [-RB2x,-RB2y],
                [RB1x+RB2x,RB1y+RB2y], [-(RB1x+RB2x),-(RB1y+RB2y)]];
      ctx.strokeStyle = 'rgba(' + TH.amberRGB + ',0.16)'; ctx.lineWidth = 1;
      for (var gi = 0; gi < Gn.length; gi++) {
        ctx.beginPath();
        for (var nb = 0; nb <= 6; nb++) {
          var ah = nb*PI/3, hp = P(Gn[gi][0] + BZR*cos(ah), Gn[gi][1] + BZR*sin(ah));
          if (nb === 0) ctx.moveTo(hp[0], hp[1]); else ctx.lineTo(hp[0], hp[1]);
        }
        ctx.closePath(); ctx.stroke();
      }
      // 2nd-BZ boundary = hexagon through the 6 nearest Γ (rotated 30°).
      ctx.strokeStyle = 'rgba(' + TH.hexLine + ',' + TH.hexLineA + ')'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var nb = 0; nb <= 6; nb++) {
        var ab = PI/6 + nb*PI/3, pb = P(sqrt3*BZR*cos(ab), sqrt3*BZR*sin(ab));
        if (nb === 0) ctx.moveTo(pb[0], pb[1]); else ctx.lineTo(pb[0], pb[1]);
      }
      ctx.closePath(); ctx.stroke();
      // neighbour Γ markers
      ctx.fillStyle = 'rgba(' + TH.grid + ',0.55)';
      for (var gi = 0; gi < Gn.length; gi++) {
        var gp = P(Gn[gi][0], Gn[gi][1]);
        ctx.beginPath(); ctx.arc(gp[0], gp[1], 2, 0, 2*PI); ctx.fill();
      }

      // Central first BZ hexagon (the ribbon lives here).
      ctx.strokeStyle = 'rgba(' + TH.amberRGB + ',0.6)';
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
        ctx.strokeStyle = 'rgba(' + TH.diracKRGB + ',0.85)'; ctx.lineWidth = 1.6;
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var b1 = P(sgn*kpar*axdx - ktrMax*trdx, sgn*kpar*axdy - ktrMax*trdy);
          var b2 = P(sgn*kpar*axdx + ktrMax*trdx, sgn*kpar*axdy + ktrMax*trdy);
          ctx.beginPath(); ctx.moveTo(b1[0],b1[1]); ctx.lineTo(b2[0],b2[1]); ctx.stroke();
        }
        for (var li = 0; li < p.lines.length; li++) {
          var L = p.lines[li];
          ctx.strokeStyle = colorFor(L.ci, p.N); ctx.lineWidth = 1.6;
          var a1 = P(L.c*trdx - kpar*axdx, L.c*trdy - kpar*axdy);
          var a2 = P(L.c*trdx + kpar*axdx, L.c*trdy + kpar*axdy);
          ctx.beginPath(); ctx.moveTo(a1[0],a1[1]); ctx.lineTo(a2[0],a2[1]); ctx.stroke();
        }
        // Folded Dirac points: K (red) vs K' (blue), matching Module 00 convention.
        // Points whose true k∥ lay outside the 1-D zone are umklapp-folded into
        // the strip; we mark those with a dashed connector from their original
        // location + a hollow ring, so a folded image is obvious at a glance.
        var KD = [], KpD = [];
        for (var n = 0; n < 6; n++) {
          var ang2 = n*PI/3, kc = BZR*cos(ang2), ks = BZR*sin(ang2);
          var kpa0 = kc*axdx + ks*axdy, kpe = kc*trdx + ks*trdy;
          var m = Math.round(kpa0/(2*kpar));
          var kpa = kpa0 - 2*kpar*m;                   // folded axial momentum
          if (abs(kpe) > ktrMax + 1e-6) continue;
          var dp  = P(kpa*axdx  + kpe*trdx, kpa*axdy  + kpe*trdy);
          var dp0 = P(kpa0*axdx + kpe*trdx, kpa0*axdy + kpe*trdy);
          var rec = { dp: dp, dp0: dp0, folded: (m !== 0) };
          if (n % 2 === 0) KD.push(rec); else KpD.push(rec);
        }
        function drawDirac(arr, color) {
          arr.forEach(function(r) {
            if (r.folded) {
              // dashed connector from the original (pre-fold) location
              ctx.save();
              ctx.setLineDash([3,3]); ctx.lineWidth = 1;
              ctx.strokeStyle = color; ctx.globalAlpha = 0.5;
              ctx.beginPath(); ctx.moveTo(r.dp0[0], r.dp0[1]); ctx.lineTo(r.dp[0], r.dp[1]); ctx.stroke();
              ctx.restore();
              // faint ghost of the original position
              ctx.save(); ctx.globalAlpha = 0.35;
              ctx.fillStyle = color;
              ctx.beginPath(); ctx.arc(r.dp0[0], r.dp0[1], 3, 0, 2*PI); ctx.fill();
              ctx.restore();
              // folded image: hollow ring
              ctx.lineWidth = 2.2; ctx.strokeStyle = color;
              ctx.beginPath(); ctx.arc(r.dp[0], r.dp[1], 5, 0, 2*PI); ctx.stroke();
              ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
              ctx.beginPath(); ctx.arc(r.dp[0], r.dp[1], 3, 0, 2*PI); ctx.fill();
              ctx.restore();
            } else {
              // genuine in-zone position: solid dot
              ctx.fillStyle = color;
              ctx.beginPath(); ctx.arc(r.dp[0], r.dp[1], 5, 0, 2*PI); ctx.fill();
            }
          });
        }
        drawDirac(KD,  TH.atomA);
        drawDirac(KpD, TH.diracKp);

        // ── Dimension annotations ──
        (function () {
          function dblArrow(x1, y1, x2, y2, label, lx, ly) {
            var dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy)||1;
            var px = -dy/len*5, py = dx/len*5;
            ctx.save();
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(' + TH.bond + ',0.6)';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
            ctx.moveTo(x1-px,y1-py); ctx.lineTo(x1+px,y1+py);
            ctx.moveTo(x2-px,y2-py); ctx.lineTo(x2+px,y2+py);
            ctx.stroke();
            ctx.fillStyle = 'rgba(' + TH.bond + ',0.92)';
            ctx.font = '600 13px "Zen Kaku Gothic New", system-ui, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(label, lx, ly);
            ctx.restore();
          }
          // Screen-space unit vectors for k∥ and k⊥ (canvas: y-axis flipped)
          var p0s = P(0,0);
          var sasRaw = P(axdx,axdy), stsRaw = P(trdx,trdy);
          var saxR = sasRaw[0]-p0s[0], sayR = sasRaw[1]-p0s[1];
          var stxR = stsRaw[0]-p0s[0], styR = stsRaw[1]-p0s[1];
          var saxL = Math.hypot(saxR,sayR)||1, stxL = Math.hypot(stxR,styR)||1;
          var sax = saxR/saxL, say = sayR/saxL;
          var stx = stxR/stxL, sty = styR/stxL;

          // 1. BZ longitudinal width 2π/T — placed OUTSIDE the strip, beyond the
          // widest cutting line (ktrMax), so it never overlaps the lines/hexagon.
          var bwOff = ktrMax + 26/sc;
          var bwP1 = P(-kpar*axdx - bwOff*trdx, -kpar*axdy - bwOff*trdy);
          var bwP2 = P( kpar*axdx - bwOff*trdx,  kpar*axdy - bwOff*trdy);
          var bwMx = (bwP1[0]+bwP2[0])/2, bwMy = (bwP1[1]+bwP2[1])/2;
          dblArrow(bwP1[0], bwP1[1], bwP2[0], bwP2[1],
                   isZig ? '2π/a' : '2π/√3a',
                   bwMx - stx*26, bwMy - sty*26);

          // 2. Transverse quantization step π/(N+1) or 2π/(N+1) — above the strip
          var qstep = (isZig ? 1 : 2) * PI / (p.N + 1);
          var cLo = p.N >= 2 ? qstep : 0;
          var cHi = p.N >= 2 ? 2*qstep : qstep;
          var qP1 = P(cLo*trdx + kpar*axdx, cLo*trdy + kpar*axdy);
          var qP2 = P(cHi*trdx + kpar*axdx, cHi*trdy + kpar*axdy);
          qP1[0] += sax*24; qP1[1] += say*24;
          qP2[0] += sax*24; qP2[1] += say*24;
          var qMx = (qP1[0]+qP2[0])/2, qMy = (qP1[1]+qP2[1])/2;
          dblArrow(qP1[0], qP1[1], qP2[0], qP2[1],
                   isZig ? 'π/(N+1)' : '2π/(N+1)',
                   qMx + sax*22, qMy + say*22);
        })();
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
        for (var n = 0; n < 6; n++) {
          var ang3 = n*PI/3, pc = P(BZR*cos(ang3), BZR*sin(ang3));
          ctx.fillStyle = (n % 2 === 0) ? TH.atomA : TH.diracKp;
          ctx.beginPath(); ctx.arc(pc[0], pc[1], 5, 0, 2*PI); ctx.fill();
        }
      }

      // Γ
      var g = P(0, 0);
      ctx.beginPath(); ctx.arc(g[0], g[1], 3, 0, 2*PI);
      ctx.fillStyle = TH.inkSoft; ctx.fill();
      ctx.fillStyle = TH.ink; ctx.font = '600 13px "Zen Kaku Gothic New", system-ui, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('Γ', g[0]+7, g[1]+4);

      // ── Legend: colour = valley (K/K'), shape = original (filled) vs folded (ring) ──
      (function () {
        var lx = 12, ly = H - 46, rowH = 20, dotX = lx + 7;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = '600 13px "Zen Kaku Gothic New", system-ui, sans-serif';
        // Row 1: K (red filled) · K' (blue filled)
        ctx.fillStyle = TH.atomA;
        ctx.beginPath(); ctx.arc(dotX, ly, 5, 0, 2*PI); ctx.fill();
        ctx.fillStyle = TH.ink; ctx.fillText('K', dotX + 12, ly);
        var k2 = dotX + 56;
        ctx.fillStyle = TH.diracKp;
        ctx.beginPath(); ctx.arc(k2, ly, 5, 0, 2*PI); ctx.fill();
        ctx.fillStyle = TH.ink; ctx.fillText("K'", k2 + 12, ly);
        // Row 2: filled = original · ring = folded
        var ly2 = ly + rowH;
        ctx.fillStyle = TH.inkSoft;
        ctx.beginPath(); ctx.arc(dotX, ly2, 5, 0, 2*PI); ctx.fill();
        ctx.fillStyle = TH.inkSoft; ctx.fillText('original', dotX + 12, ly2);
        var f2 = dotX + 78;
        ctx.lineWidth = 2.2; ctx.strokeStyle = TH.inkSoft;
        ctx.beginPath(); ctx.arc(f2, ly2, 5, 0, 2*PI); ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(f2, ly2, 3, 0, 2*PI); ctx.fill();
        ctx.restore();
        ctx.fillStyle = TH.inkSoft; ctx.fillText('folded', f2 + 12, ly2);
      })();
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
        var bright=0.58+0.42*ndl;   // gentler lighting → fewer visible facets
        var eAvg=band*(verts[q[0]].ep+verts[q[1]].ep+verts[q[2]].ep+verts[q[3]].ep)/4;
        draws.push({t:0, p:ps,
          depth:(ps[0].depth+ps[1].depth+ps[2].depth+ps[3].depth)/4,
          e:eAvg, bright:bright});
      }

      // Cutting lines at constant k·n, traced along the surface in both bands.
      var lines = p.lines, ltx = -p.ny, lty = p.nx, lext = 1.35*R_out, LS = 90;
      for (var li = 0; li < lines.length; li++) {
        var L = lines[li];
        var col = colorForD(L.ci, p.N);
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
      // are the planes k∥ = ±π/T (perpendicular to the ribbon axis), spanning
      // k⊥ and the full energy range — drawn as translucent sheets, NOT lines.
      if (showBZplane) {
      var gaxx = -p.ny, gaxy = p.nx, gtrx = p.nx, gtry = p.ny;
      var gkpar = PI / (p.theta === 0 ? 1 : sqrt3);
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        var bxg = sgn*gkpar*gaxx, byg = sgn*gkpar*gaxy;
        // transverse half-extent of the surface footprint at this k∥
        var sMax = 0;
        for (var sg = 0; sg <= 1.4*R_out; sg += R_out/120) {
          if (insideHexRc(bxg + sg*gtrx, byg + sg*gtry, R_out) &&
              insideHexRc(bxg - sg*gtrx, byg - sg*gtry, R_out)) sMax = sg;
        }
        if (sMax <= 0) continue;
        var cA = proj(bxg - sMax*gtrx, byg - sMax*gtry, -eMax);
        var cB = proj(bxg + sMax*gtrx, byg + sMax*gtry, -eMax);
        var cC = proj(bxg + sMax*gtrx, byg + sMax*gtry,  eMax);
        var cD = proj(bxg - sMax*gtrx, byg - sMax*gtry,  eMax);
        ctx.beginPath();
        ctx.moveTo(cA.sx, cA.sy); ctx.lineTo(cB.sx, cB.sy);
        ctx.lineTo(cC.sx, cC.sy); ctx.lineTo(cD.sx, cD.sy); ctx.closePath();
        ctx.fillStyle = 'rgba(251,191,36,0.12)'; ctx.fill();
        ctx.strokeStyle = 'rgba(251,191,36,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
      }
      }

      for (var n = 0; n < 6; n++) {
        var ang = n*PI/3, dpm = proj(BZR*cos(ang), BZR*sin(ang), 0);
        ctx.beginPath(); ctx.arc(dpm.sx, dpm.sy, 2.5, 0, 2*PI);
        ctx.fillStyle = '#fde68a'; ctx.fill();
      }
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
      var TH = pal();

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
      ctx.strokeStyle = 'rgba(' + TH.grid + ',' + TH.gFaint + ')'; ctx.lineWidth = 1;
      var step = parseFloat((maxE/3).toPrecision(1));
      if (step < 0.1) step = 0.1;
      for (var e = -maxE; e <= maxE+0.01; e += step) {
        if (abs(e) < step*0.05) continue;
        ctx.beginPath(); ctx.moveTo(pad.l, sy(e)); ctx.lineTo(pad.l+pw, sy(e)); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(' + TH.grid + ',' + TH.gZero + ')';
      ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(pad.l+pw, sy(0)); ctx.stroke();

      // zone-centre (Γ) marker
      ctx.strokeStyle = 'rgba(' + TH.grid + ',' + TH.gMid + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx(0), pad.t); ctx.lineTo(sx(0), pad.t+ph); ctx.stroke();

      // Dirac projection / edge-state onset marker (zigzag: k = ±2π/3).
      if (isZig) {
        var kK = 2*PI/3;
        ctx.strokeStyle = 'rgba(' + TH.accentZigRGB + ',0.35)'; ctx.setLineDash([4,3]); ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx(kK), pad.t); ctx.lineTo(sx(kK), pad.t+ph);
        ctx.moveTo(sx(-kK), pad.t); ctx.lineTo(sx(-kK), pad.t+ph);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(' + TH.accentZigRGB + ',0.85)'; ctx.font = '600 9px "Zen Kaku Gothic New", system-ui, sans-serif';
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
        ctx.strokeStyle = 'rgba(' + TH.amberRGB + ',0.45)'; ctx.setLineDash([3,3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, sy(gMin)); ctx.lineTo(pad.l+pw, sy(gMin));
        ctx.moveTo(pad.l, sy(-gMin)); ctx.lineTo(pad.l+pw, sy(-gMin)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = TH.accentArm; ctx.font = '600 12px "Zen Kaku Gothic New", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Eg = ' + (2*gMin).toFixed(2) + ' eV', pad.l+pw-90, sy(0)-4);
      }

      // axes labels
      ctx.save(); ctx.translate(12, pad.t+ph/2); ctx.rotate(-PI/2);
      ctx.fillStyle = TH.faint; ctx.font = '500 12px "Zen Kaku Gothic New", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('E (eV)', 0, 0); ctx.restore();

      ctx.textAlign = 'right'; ctx.font = '500 11px "Zen Kaku Gothic New", system-ui, sans-serif';
      ctx.fillStyle = TH.inkSoft;
      for (var e = -maxE; e <= maxE+0.01; e += step) {
        if (abs(e) < step*0.05) continue;
        ctx.fillText(e.toFixed(1), pad.l-5, sy(e)+3);
      }
      ctx.fillStyle = TH.ink; ctx.fillText('0', pad.l-5, sy(0)+3);

      // high-symmetry points across the full first 1D BZ: −Z … Γ … Z
      ctx.font = '600 13px "Zen Kaku Gothic New", system-ui, sans-serif'; ctx.textAlign = 'center';
      var yHSP = pad.t + ph + 16;
      var zb = isZig ? 'Z' : 'X';
      ctx.fillStyle = TH.ink;
      ctx.fillText('−' + zb, sx(-kMax), yHSP);
      ctx.fillText('Γ', sx(0), yHSP);
      ctx.fillText(zb, sx(kMax), yHSP);

      // 1D Brillouin-zone length = 2π/T (Å⁻¹).
      var aPhys = 2.46;                      // graphene lattice constant (Å)
      ctx.textAlign = 'right'; ctx.font = '600 11px "Zen Kaku Gothic New", system-ui, sans-serif';
      ctx.fillStyle = TH.inkSoft;
      ctx.fillText('2π/T = ' + (2*kMax/aPhys).toFixed(2) + ' Å⁻¹', pad.l+pw, pad.t+12);

      ctx.textAlign = 'left'; ctx.font = '600 13px "Zen Kaku Gothic New", system-ui, sans-serif';
      ctx.fillStyle = TH.atomA; ctx.fillText('π*', pad.l+4, sy(maxE*0.7));
      ctx.fillStyle = TH.atomB; ctx.fillText('π', pad.l+4, sy(-maxE*0.7));
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
      if (lockedView) applyView(lockedView);   // keep axis-locked view aligned

      var isZig = (theta === 0);
      var metallic = isZig ? true : (N % 3 === 2);
      var gapHalf = isZig ? 0 : agnrGap(N);
      var nmC = nm.charAt(0).toUpperCase() + nm.slice(1);
      var tag = metallic
        ? '<b style="color:#6ee7b7">Metallic</b>: a band reaches the Fermi level (zero gap).'
        : '<b style="color:#fbbf24">Semiconducting</b>: the lowest subband opens a gap E<sub>g</sub> ≈ '
          + (2*gapHalf).toFixed(2) + ' eV at Γ.';
      var bc = ' Hard-wall BC: ' + N + ' transverse modes n = 1…' + N +
               ' (k<sub>⊥</sub> = ' + (isZig ? 'nπ' : '2nπ') + '/(' + N + '+1))' +
               '; the wavefunction vanishes at missing atom sites beyond each edge.';
      var detail = isZig
        ? ' Zigzag ribbons carry <b style="color:#6ee7b7">edge states</b>, a flat E≈0 band for ' +
          'k between 2π/3 and Z, so they are always metallic (hard-wall edges, ' +
          'invisible to zone-folding).'
        : ' Armchair ribbons are metallic only when <b>N = 3m+2</b>; the gap closes at Γ.';
      var Ndesc = isZig ? N + ' chains' : N;
      if (classDiv) classDiv.innerHTML = '<b>' + nmC + '</b>, θ = ' + theta + '°, N = ' + Ndesc + ': ' + tag + bc + detail;
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
    if (btnBZplane) {
      btnBZplane.addEventListener('click', function () {
        showBZplane = !showBZplane;
        btnBZplane.classList.toggle('active', showBZplane);
        cutDirty = true;
      });
    }
    var btnViewPar  = document.getElementById('btn-view-par');
    var btnViewPerp = document.getElementById('btn-view-perp');
    var btnViewTop  = document.getElementById('btn-view-top');
    var viewBtns = [btnViewPar, btnViewPerp, btnViewTop];
    var lockedView = null;   // 'par' | 'perp' | 'top' | null — re-applied per ribbon
    // Screen-horizontal axis in k-space is (cosP, −sinP); pick φ so that axis is
    // the ribbon longitudinal (k∥) or width (k⊥) direction of the current ribbon.
    function applyView(mode) {
      if (!curP) return;
      var axdx = -curP.ny, axdy = curP.nx;     // k∥ (along ribbon axis)
      var trdx =  curP.nx, trdy = curP.ny;     // k⊥ (ribbon width)
      if (mode === 'par')       { cutPhi = atan2(-axdy, axdx); CUT_THETA = PI/2; }
      else if (mode === 'perp') { cutPhi = atan2(-trdy, trdx); CUT_THETA = PI/2; }
      else if (mode === 'top')  { cutPhi = atan2(-axdy, axdx); CUT_THETA = 0;    }
      cutDirty = true;
    }
    function setView(active, mode) {
      lockedView = mode;
      viewBtns.forEach(function (b) { if (b) b.classList.toggle('active', b === active); });
      applyView(mode);
    }
    function clearView() {
      lockedView = null;
      viewBtns.forEach(function (b) { if (b) b.classList.remove('active'); });
    }
    if (btnViewPar)  btnViewPar.addEventListener('click',  function () { setView(btnViewPar,  'par');  });
    if (btnViewPerp) btnViewPerp.addEventListener('click', function () { setView(btnViewPerp, 'perp'); });
    if (btnViewTop)  btnViewTop.addEventListener('click',  function () { setView(btnViewTop,  'top');  });
    // Free rotation cancels the locked-axis highlight
    cutC.addEventListener('pointerdown', clearView);
    cutC.addEventListener('wheel', clearView, { passive: true });

    // BZ top-view: scroll to zoom in/out
    bzC.addEventListener('wheel', function (e) {
      e.preventDefault();
      var f = e.deltaY < 0 ? 1.12 : 1/1.12;
      bzZoom = max(0.6, min(6, bzZoom * f));
      if (curP) drawBZ(curP);
    }, { passive: false });
    window.addEventListener('resize', function () { cutDirty = true; update(); });

    // ════════════════════════════════════════════════════════════
    //  Width-dependent band gap  E_g(N)  (expansion)
    //  Reuses ribbon() so the gap is computed from exactly the same
    //  cutting-line geometry as the subband plot.  For armchair
    //  ribbons the three families N = 3m, 3m+1 (semiconducting) and
    //  3m+2 (≈metallic) emerge automatically — never put in by hand.
    // ════════════════════════════════════════════════════════════
    var gapCV = document.getElementById('c-gnr-gap');
    function drawGapChart() {
      if (!gapCV) return;
      var d = dpr(gapCV), ctx = d.ctx, W = d.w, H = d.h;
      ctx.clearRect(0, 0, W, H);
      var TH = pal();
      var Nmin = +wSlider.min, Nmax = +wSlider.max, curN = +wSlider.value;
      var theta = curTheta;
      var gaps = [], gmax = 0.001;
      for (var n = Nmin; n <= Nmax; n++) {
        var g = ribbon(theta, n).gapE;          // eV (bandE already carries tHop)
        gaps.push(g);
        if (g > gmax) gmax = g;
      }
      gmax = max(gmax * 1.15, 0.3);
      var padL = 54, padR = 14, padT = 16, padB = 36;
      var plotW = W - padL - padR, plotH = H - padT - padB;
      var x0 = padL, y0 = padT + plotH;
      // grid + y labels
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      var yticks = 4;
      for (var t = 0; t <= yticks; t++) {
        var yy = y0 - plotH * t / yticks;
        ctx.strokeStyle = 'rgba(' + TH.grid + ',' + TH.gFaint + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + plotW, yy); ctx.stroke();
        ctx.fillStyle = 'rgba(' + TH.grid + ',0.55)';
        ctx.fillText((gmax * t / yticks).toFixed(1), x0 - 8, yy);
      }
      ctx.strokeStyle = 'rgba(' + TH.grid + ',0.3)';
      ctx.beginPath(); ctx.moveTo(x0, padT); ctx.lineTo(x0, y0); ctx.lineTo(x0 + plotW, y0); ctx.stroke();
      // y-axis title
      ctx.save();
      ctx.translate(15, padT + plotH / 2); ctx.rotate(-PI / 2);
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(' + TH.grid + ',0.7)';
      ctx.fillText('E_g  (eV)', 0, 0);
      ctx.restore();
      // bars
      var nN = gaps.length, bw = plotW / nN;
      var fam = [TH.famA, TH.famB, TH.famC];   // n%3 = 0, 1, 2
      ctx.textBaseline = 'top';
      for (var i = 0; i < nN; i++) {
        var n2 = Nmin + i, g2 = gaps[i];
        var bx = x0 + i * bw + bw * 0.18, bwd = bw * 0.64;
        var bh = plotH * (g2 / gmax);
        var col = (theta === 0) ? TH.zigBar : fam[n2 % 3];
        var isCur = (n2 === curN);
        ctx.globalAlpha = isCur ? 1 : 0.8;
        ctx.fillStyle = col;
        ctx.fillRect(bx, y0 - bh, bwd, bh);
        ctx.globalAlpha = 1;
        if (isCur) {
          ctx.strokeStyle = TH.cur; ctx.lineWidth = 2;
          ctx.strokeRect(bx, y0 - bh, bwd, bh);
          ctx.fillStyle = TH.cur; ctx.textAlign = 'center';
          ctx.fillText(g2 < 0.02 ? '0' : g2.toFixed(2), bx + bwd / 2, y0 - bh - 14);
        }
        if (n2 % 2 === 1 || isCur) {
          ctx.fillStyle = isCur ? TH.cur : 'rgba(' + TH.grid + ',0.5)';
          ctx.textAlign = 'center';
          ctx.fillText(n2, bx + bwd / 2, y0 + 6);
        }
      }
      ctx.fillStyle = 'rgba(' + TH.grid + ',0.7)'; ctx.textAlign = 'center';
      ctx.fillText('ribbon width  N', x0 + plotW / 2, y0 + 20);
    }
    var _gnrUpdate = update;
    update = function () { _gnrUpdate(); drawGapChart(); };
    window.addEventListener('resize', drawGapChart);
    // Tweaks "Plate" control flips window.__gnrLight then calls this to recolour.
    window.__gnrRedraw = function () { update(); };

    setSliderRange(curTheta === 0);
    update();
    requestAnimationFrame(cutFrame);
  })();
})();
