import { expect } from '@playwright/test';

/**
 * Personal cars as the game saved them while it still had "Crea dalla foto": format 1 (no parts, no height) and
 * format 2. The game no longer makes new ones, so the tests put them in the garage the way an old save would.
 */
export const SAVED_CARS = [
  { id: 'custom-1726480000000', name: 'Il mio bolide', color: '#d23b2f', accent: '#f2c230', shape: 'racer', width: 1.8, length: 3.1, version: 2, height: 1.1, parts: ['highWing'], palette: ['#d23b2f', '#f2c230', '#222222'], description: 'La tua costruzione, pronta a bruciare l’asfalto.' },
  { id: 'custom-1726400000000', name: 'Vecchia gloria', color: '#2f6fd2', accent: '#ffffff', shape: 'truck', width: 1.6, length: 3.4 },
];

/** Seeds the saved garage before the page loads; a reload keeps whatever the game has written since. */
export async function seedGarage(page, cars = SAVED_CARS) {
  await page.addInitScript((saved) => {
    if (localStorage.getItem('brick-racers:garage') === null) localStorage.setItem('brick-racers:garage', saved);
  }, JSON.stringify(cars));
}

/** Arcade flow: START → mode (players, mode) → cars → track. Leaves the page on the requested screen. */
export async function openScreen(page, target, { players = 1, mode = 'single' } = {}) {
  await page.goto('/');
  await expect(page.locator('#press-start')).toBeVisible();
  if (target === 'attract') return;
  await page.locator('#press-start').click();
  await expect(page.locator('#screen-mode')).toBeVisible();
  if (players === 2) await page.locator('[data-players="2"]').click();
  if (target === 'mode') return;
  await page.locator(`[data-mode="${mode}"]`).click();
  await expect(page.locator('#screen-cars')).toBeVisible();
  if (target === 'cars') return;
  if (players === 2) await page.locator('[data-pilot="1"]').click();
  await page.locator('#to-track').click();
  await expect(page.locator('#screen-track')).toBeVisible();
}
