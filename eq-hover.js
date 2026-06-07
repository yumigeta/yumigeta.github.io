/* Hover (or tap) an equation reference to preview the cited equation. */
(function () {
  var tip = document.createElement('div');
  tip.className = 'eq-tip';
  document.body.appendChild(tip);
  var cur = null;

  function place(ref) {
    var r = ref.getBoundingClientRect();
    tip.style.left = '0px'; tip.style.top = '0px';
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - tw - 8);
    var top = r.top - th - 10;
    if (top < 8) top = r.bottom + 10;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function show(ref) {
    var src = document.getElementById('eq' + ref.getAttribute('data-eq'));
    if (!src) return;
    tip.innerHTML = src.innerHTML;
    // drop the equation-number tag — it would overlap the formula in the narrow tip
    tip.querySelectorAll('.tag').forEach(function (e) { e.remove(); });
    tip.classList.add('show');
    place(ref);
    cur = ref;
  }
  function hide() { tip.classList.remove('show'); cur = null; }

  document.addEventListener('mouseover', function (e) {
    var ref = e.target.closest && e.target.closest('.eqref');
    if (ref) show(ref);
  });
  document.addEventListener('mouseout', function (e) {
    var ref = e.target.closest && e.target.closest('.eqref');
    if (ref) hide();
  });
  document.addEventListener('click', function (e) {
    var ref = e.target.closest && e.target.closest('.eqref');
    if (ref) { (cur === ref) ? hide() : show(ref); e.preventDefault(); }
    else hide();
  });
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
})();
