(function () {
  'use strict';
  var PI = Math.PI, cos = Math.cos, sin = Math.sin, sqrt = Math.sqrt, sqrt3 = sqrt(3);
  var drawn = {};

  function dpr(cv) {
    var r = window.devicePixelRatio || 1;
    var rect = cv.getBoundingClientRect();
    var w = rect.width * r, h = rect.height * r;
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.scale(r, r);
    return { ctx: ctx, w: rect.width, h: rect.height };
  }

  function arw(ctx, x0, y0, x1, y1, hl) {
    hl = hl || 8;
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    var ux = dx / L, uy = dy / L;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * hl + uy * hl * 0.38, y1 - uy * hl - ux * hl * 0.38);
    ctx.lineTo(x1 - ux * hl - uy * hl * 0.38, y1 - uy * hl + ux * hl * 0.38);
    ctx.closePath(); ctx.fill();
  }

  function dot(ctx, x, y, r, col) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * PI);
    ctx.fillStyle = col; ctx.fill();
  }

  function lbl(ctx, text, x, y, col, sz, al) {
    ctx.fillStyle = col || '#a8a29e';
    ctx.font = (sz || 11) + 'px "DM Sans",sans-serif';
    ctx.textAlign = al || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function lblB(ctx, text, x, y, col, sz, al) {
    ctx.fillStyle = col || '#a8a29e';
    ctx.font = 'bold ' + (sz || 11) + 'px "DM Sans",sans-serif';
    ctx.textAlign = al || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  // Honeycomb helper: draw lattice in a region
  function honeycomb(ctx, cx, cy, sc, xMin, xMax, yMin, yMax, opts) {
    var d1y = sc / sqrt3;
    var a1x = sc, a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;
    var bonds = [[0, -d1y], [-0.5 * sc, 0.5 * d1y], [0.5 * sc, 0.5 * d1y]];
    var RA = 8;
    opts = opts || {};
    var aCol = opts.aCol || 'rgba(239,68,68,.5)';
    var bCol = opts.bCol || 'rgba(59,130,246,.5)';
    var bondCol = opts.bondCol || 'rgba(255,255,255,.12)';
    var rr = opts.r || 3;

    for (var n = -RA; n <= RA; n++) for (var m = -RA; m <= RA; m++) {
      var ax = cx + n * a1x + m * a2x, ay = cy + m * a2y;
      if (ax < xMin - sc || ax > xMax + sc || ay < yMin - sc || ay > yMax + sc) continue;
      // bonds
      ctx.strokeStyle = bondCol; ctx.lineWidth = 1;
      for (var di = 0; di < 3; di++) {
        var bx = ax + bonds[di][0], by = ay + bonds[di][1];
        if (bx < xMin - 5 || bx > xMax + 5 || by < yMin - 5 || by > yMax + 5) continue;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      if (ax >= xMin && ax <= xMax && ay >= yMin && ay <= yMax)
        dot(ctx, ax, ay, rr, aCol);
      var bbx = ax, bby = ay - d1y;
      if (bbx >= xMin && bbx <= xMax && bby >= yMin && bby <= yMax)
        dot(ctx, bbx, bby, rr, bCol);
    }
  }

  // ── 1. Periodic array of atoms ──
  function drawPeriodic(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var sc = 30, cx = W / 2, cy = H / 2;

    // Simple square lattice — one atom per point
    for (var n = -8; n <= 8; n++) for (var m = -5; m <= 5; m++) {
      var x = cx + n * sc, y = cy + m * sc;
      if (x < -5 || x > W + 5 || y < 8 || y > H - 14) continue;
      dot(ctx, x, y, 3, 'rgba(168,162,158,.45)');
    }

    // Dashed tile outlines
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(251,191,36,.35)'; ctx.lineWidth = 1;
    for (var n = -1; n <= 2; n++) for (var m = -1; m <= 1; m++) {
      var bx = cx + n * sc, by = cy + m * sc;
      ctx.strokeRect(bx, by, sc, sc);
    }
    ctx.setLineDash([]);

    // Highlight one cell
    ctx.fillStyle = 'rgba(251,191,36,.15)';
    ctx.fillRect(cx, cy, sc, sc);
    ctx.strokeStyle = 'rgba(251,191,36,.8)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx, cy, sc, sc);

    lbl(ctx, 'The same unit repeats throughout the crystal', W / 2, H - 6, '#78716c', 10);
  }

  // ── 2. Lattice translation vectors ──
  function drawTranslation(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var sc = 34, cx = W / 2, cy = H * 0.52;
    var a1x = sc, a1y = 0;
    var a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;

    // Lattice points
    for (var n = -4; n <= 4; n++) for (var m = -3; m <= 3; m++) {
      var x = cx + n * a1x + m * a2x, y = cy + n * a1y + m * a2y;
      if (x < 5 || x > W - 5 || y < 15 || y > H - 18) continue;
      dot(ctx, x, y, 2.8, 'rgba(168,162,158,.4)');
    }

    // Origin
    dot(ctx, cx, cy, 5, '#fbbf24');

    // a1 arrow
    ctx.strokeStyle = '#ef4444'; ctx.fillStyle = '#ef4444'; ctx.lineWidth = 2.2;
    arw(ctx, cx, cy, cx + a1x, cy, 9);
    lblB(ctx, 'a₁', cx + a1x / 2, cy + 14, '#ef4444', 13);

    // a2 arrow
    ctx.strokeStyle = '#3b82f6'; ctx.fillStyle = '#3b82f6'; ctx.lineWidth = 2.2;
    arw(ctx, cx, cy, cx + a2x, cy + a2y, 9);
    lblB(ctx, 'a₂', cx + a2x - 14, cy + a2y / 2 - 4, '#3b82f6', 13);

    // T = 2a1 + a2 example
    var tx = 2 * a1x + a2x, ty = 2 * a1y + a2y;
    dot(ctx, cx + tx, cy + ty, 5, '#34d399');
    ctx.strokeStyle = '#34d399'; ctx.fillStyle = '#34d399'; ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 3]);
    arw(ctx, cx, cy, cx + tx, cy + ty, 8);
    ctx.setLineDash([]);
    lbl(ctx, 'T = 2a₁ + a₂', cx + tx + 8, cy + ty + 12, '#34d399', 10, 'left');

    lbl(ctx, 'Lattice translation: any integer combination of a₁, a₂', W / 2, H - 6, '#78716c', 10);
  }

  // ── 3. Basis and crystal structure ──
  function drawBasis(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var sc = 30;
    var sec = W / 5;

    // --- Lattice (just dots) ---
    var ox1 = sec * 0.8, oy = H * 0.48;
    var a1x = sc, a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;
    for (var n = -1; n <= 2; n++) for (var m = -1; m <= 2; m++) {
      var x = ox1 + n * a1x + m * a2x, y = oy + m * a2y;
      if (x < 0 || x > sec * 1.5 || y < 12 || y > H - 18) continue;
      dot(ctx, x, y, 4, 'rgba(168,162,158,.6)');
    }
    lblB(ctx, 'Lattice', ox1, 14, '#a8a29e', 11);

    // + sign
    ctx.fillStyle = '#78716c'; ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', sec * 1.7, H * 0.45);

    // --- Basis (one or two atoms) ---
    var ox2 = sec * 2.3;
    // Show 2-atom basis
    dot(ctx, ox2, oy - 6, 6, '#ef4444');
    dot(ctx, ox2, oy - 6 - sc / sqrt3, 6, '#3b82f6');
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox2, oy - 6); ctx.lineTo(ox2, oy - 6 - sc / sqrt3); ctx.stroke();
    lbl(ctx, 'A', ox2 + 10, oy - 6, '#ef4444', 10, 'left');
    lbl(ctx, 'B', ox2 + 10, oy - 6 - sc / sqrt3, '#3b82f6', 10, 'left');
    lblB(ctx, 'Basis', ox2, 14, '#a8a29e', 11);

    // = sign
    ctx.fillStyle = '#78716c'; ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('=', sec * 3.1, H * 0.45);

    // --- Crystal (honeycomb) ---
    var ox3 = sec * 4.0;
    honeycomb(ctx, ox3, oy, sc, sec * 3.3, W, 12, H - 18, {r: 3.5});
    lblB(ctx, 'Crystal', ox3, 14, '#fbbf24', 11);
  }

  // ── 4. Primitive lattice cell ──
  function drawCells(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var sc = 30, midX = W / 2;

    // Left: primitive cell tiling
    var ox = midX * 0.42, oy = H * 0.52;
    var a1x = sc, a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;

    for (var n = -2; n <= 3; n++) for (var m = -1; m <= 3; m++) {
      var bx = ox + n * a1x + m * a2x, by = oy + m * a2y;
      var isCtr = (n === 0 && m === 0);
      ctx.strokeStyle = isCtr ? 'rgba(251,191,36,.7)' : 'rgba(255,255,255,.07)';
      ctx.lineWidth = isCtr ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + a1x, by);
      ctx.lineTo(bx + a1x + a2x, by + a2y); ctx.lineTo(bx + a2x, by + a2y);
      ctx.closePath();
      if (isCtr) { ctx.fillStyle = 'rgba(251,191,36,.12)'; ctx.fill(); }
      ctx.stroke();
    }
    for (var n = -3; n <= 4; n++) for (var m = -2; m <= 4; m++) {
      var x = ox + n * a1x + m * a2x, y = oy + m * a2y;
      if (x < 0 || x > midX - 5 || y < 12 || y > H - 18) continue;
      dot(ctx, x, y, 2.5, 'rgba(168,162,158,.45)');
    }
    lblB(ctx, 'Primitive cell', ox, H - 8, '#fbbf24', 10);

    // Right: Wigner-Seitz cell
    var ox2 = midX * 1.55, oy2 = H * 0.52;
    for (var n = -3; n <= 4; n++) for (var m = -2; m <= 4; m++) {
      var x = ox2 + n * a1x + m * a2x, y = oy2 + m * a2y;
      if (x < midX + 5 || x > W || y < 12 || y > H - 18) continue;
      dot(ctx, x, y, 2.5, 'rgba(168,162,158,.45)');
    }
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var ang = PI / 6 + i * PI / 3, r = sc / sqrt3;
      var px = ox2 + r * cos(ang), py = oy2 - r * sin(ang);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(52,211,153,.1)'; ctx.fill();
    ctx.strokeStyle = 'rgba(52,211,153,.65)'; ctx.lineWidth = 1.5; ctx.stroke();
    dot(ctx, ox2, oy2, 4, '#fbbf24');
    lblB(ctx, 'Wigner–Seitz cell', ox2, H - 8, '#34d399', 10);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(midX, 12); ctx.lineTo(midX, H - 18); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── 5. 2D crystal systems ──
  function drawCrystalSystems(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var systems = [
      { name: 'Oblique',     a1: [1, 0], a2: [0.4, 0.7],   symm: '2',   col: '#78716c' },
      { name: 'Rectangular', a1: [1, 0], a2: [0, 0.7],      symm: '2mm', col: '#78716c' },
      { name: 'Square',      a1: [1, 0], a2: [0, 1],        symm: '4mm', col: '#78716c' },
      { name: 'Hexagonal',   a1: [1, 0], a2: [0.5, 0.866],  symm: '6mm', col: '#fbbf24' }
    ];
    var cols = 4, sp = W / cols;
    var sc = 20;

    for (var t = 0; t < systems.length; t++) {
      var tp = systems[t];
      var ox = sp * (t + 0.5), oy = H * 0.48;
      var a1x = tp.a1[0] * sc, a1y = -tp.a1[1] * sc;
      var a2x = tp.a2[0] * sc, a2y = -tp.a2[1] * sc;

      for (var n = -2; n <= 2; n++) for (var m = -2; m <= 2; m++) {
        var x = ox + n * a1x + m * a2x, y = oy + n * a1y + m * a2y;
        if (x < sp * t + 2 || x > sp * (t + 1) - 2 || y < 28 || y > H - 30) continue;
        dot(ctx, x, y, 2.2, 'rgba(168,162,158,.5)');
      }

      // Cell outline
      var isHex = (t === 3);
      ctx.strokeStyle = isHex ? 'rgba(251,191,36,.5)' : 'rgba(255,255,255,.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox, oy); ctx.lineTo(ox + a1x, oy + a1y);
      ctx.lineTo(ox + a1x + a2x, oy + a1y + a2y);
      ctx.lineTo(ox + a2x, oy + a2y); ctx.closePath(); ctx.stroke();

      // Angle arc
      ctx.strokeStyle = isHex ? 'rgba(251,191,36,.4)' : 'rgba(255,255,255,.2)';
      ctx.lineWidth = 0.8;
      var angStart = Math.atan2(-a1y, a1x);
      var angEnd = Math.atan2(-a2y, a2x);
      ctx.beginPath(); ctx.arc(ox, oy, 10, -angStart, -angEnd, true); ctx.stroke();
      lbl(ctx, 'φ', ox + 13 * cos((angStart + angEnd) / 2), oy - 13 * sin((angStart + angEnd) / 2),
          isHex ? 'rgba(251,191,36,.6)' : 'rgba(255,255,255,.3)', 8);

      // Name & point group
      lbl(ctx, tp.name, ox, H - 20, isHex ? '#fbbf24' : '#a8a29e', isHex ? 10 : 9);
      lbl(ctx, tp.symm, ox, H - 8, isHex ? 'rgba(251,191,36,.6)' : '#78716c', 8);
      if (isHex) lbl(ctx, '← graphene', ox, 16, '#fbbf24', 9);
    }

    lbl(ctx, '4 crystal systems — classified by point-group symmetry', W / 2, H - 0, '#78716c', 9);
  }

  // ── 6. 2D Bravais lattice types ──
  function draw2DTypes(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var types = [
      { name: 'Oblique (p)',      a1: [1, 0], a2: [0.4, 0.7], sys: 'oblique',  col: '#78716c' },
      { name: 'Rect. (p)',        a1: [1, 0], a2: [0, 0.7],   sys: 'rect',     col: '#78716c' },
      { name: 'Rect. (c)',        a1: [1, 0], a2: [0, 0.7],   sys: 'rect', centered: true, col: '#78716c' },
      { name: 'Square (p)',       a1: [1, 0], a2: [0, 1],      sys: 'square',  col: '#78716c' },
      { name: 'Hexagonal (p)',    a1: [1, 0], a2: [0.5, 0.866], sys: 'hex',    col: '#fbbf24' }
    ];
    var cols = 5, sp = W / cols;
    var sc = 18;

    for (var t = 0; t < types.length; t++) {
      var tp = types[t];
      var ox = sp * (t + 0.5), oy = H * 0.52;
      var a1x = tp.a1[0] * sc, a1y = -tp.a1[1] * sc;
      var a2x = tp.a2[0] * sc, a2y = -tp.a2[1] * sc;

      for (var n = -2; n <= 2; n++) for (var m = -2; m <= 2; m++) {
        var x = ox + n * a1x + m * a2x, y = oy + n * a1y + m * a2y;
        if (x < sp * t + 2 || x > sp * (t + 1) - 2 || y < 26 || y > H - 20) continue;
        dot(ctx, x, y, 2.2, 'rgba(168,162,158,.5)');
        if (tp.centered) {
          var cx2 = x + (a1x + a2x) / 2, cy2 = y + (a1y + a2y) / 2;
          if (cx2 > sp * t + 2 && cx2 < sp * (t + 1) - 2 && cy2 > 26 && cy2 < H - 20)
            dot(ctx, cx2, cy2, 2.2, 'rgba(168,162,158,.5)');
        }
      }

      // Cell outline
      var isHex = (t === 4);
      ctx.strokeStyle = isHex ? 'rgba(251,191,36,.5)' : 'rgba(255,255,255,.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox, oy); ctx.lineTo(ox + a1x, oy + a1y);
      ctx.lineTo(ox + a1x + a2x, oy + a1y + a2y);
      ctx.lineTo(ox + a2x, oy + a2y); ctx.closePath(); ctx.stroke();

      // Bracket for rect system
      if (t === 1 || t === 2) {
        ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 0.8;
        if (t === 1) {
          ctx.beginPath(); ctx.moveTo(sp * 1, 14); ctx.lineTo(sp * 3, 14); ctx.stroke();
          lbl(ctx, 'rectangular system', sp * 2, 10, '#78716c', 8);
        }
      }

      // Name
      lbl(ctx, tp.name, ox, H - 8, isHex ? '#fbbf24' : '#78716c', isHex ? 10 : 9);
      if (isHex) lbl(ctx, '← graphene', ox, 14, '#fbbf24', 9);
    }
  }

  // ── 7. Graphene: honeycomb ──
  function drawGraphene(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var sc = 28, cx = W / 2, cy = H * 0.50;
    var d1y = sc / sqrt3;
    var a1x = sc, a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;

    honeycomb(ctx, cx, cy, sc, 0, W, 8, H - 8, { r: 3 });

    // Highlight A/B in one cell
    dot(ctx, cx, cy, 5.5, '#ef4444');
    dot(ctx, cx, cy - d1y, 5.5, '#3b82f6');
    lblB(ctx, 'A', cx - 10, cy + 4, '#ef4444', 12, 'right');
    lblB(ctx, 'B', cx - 10, cy - d1y, '#3b82f6', 12, 'right');

    // Unit cell
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(cx + a1x, cy);
    ctx.lineTo(cx + a1x + a2x, cy + a2y); ctx.lineTo(cx + a2x, cy + a2y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(251,191,36,.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,.55)'; ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);

    // a1, a2
    ctx.strokeStyle = '#34d399'; ctx.fillStyle = '#34d399'; ctx.lineWidth = 2;
    arw(ctx, cx, cy, cx + a1x * 0.9, cy, 7);
    lblB(ctx, 'a₁', cx + a1x / 2, cy + 13, '#34d399', 11);

    ctx.strokeStyle = '#c084fc'; ctx.fillStyle = '#c084fc'; ctx.lineWidth = 2;
    arw(ctx, cx, cy, cx + a2x * 0.9, cy + a2y * 0.9, 7);
    lblB(ctx, 'a₂', cx + a2x - 14, cy + a2y / 2 - 3, '#c084fc', 11);
  }

  // ── 7. Reciprocal lattice ──
  function drawReciprocal(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var midX = W / 2;

    // Left: real lattice
    var sc = 22, ox = midX * 0.38, oy = H / 2;
    var a1x = sc, a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;
    for (var n = -3; n <= 3; n++) for (var m = -2; m <= 3; m++) {
      var x = ox + n * a1x + m * a2x, y = oy + m * a2y;
      if (x < 0 || x > midX - 10 || y < 12 || y > H - 18) continue;
      dot(ctx, x, y, 2.3, 'rgba(168,162,158,.4)');
    }
    ctx.strokeStyle = '#34d399'; ctx.fillStyle = '#34d399'; ctx.lineWidth = 1.8;
    arw(ctx, ox, oy, ox + a1x, oy, 6);
    ctx.strokeStyle = '#c084fc'; ctx.fillStyle = '#c084fc';
    arw(ctx, ox, oy, ox + a2x, oy + a2y, 6);
    lblB(ctx, 'a₁', ox + a1x + 5, oy + 9, '#34d399', 10, 'left');
    lblB(ctx, 'a₂', ox + a2x - 10, oy + a2y - 5, '#c084fc', 10);
    lbl(ctx, 'Real space', ox, H - 6, '#78716c', 9);

    // Arrow
    ctx.fillStyle = '#78716c'; ctx.font = '15px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⟶', midX, H / 2);
    lbl(ctx, 'aᵢ·bⱼ = 2πδᵢⱼ', midX, H / 2 - 14, '#78716c', 9);

    // Right: reciprocal lattice (rotated 30°)
    var sc2 = 26, ox2 = midX * 1.6, oy2 = H / 2;
    var b1x = sc2, b1y = sc2 / sqrt3;
    var b2x = 0, b2y = -2 * sc2 / sqrt3;
    for (var n = -3; n <= 3; n++) for (var m = -3; m <= 3; m++) {
      var x = ox2 + n * b1x + m * b2x, y = oy2 - n * b1y + m * b2y;
      if (x < midX + 5 || x > W || y < 12 || y > H - 18) continue;
      dot(ctx, x, y, 2.3, 'rgba(168,162,158,.4)');
    }
    ctx.strokeStyle = '#fb923c'; ctx.fillStyle = '#fb923c'; ctx.lineWidth = 1.8;
    arw(ctx, ox2, oy2, ox2 + b1x, oy2 - b1y, 6);
    ctx.strokeStyle = '#60a5fa'; ctx.fillStyle = '#60a5fa';
    arw(ctx, ox2, oy2, ox2 + b2x, oy2 + b2y, 6);
    lblB(ctx, 'b₁', ox2 + b1x + 5, oy2 - b1y, '#fb923c', 10, 'left');
    lblB(ctx, 'b₂', ox2 + b2x + 8, oy2 + b2y / 2, '#60a5fa', 10, 'left');
    lbl(ctx, 'Reciprocal space', ox2, H - 6, '#78716c', 9);

    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(midX, 12); ctx.lineTo(midX, H - 16); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── 8. Brillouin zone ──
  function drawBZ(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var cx = W * 0.38, cy = H * 0.48;
    var R = Math.min(W * 0.3, H * 0.36);

    // BZ hexagon
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var ang = i * PI / 3;
      var px = cx + R * cos(ang), py = cy - R * sin(ang);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(251,191,36,.06)'; ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,.5)'; ctx.lineWidth = 1.5; ctx.stroke();

    // Γ
    dot(ctx, cx, cy, 4, '#fbbf24');
    lblB(ctx, 'Γ', cx - 10, cy + 10, '#fbbf24', 13);

    // K/K' corners
    for (var i = 0; i < 6; i++) {
      var ang = i * PI / 3;
      var kx = cx + R * cos(ang), ky = cy - R * sin(ang);
      dot(ctx, kx, ky, 4, i % 2 === 0 ? '#ef4444' : '#3b82f6');
    }
    lblB(ctx, 'K', cx + R + 8, cy + 2, '#ef4444', 12, 'left');
    lblB(ctx, 'K\'', cx + R * cos(PI / 3) + 6, cy - R * sin(PI / 3) - 8, '#3b82f6', 12, 'left');

    // M
    var Mx = cx + R * (cos(0) + cos(PI / 3)) / 2;
    var My = cy - R * (sin(0) + sin(PI / 3)) / 2;
    dot(ctx, Mx, My, 3.5, '#78716c');
    lbl(ctx, 'M', Mx + 8, My - 6, '#78716c', 11, 'left');

    // Γ→M→K→Γ path
    var Kx = cx + R, Ky = cy;
    ctx.strokeStyle = 'rgba(52,211,153,.45)'; ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(Mx, My);
    ctx.lineTo(Kx, Ky); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.setLineDash([]);
    lbl(ctx, 'Γ→M→K→Γ', cx, H - 8, '#34d399', 10);

    // Right: zoomed Dirac cone
    var ccx = W * 0.78, ccy = cy;
    var cH = H * 0.3, cW = W * 0.12;

    // Cones
    var g1 = ctx.createLinearGradient(ccx, ccy, ccx, ccy - cH);
    g1.addColorStop(0, 'rgba(239,68,68,.45)'); g1.addColorStop(1, 'rgba(239,68,68,.05)');
    ctx.beginPath(); ctx.moveTo(ccx, ccy); ctx.lineTo(ccx - cW, ccy - cH); ctx.lineTo(ccx + cW, ccy - cH); ctx.closePath();
    ctx.fillStyle = g1; ctx.fill();

    var g2 = ctx.createLinearGradient(ccx, ccy, ccx, ccy + cH);
    g2.addColorStop(0, 'rgba(59,130,246,.45)'); g2.addColorStop(1, 'rgba(59,130,246,.05)');
    ctx.beginPath(); ctx.moveTo(ccx, ccy); ctx.lineTo(ccx - cW, ccy + cH); ctx.lineTo(ccx + cW, ccy + cH); ctx.closePath();
    ctx.fillStyle = g2; ctx.fill();

    dot(ctx, ccx, ccy, 3.5, '#fbbf24');
    lbl(ctx, 'E = 0', ccx + 8, ccy - 8, '#fbbf24', 9, 'left');
    lbl(ctx, 'π*', ccx + cW + 4, ccy - cH * 0.5, '#ef4444', 9, 'left');
    lbl(ctx, 'π', ccx + cW + 4, ccy + cH * 0.5, '#3b82f6', 9, 'left');
    lbl(ctx, 'Graphene: Dirac cone at K', ccx, H - 8, '#a8a29e', 10);

    // zoom line
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(Kx + 6, Ky); ctx.lineTo(ccx - cW - 6, ccy); ctx.stroke();
    ctx.setLineDash([]);
  }

  var figMap = {
    'fig-periodic': drawPeriodic,
    'fig-translation': drawTranslation,
    'fig-basis': drawBasis,
    'fig-cells': drawCells,
    'fig-crystal-systems': drawCrystalSystems,
    'fig-2d-types': draw2DTypes,
    'fig-graphene': drawGraphene,
    'fig-reciprocal': drawReciprocal,
    'fig-bz': drawBZ
  };

  function drawAll() {
    Object.keys(figMap).forEach(function (id) {
      if (drawn[id]) return;
      var cv = document.getElementById(id);
      if (!cv || cv.offsetParent === null) return;
      figMap[id](cv);
      drawn[id] = true;
    });
  }

  window.addEventListener('resize', function () { drawn = {}; drawAll(); });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', drawAll);
  else
    drawAll();
})();
