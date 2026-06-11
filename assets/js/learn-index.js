// Renders the Learn index from /learn/pages.json.
// Call window.initLearnIndex(publishedOnly) after DOM ready.
window.initLearnIndex = function (publishedOnly) {
  var navGrid = document.getElementById('learn-nav-grid');
  var sections = document.getElementById('learn-sections');

  fetch('/learn/pages.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var pages = publishedOnly
        ? data.pages.filter(function (p) { return p.published; })
        : data.pages;

      // Build a set of categories that have at least one visible page
      var activeCats = {};
      pages.forEach(function (p) { activeCats[p.category] = true; });

      // Render category nav
      var navHtml = '';
      data.categories.forEach(function (cat) {
        if (!activeCats[cat.id]) return;
        navHtml +=
          '<a class="ed-ix" href="#' + cat.id + '">' +
            '<span class="ed-ix-no">' + cat.num + '</span>' +
            '<span class="ed-ix-name">' +
              '<span class="i18n-en">' + cat.name_en + '</span>' +
              '<span class="i18n-ja">' + cat.name_ja + '</span>' +
            '</span>' +
          '</a>';
      });
      navGrid.innerHTML = navHtml;

      // Render category sections
      var sectHtml = '';
      data.categories.forEach(function (cat) {
        if (!activeCats[cat.id]) return;
        var catPages = pages.filter(function (p) { return p.category === cat.id; });
        var cardsHtml = '';
        catPages.forEach(function (p) {
          var statusTag = publishedOnly ? '' :
            p.published
              ? '<span class="dev-status dev-status--live"><span class="i18n-en">Live</span><span class="i18n-ja">公開中</span></span>'
              : '<span class="dev-status dev-status--wip"><span class="i18n-en">Dev</span><span class="i18n-ja">非公開</span></span>';
          cardsHtml +=
            '<a href="/learn/' + p.slug + '/" class="et">' +
              '<div>' +
                '<h3>' +
                  '<span class="i18n-en">' + p.title_en + '</span>' +
                  '<span class="i18n-ja">' + p.title_ja + '</span>' +
                  statusTag +
                '</h3>' +
                '<p>' +
                  '<span class="i18n-en">' + p.desc_en + '</span>' +
                  '<span class="i18n-ja">' + p.desc_ja + '</span>' +
                '</p>' +
              '</div>' +
            '</a>';
        });
        sectHtml +=
          '<div class="ed-cat rv" id="' + cat.id + '">' +
            '<div class="ed-cat-hd">' +
              '<span class="ed-cat-no">' + cat.num + '</span>' +
              '<span class="ed-cat-name">' +
                '<span class="i18n-en">' + cat.name_en + '</span>' +
                '<span class="i18n-ja">' + cat.name_ja + '</span>' +
              '</span>' +
            '</div>' +
            '<div class="ed-tools">' + cardsHtml + '</div>' +
            '<div class="ed-cat-foot">' +
              '<a class="ed-cat-back" href="#categories">' +
                '<span class="ed-cat-back-ic" aria-hidden="true"></span>' +
                '<span class="i18n-en">Back to categories</span>' +
                '<span class="i18n-ja">カテゴリ一覧へ戻る</span>' +
              '</a>' +
            '</div>' +
          '</div>';
      });
      sections.innerHTML = sectHtml;

      // Scroll reveal
      (function () {
        var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
        var items = Array.from(sections.querySelectorAll('.rv'));
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
