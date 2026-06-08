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
  const nPts = 240;

  // high-symmetry points along Γ → K → M → Γ (segment lengths ∝ 1 : 0.5 : √3/2)
  const xK = 0.423, xM = 0.634;
  const sym = [
    { x: 0,   label: "Γ" },
    { x: xK,  label: "K" },
    { x: xM,  label: "M" },
    { x: 1,   label: "Γ" }
  ];

  // segment helper: returns [index, u∈[0,1]] for path position t
  function seg(t) {
    if (t <= xK) return [0, t / xK];
    if (t <= xM) return [1, (t - xK) / (xM - xK)];
    return [2, (t - xM) / (1 - xM)];
  }
  function smooth(u) { return 0.5 - 0.5 * Math.cos(PI * u); }

  // dispersion curves digitized from the reference figure (Γ → K → M → Γ)
  function branch(name, fn, color) { return { name, fn, color }; }

  const branches = [
    // out-of-plane acoustic (ZA): quadratic near Γ
    branch("oTA (ZA)", function(t) {
      var sg = seg(t), i = sg[0], u = sg[1];
      if (i === 0) return 520 * Math.pow(u, 1.5);
      if (i === 1) return 520 - 60 * u;
      return 460 * Math.pow(1 - u, 2);
    }, "#ea580c"),

    // in-plane transverse acoustic
    branch("iTA", function(t) {
      var sg = seg(t), i = sg[0], u = sg[1];
      if (i === 0) return 950 * Math.pow(u, 0.95);
      if (i === 1) return -693.3 * u * u + 373.3 * u + 950; // peak ~1000
      return 630 * (1 - u);
    }, "#16a34a"),

    // out-of-plane optical
    branch("oTO", function(t) {
      var sg = seg(t), i = sg[0], u = sg[1];
      if (i === 0) return 870 - 340 * smooth(u);
      if (i === 1) return 530 + 100 * smooth(u);
      return 630 + 240 * smooth(u);
    }, "#eab308"),

    // longitudinal acoustic
    branch("LA", function(t) {
      var sg = seg(t), i = sg[0], u = sg[1];
      if (i === 0) return 1220 * Math.pow(u, 0.9);
      if (i === 1) return 1220 + 130 * smooth(u);
      return 1350 * Math.pow(1 - u, 1.1);
    }, "#2563eb"),

    // in-plane transverse optical — Kohn-anomaly dip at K (D/2D band)
    branch("iTO", function(t) {
      var sg = seg(t), i = sg[0], u = sg[1];
      if (i === 0) return 1580 - 270 * Math.pow(u, 1.3);
      if (i === 1) return 1310 + 100 * Math.sqrt(u);
      return 1410 + 170 * smooth(u);
    }, "#dc2626"),

    // longitudinal optical — overshoot to ~1620 near Γ, dip at K
    branch("LO", function(t) {
      var sg = seg(t), i = sg[0], u = sg[1];
      if (i === 0) {
        var dec = 1580 - 340 * Math.pow(u, 1.5);
        var bump = u < 0.3 ? 60 * Math.sin(PI * u / 0.3) : 0;
        return dec + bump;
      }
      if (i === 1) return 1240 + 160 * Math.sqrt(u);
      return -453.3 * u * u + 633.3 * u + 1400; // arch up to ~1620
    }, "#06b6d4")
  ];

  // background
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, w, h);

  // axes
  ctx.strokeStyle = "#44403c";
  ctx.lineWidth = 1;

  // y-axis
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, h - pad.b);
  ctx.stroke();

  // x-axis
  ctx.beginPath();
  ctx.moveTo(pad.l, h - pad.b);
  ctx.lineTo(w - pad.r, h - pad.b);
  ctx.stroke();

  // y-ticks
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

  // high-symmetry labels & vertical lines
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
  // Γ point (G band)
  var gx = pad.l;
  ctx.fillStyle = "rgba(22,163,106,0.08)";
  ctx.fillRect(gx - 2, pad.t, 30, ph);

  // K point (D / 2D)
  var kx = pad.l + xK * pw;
  ctx.fillStyle = "rgba(239,68,68,0.08)";
  ctx.fillRect(kx - 15, pad.t, 30, ph);

  // labels for zones
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(22,163,106,0.6)";
  ctx.fillText("G band", gx + 14, pad.t + 14);
  ctx.fillStyle = "rgba(239,68,68,0.6)";
  ctx.fillText("D, 2D", kx, pad.t + 14);

  // draw branches
  branches.forEach(function(br) {
    ctx.strokeStyle = br.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i <= nPts; i++) {
      var t = i / nPts;
      var x = pad.l + t * pw;
      var freq = br.fn(t);
      var y = h - pad.b - (freq / maxFreq) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
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
