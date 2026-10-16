import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import {
  BUNDLE_PATHS,
  checkCardRegistration,
  REGISTRATION_MARKERS,
} from './check-card-registration.mjs';

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'lightener-registration-'));
  for (const bundle of BUNDLE_PATHS) {
    const path = join(root, bundle);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, 'window.customCards = [{ getEntitySuggestion: () => null }];');
  }
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test('accepts both bundles with both registration markers', () => {
  assert.deepEqual(checkCardRegistration(root), []);
});

for (const bundle of BUNDLE_PATHS) {
  test(`reports a missing bundle: ${bundle}`, () => {
    rmSync(join(root, bundle));
    assert.deepEqual(checkCardRegistration(root), [`${bundle}: cannot read bundle (ENOENT)`]);
  });

  for (const marker of REGISTRATION_MARKERS) {
    test(`reports missing ${marker} in ${bundle}`, () => {
      writeFileSync(join(root, bundle), REGISTRATION_MARKERS.filter((m) => m !== marker).join(' '));
      assert.deepEqual(checkCardRegistration(root), [
        `${bundle}: missing card-picker registration marker ${marker}`,
      ]);
    });
  }
}

test('reports every missing marker across both bundles', () => {
  for (const bundle of BUNDLE_PATHS) writeFileSync(join(root, bundle), '');
  assert.deepEqual(
    checkCardRegistration(root),
    BUNDLE_PATHS.flatMap((bundle) =>
      REGISTRATION_MARKERS.map(
        (marker) => `${bundle}: missing card-picker registration marker ${marker}`
      )
    )
  );
});

for (const valid of [true, false]) {
  test(`CLI exits ${valid ? 0 : 1} and resolves bundles independently of cwd`, () => {
    const script = join(root, 'js/scripts/check-card-registration.mjs');
    mkdirSync(dirname(script), { recursive: true });
    copyFileSync(new URL('./check-card-registration.mjs', import.meta.url), script);
    if (!valid) writeFileSync(join(root, BUNDLE_PATHS[1]), 'customCards');
    const result = spawnSync(process.execPath, [script], { cwd: tmpdir(), encoding: 'utf8' });
    assert.equal(result.status, valid ? 0 : 1, result.stderr);
    if (valid) {
      assert.match(result.stdout, /registration markers present in both bundles/);
    } else {
      assert.match(result.stderr, /docs\/lightener-curve-card.js: missing.*getEntitySuggestion/);
    }
  });
}
