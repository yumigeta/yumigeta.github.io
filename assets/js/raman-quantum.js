/* ============================================================
   Quantum Raman demo — vanilla JS, no deps.

   Boltzmann ladder + Stokes/anti-Stokes spectrum vs temperature.
   Left panel : vibrational ladder E_v = ħω_k(v + 1/2) with the
                Boltzmann population of each rung.
   Right panel: Stokes / anti-Stokes lines with
                I_AS/I_S = ((ν_i+ν_k)/(ν_i−ν_k))^4 · exp(−hcν_k/kT).
   ============================================================ */

(function quantumRamanDemo() {
  const cvL = document.getElementById('c-qladder');
  const cvR = document.getElementById('c-qspec');
  if (!cvL || !cvR) return;

  const FONT = "'Zen Kaku Gothic New', system-ui, sans-serif";
  const COL = {
    stokes: '#ef4444',
    anti:   '#3b82f6',
    ray:    '#16a34a',
    pop:    '#fbbf24',
    level:  '#d6d3d1',
    axis:   'rgba(255,255,255,0.25)',
    faint:  '#a8a29e'
  };

  const HCK   = 1.43877;   // hc/k_B in cm·K  (second radiation constant)
  const NU_I  = 18797;     // 532 nm laser in cm⁻¹

  let nuK  = 520;          // phonon energy in cm⁻¹
  let temp = 300;          // K

  const slider  = document.getElementById('ctrl-temp');
  const out     = document.getElementById('v-temp');
  const btns    = document.querySelectorAll('#qmode-btns .demo-btn');
  const readout = document.getElementById('qreadout');

  function lang() {
    return document.documentElement.getAttribute('data-lang') === 'ja' ? 'ja' : 'en';
  }

  function fitCanvas(cv) {
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // Boltzmann weight of rung v:  p_v = (1−x)·x^v,  x = exp(−hcν_k/k_BT)
  function boltzX() { return Math.exp(-HCK * nuK / temp); }

  function ratioAS() {
    const f4 = Math.pow((NU_I + nuK) / (NU_I - nuK), 4);
    return f4 * boltzX();          // n̄/(n̄+1) = x
  }

  /* ── Left panel: ladder + populations ───────────────────── */
  function drawLadder() {
    const { ctx, w, h } = fitCanvas(cvL);
    ctx.clearRect(0, 0, w, h);

    const x = boltzX();
    const NLEV = 5;
    const left = 56, right = w - 16;
    const yBot = h - 34, dy = (h - 70) / (NLEV - 1);
    const barMax = right - left - 64;

    ctx.font = '11px ' + FONT;
    for (let v = 0; v < NLEV; v++) {
      const y = yBot - v * dy;
      const p = (1 - x) * Math.pow(x, v);

      // level line
      ctx.strokeStyle = COL.level;
      ctx.globalAlpha = v === 0 ? 0.95 : 0.55;
      ctx.lineWidth = v === 0 ? 2 : 1.3;
      ctx.beginPath();
      ctx.moveTo(left, y); ctx.lineTo(right, y);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // rung label
      ctx.fillStyle = COL.faint;
      ctx.textAlign = 'right';
      ctx.fillText('v=' + v, left - 8, y + 4);

      // population bar
      const bw = Math.max(p * barMax, p > 1e-4 ? 2 : 0);
      ctx.fillStyle = COL.pop;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(left + 4, y - 11, bw, 9);
      ctx.globalAlpha = 1;

      // percentage
      ctx.textAlign = 'left';
      ctx.fillStyle = COL.pop;
      const pct = p >= 0.001 ? (p * 100).toFixed(1) + '%'
                : p > 0      ? (p * 100).toExponential(1) + '%' : '0%';
      ctx.fillText(pct, left + 8 + bw, y - 3);
    }

    // titles
    ctx.fillStyle = '#e7e5e4';
    ctx.font = '12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(lang() === 'ja' ? '振動準位の人口（ボルツマン分布）' : 'Rung populations (Boltzmann)', 12, 18);
    ctx.fillStyle = COL.faint;
    ctx.font = '11px ' + FONT;
    ctx.fillText('N(v+1)/N(v) = exp(−ħωₖ/kʙT) = ' + x.toFixed(3), 12, h - 10);
  }

  /* ── Right panel: spectrum ──────────────────────────────── */
  function drawSpectrum() {
    const { ctx, w, h } = fitCanvas(cvR);
    ctx.clearRect(0, 0, w, h);

    const left = 14, right = w - 14;
    const yBase = h - 36, yTop = 34;
    const span = 1800;                       // ±cm⁻¹ around the laser
    const xOf = nu => left + (nu + span) / (2 * span) * (right - left);

    // baseline
    ctx.strokeStyle = COL.axis;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, yBase); ctx.lineTo(right, yBase); ctx.stroke();

    const r = ratioAS();
    const hMax = yBase - yTop;

    // Gaussian peak helper. Stokes is plotted on the low-energy
    // (negative) side of the laser line, anti-Stokes on the high side.
    function peak(nuC, amp, color) {
      const sigma = 28;                      // cm⁻¹, display width
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let first = true;
      for (let px = left; px <= right; px++) {
        const nu = (px - left) / (right - left) * 2 * span - span;
        const y = yBase - amp * hMax * Math.exp(-((nu - nuC) ** 2) / (2 * sigma * sigma));
        if (first) { ctx.moveTo(px, y); first = false; } else ctx.lineTo(px, y);
      }
      ctx.stroke();
    }

    // Rayleigh: off scale — clipped green pillar at zero shift
    ctx.fillStyle = 'rgba(22,163,74,0.30)';
    ctx.fillRect(xOf(0) - 3, yTop - 14, 6, yBase - yTop + 14);
    ctx.fillStyle = COL.ray;
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('×10⁶', xOf(0), yTop - 18);

    peak(-nuK, 0.86, COL.stokes);
    peak(+nuK, 0.86 * r, COL.anti);

    // peak labels
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = COL.stokes;
    ctx.fillText('Stokes', xOf(-nuK), yBase - 0.86 * hMax - 8);
    ctx.fillStyle = COL.anti;
    ctx.fillText('anti-Stokes', xOf(+nuK), yBase - Math.max(0.86 * r * hMax, 4) - 8);

    // axis labels
    ctx.fillStyle = COL.faint;
    ctx.fillText('ωᵢ − ωₖ', xOf(-nuK), yBase + 14);
    ctx.fillText('ωᵢ', xOf(0), yBase + 14);
    ctx.fillText('ωᵢ + ωₖ', xOf(+nuK), yBase + 14);
    ctx.textAlign = 'right';
    ctx.fillText(lang() === 'ja' ? '散乱光の周波数 →' : 'scattered frequency →', right, h - 8);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e7e5e4';
    ctx.font = '12px ' + FONT;
    ctx.fillText(lang() === 'ja' ? '分光器が見るスペクトル' : 'What the spectrometer sees', 12, 18);
  }

  function fmtRatio(r) {
    return r >= 0.01 ? r.toFixed(3) : r.toExponential(2);
  }

  function updateReadout() {
    const x = boltzX();
    const nbar = x / (1 - x);
    const r = ratioAS();
    const ja = lang() === 'ja';
    const nbarTxt = nbar < 0.01 ? nbar.toExponential(2) : nbar.toFixed(3);
    readout.innerHTML = ja
      ? `<b>T = ${temp} K</b>、フォノン ${nuK} cm⁻¹（532 nm 励起）：平均フォノン数 <b>n̄ = ${nbarTxt}</b>、強度比 <b>I<sub>AS</sub>/I<sub>S</sub> = ${fmtRatio(r)}</b>。この比を式(7)に入れれば温度が読み返せる。`
      : `<b>T = ${temp} K</b>, phonon at ${nuK} cm⁻¹ (532 nm excitation): mean phonon number <b>n̄ = ${nbarTxt}</b>, intensity ratio <b>I<sub>AS</sub>/I<sub>S</sub> = ${fmtRatio(r)}</b>. Feed this ratio into Eq. (7) and the temperature comes back out.`;
  }

  function redraw() {
    drawLadder();
    drawSpectrum();
    updateReadout();
  }

  slider.addEventListener('input', () => {
    temp = parseInt(slider.value, 10);
    out.textContent = 'T = ' + temp + ' K';
    redraw();
  });

  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(o => o.classList.remove('active'));
    b.classList.add('active');
    nuK = parseInt(b.dataset.nu, 10);
    redraw();
  }));

  // redraw on language toggle and resize
  document.addEventListener('DOMContentLoaded', () => {
    const langBtn = document.querySelector('.lang-btn');
    if (langBtn) langBtn.addEventListener('click', () => setTimeout(redraw, 0));
  });
  window.addEventListener('resize', redraw);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', redraw);
  } else {
    redraw();
  }
})();
