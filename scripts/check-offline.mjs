// Checks that the built game works without a network: serves dist/ with `vite preview`, opens it once in Chrome,
// waits for the service worker (scripts/offline-plugin.mjs) to cache everything, cuts the network, reloads and
// starts a race on Como, whose scenery is a separate file loaded on demand. Fails on any page error.
// Usage: npm run build, then node scripts/check-offline.mjs
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4179, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
let failed = false;
try {
  await page.goto('http://127.0.0.1:4179/');
  const cached = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const keys = await caches.keys();
    return { active: !!reg.active, files: keys.length ? (await (await caches.open(keys[0])).keys()).length : 0 };
  });
  console.log(`service worker active: ${cached.active}, files cached: ${cached.files}`);
  if (!cached.active || cached.files < 10) throw new Error('nothing cached');

  await context.setOffline(true);
  await page.reload();
  await page.locator('#press-start').click();
  await page.locator('[data-mode="single"]').click();
  await page.locator('#to-track').click();
  await page.locator('[data-track="como"]').click();
  await page.locator('#start-race').click();
  await page.waitForFunction(() => document.querySelector('#map-label')?.textContent.includes('COMO'), null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  console.log(`offline: race on ${await page.locator('#map-label').textContent()} started`);
} catch (e) {
  failed = true;
  console.error(e.message);
}
if (errors.length) { failed = true; console.error(errors.join('\n')); }
await browser.close();
await server.close();
console.log(failed ? 'OFFLINE CHECK FAILED' : 'offline check passed');
process.exit(failed ? 1 : 0);
