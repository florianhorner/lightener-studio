import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Every script the fixtures import. The fixture pages themselves are not
 * listed: vite serves HTML through its own transform and has no raw form for
 * it, and a sibling checkout serving different pages would also be serving
 * these scripts.
 */
const LOADED = [
  'docs/lightener-curve-card.js',
  'custom_components/lightener_studio/frontend/lightener-panel.js',
  'js/src/utils/graph-math.ts',
];

/**
 * Vite rewrites what it serves (an injected client import, inline source maps,
 * TypeScript compiled to JavaScript), so a plain request cannot be compared
 * with the disk. Its `?raw` query returns the file's exact contents as
 * `export default "<JSON string>"`, which can.
 */
async function servedContents(
  request: import('@playwright/test').APIRequestContext,
  path: string
): Promise<string> {
  const response = await request.get(`/${path}?raw`);
  expect(response.status(), `GET /${path}?raw`).toBe(200);
  const body = (await response.text()).replace(/\n\/\/# sourceMappingURL=[^\n]*\n?$/, '');
  const literal = body.match(/^export default ("(?:[^"\\]|\\.)*");?\s*$/s);
  expect(literal, `/${path}?raw is not a raw export`).not.toBeNull();
  return JSON.parse(literal![1]) as string;
}

/**
 * Guards the premise of every other spec in this directory: that the server
 * answering them is serving this checkout.
 *
 * The config derives a per-checkout port, so sibling worktrees rarely share
 * one; when two do, `reuseExistingServer` adopts whichever started first, and
 * the suite would measure the other checkout's files. This spec makes that
 * case fail instead of passing quietly. It cannot tell whether the bundle was
 * rebuilt -- disk and server would agree on a stale bundle -- which is why
 * playwright/global-setup.ts builds before every run.
 */
for (const path of LOADED) {
  test(`serves this checkout's ${path}`, async ({ request }) => {
    const onDisk = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
    expect(
      (await servedContents(request, path)) === onDisk,
      `The server on this port is not serving this checkout's ${path}. Another ` +
        'worktree probably owns the port: pick a free one with ' +
        'PLAYWRIGHT_PORT=<port>, or stop that server if it is yours ' +
        '(`lsof -nP -iTCP -sTCP:LISTEN | grep node`).'
    ).toBe(true);
  });
}
