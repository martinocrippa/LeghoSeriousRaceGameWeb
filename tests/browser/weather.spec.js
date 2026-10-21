import { test, expect } from '@playwright/test';
import { openScreen } from './helpers.js';

test('on the pitch circuit the weather changes with the lap: rain, then sun, and the rain is drawn', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openScreen(page, 'track');
  await page.locator('[data-track="arca"]').click();
  await page.locator('#start-race').click();
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.race.state)).toBe('racing');

  // Lap 1 is the rainy entry: the streaks are on screen.
  await expect.poll(() => page.evaluate(() => !!window.__BRICK_RACERS__.renderer.scene.getObjectByName('rain')?.visible)).toBe(true);
  const wet = await page.evaluate(() => {
    const r = window.__BRICK_RACERS__.renderer;
    return { sun: r.sun.intensity, fogFar: r.scene.fog.far, drops: r.scene.getObjectByName('rain').geometry.attributes.position.count };
  });
  expect(wet.drops).toBeGreaterThan(100);
  await page.screenshot({ path: 'artifacts/track-arca-pioggia.png' });

  // Push the player into lap 2 and let the crossfade finish: the sun comes out and the rain stops.
  await page.evaluate(() => { const { race } = window.__BRICK_RACERS__; race.racers[0].lap = 2; race.racers[0].progress = race.track.length + 20; });
  await page.waitForTimeout(3500);
  const dry = await page.evaluate(() => {
    const r = window.__BRICK_RACERS__.renderer;
    return { sun: r.sun.intensity, fogFar: r.scene.fog.far, rain: !!r.scene.getObjectByName('rain')?.visible };
  });
  expect(dry.sun).toBeGreaterThan(wet.sun + 0.5);
  expect(dry.fogFar).toBeGreaterThan(wet.fogFar + 50);
  expect(dry.rain).toBe(false);
  await page.screenshot({ path: 'artifacts/track-arca-sole.png' });
  expect(errors).toEqual([]);
});
