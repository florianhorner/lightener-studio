// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX, curveCardStyles } from './curve-card-styles.js';
import { CurveGraph } from '../components/curve-graph.js';
import { DEFAULT_GRAPH_MAX_HEIGHT, VB_H, VB_W } from '../utils/graph-math.js';

describe('default editor scale', () => {
  it('gives the playable production card a 520px graph budget', () => {
    expect(DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX).toBe(520);
    expect(curveCardStyles.cssText).toMatch(/initial-value:\s*520px/);
    expect(CurveGraph.styles.cssText).toContain('--curve-graph-max-height, 520px');
    // Below the cap the established proportions fill 746px; wider cards stretch the plot.
    expect(DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX * (VB_W / VB_H)).toBeCloseTo(746.45, 2);
  });

  it('keeps graph labels at their established size as the plot grows', () => {
    // Labels scale from the 320px reference, so a taller graph shows more plot
    // without enlarging text.
    expect(DEFAULT_GRAPH_MAX_HEIGHT).toBe(320);
  });

  it('stacks the light list under the graph instead of beside it', () => {
    expect(curveCardStyles.cssText).not.toMatch(/minmax\(300px, 0\.9fr\)/);
    expect(curveCardStyles.cssText).toMatch(/\.side-rail\s*{[^}]*border-top:/);
  });
});
