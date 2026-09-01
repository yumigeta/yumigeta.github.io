/* ═══════════════════════════════════════════════════════════════════════════
   site-nav.js — keeps the top menu bar on ONE line at every window width.

   The bar needs 532px to show the seal + five links + Contact side by side
   (34 + 352 + 66 + gaps). Below that it used to wrap onto a second row; now
   the links and Contact collapse into a dropdown opened by a Menu button, so
   the bar stays exactly one 60px line no matter how narrow the window gets.

   The page markup is NOT touched: this injects the panel wrapper and the
   button. Above the breakpoint the wrapper is `display: contents`, so the
   nav's original 3-column grid is completely unchanged.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  var header = document.querySelector('header.site-nav');
  if (!header) return;
  var nav = header.querySelector('.nav');
  if (!nav || nav.querySelector('.nav-toggle')) return;
  var links = nav.querySelector('.links');
  if (!links) return;
  var end = nav.querySelector('.end');

  var panel = document.createElement('div');
  panel.className = 'nav-panel';
  nav.insertBefore(panel, links);
  panel.appendChild(links);
  if (end) panel.appendChild(end);

  /* Icons — Tabler (tabler.io), paths verbatim: menu-2 and x. */
  function ti(d) {
    return '<svg class="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Menu');
  btn.innerHTML = '<span class="nav-toggle-t">Menu</span>' +
                  '<span class="nav-toggle-i">' +
                    ti('M4 6l16 0M4 12l16 0M4 18l16 0') +
                    ti('M18 6l-12 12M6 6l12 12') +
                  '</span>';
  nav.appendChild(btn);

  function setOpen(open) {
    header.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!header.classList.contains('nav-open'));
  });
  panel.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) setOpen(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 559) setOpen(false);
  });
})();
