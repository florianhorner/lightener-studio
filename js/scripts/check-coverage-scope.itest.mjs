import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkCoverageScope, REQUIRED_SOURCES } from './check-coverage-scope.mjs';

const record = (source, lines = 'DA:1,1\n') => `SF:${source}\n${lines}end_of_record\n`;
const validReport = () => REQUIRED_SOURCES.map((source) => record(source)).join('');

test('accepts both production entrypoints with executable covered lines', () => {
  assert.deepEqual(checkCoverageScope(validReport()), []);
});

for (const source of REQUIRED_SOURCES) {
  const other = REQUIRED_SOURCES.filter((item) => item !== source)
    .map((item) => record(item))
    .join('');
  test(`rejects a missing production entrypoint: ${source}`, () => {
    assert.deepEqual(checkCoverageScope(other), [`${source}: missing from coverage`]);
  });
  test(`rejects an empty instrumentation record: ${source}`, () => {
    assert.deepEqual(checkCoverageScope(other + record(source, 'LF:0\nLH:0\n')), [
      `${source}: no instrumented lines`,
    ]);
  });
  test(`rejects an entrypoint that no test exercised: ${source}`, () => {
    assert.deepEqual(checkCoverageScope(other + record(source, 'DA:1,0\n')), [
      `${source}: no covered lines`,
    ]);
  });
}

test('rejects unrelated files with matching basenames', () => {
  const report = REQUIRED_SOURCES.map((source) =>
    record(`unrelated/${source.split('/').pop()}`)
  ).join('');
  assert.equal(checkCoverageScope(report).length, 2);
});

test('normalizes absolute source paths and CRLF records', () => {
  const root = resolve(tmpdir(), 'coverage-project');
  const report = REQUIRED_SOURCES.map((source) => record(resolve(root, source))).join('');
  assert.deepEqual(checkCoverageScope(report.replaceAll('\n', '\r\n'), root), []);
});

for (const mode of ['valid', 'missing-source', 'missing-report']) {
  test(`CLI checks ${mode} reports independently of cwd`, (t) => {
    const root = mkdtempSync(join(tmpdir(), 'lightener-coverage-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const report = join(root, 'lcov.info');
    if (mode !== 'missing-report') {
      writeFileSync(report, mode === 'valid' ? validReport() : record(REQUIRED_SOURCES[0]));
    }
    const script = fileURLToPath(new URL('./check-coverage-scope.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, report], {
      cwd: tmpdir(),
      encoding: 'utf8',
    });
    assert.equal(result.status, mode === 'valid' ? 0 : 1, result.stderr);
    if (mode === 'valid') assert.match(result.stdout, /card and panel/);
    if (mode === 'missing-source') assert.match(result.stderr, /panel\.js: missing/);
    if (mode === 'missing-report')
      assert.match(result.stderr, /Cannot read coverage report \(ENOENT\)/);
  });
}
