// Google Analytics 4 — loaded on every page.
// Measurement ID lives only here, so it can be updated in one place.
(function () {
  var ID = 'G-M2QYR8CJXE';
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', ID);
})();
