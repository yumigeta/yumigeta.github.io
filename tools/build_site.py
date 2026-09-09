"""Build English/Japanese Learn pages from bilingual sources. Python 3.10+, no dependencies."""
from __future__ import annotations
import html
import json
import re
import shutil
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_site'
ORIGIN = 'https://yumigeta.com'
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())

class Element:
    def __init__(self, tag='', attrs=(), start='', end=''):
        self.tag, self.attrs = tag, dict(attrs)
        self.start, self.end, self.children = start, end, []
    def set(self, key, value):
        self.attrs[key] = value
        self.start = '<' + self.tag + ''.join(
            ' ' + k + ('' if v is None else '="' + html.escape(v, quote=True) + '"')
            for k, v in self.attrs.items()) + '>'
    def render(self):
        return self.start + ''.join(c.render() if isinstance(c, Element) else c for c in self.children) + self.end
    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Element):
                yield from child.walk()

class Document(HTMLParser):
    """Keep SVG attribute casing and raw script/style/math contents unchanged."""
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.root = Element()
        self.stack = [self.root]
        self.feed(source)
        self.close()
    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs, self.get_starttag_text())
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)
    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Element(tag, attrs, self.get_starttag_text()))
    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack[i].end = '</' + tag + '>'
                del self.stack[i:]
                return
        self.handle_data('</' + tag + '>')
    def handle_data(self, data):
        self.stack[-1].children.append(data)
    def handle_entityref(self, name):
        self.handle_data('&' + name + ';')
    def handle_charref(self, name):
        self.handle_data('&#' + name + ';')
    def handle_comment(self, data):
        self.handle_data('<!--' + data + '-->')
    def handle_decl(self, decl):
        self.handle_data('<!' + decl + '>')

def esc(value):
    return html.escape(value, quote=True)

def localized(path, lang):
    return ('/ja' if lang == 'ja' else '') + path

def strip_language(node, lang):
    opposite = 'i18n-' + ('en' if lang == 'ja' else 'ja')
    node.children = [c for c in node.children if not (
        isinstance(c, Element) and opposite in (c.attrs.get('class') or '').split())]
    for child in node.children:
        if isinstance(child, Element):
            strip_language(child, lang)

def render_index(registry, lang):
    sections = []
    for category in registry['categories']:
        pages = [p for p in registry['pages'] if p.get('published') and not p.get('planned')
                 and p['category'] == category['id']]
        if not pages:
            continue
        cards = ''.join('<a class="et" href="' + localized('/learn/' + p['slug'] + '/', lang) + '"><div><h3>'
                        + esc(p['title_' + lang]) + '</h3><p>' + esc(p.get('desc_' + lang) or p['summary_' + lang])
                        + '</p></div></a>' for p in pages)
        sections.append('<div class="ed-cat" id="' + esc(category['id']) + '"><div class="ed-cat-hd">'
                        '<span class="ed-cat-no">' + esc(category['num']) + '</span><span class="ed-cat-name">'
                        + esc(category['name_' + lang]) + '</span></div><div class="ed-tools">' + cards + '</div></div>')
    return ''.join(sections)

def render_next(page, registry, lang):
    if not page or page.get('layoutType') == 'route':
        return ''
    pages = {p['slug']: p for p in registry['pages'] if p.get('published') and not p.get('planned')}
    cards = []
    groups = [('theory', 'Go deeper', '理論を深める'), ('application', 'Apply it', '材料・応用へ'),
              ('experiment', 'Use it in the lab', '実験に使う'), ('frontier', 'Frontier', '発展')]
    for key, en, ja in groups:
        for slug in page.get('nextLinks', {}).get(key, []):
            if slug in pages:
                p = pages[slug]
                cards.append('<a class="nc-item" href="' + localized('/learn/' + slug + '/', lang)
                             + '"><div class="nc-kind">' + (ja if lang == 'ja' else en)
                             + '</div><div class="nc-title">' + esc(p.get('nav_' + lang) or p['title_' + lang])
                             + '</div></a>')
    if not cards:
        return ''
    return '<div class="nextcard" data-generated-next><div class="nc-lab">' + (
        '次に読む' if lang == 'ja' else 'Read next') + '</div><div class="nextcard-grid">' + ''.join(cards) + '</div></div>'

