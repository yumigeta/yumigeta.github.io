// Renders the Learn index from /learn/pages.json as a hub-and-spoke map.
//   initLearnIndex(true)                  → published only, with status tags
//   initLearnIndex(false)                 → show everything, with status tags
//   initLearnIndex({publishedOnly:false, showStatus:false})  → full map, no tags
// Theme hubs render as a prominent spotlight (#learn-hubs); the remaining
// categories render as the "library" below (#learn-nav-grid + #learn-sections).
window.initLearnIndex = function (opts) {
  if (typeof opts === 'boolean') opts = { publishedOnly: opts, showStatus: true };
  opts = opts || {};
  // "Preview published" switch (localhost only, set by learn-organize.js): force
  // the public view — published pages only, no dev status tags.
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var PREVIEW_PUB = IS_LOCAL && localStorage.getItem('learn-view') === 'published';
  var publishedOnly = !!opts.publishedOnly || PREVIEW_PUB;
  var showStatus = (opts.showStatus !== false) && !PREVIEW_PUB;

  var navGrid  = document.getElementById('learn-nav-grid');
  var sections = document.getElementById('learn-sections');

  function i18(en, ja) {
    return '<span class="i18n-en">' + (en || '') + '</span>' +
           '<span class="i18n-ja">' + (ja || '') + '</span>';
  }
  function statusTag(p) {
    if (!showStatus) return '';
    return p.published
      ? '<span class="dev-status dev-status--live">' + i18('Live', '公開中') + '</span>'
      : '<span class="dev-status dev-status--wip">' + i18('Dev', '非公開') + '</span>';
  }

  fetch('/learn/pages.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var pages = publishedOnly
        ? data.pages.filter(function (p) { return p.published; })
        : data.pages;

      // ── Left knowledge-map shelf: routes (compact top) + content pillars
      //    (2-level accordion). Same component as the article pages; grouping is
      //    declared in pages.json categories[].groups. No current page on the
      //    index, so every pillar starts collapsed. ──
      var shelfHost = document.getElementById('learn-shelf');
      if (shelfHost) {
        var bySlug = {};
        pages.forEach(function (p) { bySlug[p.slug] = p; });
        var inCat = function (catId) { return pages.filter(function (p) { return p.category === catId; }); };
        var leafLI = function (p) {
          var lab = i18(p.nav_en || p.title_en, p.nav_ja || p.title_ja);
          if (p.planned) {
            return '<li><span class="ashelf-soon">' + lab +
              '<span class="wip wip-soon">' + i18('soon', '準備中') + '</span></span></li>';
          }
          var wip = (showStatus && !p.published) ? '<span class="wip">dev</span>' : '';
          return '<li><a href="/learn/' + p.slug + '/">' + lab + wip + '</a></li>';
        };
  /* ── Icons — Tabler (tabler.io), used verbatim ──────────────────────────
     Tabler's spec is a 24×24 grid, stroke-width 2, round caps and joins, no
     fill. Keeping all of that intact is the point: the paths below are the
     upstream ones unchanged, so every mark on the site is drawn to one system
     instead of being improvised per place. Size is set in CSS; the 2-unit
     stroke then renders at ~1.25–1.5px, which sits right against the type.
     (The same map is in article-shell.js, which builds this shelf on the
     article pages.) */
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

        // recursive sub-folder render: a group may carry its own groups[] (sub-sub-folders, any depth)
        var grpHTML = function (g, placed) {
          var inner = '';
          (g.groups || []).forEach(function (cg) { inner += grpHTML(cg, placed); });
          var gp = (g.pages || []).map(function (s) { return bySlug[s]; }).filter(Boolean);
          gp.forEach(function (p) { placed[p.slug] = 1; });
          if (gp.length) inner += '<ul class="ashelf-list">' + gp.map(leafLI).join('') + '</ul>';
          if (!inner) return '';   // nothing visible in this sub-tree → skip
          return '<details class="ashelf-grp"><summary class="ashelf-grp-hd">' + i18(g.name_en, g.name_ja) +
            '' + icon("chevron-right", "ashelf-caret") + '</summary>' + inner + '</details>';
        };
        var shelf = '';
        var routesCat = data.categories.filter(function (c) { return c.id === 'routes'; })[0];
        if (routesCat) {
          var rp = inCat('routes');
          if (rp.length) {
            shelf += '<nav class="ashelf-routes" data-cat="routes">' +
              '<div class="ashelf-routes-hd">' + icon(CAT_ICON.routes, "ashelf-cat-ic") + i18(routesCat.name_en, routesCat.name_ja) + '</div>' +
              '<ul class="ashelf-list">' + rp.map(leafLI).join('') + '</ul></nav>';
          }
        }
        data.categories.forEach(function (cat) {
          if (cat.id === 'routes') return;
          var cp = inCat(cat.id);
          if (!cp.length && publishedOnly) return;   // dev: keep empty categories visible (e.g. the scratch folder)
          var inner = '', placed = {};
          (cat.groups || []).forEach(function (g) { inner += grpHTML(g, placed); });
          var ungrouped = cp.filter(function (p) { return !placed[p.slug]; });
          if (ungrouped.length) inner += '<ul class="ashelf-list ashelf-ungrouped">' + ungrouped.map(leafLI).join('') + '</ul>';
          if (!cp.length) inner += '<ul class="ashelf-list ashelf-ungrouped"><li><span class="ashelf-soon">' + i18('(empty)', '（空）') + '</span></li></ul>';
          shelf += '<details class="ashelf-pillar" data-cat="' + cat.id + '" open><summary class="ashelf-pillar-hd">' +
            icon(CAT_ICON[cat.id] || "stack-2", "ashelf-cat-ic") + i18(cat.name_en, cat.name_ja) +
            '' + icon("chevron-right", "ashelf-caret") + '</summary>' + inner + '</details>';
        });
        shelfHost.innerHTML = '<details class="ashelf-collapse" open><summary class="ashelf-toggle">' +
          i18('Browse all topics', 'トピック一覧') +
          '' + icon("chevron-down", "ashelf-arrow") + '</summary>' +
          shelf + '</details>';
        (function (det) {
          if (!det) return;
          var mq = window.matchMedia('(min-width: 1240px)');
          var sync = function () { det.open = mq.matches; };
          sync();
          if (mq.addEventListener) mq.addEventListener('change', sync);
          else if (mq.addListener) mq.addListener(sync);
        })(shelfHost.querySelector('.ashelf-collapse'));
      }

      // ── Library (all categories, hubs included as a normal section) ──
      var lib = pages;
      var activeCats = {};
      lib.forEach(function (p) { activeCats[p.category] = true; });

      var navHtml = '';
      data.categories.forEach(function (cat) {
        if (!activeCats[cat.id] && publishedOnly) return;
        navHtml +=
          '<a class="ed-ix" href="#' + cat.id + '">' +
            '<span class="ed-ix-no">' + cat.num + '</span>' +
            '<span class="ed-ix-name">' + i18(cat.name_en, cat.name_ja) + '</span>' +
          '</a>';
      });
      if (navGrid) navGrid.innerHTML = navHtml;

      var sectHtml = '';
      data.categories.forEach(function (cat) {
        if (!activeCats[cat.id] && publishedOnly) return;
        var catPages = lib.filter(function (p) { return p.category === cat.id; });
        var cardsHtml = catPages.map(function (p) {
          var de = p.desc_en || p.summary_en || '';
          var dj = p.desc_ja || p.summary_ja || '';
          if (p.planned) {
            return '<div class="et et-coming-soon"><div>' +
                '<span class="et-tag">' + i18('Coming soon', '準備中') + '</span>' +
                '<h3>' + i18(p.title_en, p.title_ja) + '</h3>' +
                '<p>' + i18(de, dj) + '</p>' +
              '</div></div>';
          }
          return '<a href="/learn/' + p.slug + '/" class="et"><div>' +
              '<h3>' + i18(p.title_en, p.title_ja) + statusTag(p) + '</h3>' +
              '<p>' + i18(de, dj) + '</p>' +
            '</div></a>';
        }).join('');
        if (!catPages.length) cardsHtml = '<p style="font-family:var(--gothic);font-size:13px;line-height:1.6;color:var(--soft);margin:2px 0 0">' +
          i18('Empty: a holding area for pages whose use is undecided. Move pages here in Organize (整理).',
              '空：使うか未定のページの一時置き場。整理モードでここに移動できます。') + '</p>';
        sectHtml +=
          '<div class="ed-cat rv" id="' + cat.id + '">' +
            '<div class="ed-cat-hd">' +
              '<span class="ed-cat-no">' + cat.num + '</span>' +
              '<span class="ed-cat-name">' + i18(cat.name_en, cat.name_ja) + '</span>' +
            '</div>' +
            '<div class="ed-tools">' + cardsHtml + '</div>' +
          '</div>';
      });
      if (sections) sections.innerHTML = sectHtml;

      // ── Scroll reveal ──
      (function () {
        if (!sections) return;
        var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
        var items = Array.prototype.slice.call(sections.querySelectorAll('.rv'));
        if (!motionOK || !('IntersectionObserver' in window)) {
          items.forEach(function (s) { s.classList.add('in'); });
          return;
        }
        document.body.classList.add('reveal-on');
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
          });
        }, { rootMargin: '0px 0px -8% 0px' });
        items.forEach(function (s) { io.observe(s); });
        setTimeout(function () { items.forEach(function (s) { s.classList.add('in'); }); }, 1500);
      })();
    });
};
