(function () {
  'use strict';
  var scrim = document.getElementById('deriv-scrim');
  var panels = [
    { open: 'open-crystal',    panel: 'crystal-panel', close: 'crystal-close' },
    { open: 'open-derivation', panel: 'deriv-panel',   close: 'deriv-close' }
  ];

  var active = null;

  function closeActive() {
    if (!active) return;
    active.classList.remove('open');
    scrim.classList.remove('open');
    active = null;
  }

  panels.forEach(function (cfg) {
    var openBtn  = document.getElementById(cfg.open);
    var panel    = document.getElementById(cfg.panel);
    var closeBtn = document.getElementById(cfg.close);
    if (!openBtn || !panel) return;

    openBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closeActive();
      active = panel;
      panel.classList.add('open');
      scrim.classList.add('open');
      panel.scrollTop = 0;
    });
    if (closeBtn) closeBtn.addEventListener('click', closeActive);
  });

  if (scrim) scrim.addEventListener('click', closeActive);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeActive();
  });
})();
