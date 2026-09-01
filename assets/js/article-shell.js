/* ════════════════════════════════════════════════════════════════════════
   article-shell.js — turns an existing Learn page into the 3-column
   "knowledge-map" layout WITHOUT touching its body markup.
   ------------------------------------------------------------------------
   Include once, near the end of <body>, BEFORE the page's own script:
       <script src="/assets/js/article-shell.js"></script>
   and load /assets/css/article-shell.css in <head>.
   The slug is taken from <body data-learn-slug="..."> or the URL.
   All sidebar content is driven by /learn/pages.json (single source).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.__articleShell) return;
  window.__articleShell = 1;

  var body = document.body;

  // ── Resolve the current slug ──────────────────────────────────────────
  var path = location.pathname.replace(/index\.html?$/i, '').replace(/\/+$/, '');
  var m = path.match(/\/learn\/(.+)$/);
  var SLUG = body.getAttribute('data-learn-slug') || (m && m[1]) || '';
  if (!SLUG) return;

  var header = document.querySelector('header.site-nav');
  var footer = document.querySelector('footer.site-footer');
  if (!header || !footer) return;

  // "Preview published" switch (localhost only, set by learn-organize.js): render
  // the shelf/cross-links as the public site would — published pages only, no
  // dev/planned rows. On production this is always false → normal behavior.
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var PREVIEW_PUB = IS_LOCAL && localStorage.getItem('learn-view') === 'published';
  var IS_DEV = !!document.querySelector('meta[name="robots"][content*="noindex"]') && !PREVIEW_PUB;

  // ── 1. Wrap content into the grid synchronously (so the center column has
  //       its final width before the page's own canvas-sizing JS runs) ─────
  var layout = ce('div', 'article-layout');
  var left   = ce('aside', 'rail-left');
  var center = ce('div', 'rail-center');
  var right  = ce('aside', 'rail-right');

  var node = header.nextSibling, moving = [];
  while (node && node !== footer) { moving.push(node); node = node.nextSibling; }
  moving.forEach(function (n) { center.appendChild(n); });

  layout.appendChild(left);
  layout.appendChild(center);
  layout.appendChild(right);
  header.parentNode.insertBefore(layout, footer);

  // ── 2. Populate the rails from pages.json (async) ─────────────────────
  fetch('/learn/pages.json')
    .then(function (r) { return r.json(); })
    .then(function (data) { render(data); })
    .catch(function () { layout.classList.add('shell-bare'); });

  // ── helpers ───────────────────────────────────────────────────────────
  function ce(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function L(en, ja) { return '<span class="i18n-en">' + (en || '') + '</span><span class="i18n-ja">' + (ja || '') + '</span>'; }
  function pretty(s) { return String(s).replace(/-/g, ' '); }
  // shelf <details>: open on desktop, collapsed (stowed) on narrow
  function syncShelfDrawer(det) {
    if (!det) return;
    var mq = window.matchMedia('(min-width: 1240px)');
    var sync = function () { det.open = mq.matches; };
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else if (mq.addListener) mq.addListener(sync);
  }

  function render(data) {
    var PAGES = data.pages || [];
    var CATS  = data.categories || [];
    var MAP = {}, CATMAP = {};
    PAGES.forEach(function (p) { MAP[p.slug] = p; });
    CATS.forEach(function (c) { CATMAP[c.id] = c; });

    var page = MAP[SLUG];
    if (page && page.color) layout.setAttribute('data-color', page.color);

    /* ---- LEFT RAIL: routes (compact top) + content pillars (2-level
            accordion). Grouping is declared in pages.json categories[].groups,
            so it can be re-arranged by data edits without touching templates. ---- */
    function inCat(catId) {
      return PAGES.filter(function (p) { return p.category === catId && (IS_DEV || p.published); });
    }
    function leafLI(p) {
      var lab = L(p.nav_en || p.title_en, p.nav_ja || p.title_ja);
      if (p.planned) {
        return '<li><span class="ashelf-soon">' + lab +
          '<span class="wip wip-soon">' + L('soon', '準備中') + '</span></span></li>';
      }
      var cur = p.slug === SLUG ? ' is-current' : '';
      var wip = (IS_DEV && !p.published) ? '<span class="wip">dev</span>' : '';
      return '<li><a class="' + cur.trim() + '" href="/learn/' + p.slug + '/">' + lab + wip + '</a></li>';
    }
    // recursive sub-folder render: a group may carry its own groups[] (sub-sub-folders, any depth);
    // a group opens iff the current page lives somewhere inside it.
  /* ── Icons — Tabler (tabler.io), used verbatim ──────────────────────────
     Tabler's spec is a 24×24 grid, stroke-width 2, round caps and joins, no
     fill. Keeping all of that intact is the point: the paths below are the
     upstream ones unchanged, so every mark on the site is drawn to one system
     instead of being improvised per place. Size is set in CSS; the 2-unit
     stroke then renders at ~1.25–1.5px, which sits right against the type.
     (The same map is in learn-index.js, which builds this shelf for the Learn
     index pages.) */
  var TI = {
    'arrow-narrow-left': 'M5 12l14 0M5 12l4 4M5 12l4 -4',
    'chevron-down':      'M6 9l6 6l6 -6',
    'chevron-right':     'M9 6l6 6l-6 6',
    'atom':              'M12 12v.01M19.071 4.929c-1.562 -1.562 -6 .337 -9.9 4.243c-3.905 3.905 -5.804 8.337 -4.242 9.9c1.562 1.561 6 -.338 9.9 -4.244c3.905 -3.905 5.804 -8.337 4.242 -9.9M4.929 4.929c-1.562 1.562 .337 6 4.243 9.9c3.905 3.905 8.337 5.804 9.9 4.242c1.561 -1.562 -.338 -6 -4.244 -9.9c-3.905 -3.905 -8.337 -5.804 -9.9 -4.242',
    'stack-2':           'M12 4l-8 4l8 4l8 -4l-8 -4M4 12l8 4l8 -4M4 16l8 4l8 -4',
    'flask-2':           'M6.1 15h11.8M14 3v7.342a6 6 0 0 1 1.318 10.658h-6.635a6 6 0 0 1 1.317 -10.66v-7.34h4M9 3h6',
    'route':             'M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5',
    'archive':           'M3 6a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-10M10 12l4 0'
  };
  var CAT_ICON = { routes: 'route', concepts: 'atom', themes: 'stack-2', handbook: 'flask-2', scratch: 'archive' };
  function icon(name, cls) {
    if (!TI[name]) return '';
    return '<svg class="ti ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="' + TI[name] + '"/></svg>';
  }

    function grpHTML(g, placed) {
      var inner = '', curInside = false;
      (g.groups || []).forEach(function (cg) { var r = grpHTML(cg, placed); inner += r.html; if (r.cur) curInside = true; });
      var gp = (g.pages || []).map(function (s) { return MAP[s]; })
        .filter(function (p) { return p && (IS_DEV || p.published); });
      gp.forEach(function (p) { placed[p.slug] = 1; });
      var curHere = gp.some(function (p) { return p.slug === SLUG; });
      if (gp.length) inner += '<ul class="ashelf-list">' + gp.map(leafLI).join('') + '</ul>';
      if (!inner) return { html: '', cur: false };
      var open = curHere || curInside;
      return {
        html: '<details class="ashelf-grp"' + (open ? ' open' : '') + '><summary class="ashelf-grp-hd">' +
          L(g.name_en, g.name_ja) + '' + icon("chevron-right", "ashelf-caret") + '</summary>' + inner + '</details>',
        cur: open
      };
    }

    var shelf = '<a class="ashelf-home" href="/learn/">' + icon("arrow-narrow-left", "ashelf-home-mark") + L('All of Learn', '基礎から学ぶ 一覧') + '</a>';

    // routes — small, always visible, never collapses
    var routesCat = CATMAP['routes'];
    if (routesCat) {
      var rp = inCat('routes');
      if (rp.length) {
        shelf += '<nav class="ashelf-routes" data-cat="routes">' +
          '<div class="ashelf-routes-hd">' + icon(CAT_ICON.routes, "ashelf-cat-ic") + L(routesCat.name_en, routesCat.name_ja) + '</div>' +
          '<ul class="ashelf-list">' + rp.map(leafLI).join('') + '</ul></nav>';
      }
    }

    // content pillars — each a collapsible <details>; sub-grouped from groups[]
    CATS.forEach(function (cat) {
      if (cat.id === 'routes') return;
      var cp = inCat(cat.id);
      if (!cp.length) return;
      var inner = '', placed = {};
      (cat.groups || []).forEach(function (g) { inner += grpHTML(g, placed).html; });
      var ungrouped = cp.filter(function (p) { return !placed[p.slug]; });
      if (ungrouped.length) inner += '<ul class="ashelf-list ashelf-ungrouped">' + ungrouped.map(leafLI).join('') + '</ul>';
      shelf += '<details class="ashelf-pillar" data-cat="' + cat.id + '" open>' +
        '<summary class="ashelf-pillar-hd">' + icon(CAT_ICON[cat.id] || "stack-2", "ashelf-cat-ic") + L(cat.name_en, cat.name_ja) +
        '' + icon("chevron-right", "ashelf-caret") + '</summary>' + inner + '</details>';
    });

    left.innerHTML = '<details class="ashelf-collapse" open><summary class="ashelf-toggle">' +
      L('Browse all topics', 'トピック一覧') +
      '' + icon("chevron-down", "ashelf-arrow") + '</summary>' +
      shelf + '</details>';
    syncShelfDrawer(left.querySelector('.ashelf-collapse'));

    if (!page) { layout.classList.add('shell-bare'); return; }

    /* ---- helpers that resolve slug cross-references to links ---- */
    function pageLI(slug) {
      var p = MAP[slug];
      if (!p) return '';
      if (!IS_DEV && !p.published) return '';
      var lab = L(p.nav_en || p.title_en, p.nav_ja || p.title_ja);
      if (p.planned) return '<li><span class="nb-soon">' + lab +
        '<span class="wip wip-soon">' + L('soon', '準備中') + '</span></span></li>';
      return '<li><a href="/learn/' + p.slug + '/">' + lab + '</a></li>';
    }
    function linkList(slugs) {
      var items = (slugs || []).map(pageLI).filter(Boolean).join('');
      return items ? '<ul class="nb-links">' + items + '</ul>' : '';
    }
    function block(hd, bodyHTML, cls) {
      if (!bodyHTML) return '';
      return '<div class="nbblock ' + (cls || '') + '">' +
        (hd ? '<div class="nbblock-hd">' + hd + '</div>' : '') + bodyHTML + '</div>';
    }

    /* ---- TOC built from the section headings now living in .center ---- */
    var TOC = buildTOC();
    function buildTOC() {
      var heads = center.querySelectorAll('.demo-head h2, .route-hd h2'), perHeading = false;
      if (heads.length < 2) heads = center.querySelectorAll('.demo h2, section h2, .route h2');
      if (heads.length < 2) { heads = center.querySelectorAll('.me-prose h3, .demo h3, section h3'); perHeading = true; }  // single-section page → use its h3 steps
      if (heads.length < 2) return '';
      var items = '', i = 0;
      Array.prototype.forEach.call(heads, function (h) {
        // anchor on the section for h2 TOCs; on the heading itself when many h3 share one section
        var target = perHeading ? h : (h.closest ? (h.closest('.demo, .route, section') || h) : h);
        if (!target.id) { i++; target.id = 'sec-' + i; }
        target.classList && target.classList.add('shell-anchor');
        items += '<li><a href="#' + target.id + '">' + h.innerHTML + '</a></li>';
      });
      return block(L('On this page', 'ページ内目次'), '<ol class="nb-toc">' + items + '</ol>', 'nb-toc-wrap');
    }

    /* ---- navboard blocks ---- */
    function blkPos() {
      var cat = CATMAP[page.category];
      var meta = '';
      if (page.theme && page.theme.length) meta += '<dt>' + L('Theme', 'テーマ') + '</dt><dd>' + page.theme.slice(0, 3).map(pretty).join(' · ') + '</dd>';
      if (page.level_en) meta += '<dt>' + L('Level', '難易度') + '</dt><dd>' + L(page.level_en, page.level_ja) + '</dd>';
      if (page.readingTime_en) meta += '<dt>' + L('Time', '読む時間') + '</dt><dd>' + L(page.readingTime_en, page.readingTime_ja) + '</dd>';
      var summ = (page.summary_en || page.summary_ja) ? '<p class="nb-summary">' + L(page.summary_en, page.summary_ja) + '</p>' : '';
      var card = '<div class="nb-pos">' +
        (cat ? '<div class="nb-cat">' + L(cat.name_en, cat.name_ja) + '</div>' : '') +
        (meta ? '<dl class="nb-meta">' + meta + '</dl>' : '') + summ + '</div>';
      return block(L('Where this page sits', 'このページの位置づけ'), card);
    }
    function blkPrereq() {
      return block(L('Helpful background', '先に知っていると読みやすい'), linkList(page.prerequisites));
    }
    function blkBasics() {
      if (!page.basicsUsed || !page.basicsUsed.length) return '';
      var items = page.basicsUsed.map(function (b) {
        var lab = L(b.label_en, b.label_ja);
        return b.href ? '<li><a href="' + b.href + '">' + lab + '</a></li>' : '<li><span class="nb-item">' + lab + '</span></li>';
      }).join('');
      return block(L('Concepts used here', 'このページで使う基礎・概念'), '<ul class="nb-links">' + items + '</ul>');
    }
    function blkRef() {
      return block(L('Experiment &amp; analysis', '実験・解析リファレンス'), linkList(page.referenceLinks));
    }
    function blkUsedBy() {
      var l = linkList(page.usedBy);
      if (!l) return '';
      var lab = page.layoutType === 'handbook'
        ? L('Where this is used', 'この知識を使うページ')
        : L('Pages that build on this', 'この基礎を使うページ');
      return block(lab, l);
    }
    function blkNext() {
      var groups = [['theory', 'Go deeper', '理論を深める'], ['application', 'Apply it', '材料・応用へ'],
                    ['experiment', 'Use it in the lab', '実験に使う'], ['frontier', 'Frontier', '発展']];
      var html = '';
      groups.forEach(function (g) {
        var items = ((page.nextLinks && page.nextLinks[g[0]]) || []).map(pageLI).filter(Boolean).join('');
        if (items) html += '<div class="nb-next-grp"><div class="nb-next-lab">' + L(g[1], g[2]) + '</div><ul class="nb-links">' + items + '</ul></div>';
      });
      return block(L('Read next', '次に読む'), html);
    }
    function blkTags() {
      if (!page.tags || !page.tags.length) return '';
      var items = page.tags.slice(0, 6).map(function (t) { return '<span>' + t + '</span>'; }).join('');
      return block(L('Tags', 'タグ'), '<div class="nb-tags">' + items + '</div>');
    }
    function blkRelatedRoutes() {
      var items = PAGES.filter(function (q) { return q.category === 'routes' && q.slug !== SLUG; })
        .map(function (q) { return pageLI(q.slug); }).filter(Boolean).join('');
      return block(L('Other routes', '他のルート'), items ? '<ul class="nb-links">' + items + '</ul>' : '');
    }

    var BUILD = { prereq: blkPrereq, toc: function () { return TOC; }, basics: blkBasics,
                  ref: blkRef, usedBy: blkUsedBy, next: blkNext, tags: blkTags, relatedRoutes: blkRelatedRoutes };
    // The right rail is deliberately minimal & recessive: prerequisites (前提) +
    // this-page TOC (目次) + read-next (次に読む) only. basics/ref/usedBy/tags stay
    // in the data and on the all-index, off the reading surface.
    var order = ['prereq', 'toc', 'next'];
    right.innerHTML = order.map(function (k) { return BUILD[k] ? BUILD[k]() : ''; }).join('');
    // Lift the page's "central question" (the .pintro carrying .cq-label — only the four
    // electronic-structure series pages have one) into the TOP of the right rail as a lead
    // callout ON DESKTOP. On narrow screens the right rail is hidden, so it stays in its
    // original lead position in the body (it must never just vanish). Moving the node keeps
    // its i18n-en/ja spans intact; an anchor comment marks the home spot for the narrow case.
    var cqLabel = center.querySelector('.pintro .cq-label');
    var cqEl = cqLabel && cqLabel.closest ? cqLabel.closest('.pintro') : null;
    if (cqEl) {
      var cqWrap = ce('div', 'nbblock nb-cq'), cqAnchor = document.createComment('cq');
      cqEl.parentNode.insertBefore(cqAnchor, cqEl);
      var mqRail = window.matchMedia('(min-width: 1024px)');   // the width at which .rail-right is shown
      var placeCQ = function () {
        if (mqRail.matches) { cqWrap.appendChild(cqEl); if (cqWrap.parentNode !== right) right.insertBefore(cqWrap, right.firstChild); }
        else { if (cqAnchor.parentNode) cqAnchor.parentNode.insertBefore(cqEl, cqAnchor.nextSibling); if (cqWrap.parentNode) cqWrap.parentNode.removeChild(cqWrap); }
      };
      placeCQ();
      if (mqRail.addEventListener) mqRail.addEventListener('change', placeCQ); else if (mqRail.addListener) mqRail.addListener(placeCQ);
    }
    if (!right.innerHTML.trim()) layout.classList.add('no-right');   // short page → no empty frame

    /* ---- center-column auto components ---- */
    appendNextCard();
    buildMobileTOC();
    tocActive();

    function appendNextCard() {
      if (page.layoutType === 'route') return;
      var groups = [['theory', 'Go deeper', '理論を深める'], ['application', 'Apply it', '材料・応用へ'],
                    ['experiment', 'Use it in the lab', '実験に使う'], ['frontier', 'Frontier', '発展']];
      var cards = '';
      groups.forEach(function (g) {
        ((page.nextLinks && page.nextLinks[g[0]]) || []).forEach(function (slug) {
          var q = MAP[slug]; if (!q || (!IS_DEV && !q.published)) return;
          cards += '<a class="nc-item" href="/learn/' + q.slug + '/"><div class="nc-kind">' + L(g[1], g[2]) +
            '</div><div class="nc-title">' + L(q.nav_en || q.title_en, q.nav_ja || q.title_ja) + '</div></a>';
        });
      });
      if (!cards) return;
      var sec = ce('div', 'nextcard');
      sec.innerHTML = '<div class="nc-lab">' + L('Read next', '次に読む') + '</div><div class="nextcard-grid">' + cards + '</div>';
      center.appendChild(sec);
    }

    /* ---- narrow screens: the right rail is hidden (CSS); drop ONE collapsed
            TOC at the top of the content so the reader can still jump around ---- */
    function buildMobileTOC() {
      var heads = center.querySelectorAll('.demo-head h2, .route-hd h2');
      if (heads.length < 2) heads = center.querySelectorAll('.demo h2, section h2, .route h2');
      if (heads.length < 2) return;
      var items = '';
      Array.prototype.forEach.call(heads, function (h) {
        var sec = h.closest ? (h.closest('.demo, .route, section') || h) : h;
        if (sec.id) items += '<li><a href="#' + sec.id + '">' + h.innerHTML + '</a></li>';
      });
      if (!items) return;
      var det = ce('details', 'mobile-toc');   // no `open` → starts collapsed
      det.innerHTML = '<summary class="mobile-toc-hd">' + L('On this page', 'ページ内目次') +
        '' + icon("chevron-right", "ashelf-caret") + '</summary>' +
        '<ol class="mobile-toc-list">' + items + '</ol>';
      var phead = center.querySelector('.phead');
      if (phead && phead.parentNode) phead.parentNode.insertBefore(det, phead.nextSibling);
    }

    /* ---- highlight the current section in the TOC while scrolling ---- */
    function tocActive() {
      var links = right.querySelectorAll('.nb-toc a');
      if (!links.length || !('IntersectionObserver' in window)) return;
      var byId = {};
      Array.prototype.forEach.call(links, function (a) { byId[a.getAttribute('href').slice(1)] = a; });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var a = byId[e.target.id]; if (!a) return;
          Array.prototype.forEach.call(links, function (x) { x.classList.remove('is-active'); });
          a.classList.add('is-active');
        });
      }, { rootMargin: '-18% 0px -72% 0px' });
      Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    }
  }
})();
