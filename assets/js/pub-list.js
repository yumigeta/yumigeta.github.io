// Renders publications from /publications/publications.json.
// initPubsFull()  — full publications page
// initPubsHome(n) — homepage (top n entries)
(function () {
  var DATA_URL = '/publications/publications.json';

  function boldAuthors(str) {
    return str.replace(/__([^_]+)__/g, '<b>$1</b>');
  }
  function plainAuthors(str) {
    return str.replace(/__([^_]+)__/g, '$1');
  }

  function badgeHtml(pub, forHome) {
    if (!pub.badge) return '';
    if (forHome) return '<span class="badge">' + pub.badge + '</span>';
    var cls = pub.badge_cover ? ' class="cover-badge-sm"' : '';
    return '<b' + cls + '>' + pub.badge + '</b>';
  }

  // ── Full publications page ──────────────────────────────────────────────
  window.initPubsFull = function () {
    var container = document.getElementById('pub-sections');
    var countEl   = document.getElementById('pub-count');
    var rail      = document.querySelector('.rail');

    fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var pubs = data.publications;
        if (countEl) countEl.textContent = pubs.length;

        // Group by year
        var years = [];
        var byYear = {};
        pubs.forEach(function (p) {
          if (!byYear[p.year]) { byYear[p.year] = []; years.push(p.year); }
          byYear[p.year].push(p);
        });
        // years already in descending order from JSON

        var html = '';
        var idx = 0;
        years.forEach(function (yr) {
          var group = byYear[yr];
          var cards = '';
          group.forEach(function (p) {
            idx++;
            var doi = p.doi
              ? '<div class="flinks"><a href="https://doi.org/' + p.doi + '" target="_blank" rel="noopener">DOI</a></div>'
              : '';
            var badg = badgeHtml(p, false);
            var venueExtra = (badg || doi)
              ? '<br>' + (badg || '') + (badg && doi ? ' ' : '') + doi
              : '';
            cards +=
              '<div class="fpub" data-tags="' + p.tags.join(' ') + '">' +
                '<span class="ix">' + (idx < 10 ? '0' : '') + idx + '</span>' +
                '<div>' +
                  '<div class="t">' +
                    (p.doi
                      ? '<a href="https://doi.org/' + p.doi + '" target="_blank" rel="noopener">' + p.title + '</a>'
                      : p.title) +
                    (p.highlight ? ' <span class="star"><svg class="ti ti-in" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z"/></svg></span>' : '') +
                  '</div>' +
                  '<div class="fa">' + boldAuthors(p.authors) + '</div>' +
                '</div>' +
                '<div class="venue"><em>' + p.journal + '</em> ' + p.volume + ', ' + p.page + venueExtra + '</div>' +
              '</div>';
          });
          var n = group.length;
          html +=
            '<section class="year">' +
              '<div class="container">' +
                '<div class="yhead">' +
                  '<span class="y">' + yr + '</span>' +
                  '<span class="rl"></span>' +
                  '<span class="n">' + n + (n === 1 ? ' paper' : ' papers') + '</span>' +
                '</div>' +
                cards +
              '</div>' +
            '</section>';
        });
        container.innerHTML = html;

        // Wire up filter rail
        if (rail) {
          var allPubs = Array.from(container.querySelectorAll('.fpub'));
          var allYears = Array.from(container.querySelectorAll('section.year'));

          rail.addEventListener('click', function (e) {
            var a = e.target.closest('a[data-filter]');
            if (!a) return;
            e.preventDefault();
            rail.querySelectorAll('a').forEach(function (l) { l.classList.remove('on'); });
            a.classList.add('on');
            var f = a.dataset.filter;
            var visible = 0;
            allPubs.forEach(function (p) {
              var show = f === 'all' || p.dataset.tags.split(' ').includes(f);
              p.style.display = show ? '' : 'none';
              if (show) visible++;
            });
            allYears.forEach(function (sec) {
              var visPubs = sec.querySelectorAll('.fpub:not([style*="display: none"])');
              sec.style.display = visPubs.length ? '' : 'none';
              var nSpan = sec.querySelector('.yhead .n');
              if (nSpan) nSpan.textContent = visPubs.length + (visPubs.length === 1 ? ' paper' : ' papers');
            });
            if (countEl) countEl.textContent = visible;
          });
        }
      });
  };

  // ── Homepage snippet ────────────────────────────────────────────────────
  window.initPubsHome = function (n) {
    var container = document.getElementById('home-pubs');
    if (!container) return;

    fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var pubs = data.publications.slice(0, n);
        var html = '';
        pubs.forEach(function (p) {
          var titleHtml = p.doi
            ? '<a href="https://doi.org/' + p.doi + '" target="_blank" rel="noopener">' + p.title + '.</a>'
            : p.title + '.';
          var badg = p.badge ? '<span class="badge">' + p.badge + '</span>' : '';
          html +=
            '<div class="pub">' +
              '<div class="yr">' + p.year + '</div>' +
              '<div class="cite">' +
                '<span class="authors">' + plainAuthors(p.authors) + '</span> ' +
                '<span class="title">' + titleHtml + '</span> ' +
                '<span class="journal">' + p.journal + '</span> ' +
                '<span class="vol">' + p.year + '</span>, ' +
                '<em>' + p.volume + '</em>, ' + p.page + '.' +
                (badg ? badg : '') +
              '</div>' +
            '</div>';
        });
        container.innerHTML = html;
      });
  };
})();
