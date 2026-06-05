(function () {
  'use strict';
  var panel = document.getElementById('deriv-panel');
  var scrim = document.getElementById('deriv-scrim');
  var openBtn = document.getElementById('open-derivation');
  var closeBtn = document.getElementById('deriv-close');
  if (!panel || !openBtn) return;

  function open(e) {
    e.preventDefault();
    panel.classList.add('open');
    scrim.classList.add('open');
  }
  function close() {
    panel.classList.remove('open');
    scrim.classList.remove('open');
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) close();
  });
})();
