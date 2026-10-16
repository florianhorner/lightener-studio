import { defineConfig, devices } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { derivePort } from './playwright/env';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Each checkout serves on its own port; see derivePort in playwright/env.ts.
// reuseExistingServer adopts whatever already listens there, so a fixed port
// let a sibling worktree's vite answer these tests.
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
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
