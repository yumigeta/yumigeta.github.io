/* Graphene Raman spectroscopy interactive demos — vanilla JS, no deps. */
(function () {
"use strict";

const PI  = Math.PI;
const TAU = 2 * PI;
const dpr = window.devicePixelRatio || 1;

/* ── helpers ── */
function setupCanvas(id) {
  const c = document.getElementById(id);
  if (!c) return null;
  const r = c.getBoundingClientRect();
  c.width  = r.width  * dpr;
  c.height = r.height * dpr;
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);
  return { c, ctx, w: r.width, h: r.height };
}

function lerp(a, b, t) { return a + (b - a) * t; }

/* ═══════════════════════════════════════════════════════════════════
   Module 00 — Phonon dispersion
   ═══════════════════════════════════════════════════════════════════ */
function drawPhonon() {
  const s = setupCanvas("c-phonon");
  if (!s) return;
  const { ctx, w, h } = s;

  const pad = { t: 30, r: 30, b: 40, l: 60 };
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;

  const maxFreq = 1800;
  const xK = 0.423, xM = 0.634;

  const sym = [
    { x: 0,   label: "Γ" },
    { x: xK,  label: "K" },
    { x: xM,  label: "M" },
    { x: 1,   label: "Γ" }
  ];

  // CSV-digitized data: flat [x0,y0, x1,y1, ...] sampled every 5th point
  // order: LA, LO, iTA, iTO, oTA(ZA), oTO
  var rawData = [
    /* LA */
    [0,7.9,0.0132,71.8,0.0267,136.6,0.0415,202,0.0569,272.1,0.0711,331.8,0.0856,394.6,0.1007,459.1,0.1164,523.5,0.1324,584.6,0.1483,642.3,0.1651,700.1,0.183,760,0.2029,822.5,0.2236,883.4,0.2455,941.3,0.2694,997.4,0.2933,1046.9,0.3171,1090.9,0.341,1127.7,0.3649,1160.4,0.3887,1191.7,0.4126,1217.5,0.438,1218.4,0.4619,1218.8,0.4857,1237.9,0.5096,1261.3,0.5334,1285.2,0.5573,1306.4,0.5812,1323,0.605,1334.8,0.6288,1339.5,0.6526,1314.6,0.6764,1258.1,0.6994,1198.6,0.7205,1137.9,0.7399,1075.6,0.7573,1017.1,0.7739,959.4,0.7898,903.2,0.8056,845.7,0.8215,786.8,0.8373,725.8,0.8531,663.8,0.869,600.8,0.8848,535.8,0.9006,467.4,0.9162,398.2,0.9318,328.4,0.9461,262.8,0.9603,196.3,0.9734,135.1,0.9872,69.3,1,9.8],
    /* LO */
    [0,1582.7,0.0238,1598,0.0476,1610.3,0.0714,1618.9,0.0952,1624,0.119,1624.4,0.1428,1622.1,0.1666,1612.7,0.1904,1595.6,0.2142,1572.2,0.238,1544.2,0.2617,1512.6,0.2855,1477.7,0.3093,1438.5,0.3331,1395.3,0.3584,1346.1,0.3821,1297.9,0.4059,1252.3,0.4297,1236.7,0.4535,1259.2,0.4773,1279.9,0.5011,1298.6,0.525,1315.4,0.5488,1329.4,0.5726,1341,0.5964,1351.3,0.6202,1358,0.644,1377.7,0.6679,1419.8,0.6917,1461.8,0.7155,1499.4,0.7393,1531.5,0.7632,1558.6,0.787,1581.6,0.8108,1600.2,0.8346,1613.4,0.8584,1620,0.8822,1622.3,0.906,1620.9,0.9298,1615.9,0.9536,1605.9,0.9774,1592.7,1,1579.1],
    /* iTA */
    [0,4.8,0.0227,74.1,0.0442,137.3,0.0654,199.6,0.0862,260.1,0.108,323,0.1293,382.4,0.1513,444.9,0.1735,506.4,0.1953,564.1,0.2191,624.4,0.2429,682.6,0.2667,738.8,0.2905,793.4,0.3144,845,0.3382,893,0.362,935,0.3857,970.2,0.4095,993.4,0.4333,996.5,0.457,967.3,0.4808,917,0.5037,859.4,0.5266,799.9,0.5503,739.7,0.574,686.7,0.5978,648,0.6215,627.9,0.6453,622.8,0.669,616.6,0.6928,604.7,0.7165,588.7,0.7403,568.2,0.764,543.3,0.7877,511,0.8115,472.6,0.8352,427.8,0.8589,376.9,0.8826,321.9,0.9064,264.4,0.9281,206.9,0.9463,153.2,0.9635,103.4,0.9834,47.2,1,1.9],
    /* iTO */
    [0,1582.7,0.0238,1580.1,0.0475,1573.6,0.0713,1563.6,0.0951,1549,0.1188,1530.1,0.1426,1509.8,0.1663,1488.7,0.1901,1469.5,0.2138,1451.9,0.2376,1436.9,0.2614,1421.5,0.2851,1405.9,0.3089,1391.5,0.3326,1378.5,0.3564,1364.1,0.3802,1347.7,0.4039,1321.9,0.4277,1305.5,0.4515,1337.9,0.4753,1362.5,0.499,1381.1,0.5228,1394.8,0.5466,1404.5,0.5704,1410.6,0.5942,1412.5,0.6179,1412.4,0.6417,1412.2,0.6686,1414.8,0.6924,1422.2,0.7162,1431,0.74,1440.2,0.7638,1450.3,0.7875,1462,0.8113,1476.6,0.8351,1494.3,0.8589,1512.8,0.8827,1530.7,0.9065,1547.6,0.9303,1561.2,0.954,1570.3,0.9778,1575.5,1,1575.9],
    /* oTA (ZA) */
    [0,-1.2,0.0237,6.7,0.0475,14.5,0.0712,25.6,0.0949,42.6,0.1187,65.6,0.1424,94,0.1662,125.6,0.1899,161,0.2137,199.6,0.2374,239.4,0.2612,280.7,0.285,322,0.3087,362.7,0.3325,401,0.3562,437.1,0.38,471.2,0.4037,502.1,0.4275,519.7,0.4512,498.5,0.4749,482.1,0.4986,471.1,0.5223,464.9,0.5461,462.6,0.5698,462.1,0.5935,460.3,0.6172,460.2,0.641,459.4,0.6647,438.8,0.6884,399.8,0.712,353,0.7357,304.1,0.7594,256.5,0.7831,211.7,0.8068,169.6,0.8305,130.6,0.8542,95.9,0.8779,66.8,0.9016,42.3,0.9253,23.2,0.949,10.9,0.9727,2.3,0.9964,-4.8,1,-5.2],
    /* oTO */
    [0,867.9,0.0238,867,0.0475,864.1,0.0713,859.7,0.095,853.5,0.1188,845.7,0.1426,835.3,0.1663,822.1,0.19,806.4,0.2138,787.3,0.2375,764.3,0.2613,738.9,0.285,710.2,0.3088,678.2,0.3325,644,0.3562,609.9,0.38,576.2,0.4037,545,0.4274,530.3,0.4512,552.8,0.475,570.5,0.4988,586,0.5225,597.7,0.5463,607.2,0.5701,613.9,0.5939,618.3,0.6176,621.2,0.6493,628.6,0.6731,650.1,0.6969,682.2,0.7207,713.3,0.7444,742.4,0.7682,767.6,0.792,788.9,0.8166,808.1,0.8404,822.5,0.8641,834.3,0.8879,843.8,0.9117,851.2,0.9354,856.4,0.9592,859.8,0.983,861.9,1,862.8]
  ];

  // linear interpolation from flat [x0,y0, x1,y1,...] array
  function interp(data, t) {
    if (t <= data[0]) return data[1];
    var n = data.length;
    if (t >= data[n - 2]) return data[n - 1];
    var lo = 0, hi = (n / 2) - 1;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (data[mid * 2] <= t) lo = mid; else hi = mid;
    }
    var x0 = data[lo*2], y0 = data[lo*2+1];
    var x1 = data[hi*2], y1 = data[hi*2+1];
    return y0 + (y1 - y0) * (t - x0) / (x1 - x0);
  }

  var branchDefs = [
    { name: "LA",       data: rawData[0], color: "#2563eb" },
    { name: "LO",       data: rawData[1], color: "#06b6d4" },
    { name: "iTA",      data: rawData[2], color: "#16a34a" },
    { name: "iTO",      data: rawData[3], color: "#dc2626" },
    { name: "oTA (ZA)", data: rawData[4], color: "#ea580c" },
    { name: "oTO",      data: rawData[5], color: "#eab308" }
  ];

  // background
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, w, h);

  // axes
  ctx.strokeStyle = "#44403c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, h - pad.b);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pad.l, h - pad.b);
  ctx.lineTo(w - pad.r, h - pad.b);
  ctx.stroke();

  // y-ticks and gridlines
  ctx.fillStyle = "#a8a29e";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  for (var yv = 0; yv <= 1800; yv += 200) {
    var yy = h - pad.b - (yv / maxFreq) * ph;
    ctx.fillText(yv, pad.l - 8, yy + 4);
    ctx.strokeStyle = "#33302e";
    ctx.beginPath();
    ctx.moveTo(pad.l, yy);
    ctx.lineTo(w - pad.r, yy);
    ctx.stroke();
  }

  // y-label
  ctx.save();
  ctx.translate(14, h / 2);
  ctx.rotate(-PI / 2);
  ctx.textAlign = "center";
  ctx.fillStyle = "#a8a29e";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("Frequency (cm⁻¹)", 0, 0);
  ctx.restore();

  // high-symmetry point labels and dashed vertical lines
  ctx.textAlign = "center";
  ctx.fillStyle = "#d6d3d1";
  ctx.font = "bold 13px system-ui, sans-serif";
  sym.forEach(function(sp) {
    var xx = pad.l + sp.x * pw;
    ctx.fillText(sp.label, xx, h - pad.b + 24);
    if (sp.x > 0 && sp.x < 1) {
      ctx.strokeStyle = "#44403c";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(xx, pad.t);
      ctx.lineTo(xx, h - pad.b);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // highlight zones
  var gx = pad.l;
  ctx.fillStyle = "rgba(22,163,106,0.08)";
  ctx.fillRect(gx - 2, pad.t, 30, ph);

  var kx = pad.l + xK * pw;
  ctx.fillStyle = "rgba(239,68,68,0.08)";
  ctx.fillRect(kx - 15, pad.t, 30, ph);

  ctx.font = "10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(22,163,106,0.6)";
  ctx.fillText("G band", gx + 14, pad.t + 14);
  ctx.fillStyle = "rgba(239,68,68,0.6)";
  ctx.fillText("D, 2D", kx, pad.t + 14);

  // draw branches using interpolated CSV data
  var nPts = 300;
  branchDefs.forEach(function(br) {
    ctx.strokeStyle = br.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i <= nPts; i++) {
      var t = i / nPts;
      var x = pad.l + t * pw;
      var freq = interp(br.data, t);
      var y = h - pad.b - (freq / maxFreq) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // in-plot branch labels — positions chosen so no label overlaps any curve or other label
  var inLabels = [
    { name: "LA",       brIdx: 0, t: 0.715, dy: +13 }, // K→M descent, 39px clear below
    { name: "LO",       brIdx: 1, t: 0.190, dy: -13 }, // Γ→K near peak, 29px clear above
    { name: "iTA",      brIdx: 2, t: 0.520, dy: -13 }, // K→M, 38px clear above
    { name: "iTO",      brIdx: 3, t: 0.400, dy: -13 }, // Γ→K dip approach, 20px clear above
    { name: "oTA (ZA)", brIdx: 4, t: 0.200, dy: +13 }, // Γ→K rise, 56px clear below
    { name: "oTO",      brIdx: 5, t: 0.935, dy: -13 }  // M→Γ, 73px clear above
  ];
  ctx.font = "bold 11px system-ui, sans-serif";
  inLabels.forEach(function(lb) {
    var br = branchDefs[lb.brIdx];
    var lx = pad.l + lb.t * pw;
    var freq = interp(br.data, lb.t);
    var ly = h - pad.b - (freq / maxFreq) * ph + lb.dy;
    ctx.fillStyle = br.color;
    ctx.textAlign = "left";
    ctx.fillText(lb.name, lx, ly);
  });
}


/* ═══════════════════════════════════════════════════════════════════
   Module 01 — G band vibration + process diagram
   ═══════════════════════════════════════════════════════════════════ */
var gModeAnim = null;

function drawGMode() {
  var s = setupCanvas("c-gmode");
  if (!s) return;

  var currentMode = "ilo";
  var time = 0;

  var btns = document.querySelectorAll("#gmode-btns .demo-btn");
  btns.forEach(function(b) {
    b.addEventListener("click", function() {
      btns.forEach(function(bb) { bb.classList.remove("active"); });
      b.classList.add("active");
      currentMode = b.dataset.gmode;
    });
  });

  function drawFrame() {
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, 0, w, h);

    time += 0.03;
    var amp = 8 * Math.sin(time);

    var cx = w / 2, cy = h / 2;
    var spacing = 36;
    var rows = 5, cols = 5;
    var ox = cx - (cols - 1) * spacing / 2;
    var oy = cy - (rows - 1) * spacing / 2;

    // draw bonds first
    ctx.strokeStyle = "#44403c";
    ctx.lineWidth = 1.5;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var isA = (r + c) % 2 === 0;
        var dx = 0, dy = 0;

        if (currentMode === "ilo") {
          dx = isA ? amp : -amp;
        } else {
          dy = isA ? amp : -amp;
        }

        var x0 = ox + c * spacing + dx;
        var y0 = oy + r * spacing * 0.866 + dy;

        // bonds to neighbors
        if (c + 1 < cols) {
          var isA2 = (r + c + 1) % 2 === 0;
          var dx2 = currentMode === "ilo" ? (isA2 ? amp : -amp) : 0;
          var dy2 = currentMode === "ito" ? (isA2 ? amp : -amp) : 0;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(ox + (c + 1) * spacing + dx2, oy + r * spacing * 0.866 + dy2);
          ctx.stroke();
        }
        if (r + 1 < rows && (isA)) {
          var nr = r + 1, nc = c;
          var isA3 = (nr + nc) % 2 === 0;
          var dx3 = currentMode === "ilo" ? (isA3 ? amp : -amp) : 0;
          var dy3 = currentMode === "ito" ? (isA3 ? amp : -amp) : 0;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(ox + nc * spacing + dx3, oy + nr * spacing * 0.866 + dy3);
          ctx.stroke();
        }
      }
    }

    // draw atoms
    for (var r2 = 0; r2 < rows; r2++) {
      for (var c2 = 0; c2 < cols; c2++) {
        var isA4 = (r2 + c2) % 2 === 0;
        var dx4 = 0, dy4 = 0;
        if (currentMode === "ilo") dx4 = isA4 ? amp : -amp;
        else dy4 = isA4 ? amp : -amp;

        var x4 = ox + c2 * spacing + dx4;
        var y4 = oy + r2 * spacing * 0.866 + dy4;

        ctx.beginPath();
        ctx.arc(x4, y4, 6, 0, TAU);
        ctx.fillStyle = isA4 ? "#ef4444" : "#3b82f6";
        ctx.fill();
      }
    }

    // arrows showing motion
    ctx.fillStyle = "#fafaf9";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    if (currentMode === "ilo") {
      ctx.fillText("← A    B →", cx, h - 16);
      ctx.fillText("iLO: in-plane longitudinal optical", cx, 18);
    } else {
      ctx.fillText("↑ A    B ↓", cx, h - 16);
      ctx.fillText("iTO: in-plane transverse optical", cx, 18);
    }

    gModeAnim = requestAnimationFrame(drawFrame);
  }

  drawFrame();
}


function drawGProcess() {
  var s = setupCanvas("c-gprocess");
  if (!s) return;
  var ctx = s.ctx, w = s.w, h = s.h;

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, w, h);

  var cx = w / 2, cy = h / 2;
  var bandW = 120;

  // Dirac cone at K
  ctx.strokeStyle = "#57534e";
  ctx.lineWidth = 2;

  // valence band (lower cone)
  ctx.beginPath();
  ctx.moveTo(cx - bandW / 2, cy + 80);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + bandW / 2, cy + 80);
  ctx.stroke();

  // conduction band (upper cone)
  ctx.beginPath();
  ctx.moveTo(cx - bandW / 2, cy - 80);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + bandW / 2, cy - 80);
  ctx.stroke();

  // labels
  ctx.fillStyle = "#78716c";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("π*", cx + bandW / 2 + 16, cy - 70);
  ctx.fillText("π", cx + bandW / 2 + 16, cy + 76);
  ctx.fillText("K", cx, h - 12);

  // photon in (green arrow)
  var arrowX = cx - 25;
  drawArrow(ctx, arrowX, cy + 60, arrowX, cy - 50, "#16a34a", 2);
  ctx.fillStyle = "#16a34a";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("ℏω₀", arrowX - 6, cy);

  // phonon (wavy, red)
  var phX = cx;
  drawWavy(ctx, phX, cy - 50, phX, cy - 25, "#ef4444");
  ctx.fillStyle = "#ef4444";
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("q ≈ 0", phX + 8, cy - 38);

  // photon out (blue arrow)
  var outX = cx + 25;
  drawArrow(ctx, outX, cy - 25, outX, cy + 60, "#3b82f6", 2);
  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("ℏωs", outX + 6, cy + 20);

  // title
  ctx.fillStyle = "#d6d3d1";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("G band: first-order", cx, 18);
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "#a8a29e";
  ctx.fillText("ωG = ω₀ − ωph ≈ 1580 cm⁻¹", cx, 34);
}


