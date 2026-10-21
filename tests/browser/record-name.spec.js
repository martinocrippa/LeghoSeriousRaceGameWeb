import { test, expect } from '@playwright/test';
import { openScreen } from './helpers.js';

test('a new time-trial record asks who set it, remembers the name and shows it on the circuit', async ({ page }) => {
  await openScreen(page, 'track', { mode: 'time' });
  await page.locator('#start-race').click();
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.race.state)).toBe('racing');

  // Put the car within sight of the finish and let the real loop cross it, so the results modal opens for real.
  await page.evaluate(() => {
    const { race } = window.__BRICK_RACERS__;
    race.racers[0].progress = race.trackLength * race.totalLaps - 12;
  });
  await expect(page.locator('#record-pilot')).toBeVisible();

  await page.locator('#record-pilot').fill('Ada');
  await page.keyboard.press('Tab');

  const stored = await page.evaluate(() => ({
    records: JSON.parse(localStorage.getItem('brick-racers:records') || '{}'),
    pilots: JSON.parse(localStorage.getItem('brick-racers:pilots') || '[]'),
  }));
  expect(Object.values(stored.records).map((r) => r.pilot)).toContain('Ada');
  expect(stored.pilots).toContain('Ada');

  // Back on the track picker the circuit now says whose record it is.
  await page.locator('#results-garage').click();
  await expect(page.locator('.record')).toContainText('record di Ada');

  // Racing again offers the name already used, one tap away.
  await page.locator('#start-race').click();
  await expect.poll(() => page.evaluate(() => window.__BRICK_RACERS__.race.state)).toBe('racing');
  await page.evaluate(() => {
    const { race } = window.__BRICK_RACERS__;
    race.racers[0].progress = race.trackLength * race.totalLaps - 12;
    race.racers[0].speed = 60;
  });
  await expect(page.locator('.pilot-chip')).toHaveText(['Ada']);
});
