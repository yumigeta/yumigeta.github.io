/* ════════════════════════════════════════════════════════════════════
   Noisy Spectra: acquisition time vs accumulation — interactive demos
   Vanilla JS, no dependencies. Three modules:
     00  Noise sources       — build a noisy spectrum, see SNR & dominant noise
     01  t vs N trade-off    — SNR-vs-N curve + two spectra at fixed total time
     02  Cosmic-ray spikes   — sum vs median rejection across frames
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const lang = () => document.documentElement.getAttribute('data-lang') || 'en';
  const t = (en, ja) => (lang() === 'ja' ? ja : en);
  const $ = id => document.getElementById(id);

  function fitCanvas(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || cv.parentElement.clientWidth;
    // Read the intended logical height ONCE and cache it. Setting cv.height
    // (the draw-buffer) overwrites the HTML height attribute, so re-reading it
    // would make the canvas grow on every redraw.
    if (!cv.dataset.h) cv.dataset.h = cv.getAttribute('height') || cv.clientHeight || 200;
    const h = +cv.dataset.h;
    cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function gaussianRand(mean, sd) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /* Poisson sampler (Knuth for small λ, normal approx for large λ) */
  function poisson(lambda) {
    if (lambda < 0) lambda = 0;
    if (lambda > 30) return Math.max(0, Math.round(gaussianRand(lambda, Math.sqrt(lambda))));
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }

  const NPIX = 220;
  /* normalised noise-free spectral profile (peaks on a small baseline), 0..1 */
  const PEAKS = [
    { c: 0.22, w: 0.012, a: 1.00 },
    { c: 0.46, w: 0.020, a: 0.55 },
    { c: 0.68, w: 0.010, a: 0.80 },
    { c: 0.85, w: 0.030, a: 0.35 },
  ];
  function profile(i) {                                // i in 0..NPIX-1
    const x = i / (NPIX - 1);
    let v = 0.06;                                      // flat baseline fraction
    PEAKS.forEach(p => { v += p.a * Math.exp(-0.5 * ((x - p.c) / p.w) ** 2); });
    return v;
  }
  const PROFILE = Array.from({ length: NPIX }, (_, i) => profile(i));
  const PEAK_IDX = PROFILE.indexOf(Math.max(...PROFILE));
  const BASE_LEVEL = 0.06;
  const FULL_WELL = 300;   // per-frame detector well capacity (counts); clips bright peaks

  /* draw a spectrum trace (measured) with optional true overlay & spikes */
  function drawSpectrum(cv, measured, trueSig, opts) {
    opts = opts || {};
    const { ctx, w, h } = fitCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    const yAxis = opts.yAxis || false;   // draw labelled y-axis when true
    const pad = { l: yAxis ? 38 : 8, r: 8, t: 12, b: 14 };
    const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
    const max = opts.max || Math.max(1e-9, ...measured, ...(trueSig || []));
    const X = i => pad.l + i / (NPIX - 1) * plotW;
    const Y = v => pad.t + plotH - Math.max(0, Math.min(1, v / max)) * plotH;
    // y-axis ticks and labels
    if (yAxis) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
      ctx.fillStyle = '#a8a29e'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      const nTicks = 4;
      for (let i = 0; i <= nTicks; i++) {
        const val = max * i / nTicks;
        const y   = Y(val);
        ctx.beginPath(); ctx.moveTo(pad.l - 4, y); ctx.lineTo(pad.l, y); ctx.stroke();
        ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0), pad.l - 6, y + 3);
        if (i > 0) {
          ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.restore();
        }
      }
      // axis line
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + plotH); ctx.stroke();
      // y-axis label (rotated)
      ctx.save();
      ctx.translate(11, pad.t + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillStyle = '#78716c'; ctx.font = '9px sans-serif';
      ctx.fillText(t('Intensity (counts)', '強度 (カウント)'), 0, 0);
      ctx.restore();
      ctx.restore();
    }
    // baseline grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t + plotH); ctx.lineTo(w - pad.r, pad.t + plotH); ctx.stroke();
    // true signal
    if (trueSig) {
      ctx.strokeStyle = 'rgba(251,191,36,0.85)'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i < NPIX; i++) (i ? ctx.lineTo(X(i), Y(trueSig[i])) : ctx.moveTo(X(i), Y(trueSig[i])));
      ctx.stroke();
    }
    // saturation ceiling line
    if (opts.satLine != null && opts.satLine < max) {
      const satY = Y(opts.satLine);
      ctx.save();
      ctx.strokeStyle = 'rgba(251,113,133,0.85)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(pad.l, satY); ctx.lineTo(w - pad.r, satY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(251,113,133,0.9)'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('SAT', w - pad.r, satY - 3);
      ctx.restore();
    }
    // spikes (optional overlay markers)
    if (opts.spikes) {
      ctx.strokeStyle = 'rgba(253,164,175,0.5)'; ctx.lineWidth = 1;
      opts.spikes.forEach(i => { ctx.beginPath(); ctx.moveTo(X(i), pad.t); ctx.lineTo(X(i), pad.t + plotH); ctx.stroke(); });
    }
    // measured
    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i < NPIX; i++) (i ? ctx.lineTo(X(i), Y(measured[i])) : ctx.moveTo(X(i), Y(measured[i])));
    ctx.stroke();
  }

  /* Simulate one accumulated, summed spectrum.
     rate_i (counts/sec) = brightness * profile_i ; returns summed counts array.
     Also returns analytic SNR at the strongest peak. */
  function simulate(bright, t_acq, N, readNoise, darkRate, fullWell) {
    darkRate = darkRate || 0.4;
    if (fullWell == null) fullWell = Infinity;
    let saturated = false;
    const summed = new Float64Array(NPIX);
    for (let n = 0; n < N; n++) {
      for (let i = 0; i < NPIX; i++) {
        const lam = bright * PROFILE[i] * t_acq + darkRate * t_acq;
        let c = poisson(lam);
        c += gaussianRand(0, readNoise);              // read noise, once per frame
        if (c > fullWell) { c = fullWell; saturated = true; }
        summed[i] += c;
      }
    }
    // analytic SNR at peak (signal above baseline)
    const sigPeak = bright * (PROFILE[PEAK_IDX] - BASE_LEVEL) * t_acq * N;
    const totalPeak = bright * PROFILE[PEAK_IDX] * t_acq * N;
    const noiseVar = totalPeak + darkRate * t_acq * N + readNoise * readNoise * N;
    const snr = sigPeak / Math.sqrt(Math.max(1e-9, noiseVar));
    return { summed, snr, saturated };
  }

  /* analytic SNR only (no simulation) */
  function snrAnalytic(bright, t_acq, N, readNoise, darkRate) {
    darkRate = darkRate || 0.4;
    const sigPeak = bright * (PROFILE[PEAK_IDX] - BASE_LEVEL) * t_acq * N;
    const totalPeak = bright * PROFILE[PEAK_IDX] * t_acq * N;
    const noiseVar = totalPeak + darkRate * t_acq * N + readNoise * readNoise * N;
    return sigPeak / Math.sqrt(Math.max(1e-9, noiseVar));
  }

  function trueSummed(bright, t_acq, N) {
    return Array.from({ length: NPIX }, (_, i) => bright * PROFILE[i] * t_acq * N);
  }

  /* ════════════════ Module 00 — Noise sources ════════════════ */
  function initNoiseSim() {
    const cv = $('c-spec'); if (!cv) return;
    const ids = ['t', 'acc', 'bright', 'read'];
    const els = {}; ids.forEach(k => { els[k] = $('ctrl-' + k); });

    function update() {
      const tA = +els.t.value, N = +els.acc.value, br = +els.bright.value, rd = +els.read.value;
      $('v-t').textContent = tA.toFixed(1) + ' s';
      $('v-acc').textContent = N;
      $('v-bright').textContent = br;
      $('v-read').textContent = rd;
      const darkRate = 0.4;
      const { summed, snr, saturated } = simulate(br, tA, N, rd, darkRate, FULL_WELL);
      const trueS = trueSummed(br, tA, N);
      const max = Math.max(...trueS) * 1.15;
      drawSpectrum(cv, Array.from(summed), trueS, { max, satLine: FULL_WELL * N, yAxis: true });
      $('st-T').textContent = (tA * N).toFixed(1) + ' s';
      $('st-snr').textContent = saturated ? snr.toFixed(1) + ' *' : snr.toFixed(1);
      // dominant noise: compare variance terms at peak
      const totalPeak = br * PROFILE[PEAK_IDX] * tA * N;
      const vShot = totalPeak;
      const vDark = darkRate * tA * N;
      const vRead = rd * rd * N;
      const terms = [
        { n: t('shot noise', 'ショットノイズ'), v: vShot },
        { n: t('read noise', '読み出しノイズ'), v: vRead },
        { n: t('dark noise', 'ダークノイズ'), v: vDark },
      ].sort((a, b) => b.v - a.v);
      $('st-dom').textContent = terms[0].n;
      const satEl = $('st-sat0');
      if (satEl) {
        satEl.textContent = saturated
          ? t('⚠ Saturated: peak clipped (t too long)', '⚠ 飽和：ピークがクリップされています（t が長すぎる）')
          : t('OK: within detector range', 'OK：検出器の範囲内');
        satEl.style.color = saturated ? '#fb7185' : '#86efac';
      }
    }
    ids.forEach(k => els[k].addEventListener('input', update));
    window.addEventListener('resize', update);
    document.querySelector('.lang-btn') && document.querySelector('.lang-btn').addEventListener('click', () => setTimeout(update, 0));
    update();
  }

  /* ════════════════ Module 01 — t vs N trade-off ════════════════ */
  function initTradeoff() {
    const curve = $('c-snr-curve'); if (!curve) return;
    const elT = $('ctrl-T2'), elN = $('ctrl-N2'), elB = $('ctrl-bright2'), elR = $('ctrl-read2');

    function update() {
      const T = +elT.value, N = +elN.value, br = +elB.value, rd = +elR.value;
      $('v-T2').textContent = T + ' s';
      $('v-N2').textContent = N;
      $('v-bright2').textContent = br;
      $('v-read2').textContent = rd;
      $('lbl-many').textContent = 'N=' + N + ', t=' + (T / N).toFixed(2) + 's';

      // SNR vs N curve at fixed total time T
      const Nmax = 64;
      const snrs = [];
      for (let n = 1; n <= Nmax; n++) snrs.push(snrAnalytic(br, T / n, n, rd, 0.4));
      drawCurve(curve, snrs, N);

      // two spectra at same total time
      const long = simulate(br, T, 1, rd, 0.4, FULL_WELL);
      const many = simulate(br, T / N, N, rd, 0.4, FULL_WELL);
      const trueS = trueSummed(br, T, 1);             // total signal identical either way
      const max = Math.max(...trueS) * 1.2;
      // satLine = per-frame well × frames; shows how headroom differs between the two strategies
      drawSpectrum($('c-spec-long'), Array.from(long.summed), trueS, { max, satLine: FULL_WELL * 1 });
      drawSpectrum($('c-spec-many'), Array.from(many.summed), trueS, { max, satLine: FULL_WELL * N });
      $('st-snr-long').textContent = long.saturated ? long.snr.toFixed(1) + ' *' : long.snr.toFixed(1);
      $('st-snr-many').textContent = many.saturated ? many.snr.toFixed(1) + ' *' : many.snr.toFixed(1);
      // saturation badges under each panel
      const satLongEl = $('sat-long');
      const satManyEl = $('sat-many');
      if (satLongEl) {
        satLongEl.textContent = long.saturated ? t('⚠ Saturated', '⚠ 飽和') : '';
        satLongEl.style.color = '#fb7185';
      }
      if (satManyEl) {
        satManyEl.textContent = many.saturated ? t('⚠ Saturated', '⚠ 飽和') : '';
        satManyEl.style.color = '#fb7185';
      }

      // regime verdict: saturation takes priority over read-noise analysis
      const totalPeak = br * PROFILE[PEAK_IDX] * T;
      const vRead = rd * rd * N;
      const readShare = vRead / (totalPeak + 0.4 * T + vRead);
      const el = $('trade-verdict');
      let cls, msg;
      if (long.saturated && !many.saturated) {
        cls = 'bad';
        msg = t('⚠ Long acquisition saturates the detector: the peak is clipped and data is lost. Use more, shorter accumulations.',
                '⚠ 長時間取得で検出器がサチュレーション：ピークがクリップされデータが失われます。短い積算回数に分けてください。');
      } else if (long.saturated && many.saturated) {
        cls = 'bad';
        msg = t('⚠ Both strategies saturate: reduce acquisition time t (increase N) or lower the source brightness.',
                '⚠ 両方の方法でサチュレーション：取得時間 t を短くする（N を増やす）か、光源の明るさを下げてください。');
      } else if (readShare < 0.1) {
        cls = 'good';
        msg = t('Shot-noise-limited: the split barely changes SNR. Accumulate freely for spike rejection & saturation headroom.',
                'ショットノイズ律速：分け方はSN比をほとんど変えない。スパイク除去と飽和マージンのため積算を活用してよい。');
      } else if (readShare < 0.4) {
        cls = 'mid';
        msg = t('Mixed regime: read noise is starting to bite. Lean toward longer acquisitions.',
                '中間領域：読み出しノイズが効き始めている。やや長めの取得時間が有利。');
      } else {
        cls = 'bad';
        msg = t('Read-noise-limited: fewer, longer acquisitions clearly win. Reduce N.',
                '読み出しノイズ律速：少数・長時間の取得が明確に有利。N を減らそう。');
      }
      el.innerHTML = '<span class="me-verdict ' + cls + '">' + msg + '</span>';
    }

    function drawCurve(cv, snrs, curN) {
      const { ctx, w, h } = fitCanvas(cv);
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 36, r: 12, t: 12, b: 24 };
      const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
      const maxS = Math.max(...snrs) * 1.05 || 1;
      const X = n => pad.l + (n - 1) / (snrs.length - 1) * plotW;
      const Y = s => pad.t + plotH - s / maxS * plotH;
      // axes
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + plotH); ctx.lineTo(w - pad.r, pad.t + plotH); ctx.stroke();
      ctx.fillStyle = '#a8a29e'; ctx.font = '10px sans-serif';
      ctx.textAlign = 'right'; ctx.fillText(maxS.toFixed(0), pad.l - 4, pad.t + 8); ctx.fillText('0', pad.l - 4, pad.t + plotH);
      ctx.textAlign = 'center'; ctx.fillText('N = 1', X(1), h - 7); ctx.fillText('N = ' + snrs.length, X(snrs.length), h - 7);
      ctx.fillText(t('accumulations N →', '積算 N →'), pad.l + plotW / 2, h - 7);
      // curve
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.beginPath();
      snrs.forEach((s, k) => (k ? ctx.lineTo(X(k + 1), Y(s)) : ctx.moveTo(X(k + 1), Y(s))));
      ctx.stroke();
      // current N marker
      const cs = snrs[curN - 1];
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(X(curN), Y(cs), 5, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(251,191,36,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(X(curN), pad.t); ctx.lineTo(X(curN), pad.t + plotH); ctx.stroke();
      ctx.setLineDash([]);
    }

    [elT, elN, elB, elR].forEach(el => el.addEventListener('input', update));
    window.addEventListener('resize', update);
    document.querySelector('.lang-btn') && document.querySelector('.lang-btn').addEventListener('click', () => setTimeout(update, 0));
    update();
  }

  /* ════════════════ Module 02 — Cosmic-ray spikes ════════════════ */
  function initSpikes() {
    const cv    = $('c-spike');       if (!cv) return;
    const cvFrm = $('c-spike-frame'); if (!cvFrm) return;
    const elN   = $('ctrl-spk-n');
    let mode = 'sum';
    let spikeList    = [];
    let currentFrames = [];
    let animK = 0, animTimer = null;
    const t_acq = 3, bright = 60, read = 5;
    /* normalized reference profile (peak = 1.0), shared by both panels */
    const NORM_TRUE  = PROFILE.map(p => p / PROFILE[PEAK_IDX]);
    const singlePeak = bright * PROFILE[PEAK_IDX] * t_acq;

    function cancelAnim() {
      if (animTimer !== null) { clearTimeout(animTimer); animTimer = null; }
    }

    function buildFrames(N) {
      const frames = [];
      for (let n = 0; n < N; n++) {
        const f = new Float64Array(NPIX);
        for (let i = 0; i < NPIX; i++) {
          const lam = bright * PROFILE[i] * t_acq + 0.4 * t_acq;
          f[i] = poisson(lam) + gaussianRand(0, read);
        }
        frames.push(f);
      }
      spikeList.forEach(sp => { if (sp.frame < N) frames[sp.frame][sp.pix] += sp.amp; });
      return frames;
    }

    function clearPanels() {
      [cv, cvFrm].forEach(c => { const { ctx, w, h } = fitCanvas(c); ctx.clearRect(0, 0, w, h); });
      const fcEl = $('spk-frame-count');
      if (fcEl) fcEl.textContent = t('Press “Start measurement”', '「測定開始」を押してください');
      $('spk-verdict').innerHTML = '';
      const lbl = $('spk-frame-label');
      const N = currentFrames.length || '—';
      if (lbl) lbl.innerHTML = '<span class="i18n-en">Frame — / ' + N + '</span>'
                              + '<span class="i18n-ja">フレーム — / ' + N + '</span>';
    }

    /* render step k (1-indexed): left = frame k, right = accumulated 1..k, both normalised */
    function renderAt(k) {
      const N = currentFrames.length; if (!N) return;

      /* left panel: frame k normalised to single-frame expected peak */
      const normFrm = Array.from(currentFrames[k - 1], v => v / singlePeak);
      /* max = 1.5 → spikes clip at top, true peak sits comfortably at ~1 */
      drawSpectrum(cvFrm, normFrm, NORM_TRUE, { max: 1.5 });

      /* right panel: accumulated 1..k, normalised to k-frame expected peak (always ~1) */
      const kPeak = singlePeak * k;
      const out = new Float64Array(NPIX);
      if (mode === 'sum') {
        for (let i = 0; i < NPIX; i++) {
          let s = 0; for (let n = 0; n < k; n++) s += currentFrames[n][i]; out[i] = s;
        }
      } else {
        const col = new Array(k);
        for (let i = 0; i < NPIX; i++) {
          for (let n = 0; n < k; n++) col[n] = currentFrames[n][i];
          col.sort((a, b) => a - b);
          const m = k % 2 ? col[(k - 1) / 2] : 0.5 * (col[k / 2 - 1] + col[k / 2]);
          out[i] = m * k;
        }
      }
      const normAcc   = Array.from(out, v => v / kPeak);
      const spikePix  = spikeList.filter(s => s.frame < k).map(s => s.pix);
      drawSpectrum(cv, normAcc, NORM_TRUE, { max: 1.3, spikes: mode === 'sum' ? spikePix : [] });

      /* labels */
      const hasSpikeThisFrame = spikeList.some(s => s.frame === k - 1);
      const spikeTag = hasSpikeThisFrame ? ' ⚡' : '';
      const lbl = $('spk-frame-label');
      if (lbl) lbl.innerHTML = '<b><span class="i18n-en">Frame ' + k + ' / ' + N + spikeTag + '</span>'
                              + '<span class="i18n-ja">フレーム ' + k + ' / ' + N + spikeTag + '</span></b>';
      const accLbl = $('spk-acc-label');
      if (accLbl) accLbl.textContent = mode === 'sum' ? t('sum', '単純加算') : t('median', '中央値');
      const fcEl = $('spk-frame-count');
      if (fcEl) {
        if (k < N) {
          fcEl.textContent = t('Acquiring frame ', 'フレーム取得中 ') + k + ' / ' + N
                           + '  (' + Math.round(k / N * 100) + '%)';
        } else {
          fcEl.textContent = t('Complete: ' + N + ' frames', '完了：' + N + ' フレーム');
        }
      }

      /* verdict only when done */
      const el = $('spk-verdict');
      if (k >= N) {
        el.innerHTML = mode === 'sum'
          ? '<span class="me-verdict bad">'  + t('Summing keeps every cosmic-ray spike; they masquerade as sharp peaks.', '単純加算はすべての宇宙線スパイクを残す。鋭いピークに化けてしまう。') + '</span>'
          : '<span class="me-verdict good">' + t('Median across frames rejects the spikes while preserving the real signal.', 'フレーム間の中央値がスパイクを除去し、本物の信号は保たれる。') + '</span>';
      } else {
        el.innerHTML = '';
      }
    }

    function animNext() {
      animK++;
      renderAt(animK);
      if (animK < currentFrames.length) animTimer = setTimeout(animNext, 500);
    }

    function startAnim() {
      cancelAnim();
      $('spk-verdict').innerHTML = '';
      animK = 0;
      animNext();
    }

    function roll() {
      cancelAnim();
      const N = +elN.value;
      $('v-spk-n').textContent = N;
      const nSpikes = Math.max(2, Math.round(N * 0.8));
      spikeList = [];
      for (let s = 0; s < nSpikes; s++) {
        spikeList.push({
          frame: Math.floor(Math.random() * N),
          pix:   Math.floor(Math.random() * NPIX),
          amp:   bright * PROFILE[PEAK_IDX] * t_acq * (2 + Math.random() * 4),
        });
      }
      currentFrames = buildFrames(N);
      clearPanels();
    }

    document.querySelectorAll('#spk-mode .demo-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        document.querySelectorAll('#spk-mode .demo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); mode = btn.dataset.mode;
        if (animK > 0) startAnim();   // replay same frames in new mode only if already started
      }));
    $('btn-spk-start').addEventListener('click', startAnim);
    elN.addEventListener('input', roll);
    $('btn-spk-roll').addEventListener('click', roll);
    window.addEventListener('resize', () => { if (animK > 0) renderAt(Math.max(1, animK)); });
    document.querySelector('.lang-btn') && document.querySelector('.lang-btn').addEventListener('click',
      () => setTimeout(() => { if (animK > 0) renderAt(Math.max(1, animK)); }, 0));
    roll();
  }

  function boot() { initNoiseSim(); initTradeoff(); initSpikes(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
