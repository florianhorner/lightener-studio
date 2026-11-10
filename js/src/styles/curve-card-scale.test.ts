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

describe('surface tokens and segmentation', () => {
  const css = curveCardStyles.cssText;

  it('defines the graph well, the Watch well and the Edit bed from theme variables only', () => {
    expect(css).toMatch(
      /--graph-panel:\s*color-mix\(in srgb, var\(--text-color\) 5%, var\(--card-bg\)\)/
    );
    expect(css).toMatch(
      /--watch-well:\s*color-mix\(in srgb, var\(--graph-panel\) 96%, var\(--watch-warm\) 4%\)/
    );
    expect(css).toMatch(
      /--edit-bed:\s*color-mix\(in srgb, var\(--text-color\) 8%, var\(--card-bg\)\)/
    );
    // The Room dim overlay paints with --graph-bg, which resolves to the well.
    expect(css).toMatch(/--graph-bg:\s*var\(--graph-panel\)/);
    expect(css).toMatch(/\.card\.watching\s*\{\s*--graph-bg:\s*var\(--watch-well\)/);
    // The only hardcoded surface colour is the Edit rule.
    expect(css).not.toMatch(/--(graph-panel|watch-well|edit-bed|graph-bg):[^;]*#[0-9a-f]{3,6}/i);
  });

  it('frames the graph with a ring that does not shift the plot, warm while watching', () => {
    expect(css).toMatch(
      /\.graph-panel\s*\{[^}]*background-color:\s*var\(--graph-bg\);[^}]*border-radius:\s*12px;[^}]*box-shadow:\s*0 0 0 1px var\(--divider\)/s
    );
    expect(css).toMatch(
      /\.card\.watching \.graph-panel\s*\{\s*box-shadow:\s*0 0 0 1px var\(--watch-warm\)/
    );
    expect(css).not.toMatch(/\.graph-panel\s*\{[^}]*\bborder:/);
  });

  it('has one hairline above the light list and no other border-top or border-bottom in the card', () => {
    const lines = css.match(/border-(top|bottom|block)[a-z-]*:/g) ?? [];
    // .side-rail's border-top is the hairline; the loading skeleton's own axis
    // lines are the only others and are not part of the editor's chrome.
    expect(css).toMatch(/\.side-rail\s*\{[^}]*border-top:\s*1px solid var\(--divider\)/s);
    expect(lines.length).toBe(2);
  });

  it('changes chrome with 150ms colour transitions that stop under reduced motion', () => {
    expect(css).toMatch(
      /\.header\s*\{[^}]*transition:\s*background-color 150ms ease,\s*box-shadow 150ms ease/s
    );
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)[\s\S]*?\.header,\s*\.graph-panel\s*\{\s*transition:\s*none/s
    );
  });
});
