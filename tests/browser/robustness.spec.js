import { test, expect } from '@playwright/test';
import { openScreen } from './helpers.js';

const setHidden = (page, hidden) => page.evaluate((h) => {
  Object.defineProperty(document, 'hidden', { value: h, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

test('a hidden tab pauses the race and stops the audio clock; back on the tab the sound comes back', async ({ page }) => {
  await openScreen(page, 'track');
  await page.locator('#start-race').click();
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.race.state)).toBe('racing');

  await setHidden(page, true);
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.paused)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.audio.context?.state)).toBe('suspended');

  await setHidden(page, false);
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.audio.context?.state)).toBe('running');
  await expect(page.locator('#resume-race')).toBeVisible(); // still paused: the child presses Continua
});

test('the graphics card resetting mid-race stops the game behind a message that offers a reload', async ({ page }) => {
  await openScreen(page, 'track');
  await page.locator('#start-race').click();
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.race.state)).toBe('racing');

  await page.evaluate(() => window.__BRICK_RACERS__.renderer.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('.graphics-lost')).toBeVisible();
  await expect(page.locator('.graphics-lost button')).toBeFocused();
  expect(await page.evaluate(() => window.__BRICK_RACERS__.paused)).toBe(true);

  // Escape no longer resumes a race that cannot be drawn.
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__BRICK_RACERS__.paused)).toBe(true);
  await page.screenshot({ path: 'artifacts/graphics-lost.png' });
});
