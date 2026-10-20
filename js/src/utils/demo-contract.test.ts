// The docs demo (`js/dev/fake-ha.js`, copied to `docs/fake-ha.js` by the build)
// stands in for the Python backend. It cannot import from `custom_components/`,
// so it restates the candidate-state contract in plain JS and nothing structural
// stops that copy drifting. Bump `CANDIDATE_STATE_METADATA_VERSION` in
// `const.py` and the demo keeps answering v1, which drops the public demo into
// the legacy all-visible view without failing a test.
//
// `scripts/demo-freshness-check` proves the built bundle is current, not that
// the fake backend still speaks the current contract. These assertions cover
// that gap. On the Python side `tests/components/lightener_studio/
// test_membership.py` already asserts the real websocket response against the
// shared fixture, so pinning the demo to that same fixture reaches the backend
// through it.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CANDIDATE_STATE_METADATA_VERSION,
  MEMBERSHIP_ERROR_DISABLED_ENTITY,
} from './candidate-lights.js';
import {
  CANDIDATE_STATE_METADATA_VERSION as DEMO_VERSION,
  disabledEntityMessage,
  PRESETS,
} from '../../dev/fake-ha.js';

const thisDir = dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(
  readFileSync(resolve(thisDir, '../../../tests/fixtures/candidate_lights_v1.json'), 'utf8')
) as {
  capabilities: Record<string, number>;
  errors: { disabled_entity: { code: string; message_template: string } };
};

describe('demo backend contract', () => {
  it('keeps all starting shapes and legacy Night aligned with the backend fixture', () => {
    const presets = JSON.parse(
      readFileSync(resolve(thisDir, '../../../tests/fixtures/curve_presets.json'), 'utf8')
    );
    expect(PRESETS).toEqual(presets);
  });
  it('answers the same candidate-state version as the card and the fixture', () => {
    expect(DEMO_VERSION).toBe(CANDIDATE_STATE_METADATA_VERSION);
    expect(DEMO_VERSION).toBe(contract.capabilities.candidate_state_metadata);
  });

  it('emits the fixture disabled-entity copy verbatim', () => {
    expect(disabledEntityMessage('light.reading')).toBe(
      contract.errors.disabled_entity.message_template.replace('{entity_id}', 'light.reading')
    );
  });

  it('uses the shared disabled-entity error code', () => {
    expect(contract.errors.disabled_entity.code).toBe(MEMBERSHIP_ERROR_DISABLED_ENTITY);
  });
});
