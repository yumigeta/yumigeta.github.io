(function () {
  'use strict';
  var overlay = document.getElementById('deriv-overlay');
  var openBtn = document.getElementById('open-derivation');
  var closeBtn = document.getElementById('deriv-close');
  if (!overlay || !openBtn) return;

  function open(e) {
    e.preventDefault();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
})();
