/* ════════════════════════════════════════════════════════════════════════
   proofread.js — in-browser proofreading ("校正") for unpublished Learn pages
   ────────────────────────────────────────────────────────────────────────
   A Word-style "track changes" layer that runs entirely in the browser:

     • Select text → Delete / Replace / Insert / Comment
     • Three view modes:  Markup · Final (hide deletions) · Original
     • Edits auto-save to localStorage (survive reloads, never leave the device)
     • Export → JSON + Markdown that Claude can apply later (see CLAUDE.md)

   Auto-loaded by lang-toggle.js ONLY on unpublished (noindex) /learn/ pages,
   so this code never ships on published pages. Loading it does nothing visible
   until the reviewer opens review mode (launcher pill, ?review URL, or Alt+R).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__pfLoaded) return;
  window.__pfLoaded = true;

  var PATH = location.pathname;
  var SLUG = (PATH.match(/\/learn\/([^/]+)\//) || [])[1] || '';
  if (!SLUG || SLUG === 'dev') return;            // skip the index pages
  var LS_KEY = 'pf:' + PATH;
  var CTX = 55;                                    // chars of context captured

  // Editable text blocks (proofread-able prose) and zones we must never touch.
  var BLOCK_SEL = [
    '.pintro', '.ptop h1',
    '.demo-head h2', '.demo-head p',
    '.demo-stage p', '.demo-stage h3', '.demo-stage h4', '.demo-stage li',
    '.me-prose p', '.me-prose h3', '.me-prose li',
    '.callout p', '.callout li', '.recall p', '.recall li', '.recall summary',
    '.me-cap', 'figcaption', 'blockquote'
  ].join(',');
  var EXCLUDE_SEL = '.pf-ui, .me-controls, .btn-row, .demo-num, .crumb, .lang-btn,' +
    ' button, input, select, textarea, output, label, canvas, svg, .katex,' +
    ' header.site-nav, footer.site-footer, script, style';

  var state = { on: false, view: 'markup', range: null, inputOpen: false, markId: null };
  var ui = {};

  /* ───────────────────────── small helpers ───────────────────────── */
  function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
  function clip(s, n) { s = clean(s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  function escapeHtml(s) { return (s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function qBlock(id) { return document.querySelector('[data-pf-block="' + id + '"]'); }

  function toast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add('is-open');
    clearTimeout(ui.toast._t);
    ui.toast._t = setTimeout(function () { ui.toast.classList.remove('is-open'); }, 2200);
  }

  /* ───────────────────────── range / context ───────────────────────── */
  function elOf(node) { return node && node.nodeType === 3 ? node.parentElement : node; }

  function editableBlockOf(range) {
    var sEl = elOf(range.startContainer), eEl = elOf(range.endContainer);
    if (!sEl || !eEl) return null;
    if (sEl.closest(EXCLUDE_SEL) || eEl.closest(EXCLUDE_SEL)) return null;
    var sB = sEl.closest(BLOCK_SEL), eB = eEl.closest(BLOCK_SEL);
    if (!sB || sB !== eB) return null;             // must stay within one block
    return sB;
  }

  function overlapsMark(range) {
    var block = editableBlockOf(range);
    if (!block) return false;
    var marks = block.querySelectorAll('[data-pf-id]'), i;
    for (i = 0; i < marks.length; i++) { if (rangeIntersectsNode(range, marks[i])) return true; }
    return false;
  }

  function rangeIntersectsNode(range, node) {
    try { return range.intersectsNode(node); } catch (e) { return true; }
  }

  function textOffsetWithin(scope, container, offset) {
    var target = null, targetOffset = 0;
    if (container.nodeType === 3) { target = container; targetOffset = offset; }
    else if (offset < container.childNodes.length) {
      var child = container.childNodes[offset];
      var w0 = document.createTreeWalker(child, NodeFilter.SHOW_TEXT, null);
      target = child.nodeType === 3 ? child : w0.nextNode();
    }
    var total = 0, n, w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    while ((n = w.nextNode())) {
      if (target && n === target) return total + targetOffset;
      total += n.length;
    }
    return total;
  }

  function computeContext(range) {
    var startEl = elOf(range.startContainer);
    var sc = startEl.closest('.i18n-en, .i18n-ja');
    var scope = sc || startEl.closest(BLOCK_SEL) || startEl;
    var lang = sc ? (sc.classList.contains('i18n-en') ? 'en' : 'ja') : '';
    var fullText = scope.textContent || '';
    var start = textOffsetWithin(scope, range.startContainer, range.startOffset);
    var oldText = range.toString();
    var prefix = fullText.slice(Math.max(0, start - CTX), start);
    var suffix = fullText.slice(start + oldText.length, start + oldText.length + CTX);

    var section = '';
    var demo = startEl.closest('.demo');
    if (demo) {
      var num = demo.querySelector('.demo-num .i18n-en') || demo.querySelector('.demo-num');
      var h = demo.querySelector('.demo-head h2 .i18n-en') || demo.querySelector('.demo-head h2');
      if (num) section = clean(num.textContent);
      if (h) section += (section ? ' · ' : '') + clean(h.textContent);
    } else if (startEl.closest('.phead')) { section = 'Intro / Title'; }

    return { lang: lang, oldText: oldText, prefix: prefix, suffix: suffix, section: section };
  }

  /* ───────────────────────── DOM mark creation ───────────────────────── */
  function makeMark(kind, id) {
    var el;
    if (kind === 'del') { el = document.createElement('del'); el.className = 'pf-del'; }
    else if (kind === 'ins') { el = document.createElement('ins'); el.className = 'pf-ins'; }
    else { el = document.createElement('span'); el.className = 'pf-comment'; }
    el.setAttribute('data-pf-id', id);
    el.setAttribute('data-pf-kind', kind);
    return el;
  }

  function setHead(el, type, ctx, opts) {
    opts = opts || {};
    el.setAttribute('data-pf-head', '1');
    el.setAttribute('data-pf-type', type);
    if (ctx.lang) el.setAttribute('data-pf-lang', ctx.lang);
    if (ctx.section) el.setAttribute('data-pf-section', ctx.section);
    if (ctx.prefix) el.setAttribute('data-pf-prefix', ctx.prefix);
    if (ctx.suffix) el.setAttribute('data-pf-suffix', ctx.suffix);
    if (opts.old != null) el.setAttribute('data-pf-old', opts.old);
    if (opts.neww != null) el.setAttribute('data-pf-new', opts.neww);
    if (opts.note != null) el.setAttribute('data-pf-note', opts.note);
  }

  // Wrap every text-node segment inside `range` (clipping the first/last and
  // skipping excluded zones) using the element produced by makeFn().
  function wrapRange(range, makeFn) {
    var root = range.commonAncestorContainer;
    var rootEl = root.nodeType === 3 ? root.parentNode : root;
    var walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!rangeIntersectsNode(range, n)) return NodeFilter.FILTER_REJECT;
        if (n.parentElement && n.parentElement.closest(EXCLUDE_SEL)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);

    var wrappers = [];
    nodes.forEach(function (textNode) {
      var s = (textNode === range.startContainer) ? range.startOffset : 0;
      var e = (textNode === range.endContainer) ? range.endOffset : textNode.length;
      if (e > textNode.length) e = textNode.length;
      if (s >= e) return;
      var target = textNode;
      if (e < target.length) target.splitText(e);
      if (s > 0) target = target.splitText(s);
      var w = makeFn();
      target.parentNode.insertBefore(w, target);
      w.appendChild(target);
      wrappers.push(w);
    });
    return wrappers;
  }

  /* ───────────────────────── edit operations ───────────────────────── */
  function guard(range) {
    if (!range) return false;
    if (!editableBlockOf(range)) { toast('編集できない箇所です / Not an editable text block'); return false; }
    return true;
  }

  // ── core mutations (take an explicit Range; no UI). Reused by the toolbar
  //    handlers and by the public window.proofread.apply API. ──
  function doDelete(range) {
    if (!guard(range)) return false;
    if (overlapsMark(range)) { toast('既存の変更と重なっています / Overlaps an existing change'); return false; }
    var ctx = computeContext(range), id = uid();
    var ws = wrapRange(range, function () { return makeMark('del', id); });
    if (ws.length) setHead(ws[0], 'delete', ctx, { old: ctx.oldText });
    afterEdit(); return true;
  }

  function doReplace(range, val) {
    if (val == null) return false;
    if (!guard(range)) return false;
    if (overlapsMark(range)) { toast('既存の変更と重なっています / Overlaps an existing change'); return false; }
    var ctx = computeContext(range), id = uid();
    var ws = wrapRange(range, function () { return makeMark('del', id); });
    if (!ws.length) return false;
    if (val !== '') {
      var ins = makeMark('ins', id);
      ins.textContent = val;
      ws[ws.length - 1].after(ins);
      setHead(ws[0], 'replace', ctx, { old: ctx.oldText, neww: val });
    } else {
      setHead(ws[0], 'delete', ctx, { old: ctx.oldText });
    }
    afterEdit(); return true;
  }

  function doInsert(range, val) {
    if (val == null || val === '') return false;
    if (!guard(range)) return false;
    var ctx = computeContext(range), id = uid();
    var ins = makeMark('ins', id);
    ins.textContent = val;
    var r = range.cloneRange(); r.collapse(false);
    r.insertNode(ins);
    var pfx = (ctx.prefix + ctx.oldText).slice(-CTX);
    setHead(ins, 'insert', { lang: ctx.lang, section: ctx.section, prefix: pfx, suffix: ctx.suffix },
      { old: ctx.oldText, neww: val });
    afterEdit(); return true;
  }

  function doComment(range, note) {
    if (note == null || note.trim() === '') return false;
    if (!guard(range)) return false;
    if (overlapsMark(range)) { toast('既存の変更と重なっています / Overlaps an existing change'); return false; }
    var ctx = computeContext(range), id = uid();
    var ws = wrapRange(range, function () { return makeMark('comment', id); });
    if (ws.length) setHead(ws[0], 'comment', ctx, { old: ctx.oldText, note: note });
    afterEdit(); return true;
  }

  // ── toolbar handlers: capture the live selection, prompt where needed ──
  function applyDelete() { doDelete(state.range); }
  function applyReplace() {
    var range = state.range; if (!guard(range)) return;
    promptInput('replace', computeContext(range).oldText).then(function (val) { doReplace(range, val); });
  }
  function applyInsert() {
    var range = state.range; if (!guard(range)) return;
    promptInput('insert', computeContext(range).oldText).then(function (val) { doInsert(range, val); });
  }
  function applyComment() {
    var range = state.range; if (!guard(range)) return;
    promptInput('comment', computeContext(range).oldText).then(function (val) { doComment(range, val); });
  }

  function removeEdit(id) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-pf-id="' + id + '"]'), function (el) {
      if (el.getAttribute('data-pf-kind') === 'ins') { el.remove(); return; }
      var p = el.parentNode;
      while (el.firstChild) p.insertBefore(el.firstChild, el);
      p.removeChild(el);
      p.normalize();
    });
    afterEdit();
  }

  function detachMarks() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-pf-id]'), function (el) {
      if (el.getAttribute('data-pf-kind') === 'ins') { el.remove(); return; }
      var p = el.parentNode;
      while (el.firstChild) p.insertBefore(el.firstChild, el);
      p.removeChild(el);
      p.normalize();
    });
  }

  function afterEdit() {
    hidePop(); hideMarkPop();
    var sel = window.getSelection(); if (sel) sel.removeAllRanges();
    renumberComments();
    save();
    renderCounts();
    renderPanel();
  }

  function renumberComments() {
    var i = 0;
    Array.prototype.forEach.call(document.querySelectorAll('[data-pf-head][data-pf-type="comment"]'), function (h) {
      i++; h.setAttribute('data-pf-num', i);
    });
  }

  /* ───────────────────────── persistence ───────────────────────── */
  function assignBlockIds() {
    var blocks = Array.prototype.filter.call(document.querySelectorAll(BLOCK_SEL), function (b) {
      return !b.closest('.pf-ui') && !b.closest('header.site-nav') && !b.closest('footer.site-footer');
    });
    blocks.forEach(function (b, i) {
      if (!b.hasAttribute('data-pf-block')) {
        b.setAttribute('data-pf-block', 'b' + i + '-' + hash(clean(b.textContent).slice(0, 40)));
      }
    });
  }

  function save() {
    var seen = {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-pf-id]'), function (m) {
      var b = m.closest('[data-pf-block]');
      if (b) seen[b.getAttribute('data-pf-block')] = true;
    });
    var blocks = {};
    Object.keys(seen).forEach(function (id) { var b = qBlock(id); if (b) blocks[id] = b.innerHTML; });
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        v: 1, open: state.on, view: state.view, blocks: blocks, updatedAt: new Date().toISOString()
      }));
    } catch (e) {}
  }

  function patchFlag(k, v) {
    try {
      var d = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      d[k] = v; localStorage.setItem(LS_KEY, JSON.stringify(d));
    } catch (e) {}
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; }
  }

  function restore() {
    var data = readStore();
    if (!data || !data.blocks) return;
    Object.keys(data.blocks).forEach(function (id) {
      var b = qBlock(id); if (b) b.innerHTML = data.blocks[id];
    });
    assignBlockIds();   // re-id descendant blocks recreated by innerHTML
  }

  function clearAll() {
    var msg = '校正をすべて削除しますか？ / Discard all proofreading marks?';
    if (!window.confirm(msg)) return;
    detachMarks();
    save();
    renderCounts(); renderPanel();
    toast('校正を消去しました / Cleared');
  }

  /* ───────────────────────── export ───────────────────────── */
  function buildEdits() {
    return Array.prototype.map.call(document.querySelectorAll('[data-pf-head]'), function (h) {
      return {
        type: h.getAttribute('data-pf-type') || 'edit',
        lang: h.getAttribute('data-pf-lang') || '',
        section: h.getAttribute('data-pf-section') || '',
        prefix: h.getAttribute('data-pf-prefix') || '',
        oldText: h.getAttribute('data-pf-old') || '',
        newText: h.getAttribute('data-pf-new') || '',
        comment: h.getAttribute('data-pf-note') || '',
        suffix: h.getAttribute('data-pf-suffix') || ''
      };
    });
  }

  function counts(edits) {
    var c = { delete: 0, replace: 0, insert: 0, comment: 0, total: edits.length };
    edits.forEach(function (e) { if (c[e.type] != null) c[e.type]++; });
    return c;
  }

  function buildJSON(edits) {
    return JSON.stringify({
      schema: 'yumigeta-proofread/v1',
      page: PATH, slug: SLUG, title: document.title,
      generatedAt: new Date().toISOString(),
      summary: counts(edits),
      edits: edits
    }, null, 2);
  }

  function buildMarkdown(edits) {
    var L = [];
    L.push('# 校正 / Proofreading — ' + (document.title || SLUG));
    L.push('');
    L.push('Page: `' + PATH + '`  ·  ' + new Date().toLocaleString());
    L.push('');
    if (!edits.length) { L.push('_(no changes)_'); return L.join('\n'); }
    var cur = null;
    edits.forEach(function (e) {
      if (e.section !== cur) { cur = e.section; L.push(''); L.push('## ' + (cur || '—')); }
      var lang = e.lang ? ' (' + e.lang.toUpperCase() + ')' : '';
      var ctx = ' · ctx: "…' + e.prefix + '⟦' + e.oldText + '⟧' + e.suffix + '…"';
      if (e.type === 'delete') L.push('- **DELETE' + lang + '** ~~' + e.oldText + '~~' + ctx);
      else if (e.type === 'replace') L.push('- **REPLACE' + lang + '** ~~' + e.oldText + '~~ → **' + e.newText + '**' + ctx);
      else if (e.type === 'insert') L.push('- **INSERT' + lang + '** after "…' + e.prefix + '" → **' + e.newText + '**');
      else if (e.type === 'comment') L.push('- **COMMENT' + lang + '** on "' + e.oldText + '" → ' + e.comment + ctx);
    });
    L.push('');
    return L.join('\n');
  }

  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('コピーしました / Copied'); },
        function () { toast('コピーできません / Copy failed'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('コピーしました / Copied'); } catch (e) {}
      ta.remove();
    }
  }

  function doExport() {
    var edits = buildEdits();
    var jsonStr = buildJSON(edits);
    var mdStr = buildMarkdown(edits);
    ui.card.innerHTML =
      '<h2><span class="i18n-en">Export review</span><span class="i18n-ja">校正を書き出し</span></h2>' +
      '<p><span class="i18n-en">' + edits.length + ' change(s). Two ways to hand them to Claude:</span>' +
      '<span class="i18n-ja">変更 ' + edits.length + ' 件。Claude に渡す方法は2通り：</span></p>' +
      '<p>① <span class="i18n-en">Save the JSON as</span><span class="i18n-ja">JSONを次の名前で保存：</span> ' +
      '<code>learn/_reviews/' + SLUG + '.json</code>, ' +
      '<span class="i18n-en">commit it, then tell Claude &ldquo;apply the review for ' + SLUG + '&rdquo;.</span>' +
      '<span class="i18n-ja">コミットして「' + SLUG + ' の校正を反映して」と伝える。</span></p>' +
      '<p>② <span class="i18n-en">Or just paste the Markdown below into the chat.</span>' +
      '<span class="i18n-ja">または下の Markdown をチャットに貼り付ける。</span></p>' +
      '<div class="pf-field-lab"><span>JSON</span><button class="pf-btn" data-copy="json">' +
      '<span class="i18n-en">Copy</span><span class="i18n-ja">コピー</span></button></div>' +
      '<textarea readonly data-ta="json"></textarea>' +
      '<div class="pf-field-lab"><span>Markdown</span><button class="pf-btn" data-copy="md">' +
      '<span class="i18n-en">Copy</span><span class="i18n-ja">コピー</span></button></div>' +
      '<textarea readonly data-ta="md"></textarea>' +
      '<div class="pf-modal-foot">' +
      '<button class="pf-btn" data-copy="dl"><span class="i18n-en">Download .json</span><span class="i18n-ja">.json をダウンロード</span></button>' +
      '<button class="pf-btn pf-btn--accent" data-mc="close">OK</button></div>';
    ui.card.querySelector('[data-ta="json"]').value = jsonStr;
    ui.card.querySelector('[data-ta="md"]').value = mdStr;
    ui._exp = { json: jsonStr, md: mdStr };   // read by the card click handler
    ui.modal.classList.add('is-open');
  }

  // single, persistent handler for the export/help modal card (bound in buildUI)
  function onCardClick(ev) {
    var b = ev.target.closest('[data-copy],[data-mc]');
    if (!b) return;
    if (b.getAttribute('data-mc') === 'close') { ui.modal.classList.remove('is-open'); return; }
    var which = b.getAttribute('data-copy');
    if (!ui._exp) return;
    if (which === 'json') copyText(ui._exp.json);
    else if (which === 'md') copyText(ui._exp.md);
    else if (which === 'dl') download('proofread-' + SLUG + '-' + stamp() + '.json', ui._exp.json);
  }

  function stamp() {
    var d = new Date(), p = function (x) { return ('0' + x).slice(-2); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  function showHelp() {
    ui.card.innerHTML =
      '<h2><span class="i18n-en">Proofreading — how to</span><span class="i18n-ja">校正の使い方</span></h2>' +
      '<ul class="pf-help-list">' +
      '<li><span class="i18n-en"><b>Select text</b> in the article, then pick <b>Delete / Replace / Insert / Comment</b>.</span>' +
      '<span class="i18n-ja"><b>本文を選択</b>し、<b>削除 / 置換 / 挿入 / コメント</b>を選ぶ。</span></li>' +
      '<li><span class="i18n-en"><b>Insert</b> adds text right after the selected anchor word.</span>' +
      '<span class="i18n-ja"><b>挿入</b>は選択した語の直後にテキストを追加する。</span></li>' +
      '<li><span class="i18n-en"><b>Click a mark</b> to remove that single change.</span>' +
      '<span class="i18n-ja"><b>マークをクリック</b>すると、その変更だけ取り消せる。</span></li>' +
      '<li><span class="i18n-en"><b>View:</b> Markup shows everything · Final hides deletions (what it looks like after applying) · Original hides insertions.</span>' +
      '<span class="i18n-ja"><b>表示：</b>校正記号＝すべて表示／反映後＝削除を隠す（適用後の見た目）／元＝挿入を隠す。</span></li>' +
      '<li><span class="i18n-en">Edits auto-save in this browser. <b>Export</b> to hand them to Claude.</span>' +
      '<span class="i18n-ja">編集はこのブラウザに自動保存。<b>書き出し</b>で Claude に渡す。</span></li>' +
      '<li><span class="i18n-en">Shortcut: <b>Alt+R</b> toggles review mode.</span>' +
      '<span class="i18n-ja">ショートカット：<b>Alt+R</b> で校正モードを切替。</span></li>' +
      '</ul>' +
      '<div class="pf-modal-foot"><button class="pf-btn pf-btn--accent" data-mc="close">OK</button></div>';
    ui._exp = null;                            // help has no export payload
    ui.modal.classList.add('is-open');
  }

  /* ───────────────────────── inline input ───────────────────────── */
  function promptInput(kind, anchor) {
    return new Promise(function (resolve) {
      state.inputOpen = true;
      hidePop();
      var lab = ui.input.querySelector('.pf-input-lab');
      var fieldWrap = ui.input.querySelector('.pf-input-field');
      fieldWrap.innerHTML = '';
      var field = document.createElement(kind === 'comment' ? 'textarea' : 'input');
      if (kind !== 'comment') field.type = 'text';
      fieldWrap.appendChild(field);

      var labels = {
        replace: ['Replace with…', '置換後のテキスト'],
        insert: ['Insert after the selection…', '選択の直後に挿入'],
        comment: ['Comment…', 'コメント']
      }[kind];
      lab.innerHTML = '<span class="i18n-en">' + labels[0] + '</span><span class="i18n-ja">' + labels[1] + '</span>' +
        (anchor ? ' <b>“' + escapeHtml(clip(anchor, 40)) + '”</b>' : '');
      if (kind === 'replace') field.value = anchor || '';

      var rect = state.range ? state.range.getBoundingClientRect()
        : { top: 90, bottom: 100, left: window.innerWidth / 2, width: 0 };
      place(ui.input, rect, { below: true });
      field.focus(); if (field.select) field.select();

      var okBtn = ui.input.querySelector('[data-iop="ok"]');
      var cancelBtn = ui.input.querySelector('[data-iop="cancel"]');
      function done(val) {
        state.inputOpen = false;
        ui.input.classList.remove('is-open');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        field.removeEventListener('keydown', onKey);
        document.removeEventListener('mousedown', onOutside, true);
        resolve(val);
      }
      function onOk() { done(field.value); }
      function onCancel() { done(null); }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); done(null); }
        else if (e.key === 'Enter' && (kind !== 'comment' || e.metaKey || e.ctrlKey)) { e.preventDefault(); done(field.value); }
      }
      function onOutside(e) { if (!ui.input.contains(e.target)) done(null); }
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      field.addEventListener('keydown', onKey);
      setTimeout(function () { document.addEventListener('mousedown', onOutside, true); }, 0);
    });
  }

  /* ───────────────────────── floating popovers ───────────────────────── */
  function place(elem, rect, opts) {
    opts = opts || {};
    elem.style.visibility = 'hidden';
    elem.classList.add('is-open');
    var ew = elem.offsetWidth, eh = elem.offsetHeight, top, left;
    top = opts.below ? rect.bottom + 8 : rect.top - eh - 8;
    if (top < 8) top = rect.bottom + 8;
    if (top + eh > window.innerHeight - 8) top = Math.max(8, window.innerHeight - eh - 8);
    left = rect.left + rect.width / 2 - ew / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - ew - 8));
    elem.style.top = top + 'px';
    elem.style.left = left + 'px';
    elem.style.visibility = '';
  }
  function hidePop() { ui.pop.classList.remove('is-open'); }
  function hideMarkPop() { ui.markpop.classList.remove('is-open'); state.markId = null; }

  function onSelChange() {
    if (!state.on || state.inputOpen) return;
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !sel.toString().trim()) { hidePop(); return; }
    var range = sel.getRangeAt(0);
    if (!editableBlockOf(range) || overlapsMark(range)) { hidePop(); return; }
    state.range = range.cloneRange();
    place(ui.pop, range.getBoundingClientRect(), { below: false });
  }

  /* ───────────────────────── side panel (comments) ───────────────────────── */
  function renderPanel() {
    var body = ui.panel.querySelector('.pf-panel-body');
    var heads = document.querySelectorAll('[data-pf-head][data-pf-type="comment"]');
    body.innerHTML = '';
    if (!heads.length) {
      var empty = document.createElement('div');
      empty.className = 'pf-panel-empty';
      empty.innerHTML = '<span class="i18n-en">No comments yet.</span><span class="i18n-ja">コメントはまだありません。</span>';
      body.appendChild(empty);
      return;
    }
    Array.prototype.forEach.call(heads, function (h, i) {
      var card = document.createElement('div');
      card.className = 'pf-cmt';
      card.setAttribute('data-target', h.getAttribute('data-pf-id'));
      var num = document.createElement('span'); num.className = 'pf-cmt-num'; num.textContent = i + 1;
      var quote = document.createElement('span'); quote.className = 'pf-cmt-quote';
      quote.textContent = '“' + clip(h.getAttribute('data-pf-old') || '', 60) + '”';
      var note = document.createElement('div'); note.className = 'pf-cmt-note';
      note.textContent = h.getAttribute('data-pf-note') || '';
      var top = document.createElement('div'); top.appendChild(num); top.appendChild(quote);
      card.appendChild(top); card.appendChild(note);
      card.addEventListener('click', function () { jumpTo(h.getAttribute('data-pf-id')); });
      body.appendChild(card);
    });
  }

  function jumpTo(id) {
    var el = document.querySelector('[data-pf-id="' + id + '"]');
    if (!el) return;
    setView('markup');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('pf-flash');
    setTimeout(function () { el.classList.remove('pf-flash'); }, 1200);
  }

  /* ───────────────────────── counts / view ───────────────────────── */
  function renderCounts() {
    var c = counts(buildEdits());
    ui.count.innerHTML = '✕<b>' + c.delete + '</b> ⇄<b>' + c.replace + '</b> ＋<b>' + c.insert + '</b> 💬<b>' + c.comment + '</b>';
  }

  function setView(v) {
    state.view = v;
    document.body.setAttribute('data-pf-view', v);
    Array.prototype.forEach.call(ui.bar.querySelectorAll('.pf-view button'), function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === v);
    });
    patchFlag('view', v);
  }

  /* ───────────────────────── open / close ───────────────────────── */
  function open() {
    if (state.on) return;
    state.on = true;
    document.body.classList.add('pf-on');
    ui.bar.style.display = 'flex';
    assignBlockIds();
    restore();
    renumberComments();
    var data = readStore();
    setView((data && data.view) || state.view || 'markup');
    renderCounts();
    renderPanel();
    patchFlag('open', true);
  }

  function close() {
    if (!state.on) return;
    save();                 // persist marks first
    patchFlag('open', false);
    detachMarks();          // clean the page for normal viewing
    state.on = false;
    document.body.classList.remove('pf-on');
    document.body.removeAttribute('data-pf-view');
    ui.bar.style.display = 'none';
    ui.panel.classList.remove('is-open');
    hidePop(); hideMarkPop();
  }

  /* ───────────────────────── build UI ───────────────────────── */
  function buildUI() {
    var wrap = document.createElement('div');
    wrap.className = 'pf-ui';
    wrap.innerHTML =
      '<button class="pf-launch pf-ui" type="button" aria-label="Proofread / 校正">' +
      '<span class="pf-pen"><svg class="ti ti-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4M13.5 6.5l4 4"/></svg></span><span class="i18n-en">Review</span><span class="i18n-ja">校正</span></button>' +

      '<div class="pf-bar pf-ui" style="display:none">' +
      '<span class="pf-title"><span class="pf-pen"><svg class="ti ti-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4M13.5 6.5l4 4"/></svg></span>' +
      '<span class="pf-title-en i18n-en">Review</span><span class="pf-title-ja i18n-ja">校正</span></span>' +
      '<div class="pf-view">' +
      '<button type="button" data-view="markup"><span class="i18n-en">Markup</span><span class="i18n-ja">校正記号</span></button>' +
      '<button type="button" data-view="final"><span class="i18n-en">Final</span><span class="i18n-ja">反映後</span></button>' +
      '<button type="button" data-view="original"><span class="i18n-en">Original</span><span class="i18n-ja">元</span></button>' +
      '</div>' +
      '<span class="pf-count"></span>' +
      '<span class="pf-spacer"></span>' +
      '<button class="pf-btn" type="button" data-act="comments">💬 <span class="i18n-en">Comments</span><span class="i18n-ja">コメント</span></button>' +
      '<button class="pf-btn" type="button" data-act="help" aria-label="Help">?</button>' +
      '<button class="pf-btn" type="button" data-act="clear"><span class="i18n-en">Clear</span><span class="i18n-ja">全消去</span></button>' +
      '<button class="pf-btn pf-btn--accent" type="button" data-act="export"><span class="i18n-en">Export</span><span class="i18n-ja">書き出し</span></button>' +
      '<button class="pf-btn" type="button" data-act="close">✕ <span class="i18n-en">Done</span><span class="i18n-ja">終了</span></button>' +
      '</div>' +

      '<div class="pf-pop pf-ui">' +
      '<button type="button" data-op="delete"><span class="i18n-en">Delete</span><span class="i18n-ja">削除</span></button>' +
      '<button type="button" data-op="replace"><span class="i18n-en">Replace</span><span class="i18n-ja">置換</span></button>' +
      '<button type="button" data-op="insert"><span class="i18n-en">Insert</span><span class="i18n-ja">挿入</span></button>' +
      '<button type="button" data-op="comment"><span class="i18n-en">Comment</span><span class="i18n-ja">コメント</span></button>' +
      '</div>' +

      '<div class="pf-markpop pf-ui">' +
      '<button type="button" data-mop="remove"><span class="i18n-en">Remove</span><span class="i18n-ja">取消</span></button>' +
      '</div>' +

      '<div class="pf-input pf-ui">' +
      '<div class="pf-input-lab"></div><div class="pf-input-field"></div>' +
      '<div class="pf-input-row">' +
      '<button class="pf-btn" type="button" data-iop="cancel"><span class="i18n-en">Cancel</span><span class="i18n-ja">取消</span></button>' +
      '<button class="pf-btn pf-btn--accent" type="button" data-iop="ok">OK</button>' +
      '</div></div>' +

      '<aside class="pf-panel pf-ui">' +
      '<div class="pf-panel-hd"><span><span class="i18n-en">Comments</span><span class="i18n-ja">コメント</span></span>' +
      '<button class="pf-x" type="button" data-act="comments-close" aria-label="Close">×</button></div>' +
      '<div class="pf-panel-body"></div></aside>' +

      '<div class="pf-modal pf-ui"><div class="pf-card"></div></div>' +
      '<div class="pf-toast pf-ui"></div>';
    document.body.appendChild(wrap);

    ui.launch = wrap.querySelector('.pf-launch');
    ui.bar = wrap.querySelector('.pf-bar');
    ui.pop = wrap.querySelector('.pf-pop');
    ui.markpop = wrap.querySelector('.pf-markpop');
    ui.input = wrap.querySelector('.pf-input');
    ui.panel = wrap.querySelector('.pf-panel');
    ui.modal = wrap.querySelector('.pf-modal');
    ui.card = wrap.querySelector('.pf-card');
    ui.toast = wrap.querySelector('.pf-toast');
    ui.count = wrap.querySelector('.pf-count');

    // keep selection alive when interacting with the popovers
    [ui.pop, ui.markpop].forEach(function (p) { p.addEventListener('mousedown', function (e) { e.preventDefault(); }); });

    ui.launch.addEventListener('click', open);

    ui.bar.addEventListener('click', function (e) {
      var v = e.target.closest('[data-view]');
      if (v) { setView(v.getAttribute('data-view')); return; }
      var a = e.target.closest('[data-act]');
      if (!a) return;
      var act = a.getAttribute('data-act');
      if (act === 'close') close();
      else if (act === 'export') doExport();
      else if (act === 'help') showHelp();
      else if (act === 'clear') clearAll();
      else if (act === 'comments') ui.panel.classList.toggle('is-open');
    });

    ui.panel.addEventListener('click', function (e) {
      if (e.target.closest('[data-act="comments-close"]')) ui.panel.classList.remove('is-open');
    });

    ui.pop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-op]'); if (!b) return;
      var op = b.getAttribute('data-op');
      hidePop();
      if (op === 'delete') applyDelete();
      else if (op === 'replace') applyReplace();
      else if (op === 'insert') applyInsert();
      else if (op === 'comment') applyComment();
    });

    ui.markpop.addEventListener('click', function (e) {
      if (e.target.closest('[data-mop="remove"]') && state.markId) { removeEdit(state.markId); hideMarkPop(); }
    });

    ui.card.addEventListener('click', onCardClick);
    ui.modal.addEventListener('click', function (e) { if (e.target === ui.modal) ui.modal.classList.remove('is-open'); });
  }

  /* ───────────────────────── global listeners ───────────────────────── */
  function bindGlobal() {
    var t;
    document.addEventListener('selectionchange', function () {
      clearTimeout(t); t = setTimeout(onSelChange, 120);
    });
    document.addEventListener('mouseup', function () { setTimeout(onSelChange, 0); });

    // click an existing mark → offer to remove it
    document.addEventListener('click', function (e) {
      if (!state.on) return;
      if (e.target.closest('.pf-ui')) return;
      var mark = e.target.closest('[data-pf-id]');
      if (mark) {
        e.preventDefault();
        state.markId = mark.getAttribute('data-pf-id');
        place(ui.markpop, mark.getBoundingClientRect(), { below: true });
      } else { hideMarkPop(); }
    });

    window.addEventListener('scroll', function () { hidePop(); hideMarkPop(); }, true);

    document.addEventListener('keydown', function (e) {
      if (e.altKey && (e.key === 'r' || e.key === 'R')) { e.preventDefault(); state.on ? close() : open(); return; }
      if (e.key === 'Escape') {
        if (ui.modal.classList.contains('is-open')) ui.modal.classList.remove('is-open');
        else { hidePop(); hideMarkPop(); }
      }
    });
  }

  /* ───────────────────────── init ───────────────────────── */
  function init() {
    buildUI();
    bindGlobal();
    var data = readStore();
    var wantOpen = (data && data.open) || /[?&](review|proofread|校正)\b/.test(location.search);
    if (wantOpen) open();
  }

  // Public automation API (dev pages only). Lets you script the reviewer, and
  // is what the test-suite drives. `apply.*` take an explicit DOM Range.
  window.proofread = {
    open: open, close: close, clear: clearAll, view: setView,
    exportNow: doExport, help: showHelp,
    edits: buildEdits,
    toJSON: function () { return buildJSON(buildEdits()); },
    toMarkdown: function () { return buildMarkdown(buildEdits()); },
    remove: removeEdit, save: save, restore: restore,
    apply: { del: doDelete, replace: doReplace, insert: doInsert, comment: doComment }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
