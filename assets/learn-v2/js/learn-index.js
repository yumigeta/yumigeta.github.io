  function learnURL(slug) {
    return window.learnHref ? window.learnHref(slug) : '/learn/' + (slug ? slug + '/' : '');
  }
// Renders the Learn index from /learn/pages.json as a hub-and-spoke map.
//   initLearnIndex(true)                  → published only, with status tags
//   initLearnIndex(false)                 → show everything, with status tags
//   initLearnIndex({publishedOnly:false, showStatus:false})  → full map, no tags
// Theme hubs render as a prominent spotlight (#learn-hubs); the remaining
// categories render as the "library" below (#learn-nav-grid + #learn-sections).
window.initLearnIndex = function (opts) {
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
  // The publishing build has already rendered the shelf and page library.
  if (document.documentElement.getAttribute('data-static-shell') === 'index') {
    syncShelfDrawer(document.querySelector('#learn-shelf .ashelf-collapse'));
    return;
  }
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

  fetch('/learn/pages.json?v=direct-learning-relations-20260916-r1')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var categories = data.category_architectures || [];
      var pages = publishedOnly
        ? data.pages.filter(function (p) { return p.published; })
        : data.pages;
      // ── Left knowledge-map shelf: current hierarchy only.
      //    Same component as the article pages; grouping is
      //    declared in pages.json category_architectures[].groups. No current page on the
      //    index, so every pillar starts collapsed. ──
      var shelfHost = document.getElementById('learn-shelf');
      if (shelfHost) {
        var bySlug = {};
        pages.forEach(function (p) { bySlug[p.slug] = p; });
        var inCat = function (catId) { return pages.filter(function (p) { return p.category === catId; }); };
        var topicVisible = function (topic) {
          if (!publishedOnly) return true;
          var mapped = topic.page && bySlug[topic.page];
          return topic.status === 'existing' && mapped && mapped.published;
        };
        var leafLI = function (p) {
          var lab = i18(p.nav_en || p.title_en, p.nav_ja || p.title_ja);
          if (p.planned) {
            return '<li><span class="ashelf-soon">' + lab +
              '<span class="wip wip-soon">' + i18('soon', '準備中') + '</span></span></li>';
          }
          var wip = (showStatus && !p.published) ? '<span class="wip">dev</span>' : '';
          return '<li><a href="' + learnURL(p.slug) + '">' + lab + wip + '</a></li>';
        };
        var topicLI = function (topic) {
          var lab = i18(topic.name_en, topic.name_ja);
          var mapped = topic.page && bySlug[topic.page];
          if (topic.status !== 'existing' || !mapped) {
            return '<li><span class="ashelf-soon">' + lab +
              '<span class="wip wip-soon">' + i18('soon', '準備中') + '</span></span></li>';
          }
          var wip = (showStatus && !mapped.published) ? '<span class="wip">dev</span>' : '';
          return '<li><a href="' + learnURL(mapped.slug) + '">' + lab + wip + '</a></li>';
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
          var inner = '', deferred = [], leafRun = [];
          var flushLeaves = function () {
            if (!leafRun.length) return;
            inner += '<ul class="ashelf-list">' + leafRun.join('') + '</ul>';
            leafRun = [];
          };
          var topics = (g.topics || []).filter(topicVisible);
          if (topics.length) {
            inner += '<ul class="ashelf-list">' + topics.map(topicLI).join('') + '</ul>';
            topics.forEach(function (topic) { if (topic.page) placed[topic.page] = 1; });
          }
          (g.groups || []).forEach(function (cg) {
            if (cg.after) deferred.push(cg);
            else inner += grpHTML(cg, placed);
          });
          var gp = (g.pages || []).map(function (s) { return bySlug[s]; }).filter(Boolean);
          gp.forEach(function (p) { placed[p.slug] = 1; });
          gp.forEach(function (p) {
            leafRun.push(leafLI(p));
            deferred.filter(function (cg) { return cg.after === p.slug; }).forEach(function (cg) {
              flushLeaves();
              inner += grpHTML(cg, placed);
            });
          });
          flushLeaves();
          deferred.filter(function (cg) {
            return !gp.some(function (p) { return p.slug === cg.after; });
          }).forEach(function (cg) { inner += grpHTML(cg, placed); });
          if (!inner && publishedOnly) return '';
          if (!inner) inner = '<div class="ashelf-empty">' + i18('No pages yet', 'ページ準備中') + '</div>';
          return '<details class="ashelf-grp' + (g.after ? ' ashelf-grp--inline' : '') + '" data-group="' + (g.id || '') + '" open><summary class="ashelf-grp-hd">' + i18(g.name_en, g.name_ja) +
            '' + icon("chevron-right", "ashelf-caret") + '</summary>' + inner + '</details>';
        };
        var shelf = '';
        var routesCat = (data.categories || []).filter(function (cat) { return cat.id === 'routes'; })[0];
        if (routesCat) {
          var rp = inCat('routes');
          if (rp.length) {
            shelf += '<nav class="ashelf-routes" data-cat="routes">' +
              '<div class="ashelf-routes-hd">' + icon(CAT_ICON.routes, "ashelf-cat-ic") + i18(routesCat.name_en, routesCat.name_ja) + '</div>' +
              '<ul class="ashelf-list">' + rp.map(leafLI).join('') + '</ul></nav>';
          }
        }
        categories.forEach(function (cat) {
          // Routes and collections already have compact dedicated sections.
          if (cat.id === 'routes' || (data.collections || []).some(function (c) { return c.id === cat.id; })) return;
          var cp = inCat(cat.id);
          var inner = '', placed = {};
          (cat.groups || []).forEach(function (g) { inner += grpHTML(g, placed); });
          var ungrouped = cp.filter(function (p) { return !placed[p.slug]; });
          if (ungrouped.length) inner += '<ul class="ashelf-list ashelf-ungrouped">' + ungrouped.map(leafLI).join('') + '</ul>';
          if (!inner && publishedOnly) return;
          if (!inner) inner += '<ul class="ashelf-list ashelf-ungrouped"><li><span class="ashelf-soon">' + i18('(empty)', '（空）') + '</span></li></ul>';
          shelf += '<details class="ashelf-pillar" data-cat="' + cat.id + '" open><summary class="ashelf-pillar-hd">' +
            icon(CAT_ICON[cat.id] || "stack-2", "ashelf-cat-ic") + i18(cat.name_en, cat.name_ja) +
            '' + icon("chevron-right", "ashelf-caret") + '</summary>' + inner + '</details>';
        });
        (data.collections || []).forEach(function (collection) {
          var cp = (collection.pages || []).map(function (slug) { return bySlug[slug]; }).filter(Boolean);
          if (!cp.length) return;
          shelf += '<nav class="ashelf-collection" data-collection="' + collection.id + '">' +
            '<div class="ashelf-collection-hd">' + icon(CAT_ICON[collection.id] || 'archive', 'ashelf-cat-ic') +
            i18(collection.name_en, collection.name_ja) + '</div><ul class="ashelf-list">' + cp.map(leafLI).join('') + '</ul></nav>';
        });
        shelfHost.innerHTML = '<details class="ashelf-collapse" open><summary class="ashelf-toggle">' +
          i18('Browse all topics', 'トピック一覧') +
          '' + icon("chevron-right", "ashelf-caret") + '</summary>' +
          shelf + '</details>';
        syncShelfDrawer(shelfHost.querySelector('.ashelf-collapse'));
      }

      // ── Library: category hierarchy and recommended reading order are independent. ──
      var lib = pages;
      var activeCats = {};
      lib.forEach(function (p) { activeCats[p.category] = true; });

      function topicVisible(topic) {
        if (!publishedOnly) return true;
        var mapped = topic.page && lib.filter(function (p) { return p.slug === topic.page; })[0];
        return topic.status === 'existing' && !!mapped;
      }
      function hasVisibleTopics(groups) {
        return (groups || []).some(function (g) {
          return (g.topics || []).some(topicVisible) || hasVisibleTopics(g.groups);
        });
      }

      var navHtml = '';
      categories.forEach(function (cat) {
        if (!activeCats[cat.id] && !hasVisibleTopics(cat.groups) && publishedOnly) return;
        navHtml +=
          '<a class="ed-ix" href="#' + cat.id + '">' +
            '<span class="ed-ix-no">' + cat.num + '</span>' +
            '<span class="ed-ix-name">' + i18(cat.name_en, cat.name_ja) + '</span>' +
          '</a>';
      });
      if (navGrid) navGrid.innerHTML = navHtml;

      function card(p) {
        var de = p.desc_en || p.summary_en || '';
        var dj = p.desc_ja || p.summary_ja || '';
        if (p.planned) {
          return '<div class="et et-coming-soon"><div>' +
              '<span class="et-tag">' + i18('Coming soon', '準備中') + '</span>' +
              '<h3>' + i18(p.title_en, p.title_ja) + '</h3>' +
              '<p>' + i18(de, dj) + '</p>' +
            '</div></div>';
        }
        return '<a href="' + learnURL(p.slug) + '" class="et"><div>' +
            '<h3>' + i18(p.title_en, p.title_ja) + statusTag(p) + '</h3>' +
            '<p>' + i18(de, dj) + '</p>' +
          '</div></a>';
      }
      function topicCard(topic) {
        var mapped = topic.page && data.pages.filter(function (p) { return p.slug === topic.page; })[0];
        if (topic.status !== 'existing' || !mapped) {
          return '<div class="et et-coming-soon"><div>' +
              '<span class="et-tag">' + i18('Coming soon', '準備中') + '</span>' +
              '<h3>' + i18(topic.name_en, topic.name_ja) + '</h3>' +
            '</div></div>';
        }
        return '<a href="' + learnURL(mapped.slug) + '" class="et"><div>' +
            '<h3>' + i18(topic.name_en, topic.name_ja) + statusTag(mapped) + '</h3>' +
          '</div></a>';
      }
      function groupSlugs(groups, out) {
        (groups || []).forEach(function (g) {
          (g.topics || []).forEach(function (topic) { if (topic.page) out[topic.page] = 1; });
          (g.pages || []).forEach(function (slug) { out[slug] = 1; });
          groupSlugs(g.groups, out);
        });
        return out;
      }
      function groupSection(g) {
        var gp = (g.pages || []).map(function (slug) { return lib.filter(function (p) { return p.slug === slug; })[0]; }).filter(Boolean);
        var topics = (g.topics || []).filter(topicVisible);
        var children = (g.groups || []).map(groupSection).join('');
        if (!gp.length && !topics.length && !children && publishedOnly) return '';
        var rows = topics.map(topicCard).join('') + gp.map(card).join('');
        if (!rows && !children) rows = '<p class="ed-subcat-empty">' + i18('No pages yet', 'ページ準備中') + '</p>';
        return '<section class="ed-subcat" data-group="' + (g.id || '') + '"><h3 class="ed-subcat-hd">' +
          i18(g.name_en, g.name_ja) + '</h3>' + (rows ? '<div class="ed-tools">' + rows + '</div>' : '') + children + '</section>';
      }

      var sectHtml = '';
      categories.forEach(function (cat) {
        if (!activeCats[cat.id] && !hasVisibleTopics(cat.groups) && publishedOnly) return;
        var catPages = lib.filter(function (p) { return p.category === cat.id; });
        var nested = groupSlugs(cat.groups, {});
        var cardsHtml = catPages.filter(function (p) { return !nested[p.slug]; }).map(card).join('');
        var groupsHtml = (cat.groups || []).map(groupSection).join('');
        sectHtml +=
          '<div class="ed-cat rv" id="' + cat.id + '">' +
            '<div class="ed-cat-hd">' +
              '<span class="ed-cat-no">' + cat.num + '</span>' +
              '<span class="ed-cat-name">' + i18(cat.name_en, cat.name_ja) + '</span>' +
            '</div>' +
            (cardsHtml ? '<div class="ed-tools">' + cardsHtml + '</div>' : '') + groupsHtml +
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
