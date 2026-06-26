import { describe, expect, it } from 'vitest';
import type { LightCurve } from './types.js';
import { summarizeCurveShapes } from './curve-summary.js';

function curve(
  entityId: string,
  points: LightCurve['controlPoints'] = [
    { lightener: 0, target: 0 },
    { lightener: 100, target: 100 },
  ],
  visible = true
): LightCurve {
  return {
    entityId,
    friendlyName: entityId.replace('light.', '').toUpperCase(),
    controlPoints: points,
    visible,
    color: '#2563eb',
  };
}

describe('summarizeCurveShapes', () => {
  it('returns null for an empty group so the graph empty state owns the message', () => {
    expect(summarizeCurveShapes([], null)).toBeNull();
  });

  it('calls out many identical straight-through lights as matching group brightness', () => {
    const summary = summarizeCurveShapes(
      Array.from({ length: 20 }, (_, idx) => curve(`light.${idx}`)),
      null
    );

    expect(summary?.primary).toBe('20 lights match the group brightness');
    expect(summary?.secondary).toBe('Pick a light to make it dimmer, brighter, or delayed.');
    expect(summary?.shapeCount).toBe(1);
    expect(summary?.largestShapeCount).toBe(20);
  });

  it('calls out many identical non-linear lights as one shared brightness shape', () => {
    const shape = [
      { lightener: 0, target: 0 },
      { lightener: 40, target: 10 },
      { lightener: 100, target: 50 },
    ];
    const summary = summarizeCurveShapes(
      [curve('light.a', shape), curve('light.b', shape), curve('light.c', shape)],
      null
    );

    expect(summary?.primary).toBe('3 lights share one brightness shape');
    expect(summary?.secondary).toBe('Pick a light to make it dimmer, brighter, or delayed.');
  });

  it('shows the selected light and whether peers still share its shape', () => {
    const summary = summarizeCurveShapes(
      [curve('light.a'), curve('light.b'), curve('light.c', [{ lightener: 0, target: 10 }])],
      'light.a'
    );

    expect(summary?.primary).toBe('Shaping A');
    expect(summary?.secondary).toBe('1 light still shares this shape.');
  });

  it('summarizes mixed shapes without implying all curves overlap', () => {
    const summary = summarizeCurveShapes(
      [
        curve('light.a'),
        curve('light.b'),
        curve('light.c', [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 50 },
        ]),
      ],
      null
    );

    expect(summary?.primary).toBe('3 lights, 2 brightness shapes');
    expect(summary?.secondary).toBe('2 lights share the most common shape.');
  });

  it('handles the no-visible-curves state separately from the empty group', () => {
    const summary = summarizeCurveShapes([curve('light.a', undefined, false)], null);

    expect(summary?.primary).toBe('All lights are hidden');
    expect(summary?.secondary).toBe('Show a light in the list to bring its shape back.');
  });
});
