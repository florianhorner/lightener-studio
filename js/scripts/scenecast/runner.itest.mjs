/**
 * Scenecast integration tests (node:test). These drive the real runner (vite +
 * Playwright + encode), so they are SLOW (~30s each) and live outside the fast
 * `vitest` unit suite. Run via `npm run demo:test` (CI browser job).
 *
 * Covers the complete-set chosen in plan-eng-review:
 *  - rot guard + STRUCTURAL determinism (two --check runs → identical STATEHASH)
 *  - encode assertion (real GIF: exists, dims, < budget, SHA sidecar)
 *  - failure path (broken scene → non-zero exit)
 *
 * Note: determinism is STRUCTURAL (logical state), not byte-pixel — Chromium
 * raster has sub-perceptual AA jitter on ~1-3 reflow frames per run, so PNG
 * bytes are not reproducible. STATEHASH is.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const JS_DIR = resolve(HERE, '../..');
const REPO_ROOT = resolve(HERE, '../../..');
const RUNNER = join(HERE, 'runner.mjs');
const SCENE = join(JS_DIR, 'scenes', 'lightener.scene.mjs');
const BROKEN = join(HERE, '__fixtures__', 'broken.scene.mjs');

function runCheck(scene) {
  return execFileSync('node', [RUNNER, scene, '--check'], { cwd: JS_DIR, encoding: 'utf8' });
}
function parse(out, key) {
  const m = out.match(new RegExp(`^${key} (.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

test('rot guard --check passes and is structurally deterministic', { timeout: 180000 }, () => {
  const a = runCheck(SCENE);
  const b = runCheck(SCENE);
  assert.match(a, /--check PASSED/);
  assert.match(b, /--check PASSED/);
  // Frame count + dims are exact; STATEHASH (logical state) is reproducible.
  assert.equal(parse(a, 'FRAMES'), parse(b, 'FRAMES'));
  assert.equal(parse(a, 'DIMS'), parse(b, 'DIMS'));
  assert.equal(parse(a, 'DIMS'), '1520x1440'); // 2× of 760x720
  assert.equal(parse(a, 'STATEHASH'), parse(b, 'STATEHASH'), 'STATEHASH must match across runs');
});

test('capture produces a valid GIF under budget + SHA sidecar', { timeout: 180000 }, () => {
  execFileSync('node', [RUNNER, SCENE], { cwd: JS_DIR, stdio: 'ignore' });
  const gif = resolve(REPO_ROOT, '.github/assets/lightener-curve-editor-demo.gif');
  assert.ok(existsSync(gif), 'GIF written');
  const bytes = statSync(gif).size;
  assert.ok(bytes > 10_000, 'GIF is non-trivial');
  assert.ok(bytes < 1.5 * 1024 * 1024, `GIF ${(bytes / 1024 / 1024).toFixed(2)}MB under 1.5MB budget`);
  // GIF header dims (logical-screen-descriptor: LE uint16 at bytes 6 and 8).
  const head = readFileSync(gif).subarray(0, 10);
  assert.equal(head.toString('ascii', 0, 3), 'GIF');
  assert.equal(head.readUInt16LE(6), 760, 'GIF width == gifWidth');
  const meta = JSON.parse(readFileSync(resolve(REPO_ROOT, '.github/assets/demo-meta.json'), 'utf8'));
  assert.match(meta.source_sha, /^[0-9a-f]{7,40}$|^unknown$/, 'sidecar carries source SHA');
  assert.equal(meta.generated_for, '.github/assets/lightener-curve-editor-demo.gif');
});

test('broken scene fails the rot guard (non-zero exit)', { timeout: 120000 }, () => {
  assert.throws(
    () => execFileSync('node', [RUNNER, BROKEN, '--check'], { cwd: JS_DIR, stdio: 'pipe' }),
    /Command failed/,
    'a broken choreography must fail --check'
  );
});
