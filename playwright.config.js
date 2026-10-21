import { defineConfig } from '@playwright/test';

const port = Number(process.env.BRICK_TEST_PORT) || 5179;
const channel = process.env.BRICK_TEST_CHANNEL ?? 'chrome';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  use: {
    baseURL,
    // Installed Chrome by default, because that is what the family plays on. A machine without it (a fresh Mac,
    // a CI box) sets BRICK_TEST_CHANNEL= to fall back to the Chromium Playwright downloads itself.
    ...(channel ? { channel } : {}),
    headless: true,
    viewport: { width: 1440, height: 1080 },
    launchOptions: { args: ['--enable-webgl', '--ignore-gpu-blocklist'] },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
