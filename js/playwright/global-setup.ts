import type { FullConfig } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSkipRequested } from './env';

const JS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IDENTITY_DIR = resolve(JS_DIR, 'playwright', 'server-identity');

/**
 * Build the frontend, then prove the dev server is serving this checkout.
 *
 * The fixtures under playwright/fixtures/ import the *shipped* bundle
 * (../../../docs/lightener-curve-card.js), not the TypeScript source. Without
 * the build a bare `npx playwright test` after editing js/src tests the
 * previous build, so a broken change can report green. `npm run test:browser`
 * builds first and sets PLAYWRIGHT_SKIP_BUILD=1, so rollup does not run twice.
 *
 * The config starts a fresh server and rejects occupied ports. Every run also
 * writes a token under playwright/server-identity/ and requires the server to
 * serve it back, verifying the served checkout even with an alternate config.
 * Playwright starts the server before global setup, and global setup runs
 * whatever tests are selected, so a filtered run cannot skip this check.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  if (!buildSkipRequested()) {
    // eslint-disable-next-line no-console
    console.log('[playwright] building the frontend bundle before the suite');
    execFileSync('npm', ['run', 'build'], { cwd: JS_DIR, stdio: 'inherit' });
  }
  await requireThisCheckoutsServer(config);
}

async function requireThisCheckoutsServer(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) {
    throw new Error('[playwright] no baseURL configured; cannot check the dev server');
  }
  const token = randomBytes(16).toString('hex');
  rmSync(IDENTITY_DIR, { recursive: true, force: true });
  mkdirSync(IDENTITY_DIR, { recursive: true });
  writeFileSync(resolve(IDENTITY_DIR, `${token}.txt`), token);

  // A .txt is served as a static file, byte for byte, so it compares exactly.
  const url = `${baseURL}/js/playwright/server-identity/${token}.txt`;
  let served: string | null = null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    served = response.ok ? await response.text() : null;
  } catch {
    served = null;
  }
  if (served !== token) {
    throw new Error(
      `[playwright] the server at ${baseURL} is not serving this checkout: it ` +
        'could not return the token this run just wrote. Another worktree ' +
        'probably owns the port. Pick a free one with PLAYWRIGHT_PORT=<port>, or ' +
        'stop that server if it is yours (lsof -nP -iTCP -sTCP:LISTEN | grep node).'
    );
  }
}
