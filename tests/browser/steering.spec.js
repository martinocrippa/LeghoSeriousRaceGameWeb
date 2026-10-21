import { test, expect } from '@playwright/test';
import { openScreen } from './helpers.js';

/**
 * The children pressed the right arrow and the car went left. A lane value alone cannot catch that: lanes grow toward
 * the left of the screen on purpose (see the `frame` comment in src/track.js), so the only honest test projects the
 * car through the chase camera and asks where it ended up ON SCREEN.
 */
async function screenX(page) {
  return page.evaluate(() => {
    const { renderer, race } = window.__BRICK_RACERS__;
    const model = renderer.racerModels.get(race.racers[0].id);
    return model.root.position.clone().project(renderer.cameras[0]).x;
  });
}

test('the right arrow moves the car to the right of the screen, and the left arrow to the left', async ({ page }) => {
  await openScreen(page, 'track');
  await page.locator('#start-race').click();
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.race.state)).toBe('racing');

  // Hold each arrow long enough for the lane to move and the chase camera to settle on the new trajectory.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(900);
  const right = await screenX(page);
  await page.keyboard.up('ArrowRight');

  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(1400);
  const left = await screenX(page);
  await page.keyboard.up('ArrowLeft');

  expect(right).toBeGreaterThan(left);
  expect(right).toBeGreaterThan(0);
  expect(left).toBeLessThan(0);
});
