(function(){
  // Generated pages use the URL language, regardless of saved preferences.
  var contentLang = document.documentElement.getAttribute('data-content-lang');
  var pageLang = document.documentElement.getAttribute('data-page-lang') || contentLang;
  var savedLang;
  try { savedLang = localStorage.getItem('lang'); } catch (e) {}
  var defaultLang = document.documentElement.getAttribute('data-default-lang');
  var lang = pageLang || (savedLang === 'ja' || savedLang === 'en' ? savedLang : defaultLang === 'ja' ? 'ja' : 'en');
  function saveLang(value) { try { localStorage.setItem('lang', value); } catch (e) {} }
  if (pageLang && !contentLang) saveLang(lang);
  document.documentElement.setAttribute('data-lang', lang);
  if (!document.documentElement.hasAttribute('data-learn-entry')) {
    document.documentElement.setAttribute('lang', lang);
  }

  // Shared by the index, sidebar, and related articles. Only published routes have JA versions.
  window.learnHref = function (slug) {
    var path = '/learn/' + (slug ? slug + '/' : '');
    return lang === 'ja' && window.learnRoutes && window.learnRoutes.indexOf(path) !== -1
      ? '/ja' + path : path;
  };

  function updateLearnLinks() {
    if (!window.learnRoutes) return; // The authoring preview has no generated /ja/ files.
    document.querySelectorAll('a[href]').forEach(function (a) {
      if (a.classList.contains('lang-btn')) return;
      var href = a.getAttribute('href');
      if (!/^\/(?:ja\/)?learn\//.test(href)) return;
      var url = new URL(href, location.href);
      var path = url.pathname.replace(/^\/ja\//, '/');
      if (window.learnRoutes.indexOf(path) === -1) return;
      a.setAttribute('href', (lang === 'ja' ? '/ja' : '') + path + url.search + url.hash);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    updateLearnLinks();
    var menu = document.querySelector('.language-menu');
    if (!menu) return;
    var summary = menu.querySelector('summary');
    function updateSelection() {
      menu.querySelector('.language-current').textContent = lang === 'ja' ? '日本語' : 'EN';
      menu.querySelectorAll('[data-language]').forEach(function (option) {
        if (option.getAttribute('data-language') === lang) option.setAttribute('aria-current', 'true');
        else option.removeAttribute('aria-current');
      });
    }
    updateSelection();
    menu.querySelectorAll('[data-language]').forEach(function (option) {
      option.addEventListener('click', function (event) {
        var selected = option.getAttribute('data-language');
        saveLang(selected);
        if (!pageLang || selected === lang) {
          event.preventDefault();
          lang = selected;
          document.documentElement.setAttribute('data-lang', lang);
          document.documentElement.setAttribute('lang', lang);
          updateLearnLinks();
          updateSelection();
          menu.open = false;
          summary.focus();
        }
      });
    });
    document.addEventListener('click', function (event) {
      if (!menu.contains(event.target)) menu.open = false;
    });
    document.addEventListener('focusin', function (event) {
      if (!menu.contains(event.target)) menu.open = false;
    });
    menu.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        menu.open = false;
        summary.focus();
      }
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
    css.rel = 'stylesheet'; css.href = '/assets/css/learn-organize.css?v=information-architecture-20260916';
    document.head.appendChild(css);
    var s = document.createElement('script');
    s.src = '/assets/js/learn-organize.js?v=information-architecture-20260916';
    document.head.appendChild(s);
  })();
})();
