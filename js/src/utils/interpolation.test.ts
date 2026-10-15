import { describe, it, expect } from 'vitest';
import {
  scaleRangedValue,
  prepareBrightnessConfig,
  sampleInterpolatedCurve,
  interpolateCurve,
} from './interpolation.js';
import { ControlPoint } from './types.js';

describe('scaleRangedValue', () => {
  it('maps midpoint correctly', () => {
    expect(scaleRangedValue([0, 100], [0, 200], 50)).toBe(100);
  });

  it('maps start of range', () => {
    expect(scaleRangedValue([0, 100], [10, 20], 0)).toBe(10);
  });

  it('maps end of range', () => {
    expect(scaleRangedValue([0, 100], [10, 20], 100)).toBe(20);
  });

  it('handles inverted target range', () => {
    expect(scaleRangedValue([0, 100], [100, 0], 25)).toBe(75);
  });

  it('handles non-zero source start', () => {
    expect(scaleRangedValue([10, 20], [0, 100], 15)).toBe(50);
  });

  it('returns target range start when source range is degenerate (a === b)', () => {
    expect(scaleRangedValue([50, 50], [10, 20], 50)).toBe(10);
  });
});

describe('prepareBrightnessConfig', () => {
  it('adds implicit 0->0 origin', () => {
    const points: ControlPoint[] = [{ lightener: 50, target: 75 }];
    const prepared = prepareBrightnessConfig(points);
    expect(prepared[0]).toEqual({ lightener: 0, target: 0 });
  });

  it('flattens missing 100 endpoint to the last configured target', () => {
    const points: ControlPoint[] = [{ lightener: 50, target: 75 }];
    const prepared = prepareBrightnessConfig(points);
    const last = prepared[prepared.length - 1];
    expect(last).toEqual({ lightener: 100, target: 75 });
  });

  it('preserves explicit 100 endpoint', () => {
    const points: ControlPoint[] = [
      { lightener: 50, target: 75 },
      { lightener: 100, target: 60 },
    ];
    const prepared = prepareBrightnessConfig(points);
    const last = prepared[prepared.length - 1];
    expect(last).toEqual({ lightener: 100, target: 60 });
  });

  it('sorts by lightener value', () => {
    const points: ControlPoint[] = [
      { lightener: 80, target: 90 },
      { lightener: 20, target: 30 },
    ];
    const prepared = prepareBrightnessConfig(points);
    const values = prepared.map((p) => p.lightener);
    expect(values).toEqual([0, 20, 80, 100]);
  });

  it('handles empty input', () => {
    const prepared = prepareBrightnessConfig([]);
    expect(prepared).toEqual([
      { lightener: 0, target: 0 },
      { lightener: 100, target: 100 },
    ]);
  });

  it('flattens past the last configured point when 100 is missing', () => {
    const prepared = prepareBrightnessConfig([{ lightener: 50, target: 40 }]);
    expect(prepared).toEqual([
      { lightener: 0, target: 0 },
      { lightener: 50, target: 40 },
      { lightener: 100, target: 40 },
    ]);
  });

  it('keeps exact 0% off while applying an explicit origin dim floor above 0%', () => {
    const prepared = prepareBrightnessConfig([
      { lightener: 0, target: 12 },
      { lightener: 100, target: 80 },
    ]);
    expect(prepared.slice(0, 2)).toEqual([
      { lightener: 0, target: 0 },
      { lightener: 1, target: 12 },
    ]);
  });
});

describe('interpolateCurve', () => {
  it('returns 101 values', () => {
    const result = interpolateCurve([]);
    expect(result).toHaveLength(101);
  });

  it('starts at 0', () => {
    const result = interpolateCurve([]);
    expect(result[0]).toBe(0);
  });

  it('linear 1:1 maps identity', () => {
    const result = interpolateCurve([
      { lightener: 0, target: 0 },
      { lightener: 100, target: 100 },
    ]);
    // Every value should equal its index
    for (let i = 0; i <= 100; i++) {
      expect(result[i]).toBeCloseTo(i, 5);
    }
  });

  it('handles flat segments', () => {
    const result = interpolateCurve([
      { lightener: 0, target: 0 },
      { lightener: 50, target: 50 },
      { lightener: 100, target: 50 },
    ]);
    // 50-100 range should all be 50
    for (let i = 50; i <= 100; i++) {
      expect(result[i]).toBeCloseTo(50, 5);
    }
  });

  it('handles steep ramp', () => {
    const result = interpolateCurve([
      { lightener: 0, target: 0 },
      { lightener: 10, target: 100 },
      { lightener: 100, target: 100 },
    ]);
    expect(result[5]).toBeCloseTo(50, 0);
    expect(result[10]).toBeCloseTo(100, 0);
    expect(result[50]).toBeCloseTo(100, 0);
  });

  it('handles late-onset curve', () => {
    const result = interpolateCurve([
      { lightener: 0, target: 0 },
      { lightener: 80, target: 0 },
      { lightener: 100, target: 100 },
    ]);
    // 0-80 should be 0
    for (let i = 0; i <= 80; i++) {
      expect(result[i]).toBeCloseTo(0, 5);
    }
    // 90 should be roughly 50
    expect(result[90]).toBeCloseTo(50, 0);
  });

  it('keeps values flat after the last configured point when 100 is missing', () => {
    const result = interpolateCurve([
      { lightener: 0, target: 0 },
      { lightener: 50, target: 40 },
    ]);
    expect(result[75]).toBeCloseTo(40, 5);
    expect(result[100]).toBeCloseTo(40, 5);
  });
});

