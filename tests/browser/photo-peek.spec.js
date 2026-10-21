import { test, expect } from '@playwright/test';
import { openScreen } from './helpers.js';

test('the photo button swaps a car card between its 3D model and the real photo', async ({ page }) => {
  await openScreen(page, 'cars');
  const before = await page.evaluate(() => window.__BRICK_RACERS__.selected[0].id);
  const card = page.locator('[data-car="sample-dragster"]');
  await card.scrollIntoViewIfNeeded();
  const peek = card.locator('.photo-peek');
  await expect(peek).toHaveCount(1);
  await expect(peek).toHaveAttribute('aria-label', 'Guarda la foto vera');
  // A car of the Scuderia has no photo behind it, so it has no button.
  await expect(page.locator('[data-car="squalo"] .photo-peek')).toHaveCount(0);

  await peek.click();
  const shot = card.locator('img');
  await expect(shot).toHaveAttribute('src', /sample\/.*\.jpg$/);
  await expect(shot).toHaveAttribute('loading', 'lazy');
  await expect(card.locator('.photo-peek')).toHaveAttribute('aria-label', 'Torna al modello 3D');
  // Showing the photo must not pick the car: the selection is exactly what it was.
  expect(await page.evaluate(() => window.__BRICK_RACERS__.selected[0].id)).toBe(before);
  await page.screenshot({ path: 'artifacts/garage-foto-vera.png' });

  await card.locator('.photo-peek').click();
  await expect(card.locator('img')).toHaveAttribute('src', /^data:image/);
});
