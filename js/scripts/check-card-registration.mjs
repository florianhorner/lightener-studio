import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const BUNDLE_PATHS = [
  'custom_components/lightener_studio/frontend/lightener-curve-card.js',
  'docs/lightener-curve-card.js',
];
export const REGISTRATION_MARKERS = ['customCards', 'getEntitySuggestion'];

export function checkCardRegistration(root = REPO_ROOT) {
  const failures = [];
  for (const bundle of BUNDLE_PATHS) {
    let source;
    try {
      source = readFileSync(resolve(root, bundle), 'utf8');
    } catch (error) {
      failures.push(`${bundle}: cannot read bundle (${error.code})`);
      continue;
    }
    for (const marker of REGISTRATION_MARKERS) {
      if (!source.includes(marker)) {
        failures.push(`${bundle}: missing card-picker registration marker ${marker}`);
      }
    }
  }
  return failures;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = checkCardRegistration();
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Card-picker registration markers present in both bundles.');
  }
}
