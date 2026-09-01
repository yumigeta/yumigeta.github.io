// Renders /learn/all/ — the full article index (the "no hidden pages" safety valve).
// Browsable by category, by tag (controlled vocabulary), and by A→Z / あ→わ order.
// Single source: /learn/pages.json. Planned pages show as non-link "準備中" rows.
window.initLearnAll = function () {
  var host  = document.getElementById('learn-all');
  var ctrls = document.getElementById('learn-all-controls');
  if (!host) return;

  function i18(en, ja) {
    return '<span class="i18n-en">' + (en || '') + '</span><span class="i18n-ja">' + (ja || '') + '</span>';
  }
  var KIND_ORDER = ['#Route', '#Concept', '#Theme', '#Handbook'];
  var state = { sort: 'category', tag: null };

  fetch('/learn/pages.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var cats  = data.categories || [];
      var pages = (data.pages || []).slice();

      // ── tag inventory: kind tags first (category order), then topics A→Z ──
      var counts = {};
      pages.forEach(function (p) { (p.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
      var kinds  = KIND_ORDER.filter(function (t) { return counts[t]; });
      var topics = Object.keys(counts)
        .filter(function (t) { return KIND_ORDER.indexOf(t) < 0; })
        .sort(function (a, b) { return a.localeCompare(b); });
      var tagList = kinds.concat(topics);

      renderControls();
      render();

      function renderControls() {
        if (!ctrls) return;
        var sorts = [['category', 'By category', 'カテゴリ順'], ['az', 'A → Z', 'A→Z'], ['aiueo', 'あ → わ', '五十音']];
        var sortBtns = sorts.map(function (s) {
          return '<button class="lall-sort' + (state.sort === s[0] ? ' is-on' : '') +
            '" data-sort="' + s[0] + '">' + i18(s[1], s[2]) + '</button>';
        }).join('');
        var tagChips = tagList.map(function (t) {
          return '<button class="lall-tag' + (state.tag === t ? ' is-on' : '') +
            '" data-tag="' + t + '">' + t + '</button>';
        }).join('');
        var clear = state.tag
          ? '<button class="lall-tag lall-clear" data-tag="">' + i18('clear ✕', 'クリア ✕') + '</button>'
          : '';
        ctrls.innerHTML =
          '<div class="lall-row"><span class="lall-lab">' + i18('Sort', '並び') + '</span>' + sortBtns + '</div>' +
          '<div class="lall-row lall-tagrow"><span class="lall-lab">' + i18('Filter by tag', 'タグで絞る') + '</span>' + tagChips + clear + '</div>';
        ctrls.querySelectorAll('[data-sort]').forEach(function (b) {
          b.addEventListener('click', function () { state.sort = b.getAttribute('data-sort'); renderControls(); render(); });
        });
        ctrls.querySelectorAll('[data-tag]').forEach(function (b) {
          b.addEventListener('click', function () {
            var t = b.getAttribute('data-tag');
            state.tag = (t && state.tag !== t) ? t : null;
            renderControls(); render();
          });
        });
      }

      function match(p) { return !state.tag || (p.tags || []).indexOf(state.tag) >= 0; }

      function card(p) {
        var de = p.summary_en || '', dj = p.summary_ja || '';
        if (p.planned) {
          return '<div class="et et-coming-soon"><div>' +
            '<span class="et-tag">' + i18('Coming soon', '準備中') + '</span>' +
            '<h3>' + i18(p.title_en, p.title_ja) + '</h3>' +
            '<p>' + i18(de, dj) + '</p></div></div>';
        }
        return '<a href="/learn/' + p.slug + '/" class="et"><div>' +
          '<h3>' + i18(p.title_en, p.title_ja) + '</h3>' +
          '<p>' + i18(de, dj) + '</p></div></a>';
      }

      function render() {
        var list = pages.filter(match);
        var html = '';
        if (state.sort === 'category') {
          cats.forEach(function (cat) {
            var inCat = list.filter(function (p) { return p.category === cat.id; });
            if (!inCat.length) return;
            html += '<div class="ed-cat" id="' + cat.id + '"><div class="ed-cat-hd">' +
              '<span class="ed-cat-no">' + cat.num + '</span>' +
              '<span class="ed-cat-name">' + i18(cat.name_en, cat.name_ja) + '</span></div>' +
              '<div class="ed-tools">' + inCat.map(card).join('') + '</div></div>';
          });
        } else {
          var ja = state.sort === 'aiueo';
          var loc = ja ? 'ja' : 'en';
          var sorted = list.slice().sort(function (a, b) {
            var an = ja ? (a.title_ja || a.nav_ja) : (a.title_en || a.nav_en);
            var bn = ja ? (b.title_ja || b.nav_ja) : (b.title_en || b.nav_en);
            return String(an).localeCompare(String(bn), loc);
          });
          html += '<div class="ed-cat"><div class="ed-tools">' + sorted.map(card).join('') + '</div></div>';
        }
        host.innerHTML = html ||
          '<p class="lall-empty">' + i18('No pages match this tag.', 'このタグに一致するページはありません。') + '</p>';
      }
    });
};
