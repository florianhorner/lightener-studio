// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX, curveCardStyles } from './curve-card-styles.js';
import { CurveGraph } from '../components/curve-graph.js';
import { VB_H, VB_W } from '../utils/graph-math.js';

describe('default editor scale', () => {
  it('keeps the playable production card at the established 320px graph budget', () => {
    expect(DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX).toBe(320);
    expect(curveCardStyles.cssText).toMatch(/initial-value:\s*320px/);
    expect(CurveGraph.styles.cssText).toContain('--curve-graph-max-height, 320px');
    expect(DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX * (VB_W / VB_H) + 28).toBeCloseTo(487.35, 2);
  });

  it('keeps the wide graph column within its native size budget', () => {
    expect(curveCardStyles.cssText).toMatch(
      /grid-template-columns:\s*minmax\(0, min\(52%, var\(--curve-stack-max-width\)\)\)\s*minmax\(320px, 1fr\)/
    );
  });
});