/* ═══════════════════════════════════════════════════════════════════
   Module 02 — 2D band double resonance
   ═══════════════════════════════════════════════════════════════════ */
function drawDR2D() {
  var s = setupCanvas("c-dr2d");
  if (!s) return;
  var ctx = s.ctx, w = s.w, h = s.h;

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, w, h);

  var cy = h / 2;
  var coneH = 100;
  var coneW = 60;
  var kx = w * 0.3;
  var kpx = w * 0.7;

  // Draw two Dirac cones: K and K'
  drawCone(ctx, kx, cy, coneW, coneH, "K");
  drawCone(ctx, kpx, cy, coneW, coneH, "K'");

  // Step 1: photon absorption (K, valence → conduction)
  var eY1 = cy + 40;
  var eY2 = cy - 40;
  drawArrow(ctx, kx - 30, eY1, kx - 30, eY2, "#16a34a", 2.5);
  ctx.fillStyle = "#16a34a";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("①", kx - 35, cy - 10);
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillText("ℏω₀", kx - 35, cy + 6);

  // Step 2: phonon scattering K → K' (electron)
  drawDashedArrow(ctx, kx + 10, eY2, kpx - 10, eY2, "#ef4444");
  ctx.fillStyle = "#ef4444";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("② iTO phonon (q)", w / 2, eY2 - 10);

  // Step 3: phonon scattering K' → K (electron back)
  drawDashedArrow(ctx, kpx - 10, eY2 + 20, kx + 10, eY2 + 20, "#ef4444");
  ctx.fillStyle = "#ef4444";
  ctx.fillText("③ iTO phonon (−q)", w / 2, eY2 + 38);

  // Step 4: recombination and photon out
  drawArrow(ctx, kx + 30, eY2 + 20, kx + 30, eY1, "#3b82f6", 2.5);
  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("④", kx + 35, cy + 6);
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillText("ℏωs", kx + 35, cy + 22);

  // electron dots
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath(); ctx.arc(kx, eY2, 4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(kpx, eY2, 4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(kx, eY2 + 20, 4, 0, TAU); ctx.fill();

  // equation
  ctx.fillStyle = "#d6d3d1";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("2D band: ω2D = ω₀ − 2ωiTO ≈ 2700 cm⁻¹", w / 2, h - 14);
}


/* ═══════════════════════════════════════════════════════════════════
   Module 03 — D band double resonance
   ═══════════════════════════════════════════════════════════════════ */
function drawDRD() {
  var s = setupCanvas("c-drd");
  if (!s) return;
  var ctx = s.ctx, w = s.w, h = s.h;

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, w, h);

  var cy = h / 2;
  var coneW = 60;
  var coneH = 100;
  var kx = w * 0.3;
  var kpx = w * 0.7;

  drawCone(ctx, kx, cy, coneW, coneH, "K");
  drawCone(ctx, kpx, cy, coneW, coneH, "K'");

  var eY1 = cy + 40;
  var eY2 = cy - 40;

  // Step 1: photon in
  drawArrow(ctx, kx - 30, eY1, kx - 30, eY2, "#16a34a", 2.5);
  ctx.fillStyle = "#16a34a";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("①", kx - 35, cy - 10);
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillText("ℏω₀", kx - 35, cy + 6);

  // Step 2: phonon K → K'
  drawDashedArrow(ctx, kx + 10, eY2, kpx - 10, eY2, "#ef4444");
  ctx.fillStyle = "#ef4444";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("② iTO phonon (q)", w / 2, eY2 - 10);

  // Step 3: defect scattering K' → K (elastic)
  drawDashedArrow(ctx, kpx - 10, eY2 + 20, kx + 10, eY2 + 20, "#f59e0b");
  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.fillText("③ defect (elastic)", w / 2, eY2 + 38);

  // defect symbol
  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillText("✕", w / 2, eY2 + 56);
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillText("q' = −q", w / 2, eY2 + 70);

  // Step 4: recombination
  drawArrow(ctx, kx + 30, eY2 + 20, kx + 30, eY1, "#3b82f6", 2.5);
  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("④", kx + 35, cy + 6);
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillText("ℏωs", kx + 35, cy + 22);

  // electron dots
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath(); ctx.arc(kx, eY2, 4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(kpx, eY2, 4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(kx, eY2 + 20, 4, 0, TAU); ctx.fill();

  // equation
  ctx.fillStyle = "#d6d3d1";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("D band: ωD = ω₀ − ωiTO ≈ 1350 cm⁻¹  (defect required)", w / 2, h - 14);
}


/* ═══════════════════════════════════════════════════════════════════
   Module 04 — Overview spectrum
   ═══════════════════════════════════════════════════════════════════ */
function drawOverview() {
  var s = setupCanvas("c-overview");
  if (!s) return;
  var ctx = s.ctx, w = s.w, h = s.h;

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, w, h);

  var pad = { t: 30, r: 30, b: 40, l: 55 };
  var pw = w - pad.l - pad.r;
  var ph = h - pad.t - pad.b;

  var xmin = 1100, xmax = 3100;

  function toX(cm) { return pad.l + (cm - xmin) / (xmax - xmin) * pw; }
  function toY(v)  { return h - pad.b - v * ph; }

  // axes
  ctx.strokeStyle = "#44403c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, h - pad.b);
  ctx.lineTo(w - pad.r, h - pad.b);
  ctx.stroke();

  // x labels
  ctx.fillStyle = "#a8a29e";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (var xv = 1200; xv <= 3000; xv += 200) {
    var xx = toX(xv);
    ctx.fillText(xv, xx, h - pad.b + 18);
    ctx.strokeStyle = "#2a2826";
    ctx.beginPath(); ctx.moveTo(xx, h - pad.b); ctx.lineTo(xx, h - pad.b + 4); ctx.stroke();
  }
  ctx.fillText("Raman shift (cm⁻¹)", w / 2, h - 4);

  // y label
  ctx.save();
  ctx.translate(14, h / 2);
  ctx.rotate(-PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("Intensity (a.u.)", 0, 0);
  ctx.restore();

  // peaks as Lorentzians
  function lorentz(x, x0, gamma, amp) {
    var d = (x - x0) / gamma;
    return amp / (1 + d * d);
  }

  var peaks = [
    { x0: 1350, gamma: 18, amp: 0.25, color: "#f59e0b", label: "D", labelY: -16 },
    { x0: 1580, gamma: 10, amp: 0.55, color: "#16a34a", label: "G", labelY: -16 },
    { x0: 1620, gamma: 8,  amp: 0.08, color: "#a78bfa", label: "D'", labelY: -12 },
    { x0: 2700, gamma: 16, amp: 0.85, color: "#3b82f6", label: "2D", labelY: -16 },
    { x0: 2940, gamma: 20, amp: 0.06, color: "#78716c", label: "D+D'", labelY: -12 }
  ];

  // draw spectrum line
  ctx.strokeStyle = "#d6d3d1";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (var i = 0; i <= pw; i++) {
    var cm = xmin + (i / pw) * (xmax - xmin);
    var val = 0;
    peaks.forEach(function(p) { val += lorentz(cm, p.x0, p.gamma, p.amp); });
    var px = pad.l + i;
    var py = toY(val);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // fill under curve
  ctx.lineTo(w - pad.r, h - pad.b);
  ctx.lineTo(pad.l, h - pad.b);
  ctx.closePath();
  ctx.fillStyle = "rgba(214,211,209,0.06)";
  ctx.fill();

  // peak labels and colored highlights
  peaks.forEach(function(p) {
    var px = toX(p.x0);
    var val = p.amp;
    var py = toY(val);

    // colored dot at peak
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, TAU);
    ctx.fillStyle = p.color;
    ctx.fill();

    // label
    ctx.fillStyle = p.color;
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.label, px, py + p.labelY);
  });
}


/* ── shared drawing helpers ── */
function drawArrow(ctx, x1, y1, x2, y2, color, lw) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw || 2;
  var angle = Math.atan2(y2 - y1, x2 - x1);
  var headLen = 8;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - PI / 6), y2 - headLen * Math.sin(angle - PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + PI / 6), y2 - headLen * Math.sin(angle + PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawDashedArrow(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);

  var angle = Math.atan2(y2 - y1, x2 - x1);
  var headLen = 7;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - PI / 6), y2 - headLen * Math.sin(angle - PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + PI / 6), y2 - headLen * Math.sin(angle + PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawWavy(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  var dx = x2 - x1, dy = y2 - y1;
  var len = Math.sqrt(dx * dx + dy * dy);
  var steps = 8;
  ctx.beginPath();
  for (var i = 0; i <= steps * 4; i++) {
    var t = i / (steps * 4);
    var px = x1 + dx * t;
    var py = y1 + dy * t + Math.sin(t * steps * TAU) * 3;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function drawCone(ctx, cx, cy, cw, ch, label) {
  // valence
  ctx.strokeStyle = "#57534e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - cw / 2, cy + ch);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + cw / 2, cy + ch);
  ctx.stroke();

  // conduction
  ctx.beginPath();
  ctx.moveTo(cx - cw / 2, cy - ch);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + cw / 2, cy - ch);
  ctx.stroke();

  // label
  ctx.fillStyle = "#78716c";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, cx, cy + ch + 18);
}


/* ── init ── */
function init() {
  drawPhonon();
  drawGMode();
  drawGProcess();
  drawDR2D();
  drawDRD();
  drawOverview();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

window.addEventListener("resize", function() {
  if (gModeAnim) cancelAnimationFrame(gModeAnim);
  // re-setup static canvases
  var s = setupCanvas("c-gmode");
  if (s) { /* re-init handled by drawGMode's loop */ }
  drawPhonon();
  drawGProcess();
  drawDR2D();
  drawDRD();
  drawOverview();
});

})();
