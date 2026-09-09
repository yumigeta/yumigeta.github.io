"""Regression tests for metadata-only sitemap generation."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET
import build_site

class SitemapMetadataTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'site').mkdir()
        (self.root / 'index.html').write_text('<html><head></head><body>Home</body></html>', encoding='utf-8')
        self.site_pages([{'path': '/', 'lastmod': '2026-09-02'}])
        self.root_patch = patch.object(build_site, 'ROOT', self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)

    def site_pages(self, pages):
        (self.root / 'site/pages.json').write_text(json.dumps({'pages': pages}), encoding='utf-8')

    def entries(self, registry, article):
        sources = {'/learn/': (None, None), '/learn/example/': (None, article)}
        tree = build_site.sitemap_document(registry, sources)
        return {node.findtext('loc'): node for node in tree}

    def test_metadata_supplies_dates_and_reciprocal_languages(self):
        entries = self.entries({'index_lastmod': '2026-09-09'}, {'lastmod': '2026-09-08'})
        self.assertEqual(set(entries), {
            'https://yumigeta.com/', 'https://yumigeta.com/learn/', 'https://yumigeta.com/ja/learn/',
            'https://yumigeta.com/learn/example/', 'https://yumigeta.com/ja/learn/example/'})
        self.assertEqual(entries['https://yumigeta.com/'].findtext('lastmod'), '2026-09-02')
        for url in ('https://yumigeta.com/learn/example/', 'https://yumigeta.com/ja/learn/example/'):
            self.assertEqual(entries[url].findtext('lastmod'), '2026-09-08')
            alternates = {link.get('hreflang'): link.get('href') for link in entries[url]
                          if link.tag == '{http://www.w3.org/1999/xhtml}link'}
            self.assertEqual(alternates, {
                'en': 'https://yumigeta.com/learn/example/',
                'ja': 'https://yumigeta.com/ja/learn/example/',
                'x-default': 'https://yumigeta.com/learn/example/'})
        self.assertFalse((self.root / 'sitemap.xml').exists())

    def test_missing_dates_are_omitted_instead_of_invented(self):
        self.site_pages([{'path': '/'}])
        self.assertTrue(all(node.find('lastmod') is None for node in self.entries({}, {}).values()))

    def test_invalid_dates_fail(self):
        for value in ('2026-02-30', '20260909', 'today', 20260909):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.entries({}, {'lastmod': value})

    def test_noindex_or_duplicate_site_page_fails(self):
        self.site_pages([{'path': '/'}, {'path': '/'}])
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            self.entries({}, {})
        self.site_pages([{'path': '/'}])
        (self.root / 'index.html').write_text('<meta name="robots" content="noindex">', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'noindex'):
            self.entries({}, {})

    def test_editable_sitemap_cannot_be_reintroduced(self):
        (self.root / 'sitemap.xml').write_text('<urlset/>', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'generated output only'):
            build_site.build()

if __name__ == '__main__':
    unittest.main()
