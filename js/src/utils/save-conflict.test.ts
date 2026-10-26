import { describe, expect, it } from 'vitest';
import {
  adoptSavedShapes,
  compareSavedShapes,
  editedCurves,
  guardedSnapshot,
  intendedEntities,
  savedEntitiesEqual,
} from './save-conflict.js';
import { wsPayloadToCurves } from './data.js';
import { testSnapshot } from '../test-guarded-backend.js';
const raw = {
  'light.a': { brightness: { '100': '100' }, metadata: { unknown: 1 } },
  'light.b': { brightness: { '12.5': '4.5', broken: 'bad' }, future: [1, 2] },
};
const parse = (entities: typeof raw | object) =>
  wsPayloadToCurves(entities as typeof raw, {}, ['red']);
describe('guarded saved-state boundary', () => {
  it('requires an explicit complete capability and receipt contract', () => {
    const valid = testSnapshot(raw);
    expect(guardedSnapshot(valid)).toEqual({
      entities: raw,
      revision: valid.revision,
      config_entry_id: 'test-entry',
    });
    for (const bad of [
      { entities: raw },
      { ...valid, revision: 'bad' },
      { ...valid, config_entry_id: '' },
      { ...valid, capabilities: {} },
      { ...valid, entities: { a: null } },
    ])
      expect(guardedSnapshot(bad)).toBeNull();
    expect(guardedSnapshot({ ...valid, status: 'saved' }, true)).not.toBeNull();
    expect(guardedSnapshot({ ...valid, status: 'okay' }, true)).toBeNull();
  });
  it('patches only geometry changes and preserves untouched raw records and fields', () => {
    const baseline = parse(raw),
      local = structuredClone(baseline);
    local.reverse();
    local[0].visible = false;
    local[0].friendlyName = 'Renamed';
    expect(editedCurves(baseline, local)).toEqual([]);
    local.find((c) => c.entityId === 'light.a')!.controlPoints[1].target = 45;
    expect(editedCurves(baseline, local).map((c) => c.entityId)).toEqual(['light.a']);
    const intended = intendedEntities(raw, { 'light.a': { brightness: { '100': '45' } } });
    expect(intended['light.b']).toEqual(raw['light.b']);
    expect(intended['light.a'].metadata).toEqual(raw['light.a'].metadata);
    expect(raw['light.a'].brightness['100']).toBe('100');
    expect(savedEntitiesEqual(raw, { ...raw })).toBe(true);
    expect(savedEntitiesEqual(raw, { 'light.b': raw['light.b'], 'light.a': raw['light.a'] })).toBe(
      false
    );
  });
});
describe('explicit local recovery', () => {
  it.each(['unchanged', 'already-saved', 'conflicting', 'removed'] as const)(
    'classifies %s without mutating baseline or local',
    (kind) => {
      const baseline = parse(raw),
        local = structuredClone(baseline);
      local[0].controlPoints[1].target = 45;
      const latest = structuredClone(baseline);
      if (kind === 'already-saved') latest[0].controlPoints[1].target = 45;
      if (kind === 'conflicting') latest[0].controlPoints[1].target = 70;
      if (kind === 'removed') latest.shift();
      const before = structuredClone({ baseline, local, latest });
      const review = compareSavedShapes(baseline, local, latest);
      expect(review).toHaveLength(1);
      expect(review[0].kind).toBe(kind);
      const adopted = adoptSavedShapes(latest, review, new Set(['light.a']));
      expect(adopted.some((c) => c.entityId === 'light.a')).toBe(kind !== 'removed');
      if (kind !== 'removed') expect(adopted[0].controlPoints[1].target).toBe(45);
      expect(adoptSavedShapes(latest, review, new Set())).toEqual(latest);
      expect({ baseline, local, latest }).toEqual(before);
    }
  );
});
