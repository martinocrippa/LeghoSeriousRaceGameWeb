import { test, expect } from '@playwright/test';
import { openScreen } from './helpers.js';

/**
 * A child reported the top-right box "cut in half" and, in fullscreen, part of the top-left one off the screen.
 * The HUD is positioned in fixed pixels inside a `overflow: hidden` race screen, so anything that sticks out is
 * silently clipped instead of failing loudly. This walks every HUD box at several window shapes and asks the only
 * question that matters: is the whole of it on screen?
 */
const SIZES = [
  { name: 'portatile', width: 1280, height: 720 },
  { name: 'schermo grande', width: 1920, height: 1080 },
  { name: 'finestra bassa', width: 1100, height: 520 },
  { name: 'tablet', width: 800, height: 600 },
];

const BOXES = ['.player-hud', '.race-top', '.map-panel', '.race-key-hint'];

async function overflowing(page) {
  return page.evaluate((selectors) => {
    const out = [];
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const box = element.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) continue;
        const over = {
          left: Math.round(-box.left), top: Math.round(-box.top),
          right: Math.round(box.right - window.innerWidth), bottom: Math.round(box.bottom - window.innerHeight),
        };
        // One pixel of slack: sub-pixel layout rounding is not a bug worth failing on.
        const sides = Object.entries(over).filter(([, amount]) => amount > 1).map(([side, amount]) => `${side} +${amount}px`);
        if (sides.length) out.push(`${selector} esce dallo schermo: ${sides.join(', ')}`);
      }
    }
    return out;
  }, BOXES);
}

for (const size of SIZES) {
  test(`l'HUD sta tutto dentro lo schermo · ${size.name} ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await openScreen(page, 'track', { players: 2 });
    await page.locator('#start-race').click();
    await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.race.state)).toBe('racing');
    await page.waitForTimeout(300);
    expect(await overflowing(page)).toEqual([]);
  });
}
