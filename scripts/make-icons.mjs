// Draws the app icons (public/icons/) from public/favicon.svg, for the manifest and the iPhone/iPad home screen:
// 192 and 512 as they are, a "maskable" 512 (the drawing inside the safe circle on a full background, which
// Android crops to its own shape) and the 180 apple-touch-icon (no transparency allowed there).
// Uses the installed Chrome through @playwright/test, like the browser tests. Usage: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const BACKGROUND = '#07080f';
const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const draw = async (file, size, { inset = 0, background = null } = {}) => {
  await page.setViewportSize({ width: size, height: size });
  const img = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const pad = Math.round(size * inset);
  await page.setContent(`<body style="margin:0;background:${background || 'transparent'}"><img src="${img}" style="display:block;margin:${pad}px;width:${size - 2 * pad}px;height:${size - 2 * pad}px"></body>`);
  await page.screenshot({ path: new URL(file, out).pathname.replace(/^\/([A-Za-z]:)/, '$1'), omitBackground: !background });
  console.log('icons/' + file);
};
await draw('icon-192.png', 192);
await draw('icon-512.png', 512);
await draw('icon-maskable-512.png', 512, { inset: 0.1, background: BACKGROUND });
await draw('apple-touch-icon.png', 180, { background: BACKGROUND });
await browser.close();
