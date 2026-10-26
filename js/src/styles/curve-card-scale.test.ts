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
    // No inner panel inset: the graph and Room brightness share one width.
    expect(DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX * (VB_W / VB_H)).toBeCloseTo(746.45, 2);
  });

  it('keeps graph labels at their established size as the plot grows', () => {
    // Labels scale from the 320px reference, so a taller graph shows more plot
    // without enlarging text.
    expect(DEFAULT_GRAPH_MAX_HEIGHT).toBe(320);
  });

  it('gives the graph column the larger share beside the light list', () => {
    expect(curveCardStyles.cssText).toMatch(
      /grid-template-columns:\s*minmax\(0, 1\.3fr\) minmax\(300px, 0\.9fr\)/
    );
  });
});
