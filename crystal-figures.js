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

  function arrow(ctx, x0, y0, x1, y1, headLen) {
    headLen = headLen || 8;
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    var ux = dx / L, uy = dy / L;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * headLen + uy * headLen * 0.4, y1 - uy * headLen - ux * headLen * 0.4);
    ctx.lineTo(x1 - ux * headLen - uy * headLen * 0.4, y1 - uy * headLen + ux * headLen * 0.4);
    ctx.closePath(); ctx.fill();
  }

  function dot(ctx, x, y, r, col) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * PI);
    ctx.fillStyle = col; ctx.fill();
  }

  function label(ctx, text, x, y, col, size, align) {
    ctx.fillStyle = col || '#a8a29e';
    ctx.font = (size || 11) + 'px "DM Sans", sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  // ── Figure 1: Crystal vs Amorphous ──
  function drawCrystalVsAmorphous(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var midX = W / 2;

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(midX, 20); ctx.lineTo(midX, H - 20); ctx.stroke();
    ctx.setLineDash([]);

    // Left: crystal (periodic grid)
    var sp = 24, ox = midX / 2, oy = H / 2;
    var cols = 7, rows = 5;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = ox + (c - cols / 2 + 0.5) * sp + (r % 2) * sp * 0.5;
      var y = oy + (r - rows / 2 + 0.5) * sp * sqrt3 / 2;
      dot(ctx, x, y, 3.2, 'rgba(59,130,246,.8)');
    }
    label(ctx, 'Crystal (periodic)', midX / 2, H - 12, '#78716c', 11);

    // Right: amorphous (random)
    var seed = 42;
    function rand() { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; }
    var ox2 = midX + midX / 2;
    for (var i = 0; i < 35; i++) {
      var x = ox2 + (rand() - 0.5) * (midX - 40);
      var y = H / 2 + (rand() - 0.5) * (H - 60);
      dot(ctx, x, y, 3.2, 'rgba(168,162,158,.6)');
    }
    label(ctx, 'Amorphous (random)', midX + midX / 2, H - 12, '#78716c', 11);
  }

  // ── Figure 2: Bravais lattice ──
  function drawBravais(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var sc = 36, cx = W / 2, cy = H / 2;
    var a1x = 1 * sc, a1y = 0;
    var a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;

    for (var n = -4; n <= 4; n++) for (var m = -3; m <= 3; m++) {
      var x = cx + n * a1x + m * a2x;
      var y = cy + n * a1y + m * a2y;
      if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
      var isOrigin = (n === 0 && m === 0);
      dot(ctx, x, y, isOrigin ? 4.5 : 3, isOrigin ? '#fbbf24' : 'rgba(168,162,158,.5)');
    }

    // a1, a2 arrows from origin
    ctx.strokeStyle = '#ef4444'; ctx.fillStyle = '#ef4444'; ctx.lineWidth = 2;
    arrow(ctx, cx, cy, cx + a1x, cy + a1y, 9);
    label(ctx, 'a₁', cx + a1x + 8, cy + 12, '#ef4444', 13, 'left');

    ctx.strokeStyle = '#3b82f6'; ctx.fillStyle = '#3b82f6'; ctx.lineWidth = 2;
    arrow(ctx, cx, cy, cx + a2x, cy + a2y, 9);
    label(ctx, 'a₂', cx + a2x - 14, cy + a2y - 6, '#3b82f6', 13);

    label(ctx, 'Every point sees the same environment', W / 2, H - 10, '#78716c', 10);
  }

  // ── Figure 3: Unit cell ──
  function drawUnitcell(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var sc = 32, midX = W / 2;

    // Left: primitive cell (parallelogram tiling)
    var ox = midX * 0.42, oy = H / 2;
    var a1x = sc, a1y = 0, a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;

    // Draw a few parallelograms
    ctx.lineWidth = 1;
    for (var n = -2; n <= 2; n++) for (var m = -1; m <= 2; m++) {
      var bx = ox + n * a1x + m * a2x, by = oy + n * a1y + m * a2y;
      var isCenter = (n === 0 && m === 0);
      ctx.strokeStyle = isCenter ? 'rgba(251,191,36,.7)' : 'rgba(255,255,255,.08)';
      if (isCenter) { ctx.fillStyle = 'rgba(251,191,36,.12)'; }
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + a1x, by + a1y);
      ctx.lineTo(bx + a1x + a2x, by + a1y + a2y);
      ctx.lineTo(bx + a2x, by + a2y);
      ctx.closePath();
      if (isCenter) ctx.fill();
      ctx.stroke();
    }
    for (var n = -3; n <= 3; n++) for (var m = -2; m <= 3; m++) {
      var x = ox + n * a1x + m * a2x, y = oy + n * a1y + m * a2y;
      if (x < 0 || x > midX - 10 || y < 5 || y > H - 20) continue;
      dot(ctx, x, y, 2.8, 'rgba(168,162,158,.5)');
    }
    label(ctx, 'Primitive cell', ox, H - 10, '#fbbf24', 10);

    // Right: Wigner-Seitz cell
    var ox2 = midX * 1.55, oy2 = H / 2;
    for (var n = -3; n <= 3; n++) for (var m = -2; m <= 3; m++) {
      var x = ox2 + n * a1x + m * a2x, y = oy2 + n * a1y + m * a2y;
      if (x < midX + 10 || x > W || y < 5 || y > H - 20) continue;
      dot(ctx, x, y, 2.8, 'rgba(168,162,158,.5)');
    }
    // Hexagonal WS cell
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var ang = PI / 6 + i * PI / 3;
      var r = sc / sqrt3;
      var px = ox2 + r * cos(ang), py = oy2 - r * sin(ang);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(52,211,153,.1)'; ctx.fill();
    ctx.strokeStyle = 'rgba(52,211,153,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    dot(ctx, ox2, oy2, 4, '#fbbf24');
    label(ctx, 'Wigner–Seitz cell', ox2, H - 10, '#34d399', 10);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(midX, 15); ctx.lineTo(midX, H - 22); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Figure 4: Lattice + Basis ──
  function drawBasis(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var sc = 38, midX = W / 2;

    // Left: 1-atom basis
    var ox = midX * 0.35, oy = H * 0.45;
    var a1x = sc, a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;
    for (var n = -2; n <= 2; n++) for (var m = -1; m <= 2; m++) {
      var x = ox + n * a1x + m * a2x, y = oy + m * a2y;
      if (x < 0 || x > midX - 10 || y < 10 || y > H - 28) continue;
      dot(ctx, x, y, 4.5, 'rgba(59,130,246,.7)');
    }
    label(ctx, '1-atom basis', ox, H - 10, '#78716c', 10);

    // = sign
    ctx.fillStyle = '#78716c'; ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', midX, H * 0.32);

    // Right: 2-atom basis → honeycomb
    var ox2 = midX * 1.6, oy2 = H * 0.45;
    var dy = sc / sqrt3;
    for (var n = -2; n <= 2; n++) for (var m = -1; m <= 2; m++) {
      var x = ox2 + n * a1x + m * a2x, y = oy2 + m * a2y;
      if (x < midX + 10 || x > W || y < 10 || y > H - 28) continue;
      dot(ctx, x, y, 4.5, '#ef4444');
      dot(ctx, x, y - dy, 4.5, '#3b82f6');
      // bond
      ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - dy); ctx.stroke();
    }
    label(ctx, '2-atom basis → honeycomb', ox2, H - 10, '#78716c', 10);

    // Annotations
    label(ctx, 'Lattice points', ox, 14, '#3b82f6', 10);
    label(ctx, 'A + B atoms at each point', ox2, 14, '#a8a29e', 10);

    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(midX, 15); ctx.lineTo(midX, H - 22); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Figure 5: Honeycomb ≠ Bravais ──
  function drawHoneycombNotBravais(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var sc = 28, midX = W / 2;
    var d1y = sc / sqrt3;
    var a1x = sc, a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;
    var bonds = [[0, -d1y], [-0.5 * sc, 0.5 * d1y], [0.5 * sc, 0.5 * d1y]];
    var bondsB = [[0, d1y], [-0.5 * sc, -0.5 * d1y], [0.5 * sc, -0.5 * d1y]];

    // Left: A site highlighted
    var ox = midX * 0.38, oy = H * 0.5;
    for (var n = -3; n <= 3; n++) for (var m = -2; m <= 3; m++) {
      var ax = ox + n * a1x + m * a2x, ay = oy + m * a2y;
      var bx = ax, by = ay - d1y;
      if (ax < -5 || ax > midX - 5 || ay < 5 || ay > H - 22) continue;
      // bonds
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
      for (var di = 0; di < 3; di++) {
        var nx = ax + bonds[di][0], ny = ay + bonds[di][1];
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(nx, ny); ctx.stroke();
      }
      dot(ctx, ax, ay, 3, 'rgba(239,68,68,.4)');
      if (by > 5 && by < H - 22) dot(ctx, bx, by, 3, 'rgba(59,130,246,.4)');
    }
    // Highlight one A
    var hx = ox, hy = oy;
    dot(ctx, hx, hy, 6, '#ef4444');
    for (var di = 0; di < 3; di++) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5;
      var nx = hx + bonds[di][0], ny = hy + bonds[di][1];
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(nx, ny); ctx.stroke();
      dot(ctx, nx, ny, 4, '#3b82f6');
    }
    label(ctx, 'A site: neighbors ↗ ↘ ↓', midX * 0.38, H - 8, '#ef4444', 10);

    // Right: B site highlighted
    var ox2 = midX * 1.6, oy2 = H * 0.5;
    for (var n = -3; n <= 3; n++) for (var m = -2; m <= 3; m++) {
      var ax = ox2 + n * a1x + m * a2x, ay = oy2 + m * a2y;
      var bx = ax, by = ay - d1y;
      if (ax < midX + 5 || ax > W + 5 || ay < 5 || ay > H - 22) continue;
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
      for (var di = 0; di < 3; di++) {
        var nx = ax + bonds[di][0], ny = ay + bonds[di][1];
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(nx, ny); ctx.stroke();
      }
      dot(ctx, ax, ay, 3, 'rgba(239,68,68,.4)');
      if (by > 5 && by < H - 22) dot(ctx, bx, by, 3, 'rgba(59,130,246,.4)');
    }
    // Highlight one B
    var hbx = ox2, hby = oy2 - d1y;
    dot(ctx, hbx, hby, 6, '#3b82f6');
    for (var di = 0; di < 3; di++) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5;
      var nx = hbx + bondsB[di][0], ny = hby + bondsB[di][1];
      ctx.beginPath(); ctx.moveTo(hbx, hby); ctx.lineTo(nx, ny); ctx.stroke();
      dot(ctx, nx, ny, 4, '#ef4444');
    }
    label(ctx, 'B site: neighbors ↖ ↙ ↑', midX * 1.6, H - 8, '#3b82f6', 10);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(midX, 15); ctx.lineTo(midX, H - 20); ctx.stroke();
    ctx.setLineDash([]);

    label(ctx, '≠ Rotated 180°', midX, 14, '#fbbf24', 10);
  }

  // ── Figure 6: Graphene lattice with vectors ──
  function drawGrapheneLattice(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var sc = 30, cx = W / 2, cy = H * 0.48;
    var d1y = sc / sqrt3;
    var a1x = sc, a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;
    var bonds = [[0, -d1y], [-0.5 * sc, 0.5 * d1y], [0.5 * sc, 0.5 * d1y]];

    // Draw honeycomb
    for (var n = -5; n <= 5; n++) for (var m = -3; m <= 4; m++) {
      var ax = cx + n * a1x + m * a2x, ay = cy + m * a2y;
      if (ax < -5 || ax > W + 5 || ay < 5 || ay > H - 18) continue;
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
      for (var di = 0; di < 3; di++) {
        var bx = ax + bonds[di][0], by = ay + bonds[di][1];
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      dot(ctx, ax, ay, 3, 'rgba(239,68,68,.5)');
      var bx2 = ax, by2 = ay - d1y;
      if (by2 > 5 && by2 < H - 18) dot(ctx, bx2, by2, 3, 'rgba(59,130,246,.5)');
    }

    // Unit cell parallelogram
    var ux = cx, uy = cy;
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.lineTo(ux + a1x, uy);
    ctx.lineTo(ux + a1x + a2x, uy + a2y);
    ctx.lineTo(ux + a2x, uy + a2y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(251,191,36,.1)'; ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,.6)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);

    // Highlight A, B in unit cell
    dot(ctx, ux, uy, 5, '#ef4444');
    dot(ctx, ux, uy - d1y, 5, '#3b82f6');
    label(ctx, 'A', ux + 8, uy + 5, '#ef4444', 11, 'left');
    label(ctx, 'B', ux + 8, uy - d1y, '#3b82f6', 11, 'left');

    // a1, a2 arrows
    ctx.strokeStyle = '#34d399'; ctx.fillStyle = '#34d399'; ctx.lineWidth = 2;
    arrow(ctx, ux, uy, ux + a1x * 0.92, uy, 8);
    label(ctx, 'a₁', ux + a1x / 2, uy + 14, '#34d399', 12);

    ctx.strokeStyle = '#c084fc'; ctx.fillStyle = '#c084fc'; ctx.lineWidth = 2;
    arrow(ctx, ux, uy, ux + a2x * 0.92, uy + a2y * 0.92, 8);
    label(ctx, 'a₂', ux + a2x - 16, uy + a2y / 2, '#c084fc', 12);
  }

  // ── Figure 7: Real → Reciprocal ──
  function drawReciprocal(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var midX = W / 2;

    // Left: real-space lattice (triangular)
    var sc = 24, ox = midX * 0.38, oy = H / 2;
    var a1x = sc, a2x = 0.5 * sc, a2y = -sqrt3 / 2 * sc;
    for (var n = -3; n <= 3; n++) for (var m = -2; m <= 3; m++) {
      var x = ox + n * a1x + m * a2x, y = oy + m * a2y;
      if (x < 0 || x > midX - 10 || y < 10 || y > H - 22) continue;
      dot(ctx, x, y, 2.5, 'rgba(168,162,158,.45)');
    }
    ctx.strokeStyle = '#34d399'; ctx.fillStyle = '#34d399'; ctx.lineWidth = 1.8;
    arrow(ctx, ox, oy, ox + a1x, oy, 7);
    ctx.strokeStyle = '#c084fc'; ctx.fillStyle = '#c084fc';
    arrow(ctx, ox, oy, ox + a2x, oy + a2y, 7);
    label(ctx, 'Real space', ox, H - 8, '#78716c', 10);
    label(ctx, 'a₁', ox + a1x + 6, oy + 10, '#34d399', 10, 'left');
    label(ctx, 'a₂', ox + a2x - 12, oy + a2y - 5, '#c084fc', 10);

    // Arrow in the middle
    ctx.fillStyle = '#78716c'; ctx.font = '16px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⟶', midX, H / 2);
    label(ctx, 'Fourier', midX, H / 2 - 14, '#78716c', 9);

    // Right: reciprocal lattice (also triangular, rotated 30°)
    var sc2 = 28, ox2 = midX * 1.6, oy2 = H / 2;
    var b1x = sc2, b1y = sc2 / sqrt3;
    var b2x = 0, b2y = -2 * sc2 / sqrt3;
    for (var n = -3; n <= 3; n++) for (var m = -3; m <= 3; m++) {
      var x = ox2 + n * b1x + m * b2x, y = oy2 - n * b1y + m * b2y;
      if (x < midX + 10 || x > W || y < 10 || y > H - 22) continue;
      dot(ctx, x, y, 2.5, 'rgba(168,162,158,.45)');
    }
    ctx.strokeStyle = '#fb923c'; ctx.fillStyle = '#fb923c'; ctx.lineWidth = 1.8;
    arrow(ctx, ox2, oy2, ox2 + b1x, oy2 - b1y, 7);
    ctx.strokeStyle = '#60a5fa'; ctx.fillStyle = '#60a5fa';
    arrow(ctx, ox2, oy2, ox2 + b2x, oy2 + b2y, 7);
    label(ctx, 'Reciprocal space', ox2, H - 8, '#78716c', 10);
    label(ctx, 'b₁', ox2 + b1x + 6, oy2 - b1y + 2, '#fb923c', 10, 'left');
    label(ctx, 'b₂', ox2 + b2x + 8, oy2 + b2y / 2, '#60a5fa', 10, 'left');

    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(midX, 15); ctx.lineTo(midX, H - 20); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Figure 8: Brillouin zone ──
  function drawBZ(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var cx = W / 2, cy = H * 0.48;
    var R = Math.min(W, H) * 0.34;

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

    // High-symmetry points
    // Γ
    dot(ctx, cx, cy, 4, '#fbbf24');
    label(ctx, 'Γ', cx - 10, cy + 12, '#fbbf24', 13);

    // K points (corners at 0°, 120°, 240°)
    for (var i = 0; i < 6; i++) {
      var ang = i * PI / 3;
      var kx = cx + R * cos(ang), ky = cy - R * sin(ang);
      dot(ctx, kx, ky, 4, i % 2 === 0 ? '#ef4444' : '#3b82f6');
    }
    // Label just two
    label(ctx, 'K', cx + R + 8, cy + 2, '#ef4444', 13, 'left');
    label(ctx, 'K\'', cx + R * cos(PI / 3) - 3, cy - R * sin(PI / 3) - 10, '#3b82f6', 13);

    // M points (edge midpoints)
    for (var i = 0; i < 6; i++) {
      var ang1 = i * PI / 3, ang2 = (i + 1) * PI / 3;
      var mx = cx + R * (cos(ang1) + cos(ang2)) / 2;
      var my = cy - R * (sin(ang1) + sin(ang2)) / 2;
      dot(ctx, mx, my, 3, '#78716c');
    }
    label(ctx, 'M', cx + R * (cos(0) + cos(PI / 3)) / 2 + 8,
          cy - R * (sin(0) + sin(PI / 3)) / 2 - 4, '#78716c', 11, 'left');

    // Path Γ→M→K→Γ
    var Kx = cx + R, Ky = cy;
    var Mx = cx + R * (cos(0) + cos(PI / 3)) / 2;
    var My = cy - R * (sin(0) + sin(PI / 3)) / 2;
    ctx.strokeStyle = 'rgba(52,211,153,.5)'; ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(Mx, My); ctx.lineTo(Kx, Ky); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'Γ→M→K→Γ path', W / 2, H - 8, '#34d399', 10);
  }

  // ── Figure 9: Dirac points / cones ──
  function drawDiracPoints(cv) {
    var o = dpr(cv), ctx = o.ctx, W = o.w, H = o.h;
    var cx = W / 2, cy = H * 0.5;

    // Draw small BZ
    var R = Math.min(W, H) * 0.25;
    var bzCx = W * 0.28, bzCy = cy;
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var ang = i * PI / 3;
      var px = bzCx + R * cos(ang), py = bzCy - R * sin(ang);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(251,191,36,.35)'; ctx.lineWidth = 1.2; ctx.stroke();

    // K/K' with cones
    for (var i = 0; i < 6; i++) {
      var ang = i * PI / 3;
      var kx = bzCx + R * cos(ang), ky = bzCy - R * sin(ang);
      var isK = (i % 2 === 0);
      var col = isK ? '#ef4444' : '#3b82f6';

      // Tiny cone
      var cs = 12;
      ctx.beginPath();
      ctx.moveTo(kx, ky - cs); ctx.lineTo(kx - cs * 0.6, ky); ctx.lineTo(kx + cs * 0.6, ky);
      ctx.closePath();
      ctx.fillStyle = isK ? 'rgba(239,68,68,.25)' : 'rgba(59,130,246,.25)'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(kx, ky + cs); ctx.lineTo(kx - cs * 0.6, ky); ctx.lineTo(kx + cs * 0.6, ky);
      ctx.closePath();
      ctx.fillStyle = isK ? 'rgba(239,68,68,.15)' : 'rgba(59,130,246,.15)'; ctx.fill();
      dot(ctx, kx, ky, 3, col);
    }
    label(ctx, 'K', bzCx + R + 10, bzCy, '#ef4444', 11, 'left');
    label(ctx, 'K\'', bzCx + R * cos(PI / 3) + 8, bzCy - R * sin(PI / 3) - 2, '#3b82f6', 11, 'left');

    // Right: zoomed cone
    var ccx = W * 0.7, ccy = cy;
    var coneH = H * 0.32, coneW = W * 0.16;

    // Upper cone (conduction)
    ctx.beginPath();
    ctx.moveTo(ccx, ccy);
    ctx.lineTo(ccx - coneW, ccy - coneH);
    ctx.lineTo(ccx + coneW, ccy - coneH);
    ctx.closePath();
    var g1 = ctx.createLinearGradient(ccx, ccy, ccx, ccy - coneH);
    g1.addColorStop(0, 'rgba(239,68,68,.5)'); g1.addColorStop(1, 'rgba(239,68,68,.08)');
    ctx.fillStyle = g1; ctx.fill();

    // Lower cone (valence)
    ctx.beginPath();
    ctx.moveTo(ccx, ccy);
    ctx.lineTo(ccx - coneW, ccy + coneH);
    ctx.lineTo(ccx + coneW, ccy + coneH);
    ctx.closePath();
    var g2 = ctx.createLinearGradient(ccx, ccy, ccx, ccy + coneH);
    g2.addColorStop(0, 'rgba(59,130,246,.5)'); g2.addColorStop(1, 'rgba(59,130,246,.08)');
    ctx.fillStyle = g2; ctx.fill();

    // Touching point
    dot(ctx, ccx, ccy, 4, '#fbbf24');

    // Labels
    label(ctx, 'E', ccx - coneW - 12, ccy - coneH / 2, '#a8a29e', 11);
    label(ctx, 'π* (conduction)', ccx + coneW + 4, ccy - coneH * 0.5, '#ef4444', 9, 'left');
    label(ctx, 'π (valence)', ccx + coneW + 4, ccy + coneH * 0.5, '#3b82f6', 9, 'left');
    label(ctx, 'E = 0', ccx + 10, ccy - 8, '#fbbf24', 10, 'left');
    label(ctx, 'E = ±ℏvF|q|', ccx, H - 8, '#a8a29e', 10);

    // "zoom" arrow
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(bzCx + R + 16, bzCy); ctx.lineTo(ccx - coneW - 8, ccy); ctx.stroke();
    ctx.setLineDash([]);
  }

  var figMap = {
    'fig-crystal-vs-amorphous': drawCrystalVsAmorphous,
    'fig-bravais': drawBravais,
    'fig-unitcell': drawUnitcell,
    'fig-basis': drawBasis,
    'fig-honeycomb-not-bravais': drawHoneycombNotBravais,
    'fig-graphene-lattice': drawGrapheneLattice,
    'fig-reciprocal': drawReciprocal,
    'fig-bz': drawBZ,
    'fig-dirac-points': drawDiracPoints
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

  // Draw when panel opens (canvases need to be visible for sizing)
  var panel = document.getElementById('crystal-panel');
  if (panel) {
    var obs = new MutationObserver(function () {
      if (panel.classList.contains('open')) {
        requestAnimationFrame(function () { requestAnimationFrame(drawAll); });
      }
    });
    obs.observe(panel, { attributes: true, attributeFilter: ['class'] });
  }
  // Also on resize
  window.addEventListener('resize', function () { drawn = {}; drawAll(); });
})();
