import { describe, it, expect } from 'vitest';
import { CURVE_PRESETS, presetPolylinePoints, type PresetDef } from './presets.js';
import { sampleCurveAt, sampleRenderedCurveAt } from './graph-math.js';
import { curvesToWsPayload, wsPayloadToCurves } from './data.js';

describe('CURVE_PRESETS', () => {
  it('has exactly four presets', () => {
    expect(CURVE_PRESETS).toHaveLength(4);
  });

  it('each preset has required shape', () => {
    for (const preset of CURVE_PRESETS) {
      expect(preset.id).toBeTypeOf('string');
      expect(preset.id.length).toBeGreaterThan(0);
      expect(preset.name).toBeTypeOf('string');
      expect(preset.description).toBeTypeOf('string');
      expect(Array.isArray(preset.controlPoints)).toBe(true);
      expect(preset.controlPoints.length).toBeGreaterThanOrEqual(3);
      for (const cp of preset.controlPoints) {
        expect(cp.lightener).toBeGreaterThanOrEqual(0);
        expect(cp.lightener).toBeLessThanOrEqual(100);
        expect(cp.target).toBeGreaterThanOrEqual(0);
        expect(cp.target).toBeLessThanOrEqual(100);
      }
    }
  });

  it('preset ids are unique', () => {
    const ids = CURVE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every preset starts at lightener=0 and ends at lightener=100', () => {
    for (const preset of CURVE_PRESETS) {
      const first = preset.controlPoints[0];
      const last = preset.controlPoints[preset.controlPoints.length - 1];
      expect(first?.lightener).toBe(0);
      expect(last?.lightener).toBe(100);
    }
  });

  it('control points are monotonic in lightener dimension', () => {
    for (const preset of CURVE_PRESETS) {
      for (let i = 1; i < preset.controlPoints.length; i++) {
        const prev = preset.controlPoints[i - 1]!;
        const curr = preset.controlPoints[i]!;
        expect(curr.lightener).toBeGreaterThan(prev.lightener);
      }
    }
  });

  it('linear preset matches exact values', () => {
    const linear = CURVE_PRESETS.find((p) => p.id === 'linear');
    expect(linear).toBeDefined();
    expect(linear!.name).toBe('Equal brightness');
    expect(linear!.controlPoints).toEqual([
      { lightener: 0, target: 0 },
      { lightener: 1, target: 1 },
      { lightener: 50, target: 50 },
      { lightener: 100, target: 100 },
    ]);
  });

  it('late_starter preset matches exact values', () => {
    const p = CURVE_PRESETS.find((p) => p.id === 'late_starter');
    expect(p).toBeDefined();
    expect(p!.controlPoints).toEqual([
      { lightener: 0, target: 0 },
      { lightener: 1, target: 0 },
      { lightener: 60, target: 0 },
      { lightener: 70, target: 10 },
      { lightener: 80, target: 35 },
      { lightener: 90, target: 65 },
      { lightener: 100, target: 100 },
    ]);
  });

  it('keeps Late off through its knee in both readouts and the drawn line', () => {
    const points = CURVE_PRESETS.find((p) => p.id === 'late_starter')!.controlPoints;
    for (let x = 0; x <= 60; x += 0.5) {
      expect(sampleCurveAt(points, x)).toBe(0);
      expect(sampleRenderedCurveAt(points, x)).toBe(0);
    }
    expect(sampleCurveAt(points, 61)).toBeGreaterThan(0);
    expect(sampleRenderedCurveAt(points, 61)).toBeGreaterThan(0);
  });

  it('early_starter includes the two strategic points', () => {
    const p = CURVE_PRESETS.find((p) => p.id === 'early_starter');
    expect(p).toBeDefined();
    expect(p!.controlPoints).toEqual([
      { lightener: 0, target: 0 },
      { lightener: 1, target: 3 },
      { lightener: 15, target: 36 },
      { lightener: 25, target: 55 },
      { lightener: 50, target: 85 },
      { lightener: 65, target: 93 },
      { lightener: 100, target: 100 },
    ]);
  });

  it('dim_accent preset matches exact values', () => {
    const p = CURVE_PRESETS.find((p) => p.id === 'dim_accent');
    expect(p).toBeDefined();
    expect(p!.controlPoints).toEqual([
      { lightener: 0, target: 0 },
      { lightener: 1, target: 1 },
      { lightener: 25, target: 8 },
      { lightener: 50, target: 20 },
      { lightener: 100, target: 45 },
    ]);
  });
});

