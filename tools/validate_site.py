"""Validate generated Learn pages. Run after build_site.py."""
import json
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET
from build_site import ROOT, OUTPUT, ORIGIN, Document, Element, localized, strip_language

def check(condition, message):
    if not condition:
        raise AssertionError(message)

def content(node):
    return ''.join(content(c) if isinstance(c, Element) else c for c in node.children)

def article_figures(node):
    shell = {'site-nav', 'rail-left', 'rail-right', 'mobile-toc'}
    if shell.intersection((node.attrs.get('class') or '').split()):
        return
    if node.tag in ('canvas', 'svg', 'input', 'select'):
        yield node.tag, {k: '' if v is None else v for k, v in node.attrs.items()}
    for child in node.children:
        if isinstance(child, Element):
            yield from article_figures(child)

def validate():
    registry = json.loads((ROOT / 'learn/pages.json').read_text(encoding='utf-8'))
    articles = [p for p in registry['pages'] if p.get('published') and not p.get('planned')]
    new_categories = {category['id'] for category in registry.get('category_architectures', [])}
    v2_paths = {'/learn/' + p['slug'] + '/' for p in articles if p['category'] in new_categories}
    paths = ['/learn/'] + ['/learn/' + p['slug'] + '/' for p in articles]
    for path in paths:
        source = (ROOT / path.strip('/') / 'index.html').read_text(encoding='utf-8')
        source_nodes = list(Document(source).root.walk())
        source_scripts = [content(n) for n in source_nodes if n.tag == 'script' and n.attrs.get('type') != 'application/ld+json']
        for lang in ('en', 'ja'):
            route = localized(path, lang)
            file = OUTPUT / route.strip('/') / 'index.html'
            check(file.is_file(), 'Missing page: ' + route)
            nodes = list(Document(file.read_text(encoding='utf-8')).root.walk())
            root = next(n for n in nodes if n.tag == 'html')
            check(all(root.attrs.get(k) == lang for k in ('lang', 'data-lang', 'data-page-lang')), 'Wrong language: ' + route)
            new_index = path == '/learn/' and bool(new_categories)
            if path in v2_paths or new_index:
                shell = 'index' if new_index else 'article'
                check(root.attrs.get('data-static-shell') == shell, 'Missing static Learn shell: ' + route)
                check(not any(n.attrs.get('property') == 'og:site_name' for n in nodes), 'Site name in article metadata: ' + route)
            canonicals = [n.attrs.get('href') for n in nodes if n.tag == 'link' and n.attrs.get('rel') == 'canonical']
            check(canonicals == [ORIGIN + route], 'Wrong self canonical: ' + route)
            alternates = {n.attrs.get('hreflang'): n.attrs.get('href') for n in nodes if n.tag == 'link' and n.attrs.get('rel') == 'alternate'}
            check(alternates == {'en': ORIGIN + path, 'ja': ORIGIN + '/ja' + path, 'x-default': ORIGIN + path}, 'Wrong alternates: ' + route)
            check(not any(n.tag == 'meta' and n.attrs.get('name') == 'robots' and 'noindex' in n.attrs.get('content', '') for n in nodes), 'Public page blocked')
            titles = [content(n) for n in nodes if n.tag == 'title']
            check(len(titles) == 1 and titles[0], 'Missing/duplicate title: ' + route)
            h1 = next(n for n in nodes if n.tag == 'h1')
            check(content(h1).strip() == titles[0], 'Title and heading differ: ' + route)
            descriptions = [n.attrs['content'] for n in nodes if n.tag == 'meta' and n.attrs.get('name') == 'description']
            check(len(descriptions) == 1 and descriptions[0], 'Missing/duplicate description')
            if lang == 'ja':
                check(any('\u3040' <= c <= '\u9fff' for c in descriptions[0]), 'Missing Japanese description')
            opposite = 'i18n-' + ('en' if lang == 'ja' else 'ja')
            check(not any(opposite in (n.attrs.get('class') or '').split() for n in nodes), 'Other language remains: ' + route)
            toggles = [n for n in nodes if 'lang-btn' in (n.attrs.get('class') or '').split()]
            check(len(toggles) == 1 and toggles[0].tag == 'a'
                  and toggles[0].attrs.get('href') == localized(path, 'ja' if lang == 'en' else 'en'), 'Switch is not an alternate link')
            for n in nodes:
                if n.tag == 'a':
                    target = urlsplit(n.attrs.get('href', ''))
                    if not target.netloc and target.path.startswith(('/learn/', '/ja/learn/')):
                        check((OUTPUT / target.path.strip('/') / 'index.html').is_file(), 'Broken link: ' + target.path)
                        if n not in toggles:
                            check(target.path.startswith('/ja/learn/') == (lang == 'ja'), 'Link changes language: ' + target.path)
                            plain = target.path.removeprefix('/ja') if lang == 'ja' else target.path
                            check(plain in paths, 'Public link exposes a draft: ' + target.path)
                if n.tag == 'script' and n.attrs.get('type') == 'application/ld+json':
                    data = json.loads(content(n))
                    if data.get('@type') == 'LearningResource':
                        check(data['inLanguage'] == lang and data['url'] == ORIGIN + route, 'Wrong structured language')
            scripts = [content(n) for n in nodes if n.tag == 'script' and n.attrs.get('type') != 'application/ld+json'
                       and n.attrs.get('src') != '/assets/js/learn-routes.js']
            check(scripts == source_scripts, 'Inline figure code changed: ' + route)
            localized_source = Document(source).root
            strip_language(localized_source, lang)
            figure_tags = ('canvas', 'svg', 'input', 'select')
            if path in v2_paths or new_index:
                before, after = list(article_figures(localized_source)), list(article_figures(root))
            else:
                before = [(n.tag, n.attrs) for n in localized_source.walk() if n.tag in figure_tags]
                after = [(n.tag, n.attrs) for n in nodes if n.tag in figure_tags]
            check(before == after, 'Figure markup changed: ' + route)
            if path == '/learn/':
                links = {n.attrs.get('href') for n in nodes if n.tag == 'a'}
                if new_index:
                    route_prefix = localized('/learn/', lang)
                    article_links = {link for link in links if link and link.startswith(route_prefix)
                                     and urlsplit(link).path != route_prefix}
                    check(article_links == {localized(p, lang) for p in v2_paths},
                          'Learn index articles must match the public curriculum: ' + route)
                else:
                    check(all(localized(p, lang) in links for p in paths[1:]),
                          'Index needs JS to discover articles')
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9', 'x': 'http://www.w3.org/1999/xhtml'}
    sitemap = ET.parse(OUTPUT / 'sitemap.xml')
    entries = sitemap.getroot().findall('s:url', ns)
    check(not (ROOT / 'sitemap.xml').exists(), 'Source sitemap must not exist')
    site_pages = json.loads((ROOT / 'site/pages.json').read_text(encoding='utf-8'))['pages']
    expected = {ORIGIN + p['path']: p.get('lastmod') for p in site_pages}
    for path in paths:
        article = next((p for p in articles if path == '/learn/' + p['slug'] + '/'), None)
        lastmod = article.get('lastmod') if article else registry.get('index_lastmod')
        for lang in ('en', 'ja'):
            expected[ORIGIN + localized(path, lang)] = lastmod
    actual = {n.findtext('s:loc', namespaces=ns): n.findtext('s:lastmod', namespaces=ns) for n in entries}
    check(actual == expected and len(entries) == len(expected), 'Sitemap page metadata or dates incorrect')

    learn = [n for n in entries if '/learn/' in n.findtext('s:loc', namespaces=ns)]
    check({n.findtext('s:loc', namespaces=ns) for n in learn}
          == {ORIGIN + localized(p, lang) for p in paths for lang in ('en', 'ja')}, 'Sitemap routes incorrect')
    check(all(len(n.findall('x:link', ns)) == 3 for n in learn), 'Sitemap language alternates missing')
    drafts = 0
    for file in (ROOT / 'learn').rglob('index.html'):
        path = '/' + file.parent.relative_to(ROOT).as_posix() + '/'
        if path not in paths and 'noindex' in file.read_text(encoding='utf-8'):
            check('noindex' in (OUTPUT / file.relative_to(ROOT)).read_text(encoding='utf-8'), 'Draft lost noindex')
            check(not (OUTPUT / 'ja' / file.relative_to(ROOT)).exists(), 'Draft localized for publication')
            drafts += 1
    print(f'PASS: {len(paths) * 2} localized pages; metadata, links, figures, scripts, sitemap; {drafts} drafts remain noindex.')

if __name__ == '__main__':
    validate()
