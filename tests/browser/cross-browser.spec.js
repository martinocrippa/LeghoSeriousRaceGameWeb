import { test, expect } from '@playwright/test';
import { openScreen } from './helpers.js';

/**
 * The smoke test that runs on Firefox and WebKit as well as Chrome (`npm run test:browsers`).
 *
 * It is deliberately short. The rest of the suite exercises the game in depth and only needs to do that once; what
 * this one answers is the question that actually differs between engines: does WebGL come up, does the arcade flow
 * work, does a race start and can it be driven with nothing but the arrow keys and Enter. Anything that fails here
 * fails for a child whose family uses Safari or Firefox, which is the whole point of having it.
 */
test('the game starts, a race runs and the keyboard alone gets you there', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#press-start')).toBeVisible();
  // The 3D canvas has to exist: without WebGL the game shows its "open it in another browser" panel instead.
  await expect(page.locator('#viewport canvas')).toHaveCount(1, { timeout: 20_000 });
  expect(await page.evaluate(() => !!window.__BRICK_RACERS__?.renderer)).toBe(true);

  // Arrows and Enter alone, from the start screen all the way to the grid.
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-mode')).toBeVisible();
  // Right moves to the cup and left comes back to the single race: the cup has no circuit screen to go through.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-cars')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-track')).toBeVisible();
  // Escape goes back a page, every time.
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-cars')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-track')).toBeVisible();

  await page.locator('#start-race').click();
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.race?.state), { timeout: 20_000 }).toBe('racing');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.up('ArrowRight');
  const car = await page.evaluate(() => {
    const racer = window.__BRICK_RACERS__.race.racers[0];
    return { progress: racer.progress, lane: racer.lane };
  });
  expect(car.progress).toBeGreaterThan(5);
  // Lanes grow to the left of the screen, so steering right makes the lane smaller (see LANE_SIGN in track.js).
  expect(car.lane).toBeLessThan(0);

  // Something was actually drawn. A screenshot is not proof — headless WebKit on Windows can return a blank
  // picture for a canvas that is rendering perfectly well — so the question is put to three.js itself: how many
  // triangles went through the pipe on the last frame.
  // Proof that pixels are being produced, which a screenshot is not: headless WebKit on Windows can hand back a
  // blank picture for a canvas that is drawing perfectly well. three.js is asked directly instead. Its counters
  // reset on every render pass, and a frame ends with the little rear-view mirror, so accumulation is turned on
  // and the total is WAITED for rather than sampled after a fixed pause: on a loaded machine half a second may
  // hold two frames instead of thirty, and a threshold read at that moment fails for the wrong reason.
  await page.evaluate(() => {
    const info = window.__BRICK_RACERS__.renderer.renderer.info;
    info.autoReset = false;
    info.reset();
  });
  await expect
    .poll(() => page.evaluate(() => window.__BRICK_RACERS__.renderer.renderer.info.render.triangles), { timeout: 15_000 })
    .toBeGreaterThan(10_000);
  await page.evaluate(() => { window.__BRICK_RACERS__.renderer.renderer.info.autoReset = true; });

  await page.screenshot({ path: `artifacts/cross-${testInfo.project.name}.png` });
  expect(errors).toEqual([]);
});