describe('starting-shape behavior', () => {
  it('keeps the Equal response and drawing unchanged when adding the midpoint handle', () => {
    const points = CURVE_PRESETS.find((p) => p.id === 'linear')!.controlPoints;
    const previous = [
      { lightener: 0, target: 0 },
      { lightener: 1, target: 1 },
      { lightener: 100, target: 100 },
    ];
    for (let x = 0; x <= 100; x += 0.25) {
      expect(sampleCurveAt(points, x)).toBeCloseTo(sampleCurveAt(previous, x), 10);
      expect(sampleRenderedCurveAt(points, x)).toBeCloseTo(sampleRenderedCurveAt(previous, x), 10);
    }
  });

  for (const preset of CURVE_PRESETS) {
    it(`${preset.id} stays monotone, within its cap, and within 2.5 points of the drawing`, () => {
      const cap = preset.id === 'dim_accent' ? 45 : 100;
      let previousActual = 0;
      let previousDrawn = 0;
      let maxGap = 0;
      for (let step = 0; step <= 1000; step++) {
        const x = step / 10;
        const actual = sampleCurveAt(preset.controlPoints, x);
        const drawn = sampleRenderedCurveAt(preset.controlPoints, x);
        expect(actual).toBeGreaterThanOrEqual(previousActual - 1e-9);
        expect(drawn).toBeGreaterThanOrEqual(previousDrawn - 1e-9);
        expect(actual).toBeLessThanOrEqual(cap + 1e-9);
        expect(drawn).toBeLessThanOrEqual(cap + 1e-9);
        previousActual = actual;
        previousDrawn = drawn;
        maxGap = Math.max(maxGap, Math.abs(actual - drawn));
      }
      expect(sampleCurveAt(preset.controlPoints, 0)).toBe(0);
      expect(previousActual).toBe(cap);
      expect(previousDrawn).toBe(cap);
      expect(maxGap).toBeLessThan(2.5);
    });
  }

  it('Early eases down and Late accelerates without alternating slope changes', () => {
    for (const id of ['early_starter', 'late_starter']) {
      const points = CURVE_PRESETS.find((p) => p.id === id)!.controlPoints;
      const slopes = points
        .slice(1)
        .map(
          (point, i) => (point.target - points[i].target) / (point.lightener - points[i].lightener)
        );
      for (let i = 1; i < slopes.length; i++) {
        if (id === 'early_starter') expect(slopes[i]).toBeLessThanOrEqual(slopes[i - 1]);
        else expect(slopes[i]).toBeGreaterThanOrEqual(slopes[i - 1]);
      }
    }
  });

  it('round-trips saved released shapes without replacing their points', () => {
    const saved = {
      'light.equal': { brightness: { '1': '1', '100': '100' } },
      'light.accent': { brightness: { '1': '1', '25': '8', '50': '20', '100': '45' } },
      'light.delayed': { brightness: { '1': '1', '45': '1', '70': '45', '100': '100' } },
      'light.low': { brightness: { '1': '1', '20': '3', '50': '10', '100': '25' } },
    };
    expect(curvesToWsPayload(wsPayloadToCurves(saved, {}, ['#42a5f5']))).toEqual(saved);
  });
});

describe('presetPolylinePoints', () => {
  it('maps lightener=0,target=0 to bottom-left corner (pad,H-pad)', () => {
    const preset: PresetDef = {
      id: 'test',
      name: 'Test',
      description: '',
      controlPoints: [{ lightener: 0, target: 0 }],
    };
    const out = presetPolylinePoints(preset);
    expect(out).toBe('4.0,36.0');
  });

  it('maps lightener=100,target=100 to top-right (W-pad, pad)', () => {
    const preset: PresetDef = {
      id: 'test',
      name: 'Test',
      description: '',
      controlPoints: [{ lightener: 100, target: 100 }],
    };
    const out = presetPolylinePoints(preset);
    expect(out).toBe('60.0,4.0');
  });

  it('space-separates multiple control points', () => {
    const preset: PresetDef = {
      id: 'test',
      name: 'Test',
      description: '',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 100 },
      ],
    };
    const out = presetPolylinePoints(preset);
    expect(out).toBe('4.0,36.0 60.0,4.0');
  });

  it('renders each real preset to a non-empty polyline string', () => {
    for (const preset of CURVE_PRESETS) {
      const out = presetPolylinePoints(preset);
      expect(out).toMatch(/^\d+\.\d+,\d+\.\d+( \d+\.\d+,\d+\.\d+)+$/);
      const pointCount = out.split(' ').length;
      expect(pointCount).toBe(preset.controlPoints.length);
    }
  });
});
