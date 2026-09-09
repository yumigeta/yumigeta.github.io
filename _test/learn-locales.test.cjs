// Browser integration test. Requires Playwright; run after build_site.py.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../_site');
const registry = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../learn/pages.json'), 'utf8'));
const routes = ['/learn/', ...registry.pages.filter(p => p.published && !p.planned).map(p => '/learn/' + p.slug + '/')];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.SITE_BROWSER || 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route(/google-analytics\.com|googletagmanager\.com/, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    const missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(origin) && response.status() >= 400) missing.push(response.url());
    });
    for (const lang of ['ja', 'en']) {
      for (const route of routes) {
        const target = (lang === 'ja' ? '/ja' : '') + route;
        const response = await page.goto(origin + target, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        await page.waitForSelector('.ashelf-list a', { state: 'attached' });
        assert.equal(await page.locator('html').getAttribute('lang'), lang);
        const menuLabels = await page.locator('header.site-nav .links a').allInnerTexts();
        assert.ok(menuLabels.every(label => label.trim()), 'Empty top navigation on ' + target);
        const bad = await page.locator('a[href]').evaluateAll((anchors, expected) =>
          anchors.filter(a => !a.classList.contains('lang-btn') &&
            /^\/(?:ja\/)?learn\//.test(a.getAttribute('href')) &&
            a.getAttribute('href').startsWith('/ja/learn/') !== (expected === 'ja')).map(a => a.getAttribute('href')), lang);
        assert.deepEqual(bad, [], 'A link changes language on ' + target);
        if (route !== '/learn/') {
          assert.ok(await page.locator('canvas, svg').count(), 'Missing figure: ' + target);
          const slider = page.locator('input[type="range"]').first();
          if (await slider.count()) {
            await slider.evaluate(el => {
              el.value = String((Number(el.min || 0) + Number(el.max || 100)) / 2);
              el.dispatchEvent(new Event('input', { bubbles: true }));
            });
          }
          assert.ok(await page.locator('.nextcard').count() <= 1, 'Duplicate related cards');
        }
        console.log('PASS ' + target);
      }
    }
    // A direct URL overrides an opposite saved preference.
    await page.evaluate(() => localStorage.setItem('lang', 'en'));
    await page.goto(origin + '/ja/learn/graphene-tight-binding/');
    await page.waitForSelector('.ashelf-list a', { state: 'attached' });
    assert.equal(await page.locator('html').getAttribute('lang'), 'ja');
    // Follow a related article and the index using actual clicks.
    const related = page.locator('.nextcard a').first();
    if (await related.count()) {
      await related.click();
      await page.waitForSelector('.ashelf-list a', { state: 'attached' });
      assert.ok(new URL(page.url()).pathname.startsWith('/ja/learn/'));
    }
    await page.locator('.ashelf-home').click();
    await page.waitForSelector('#learn-sections a.et');
    assert.equal(new URL(page.url()).pathname, '/ja/learn/');
    await page.locator('#learn-sections a.et').first().click();
    await page.waitForSelector('.ashelf-list a', { state: 'attached' });
    assert.ok(new URL(page.url()).pathname.startsWith('/ja/learn/'));
    // A normal language link navigates to the matching English page.
    const expectedEnglish = new URL(page.url()).pathname.replace('/ja/', '/');
    await page.locator('.lang-btn').click();
    await page.waitForSelector('.ashelf-list a', { state: 'attached' });
    assert.equal(new URL(page.url()).pathname, expectedEnglish);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    // The existing English home page remembers Japanese for Learn entry links.
    await page.goto(origin + '/ja/learn/');
    await page.goto(origin + '/');
    const homeLinks = await page.locator('a[href^="/ja/learn/"]').count();
    assert.ok(homeLinks > 0, 'Home Learn links forgot Japanese');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');

    await page.goto(origin + '/ja/learn/graphene-tight-binding/');
    await page.waitForSelector('.ashelf-list a', { state: 'attached' });
    if (process.env.SITE_SCREENSHOTS) {
      fs.mkdirSync(process.env.SITE_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: path.join(process.env.SITE_SCREENSHOTS, 'learn-ja-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });

      await page.screenshot({ path: path.join(process.env.SITE_SCREENSHOTS, 'learn-ja-mobile.png') });
      await page.locator('.nav-toggle').click();
      const mobileMenu = await page.locator('header.site-nav .links a').allInnerTexts();
      assert.ok(mobileMenu.every(label => label.trim()), 'Empty mobile navigation');
      await page.locator('header.site-nav .links a[aria-current="page"]').click();
      await page.waitForSelector('#learn-sections a.et');
      assert.equal(new URL(page.url()).pathname, '/ja/learn/');
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Horizontal overflow');
    assert.deepEqual(errors, [], 'Browser errors');
    assert.deepEqual(missing, [], 'Missing local assets');

    const plain = await browser.newContext({ javaScriptEnabled: false });
    const nojs = await plain.newPage();
    await nojs.goto(origin + '/ja/learn/');
    assert.equal(await nojs.locator('#learn-sections a.et').count(), routes.length - 1);
    assert.equal(await nojs.locator('html').getAttribute('lang'), 'ja');
    await nojs.locator('.lang-btn').click();
    assert.equal(new URL(nojs.url()).pathname, '/learn/');
    console.log('PASS navigation, saved language, language switching, figures, mobile width, and no-JavaScript index');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
