import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const guide = readFileSync(new URL('../../docs/TROUBLESHOOTING.md', import.meta.url), 'utf8');
const section = guide.split('## Diagnostic: check the served bundle and active card\n')[1]
  ?.split('\n## ')[0];
assert.ok(section, 'the served-bundle diagnostic section must exist');
const snippets = [...section.matchAll(/^```js\n([\s\S]*?)^```/gm)];
assert.equal(snippets.length, 1, 'execute the exact JavaScript diagnostic from the guide');
const diagnostic = snippets[0][1];

const bundle = new TextEncoder().encode('known card bundle');
const lastModified = 'Mon, 19 Oct 2026 12:00:00 GMT';
class ActiveCard {}
Object.defineProperty(ActiveCard.prototype, '_canManageLights', {
  get() { throw new Error('the diagnostic must inspect, not invoke, the getter'); },
});

async function runDiagnostic(overrides = {}) {
  const globals = {
    crypto: webcrypto,
    customElements: {
      get(name) {
        assert.equal(name, 'lightener-curve-card');
        return ActiveCard;
      },
    },
    window: { __LIGHTENER_CURVE_CARD_VERSION__: '2.17.3' },
    fetch: async (url, options) => {
      assert.equal(url, '/lightener/lightener-curve-card.js');
      assert.equal(options.cache, 'no-store');
      return {
        ok: true,
        headers: new Headers({ 'last-modified': lastModified }),
        arrayBuffer: async () => bundle.slice().buffer,
      };
    },
    ...overrides,
  };
  return JSON.parse(await runInNewContext(diagnostic, globals));
}

function assertActiveCard(result) {
  assert.equal(result.className, 'ActiveCard');
  assert.equal(result.hasCanManageLights, true);
  assert.equal(result.cardVersion, '2.17.3');
}

function assertFetchedBundle(result) {
  assert.equal(result.bytes, bundle.byteLength);
  assert.equal(result.lastModified, lastModified);
}

test('secure-context diagnostic hashes the fetched bytes and retains active-card clues', async () => {
  const result = await runDiagnostic();
  assertActiveCard(result);
  assertFetchedBundle(result);
  assert.equal(result.sha256, createHash('sha256').update(bundle).digest('hex'));
});

for (const crypto of [undefined, {}]) {
  test(`diagnostic retains bundle and card fields without ${crypto ? 'crypto.subtle' : 'crypto'}`, async () => {
    const result = await runDiagnostic({ crypto });
    assertActiveCard(result);
    assertFetchedBundle(result);
    assert.equal(result.sha256, 'unavailable (secure context required)');
  });
}

test('digest failure retains the successfully fetched bundle fields', async () => {
  const result = await runDiagnostic({
    crypto: { subtle: { digest: async () => { throw new Error('digest rejected'); } } },
  });
  assertActiveCard(result);
  assertFetchedBundle(result);
  assert.equal(result.sha256, 'unavailable (SHA-256 digest failed)');
});

test('HTTP failure preserves active-card clues without hashing an error response', async () => {
  const result = await runDiagnostic({
    fetch: async () => ({
      ok: false,
      status: 404,
      arrayBuffer: async () => assert.fail('do not read the failed response'),
    }),
  });
  assertActiveCard(result);
  assert.equal(result.bytes, null);
  assert.equal(result.lastModified, null);
  assert.equal(result.sha256, 'unavailable (card fetch failed: HTTP 404)');
});

test('network failure preserves active-card clues', async () => {
  const result = await runDiagnostic({
    fetch: async () => { throw new Error('network failed'); },
  });
  assertActiveCard(result);
  assert.equal(result.bytes, null);
  assert.equal(result.lastModified, null);
  assert.equal(result.sha256, 'unavailable (card fetch failed)');
});

test('body-read failure preserves the response header and active-card clues', async () => {
  const result = await runDiagnostic({
    fetch: async () => ({
      ok: true,
      headers: new Headers({ 'last-modified': lastModified }),
      arrayBuffer: async () => { throw new Error('body read failed'); },
    }),
  });
  assertActiveCard(result);
  assert.equal(result.bytes, null);
  assert.equal(result.lastModified, lastModified);
  assert.equal(result.sha256, 'unavailable (card response body read failed)');
});

test('missing registration and marker are explicit without preventing bundle diagnostics', async () => {
  const result = await runDiagnostic({
    customElements: { get: () => undefined },
    window: {},
  });
  assert.equal(result.className, null);
  assert.equal(result.hasCanManageLights, false);
  assert.equal(result.cardVersion, null);
  assertFetchedBundle(result);
  assert.equal(result.sha256, createHash('sha256').update(bundle).digest('hex'));
});
