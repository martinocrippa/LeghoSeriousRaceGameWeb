import { defineConfig, devices } from '@playwright/test';

/**
 * The cross-browser smoke run (`npm run test:browsers`), separate from the main suite on purpose.
 *
 * The main config runs everything on installed Chrome, which is what the family plays on. This one runs only
 * `cross-browser.spec.js` — start, keyboard flow, a race that moves — on Chromium, Firefox and WebKit (the engine
 * behind Safari), because those are the three that can disagree about WebGL and about key handling.
 *
 * Firefox and WebKit have to be downloaded once: `npx playwright install firefox webkit`.
 */
const port = Number(process.env.BRICK_TEST_PORT) || 5183;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  testMatch: /cross-browser\.spec\.js/,
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: { baseURL, headless: true, viewport: { width: 1280, height: 900 }, screenshot: 'only-on-failure' },
  projects: [
    // Playwright's own Chromium rather than installed Chrome: this run is about engines, not about one machine.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: undefined } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 40_000,
  },
});
