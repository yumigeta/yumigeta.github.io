  function learnURL(slug) {
    return window.learnHref ? window.learnHref(slug) : '/learn/' + (slug ? slug + '/' : '');
  }
/* ════════════════════════════════════════════════════════════════════════
   article-shell.js — turns an existing Learn page into the 3-column
   "knowledge-map" layout WITHOUT touching its body markup.
   ------------------------------------------------------------------------
   Include once, near the end of <body>, BEFORE the page's own script:
       <script src="/assets/learn-v2/js/article-shell.js"></script>
   and load /assets/learn-v2/css/article-shell.css in <head>.
   The slug is taken from <body data-learn-slug="..."> or the URL.
   All sidebar content is driven by /learn/pages.json (single source).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.__articleShell) return;
  window.__articleShell = 1;

  var body = document.body;
  // Published HTML already contains the shell. Only attach interactions.
  if (document.documentElement.getAttribute('data-static-shell') === 'article') {
    syncShelfDrawer(document.querySelector('.ashelf-collapse'));
    activateTOC(document.querySelector('.rail-right'));
    return;
  }

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
  var IS_AUTHORING = IS_LOCAL && !document.documentElement.hasAttribute('data-page-lang');
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
  fetch('/learn/pages.json?v=direct-learning-relations-20260916-r2')
    .then(function (r) { return r.json(); })
    .then(function (data) { render(data); })
    .catch(function () { layout.classList.add('shell-bare'); });

  // ── helpers ───────────────────────────────────────────────────────────
  function ce(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function L(en, ja) { return '<span class="i18n-en">' + (en || '') + '</span><span class="i18n-ja">' + (ja || '') + '</span>'; }
  function pretty(s) { return String(s).replace(/-/g, ' '); }
  // shelf <details>: open on desktop, collapsed (stowed) on narrow
  function syncShelfDrawer(det) {
    if (!det || det.__shelfDrawerReady) return;
    var summary = det.querySelector('.ashelf-toggle');
    if (!summary) return;
    det.__shelfDrawerReady = true;
    var content = det.querySelector('.ashelf-drawer');
    if (!content) {
      content = document.createElement('div');
      content.className = 'ashelf-drawer';
      while (summary.nextSibling) content.appendChild(summary.nextSibling);
      det.appendChild(content);
    }
    if (!summary.querySelector('.ashelf-action')) {
      var action = document.createElement('span');
      action.className = 'ashelf-action';
      action.innerHTML = '<span class="ashelf-open-label"><span class="i18n-en">Open</span><span class="i18n-ja">開く</span></span>' +
        '<span class="ashelf-close-label"><span class="i18n-en">Close</span><span class="i18n-ja">閉じる</span></span>';
      var caret = summary.querySelector('.ashelf-caret');
      summary.insertBefore(action, caret && caret.parentNode === summary ? caret : null);
    }
    var mq = window.matchMedia('(min-width: 1240px)');
    var sync = function () { det.open = mq.matches; };
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else if (mq.addListener) mq.addListener(sync);
    document.addEventListener('click', function (event) {
      if (!document.documentElement.contains(det)) return;
      if (!mq.matches && det.open && !det.contains(event.target)) det.open = false;
    });
    document.addEventListener('keydown', function (event) {
      if (!document.documentElement.contains(det)) return;
      if (!mq.matches && det.open && (event.key === 'Escape' || event.keyCode === 27)) {
        det.open = false;
        summary.focus();
      }
    });
  }

  function render(data) {
    var PAGES = data.pages || [];
    var RELATIONS = data.learning_relations || {};
    var ORDER = data.learning_order || [];
    var COLLECTIONS = data.collections || [];
    var MAP = {}, CATMAP = {}, COLLECTIONMAP = {};
    PAGES.forEach(function (p) { MAP[p.slug] = p; });
    var page = MAP[SLUG];
    // Every article shares the current knowledge hierarchy. Legacy metadata
    // remains available only for existing page context and auxiliary navigation.
    var CATS = data.category_architectures || [];
    (data.categories || []).concat(CATS).forEach(function (c) { CATMAP[c.id] = c; });
    COLLECTIONS.forEach(function (c) { COLLECTIONMAP[c.id] = c; });

    if (page && page.color) layout.setAttribute('data-color', page.color);

    /* ---- LEFT RAIL: routes (compact top) + content pillars (2-level
            accordion). Grouping is declared in pages.json category_architectures[].groups,
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
      var wip = (IS_DEV && !p.published) ? '<span class="wip">' + L('dev', '未公開') + '</span>' : '';
      return '<li><a class="' + cur.trim() + '" href="' + learnURL(p.slug) + '">' + lab + wip + '</a></li>';
    }
    function topicVisible(topic) {
      if (IS_DEV) return true;
      var mapped = topic.page && MAP[topic.page];
      return topic.status === 'existing' && mapped && mapped.published;
    }
    function topicLI(topic) {
      var lab = L(topic.name_en, topic.name_ja);
      var mapped = topic.page && MAP[topic.page];
      if (topic.status !== 'existing' || !mapped) {
        return '<li><span class="ashelf-soon">' + lab +
          '<span class="wip wip-soon">' + L('soon', '準備中') + '</span></span></li>';
      }
      var cur = mapped.slug === SLUG ? ' is-current' : '';
      var wip = (IS_DEV && !mapped.published) ? '<span class="wip">' + L('dev', '未公開') + '</span>' : '';
      return '<li><a class="' + cur.trim() + '" href="' + learnURL(mapped.slug) + '">' + lab + wip + '</a></li>';
    }
    // recursive sub-folder render: a group may carry its own groups[] (sub-sub-folders, any depth);
    // Topic groups start expanded; the outer drawer handles narrow screens.
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
      var inner = '', curInside = false, deferred = [], leafRun = [];
      function flushLeaves() {
        if (!leafRun.length) return;
        inner += '<ul class="ashelf-list">' + leafRun.join('') + '</ul>';
        leafRun = [];
      }
      var topics = (g.topics || []).filter(topicVisible);
      if (topics.length) {
        inner += '<ul class="ashelf-list">' + topics.map(topicLI).join('') + '</ul>';
        topics.forEach(function (topic) { if (topic.page) placed[topic.page] = 1; });
        if (topics.some(function (topic) { return topic.page === SLUG; })) curInside = true;
      }
      (g.groups || []).forEach(function (cg) {
        if (cg.after) deferred.push(cg);
        else {
          var r = grpHTML(cg, placed);
          inner += r.html;
          if (r.cur) curInside = true;
        }
      });
      var gp = (g.pages || []).map(function (s) { return MAP[s]; })
        .filter(function (p) { return p && (IS_DEV || p.published); });
      gp.forEach(function (p) { placed[p.slug] = 1; });
      var curHere = gp.some(function (p) { return p.slug === SLUG; });
      gp.forEach(function (p) {
        leafRun.push(leafLI(p));
        deferred.filter(function (cg) { return cg.after === p.slug; }).forEach(function (cg) {
          var r;
          flushLeaves();
          r = grpHTML(cg, placed);
          inner += r.html;
          if (r.cur) curInside = true;
        });
      });
      flushLeaves();
      deferred.filter(function (cg) {
        return !gp.some(function (p) { return p.slug === cg.after; });
      }).forEach(function (cg) {
        var r = grpHTML(cg, placed);
        inner += r.html;
        if (r.cur) curInside = true;
      });
      if (!inner && !IS_DEV) return { html: '', cur: false };
      if (!inner) inner = '<div class="ashelf-empty">' + L('No pages yet', 'ページ準備中') + '</div>';
      var open = curHere || curInside;
      return {
        html: '<details class="ashelf-grp' + (g.after ? ' ashelf-grp--inline' : '') + '" data-group="' + (g.id || '') + '" open><summary class="ashelf-grp-hd">' +
          L(g.name_en, g.name_ja) + '' + icon("chevron-right", "ashelf-caret") + '</summary>' + inner + '</details>',
        cur: open
      };
    }

    var shelf = '<a class="ashelf-home" href="' + learnURL('') + '">' + icon("arrow-narrow-left", "ashelf-home-mark") + L('All of Learn', '基礎から学ぶ 一覧') + '</a>';

    // Routes remain a compact navigation category. They do not define reading order.
    var routesCat = CATMAP.routes;
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
      // Routes and auxiliary collections keep their dedicated legacy UI above/below.
      // Their category records remain in pages.json for compatibility, but must not
      // be rendered a second time as knowledge pillars.
      if (cat.id === 'routes' || COLLECTIONMAP[cat.id]) return;
      var cp = inCat(cat.id);
      var inner = '', placed = {};
      (cat.groups || []).forEach(function (g) { inner += grpHTML(g, placed).html; });
      var ungrouped = cp.filter(function (p) { return !placed[p.slug]; });
      if (ungrouped.length) inner += '<ul class="ashelf-list ashelf-ungrouped">' + ungrouped.map(leafLI).join('') + '</ul>';
      if (!inner) return;
      shelf += '<details class="ashelf-pillar" data-cat="' + cat.id + '" open>' +
        '<summary class="ashelf-pillar-hd">' + icon(CAT_ICON[cat.id] || "stack-2", "ashelf-cat-ic") + L(cat.name_en, cat.name_ja) +
        '' + icon("chevron-right", "ashelf-caret") + '</summary>' + inner + '</details>';
    });

    // Auxiliary collections remain reachable without becoming top-level categories.
    COLLECTIONS.forEach(function (collection) {
      var cp = (collection.pages || []).map(function (slug) { return MAP[slug]; })
        .filter(function (p) { return p && (IS_DEV || p.published); });
      if (!cp.length) return;
      shelf += '<nav class="ashelf-collection" data-collection="' + collection.id + '">' +
        '<div class="ashelf-collection-hd">' + icon(CAT_ICON[collection.id] || 'archive', 'ashelf-cat-ic') +
        L(collection.name_en, collection.name_ja) + '</div><ul class="ashelf-list">' + cp.map(leafLI).join('') + '</ul></nav>';
    });

    left.innerHTML = '<details class="ashelf-collapse" open><summary class="ashelf-toggle">' +
      L('Browse all topics', 'トピック一覧') +
      '' + icon("chevron-right", "ashelf-caret") + '</summary>' +
      shelf + '</details>';
    syncShelfDrawer(left.querySelector('.ashelf-collapse'));

    if (!page) { layout.classList.add('shell-bare'); return; }

    if (isNewCurriculumPage(page)) rewriteBreadcrumb();

    function isNewCurriculumPage(p) {
      return !!(p && /-v2$/.test(p.category || ''));
    }

    function groupPath(groups, slug, parents) {
      var found = null;
      (groups || []).some(function (g) {
        var path = (parents || []).concat(g);
        if ((g.pages || []).indexOf(slug) >= 0) { found = path; return true; }
        found = groupPath(g.groups, slug, path);
        return !!found;
      });
      return found;
    }
    function pageHierarchy(p) {
      var cat = CATMAP[p.category];
      if (cat) return [cat].concat(groupPath(cat.groups, p.slug, []) || []);
      if (p.collection && COLLECTIONMAP[p.collection]) return [COLLECTIONMAP[p.collection]];
      return [];
    }
    function rewriteBreadcrumb() {
      var crumb = center.querySelector('.crumb');
      if (!crumb) return;
      var separator = '<span class="sep" aria-hidden="true">/</span>';
      var parts = ['<span class="crumb-item"><a href="/">' + L('Home', 'ホーム') + '</a></span>',
        '<span class="crumb-item">' + separator + '<a href="' + learnURL('') + '">' +
        L('Learn', '基礎から学ぶ') + '</a></span>'];
      pageHierarchy(page).forEach(function (item) {
        parts.push('<span class="crumb-item">' + separator + '<span>' +
          L(item.name_en, item.name_ja) + '</span></span>');
      });
      parts.push('<span class="crumb-item crumb-current" aria-current="page">' + separator + '<span>' +
        L(page.title_en, page.title_ja) + '</span></span>');
      crumb.innerHTML = parts.join('');
    }

    /* ---- helpers that resolve slug cross-references to links ---- */
    function isPublishedArticleTarget(p) {
      return !!(p && !p.planned && p.published === true);
    }
    function pageLI(slug) {
      var p = MAP[slug];
      if (!isPublishedArticleTarget(p)) return '';
      var lab = L(p.nav_en || p.title_en, p.nav_ja || p.title_ja);
      return '<li><a href="' + learnURL(p.slug) + '">' + lab + '</a></li>';
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
      var heads = center.querySelectorAll('.demo:not([data-editorial-note]) > .demo-head h2, .route-hd h2'), perHeading = false;
      if (heads.length < 2) heads = center.querySelectorAll('.demo:not([data-editorial-note]) h2, section:not([data-editorial-note]) h2, .route h2');
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
      var hierarchy = pageHierarchy(page);
      var legacyCategory = CATMAP[page.category];
      var categoryLabel = isNewCurriculumPage(page)
        ? hierarchy.map(function (item) { return L(item.name_en, item.name_ja); }).join(' / ')
        : (legacyCategory ? L(legacyCategory.name_en, legacyCategory.name_ja) : '');
      var meta = '';
      if (page.theme && page.theme.length) meta += '<dt>' + L('Theme', 'テーマ') + '</dt><dd>' + page.theme.slice(0, 3).map(pretty).join(' · ') + '</dd>';
      if (page.level_en) meta += '<dt>' + L('Level', '難易度') + '</dt><dd>' + L(page.level_en, page.level_ja) + '</dd>';
      if (page.readingTime_en) meta += '<dt>' + L('Time', '読む時間') + '</dt><dd>' + L(page.readingTime_en, page.readingTime_ja) + '</dd>';
      var summ = (page.summary_en || page.summary_ja) ? '<p class="nb-summary">' + L(page.summary_en, page.summary_ja) + '</p>' : '';
      var card = '<div class="nb-pos">' +
        (categoryLabel ? '<div class="nb-cat">' + categoryLabel + '</div>' : '') +
        (meta ? '<dl class="nb-meta">' + meta + '</dl>' : '') + summ + '</div>';
      return block(L('Where this page sits', 'このページの位置づけ'), card);
    }
    var relation = RELATIONS[SLUG] || {};
    function relationList(type) {
      if (Array.isArray(relation[type])) return relation[type];
      // Older records did not distinguish strict prerequisites from helpful
      // background. Keep them useful without upgrading them to requirements.
      if (!RELATIONS[SLUG] && type === 'helpful') return page.prerequisites || [];
      return [];
    }
    function relationPageLI(slug) {
      return pageLI(slug);
    }
    function relationLinkList(slugs) {
      var items = (slugs || []).map(relationPageLI).filter(Boolean).join('');
      return items ? '<ul class="nb-links">' + items + '</ul>' : '';
    }
    function nextTargetVisible(slug) {
      return isPublishedArticleTarget(MAP[slug]);
    }
    function previousTarget() {
      var index = ORDER.indexOf(SLUG);
      var previous = index > 0 ? MAP[ORDER[index - 1]] : null;
      return isPublishedArticleTarget(previous) ? previous : null;
    }
    function blkPrereq() {
      return block(L('Prerequisite', '前提'), relationLinkList(relationList('prerequisite')));
    }
    function blkHelpful() {
      return block(L('Helpful', 'あると理解しやすい'), relationLinkList(relationList('helpful')));
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
      var next = relation.next;
      return block(L('Read next', '次に読む'), next && next.page && nextTargetVisible(next.page) ? relationLinkList([next.page]) : '');
    }
    function blkPrevious() {
      var previous = previousTarget();
      return block(L('Previous', '前へ'), previous ? relationLinkList([previous.slug]) : '');
    }
    function blkRelated() {
      return block(L('Related', '関連'), relationLinkList(relationList('related')));
    }
    function blkTags() {
      if (!page.tags || !page.tags.length) return '';
      var items = page.tags.slice(0, 6).map(function (t) { return '<span>' + t + '</span>'; }).join('');
      return block(L('Tags', 'タグ'), '<div class="nb-tags">' + items + '</div>');
    }
    function blkRelatedRoutes() {
      var items = PAGES.filter(function (q) {
        return q.category === 'routes' && q.slug !== SLUG;
      })
        .map(function (q) { return pageLI(q.slug); }).filter(Boolean).join('');
      return block(L('Other routes', '他のルート'), items ? '<ul class="nb-links">' + items + '</ul>' : '');
    }

    var BUILD = { prereq: blkPrereq, helpful: blkHelpful, toc: function () { return TOC; }, basics: blkBasics,
                  ref: blkRef, usedBy: blkUsedBy, previous: blkPrevious, next: blkNext, related: blkRelated,
                  tags: blkTags, relatedRoutes: blkRelatedRoutes };
    // The right rail is a compact reading map. Long transition copy belongs only
    // at the end of the article, where the reader makes the next-step decision.
    var order = ['toc', 'prereq', 'helpful', 'previous', 'next', 'related'];
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
      if (center.querySelector('[data-generated-next], [data-learning-exit]')) return;
      if (page.layoutType === 'route') return;
      var nextOnly = false;
      var next = relation.next;
      var q = next && next.page && MAP[next.page];
      var hasNext = !!(q && nextTargetVisible(q.slug));
      var previous = nextOnly ? null : previousTarget();
      if (!hasNext && !previous) return;
      var sec = ce('nav', (hasNext ? (nextOnly ? 'learning-exit learning-exit--next-only' : 'learning-exit') : 'learning-exit learning-exit--previous-only'));
      sec.setAttribute('data-learning-exit', '');
      if (hasNext) {
        sec.setAttribute('aria-labelledby', 'learning-next-label');
        sec.innerHTML = '<a class="learning-exit-main" href="' + learnURL(q.slug) + '">' +
          '<span class="learning-exit-label" id="learning-next-label">' + L('Read next', '次に読む') + '</span>' +
          '<span class="learning-exit-title">' + L(q.title_en, q.title_ja) + '</span>' +
          '<span class="learning-exit-bridge">' + L(next.bridge_en, next.bridge_ja) + '</span>' +
          (nextOnly ? '' : '<span class="learning-exit-action">' + L('Next →', '次へ →') + '</span>') + '</a>';
      }
      if (previous) {
        sec.innerHTML += '<a class="learning-exit-previous" href="' + learnURL(previous.slug) + '">' +
          L('← ' + (previous.nav_en || previous.title_en), '← ' + (previous.nav_ja || previous.title_ja)) + '</a>';
      }
      center.appendChild(sec);
    }

    /* ---- narrow screens: the right rail is hidden (CSS); drop ONE collapsed
            TOC at the top of the content so the reader can still jump around ---- */
    function buildMobileTOC() {
      var heads = center.querySelectorAll('.demo:not([data-editorial-note]) > .demo-head h2, .route-hd h2');
      if (heads.length < 2) heads = center.querySelectorAll('.demo:not([data-editorial-note]) h2, section:not([data-editorial-note]) h2, .route h2');
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
    function tocActive() { activateTOC(right); }
  }

  function activateTOC(rail) {
      var links = rail.querySelectorAll('.nb-toc a');
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
})();