def generate(source, path, lang, page, registry, routes):
    doc = Document(source).root
    strip_language(doc, lang)
    nodes = list(doc.walk())
    head = next(n for n in nodes if n.tag == 'head')
    root = next(n for n in nodes if n.tag == 'html')
    for key in ('lang', 'data-lang', 'data-page-lang'):
        root.set(key, lang)
    original_description = next((n.attrs['content'] for n in nodes if n.tag == 'meta'
                                 and n.attrs.get('name') == 'description'), '')
    if page:
        title = page['title_' + lang]
        description = page.get('seo_description_' + lang) or (
            original_description if lang == 'en' else page['summary_ja'])
    else:
        title = '基礎から学ぶ' if lang == 'ja' else 'Learn the Basics'
        description = ('ラマン散乱、グラフェンの結晶構造・逆格子・バンド構造を、数式と操作できる図で基礎から学ぶ。'
                       if lang == 'ja' else 'Learn Raman scattering, graphene crystal and reciprocal lattices, and electronic bands through step-by-step explanations and interactive figures.')
    if not title or not description:
        raise ValueError('Missing localized metadata: ' + path + ' ' + lang)
    url = ORIGIN + localized(path, lang)
    replaced_meta = {'description', 'keywords', 'twitter:title', 'twitter:description', 'og:title', 'og:description',
                     'og:url', 'og:locale', 'og:locale:alternate'}
    head.children = [n for n in head.children if not isinstance(n, Element) or not (
        n.tag == 'title' or (n.tag == 'meta' and (n.attrs.get('name') or n.attrs.get('property')) in replaced_meta)
        or (n.tag == 'link' and (n.attrs.get('rel') == 'canonical' or 'hreflang' in n.attrs)))]
    metadata = ['<title>' + esc(title) + '</title>', '<meta name="description" content="' + esc(description) + '">',
                '<link rel="canonical" href="' + url + '">']
    for alternate in ('en', 'ja', 'x-default'):
        metadata.append('<link rel="alternate" hreflang="' + alternate + '" href="'
                        + ORIGIN + localized(path, 'ja' if alternate == 'ja' else 'en') + '">')
    for key, value in [('og:title', title), ('og:description', description), ('og:url', url),
                       ('og:locale', 'ja_JP' if lang == 'ja' else 'en_US'),
                       ('og:locale:alternate', 'en_US' if lang == 'ja' else 'ja_JP'),
                       ('twitter:title', title), ('twitter:description', description)]:
        metadata.append('<meta ' + ('name' if key.startswith('twitter:') else 'property')
                        + '="' + key + '" content="' + esc(value) + '">')
    metadata.append('<script src="/assets/js/learn-routes.js"></script>')
    head.children.append('\n' + '\n'.join(metadata) + '\n')
    for node in nodes:
        if node.tag == 'script' and node.attrs.get('type') == 'application/ld+json':
            data = json.loads(''.join(node.children))
            if isinstance(data, dict) and data.get('@type') in ('LearningResource', 'Article', 'WebPage'):
                data.update(name=title, description=description, url=url, inLanguage=lang)
                node.children = [json.dumps(data, ensure_ascii=False).replace('</', '<\\/')]
        if node.tag == 'a' and node.attrs.get('href'):
            href = node.attrs['href']
            parts = urlsplit(href)
            if (not parts.netloc or parts.netloc in ('yumigeta.com', 'yumigeta.github.io')) and parts.path in routes:
                node.set('href', localized(parts.path, lang) + ('?' + parts.query if parts.query else '')
                         + ('#' + parts.fragment if parts.fragment else ''))
            if href == '/#learn' and node.attrs.get('aria-current') == 'page':
                node.set('href', localized('/learn/', lang))
        if 'lang-btn' in (node.attrs.get('class') or '').split():
            node.tag, node.end = 'a', '</a>'
            node.set('href', localized(path, 'en' if lang == 'ja' else 'ja'))
            node.set('hreflang', 'en' if lang == 'ja' else 'ja')
            node.set('aria-label', 'Switch to English' if lang == 'ja' else '日本語に切り替える')
        if node.attrs.get('id') == 'learn-sections':
            node.children = [render_index(registry, lang)]
    next_card = render_next(page, registry, lang)
    if next_card:
        body = next(n for n in nodes if n.tag == 'body')
        footer = next(n for n in body.children if isinstance(n, Element) and n.tag == 'footer')
        body.children.insert(body.children.index(footer), next_card)
    return '<!-- Generated by tools/build_site.py; edit the bilingual source, not this file. -->\n' + doc.render()


