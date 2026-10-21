import { test, expect } from '@playwright/test';
import { openScreen } from './helpers.js';

/**
 * The game declares a Content-Security-Policy in index.html that forbids loading anything from outside its own
 * origin. That is only worth having if it is checked: this races a lap and fails on any refused resource — or on
 * any console error at all, which is a cheap smoke test in its own right.
 */
test('the game runs a lap with no console errors and nothing refused by the Content-Security-Policy', async ({ page }) => {
  const problems = [];
  page.on('console', (msg) => { if (msg.type() === 'error') problems.push(msg.text()); });
  page.on('pageerror', (e) => problems.push(e.message));
  await openScreen(page, 'track');
  await page.locator('#start-race').click();
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__?.race?.state)).toBe('racing');
  await page.waitForTimeout(1500);
  expect(problems.filter((p) => /Content Security Policy|Refused to/i.test(p))).toEqual([]);
  expect(problems).toEqual([]);
});
