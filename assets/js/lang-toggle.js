(function(){
  var lang = localStorage.getItem('lang') || 'en';
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.setAttribute('lang', lang);

  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.querySelector('.lang-btn');
    if(!btn) return;
    // The button shows a static "EN / 日本語" segmented label; CSS highlights
    // the active language from the <html data-lang> attribute.
    btn.addEventListener('click', function(){
      lang = lang === 'en' ? 'ja' : 'en';
      document.documentElement.setAttribute('data-lang', lang);
      document.documentElement.setAttribute('lang', lang);
      localStorage.setItem('lang', lang);
    });
  });

  // ── Dev-only proofreading ("校正") tools ──────────────────────────────
  // Auto-load the in-browser review layer on UNPUBLISHED Learn pages only:
  // gated to pages that carry <meta name="robots" content="noindex,...">, so
  // it never ships on published pages. New dev pages get it for free.
  (function(){
    var noindex = document.querySelector('meta[name="robots"][content*="noindex"]');
    if(!noindex) return;
    if(!/^\/learn\/[^/]+\//.test(location.pathname)) return; // /learn/ topic pages only (proofread.js skips the dev index)
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/assets/css/proofread.css';
    document.head.appendChild(css);
    var s = document.createElement('script');
    s.src = '/assets/js/proofread.js';
    document.head.appendChild(s);
  })();

  // ── Dev-only "Organize" shelf editor (LOCALHOST ONLY) ─────────────────
  // Lets the author flip a page's published state and drag pages between
  // categories straight from the left panel. NEVER ships to production:
  // gated to localhost, so the live site never loads it.
  (function(){
    if(!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
    if(location.pathname.indexOf('/learn/') !== 0) return;   // Learn pages only
    if(!document.querySelector('meta[name="robots"][content*="noindex"]')) return; // DEV surfaces only — never the public /learn/ landing or published pages
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/assets/css/learn-organize.css';
    document.head.appendChild(css);
    var s = document.createElement('script');
    s.src = '/assets/js/learn-organize.js';
    document.head.appendChild(s);
  })();
})();
