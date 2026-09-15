# yumigeta.github.io — Claude Code guide

## Repository overview

Personal academic website for Kentaro Yumigeta (University of Arizona).
Static HTML/CSS/JS, no framework. Public Learn pages are generated from the
existing bilingual sources with python tools/build_site.py; validate with
python tools/validate_site.py. Publish _site/, not the source tree.
See README.md. Merges to main automatically build, validate, and publish via GitHub Actions.

### Japanese terminology (user decision, 2026-09-11)

In Japanese text throughout the site, write 強結合近似 for tight binding.
Use this term in article prose, headings, page titles, navigation, metadata,
and figure labels. Do not use TB, tight-binding, タイトバインディング,
or 強束縛近似 as the Japanese name. The Japanese graphene page title is
グラフェンの強結合近似. Keep English terminology and URL/code identifiers
unchanged.

### Site titles (user decision, 2026-09-06)

Use one self-contained title per page throughout the site. Do not append a
subtitle with a dash, colon, or a separate tagline. Keep the visible page title,
browser title, social title metadata, structured page name, and Learn registry
consistent. The home page title is `Kentaro Yumigeta`; the graphene TB page's
English title is `Tight-Binding Model of Graphene`. Hyphens within scientific
terms (such as Tight-Binding) are part of the term, not subtitle separators.

- `index.html` — main landing page
- `learn/` — interactive Learn explainer pages (one subdirectory per topic)
- `publications/` — publications list
- `assets/css/style.css` — **global stylesheet** (shared by every page)
- `assets/js/lang-toggle.js` — EN/JA language toggle (loaded on every page)
- `assets/js/analytics.js` — analytics (loaded on every page)

---

## Learn information architecture — module pool + routes + handbook

Learn is a **module pool for non-linear readers** (most arrive from search to a
single page), not a linear course. Adopted from a design tournament (2026-06-22):
**flat-URL module pool + a few theme routes + an independent measurement/analysis
handbook.** Pages are **typed and kept to one question each**; a few **routes**
thread them into guided paths; measurement/analysis lives in its **own handbook**,
never embedded in the theory pages. Fully data-driven.

**Single source of truth: `learn/pages.json`.**
- `categories[]` — the four content groups, in order: `routes`, `concepts`
  (displayed **"How Matter Works" / 物質のしくみ**), `themes`, `handbook` (each: `name_en/ja`,
  `num`, `color`). `concepts` & `themes` also carry **`groups[]`** —
  `{name_en, name_ja, pages:[slugs]}` — the **left-shelf accordion** sub-grouping.
  **This `groups[]` array is the one place to edit shelf grouping**: a slug may
  appear in several groups (a page can sit in more than one); pages in a category
  but in no group fall into a trailing ungrouped list; editing groups is
  display-only and never moves a URL or file. `routes` and `handbook` define no
  `groups` (rendered flat). The full-index page `all` is a separate safety-valve,
  **not** a category.
- `pages[]` — every Learn page, keyed by `slug`. Fields: `slug`, `category`,
  `published`, `planned` (optional; `true` → render as a non-link 準備中
  placeholder, no HTML file yet), `title_en/ja`, plus page-type metadata:
  `layoutType` (`route|concept|theme|handbook`), `color`
  (`foundation|material|optical|device|reference|frontier|hub` — a **per-page
  accent**, orthogonal to category), `nav_en/ja` (short shelf label),
  `level_en/ja`, `readingTime_en/ja`, `summary_en/ja`, `theme[]`,
  `prerequisites[]` (slugs), `basicsUsed[]` (`{label_en,label_ja}`),
  `referenceLinks[]` (slugs), `nextLinks{theory,application,experiment,frontier}`
  (slugs), `usedBy[]` (slugs), `tags[]`. Cross-references are **slugs**, resolved
  at render time — never hard-code titles.

**The five page types** (型). Every page is exactly one:

| type | category | what it is |
|---|---|---|
| `route`    | `routes`   | a guide that orders pages into a path (formerly "hubs") |
| `concept`  | `concepts` | one question = one idea — crystals, electronic states, **optical response incl. Raman theory** (was foundations) |
| `theme`    | `themes`   | a material / phenomenon / device (materials + devices + frontier) |
| `handbook` | `handbook` | the measurement & analysis *HOW*: error, noise/SNR, accumulation, peak-fitting, angle-resolved Raman (was reference) |
| `index`    | —          | the `all` full-index page only |

**`assets/js/article-shell.js` + `assets/css/article-shell.css`** turn any page
into the 3-column layout **without editing its body**: left = the shelf (below),
center = the existing page, right = a deliberately **recessive** navboard limited
to **前提 (prerequisites) · 目次 (this-page TOC) · 次に読む (read-next)** — lighter
than the body, no rules/boxes, sticky with scroll-spy, and the reading column
keeps priority width (`--rail-w-r` is thin). basics/ref/usedBy/tags stay in the
data and on `all`, off the reading surface. If the navboard would be empty the
right column is dropped (`.no-right`). It also injects an end-of-article "次に読む"
card (except on `route` pages) and builds the TOC from headings. **Narrow
screens**: the right rail is hidden and one collapsible TOC (`.mobile-toc`, starts
closed) is dropped at the top of the content. Published pages link only to other
**published** pages (no dev leakage).

**Left shelf — `routes` (compact, always-on top, never collapses) + a 2-level
accordion** of the three content pillars (How Matter Works / Materials & Devices /
Lab & Analysis Handbook). Pillars and their `groups[]` are collapsible
`<details>`; **pillars start open**, while groups start closed except the one
holding the current page — so the structure shows at a glance but leaf pages stay
tucked in collapsed groups (the shelf stays short however many pages exist).
`planned` pages
render as muted, non-link "準備中" rows. Re-arrange it by editing
`categories[].groups` in pages.json — never the template (both `article-shell.js`
and `learn-index.js` read it).

**To add the shell to a page** (3 edits, nothing else):
1. `<head>`: add `<link rel="stylesheet" href="/assets/css/article-shell.css">`
   after the page-specific CSS (before the katex link).