def sitemap_document(registry, sources):
    """Build the only sitemap from page metadata; no source sitemap is read."""
    namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('', namespace)
    ET.register_namespace('xhtml', 'http://www.w3.org/1999/xhtml')
    sitemap = ET.Element('{' + namespace + '}urlset')

    def add_url(path, lastmod):
        item = ET.SubElement(sitemap, 'url')
        ET.SubElement(item, 'loc').text = ORIGIN + path
        if lastmod is not None:
            if not isinstance(lastmod, str) or date.fromisoformat(lastmod).isoformat() != lastmod:
                raise ValueError('Invalid lastmod for ' + path + ': expected YYYY-MM-DD')
            ET.SubElement(item, 'lastmod').text = lastmod
        return item

    metadata = json.loads((ROOT / 'site/pages.json').read_text(encoding='utf-8'))
    seen = set()
    for page in metadata['pages']:
        path = page['path']
        parts = urlsplit(path)
        if (not path.startswith('/') or not path.endswith('/') or parts.netloc or parts.scheme
                or parts.query or parts.fragment or '..' in path.split('/')
                or path.startswith(('/learn/', '/ja/')) or path in seen):
            raise ValueError('Invalid or duplicate site page path: ' + path)
        file = ROOT / path.strip('/') / 'index.html'
        if not file.is_file():
            raise ValueError('Missing site page: ' + path)
        if any(n.tag == 'meta' and n.attrs.get('name') == 'robots'
               and 'noindex' in n.attrs.get('content', '') for n in Document(file.read_text(encoding='utf-8')).root.walk()):
            raise ValueError('Site page is marked noindex: ' + path)
        seen.add(path)
        add_url(path, page.get('lastmod'))

    for path, (_, page) in sources.items():
        lastmod = page.get('lastmod') if page else registry.get('index_lastmod')
        for lang in ('en', 'ja'):
            item = add_url(localized(path, lang), lastmod)
            for alternate in ('en', 'ja', 'x-default'):
                ET.SubElement(item, '{http://www.w3.org/1999/xhtml}link', rel='alternate', hreflang=alternate,
                              href=ORIGIN + localized(path, 'ja' if alternate == 'ja' else 'en'))
    ET.indent(sitemap)
    return sitemap

def build():
    if (ROOT / 'sitemap.xml').exists():
        raise ValueError('sitemap.xml is generated output only; edit page metadata instead')
    registry = json.loads((ROOT / 'learn/pages.json').read_text(encoding='utf-8'))
    pages = [p for p in registry['pages'] if p.get('published') and not p.get('planned')]
    sources = {'/learn/': (ROOT / 'learn/index.html', None)}
    for page in pages:
        path = '/learn/' + page['slug'] + '/'
        file = ROOT / path.strip('/') / 'index.html'
        if not file.is_file():
            raise ValueError('Published article has no source: ' + path)
        if re.search(r'<meta\s+name="robots"[^>]*noindex', file.read_text(encoding='utf-8')):
            raise ValueError('Published article still has noindex: ' + path)
        for key in ('title_en', 'title_ja', 'summary_en', 'summary_ja'):
            if not page.get(key):
                raise ValueError('Missing ' + key + ': ' + path)
        sources[path] = (file, page)
    sitemap = sitemap_document(registry, sources)
    generated = {}
    for path, (file, page) in sources.items():
        source = file.read_text(encoding='utf-8')
        for lang in ('en', 'ja'):
            generated[localized(path, lang)] = generate(source, path, lang, page, registry, sources)
    if OUTPUT.exists():
        if OUTPUT.is_symlink() or OUTPUT.resolve() != ROOT.resolve() / '_site' or not (OUTPUT / '.generated-site').is_file():
            raise ValueError('Refusing to replace an unrecognized _site directory')
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()
    (OUTPUT / '.generated-site').write_text('tools/build_site.py\n', encoding='utf-8')
    for directory in ('assets', 'learn', 'publications', 'styleguide'):
        shutil.copytree(ROOT / directory, OUTPUT / directory, ignore=shutil.ignore_patterns('.*', '_*', '*.md'))
    for file in ROOT.iterdir():
        if file.is_file() and (file.suffix in ('.html', '.ico') or file.name in ('CNAME', 'robots.txt')):
            shutil.copy2(file, OUTPUT / file.name)
    (OUTPUT / '.nojekyll').touch()
    (OUTPUT / 'assets/js/learn-routes.js').write_text(
        '// Generated from published entries in learn/pages.json.\nwindow.learnRoutes = '
        + json.dumps(list(sources)) + ';\n', encoding='utf-8')
    for file in OUTPUT.rglob('*.html'):
        text = file.read_text(encoding='utf-8')
        if '/assets/js/lang-toggle.js' in text:
            text = text.replace('<script src="/assets/js/lang-toggle.js">',
                                '<script src="/assets/js/learn-routes.js"></script><script src="/assets/js/lang-toggle.js">')
        elif file == OUTPUT / 'index.html':
            text = text.replace('<html lang="en">', '<html lang="en" data-learn-entry>')
            text = text.replace('</head>', '<script defer src="/assets/js/learn-routes.js"></script>'
                                '<script defer src="/assets/js/lang-toggle.js"></script></head>')
        file.write_text(text, encoding='utf-8')
    for path, text in generated.items():
        file = OUTPUT / path.strip('/') / 'index.html'
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(text, encoding='utf-8')
    ET.ElementTree(sitemap).write(OUTPUT / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    print(f'Built {len(generated)} localized Learn pages in {OUTPUT}')

if __name__ == '__main__':
    build()
