import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const REQUIRED_SOURCES = [
  'src/lightener-curve-card.ts',
  '../custom_components/lightener_studio/frontend/lightener-panel.js',
];

// Aggregate coverage thresholds cannot detect a production file disappearing
// from instrumentation. Require executable lines and actual hits in both entrypoints.
export function checkCoverageScope(lcov, projectRoot = PROJECT_ROOT) {
  const sources = new Map();
  for (const record of lcov.split('end_of_record')) {
    const source = /^SF:(.+)$/m.exec(record)?.[1].trim();
    if (!source) continue;
    const hits = [...record.matchAll(/^DA:([1-9]\d*),(\d+)(?:,.*)?\r?$/gm)];
    sources.set(resolve(projectRoot, source), hits);
  }

  return REQUIRED_SOURCES.flatMap((source) => {
    const lines = sources.get(resolve(projectRoot, source));
    if (!lines) return [`${source}: missing from coverage`];
    if (!lines.length) return [`${source}: no instrumented lines`];
    if (!lines.some((line) => Number(line[2]) > 0)) {
      return [`${source}: no covered lines`];
    }
    return [];
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = process.argv[2] ?? resolve(PROJECT_ROOT, 'coverage/lcov.info');
  try {
    const errors = checkCoverageScope(readFileSync(report, 'utf8'));
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else {
      console.log('Coverage scope: card and panel have instrumented and covered lines.');
    }
  } catch (error) {
    console.error(`Cannot read coverage report (${error.code ?? error.message}).`);
    process.exitCode = 1;
  }
}
