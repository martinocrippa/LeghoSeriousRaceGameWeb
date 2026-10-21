import { expect } from '@playwright/test';

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
