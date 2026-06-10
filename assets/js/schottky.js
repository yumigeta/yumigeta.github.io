/* Schottky-junction page — interactive band diagram, pinning plot, and I-V curves. */
(function () {
  'use strict';

  // ── shared canvas helpers ──────────────────────────────────────────────
  var FONT = '"Zen Kaku Gothic New", sans-serif';

  function setupCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var r = canvas.getBoundingClientRect();
    if (r.width === 0) return null;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  function arrow(ctx, x1, y1, x2, y2, color, both) {
    var head = 5;
    var ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.42), y2 - head * Math.sin(ang - 0.42));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.42), y2 - head * Math.sin(ang + 0.42));
    ctx.closePath(); ctx.fill();
    if (both) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + head * Math.cos(ang - 0.42), y1 + head * Math.sin(ang - 0.42));
      ctx.lineTo(x1 + head * Math.cos(ang + 0.42), y1 + head * Math.sin(ang + 0.42));
      ctx.closePath(); ctx.fill();
    }
  }

  var COL = {
    fermi: '#fcd34d', cb: '#38bdf8', vb: '#f87171', vac: '#a8a29e',
    text: '#d6d3d1', faint: '#78716c', grid: 'rgba(255,255,255,0.07)',
    metal: 'rgba(252,211,77,0.10)', depl: 'rgba(56,189,248,0.10)'
  };

  // ── physical constants for the demos (n-Si) ───────────────────────────
  var CHI = 4.05;   // electron affinity of Si (eV)
  var EG = 1.12;    // band gap of Si (eV)
  var DN = 0.25;    // E_C − E_F in the n-Si bulk (eV)
  var CNL = 0.75;   // charge neutrality level below E_C (eV)

  // ════════ Module 00 — band diagram ════════
  var bandCanvas = document.getElementById('c-band');
  var bandMode = 'contact';
  var phiM = 4.75;

  function drawBand() {
    var s = setupCanvas(bandCanvas);
    if (!s) return;
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px ' + FONT;

    var pad = { l: 16, r: 14, t: 16, b: 16 };
    var xMid = w * 0.42;                 // interface position
    var gap = bandMode === 'apart' ? 26 : 0;  // visual gap between solids

    // energy → y mapping (E in eV)
    var eTop, eBot;
    if (bandMode === 'apart') { eTop = 0.45; eBot = -(CHI + EG + 0.45); }
    else { eTop = CHI + DN + 1.35; eBot = DN - EG - 0.55; }
    function Y(E) { return pad.t + (eTop - E) / (eTop - eBot) * (h - pad.t - pad.b); }

    var phiB = Math.max(phiM - CHI, 0.05);
    var vbi = Math.max(phiB - DN, 0);

    if (bandMode === 'apart') {
      // common vacuum level
      ctx.strokeStyle = COL.vac; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(w - pad.r, Y(0)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COL.vac; ctx.textAlign = 'left';
      ctx.fillText('E vac', pad.l + 2, Y(0) - 5);

      var mR = xMid - gap / 2, sL = xMid + gap / 2;
      // metal: filled sea up to E_F
      var efm = -phiM;
      ctx.fillStyle = COL.metal;
      ctx.fillRect(pad.l, Y(efm), mR - pad.l, h - pad.b - Y(efm));
      ctx.strokeStyle = COL.fermi; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pad.l, Y(efm)); ctx.lineTo(mR, Y(efm)); ctx.stroke();
      ctx.fillStyle = COL.fermi; ctx.textAlign = 'left';
      ctx.fillText('E F (metal)', pad.l + 4, Y(efm) + 15);
      // φM arrow
      arrow(ctx, mR - 30, Y(0), mR - 30, Y(efm), COL.text, true);
      ctx.fillStyle = COL.text; ctx.textAlign = 'right';
      ctx.fillText('φM = ' + phiM.toFixed(2) + ' eV', mR - 36, (Y(0) + Y(efm)) / 2 + 4);

      // semiconductor: flat bands
      var ec = -CHI, ev = -CHI - EG, efs = -CHI - DN;
      ctx.strokeStyle = COL.cb; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sL, Y(ec)); ctx.lineTo(w - pad.r, Y(ec)); ctx.stroke();
      ctx.strokeStyle = COL.vb;
      ctx.beginPath(); ctx.moveTo(sL, Y(ev)); ctx.lineTo(w - pad.r, Y(ev)); ctx.stroke();
      ctx.strokeStyle = COL.fermi; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(sL, Y(efs)); ctx.lineTo(w - pad.r, Y(efs)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = 'right';
      ctx.fillStyle = COL.cb; ctx.fillText('E C', w - pad.r - 2, Y(ec) - 5);
      ctx.fillStyle = COL.fermi; ctx.fillText('E F (n-Si)', w - pad.r - 2, Y(efs) + 14);
      ctx.fillStyle = COL.vb; ctx.fillText('E V', w - pad.r - 2, Y(ev) + 14);
      // χ arrow
      arrow(ctx, sL + 30, Y(0), sL + 30, Y(ec), COL.text, true);
      ctx.fillStyle = COL.text; ctx.textAlign = 'left';
      ctx.fillText('χ = ' + CHI.toFixed(2) + ' eV', sL + 36, (Y(0) + Y(ec)) / 2 + 4);

    } else {
      // contact: common Fermi level at E = 0
      var wDeplMax = (w - pad.r - xMid) * 0.55;
      var wDepl = wDeplMax * Math.sqrt(vbi / 1.15);

      // depletion shading
      if (wDepl > 2) {
        ctx.fillStyle = COL.depl;
        ctx.fillRect(xMid, pad.t, wDepl, h - pad.t - pad.b);
      }

      // metal sea
      ctx.fillStyle = COL.metal;
      ctx.fillRect(pad.l, Y(0), xMid - pad.l, h - pad.b - Y(0));

      // band profiles
      function eC(x) { // x in px from interface
        if (x >= wDepl || wDepl < 1) return DN;
        var u = 1 - x / wDepl;
        return DN + vbi * u * u;
      }
      function tracePath(offset) {
        ctx.beginPath();
        for (var x = 0; x <= w - pad.r - xMid; x += 2) {
          var yy = Y(eC(x) + offset);
          if (x === 0) ctx.moveTo(xMid + x, yy); else ctx.lineTo(xMid + x, yy);
        }
        ctx.stroke();
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = COL.cb; tracePath(0);          // E_C
      ctx.strokeStyle = COL.vb; tracePath(-EG);        // E_V
      ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.strokeStyle = COL.vac; tracePath(CHI);       // vacuum level
      ctx.setLineDash([]);

      // common Fermi level
      ctx.strokeStyle = COL.fermi; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(xMid, Y(0)); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(xMid, Y(0)); ctx.lineTo(w - pad.r, Y(0)); ctx.stroke();
      ctx.setLineDash([]);

      // interface line
      ctx.strokeStyle = COL.faint; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xMid, pad.t); ctx.lineTo(xMid, h - pad.b); ctx.stroke();

      // labels
      ctx.fillStyle = COL.fermi; ctx.textAlign = 'left';
      ctx.fillText('E F', pad.l + 4, Y(0) - 6);
      ctx.textAlign = 'right';
      ctx.fillStyle = COL.cb; ctx.fillText('E C', w - pad.r - 2, Y(DN) - 5);
      ctx.fillStyle = COL.vb; ctx.fillText('E V', w - pad.r - 2, Y(DN - EG) + 14);
      ctx.fillStyle = COL.vac; ctx.fillText('E vac', w - pad.r - 2, Y(DN + CHI) - 5);
      ctx.fillStyle = COL.text; ctx.textAlign = 'center';
      ctx.fillText('metal', (pad.l + xMid) / 2, h - pad.b - 8);
      ctx.fillText('n-Si', xMid + (w - pad.r - xMid) * 0.75, h - pad.b - 8);

      // φ_SBH arrow at the interface
      arrow(ctx, xMid + 12, Y(0), xMid + 12, Y(phiB), COL.text, true);
      ctx.textAlign = 'left'; ctx.fillStyle = COL.text;
      ctx.fillText('φSBH = ' + phiB.toFixed(2) + ' eV', xMid + 20, (Y(0) + Y(phiB)) / 2 + 4);

      // qV_bi marker
      if (vbi > 0.06) {
        var xb = xMid + wDepl * 0.22;
        arrow(ctx, xb, Y(DN), xb, Y(eC(wDepl * 0.22)), COL.faint, true);
        ctx.fillStyle = COL.faint;
        ctx.fillText('qVbi', xb + 6, (Y(DN) + Y(eC(wDepl * 0.22))) / 2 + 4);
      }
      // depletion width marker
      if (wDepl > 24) {
        ctx.strokeStyle = COL.faint; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(xMid + wDepl, pad.t); ctx.lineTo(xMid + wDepl, h - pad.b); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = COL.faint; ctx.textAlign = 'center';
        ctx.fillText('W', xMid + wDepl / 2, pad.t + 12);
      }
    }
  }

  // ════════ Module 01 — pinning plot ════════
  var pinCanvas = document.getElementById('c-pin');
  var logD = 11;     // log10(D / cm^-2 eV^-1)
  var phiM2 = 4.75;

  function pinningS(logDval) {
    // S = [1 + q^2 D δ / ε_i]^-1 with δ = 0.5 nm, ε_i = ε0; D in cm^-2 eV^-1
    var factor = 9.05e-14; // q^2 δ / (ε0 q · 1 cm^-2 eV^-1) — dimensionless per unit D
    return 1 / (1 + factor * Math.pow(10, logDval));
  }

  function drawPin() {
    var s = setupCanvas(pinCanvas);
    if (!s) return;
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px ' + FONT;

    var pad = { l: 52, r: 16, t: 18, b: 38 };
    var x0 = 3.8, x1 = 5.8, y0 = -0.15, y1 = 1.55;
    function X(v) { return pad.l + (v - x0) / (x1 - x0) * (w - pad.l - pad.r); }
    function Y(v) { return h - pad.b - (v - y0) / (y1 - y0) * (h - pad.t - pad.b); }

    // grid + axes
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
    var gx, gy;
    for (gx = 4.0; gx <= 5.6; gx += 0.4) {
      ctx.beginPath(); ctx.moveTo(X(gx), pad.t); ctx.lineTo(X(gx), h - pad.b); ctx.stroke();
      ctx.fillStyle = COL.faint; ctx.textAlign = 'center';
      ctx.fillText(gx.toFixed(1), X(gx), h - pad.b + 16);
    }
    for (gy = 0; gy <= 1.5; gy += 0.5) {
      ctx.beginPath(); ctx.moveTo(pad.l, Y(gy)); ctx.lineTo(w - pad.r, Y(gy)); ctx.stroke();
      ctx.fillStyle = COL.faint; ctx.textAlign = 'right';
      ctx.fillText(gy.toFixed(1), pad.l - 7, Y(gy) + 4);
    }
    ctx.fillStyle = COL.text; ctx.textAlign = 'center';
    ctx.fillText('φM (eV)', (pad.l + w - pad.r) / 2, h - 6);
    ctx.save();
    ctx.translate(13, (pad.t + h - pad.b) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('φSBH (eV)', 0, 0);
    ctx.restore();

    var S = pinningS(logD);
    function actual(pm) { return S * (pm - CHI) + (1 - S) * CNL; }

    // Schottky limit (slope 1)
    ctx.strokeStyle = COL.cb; ctx.lineWidth = 1.4; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(X(x0), Y(x0 - CHI)); ctx.lineTo(X(x1), Y(x1 - CHI)); ctx.stroke();
    // Bardeen limit (flat at CNL)
    ctx.strokeStyle = COL.vb;
    ctx.beginPath(); ctx.moveTo(X(x0), Y(CNL)); ctx.lineTo(X(x1), Y(CNL)); ctx.stroke();
    ctx.setLineDash([]);

    // actual line
    ctx.strokeStyle = COL.fermi; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(X(x0), Y(actual(x0))); ctx.lineTo(X(x1), Y(actual(x1))); ctx.stroke();

    // current-metal marker
    var pb = actual(phiM2);
    ctx.fillStyle = COL.fermi;
    ctx.beginPath(); ctx.arc(X(phiM2), Y(pb), 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#14110b'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = COL.text; ctx.textAlign = 'left';
    ctx.fillText('φSBH = ' + pb.toFixed(2) + ' eV', X(phiM2) + 10, Y(pb) - 8);

    // S readout
    ctx.fillStyle = COL.text; ctx.textAlign = 'left'; ctx.font = '13px ' + FONT;
    ctx.fillText('S = ' + S.toFixed(2), pad.l + 10, pad.t + 16);
  }

  // ════════ Module 03 — I-V curves ════════
  var ivCanvas = document.getElementById('c-iv');
  var ivScale = 'lin';
  var phiB3 = 0.70, eta = 1.10, temp = 300;
  var AD = 1e-3;     // diode area (cm^2)
  var ASTAR = 112;   // Richardson constant for n-Si (A cm^-2 K^-2)

  function current(V, T, phi, n) {
    var kT = 8.617e-5 * T; // eV
    var I0 = AD * ASTAR * T * T * Math.exp(-phi / kT);
    return I0 * (Math.exp(V / (n * kT)) - 1);
  }

  function fmtI(a) {
    var ab = Math.abs(a);
    if (ab >= 1e-3) return (a * 1e3).toPrecision(3) + ' mA';
    if (ab >= 1e-6) return (a * 1e6).toPrecision(3) + ' µA';
    if (ab >= 1e-9) return (a * 1e9).toPrecision(3) + ' nA';
    return (a * 1e12).toPrecision(3) + ' pA';
  }

  function drawIV() {
    var s = setupCanvas(ivCanvas);
    if (!s) return;
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px ' + FONT;

    var pad = { l: 60, r: 16, t: 18, b: 38 };
    var vMin = -0.3, vMax = 0.5;
    function X(v) { return pad.l + (v - vMin) / (vMax - vMin) * (w - pad.l - pad.r); }

    var i, v;
    if (ivScale === 'lin') {
      var iMax = current(vMax, temp, phiB3, eta);
      var iMin = -0.08 * iMax;
      function Yl(a) { return h - pad.b - (a - iMin) / (iMax - iMin) * (h - pad.t - pad.b); }

      // axes
      ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
      for (v = -0.2; v <= 0.41; v += 0.2) {
        ctx.beginPath(); ctx.moveTo(X(v), pad.t); ctx.lineTo(X(v), h - pad.b); ctx.stroke();
        ctx.fillStyle = COL.faint; ctx.textAlign = 'center';
        ctx.fillText(v.toFixed(1), X(v), h - pad.b + 16);
      }
      ctx.strokeStyle = COL.faint;
      ctx.beginPath(); ctx.moveTo(pad.l, Yl(0)); ctx.lineTo(w - pad.r, Yl(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(0), pad.t); ctx.lineTo(X(0), h - pad.b); ctx.stroke();
      ctx.fillStyle = COL.faint; ctx.textAlign = 'right';
      ctx.fillText('0', pad.l - 7, Yl(0) + 4);
      ctx.fillText(fmtI(iMax), pad.l + 52, pad.t + 14);

      // curve
      ctx.strokeStyle = COL.fermi; ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (i = 0; i <= 240; i++) {
        v = vMin + (vMax - vMin) * i / 240;
        var y = Yl(Math.max(Math.min(current(v, temp, phiB3, eta), iMax), iMin));
        if (i === 0) ctx.moveTo(X(v), y); else ctx.lineTo(X(v), y);
      }
      ctx.stroke();

      ctx.fillStyle = COL.text; ctx.textAlign = 'center';
      ctx.fillText('V (V)', (pad.l + w - pad.r) / 2, h - 6);
      ctx.save();
      ctx.translate(13, (pad.t + h - pad.b) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('I', 0, 0);
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.fillText('forward →', X(0.12), Yl(0) - 10);
      ctx.fillText('← reverse', X(-0.28), Yl(0) - 10);
    } else {
      var lMin = -13, lMax = -1;
      function Ys(lg) { return h - pad.b - (lg - lMin) / (lMax - lMin) * (h - pad.t - pad.b); }

      ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
      for (v = -0.2; v <= 0.41; v += 0.2) {
        ctx.beginPath(); ctx.moveTo(X(v), pad.t); ctx.lineTo(X(v), h - pad.b); ctx.stroke();
        ctx.fillStyle = COL.faint; ctx.textAlign = 'center';
        ctx.fillText(v.toFixed(1), X(v), h - pad.b + 16);
      }
      var lg;
      for (lg = -12; lg <= -2; lg += 2) {
        ctx.strokeStyle = COL.grid;
        ctx.beginPath(); ctx.moveTo(pad.l, Ys(lg)); ctx.lineTo(w - pad.r, Ys(lg)); ctx.stroke();
        ctx.fillStyle = COL.faint; ctx.textAlign = 'right';
        ctx.fillText('10' + sup(lg), pad.l - 6, Ys(lg) + 4);
      }
      ctx.strokeStyle = COL.faint;
      ctx.beginPath(); ctx.moveTo(X(0), pad.t); ctx.lineTo(X(0), h - pad.b); ctx.stroke();

      // |I| curve
      ctx.strokeStyle = COL.fermi; ctx.lineWidth = 2.2;
      ctx.beginPath();
      var started = false;
      for (i = 0; i <= 280; i++) {
        v = vMin + (vMax - vMin) * i / 280;
        var a = Math.abs(current(v, temp, phiB3, eta));
        if (a < 1e-15) { started = false; continue; }
        lg = Math.max(Math.min(Math.log10(a), lMax), lMin);
        if (!started) { ctx.moveTo(X(v), Ys(lg)); started = true; }
        else ctx.lineTo(X(v), Ys(lg));
      }
      ctx.stroke();

      // extrapolated fit line → intercept I0
      var kT = 8.617e-5 * temp;
      var I0 = AD * ASTAR * temp * temp * Math.exp(-phiB3 / kT);
      var slope = Math.log10(Math.E) / (eta * kT); // d(log10 I)/dV
      ctx.strokeStyle = COL.cb; ctx.lineWidth = 1.3; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(X(0), Ys(Math.max(Math.log10(I0), lMin)));
      ctx.lineTo(X(vMax), Ys(Math.min(Math.log10(I0) + slope * vMax, lMax)));
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COL.cb; ctx.textAlign = 'left';
      ctx.fillText('intercept → I0 → φSBH', pad.l + 8, Ys(Math.log10(I0)) - 8);
      ctx.fillText('slope → η', X(0.3), Ys(Math.log10(I0) + slope * 0.3) - 12);

      ctx.fillStyle = COL.text; ctx.textAlign = 'center';
      ctx.fillText('V (V)', (pad.l + w - pad.r) / 2, h - 6);
      ctx.save();
      ctx.translate(13, (pad.t + h - pad.b) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('|I| (A)', 0, 0);
      ctx.restore();
    }
  }

  function sup(n) {
    var map = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return String(n).split('').map(function (c) { return map[c] || c; }).join('');
  }

  // ── controls ───────────────────────────────────────────────────────────
  document.querySelectorAll('#band-mode .demo-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#band-mode .demo-btn').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      bandMode = b.getAttribute('data-bmode');
      drawBand();
    });
  });
  var elPhiM = document.getElementById('ctrl-phim');
  elPhiM.addEventListener('input', function () {
    phiM = parseFloat(elPhiM.value);
    document.getElementById('v-phim').textContent = phiM.toFixed(2) + ' eV';
    drawBand();
  });

  var elDit = document.getElementById('ctrl-dit');
  elDit.addEventListener('input', function () {
    logD = parseFloat(elDit.value);
    var mant = Math.pow(10, logD - Math.floor(logD));
    document.getElementById('v-dit').textContent =
      (mant >= 1.05 ? mant.toFixed(1) + '×' : '') + '10' + sup(Math.floor(logD)) + ' cm⁻²eV⁻¹';
    drawPin();
  });
  var elPhiM2 = document.getElementById('ctrl-phim2');
  elPhiM2.addEventListener('input', function () {
    phiM2 = parseFloat(elPhiM2.value);
    document.getElementById('v-phim2').textContent = phiM2.toFixed(2) + ' eV';
    drawPin();
  });

  document.querySelectorAll('#iv-scale .demo-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#iv-scale .demo-btn').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      ivScale = b.getAttribute('data-ivscale');
      drawIV();
    });
  });
  var elPhiB = document.getElementById('ctrl-phib');
  elPhiB.addEventListener('input', function () {
    phiB3 = parseFloat(elPhiB.value);
    document.getElementById('v-phib').textContent = phiB3.toFixed(2) + ' eV';
    drawIV();
  });
  var elEta = document.getElementById('ctrl-eta');
  elEta.addEventListener('input', function () {
    eta = parseFloat(elEta.value);
    document.getElementById('v-eta').textContent = eta.toFixed(2);
    drawIV();
  });
  var elTemp = document.getElementById('ctrl-temp');
  elTemp.addEventListener('input', function () {
    temp = parseFloat(elTemp.value);
    document.getElementById('v-temp').textContent = temp + ' K';
    drawIV();
  });

  function drawAll() { drawBand(); drawPin(); drawIV(); }
  window.addEventListener('resize', drawAll);
  drawAll();
})();
