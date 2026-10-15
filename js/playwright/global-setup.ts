import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSkipRequested } from './env';

const JS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Build the frontend before the browser suite runs.
 *
 * The fixtures under playwright/fixtures/ import the *shipped* bundle
 * (../../../docs/lightener-curve-card.js), not the TypeScript source. Without
 * this step a bare `npx playwright test` after editing js/src tests the
 * previous build, so a broken change can report green.
 *
 * `npm run test:browser` builds first and sets PLAYWRIGHT_SKIP_BUILD=1, so
 * rollup does not run twice there.
 */
export default function globalSetup(): void {
  if (buildSkipRequested()) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[playwright] building the frontend bundle before the suite');
  execFileSync('npm', ['run', 'build'], { cwd: JS_DIR, stdio: 'inherit' });
}
