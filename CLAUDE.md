# yumigeta.github.io — Claude Code guide

## Repository overview

Personal academic website for Kentaro Yumigeta (University of Arizona).
Static HTML/CSS/JS — no build step, no framework.

- `index.html` — main landing page
- `learn/` — interactive Learn explainer pages (one subdirectory per topic)
- `publications/` — publications list
- `assets/css/style.css` — **global stylesheet** (shared by every page)
- `assets/js/lang-toggle.js` — EN/JA language toggle (loaded on every page)
- `assets/js/analytics.js` — analytics (loaded on every page)

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

**Published** (indexed by Google): `raman/`, `measurement-error/`

**Unpublished / dev** (hidden from Google): everything else under `learn/`

When a page is still in development:
1. Add `<meta name="robots" content="noindex,nofollow">` right after `<meta charset="UTF-8">` in its `<head>`
2. Add `Disallow: /learn/[slug]/` to `robots.txt`
3. Do NOT add it to `sitemap.xml`
4. Add it to `learn/dev/index.html` only — **never** to `learn/index.html`

When a page is ready to publish (go live):
1. Remove the `<meta name="robots" ...>` noindex line from its `index.html`
2. Remove its `Disallow` line from `robots.txt`
3. Add it to `sitemap.xml`
4. Add it to `learn/index.html` (public index)
5. Remove it from `learn/dev/index.html`

**IMPORTANT**: New Learn pages must NEVER be added to `learn/index.html` until explicitly told to publish. Always use `learn/dev/index.html` during development.

---

## Git workflow

Feature branches: `claude/*`
Never push to `main` directly.
