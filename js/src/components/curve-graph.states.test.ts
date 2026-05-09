// @vitest-environment jsdom

/**
 * Group B (Wave 2) — four distinct visual states for the curve graph.
 *
 * The plan distinguishes empty / loading / error / selected. Today the graph
 * only handles empty (curves.length=0) and selected. These tests document the
 * contract for the missing two — they fail against master and define the
 * follow-up implementation work.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CurveGraph } from './curve-graph.js';
import type { LightCurve } from '../utils/types.js';

beforeAll(async () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  await import('./curve-graph.js');
});

const sampleCurves: LightCurve[] = [
  {
    entityId: 'light.alpha',
    friendlyName: 'Alpha',
    controlPoints: [
      { lightener: 0, target: 0 },
      { lightener: 100, target: 100 },
    ],
    visible: true,
    color: '#2563eb',
  },
];

function makeGraph(props: Partial<CurveGraph>): CurveGraph {
  const graph = document.createElement('curve-graph') as CurveGraph;
  Object.assign(graph, props);
  document.body.appendChild(graph);
  return graph;
}

describe('Group B — graph state visuals', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('B.5 renders the empty-state hint when curves.length === 0', async () => {
    const graph = makeGraph({ curves: [] });
    await graph.updateComplete;

    const hint = graph.shadowRoot!.querySelector('text.hint-select');
    expect(hint, 'empty-state hint must render with no curves').not.toBeNull();
    expect((hint!.textContent ?? '').toLowerCase()).toMatch(/add a light/);
  });

  it('B.6 renders a skeleton (no "Unknown light") while loading=true', async () => {
    // Contract: a `loading` property gates a skeleton/spinner inside the graph
    // surface so async hass hydration never flashes "Unknown light" or empty
    // axes (ha-frontend #28682 / mini-graph #1326).
    const graph = makeGraph({ curves: [], loading: true } as unknown as Partial<CurveGraph>);
    await graph.updateComplete;

    const root = graph.shadowRoot!;
    const skeleton =
      root.querySelector('[data-state="loading"]') ??
      root.querySelector('.skeleton, .loading') ??
      root.querySelector('[role="progressbar"]');
    expect(
      skeleton,
      'graph must render a skeleton/loading affordance when loading=true'
    ).not.toBeNull();

    // And it must NOT show the empty-state copy meant for the curveless case.
    const text = (root.textContent ?? '').toLowerCase();
    expect(text).not.toMatch(/add a light below/);
    expect(text).not.toMatch(/unknown light/);
  });

  it('B.7 renders an error state with a retry CTA when error is set', async () => {
    const graph = makeGraph({
      curves: [],
      error: 'Failed to load curves',
    } as unknown as Partial<CurveGraph>);
    await graph.updateComplete;

    const root = graph.shadowRoot!;
    const errorEl =
      root.querySelector('[data-state="error"]') ??
      root.querySelector('.error') ??
      root.querySelector('[role="alert"]');
    expect(errorEl, 'graph must surface a visible error region when error is set').not.toBeNull();

    const retry =
      root.querySelector('button[data-action="retry"]') ??
      [...root.querySelectorAll('button')].find((b) =>
        /retry|reload|try again/i.test(b.textContent ?? '')
      );
    expect(retry, 'error state must include a retry CTA, not a dead error').not.toBeNull();
  });

  it('B.8 hides empty/loading/error visuals when curves render', async () => {
    const graph = makeGraph({ curves: sampleCurves, selectedCurveId: 'light.alpha' });
    await graph.updateComplete;

    const root = graph.shadowRoot!;
    expect(root.querySelector('[data-state="loading"]'), 'no loading state with data').toBeNull();
    expect(root.querySelector('[data-state="error"]'), 'no error state with data').toBeNull();

    // The empty-state copy must not appear when curves are present.
    expect((root.textContent ?? '').toLowerCase()).not.toMatch(/add a light below/);

    // And the chart must actually render — at least one curve-line present.
    expect(root.querySelectorAll('path.curve-line').length).toBeGreaterThan(0);
  });
});
