/* Hover, focus or tap an equation reference to preview the cited equation. */
(function () {
  var tip = document.createElement('div');
  tip.className = 'eq-tip';
  tip.id = 'equation-preview';
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tip);
  var cur = null;
  var hideTimer;
  function cancelHide() { window.clearTimeout(hideTimer); }
  function hideSoon() { cancelHide(); hideTimer = window.setTimeout(hide, 160); }

  function place(ref) {
    var r = ref.getBoundingClientRect();
    var width = document.documentElement.clientWidth, height = document.documentElement.clientHeight;
    tip.style.left = '0px'; tip.style.top = '0px';
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var left = Math.max(8, Math.min(r.left, width - tw - 8));
    var top = r.top - th - 10;
    if (top < 8) top = Math.max(8, Math.min(r.bottom + 10, height - th - 8));
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hide() {
    cancelHide();
    tip.classList.remove('show');
    tip.setAttribute('aria-hidden', 'true');
    if (cur) {
      var ids = (cur.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (id) { return id && id !== tip.id; });
      if (ids.length) cur.setAttribute('aria-describedby', ids.join(' '));
      else cur.removeAttribute('aria-describedby');
    }
    cur = null;
  }
  function show(ref) {
    var keys = (ref.getAttribute('data-eq') || '').trim().split(/\s+/);
    var sources = keys.map(function (key) { return document.getElementById('eq' + key); });
    if (sources.some(function (source) { return !source; })) return;
    hide();
    tip.innerHTML = sources.map(function (source) { return source.innerHTML; }).join('');
    tip.querySelectorAll('.tag, .eq-num').forEach(function (e) { e.remove(); });
    tip.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id'); });
    tip.classList.add('show');
    tip.setAttribute('aria-hidden', 'false');
    cur = ref;
    var described = ref.getAttribute('aria-describedby');
    ref.setAttribute('aria-describedby', described ? described + ' ' + tip.id : tip.id);
    place(ref);
  }
  function reference(e) { return e.target.closest && e.target.closest('.eqref'); }
  function canHover() { return window.matchMedia('(hover: hover)').matches; }

  document.addEventListener('mouseover', function (e) {
    var ref = reference(e);
    if (ref && canHover()) show(ref);
  });
  document.addEventListener('mouseout', function (e) {
    var ref = reference(e);
    if (ref === cur && ref && canHover() && document.activeElement !== ref && !(e.relatedTarget && (ref.contains(e.relatedTarget) || tip.contains(e.relatedTarget)))) hideSoon();
  });
  tip.addEventListener('mouseenter', cancelHide);
  tip.addEventListener('mouseleave', function () {
    if (cur && document.activeElement !== cur) hideSoon();
  });
  document.addEventListener('focusin', function (e) {
    var ref = reference(e);
    if (ref) show(ref);
  });
  document.addEventListener('focusout', function (e) {
    if (reference(e) === cur) hide();
  });
  document.addEventListener('click', function (e) {
    var ref = reference(e);
    if (ref) { show(ref); e.preventDefault(); }
    else if (!tip.contains(e.target)) hide();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });
  window.addEventListener('scroll', function (e) {
    if (e.target === tip || tip.contains(e.target)) return;
    if (!cur) return;
    var r = cur.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= window.innerHeight) hide();
    else place(cur);
  }, true);
  window.addEventListener('resize', hide);
})();
