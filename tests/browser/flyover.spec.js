import { test, expect } from '@playwright/test';
import { openScreen } from './helpers.js';

/** The two helicopter views: the demo reel on the start screen, and "explore" from the track picker. */

test('the start screen flies over random circuits until somebody presses start', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#press-start')).toBeVisible();
  await page.locator('#attract-tour').click();
  // A circuit is picked, its world is built and the helicopter is in the air.
  await expect.poll(() => page.evaluate(() => !!window.__BRICK_RACERS__.renderer?.flyover), { timeout: 15_000 }).toBe(true);
  const first = await page.evaluate(() => window.__BRICK_RACERS__.renderer.track.id);
  await expect(page.locator('#attract-car-name')).not.toBeEmpty();
  // Pressing start puts the showroom back and gets on with the game.
  await page.locator('#press-start').click();
  await expect(page.locator('#screen-mode')).toBeVisible();
  expect(await page.evaluate(() => !!window.__BRICK_RACERS__.renderer.flyover)).toBe(false);
  expect(typeof first).toBe('string');
});

test('"esplora la pista" flies one lap of the chosen circuit and Esc lands it', async ({ page }) => {
  await openScreen(page, 'track');
  await page.locator('[data-track="varese"]').click();
  await page.locator('#explore-track').click();
  await expect.poll(() => page.evaluate(() => !!window.__BRICK_RACERS__.renderer?.flyover), { timeout: 15_000 }).toBe(true);
  // It really travels: the fraction of the lap flown grows.
  const early = await page.evaluate(() => window.__BRICK_RACERS__.renderer.flyover.time);
  await page.waitForTimeout(1500);
  const later = await page.evaluate(() => window.__BRICK_RACERS__.renderer.flyover.time);
  expect(later).toBeGreaterThan(early);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'artifacts/flyover-varese.png' });
  // Escape lands the helicopter and leaves you on the picker rather than jumping back a screen.
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => !!window.__BRICK_RACERS__.renderer.flyover)).toBe(false);
  await expect(page.locator('#screen-track')).toBeVisible();
  // And a second Escape does go back, as it does everywhere else.
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-cars')).toBeVisible();
});
