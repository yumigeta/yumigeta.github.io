/* ════════════════════════════════════════════════════════════════════════
   learn-organize.js — DEV / LOCALHOST-ONLY authoring tool for the Learn shelf.
   ------------------------------------------------------------------------
   "整理 / Organize" (bottom-left) edits the IA straight from the left panel:
     • flip a page's published / hidden state  (● / ○)
     • drag a page between categories (柱), sub-folders, and nested sub-folders
     • drag a page above/below another to reorder it
     • create · rename · delete folders (categories) and sub-folders — sub-folders
       NEST to any depth (sub-sub-folders and beyond via groups[].groups[])
     • add a placeholder page (準備中); rename folders, sub-folders & pages
     • auto-scroll the shelf when a dragged page nears its top / bottom edge
   Edits accumulate as a full working draft of pages.json in localStorage and
   re-render instantly. "Save" writes the draft to the local file (File System
   Access API) or downloads/copies it. "公開版 / Preview published" renders the
   shelf+index as the public sees it. Loaded only on localhost DEV (noindex)
   Learn pages — never the public /learn/ landing or production.

   Group addressing: a "path" is the chain of indices into nested groups, encoded
   dot-joined ("0", "0.2", "0.2.1"). '' = the category root (parent for a new
   top-level sub-folder); 'flat' = the category's ungrouped trailing bucket.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.__learnOrganize) return; window.__learnOrganize = 1;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;   // local only

  var DRAFT = 'learn-organize/draft';
  var orig = null, handle = null, editing = false, EHOST = null;

  /* ── working draft (the whole pages.json, with edits) ── */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function loadDraft() { try { var s = localStorage.getItem(DRAFT); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function working() { return loadDraft() || clone(orig); }
  function commit(d) { localStorage.setItem(DRAFT, JSON.stringify(d)); }
  function clearDraft() { localStorage.removeItem(DRAFT); }

  function pageBySlug(d, slug) { for (var i = 0; i < d.pages.length; i++) if (d.pages[i].slug === slug) return d.pages[i]; return null; }
  function pageIndex(d, slug) { for (var i = 0; i < d.pages.length; i++) if (d.pages[i].slug === slug) return i; return -1; }
  function catById(d, id) { return (d.categories || []).filter(function (c) { return c.id === id; })[0]; }

  /* ── nested-group addressing ── */
  function parsePath(s) { return (s == null || s === '') ? [] : String(s).split('.').map(function (x) { return parseInt(x, 10); }); }
  function nodeAtPath(cat, path) {   // [] → the category node; [0] → cat.groups[0]; [0,2] → cat.groups[0].groups[2]; …
    var n = cat;
    for (var i = 0; i < path.length; i++) { if (!n.groups || !n.groups[path[i]]) return null; n = n.groups[path[i]]; }
    return n;
  }
  function stripFromGroups(d, slug) {   // remove a slug from every group at every depth
    function strip(groups) { (groups || []).forEach(function (g) { g.pages = (g.pages || []).filter(function (s) { return s !== slug; }); strip(g.groups); }); }
    (d.categories || []).forEach(function (c) { strip(c.groups); });
  }
  function groupOf(d, slug) {   // a stable "cat#path" id of where the slug is grouped (first match), or null
    var r = null;
    (d.categories || []).forEach(function (c) {
      (function walk(groups, prefix) {
        (groups || []).forEach(function (g, gi) {
          if ((g.pages || []).indexOf(slug) >= 0) r = c.id + '#' + prefix + gi;
          walk(g.groups, prefix + gi + '.');
        });
      })(c.groups, '');
    });
    return r;
  }
  function diffCount(d) {
    var n = 0, om = {}, dm = {};
    (orig.pages || []).forEach(function (p) { om[p.slug] = p; });
    (d.pages || []).forEach(function (p) {
      dm[p.slug] = p;
      var o = om[p.slug];
      if (!o) { n++; return; }                                          // added page
      if (p.published !== o.published) n++;
      if (p.category !== o.category) n++;
      else if (groupOf(d, p.slug) !== groupOf(orig, p.slug)) n++;
    });
    (orig.pages || []).forEach(function (p) { if (!dm[p.slug]) n++; });  // removed page
    if (JSON.stringify(d.categories) !== JSON.stringify(orig.categories)) n++;   // folder add/rename/reorder/nest
    return n;
  }

  /* ── helpers for the structural ops ── */
  var ROMAN = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ'];
  function romanNum(n) { return ROMAN[n] || String(n); }
  function renumber(d) { (d.categories || []).forEach(function (c, i) { c.num = romanNum(i + 1); }); }
  function uniqueId(base, taken) {
    base = String(base || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!base) base = 'item';
    var id = base, i = 2; while (taken.indexOf(id) >= 0) { id = base + '-' + i; i++; }
    return id;
  }
  function ask(label, def) { return window.prompt(label, def == null ? '' : def); }   // null = cancelled

  /* ── page placement (publish / drag / reorder) ── */
  function togglePublished(slug) {
    var d = working(), p = pageBySlug(d, slug); if (p) p.published = !p.published; commit(d); renderEditor();
  }
  // target = { catId, groupPath: 'flat' | '0' | '0.2' | …, anchorSlug: string|null, position: 'before'|'after' }
  function placePage(slug, target) {
    var d = working(), p = pageBySlug(d, slug); if (!p) return;
    stripFromGroups(d, slug);
    p.category = target.catId;
    if (target.groupPath && target.groupPath !== 'flat') {
      var cat = catById(d, target.catId), g = nodeAtPath(cat, parsePath(target.groupPath));
      if (!g || g === cat) { commit(d); renderEditor(); return; }
      if (!g.pages) g.pages = [];
      var idx = g.pages.length;
      if (target.anchorSlug) { var ai = g.pages.indexOf(target.anchorSlug); if (ai >= 0) idx = target.position === 'after' ? ai + 1 : ai; }
      g.pages.splice(idx, 0, slug);
    } else {
      reorderFlat(d, slug, target.catId, target.anchorSlug, target.position);   // ungrouped → pages[] order
    }
    commit(d); renderEditor();
  }
  function reorderFlat(d, slug, catId, anchorSlug, position) {
    var page = d.pages.splice(pageIndex(d, slug), 1)[0];
    if (anchorSlug) {
      var ai = pageIndex(d, anchorSlug);
      if (ai < 0) { d.pages.push(page); return; }
      d.pages.splice(position === 'after' ? ai + 1 : ai, 0, page);
    } else {
      var last = -1; d.pages.forEach(function (p, i) { if (p.category === catId) last = i; });
      if (last < 0) d.pages.push(page); else d.pages.splice(last + 1, 0, page);
    }
  }

  /* ── folders (categories): create · rename · delete ── */
  function addCategory() {
    var d = working();
    var ja = ask('新しいフォルダ名（日本語） / New folder (JA):'); if (ja === null) return;
    var en = ask('新しいフォルダ名（英語） / New folder (EN):'); if (en === null) return;
    ja = ja.trim(); en = en.trim(); if (!ja && !en) return;
    var id = uniqueId(en || ja, (d.categories || []).map(function (c) { return c.id; }));
    d.categories.push({ id: id, num: '', name_en: en || ja, name_ja: ja || en, color: 'reference' });
    renumber(d); commit(d); renderEditor();
  }
  function renameCategory(catId) {
    var d = working(), c = catById(d, catId); if (!c) return;
    var ja = ask('フォルダ名（日本語） / Folder name (JA):', c.name_ja); if (ja === null) return;
    var en = ask('フォルダ名（英語） / Folder name (EN):', c.name_en); if (en === null) return;
    if (ja.trim()) c.name_ja = ja.trim(); if (en.trim()) c.name_en = en.trim();
    commit(d); renderEditor();
  }
  function deleteCategory(catId) {
    var d = working();
    if ((d.pages || []).some(function (p) { return p.category === catId; })) {
      window.alert('このフォルダにはページがあります。空にしてから削除してください。\nThis folder still has pages, move them out first.');
      return;
    }
    var c = catById(d, catId);
    if (!window.confirm('フォルダ「' + ((c && (c.name_ja || c.name_en)) || catId) + '」を削除しますか？ / Delete this empty folder?')) return;
    d.categories = (d.categories || []).filter(function (x) { return x.id !== catId; });
    renumber(d); commit(d); renderEditor();
  }

  /* ── sub-folders (groups): create (under a category OR another group) · rename · delete ──
     parentPath '' = the category root (new top-level sub-folder);
     parentPath '0' / '0.2' = a group (new nested sub-sub-folder under it). ── */
  function addGroup(catId, parentPath) {
    var d = working(), cat = catById(d, catId); if (!cat) return;
    var parent = nodeAtPath(cat, parsePath(parentPath)); if (!parent) return;
    var ja = ask('新しいサブフォルダ名（日本語） / New sub-folder (JA):'); if (ja === null) return;
    var en = ask('新しいサブフォルダ名（英語） / New sub-folder (EN):'); if (en === null) return;
    ja = ja.trim(); en = en.trim(); if (!ja && !en) return;
    if (!parent.groups) parent.groups = [];
    parent.groups.push({ name_en: en || ja, name_ja: ja || en, pages: [] });
    commit(d); renderEditor();
  }
  function renameGroup(catId, pathStr) {
    var d = working(), cat = catById(d, catId); if (!cat) return;
    var g = nodeAtPath(cat, parsePath(pathStr)); if (!g || g === cat) return;
    var ja = ask('サブフォルダ名（日本語） / Sub-folder (JA):', g.name_ja); if (ja === null) return;
    var en = ask('サブフォルダ名（英語） / Sub-folder (EN):', g.name_en); if (en === null) return;
    if (ja.trim()) g.name_ja = ja.trim(); if (en.trim()) g.name_en = en.trim();
    commit(d); renderEditor();
  }
  function deleteGroup(catId, pathStr) {
    var d = working(), cat = catById(d, catId); if (!cat) return;
    var path = parsePath(pathStr); if (!path.length) return;
    var parent = nodeAtPath(cat, path.slice(0, -1)); if (!parent || !parent.groups) return;
    var idx = path[path.length - 1], g = parent.groups[idx]; if (!g) return;
    if (!window.confirm('サブフォルダ「' + (g.name_ja || g.name_en) + '」を削除しますか？（中のページはフォルダ直下に戻ります）\nDelete this sub-folder (and any nested ones)? Its pages return to the folder.')) return;
    parent.groups.splice(idx, 1);   // display-only grouping; pages keep their category and fall to the ungrouped list
    commit(d); renderEditor();
  }

  /* ── pages: add placeholder · rename · delete (placeholder only) ──
     bucket 'flat' = category ungrouped; '0' / '0.2' = into that (nested) group. ── */
  function addPage(catId, bucket) {
    var d = working();
    var ja = ask('新しいページ名（日本語） / New page (JA):'); if (ja === null) return;
    var en = ask('新しいページ名（英語） / New page (EN):'); if (en === null) return;
    ja = ja.trim(); en = en.trim(); if (!ja && !en) return;
    var slugs = (d.pages || []).map(function (p) { return p.slug; });
    var suggested = uniqueId(en || ja, slugs);
    var s = ask('URLスラッグ（半角英数・ハイフン） / URL slug:', suggested); if (s === null) return;
    var slug = uniqueId(s || suggested, slugs);
    d.pages.push({
      slug: slug, category: catId, published: false, planned: true,
      title_en: en || ja, title_ja: ja || en, nav_en: en || ja, nav_ja: ja || en, tags: []
    });
    if (bucket && bucket !== 'flat') {
      var cat = catById(d, catId), g = nodeAtPath(cat, parsePath(bucket));
      if (g && g !== cat) { if (!g.pages) g.pages = []; g.pages.push(slug); }
    }
    commit(d); renderEditor();
  }
  function renamePage(slug) {
    var d = working(), p = pageBySlug(d, slug); if (!p) return;
    var ja = ask('ページ名（日本語） / Page name (JA):', p.nav_ja || p.title_ja); if (ja === null) return;
    var en = ask('ページ名（英語） / Page name (EN):', p.nav_en || p.title_en); if (en === null) return;
    if (ja.trim()) { p.title_ja = ja.trim(); p.nav_ja = ja.trim(); }
    if (en.trim()) { p.title_en = en.trim(); p.nav_en = en.trim(); }
    commit(d); renderEditor();
  }
  function deletePage(slug) {
    var d = working(), p = pageBySlug(d, slug); if (!p) return;
    if (!p.planned) { window.alert('実ページ（HTMLあり）はここでは削除できません。準備中のプレースホルダのみ削除できます。\nOnly placeholder (準備中) pages can be deleted here.'); return; }
    if (!window.confirm('プレースホルダ「' + (p.nav_ja || p.title_ja || slug) + '」を削除しますか？ / Delete this placeholder?')) return;
    stripFromGroups(d, slug);
    var i = pageIndex(d, slug); if (i >= 0) d.pages.splice(i, 1);
    commit(d); renderEditor();
  }

  /* ── render helpers ── */
  function L(en, ja) { return '<span class="i18n-en">' + (en || '') + '</span><span class="i18n-ja">' + (ja || '') + '</span>'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function shelfHost() { return document.getElementById('learn-shelf') || document.querySelector('.rail-left'); }
  function curSlug() {
    var b = document.body.getAttribute('data-learn-slug'); if (b) return b;
    var m = location.pathname.replace(/index\.html?$/i, '').replace(/\/+$/, '').match(/\/learn\/(.+)$/);
    return m ? m[1] : '';
  }
  // small icon button carrying a structural action via data-org (handled by onStructClick)
  function actBtn(act, glyph, titleEn, titleJa, o) {
    o = o || {};
    return '<button class="org-act' + (o.cls ? ' ' + o.cls : '') + '" type="button" draggable="false" data-org="' + act + '"' +
      (o.cat != null ? ' data-cat="' + esc(o.cat) + '"' : '') +
      (o.path != null ? ' data-path="' + esc(o.path) + '"' : '') +
      (o.group != null ? ' data-group="' + esc(o.group) + '"' : '') +
      (o.slug != null ? ' data-slug="' + esc(o.slug) + '"' : '') +
      ' title="' + esc(titleJa + ' / ' + titleEn) + '" aria-label="' + esc(titleEn) + '">' + glyph + '</button>';
  }

  fetch('/learn/pages.json').then(function (r) { return r.json(); }).then(function (data) { orig = data; mountUI(); });

  /* ── view switch: "公開版" previews the site as the public sees it ── */
  function viewMode() { return localStorage.getItem('learn-view') === 'published' ? 'published' : 'dev'; }
  function setView(m) {
    if (m === 'published') localStorage.setItem('learn-view', 'published'); else localStorage.removeItem('learn-view');
    location.reload();   // the renderers read the flag at render time
  }
  function pill(cls, glyph, en, ja, onClick) {
    var b = document.createElement('button'); b.className = cls; b.type = 'button';
    b.innerHTML = '<span class="org-pi" aria-hidden="true">' + glyph + '</span> ' + L(en, ja);
    b.addEventListener('click', onClick); document.body.appendChild(b); return b;
  }
  function mountUI() {
    if (viewMode() === 'published') {
      document.body.classList.add('view-published');
      var bar = document.createElement('div'); bar.className = 'org-pubbar';
      bar.innerHTML = '<span class="org-pubbar-lab">' + L('Previewing the published site', '公開版プレビュー中') + '</span>';
      var ex = document.createElement('button'); ex.className = 'org-pubbar-exit'; ex.type = 'button';
      ex.innerHTML = L('Back to dev view', '通常表示に戻る');
      ex.addEventListener('click', function () { setView('dev'); });
      bar.appendChild(ex); document.body.appendChild(bar);
      return;
    }
    if (shelfHost()) pill('org-pill', '<svg class="ti ti-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 10h14l-4 -4M17 14h-14l4 4"/></svg>', 'Organize', '整理', toggle);
    pill('org-viewpill', '◉', 'Preview published', '公開版', function () { setView('published'); });
  }

  function toggle() {
    editing = !editing;
    document.body.classList.toggle('org-on', editing);
    if (editing) renderEditor(); else location.reload();   // exit → normal shelf from the file
  }

  /* ── editable shelf ── */
  function rowHTML(p, cur, catId, groupKey) {
    var lab = L(p.nav_en || p.title_en, p.nav_ja || p.title_ja);
    var ctl = p.planned
      ? '<span class="org-pub org-soon" title="準備中 / no page file yet">–</span>'
      : '<button class="org-pub' + (p.published ? ' is-pub' : '') + '" type="button" draggable="false" data-slug="' + esc(p.slug) +
        '" title="' + (p.published ? '公開中 → クリックで非公開' : '非公開 → クリックで公開') + '">' + (p.published ? '●' : '○') + '</button>';
    var acts = '<span class="org-row-acts">' +
      actBtn('renpage', '<svg class="ti ti-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4M13.5 6.5l4 4"/></svg>', 'Rename', '名前変更', { slug: p.slug }) +
      (p.planned ? actBtn('delpage', '×', 'Delete placeholder', '削除', { slug: p.slug, cls: 'org-act--del' }) : '') +
      '</span>';
    return '<li class="org-row' + (p.slug === cur ? ' is-cur' : '') + '" draggable="true" data-slug="' + esc(p.slug) +
      '" data-cat="' + esc(catId) + '" data-group="' + esc(groupKey) + '">' +
      '<span class="org-grip" aria-hidden="true">⠿</span>' + ctl + '<span class="org-lab">' + lab + '</span>' + acts + '</li>';
  }

  function renderEditor() {
    var host = shelfHost(); if (!host || !orig) return;
    EHOST = host;
    var data = working();
    var CATS = data.categories || [], PAGES = data.pages || [], MAP = {};
    PAGES.forEach(function (p) { MAP[p.slug] = p; });
    var cur = curSlug();
    function inCat(id) { return PAGES.filter(function (p) { return p.category === id; }); }

    // recursive sub-folder render — a group renders its child groups, then its own page list.
    function renderGrp(catId, g, path, placed) {
      var pathStr = path.join('.');
      var sub = '';
      (g.groups || []).forEach(function (cg, ci) { sub += renderGrp(catId, cg, path.concat(ci), placed); });
      var gp = (g.pages || []).map(function (s) { return MAP[s]; }).filter(Boolean);
      gp.forEach(function (p) { placed[p.slug] = 1; });
      var rows = gp.map(function (p) { return rowHTML(p, cur, catId, pathStr); }).join('');
      return '<div class="org-grp" data-cat="' + esc(catId) + '" data-path="' + esc(pathStr) + '"><div class="org-grp-hd">' +
        '<span class="org-grp-name">' + L(g.name_en, g.name_ja) + '</span><span class="org-hd-acts">' +
          actBtn('rengrp', '<svg class="ti ti-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4M13.5 6.5l4 4"/></svg>', 'Rename sub-folder', 'サブフォルダ名変更', { cat: catId, path: pathStr }) +
          actBtn('addgrp', '⊞', 'Add nested sub-folder', 'サブサブフォルダ追加', { cat: catId, path: pathStr }) +
          actBtn('addpage', '＋', 'Add placeholder page', 'プレースホルダ追加', { cat: catId, group: pathStr }) +
          actBtn('delgrp', '×', 'Delete sub-folder', 'サブフォルダ削除', { cat: catId, path: pathStr, cls: 'org-act--del' }) +
        '</span></div>' + sub +
        '<ul class="ashelf-list" data-cat="' + esc(catId) + '" data-group="' + esc(pathStr) + '">' + rows + '</ul></div>';
    }

    var html = '<div class="org-bar">' +
      '<div class="org-bar-hd">' + L('Organize', '整理モード') + ' <span class="org-n" title="changed pages">' + diffCount(data) + '</span></div>' +
      '<div class="org-bar-btns">' +
        '<button class="org-b org-b--accent org-save" type="button">' + L('Save', '保存') + '</button>' +
        '<button class="org-b" data-act="dl" type="button">' + L('Download', '書き出し') + '</button>' +
        '<button class="org-b" data-act="copy" type="button">' + L('Copy', 'コピー') + '</button>' +
        '<button class="org-b" data-act="reset" type="button">' + L('Reset', 'リセット') + '</button>' +
        '<button class="org-b" data-act="done" type="button">' + L('Done', '終了') + '</button>' +
      '</div>' +
      '<p class="org-hint">' + L('Drag a page onto a folder / sub-folder, or above-below another to reorder. ●/○ = published/hidden. <svg class="ti ti-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4M13.5 6.5l4 4"/></svg> rename · ⊞ add (nested) sub-folder · ＋ add placeholder · × delete. Drag to the top/bottom edge to auto-scroll.',
        'ページをフォルダ／サブフォルダへドラッグ、上下で並べ替え。●/○＝公開/非公開。<svg class="ti ti-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4M13.5 6.5l4 4"/></svg>名前変更・⊞サブ（サブ）フォルダ追加・＋プレースホルダ追加・×削除。端へドラッグで自動スクロール。') + '</p>' +
      '</div>';

    // action cluster on a category header (rename · +sub-folder · +page · delete-if-empty)
    function catActs(cat) {
      var a = '<span class="org-hd-acts">';
      a += actBtn('rencat', '<svg class="ti ti-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4M13.5 6.5l4 4"/></svg>', 'Rename folder', 'フォルダ名変更', { cat: cat.id });
      if (cat.id !== 'routes') a += actBtn('addgrp', '⊞', 'Add sub-folder', 'サブフォルダ追加', { cat: cat.id, path: '' });
      a += actBtn('addpage', '＋', 'Add placeholder page', 'プレースホルダ追加', { cat: cat.id, group: 'flat' });
      if (!inCat(cat.id).length) a += actBtn('delcat', '×', 'Delete empty folder', '空フォルダを削除', { cat: cat.id, cls: 'org-act--del' });
      return a + '</span>';
    }

    var routesCat = catById(data, 'routes');
    if (routesCat) {
      html += '<div class="org-zone ashelf-routes" data-cat="routes"><div class="org-zone-hd"><span class="org-zone-name">' +
        L(routesCat.name_en, routesCat.name_ja) + '</span>' + catActs(routesCat) + '</div>' +
        '<ul class="ashelf-list" data-cat="routes" data-group="flat">' +
        inCat('routes').map(function (p) { return rowHTML(p, cur, 'routes', 'flat'); }).join('') + '</ul></div>';
    }
    CATS.forEach(function (cat) {
      if (cat.id === 'routes') return;
      var cp = inCat(cat.id), inner = '', placed = {};
      (cat.groups || []).forEach(function (g, gi) { inner += renderGrp(cat.id, g, [gi], placed); });
      var ung = cp.filter(function (p) { return !placed[p.slug]; });
      inner += '<ul class="ashelf-list org-ungrouped" data-cat="' + cat.id + '" data-group="flat">' +
        ung.map(function (p) { return rowHTML(p, cur, cat.id, 'flat'); }).join('') + '</ul>';
      html += '<div class="org-zone ashelf-pillar" data-cat="' + cat.id + '"><div class="org-zone-hd"><span class="org-zone-name">' +
        L(cat.name_en, cat.name_ja) + '</span>' + catActs(cat) + '</div>' + inner + '</div>';
    });

    html += '<button class="org-addcat" type="button" data-org="addcat">＋ ' + L('New folder', '新規フォルダ') + '</button>';

    host.innerHTML = html;
    wire(host);
  }

  /* ── structural-action click (delegated; NAMED so re-wiring never stacks it) ── */
  function onStructClick(e) {
    var b = e.target.closest && e.target.closest('[data-org]'); if (!b || !EHOST || !EHOST.contains(b)) return;
    e.preventDefault(); e.stopPropagation();
    var act = b.getAttribute('data-org'), cat = b.getAttribute('data-cat'),
        path = b.getAttribute('data-path'), grp = b.getAttribute('data-group'), slug = b.getAttribute('data-slug');
    if (act === 'addcat') addCategory();
    else if (act === 'rencat') renameCategory(cat);
    else if (act === 'delcat') deleteCategory(cat);
    else if (act === 'addgrp') addGroup(cat, path);     // path '' = category, '0'/'0.2' = nested
    else if (act === 'rengrp') renameGroup(cat, path);
    else if (act === 'delgrp') deleteGroup(cat, path);
    else if (act === 'addpage') addPage(cat, grp);      // grp 'flat' or a group path
    else if (act === 'renpage') renamePage(slug);
    else if (act === 'delpage') deletePage(slug);
  }

  function wire(host) {
    // child-element listeners (children are rebuilt each render → fresh, no stacking)
    host.querySelector('.org-save').addEventListener('click', save);
    host.querySelectorAll('.org-bar-btns [data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === 'dl') doDownload();
        else if (a === 'copy') doCopy();
        else if (a === 'reset') { if (confirm('未保存の変更を破棄しますか？ / Discard unsaved changes?')) { clearDraft(); renderEditor(); } }
        else if (a === 'done') toggle();
      });
    });
    host.querySelectorAll('.org-pub[data-slug]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); togglePublished(btn.getAttribute('data-slug')); });
    });
    // host-level listeners — all NAMED, so addEventListener is idempotent across re-renders
    host.addEventListener('click', onStructClick);
    host.addEventListener('dragstart', onDragStart);
    host.addEventListener('dragend', onDragEnd);
    host.addEventListener('dragover', onDragover);
    host.addEventListener('drop', onDrop);
  }

  /* ── drag & drop (pages only) ── */
  function onDragStart(e) {
    var row = e.target.closest && e.target.closest('.org-row'); if (!row) return;
    e.dataTransfer.setData('text/plain', row.getAttribute('data-slug'));
    e.dataTransfer.effectAllowed = 'move'; row.classList.add('org-dragging');
  }
  function onDragEnd() {
    clearMarks(); stopAutoScroll();
    if (EHOST) EHOST.querySelectorAll('.org-dragging').forEach(function (r) { r.classList.remove('org-dragging'); });
  }
  function beforeAfter(e, row) { var r = row.getBoundingClientRect(); return (e.clientY - r.top) < r.height / 2 ? 'before' : 'after'; }
  function clearMarks() {
    if (!EHOST) return;
    EHOST.querySelectorAll('.org-ins-before, .org-ins-after, .org-drop-list, .org-drop').forEach(function (el) {
      el.classList.remove('org-ins-before', 'org-ins-after', 'org-drop-list', 'org-drop');
    });
  }
  function onDragover(e) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; clearMarks(); autoScroll(e);
    var row = e.target.closest && e.target.closest('.org-row');
    if (row) { row.classList.add(beforeAfter(e, row) === 'before' ? 'org-ins-before' : 'org-ins-after'); return; }
    var list = e.target.closest && e.target.closest('.ashelf-list');
    if (list) { list.classList.add('org-drop-list'); return; }
    var grp = e.target.closest && e.target.closest('.org-grp');
    if (grp) { grp.classList.add('org-drop'); return; }
    var zone = e.target.closest && e.target.closest('.org-zone');
    if (zone) zone.classList.add('org-drop');
  }
  function onDrop(e) {
    e.preventDefault(); clearMarks(); stopAutoScroll();
    var slug = e.dataTransfer.getData('text/plain'); if (!slug) return;
    var row = e.target.closest && e.target.closest('.org-row');
    if (row && row.getAttribute('data-slug') !== slug) {
      placePage(slug, { catId: row.getAttribute('data-cat'), groupPath: row.getAttribute('data-group'), anchorSlug: row.getAttribute('data-slug'), position: beforeAfter(e, row) });
      return;
    }
    if (row && row.getAttribute('data-slug') === slug) return;   // dropped on itself
    var list = e.target.closest && e.target.closest('.ashelf-list');
    if (list) { placePage(slug, { catId: list.getAttribute('data-cat'), groupPath: list.getAttribute('data-group'), anchorSlug: null }); return; }
    var grp = e.target.closest && e.target.closest('.org-grp');   // dropped on a sub-folder header/body → into that (possibly nested) group
    if (grp) { placePage(slug, { catId: grp.getAttribute('data-cat'), groupPath: grp.getAttribute('data-path'), anchorSlug: null }); return; }
    var zone = e.target.closest && e.target.closest('.org-zone');
    if (zone) placePage(slug, { catId: zone.getAttribute('data-cat'), groupPath: 'flat', anchorSlug: null });
  }

  /* ── auto-scroll while a drag hovers near the shelf's top/bottom edge ──
     Each dragover scrolls one step immediately (covers pointer movement); a
     timer keeps scrolling while the pointer is held still at the edge. ── */
  var asTimer = null, asEl = null, asStep = 0;
  function stepScroll() { if (asEl) asEl.scrollTop += asStep; else window.scrollBy(0, asStep); }
  function startAutoScroll(el, step) {
    asEl = el; asStep = step; stepScroll();
    if (!asTimer) asTimer = setInterval(function () { if (!asStep) { stopAutoScroll(); return; } stepScroll(); }, 16);
  }
  function stopAutoScroll() { asStep = 0; asEl = null; if (asTimer) { clearInterval(asTimer); asTimer = null; } }
  function autoScroll(e) {
    var EDGE = 54, SPD = 15;
    if (EHOST && EHOST.scrollHeight > EHOST.clientHeight + 4) {     // the shelf is the scroll container
      var r = EHOST.getBoundingClientRect();
      if (e.clientY < r.top + EDGE) { startAutoScroll(EHOST, -SPD); return; }
      if (e.clientY > r.bottom - EDGE) { startAutoScroll(EHOST, SPD); return; }
    } else if (document.documentElement.scrollHeight > window.innerHeight + 4) {   // fallback: scroll the window
      if (e.clientY < EDGE) { startAutoScroll(null, -SPD); return; }
      if (e.clientY > window.innerHeight - EDGE) { startAutoScroll(null, SPD); return; }
    }
    stopAutoScroll();
  }

  /* ── persistence ── */
  function mergedText() { return JSON.stringify(working(), null, 2) + '\n'; }
  function save() {
    if (window.showOpenFilePicker) {
      saveToFile().catch(function (err) {
        if (err && err.name === 'AbortError') return;
        toast('直接保存できません。書き出します / Direct save failed, downloading'); doDownload();
      });
    } else { doDownload(); }
  }
  async function saveToFile() {
    if (!handle) { var picks = await window.showOpenFilePicker({ types: [{ description: 'pages.json', accept: { 'application/json': ['.json'] } }] }); handle = picks[0]; }
    var perm = handle.requestPermission ? await handle.requestPermission({ mode: 'readwrite' }) : 'granted';
    if (perm !== 'granted') throw new Error('permission-denied');
    var w = await handle.createWritable(); await w.write(mergedText()); await w.close();
    clearDraft(); toast('pages.json を保存しました / Saved'); setTimeout(function () { location.reload(); }, 600);
  }
  function doDownload() {
    var blob = new Blob([mergedText()], { type: 'application/json' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'pages.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast('pages.json を書き出し。learn/ に上書きしてください / Downloaded: overwrite learn/pages.json');
  }
  function doCopy() {
    if (navigator.clipboard) navigator.clipboard.writeText(mergedText()).then(function () { toast('コピーしました / Copied'); }, function () { toast('コピー失敗 / Copy failed'); });
    else toast('コピー不可 / Clipboard unavailable');
  }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'org-toast'; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 2800);
  }
})();