describe('sampleInterpolatedCurve', () => {
  const peakCurve: ControlPoint[] = [
    { lightener: 0, target: 0 },
    { lightener: 50, target: 100 },
    { lightener: 100, target: 0 },
  ];

  it('matches linear segment math for a peak curve', () => {
    expect(sampleInterpolatedCurve(peakCurve, 25)).toBeCloseTo(50, 5);
    expect(sampleInterpolatedCurve(peakCurve, 50)).toBeCloseTo(100, 5);
    expect(sampleInterpolatedCurve(peakCurve, 75)).toBeCloseTo(50, 5);
  });

  it('preserves flatten-after-last-point semantics', () => {
    expect(
      sampleInterpolatedCurve(
        [
          { lightener: 0, target: 0 },
          { lightener: 50, target: 40 },
        ],
        75
      )
    ).toBeCloseTo(40, 5);
    expect(
      sampleInterpolatedCurve(
        [
          { lightener: 0, target: 0 },
          { lightener: 50, target: 40 },
        ],
        100
      )
    ).toBeCloseTo(40, 5);
  });

  it('clamps out-of-range input', () => {
    expect(sampleInterpolatedCurve(peakCurve, -10)).toBeCloseTo(0, 5);
    expect(sampleInterpolatedCurve(peakCurve, 110)).toBeCloseTo(0, 5);
  });

  it('keeps explicit origin dim floors off at exactly 0%', () => {
    const dimFloorCurve: ControlPoint[] = [
      { lightener: 0, target: 12 },
      { lightener: 100, target: 80 },
    ];

    expect(sampleInterpolatedCurve(dimFloorCurve, 0)).toBeCloseTo(0, 5);
    expect(sampleInterpolatedCurve(dimFloorCurve, 1)).toBeCloseTo(12, 5);
  });

  // KNOWN DIVERGENCE, pinned on purpose.
  //
  // `prepareBrightnessConfig` rewrites an explicit origin `{lightener: 0}`
  // onto lightener 1, so the card samples the two spellings identically and
  // previews them identically. The backend does not do that rewrite: it keeps
  // an explicit 0 as the first segment's start, so `{"0": 40}` clamps the
  // bottom of the range to 40% while `{"1": 40}` ramps up to it across HA
  // levels 1-3 (see
  // test_origin_dim_floor_and_lightener_one_are_not_interchangeable in
  // tests/components/lightener_studio/test_brightness.py).
  //
  // The visible half of the gap is the bottom of the range (103 vs 34 at group
  // level 1 of 255, under 1%, which this 0-100 UI cannot express but a
  // service call can reach). Above that the two ramp at slightly
  // different slopes and stay within 2/255 of each other. Reconciling the two
  // encodings is a design decision about what a dim floor means, not a
  // mechanical fix.
  it('treats the two dim-floor spellings as identical, unlike the backend', () => {
    const atOrigin: ControlPoint[] = [
      { lightener: 0, target: 40 },
      { lightener: 100, target: 100 },
    ];
    const atOne: ControlPoint[] = [
      { lightener: 0, target: 0 },
      { lightener: 1, target: 40 },
      { lightener: 100, target: 100 },
    ];

    for (const position of [0, 1, 2, 25, 50, 100]) {
      expect(sampleInterpolatedCurve(atOrigin, position)).toBeCloseTo(
        sampleInterpolatedCurve(atOne, position),
        5
      );
    }
  });
});

describe('interpolateCurve / sampleInterpolatedCurve consistency', () => {
  it('matches the shared sampler at representative integer positions', () => {
    const points: ControlPoint[] = [
      { lightener: 0, target: 0 },
      { lightener: 50, target: 100 },
      { lightener: 100, target: 0 },
    ];
    const interpolated = interpolateCurve(points);

    for (const position of [0, 25, 50, 75, 100]) {
      expect(interpolated[position]).toBeCloseTo(sampleInterpolatedCurve(points, position), 5);
    }
  });
});