2. `<body data-learn-slug="<slug>">`.
3. Before the page's own `<script src="/assets/js/<page>.js">`, add
   `<script src="/assets/js/article-shell.js"></script>` (so it wraps the DOM
   before the page's canvas-sizing JS runs).
Then add/extend the page's entry in `learn/pages.json`.

**Routes** live in `learn/hubs/<theme>/` (slug `hubs/<theme>`, kept for URL
stability — these are the four theme routes) plus the site guide `learn/start/`
(slug `start`). A route body is a `.callout` question + numbered `.route` sections
(`.route-steps` of links to pages). The shell adds the route navboard
automatically. The **full index** is `learn/all/` + `assets/js/learn-all.js`
(reads pages.json; browse by category / name / tag). It is **not** a pages.json
entry; link to it explicitly.

**Category accent colors** (always paired with a text label): foundation=blue
(concepts), material=green (themes), optical=purple (Raman/laser/optics),
device=orange, reference=gray (handbook), frontier=magenta, hub=vermilion
(routes). `color` is a **per-page** accent (set per page); the shelf-group accent
follows the category (routes=vermilion, concepts=blue, themes=green,
handbook=gray) via `.ashelf-group[data-cat=…]` in article-shell.css.

**Tags — controlled vocabulary.** Each page's first tag is a **kind tag**
(`#Route` / `#Concept` / `#Theme` / `#Handbook`) matching its category; the rest
are controlled **topic tags** (CamelCase, e.g. `#Graphene`, `#BrillouinZone`,
`#Raman`). No free text, consistent casing, never the primary navigation — the
`all` page filters by these.

**Cross-link checklist** (前提 / 横道 / 次の問い). When prose links to another
page, carry its essence in one line first — don't dump a bare "詳しくはこちら".
Wire the relationship in pages.json too: `prerequisites[]` (前提),
`referenceLinks[]` (横道 = the handbook), `nextLinks{}` (次の問い), and the reverse
`usedBy[]`.

**Planned pages** (`"planned": true`) carry a full pages.json entry (so the IA and
cross-links stay complete) but have **no HTML file** — they render as muted,
non-link "準備中 / coming soon" rows in the shelf, navboard, landing, and `all`.
To build one: write its HTML, then drop the `planned` flag.

---

## Learn pages — canonical design

**Reference implementation: `learn/measurement-error/index.html`**
Use this file as the exact template whenever creating a new Learn page.
Do NOT invent a new layout; copy the structure from this reference.

### Required CSS/JS in `<head>` (minimum)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/[page-name].css">   <!-- page-specific CSS -->
<link rel="stylesheet" href="/assets/css/gnr-variants.css">
<link rel="stylesheet" href="/assets/vendor/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]});"></script>
<script src="/assets/js/analytics.js"></script>
```

### Required `<body>` structure (in this exact order)

```html
<body>
  <script src="/assets/js/lang-toggle.js"></script>

  <!-- 1. Navigation -->
  <header class="site-nav">
    <div class="nav">
      <a class="brand" href="/" aria-label="Kentaro Yumigeta — home">
        <img class="seal-img" src="/assets/img/hanko-seal.png" alt="Kentaro Yumigeta">
      </a>
      <nav class="links">
        <a href="/#news"><span class="i18n-en">News</span><span class="i18n-ja">ニュース</span></a>
        <a href="/#research"><span class="i18n-en">Research</span><span class="i18n-ja">研究</span></a>
        <a href="/#publications"><span class="i18n-en">Publications</span><span class="i18n-ja">論文</span></a>
        <a href="/#learn" aria-current="page"><span class="i18n-en">Learn</span><span class="i18n-ja">基礎から学ぶ</span></a>
        <a href="/#cv">CV</a>
      </nav>
      <a class="end" href="/#contact"><span class="i18n-en">Contact</span><span class="i18n-ja">連絡先</span></a>
    </div>
  </header>

  <!-- 2. Page header with breadcrumb + title + intro -->
  <div class="phead">
    <div class="container">
      <div class="phead-top">
        <div class="crumb">
          <a href="/">Home</a><span class="sep">/</span>
          <a href="/learn/"><span class="i18n-en">Learn</span><span class="i18n-ja">基礎から学ぶ</span></a><span class="sep">/</span>
          <span><span class="i18n-en">[Topic EN]</span><span class="i18n-ja">[Topic JA]</span></span>
        </div>
        <button class="lang-btn" aria-label="Switch language / 言語切替">
          <span class="l-en">EN</span><span class="l-sep">/</span><span class="l-ja">日本語</span>
        </button>
      </div>
      <div class="ptop">
        <h1><span class="i18n-en">[Title EN]</span><span class="i18n-ja">[Title JA]</span></h1>
      </div>
      <p class="pintro">
        <span class="i18n-en">...</span>
        <span class="i18n-ja">...</span>
      </p>
    </div>
  </div>

  <!-- 3. Content sections — repeat as needed -->
  <section class="demo">
    <div class="demo-head">
      <span class="demo-num"><span class="i18n-en">00 — [section label EN]</span><span class="i18n-ja">00 — [section label JA]</span></span>
      <h2><span class="i18n-en">[heading EN]</span><span class="i18n-ja">[heading JA]</span></h2>
      <p><span class="i18n-en">...</span><span class="i18n-ja">...</span></p>
    </div>
    <div class="demo-stage">
      <!-- prose: .me-prose > p / h3 -->
      <!-- interactive card: .anim-card.pv-bunchin.mat-sunezu -->
    </div>
  </section>

  <!-- 4. Back link -->
  <div class="backrow">
    <div class="container">
      <a class="back-home" href="/learn/">
        <span class="i18n-en">&larr; Back to Learn</span>
        <span class="i18n-ja">&larr; 基礎から学ぶ に戻る</span>
      </a>
    </div>
  </div>

  <!-- 5. Footer -->
  <footer class="site-footer">
    <div class="foot">
      <span class="foot-l">&copy; 2026 Kentaro Yumigeta</span>
      <img class="hanko" src="/assets/img/hanko-seal.png" alt="" aria-hidden="true">
    </div>
  </footer>

  <!-- 6. Page JS -->
  <script src="/assets/js/[page-name].js"></script>
</body>
```

### Key CSS classes (defined in `style.css` and `measurement-error.css`)

| Class | Purpose |
|---|---|
| `.demo` | Outer section wrapper; `max-width: var(--maxw)`; has top border after first |
| `.demo-head` | Section title area (number + h2 + intro paragraph) |
| `.demo-stage` | Content area — transparent bg on measurement-error, dark `#1b1711` by default |
| `.demo-num` | Small red label above h2 (e.g. "00 — What is…") |
| `.anim-card.pv-bunchin.mat-sunezu` | Dark interactive card (`background: #1b1711`) |
| `.me-prose` | Prose block inside `.demo-stage`; `p` and `h3` styled |
| `.me-prose h3` | Serif section subheading with bottom border |
| `.me-controls` | Flex container for sliders/inputs |
| `.me-slider` | One slider row: label + `<input type="range">` + `<output>` |
| `.me-stats` | Row of stat tiles |
| `.me-stat` | Individual stat tile: `.k` label + `.v` value |
| `.me-legend` | Color-key legend row |
| `.me-cap` | Small caption below a card |
| `.btn-row` | Row of `.demo-btn` buttons |
| `.demo-btn` | Ghost pill button; `.active` → red fill |
| `.eq-block` | Centered KaTeX equation block |
| `.callout` | Editorial callout; variants: `.misconception`, `.recap`, `.intuition`, `.point` |
| `.recall` | Collapsible `<details>` block |
| `.cv-daikake` | Extra class on callouts to apply the red-ochre color |
| `.phead` | Page header wrapper |
| `.phead-top` | Breadcrumb row + language toggle |
| `.crumb` | Breadcrumb nav |
| `.pintro` | Lead paragraph under the page title |
| `.backrow` | "← Back to Learn" row |
| `.lang-btn` | EN/日本語 toggle button |

### Design tokens (from `style.css :root`)

```
--paper: #fefefc          (page background — cream white)
--ink: rgb(30,25,19)      (primary text — warm near-black)
--ink-2: rgb(99,90,76)    (secondary text)
--ink-3: rgb(164,153,134) (faint text / labels)
--accent: #bf2f25         (red — used for numbers, links, active states)
--mincho: "Shippori Mincho", serif
--gothic: "Zen Kaku Gothic New", system-ui, sans-serif
--stage: #1b1711          (dark card background)
--measure: 880px          (max content width for prose)
--maxw: 1020px            (outer max-width)
```

### Bilingual (EN/JA) pattern

Every user-visible string uses this pattern — never omit either span:

```html
<span class="i18n-en">English text</span>
<span class="i18n-ja">日本語テキスト</span>
```

`lang-toggle.js` hides the inactive language via `[data-lang="en"] .i18n-ja { display: none }`.

### Page-specific CSS file

Each Learn page has its own CSS file at `assets/css/[page-name].css`.
The `measurement-error.css` file is the reference for what to put there:
- Override `.demo-stage` if you need transparent background
- Define `.anim-card` styling if needed
- Add module-specific component styles (sliders, canvases, stat tiles, etc.)

### `<head>` metadata pattern

```html
<title>[Topic] — Interactive Guide</title>
<meta name="description" content="...">
<meta name="keywords" content="...">
<link rel="canonical" href="https://yumigeta.github.io/learn/[slug]/">
<meta property="og:type" content="article">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:url" content="https://yumigeta.github.io/learn/[slug]/">
<meta property="og:site_name" content="Kentaro Yumigeta">
<meta name="twitter:card" content="summary_large_image">
<!-- structured data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "author": { "@type": "Person", "name": "Kentaro Yumigeta", "url": "https://yumigeta.github.io",
    "affiliation": { "@type": "Organization", "name": "University of Arizona" } },
  "isAccessibleForFree": true,
  "interactivityType": "active"
}
</script>
```

---

## Existing Learn pages (for cross-reference)

- `learn/raman/` — Classical Theory of Raman Scattering
- `learn/laser/` — Physics of Laser Light
- `learn/measurement-error/` — Measurement, Error & Data Analysis ← **canonical template**
- `learn/graphene/` — Graphene
- `learn/graphene-raman/` — Graphene Raman
- `learn/graphene-nanoribbons/` — Graphene Nanoribbons
- `learn/spectral-noise/` — Spectral Noise
- `learn/schottky/` — Schottky
- `learn/crystal-structure/` — Crystal Structure
- `learn/gate-dielectrics/` — Gate Dielectrics

---

## Search engine visibility (Learn pages)

The authoritative publication flag is published in learn/pages.json.
The build generates English at /learn/<slug>/ and Japanese at
/ja/learn/<slug>/ for published articles plus the Learn index. It generates
localized titles/descriptions, self canonicals, reciprocal hreflang, and the
public sitemap. Draft articles retain noindex,nofollow and are not localized.
There is no source sitemap.xml. Learn dates live in learn/pages.json (lastmod on
articles; index_lastmod for the index). Other public pages/dates live in
site/pages.json. The sole sitemap is generated at _site/sitemap.xml. Keep dates
in YYYY-MM-DD format and change them for substantive page updates.

When publishing an article, update its registry flag and remove its noindex
meta tag together, then build and validate. The build rejects inconsistent
published/noindex settings. Crawling must remain allowed so Google can read
noindex; do not add robots.txt Disallow rules for draft articles.

Edit the bilingual source HTML and registry, never the generated _site/
copies. Japanese navigation must keep /ja/learn/ URLs. The user accepts
resetting figures and scroll position when switching languages.

**IMPORTANT**: New Learn pages must NEVER be added to `learn/index.html` until explicitly told to publish. Always use `learn/dev/index.html` during development.

---

## Proofreading (校正) Learn pages

Unpublished Learn pages ship an **in-browser proofreading layer** (Word-style
track changes) so prose can be marked up directly in the browser and handed back
to Claude to implement.

**Files**
- `assets/js/proofread.js` — the engine (selection editing, view modes, export).
- `assets/css/proofread.css` — its styling (matches the site tokens).
- `assets/js/lang-toggle.js` — contains a small loader that **auto-injects** the
  two files above, but ONLY on pages that carry
  `<meta name="robots" content="noindex">` under `/learn/<slug>/`. It never loads
  on published pages, and new dev pages get it for free. Do **not** add
  `<script>`/`<link>` tags for it to individual pages.

**How the reviewer uses it** (no edits to HTML needed)
- Open review mode: the **✎ 校正 / Review** pill (bottom-right), the URL
  `?review`, or `Alt+R`.
- Select prose → choose **Delete / Replace / Insert / Comment**. Insert adds
  text right after the selected anchor word. Click any mark to remove it.
- View switch: **Markup** (all marks) · **Final** (deletions hidden = what it
  looks like after applying) · **Original** (insertions hidden).
- Marks auto-save to `localStorage` (per page, on-device only). **Export** gives
  a JSON file + a Markdown summary.

**Handoff → Claude.** The reviewer does ONE of:
1. Saves the JSON as `learn/_reviews/<slug>.json`, commits it, and says
   "apply the review for `<slug>`". (The `_reviews/` folder is underscore-
   prefixed so Jekyll keeps it out of the published site.)
2. Pastes the Markdown or JSON straight into the chat.

**How Claude applies a review** (`schema: yumigeta-proofread/v1`)
Each edit carries: `type` (`delete|replace|insert|comment`), `lang`
(`en|ja`), `section` (hint), `prefix`/`suffix` (≈55 chars of surrounding text),
`oldText`, `newText`, `comment`. Steps:
1. Open `learn/<slug>/index.html`. For each edit, locate `oldText` using
   `prefix`+`suffix` and `lang` (the text lives inside an
   `.i18n-en` / `.i18n-ja` span) and `section` to disambiguate duplicates.
2. Apply by type: **delete** → remove `oldText`; **replace** → `oldText`→
   `newText`; **insert** → add `newText` immediately after the anchor (`prefix`
   ends at the insertion point); **comment** → it's a note/question, use
   judgment (make the implied change, or ask the user if ambiguous — do not
   apply blindly).
3. Preserve surrounding inline markup (`<b>`, `<em>`, `$…$` KaTeX). Keep the
   EN/JA pair consistent when a change affects meaning.
4. When applying a committed `learn/_reviews/<slug>.json`, delete that file in
   the same commit once the edits are in. Commit on the `claude/*` branch.

---

## Organizing the Learn IA — "整理 / Organize" (dev-only, localhost)

`assets/js/learn-organize.js` + `assets/css/learn-organize.css` add an in-panel
editor for `pages.json`, **injected by `lang-toggle.js` only on localhost DEV
(noindex) Learn pages** — i.e. `/learn/dev/` and dev article pages, **never the
public `/learn/` landing, published pages, or production**. A "整理 / Organize"
pill (bottom-left) opens edit mode:
- **Publish toggle** — ●(published)/○(hidden) per row flips `published`. (Flips
  only the pages.json flag → shelf/index; full go-live still needs the page's
  noindex removed; the next build generates the sitemap from page metadata.)
- **Move between categories** — drag a page onto a category zone (柱).
- **Move between sub-folders (groups)** — drag onto another group's list.
- **Reorder** — drag a page above/below another (insertion line shows where); in a
  group it reorders `group.pages`, in a flat category (routes/handbook) it reorders
  `pages[]`.
- **Rename a sub-folder** — ✎ on the group header (prompts JA then EN →
  `group.name_ja/en`).

Model: the editor holds a **full working draft of pages.json** in `localStorage`
(`learn-organize/draft`); every edit mutates a deep clone and re-renders. Changes
show **only in edit mode** (the normal shelf reads the file). **Save** writes the
draft to the local file via the File System Access API (Chromium); **Download /
Copy** are fallbacks; **Reset** drops the draft. The renderers are already
array-order driven, so move/reorder/rename take effect on Save with no renderer
change. The file is `JSON.stringify(..., null, 2)` — the first Save reformats
whitespace (content preserved). Group rename uses `prompt()` (a nicer inline
editor is possible later).

**`/learn/` (public) vs `/learn/dev/` (dev).** `learn/index.html` renders
`initLearnIndex({ publishedOnly: true })` — the **public index: published pages
only**, no dev tools, no `.learn-quick` (start/all are dev nav; they return to
`/learn/` once published). `learn/dev/index.html` renders everything
(`publishedOnly:false, showStatus:true`) and is where the Organize tool lives
(it's the noindex dev surface).

**Preview-published switch** — a second pill, "公開版 / Preview published" (on dev
surfaces only), sets `localStorage['learn-view']='published'` and reloads. While
set, the renderers (`article-shell.js`, `learn-index.js`) read it (localhost only,
via `PREVIEW_PUB`) and render the index + left panel **as the live site would**:
published only, no dev/planned/status. A vermilion "公開版プレビュー中 / Back to dev
view" banner shows; dev pills + `.learn-quick` are hidden. Exit clears the flag.
This previews the published **nav** from the dev context; `/learn/` itself is the
real published view. On production the flag is ignored (never localhost).

---

## Git workflow

Feature branches: `claude/*`
Never push to `main` directly.

## Learn prose — the pink-elephant rule (user rule, 2026-09-04)

Never reassure the reader about a doubt they have not formed. Sentences such as
「名前を入れ替えても話は変わらない」「どちらを選んでもよい」「気にしなくてよい」
"swap the names and nothing changes" / "this choice does not matter" plant the
doubt they claim to remove (ピンクの象). A convention is marked by the verb alone
(「〜と呼ぶことにする」「〜とする」「〜と置く」) and nothing more.

Reader-side acknowledgements (「〜と感じるかもしれない」) are allowed only for
misreadings a test reader actually produced, and must resolve the misreading in
the same breath. Explanations are positive statements; a 「〜ではない」 sentence is
allowed only when the next clause states the positive fact.

Enforcement: `C:\Users\kenta\.claude\hooks\pink-elephant-lint.ps1` scans every
`learn/*/index.html` (JA + EN prose) and `learn/pages.json` for the patterns in
`pink-elephant-patterns.txt`; the Stop hook blocks the turn while an
un-reviewed hit exists. A legitimate hit is approved by adding the exact sentence
to `pink-elephant-allow.txt` with a one-line reason, never by weakening the
patterns. Run manually: `powershell -NoProfile -File <script> -Report`.

### Semantic check: pink-elephant-judge (2026-09-05)

The regex linter only sees the wording of reassurance. A second Stop hook,
`C:\Users\kenta\.claude\hooks\pink-elephant-judge.ps1`, catches the other
kind: a sentence that answers a REVIEWER's objection or defends the author's
choice inside the reader's text (e.g. a diffraction aside added because an
expert said "XRD gives the lattice constant"). It snapshots the prose of every
`learn/*/index.html` (`pe-judge-cache\<slug>.txt`); each sentence not in the
snapshot must be judged into `reader` (resolves a doubt on the ledger
`pink-elephant-reader-doubts.txt`), `content` (physics in the page's own flow),
`reviewer`, or `defence`. reviewer/defence → the turn is blocked until the
sentence is REMOVED (never relocated). If the `claude` CLI is installed and
logged in, a fresh headless `claude -p` judges; otherwise the agent must record
its own verdict in `pe-judge-verdict.txt` (`<category><TAB><sentence>`), which
the hook consumes and logs. Only a new test-reading may add doubts to the
ledger. Manual: `-Report` lists unjudged sentences; `-Baseline` accepts the
current pages.

## Learn: crystal-structure vs graphene-geometry (user decision, 2026-09-05)

- **`crystal-structure` (物質のしくみ) is the general page.** It teaches lattice, basis,
  unit cell (Wigner–Seitz), the rotation restriction, the 2D lattice census, the
  reciprocal lattice as "the waves that fit", and the Brillouin zone as the
  Wigner–Seitz recipe in k-space, **without graphene** as its example (use a
  generic pattern). It does not pre-tell graphene's K point or the two bands.
- **`graphene-geometry` is the application.** It keeps every graphene-specific
  computation (A/B, δ_j, a₁ a₂ from the bonds, numbers, b₁ b₂, Γ M K coordinates,
  K vs K′ via G, and the real-space wave patterns at Γ/M/K/K′) and carries **one-sentence refreshers**
  of the general notions it uses (Bravais lattice, basis, unit cell, the
  invisible-difference condition e^{iG·R}=1, the nearest-lattice-point rule for
  the zone), so a reader who learned crystal structure long ago and forgot it
  can still read straight through. General *derivations* (completeness of G,
  alternative unit cells, the general bisector construction) belong to
  `crystal-structure`, not here.
- **Conflicts resolve in favour of `graphene-geometry`:** notation (a = C–C
  distance 0.142 nm; a₁ = a(√3/2, 3/2), a₂ = a(−√3/2, 3/2); b₁ b₂ accordingly,
  bold **K** = (4π/3√3a, 0)), the basis image (the rhombus stamp), and the
  wavevector coordinates all follow graphene-geometry; crystal-structure adapts.
- **Page scope revised 2026-09-05:** the geometry page ends with a linked
  reciprocal-space / real-space view of plane-wave direction, wavelength, and
  individual site phases. The sum of three bond phase factors and its
  cancellation at K belong to `graphene-tight-binding`, where the equal
  nearest-neighbour hopping model gives a reason to add those contributions.

## Learn: general TB vs graphene TB (user decision, 2026-09-06)

- A general tight-binding page is planned in the Electronic States group.
  Its scope is the generic method, localized orbitals, Bloch sums and general
  eigenvalue calculations. No page or URL has been assigned yet.
- `graphene-tight-binding` focuses on graphene's two A/B amplitudes, three
  equal nearest-neighbour hoppings, the phase sum, band contact at K/K′ and
  neutral band filling. Keep the minimum reminders needed to follow these
  steps; do not rebuild the general TB course or the geometry page here.
- The user specifically requested an explanation of why the three neighbour
  contributions are added: multiply each amplitude by its hopping coefficient,
  then superpose the three contributions at the same A orbital.
- Use atomic-position Bloch phases consistently with
  `f(k) = sum_j exp(i k dot delta_j)` and Hamiltonian entries `-t f`, `-t f*`.
