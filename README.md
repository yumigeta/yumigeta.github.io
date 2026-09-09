# yumigeta.github.io

## Bilingual Learn build

Edit the existing bilingual HTML in `learn/` and metadata in `learn/pages.json`.
Figures and styles stay shared in `assets/`. The build separates the existing
English/Japanese text; it does not translate text.

Requires Python 3.10+, with no additional packages:

```text
python tools/build_site.py
python tools/validate_site.py
python -m http.server 8000 --directory _site --bind 127.0.0.1
```

Open `/learn/` (English) or `/ja/learn/` (Japanese).
`_site/` is disposable generated output, ignored by Git; edit the sources instead.
The build replaces only this marked output directory. Serve the repository root
separately when using the existing bilingual authoring/proofreading tools.

## Behavior

- Existing public article URLs stay English; Japanese uses `/ja/learn/<slug>/`.
- The URL determines the language, even if a different preference was saved.
- Initial HTML contains the chosen language and localized search/social metadata.
- Each page has its own canonical and reciprocal en/ja/x-default hreflang.
- The initial index and related-article cards contain localized links.
- Sidebar, index and related links keep the language, including new-tab clicks.
- The home page remembers the selected language for its Learn article links.
- Language switching uses a normal link; figures and scroll position may reset.
- The sitemap is generated solely from page metadata, including both languages.

Only actual articles with `published: true` are localized. Drafts keep noindex
and stay out of public navigation and the sitemap. A published article whose
source still has noindex fails the build.

Titles come from `title_en` / `title_ja` in pages.json and must match the visible
heading. Descriptions default to the source HTML for English and `summary_ja`
for Japanese. Optional `seo_description_en` / `seo_description_ja` override them.

## Page metadata and sitemap

There is no editable sitemap.xml in GitHub. The only sitemap.xml is generated
in _site/ during publication and served at https://yumigeta.com/sitemap.xml.

- Learn article publication flags and optional lastmod dates: learn/pages.json.
- Learn index date: index_lastmod in learn/pages.json.
- Other public pages and their optional dates: site/pages.json.
- Dates use YYYY-MM-DD and describe a substantive page update. Update them when
  the content changes; rebuilding alone does not advance the date.
- A new published Learn article is included in both languages automatically.
  No separate URL list or sitemap edit is needed.

The builder rejects a root sitemap.xml to prevent a second editable copy from
being introduced accidentally. The validator checks every URL and date against
the page metadata.

## Publication

The directory to publish is `_site/`, rather than the bilingual source tree.
The GitHub Actions workflow in .github/workflows/pages.yml builds and validates
pull requests. After a change is merged to main, the same checks run and the
generated output is published automatically. Failed checks prevent publication.
GitHub Pages uses the GitHub Actions source setting.
Keep the custom domain `yumigeta.com`.
