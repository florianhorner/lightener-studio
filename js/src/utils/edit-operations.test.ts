import { describe, expect, it } from 'vitest';

import {
  addPointEdit,
  applyPresetToCurves,
  movePointOnCurves,
  pushEditUndo,
  removePointEdit,
  setLightLevel,
} from './edit-operations.js';
import type { LightCurve } from './types.js';

function curve(entityId: string, target = 100): LightCurve {
  return {
    entityId,
    friendlyName: entityId,
    controlPoints: [
      { lightener: 0, target: 0 },
      { lightener: 100, target },
    ],
    visible: true,
    color: '#fff',
  };
}

describe('edit operations', () => {
  it('upserts one fixed knot immutably and leaves siblings untouched', () => {
    const curves = [curve('light.a'), curve('light.b')];
    const before = JSON.stringify(curves);
    const first = setLightLevel(curves, 'light.b', 50, 30)!;
    const next = setLightLevel(first, 'light.b', 50, 65)!;
    expect(JSON.stringify(curves)).toBe(before);
    expect(next[0]).toBe(curves[0]);
    expect(next[1].controlPoints).toEqual([
      { lightener: 0, target: 0 },
      { lightener: 50, target: 65 },
      { lightener: 100, target: 100 },
    ]);
    expect(next[1].controlPoints[0]).not.toBe(first[1].controlPoints[0]);
  });

  it('skips existing and sampled no-ops and rejects missing or hidden lights', () => {
    const curves = [curve('light.a'), { ...curve('light.b'), visible: false }];
    expect(setLightLevel(curves, 'light.a', 100, 100)).toBeNull();
    expect(setLightLevel(curves, 'light.a', 50, 50)).toBeNull();
    expect(setLightLevel(curves, 'light.b', 50, 20)).toBeNull();
    expect(setLightLevel(curves, 'light.missing', 50, 20)).toBeNull();
  });

  it.each([NaN, Infinity, -Infinity])('rejects non-finite input %s', (invalid) => {
    expect(setLightLevel([curve('light.a')], 'light.a', invalid, 50)).toBeNull();
    expect(setLightLevel([curve('light.a')], 'light.a', 50, invalid)).toBeNull();
  });

  it.each([0, 1, 99, 100])('accepts target %i with a stable rounded coordinate', (target) => {
    const curves = [curve('light.a')];
    const next = setLightLevel(curves, 'light.a', 49.7, target)!;
    expect(next[0].controlPoints[1]).toEqual({ lightener: 50, target });
  });

  it('clamps targets without changing dim floors or other nonlinear knots', () => {
    const curves = [
      {
        ...curve('light.a'),
        controlPoints: [
          { lightener: 0, target: 12 },
          { lightener: 25, target: 60 },
          { lightener: 100, target: 80 },
        ],
      },
    ];
    const next = setLightLevel(curves, 'light.a', 25, 200)!;
    expect(next[0].controlPoints).toEqual([
      { lightener: 0, target: 12 },
      { lightener: 25, target: 100 },
      { lightener: 100, target: 80 },
    ]);
    expect(setLightLevel(next, 'light.a', 25, -20)![0].controlPoints[1].target).toBe(0);
  });
  it('applies presets only to the selected curve when selected', () => {
    const next = applyPresetToCurves([curve('light.a'), curve('light.b')], 'light.b', [
      { lightener: 0, target: 0 },
      { lightener: 50, target: 20 },
      { lightener: 100, target: 40 },
    ]);

    expect(next[0].controlPoints).toHaveLength(2);
    expect(next[1].controlPoints).toEqual([
      { lightener: 0, target: 0 },
      { lightener: 50, target: 20 },
      { lightener: 100, target: 40 },
    ]);
  });

  it('moves one point without mutating the original curves', () => {
    const original = [curve('light.a')];
    const next = movePointOnCurves(original, 0, 1, 80, 70);

    expect(next).not.toBeNull();
    if (next === null) throw new Error('expected valid move');
    expect(next[0].controlPoints[1]).toEqual({ lightener: 80, target: 70 });
    expect(original[0].controlPoints[1]).toEqual({ lightener: 100, target: 100 });
  });

  it('rejects stale move indexes without returning the original curves as a mutation', () => {
    const original = [curve('light.a')];

    expect(movePointOnCurves(original, 9, 1, 80, 70)).toBeNull();
    expect(movePointOnCurves(original, 0, 9, 80, 70)).toBeNull();
  });

  it('keeps undo snapshots isolated from later edits', () => {
    const stack: LightCurve[][] = [];
    const curves = [curve('light.a')];
    pushEditUndo(stack, curves);
    curves[0].controlPoints[1] = { lightener: 100, target: 10 };

    expect(stack[0][0].controlPoints[1]).toEqual({ lightener: 100, target: 100 });
  });

  it('rejects removing the origin anchor', () => {
    expect(removePointEdit([curve('light.a')], 0, 0)).toBeNull();
  });

  it('rejects stale remove indexes without returning a no-op edit', () => {
    const curves = [
      {
        ...curve('light.a'),
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 50, target: 40 },
          { lightener: 100, target: 100 },
        ],
      },
    ];

    expect(removePointEdit(curves, 0, 9)).toBeNull();
  });

  it('adds a point to the matching curve, sorted by lightener', () => {
    const curves = [curve('light.a'), curve('light.b')];
    const next = addPointEdit(curves, 'light.a', 50, 30);

    expect(next).not.toBeNull();
    if (next === null) throw new Error('expected a valid add');
    expect(next[0].controlPoints).toEqual([
      { lightener: 0, target: 0 },
      { lightener: 50, target: 30 },
      { lightener: 100, target: 100 },
    ]);
    // The non-matching curve is untouched.
    expect(next[1].controlPoints).toEqual(curves[1].controlPoints);
  });

  it('returns null when adding a point at a duplicate lightener or unknown entity', () => {
    const curves = [curve('light.a')];
    expect(addPointEdit(curves, 'light.a', 0, 50)).toBeNull();
    expect(addPointEdit(curves, 'light.a', 100, 50)).toBeNull();
    expect(addPointEdit(curves, 'light.missing', 50, 50)).toBeNull();
  });

  it('applyPresetToCurves (no selection) gives each curve its own points array', () => {
    const preset = [
      { lightener: 0, target: 0 },
      { lightener: 100, target: 50 },
    ];
    const next = applyPresetToCurves([curve('light.a'), curve('light.b')], null, preset);

    // Mutate the first curve's points in place; the others must be unaffected.
    next[0].controlPoints.push({ lightener: 75, target: 40 });

    expect(next[1].controlPoints).toHaveLength(2);
    expect(next[0].controlPoints).not.toBe(next[1].controlPoints);
  });
});
