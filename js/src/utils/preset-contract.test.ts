import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CURVE_PRESETS } from './presets.js';

// The shared fixture lives at the repo root: tests/fixtures/curve_presets.json.
// This test file is at js/src/utils/, so the repo root is three levels up.
const thisDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(thisDir, '../../../tests/fixtures/curve_presets.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as Record<
  string,
  Record<string, string>
>;

/**
 * Derive the backend-style brightness dict from a preset's control points:
 * drop the lightener===0 anchor and stringify both coordinates of the rest.
 */
function brightnessDict(
  controlPoints: ReadonlyArray<{ lightener: number; target: number }>
): Record<string, string> {
  const dict: Record<string, string> = {};
  for (const cp of controlPoints) {
    if (cp.lightener === 0) continue;
    dict[String(cp.lightener)] = String(cp.target);
  }
  return dict;
}

describe('curve preset contract (frontend vs shared fixture)', () => {
  it('exposes exactly the preset ids in the fixture', () => {
    const ids = CURVE_PRESETS.map((p) => p.id).sort();
    expect(ids).toEqual(Object.keys(fixture).sort());
  });

  for (const preset of CURVE_PRESETS) {
    it(`derives the contract brightness dict for "${preset.id}"`, () => {
      expect(brightnessDict(preset.controlPoints)).toEqual(fixture[preset.id]);
    });
  }
});
