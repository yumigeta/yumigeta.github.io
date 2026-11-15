"""Localize published articles in the new Learn hierarchy."""
import json
import re
import subprocess
from urllib.parse import urlsplit
from build_site import Document, Element, ORIGIN, esc, localized, strip_language

def render_language_menu(path, lang):
    options = []
    for code, label in [('en', 'English'), ('ja', '日本語')]:
        current = code == lang
        options.append('<a class="lang-option' + ('' if current else ' lang-btn') + '" href="'
                       + localized(path, code) + '" hreflang="' + code + '" lang="' + code
                       + '" data-language="' + code + '"' + (' aria-current="true"' if current else '')
                       + '>' + label + '</a>')
    return ('<details class="language-menu"><summary aria-label="Language / 言語">'
            '<span class="language-current">' + ('日本語' if lang == 'ja' else 'EN')
            + '</span></summary><div class="language-options">' + ''.join(options) + '</div></details>')

def group_path(groups, slug):
    for group in groups or []:
        if slug in group.get('pages', []):
            return [group]
        nested = group_path(group.get('groups'), slug)
        if nested:
            return [group] + nested
    return []

def page_hierarchy(registry, page):
    if not page:
        return []
    category = next((c for c in registry.get('category_architectures', []) if c['id'] == page.get('category')), None)
    if category:
        return [category] + group_path(category.get('groups'), page['slug'])
    collection = next((c for c in registry.get('collections', []) if c['id'] == page.get('collection')), None)
    return [collection] if collection else []

def render_new_index(registry, lang):
    pages = [page for page in registry['pages'] if page.get('published') and not page.get('planned')]
    categories = {cat['id'] for cat in registry.get('category_architectures', [])}
    new_pages = [page for page in pages if page['category'] in categories]
    if not new_pages:
        return ''
    heading = '新しいLearn体系' if lang == 'ja' else 'New Learn curriculum'
    cards = []
    for page in new_pages:
        url = localized('/learn/' + page['slug'] + '/', lang)
        cards.append('<a class="et" href="' + url + '"><div><h3>'
                     + esc(page['title_' + lang]) + '</h3><p>'
                     + esc(page['summary_' + lang]) + '</p></div></a>')
    return ('<section class="ed-cat" id="learn-curriculum"><div class="ed-cat-hd"><span class="ed-cat-name">'
            + esc(heading) + '</span></div><div class="ed-tools">' + ''.join(cards) + '</div></section>')

def embed_article_shell(root, output, routes):
    subprocess.run(['node', str(root / 'tools/render_static_shell.cjs'), str(output), *routes], check=True)
    asset_root = output / 'assets/learn-v2'
    # Keep the legacy articles' shared assets at their current URLs.
    asset_ref = re.compile(r'/assets/([A-Za-z0-9_./-]+\.(?:mjs|js|css|png|jpe?g|svg|webp|woff2?|ttf))(?![A-Za-z0-9_.-])')
    for route in routes:
        file = output / route.strip('/') / 'index.html'
        html = file.read_text(encoding='utf-8')
        html = asset_ref.sub(lambda match: '/assets/learn-v2/' + match[1]
                             if (asset_root / match[1]).is_file() else match[0], html)
        file.write_text(html, encoding='utf-8')

def render_next(page, registry, lang):
    if not page or page.get('layoutType') == 'route':
        return ''
    pages = {p['slug']: p for p in registry['pages'] if p.get('published') and not p.get('planned')}
    relations = registry.get('learning_relations', {})
    relation = relations.get(page['slug'], {})
    next_relation = relation.get('next') or {}
    next_page = pages.get(next_relation.get('page'))
    order = registry.get('learning_order', [])
    index = order.index(page['slug']) if page['slug'] in order else 0
    previous = pages.get(order[index - 1]) if index > 0 else None
    previous_link = '' if not previous else (
        '<a class="learning-exit-previous" href="' + localized('/learn/' + previous['slug'] + '/', lang) + '">← '
        + esc(previous.get('nav_' + lang) or previous['title_' + lang]) + '</a>')
    if not next_page:
        return ('<nav class="learning-exit learning-exit--previous-only" data-generated-next>'
                + previous_link + '</nav>') if previous_link else ''
    return (
        '<nav class="learning-exit" data-generated-next aria-labelledby="learning-next-label">'
        '<a class="learning-exit-main" href="' + localized('/learn/' + next_page['slug'] + '/', lang) + '">'
        '<span class="learning-exit-label" id="learning-next-label">' + ('次に読む' if lang == 'ja' else 'Read next') + '</span>'
        '<span class="learning-exit-title">' + esc(next_page['title_' + lang]) + '</span>'
        '<span class="learning-exit-bridge">' + esc(next_relation.get('bridge_' + lang, '')) + '</span>'
        '<span class="learning-exit-action">' + ('次へ →' if lang == 'ja' else 'Next →') + '</span></a>'
        + previous_link + '</nav>')

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
                     'og:url', 'og:site_name', 'og:locale', 'og:locale:alternate'}
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
        # Generate the dropdown in the header so it also works without JavaScript.
        node.children = [child for child in node.children if not (
            isinstance(child, Element) and 'lang-btn' in (child.attrs.get('class') or '').split())]
        if 'nav' in (node.attrs.get('class') or '').split():
            contact = next((child for child in node.children if isinstance(child, Element)
                            and 'end' in (child.attrs.get('class') or '').split()), None)
            if contact:
                contact.children = ['Contact']
                actions = Element('div', [('class', 'nav-actions')], '<div class="nav-actions">', '</div>')
                actions.children = [contact, render_language_menu(path, lang)]
                node.children[node.children.index(contact)] = actions
                node.set('class', node.attrs['class'] + ' has-language')
        if page and 'crumb' in (node.attrs.get('class') or '').split():
            crumb = ['<span class="crumb-item"><a href="/">Home</a></span>']
            crumb.append('<span class="crumb-item"><span class="sep" aria-hidden="true">/</span>' +
                         '<a href="' + localized('/learn/', lang) + '">' +
                         ('基礎から学ぶ' if lang == 'ja' else 'Learn') + '</a></span>')
            crumb.extend('<span class="crumb-item"><span class="sep" aria-hidden="true">/</span>' +
                         '<span>' + esc(item['name_' + lang]) + '</span></span>'
                         for item in page_hierarchy(registry, page))
            crumb.append('<span class="crumb-item crumb-current" aria-current="page">' +
                         '<span class="sep" aria-hidden="true">/</span><span>' +
                         esc(page['title_' + lang]) + '</span></span>')
            node.children = [''.join(crumb)]
    next_card = render_next(page, registry, lang)
    if next_card:
        body = next(n for n in nodes if n.tag == 'body')
        footer = next(n for n in body.children if isinstance(n, Element) and n.tag == 'footer')
        body.children.insert(body.children.index(footer), next_card)
    return '<!-- Generated by tools/build_site.py; edit the bilingual source, not this file. -->\n' + doc.render()
