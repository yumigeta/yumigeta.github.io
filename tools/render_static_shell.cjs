// Run the shared navigation renderers at publication time, without running
// analytics, page/figure scripts, network requests, or a browser.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Optional dependency location for filesystems that cannot host node_modules.
const buildRequire = process.env.SITE_BUILD_RUNTIME
  ? require('node:module').createRequire(path.join(process.env.SITE_BUILD_RUNTIME, 'package.json')) : require;
const { parseHTML } = buildRequire('linkedom');

async function renderStaticShell(source, route, registry, assetRoot) {
  const { document } = parseHTML(source);
  const window = { document, addEventListener() {} };
  const lang = document.documentElement.getAttribute('data-page-lang');
  const location = new URL(route, 'https://yumigeta.com');
  const media = () => ({ matches: false, addEventListener() {}, addListener() {} });
  const storage = { getItem() { return null; }, setItem() {} };
  Object.assign(window, { location, localStorage: storage, matchMedia: media });
  window.learnHref = slug => (lang === 'ja' ? '/ja' : '') + '/learn/' + (slug ? slug + '/' : '');
  const context = vm.createContext({ window, document, location, localStorage: storage,
    URL, console, setTimeout() {}, fetch: async () => ({ json: async () => registry }) });
  const run = name => vm.runInContext(fs.readFileSync(path.join(assetRoot, 'js', name), 'utf8'), context,
    { filename: name, timeout: 10000 });
  run('site-nav.js');
  run('article-shell.js');
  await new Promise(resolve => setImmediate(resolve));
  if (!document.querySelector('.ashelf-list a') || document.querySelector('.shell-bare')) {
    throw new Error('Static shell failed: ' + route);
  }
  document.documentElement.setAttribute('data-static-shell', 'article');
  document.querySelectorAll('.i18n-' + (lang === 'ja' ? 'en' : 'ja')).forEach(el => el.remove());
  document.querySelectorAll('[data-nav-active]').forEach(el => el.removeAttribute('data-nav-active'));
  document.querySelectorAll('.ashelf-collapse').forEach(el => el.removeAttribute('open'));
  document.querySelectorAll('.rv').forEach(el => el.classList.add('in'));
  return document.toString();
}

if (require.main === module) {
  (async () => {
    const [root, ...routes] = process.argv.slice(2);
    const registry = JSON.parse(fs.readFileSync(path.join(root, 'learn/pages.json'), 'utf8'));
    const assets = path.join(root, 'assets/learn-v2');
    for (const route of routes) {
      const file = path.join(root, route, 'index.html');
      const html = await renderStaticShell(fs.readFileSync(file, 'utf8'), route, registry, assets);
      fs.writeFileSync(file, html);
    }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
