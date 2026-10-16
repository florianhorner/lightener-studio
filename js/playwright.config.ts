import { defineConfig, devices } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { derivePort } from './playwright/env';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Derive a port per checkout and start a fresh server for each run.
const PORT = derivePort(REPO_ROOT);
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './playwright',
  globalSetup: './playwright/global-setup.ts',
  fullyParallel: true,
  reporter: 'list',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: ORIGIN,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm exec vite -- .. --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `${ORIGIN}/js/playwright/fixtures/long-name-card.html`,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
