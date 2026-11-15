/* Canvas counterpart of learn-panel.css scientific roles.
   Geometry stays with each figure; all type sizes/families come from formal tokens. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LearnPanelCanvas = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  var sizeTokens = { title: '--panel-title-size', label: '--panel-label-size', tick: '--panel-tick-size', symbol: '--panel-symbol-size' };
  function style(ctx) { return getComputedStyle(ctx.canvas.closest && ctx.canvas.closest('.learn-panel') || document.documentElement); }
  function size(ctx, sizeRole) {
    var css = style(ctx), value = css.getPropertyValue(sizeTokens[sizeRole || 'label']).trim();
    var amount = parseFloat(value);
    return value.endsWith('rem') ? amount * parseFloat(getComputedStyle(document.documentElement).fontSize) : amount;
  }
  function font(ctx, role, options) {
    options = options || {};
    var css = style(ctx), math = /^(variable|vector|math|point|identifier)$/.test(role);
    var family = css.getPropertyValue(math ? '--panel-math-font' : '--gothic').trim();
    return (/^(variable|vector)$/.test(role) ? 'italic ' : '') + (role === 'vector' ? '700' : options.weight || '500') + ' ' + size(ctx, options.sizeRole) * (options.script ? .75 : 1) + 'px ' + family;
  }
  function draw(ctx, x, y, runs, options) {
    options = options || {};
    if (!Array.isArray(runs)) runs = [{ text: String(runs), role: options.role || 'label' }];
    var widths = runs.map(function (run) {
      ctx.font = font(ctx, run.role || 'label', Object.assign({}, options, run));
      return ctx.measureText(run.text).width;
    });
    var width = widths.reduce(function (sum, value) { return sum + value; }, 0);
    var left = options.align === 'center' ? x - width / 2 : options.align === 'right' ? x - width : x;
    ctx.fillStyle = options.color || style(ctx).getPropertyValue('--color-text').trim();
    ctx.textAlign = 'left'; ctx.textBaseline = options.baseline || 'alphabetic';
    runs.forEach(function (run, index) {
      ctx.font = font(ctx, run.role || 'label', Object.assign({}, options, run));
      ctx.fillText(run.text, left, y + (run.sub ? size(ctx, options.sizeRole) * .19 : run.sup ? -size(ctx, options.sizeRole) * .38 : 0));
      left += widths[index];
    });
    return width;
  }
  function variable(base, sub, vector, subRole) {
    var runs = [{ text: base, role: vector ? 'vector' : 'variable' }];
    if (sub != null && sub !== '') runs.push({ text: String(sub), role: subRole || (/^\d+$/.test(sub) ? 'number' : 'variable'), script: true, sub: true });
    return runs;
  }
  function compact(canvas) {
    var threshold = getComputedStyle(canvas.closest('.learn-panel') || document.documentElement).getPropertyValue('--panel-comparison-breakpoint');
    return canvas.getBoundingClientRect().width <= parseFloat(threshold);
  }
  return { font: font, size: size, draw: draw, variable: variable, compact: compact };
});
