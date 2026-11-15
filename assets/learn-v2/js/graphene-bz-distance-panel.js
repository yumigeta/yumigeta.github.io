(() => {
  'use strict';

  const panel = document.getElementById('g01-bz-distance');
  const geometry = globalThis.GrapheneBZGeometry;
  if (!panel || !geometry) return;
  const element = id => panel.querySelector('#g01-bz-distance-' + id);
  const canvas = element('map');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const root = document.documentElement;
  function updateLanguage() {
    const lang = (root.getAttribute('data-lang') || root.getAttribute('data-page-lang') || root.lang) === 'ja' ? 'ja' : 'en';
    canvas.setAttribute('aria-label', canvas.getAttribute('data-label-' + lang));
  }
  updateLanguage();
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(updateLanguage).observe(root, { attributes: true, attributeFilter: ['data-lang'] });
  }

  const point = ([x, y], label, shape) => ({ x, y, label, shape });
  const origin = point([0, 0], 'Γ', 'origin');
  const corners = geometry.corners.map((p, i) => i % 2 === 0
    ? point(p, 'K', 'filled') : point(p, 'K′', 'hollow'));
  const midpoints = geometry.midpoints.map(p => point(p, 'M', 'diamond'));
  const ring = geometry.nearestReciprocal.map(p => point(p, 'Γ', 'origin'));
  const secondZone = ring.map((g, i) => [corners[i], corners[(i + 1) % 6], g]);
  const [b1, , b2] = ring;
  const grid = Array.from({ length: 49 }, (_, i) => {
    const m = Math.floor(i / 7) - 3;
    const n = i % 7 - 3;
    const x = m * b1.x + n * b2.x;
    const y = m * b1.y + n * b2.y;
    return { x, y };
  });
  const cellPoints = [origin, ...corners, ...midpoints];
  const translate = (p, g) => ({ ...p, x: p.x + g.x, y: p.y + g.y });
  // All cell points lie on this coordinate mesh. A shared edge or vertex is drawn once.
  const meshCoordinates = p => [
    Math.round(4 * p.x),
    Math.round(4 * p.y / Math.sqrt(3)),
  ];
  const pointKey = p => meshCoordinates(p).join(',');
  const symmetryPoints = new Map();
  for (const g of [origin, ...ring]) {
    for (const p of cellPoints) {
      const translated = translate(p, g);
      symmetryPoints.set(pointKey(translated), translated);
    }
  }
  const centralKeys = new Set(cellPoints.map(pointKey));
  const pointLabels = [
    [origin, -8, 10], [corners[0], 8, 9], [corners[3], -8, 9], [midpoints[0], -7, -8],
  ];
  const labelledKeys = new Set(pointLabels.map(([p]) => pointKey(p)));
  const style = getComputedStyle(document.documentElement);
  const css = name => style.getPropertyValue(name).trim();
  const ink = css('--color-text');
  const paper = css('--color-bg');
  const red = css('--color-accent-suo');
  const font = css('--panel-math-font');
  const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  let view;
  let drag = null;
  let start = origin;
  let end = corners[0];
  let hover = null;

  function screen(p) {
    return { x: view.x + p.x * view.scale, y: view.y - p.y * view.scale };
  }

  function trace(points) {
    ctx.beginPath();
    for (const [i, p] of points.entries()) {
      const s = screen(p);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    }
  }

  function stroke(points, color, width) {
    trace(points);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function outline(points, fill, color, width) {
    trace(points);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function circle(p, r, fill, color, width = 1.3) {
    const s = screen(p);
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function diamond(p, size, color) {
    const s = screen(p);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - size);
    ctx.lineTo(s.x + size, s.y);
    ctx.lineTo(s.x, s.y + size);
    ctx.lineTo(s.x - size, s.y);
    ctx.closePath();
    ctx.fillStyle = paper;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  function symbol(p) {
    const primary = centralKeys.has(pointKey(p)) || samePoint(p, hover) ||
      samePoint(p, start) || samePoint(p, end);
    const color = primary ? ink : '#887d70';
    const size = primary ? 3.5 : 2.4;
    switch (p.shape) {
      case 'filled': circle(p, size, color); break;
      case 'hollow': circle(p, size, paper, color, 1.1); break;
      case 'diamond': diamond(p, size + .4, color); break;
      case 'origin': circle(p, size - .5, color); break;
    }
  }

  function samePoint(a, b) {
    return !!b && gap(a, b) < 1e-8;
  }

  function label(value, p, dx, dy, italic = false) {
    const s = screen(p);
    ctx.font = (italic ? 'italic ' : '') +
      (view.width < 410 ? '12px ' : '13px ') + font;
    ctx.textAlign = dx === 0 ? 'center' : dx < 0 ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = paper;
    ctx.fillStyle = ink;
    ctx.strokeText(value, s.x + dx, s.y + dy);
    ctx.fillText(value, s.x + dx, s.y + dy);
  }

  function drawLattice() {
    // Three forward edges per cell draw each shared Wigner–Seitz edge once.
    for (const g of grid) {
      for (let i = 0; i < 3; i++) {
        const a = corners[i];
        const b = corners[i + 1];
        stroke([{ x: g.x + a.x, y: g.y + a.y }, { x: g.x + b.x, y: g.y + b.y }],
          '#e1d9cf', .85);
      }
    }
  }

  function drawSecondZone() {
    ctx.save();
    ctx.setLineDash([2, 3]);
    for (const [a, b, g] of secondZone) {
      for (const corner of [a, b]) {
        const along = t => ({
          x: corner.x + t * (g.x - corner.x),
          y: corner.y + t * (g.y - corner.y),
        });
        stroke([along(.12), along(.88)], '#b3a391', .85);
      }
    }
    ctx.restore();
  }

  function drawAxes() {
    const x = (view.plot.right - view.x) / view.scale;
    const y = (view.y - view.plot.top) / view.scale;
    const tip = 5 / view.scale;
    const axis = 'rgba(138,125,112,.37)';
    stroke([{ x: -x, y: 0 }, { x, y: 0 }], axis, 1);
    stroke([{ x: 0, y: -y }, { x: 0, y }], axis, 1);
    stroke([{ x: x - tip, y: tip / 2 }, { x, y: 0 }, { x: x - tip, y: -tip / 2 }], axis, 1);
    stroke([{ x: -tip / 2, y: y - tip }, { x: 0, y }, { x: tip / 2, y: y - tip }], axis, 1);
    label('kₓ', { x, y: 0 }, 5, 0, true);
    label('kᵧ', { x: 0, y }, 6, 0, true);
  }

  function draw() {
    ctx.clearRect(0, 0, view.width, view.height);
    const { left, top, right, bottom } = view.plot;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();
    drawSecondZone();
    drawLattice();
    outline(corners, '#efe4d6', '#8a6f57', 1.45);
    ctx.restore();
    drawAxes();

    if (end) {
      stroke([start, end], red, 1.85);
    } else if (drag?.preview) {
      ctx.save();
      ctx.globalAlpha = .85;
      ctx.setLineDash([4, 3]);
      stroke([start, drag.preview], red, 1.75);
      ctx.restore();
    }
    view.markers.forEach(symbol);
    circle(start, 7.4, null, paper, 3.5);
    circle(start, 7.4, null, red, 1.85);
    if (end) {
      const s = screen(end);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(s.x - 6, s.y - 6, 12, 12);
    }
    for (const [p, dx, dy] of pointLabels) {
      if (visible(p, 16)) label(p.label, p, dx, dy);
    }
    const activeLabels = new Map();
    for (const p of [start, end, hover]) {
      if (p?.label && !labelledKeys.has(pointKey(p)) && visible(p, 12)) activeLabels.set(pointKey(p), p);
    }
    for (const p of activeLabels.values()) {
      const s = screen(p);
      label(p.label, p, s.x > right - 26 ? -9 : 9, s.y < top + 18 ? 10 : -9);
    }
  }

  function radical(n) {
    return n === 1 ? '' : '<msqrt><mn>' + n + '</mn></msqrt>';
  }

  function exactValue(index, rootAbove = 1, rootBelow = 1) {
    if (index === 0) return '<mn>0</mn>';
    const sign = index < 0 ? '<mo>−</mo>' : '';
    const magnitude = Math.abs(index);
    const coefficient = magnitude % 3 === 0 ? magnitude / 3 : magnitude;
    const numerator = (coefficient === 1 ? '' : '<mn>' + coefficient + '</mn>') +
      radical(rootAbove) + '<mi>π</mi>';
    const denominator = (magnitude % 3 === 0 ? '' : '<mn>3</mn>') +
      radical(rootBelow) + '<mi>a</mi>';
    return sign + '<mfrac><mrow>' + numerator + '</mrow><mrow>' + denominator + '</mrow></mfrac>';
  }

  function coordinates(p) {
    if (!p) return '—';
    const [u, v] = meshCoordinates(p);
    const name = '<span class="rp-point g01-bz-distance-point-name">' + p.label + '</span>';
    return name + '<math class="g01-bz-distance-math"><mrow><mo stretchy="true">(</mo><mrow>' +
      exactValue(u, 1, 3) + '<mo>,</mo>' + exactValue(v) + '</mrow><mo stretchy="true">)</mo></mrow></math>';
  }

  function separation(from, to) {
    if (!to) return '—';
    const [u1, v1] = meshCoordinates(from);
    const [u2, v2] = meshCoordinates(to);
    let radicand = (u2 - u1) ** 2 + 3 * (v2 - v1) ** 2;
    if (!radicand) return '<math class="g01-bz-distance-math"><mn>0</mn></math>';

    // The common denominator is 3√3 a. Cancel √3 before extracting square factors.
    const rootBelow = radicand % 3 === 0 ? 1 : 3;
    if (rootBelow === 1) radicand /= 3;
    let factor = Math.floor(Math.sqrt(radicand));
    while (radicand % (factor * factor) !== 0) factor--;
    return '<math class="g01-bz-distance-math">' + exactValue(factor, radicand / (factor * factor), rootBelow) + '</math>';
  }

  function show() {
    draw();
    element('start').innerHTML = coordinates(start);
    element('end').innerHTML = coordinates(end);
    element('distance').innerHTML = separation(start, end);
  }

  function visible(p, margin) {
    const s = screen(p);
    const { left, top, right, bottom } = view.plot;
    return s.x >= left + margin && s.x <= right - margin &&
      s.y >= top + margin && s.y <= bottom - margin;
  }

  function pick(p) {
    let best = null;
    let distance = 8 / view.scale;
    for (const q of view.markers) {
      const d = gap(p, q);
      if (d < distance) { distance = d; best = q; }
    }
    return best;
  }

  function pixel(event) {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function plotPoint(p) {
    return { x: (p.x - view.x) / view.scale, y: (view.y - p.y) / view.scale };
  }

  canvas.addEventListener('pointerdown', event => {
    if (!view || drag || event.button !== 0) return;
    const p = pixel(event);
    const selected = pick(plotPoint(p));
    if (!selected) return;
    canvas.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, pixel: p, preview: null, previous: { start, end } };
    hover = null;
    canvas.classList.add('g01-bz-distance-measuring');
    start = selected;
    end = null;
    show();
  });

  function move(event) {
    const p = pixel(event);
    if (!drag.preview && gap(p, drag.pixel) < 4) return;
    const { left, top, right, bottom } = view.plot;
    drag.preview = plotPoint({
      x: Math.max(left, Math.min(right, p.x)),
      y: Math.max(top, Math.min(bottom, p.y)),
    });
    const selected = pick(plotPoint(p));
    if (selected !== end) {
      end = selected;
      show();
    } else if (!end) {
      draw();
    }
  }

  canvas.addEventListener('pointermove', event => {
    if (!view) return;
    if (drag?.id === event.pointerId) {
      move(event);
    } else if (!drag && event.pointerType === 'mouse') {
      const next = pick(plotPoint(pixel(event)));
      if (next === hover) return;
      hover = next;
      canvas.classList.toggle('g01-bz-distance-over-point', !!hover);
      draw();
    }
  });
  canvas.addEventListener('pointerleave', () => {
    if (!hover) return;
    hover = null;
    canvas.classList.remove('g01-bz-distance-over-point');
    draw();
  });

  canvas.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    move(event);
    drag = null;
    canvas.classList.remove('g01-bz-distance-measuring', 'g01-bz-distance-over-point');
    if (!end) draw();
  });
  function cancel(event) {
    if (drag?.id !== event.pointerId) return;
    ({ start, end } = drag.previous);
    drag = null;
    canvas.classList.remove('g01-bz-distance-measuring', 'g01-bz-distance-over-point');
    show();
  }
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);

  canvas.addEventListener('keydown', event => {
    if (!view) return;
    if (event.key === 'Enter' && end) {
      start = end;
      end = null;
    } else {
      const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowDown: [0, -1], ArrowUp: [0, 1] }[event.key];
      if (!direction) return;
      const from = end ?? start;
      let best = Infinity;
      for (const p of view.markers) {
        const x = p.x - from.x;
        const y = p.y - from.y;
        const forward = x * direction[0] + y * direction[1];
        if (forward <= 1e-8) continue;
        const score = (x * x + y * y) / forward;
        if (score < best) {
          best = score;
          end = p;
        }
      }
    }
    event.preventDefault();
    show();
  });

  new ResizeObserver(() => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const plot = { left: 18, top: 12, right: width - 18, bottom: height - 12 };
    const scale = Math.min((plot.right - plot.left) / 5.75, (plot.bottom - plot.top - 18) / 3.92);
    view = { width, height, x: width / 2, y: height / 2, scale, plot };
    view.markers = [...symmetryPoints.values()].filter(p => visible(p, 8));
    show();
  }).observe(canvas);
})();
