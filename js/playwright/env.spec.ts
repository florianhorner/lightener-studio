import { expect, test } from '@playwright/test';
import { buildSkipRequested, derivePort, PORT_BASE, PORT_SPAN } from './env';

// Pure functions, no browser: these run in milliseconds and pin the two
// environment switches the config reads.

test.describe('PLAYWRIGHT_SKIP_BUILD', () => {
  for (const value of ['1', 'true', 'TRUE', ' yes ']) {
    test(`skips the build for ${JSON.stringify(value)}`, () => {
      expect(buildSkipRequested({ PLAYWRIGHT_SKIP_BUILD: value })).toBe(true);
    });
  }

  test('builds when unset', () => {
    expect(buildSkipRequested({})).toBe(false);
  });

  // A value that is not an explicit yes must build. Skipping on a typo is the
  // failure this switch exists to avoid: a stale bundle that reads green.
  for (const value of ['', ' ', '0', 'false', 'no', 'off', 'n', '00', '0.0', 'skip']) {
    test(`builds for ${JSON.stringify(value)}`, () => {
      expect(buildSkipRequested({ PLAYWRIGHT_SKIP_BUILD: value })).toBe(false);
    });
  }
});

test.describe('dev-server port', () => {
  const checkouts = [
    '/home/dev/lightener-studio',
    '/home/dev/worktrees/lightener-studio-feature',
    '/home/dev/worktrees/lightener-studio-fix',
    '/tmp/lightener-studio-review',
  ];

  test('is the same every time for one checkout', () => {
    expect(derivePort(checkouts[0], {})).toBe(derivePort(checkouts[0], {}));
  });

  test('stays inside its range', () => {
    for (const root of checkouts) {
      const port = derivePort(root, {});
      expect(port).toBeGreaterThanOrEqual(PORT_BASE);
      expect(port).toBeLessThan(PORT_BASE + PORT_SPAN);
    }
  });

  test('differs between sibling checkouts', () => {
    const ports = new Set(checkouts.map((root) => derivePort(root, {})));
    expect(ports.size).toBe(checkouts.length);
  });

  test('PLAYWRIGHT_PORT overrides it', () => {
    expect(derivePort(checkouts[0], { PLAYWRIGHT_PORT: '4999' })).toBe(4999);
    expect(derivePort(checkouts[0], { PLAYWRIGHT_PORT: ' 4999 ' })).toBe(4999);
  });

  test('an empty PLAYWRIGHT_PORT counts as unset', () => {
    expect(derivePort(checkouts[0], { PLAYWRIGHT_PORT: '' })).toBe(derivePort(checkouts[0], {}));
  });

  for (const value of ['0', '-1', '65536', '1.5', 'abc', '0x1F90', '1e3', '80 80']) {
    test(`rejects PLAYWRIGHT_PORT=${JSON.stringify(value)}`, () => {
      expect(() => derivePort(checkouts[0], { PLAYWRIGHT_PORT: value })).toThrow(/PLAYWRIGHT_PORT/);
    });
  }
});
