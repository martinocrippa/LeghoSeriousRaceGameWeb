import { test, expect } from '@playwright/test';
import { openScreen } from './helpers.js';

test('the back arrow turns the rocket round: it leaves behind the car and hunts whoever is chasing', async ({ page }) => {
  await openScreen(page, 'track');
  await page.locator('#start-race').click();
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.race.state)).toBe('racing');

  // Put the player ahead with a rival right behind, hand them a rocket, then fire while holding back.
  const shot = await page.evaluate(() => {
    const { race } = window.__BRICK_RACERS__;
    const me = race.racers[0], chaser = race.racers.find((r) => r !== me);
    me.progress = 300; me.item = 'rocket'; me.lane = 0;
    chaser.progress = 260; chaser.lane = 0;
    race.update(1 / 60, [{ steer: 0, useItem: false }]);
    race.update(1 / 60, [{ steer: 0, useItem: true, aimBack: true }]);
    const rocket = race.projectiles.at(-1);
    return { back: rocket.back, targetId: rocket.targetId, chaserId: chaser.id, start: rocket.distance, at: me.progress };
  });
  expect(shot.back).toBe(true);
  expect(shot.targetId).toBe(shot.chaserId);
  expect(shot.start).toBeLessThan(shot.at);

  // It travels backwards, and it reaches the car behind.
  const hit = await page.evaluate(() => {
    const { race } = window.__BRICK_RACERS__;
    const chaser = race.racers.find((r) => r !== race.racers[0]);
    const first = race.projectiles.at(-1).distance;
    for (let i = 0; i < 60 && !chaser.stun; i++) race.update(1 / 60, [{ steer: 0 }]);
    return { moved: (race.projectiles.at(-1)?.distance ?? -Infinity) < first, stunned: chaser.stun > 0 };
  });
  expect(hit.moved || hit.stunned).toBe(true);
  expect(hit.stunned).toBe(true);
});
