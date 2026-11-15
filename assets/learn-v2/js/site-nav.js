/* Shared responsive navigation. Contact follows the collapsed menu; language stays in the top bar. */
(function () {
  var header = document.querySelector('header.site-nav');
  if (!header) return;
  var nav = header.querySelector('.nav');
  if (!nav || nav.hasAttribute('data-nav-active')) return;
  nav.setAttribute('data-nav-active', '');
  var localizeKhdNav = document.documentElement.hasAttribute('data-content-lang') || (document.body && document.body.getAttribute('data-learn-slug') === 'raman-khd');
  // Bilingual authoring pages share the generated pages' header design.
  if (/^\/(?:ja\/)?learn(?:\/|$)/.test(location.pathname) && !nav.querySelector('.language-menu')) {
    var contact = nav.querySelector('.end');
    if (contact) {
      var actions = document.createElement('div');
      actions.className = 'nav-actions';
      contact.before(actions);
      actions.appendChild(contact);
      actions.insertAdjacentHTML('beforeend', document.documentElement.hasAttribute('data-content-lang')
        ? '<span class="language-current">日本語</span>'
        : '<details class="language-menu">' +
        '<summary aria-label="Language / 言語"><span class="language-current">' +
        (document.documentElement.getAttribute('data-lang') === 'ja' ? '日本語' : 'EN') +
        '</span></summary><div class="language-options">' +
        '<button type="button" class="lang-option" data-language="en" lang="en">English</button>' +
        '<button type="button" class="lang-option" data-language="ja" lang="ja">日本語</button>' +
        '</div></details>');
      nav.classList.add('has-language');
      document.querySelectorAll('.phead-top .lang-btn').forEach(function (button) { button.remove(); });
    }
  }
  var links = nav.querySelector('.links');
  if (!links) return;
  var end = nav.querySelector('.end');
  if (end) end.innerHTML = /^(en|ja)$/.test(document.documentElement.getAttribute('data-lang') || '')
    ? '<span class="i18n-en">Contact</span><span class="i18n-ja">連絡先</span>'
    : (/^ja(?:-|$)/i.test(document.documentElement.getAttribute('lang') || '') ? '連絡先' : 'Contact');

  var panel = nav.querySelector('.nav-panel');
  if (!panel) {
  panel = document.createElement('div');
  panel.className = 'nav-panel';
  nav.insertBefore(panel, links);
  panel.appendChild(links);
  if (end && !nav.querySelector('.nav-actions')) panel.appendChild(end);
  }

  var contactHome = end && end.parentNode;
  var contactNext = end && end.nextSibling;
  function isCollapsed() {
    return window.innerWidth <= (nav.classList.contains('has-language') ? 759 : 559);
  }
  function syncContactPlacement() {
    if (!end || !contactHome) return;
    if (isCollapsed()) {
      if (end.parentNode !== links || end !== links.lastElementChild) links.appendChild(end);
    } else if (contactNext && contactNext.parentNode === contactHome) {
      if (end.parentNode !== contactHome || end.nextSibling !== contactNext) contactHome.insertBefore(end, contactNext);
    } else if (end.parentNode !== contactHome || end.nextSibling) {
      contactHome.appendChild(end);
    }
  }

  /* Icons — Tabler (tabler.io), paths verbatim: menu-2 and x. */
  function ti(d) {
    return '<svg class="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  }

  var btn = nav.querySelector('.nav-toggle');
  if (!btn) {
  btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', localizeKhdNav ? 'Menu / メニュー' : 'Menu');
  btn.innerHTML = (localizeKhdNav
    ? '<span class="nav-toggle-t"><span class="i18n-en">Menu</span><span class="i18n-ja">メニュー</span></span>'
    : '<span class="nav-toggle-t">Menu</span>') +
                  '<span class="nav-toggle-i">' +
                    ti('M4 6l16 0M4 12l16 0M4 18l16 0') +
                    ti('M18 6l-12 12M6 6l12 12') +
                  '</span>';
  nav.appendChild(btn);
  }

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
  syncContactPlacement();
  window.addEventListener('resize', function () {
    syncContactPlacement();
    if (!isCollapsed()) setOpen(false);
  });
})();
