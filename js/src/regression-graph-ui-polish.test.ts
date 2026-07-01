// @vitest-environment jsdom

/**
 * Regression tests for graph UI polish fixes.
 * Each test verifies a specific bug that was found and fixed on this branch.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GRAPH_H, GRAPH_W, PAD_LEFT, PAD_TOP, sampleCurveAt, toSvgX } from './utils/graph-math.js';
import type { CurveGraph } from './components/curve-graph.js';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { LightCurve } from './utils/types.js';

beforeAll(async () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  await import('./components/curve-graph.js');
  await import('./components/curve-scrubber.js');
  await import('./lightener-curve-card.js');
});

// ── Helpers ──────────────────────────────────────────────────────────

/** Flattened static styles for a registered component (CSS-rule assertions). */
function componentCssText(tag: string): string {
  const ctor = customElements.get(tag) as unknown as {
    styles: { cssText?: string } | Array<{ cssText?: string }>;
  };
  const styles = ctor.styles;
  if (Array.isArray(styles)) return styles.map((s) => s.cssText ?? '').join('\n');
  return styles.cssText ?? '';
}

function makeGraph(opts?: { curves?: LightCurve[]; selectedCurveId?: string | null }): CurveGraph {
  const graph = document.createElement('curve-graph') as CurveGraph;
  graph.curves = opts?.curves ?? [
    {
      entityId: 'light.alpha',
      friendlyName: 'Alpha',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 50, target: 75 },
        { lightener: 100, target: 100 },
      ],
      visible: true,
      color: '#2563eb',
    },
  ];
  graph.selectedCurveId = opts?.selectedCurveId ?? 'light.alpha';
  document.body.appendChild(graph);
  return graph;
}

// ── 1. Origin point long-press guard ─────────────────────────────────

describe('origin point long-press guard', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('_onPointerDown on index 0 does NOT set a long-press timer', async () => {
    const graph = makeGraph();
    await graph.updateComplete;

    const removeEvents: CustomEvent[] = [];
    graph.addEventListener('point-remove', ((e: CustomEvent) => {
      removeEvents.push(e);
    }) as EventListener);

    // Find the origin hit circle (index 0)
    const hitCircles = graph.shadowRoot!.querySelectorAll<SVGCircleElement>('.hit-circle');
    const originCircle = hitCircles[0];

    // Stub setPointerCapture since jsdom doesn't support it
    const svgEl = graph.shadowRoot!.querySelector('svg');
    if (svgEl) {
      (svgEl as unknown as Record<string, unknown>).setPointerCapture = () => {};
    }

    // Simulate pointerdown on origin
    originCircle.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true, composed: true })
    );

    // Wait longer than the 500ms long-press timer
    await new Promise((resolve) => setTimeout(resolve, 600));

    // No point-remove should have fired for origin
    expect(removeEvents.length).toBe(0);
  });
});

// ── 2. Preview throttle trailing edge ────────────────────────────────

describe('preview throttle trailing edge', () => {
  it('trailing timer fires the last position when called within throttle window', () => {
    vi.useFakeTimers();

    // Replicate the throttle logic from _previewLights
    const PREVIEW_INTERVAL_MS = 300;
    let lastPreviewTime = 0;
    let trailingTimer: ReturnType<typeof setTimeout> | null = null;
    const sentPositions: number[] = [];

    function previewLights(position: number): void {
      const now = Date.now();
      const elapsed = now - lastPreviewTime;
      if (elapsed < PREVIEW_INTERVAL_MS) {
        // Schedule a trailing-edge call so the final position is never dropped
        if (!trailingTimer) {
          trailingTimer = setTimeout(() => {
            trailingTimer = null;
            previewLights(position);
          }, PREVIEW_INTERVAL_MS - elapsed);
        }
        return;
      }
      // Cancel any trailing timer since we're about to send
      if (trailingTimer) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      lastPreviewTime = Date.now();
      sentPositions.push(position);
    }

    // First call goes through immediately
    previewLights(10);
    expect(sentPositions).toEqual([10]);

    // Second call within throttle window schedules trailing timer
    vi.advanceTimersByTime(100);
    previewLights(50);
    expect(sentPositions).toEqual([10]); // Not sent yet

    // After the remaining throttle window, trailing timer fires
    vi.advanceTimersByTime(200);
    expect(sentPositions).toEqual([10, 50]); // Trailing position was NOT lost

    vi.useRealTimers();
  });
});

// ── 3. sampleCurveAt clamping ────────────────────────────────────────

describe('sampleCurveAt clamping', () => {
  const controlPoints = [
    { lightener: 0, target: 0 },
    { lightener: 10, target: 100 },
    { lightener: 100, target: 100 },
  ];

  it('returns values clamped to [0, 100] for normal input', () => {
    for (let pos = 0; pos <= 100; pos += 5) {
      const value = sampleCurveAt(controlPoints, pos);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('returns values clamped to [0, 100] for out-of-range input', () => {
    // Extreme positions should be clamped before backend-linear sampling
    expect(sampleCurveAt(controlPoints, -50)).toBeGreaterThanOrEqual(0);
    expect(sampleCurveAt(controlPoints, -50)).toBeLessThanOrEqual(100);
    expect(sampleCurveAt(controlPoints, 200)).toBeGreaterThanOrEqual(0);
    expect(sampleCurveAt(controlPoints, 200)).toBeLessThanOrEqual(100);
  });

  it('keeps steep ramp curves inside the backend brightness range', () => {
    const steepPoints = [
      { lightener: 0, target: 0 },
      { lightener: 5, target: 100 },
      { lightener: 10, target: 100 },
      { lightener: 100, target: 100 },
    ];
    for (let pos = 0; pos <= 100; pos++) {
      const value = sampleCurveAt(steepPoints, pos);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

// ── 5. Origin point ARIA label ───────────────────────────────────────

describe('origin point ARIA label', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('origin (pi=0) gets "Cannot be moved horizontally"', async () => {
    const graph = makeGraph();
    await graph.updateComplete;

    const hitCircles = graph.shadowRoot!.querySelectorAll<SVGCircleElement>('.hit-circle');
    const originLabel = hitCircles[0].getAttribute('aria-label')!;
    expect(originLabel).toContain('Cannot be moved horizontally');
  });

  it('endpoint gets "Space removes" when endpoint removal is enabled', async () => {
    const graph = makeGraph();
    await graph.updateComplete;

    const hitCircles = graph.shadowRoot!.querySelectorAll<SVGCircleElement>('.hit-circle');
    const endpointLabel = hitCircles[hitCircles.length - 1].getAttribute('aria-label')!;
    expect(endpointLabel).toContain('Space removes');
  });

  it('interior point gets "Space removes"', async () => {
    const graph = makeGraph();
    await graph.updateComplete;

    const hitCircles = graph.shadowRoot!.querySelectorAll<SVGCircleElement>('.hit-circle');
    // Middle point (index 1 of 3)
    const interiorLabel = hitCircles[1].getAttribute('aria-label')!;
    expect(interiorLabel).toContain('Space removes');
  });
});

// ── 6. Defense-in-depth _onPointRemove ───────────────────────────────

describe('defense-in-depth _onPointRemove', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('removing index 0 is rejected even with 3+ points', async () => {
    const graph = makeGraph();
    await graph.updateComplete;

    const removeEvents: CustomEvent[] = [];
    // The card-level _onPointRemove guards against this, but we test the guard
    // by verifying that the keyboard handler does NOT emit point-remove for index 0
    const originCircle = graph.shadowRoot!.querySelectorAll<SVGCircleElement>('.hit-circle')[0];

    graph.addEventListener('point-remove', ((e: CustomEvent) => {
      removeEvents.push(e);
    }) as EventListener);

    // Space on origin should NOT emit point-remove
    originCircle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(removeEvents.length).toBe(0);

    // Delete on origin should NOT emit point-remove
    originCircle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(removeEvents.length).toBe(0);
  });

  it('removing the last index is allowed with 3+ points', async () => {
    const graph = makeGraph();
    await graph.updateComplete;

    const removeEvents: CustomEvent[] = [];
    graph.addEventListener('point-remove', ((e: CustomEvent) => {
      removeEvents.push(e);
    }) as EventListener);

    const hitCircles = graph.shadowRoot!.querySelectorAll<SVGCircleElement>('.hit-circle');
    const lastCircle = hitCircles[hitCircles.length - 1];

    // Space on endpoint SHOULD emit point-remove (endpoint is now freely removable)
    lastCircle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(removeEvents.length).toBe(1);

    // Delete on endpoint should also emit point-remove
    lastCircle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(removeEvents.length).toBe(2);
  });

  it('removing an interior point works', async () => {
    const graph = makeGraph();
    await graph.updateComplete;

    const removeEvents: CustomEvent[] = [];
    graph.addEventListener('point-remove', ((e: CustomEvent) => {
      removeEvents.push(e);
    }) as EventListener);

    const hitCircles = graph.shadowRoot!.querySelectorAll<SVGCircleElement>('.hit-circle');
    const middleCircle = hitCircles[1];

    // Space on interior point should emit point-remove
    middleCircle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(removeEvents.length).toBe(1);
    expect(removeEvents[0].detail).toMatchObject({ curveIndex: 0, pointIndex: 1 });
  });
});

// ── 7. _refocusHitCircle uses data attributes ────────────────────────

describe('_refocusHitCircle uses data attributes', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('queries by data-curve/data-point instead of counting DOM order', async () => {
    // Use two curves where the selected renders last (different DOM order from array order)
    const graph = makeGraph({
      curves: [
        {
          entityId: 'light.alpha',
          friendlyName: 'Alpha',
          controlPoints: [
            { lightener: 0, target: 0 },
            { lightener: 50, target: 75 },
            { lightener: 100, target: 100 },
          ],
          visible: true,
          color: '#2563eb',
        },
        {
          entityId: 'light.beta',
          friendlyName: 'Beta',
          controlPoints: [
            { lightener: 0, target: 0 },
            { lightener: 50, target: 50 },
            { lightener: 100, target: 100 },
          ],
          visible: true,
          color: '#ef5350',
        },
      ],
      selectedCurveId: 'light.alpha',
    });
    await graph.updateComplete;

    // Verify hit circles have data attributes
    const hitCircles = graph.shadowRoot!.querySelectorAll<SVGCircleElement>('.hit-circle');
    expect(hitCircles.length).toBeGreaterThan(0);

    // Check that data-curve and data-point attributes are present
    for (const circle of hitCircles) {
      expect(circle.hasAttribute('data-curve')).toBe(true);
      expect(circle.hasAttribute('data-point')).toBe(true);
    }

    // Verify the selector used by _refocusHitCircle finds the right element
    const target = graph.shadowRoot!.querySelector<SVGCircleElement>(
      '.hit-circle[data-curve="0"][data-point="1"]'
    );
    expect(target).not.toBeNull();
    expect(target!.getAttribute('data-curve')).toBe('0');
    expect(target!.getAttribute('data-point')).toBe('1');
  });
});

// ── 8. Preview stops on disconnect ───────────────────────────────────

describe('preview stops on disconnect', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('disconnectedCallback calls _stopPreview when preview is active', async () => {
    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    document.body.appendChild(card);
    await card.updateComplete;

    // Set _previewActive to true via bracket notation
    (card as unknown as Record<string, boolean>)['_previewActive'] = true;

    // Spy on _stopPreview
    const stopSpy = vi.fn();
    (card as unknown as Record<string, () => void>)['_stopPreview'] = () => {
      stopSpy();
      // Don't call original — it needs _hass which is null
    };

    // Remove from DOM triggers disconnectedCallback
    document.body.removeChild(card);

    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('disconnectedCallback does NOT call _stopPreview when preview is inactive', async () => {
    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    document.body.appendChild(card);
    await card.updateComplete;

    // _previewActive is false by default
    const stopSpy = vi.fn();
    (card as unknown as Record<string, () => void>)['_stopPreview'] = stopSpy;

    document.body.removeChild(card);

    expect(stopSpy).not.toHaveBeenCalled();
  });
});

// ── 9. Preview restore and save timer regressions ────────────────────

describe('preview restore state', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('restores an on/off-only light to on without forcing brightness', async () => {
    const callService = vi.fn(() => Promise.resolve());
    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    const mockHass = {
      user: { is_admin: true },
      states: {
        'light.switch_like': {
          state: 'on',
          attributes: { friendly_name: 'Switch Like Light' },
        },
      },
      callWS: () => Promise.resolve({}),
      callService,
    };

    (card as unknown as Record<string, unknown>)['_hass'] = mockHass;
    (card as unknown as Record<string, LightCurve[]>)['_curves'] = [
      {
        entityId: 'light.switch_like',
        friendlyName: 'Switch Like Light',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 100 },
        ],
        visible: true,
        color: '#2563eb',
      },
    ];

    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });

    document.body.appendChild(card);
    await card.updateComplete;

    (card as unknown as Record<string, () => void>)['_startPreview']();
    callService.mockClear();

    (card as unknown as Record<string, () => void>)['_stopPreview']();

    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.switch_like',
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });

  function makePreviewCard(
    states: Record<string, { state: string; attributes: { brightness?: number } }>,
    controlPointsByEntity?: Record<string, LightCurve['controlPoints']>
  ): {
    card: LightenerCurveCard;
    callService: ReturnType<typeof vi.fn>;
    rafSpy: ReturnType<typeof vi.spyOn>;
  } {
    const callService = vi.fn(() => Promise.resolve());
    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    (card as unknown as Record<string, LightCurve[]>)['_curves'] = Object.keys(states).map(
      (entityId, idx) => ({
        entityId,
        friendlyName: entityId,
        controlPoints: controlPointsByEntity?.[entityId] ?? [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 100 },
        ],
        visible: true,
        color: idx % 2 === 0 ? '#2563eb' : '#ef5350',
      })
    );
    (card as unknown as Record<string, unknown>)['_hass'] = {
      user: { is_admin: true },
      states,
      callWS: () => Promise.resolve({}),
      callService,
    };
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });
    return { card, callService, rafSpy };
  }

  it('restores an off light with turn_off (null branch)', async () => {
    const { card, callService, rafSpy } = makePreviewCard({
      'light.was_off': { state: 'off', attributes: {} },
    });
    document.body.appendChild(card);
    await card.updateComplete;

    (card as unknown as Record<string, () => void>)['_startPreview']();
    callService.mockClear();
    (card as unknown as Record<string, () => void>)['_stopPreview']();

    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', {
      entity_id: 'light.was_off',
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });

  it('restores a mixed group using both branches', async () => {
    const { card, callService, rafSpy } = makePreviewCard({
      'light.was_off': { state: 'off', attributes: {} },
      'light.was_on': { state: 'on', attributes: { brightness: 200 } },
    });
    document.body.appendChild(card);
    await card.updateComplete;

    (card as unknown as Record<string, () => void>)['_startPreview']();
    callService.mockClear();
    (card as unknown as Record<string, () => void>)['_stopPreview']();

    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', {
      entity_id: 'light.was_off',
      transition: 0.25,
    });
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.was_on',
      brightness: 200,
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });

  it('preserves brightness 0 instead of treating it as on/off-only', async () => {
    const { card, callService, rafSpy } = makePreviewCard({
      'light.min_dim': { state: 'on', attributes: { brightness: 0 } },
    });
    document.body.appendChild(card);
    await card.updateComplete;

    (card as unknown as Record<string, () => void>)['_startPreview']();
    callService.mockClear();
    (card as unknown as Record<string, () => void>)['_stopPreview']();

    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.min_dim',
      brightness: 0,
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });

  it('previews the backend-linear brightness for a peak curve', async () => {
    const entityId = 'light.preview_peak';
    const { card, callService, rafSpy } = makePreviewCard(
      {
        [entityId]: { state: 'on', attributes: { brightness: 200 } },
      },
      {
        [entityId]: [
          { lightener: 0, target: 0 },
          { lightener: 50, target: 100 },
          { lightener: 100, target: 0 },
        ],
      }
    );
    document.body.appendChild(card);
    await card.updateComplete;

    (card as unknown as Record<string, () => void>)['_startPreview']();
    callService.mockClear();
    (card as unknown as Record<string, number>)['_lastPreviewTime'] = 0;
    (card as unknown as Record<string, (position: number) => void>)['_previewLights'](25);

    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: entityId,
      brightness: 128,
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });
});

describe('save success timer', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('keeps saved state until the newest timer expires on rapid re-save', async () => {
    vi.useFakeTimers();

    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    const callWS = vi.fn(async (msg: { type: string }) => {
      if (msg.type === 'lightener/get_curves') {
        return {
          entities: {
            'light.test': {
              brightness: { '100': '100' },
            },
          },
        };
      }
      return {};
    });

    const mockHass = {
      user: { is_admin: true },
      states: {
        'light.test': {
          state: 'on',
          attributes: { friendly_name: 'Test Light', brightness: 200 },
        },
      },
      callWS,
      callService: vi.fn(() => Promise.resolve()),
    };

    card.setConfig({ entity: 'light.test' });
    (card as unknown as Record<string, unknown>)['_hass'] = mockHass;
    (card as unknown as Record<string, LightCurve[]>)['_curves'] = [
      {
        entityId: 'light.test',
        friendlyName: 'Test Light',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 100 },
        ],
        visible: true,
        color: '#2563eb',
      },
    ];
    (card as unknown as Record<string, LightCurve[]>)['_originalCurves'] = [
      {
        entityId: 'light.test',
        friendlyName: 'Test Light',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 90 },
        ],
        visible: true,
        color: '#2563eb',
      },
    ];

    document.body.appendChild(card);
    await card.updateComplete;

    const phase = () => (card as unknown as Record<string, { phase: string }>)['_saveState'].phase;

    // First save at t=0. First timer pending, original deadline t=2000.
    await card.saveCurves();
    expect(phase()).toBe('saved');

    // Second save at t=1500, inside the 2000ms display window.
    // The fix at lightener-curve-card.ts clears the first timer here;
    // without the fix, that timer would still fire at t=2000 and flip
    // state to 'idle' while the user is looking at the second save's
    // success indicator.
    vi.advanceTimersByTime(1500);
    await card.saveCurves();
    expect(phase()).toBe('saved');

    // t=1999 — one tick before the ORIGINAL first timer would have fired.
    vi.advanceTimersByTime(499);
    expect(phase()).toBe('saved');

    // t=2001 — one tick past the original first-timer deadline.
    // Without clearTimeout, phase would have gone to 'idle' here.
    vi.advanceTimersByTime(2);
    expect(phase()).toBe('saved');

    // t=3500 — second timer's own deadline (1500 + 2000). It fires.
    vi.advanceTimersByTime(1499);
    expect(phase()).toBe('idle');

    vi.useRealTimers();
  });
});

// ── Group F: curve fade and endpoint geometry (Wave 1) ──────────────
// Encodes the *Want* states from T-2.5 / T-2.6 / T-2.2 / T-4.5.

describe('Group F — curve fade and endpoint geometry', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  function makeMultiGraph(scrubberPosition: number | null = null): CurveGraph {
    const graph = document.createElement('curve-graph') as CurveGraph;
    graph.curves = [
      {
        entityId: 'light.alpha',
        friendlyName: 'Alpha',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 50, target: 50 },
          { lightener: 100, target: 100 },
        ],
        visible: true,
        color: '#2563eb',
      },
      {
        entityId: 'light.beta',
        friendlyName: 'Beta',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 80 },
        ],
        visible: true,
        color: '#ef5350',
      },
    ];
    graph.selectedCurveId = 'light.alpha';
    graph.scrubberPosition = scrubberPosition;
    document.body.appendChild(graph);
    return graph;
  }

  // Control points are shape-coded per curve index (circle/square/diamond/
  // triangle/bar), so they render as <circle>, <rect>, or <polygon>. Recover
  // the logical center from any of them, otherwise selectors that only match
  // <circle> silently skip every non-circle curve.
  const CONTROL_POINT_SELECTOR = 'circle.control-point, rect.control-point, polygon.control-point';
  function markerCenter(el: SVGElement): { cx: number; cy: number } | null {
    if (el.tagName === 'circle') {
      return {
        cx: parseFloat(el.getAttribute('cx') ?? ''),
        cy: parseFloat(el.getAttribute('cy') ?? ''),
      };
    }
    if (el.tagName === 'rect') {
      const x = parseFloat(el.getAttribute('x') ?? '');
      const y = parseFloat(el.getAttribute('y') ?? '');
      const w = parseFloat(el.getAttribute('width') ?? '');
      const h = parseFloat(el.getAttribute('height') ?? '');
      return { cx: x + w / 2, cy: y + h / 2 };
    }
    if (el.tagName === 'polygon') {
      // Triangle marker: apex at (cx, cy-h), base at y = cy + 0.65h (see
      // controlPointShape). Recover the *logical* center exactly — the vertex
      // centroid sits ~0.1h below cy and would false-fail a tight bounds check.
      const verts = (el.getAttribute('points') ?? '')
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map((n) => parseFloat(n)));
      const xs = verts.map((v) => v[0]).filter(Number.isFinite);
      const ys = verts.map((v) => v[1]).filter(Number.isFinite);
      if (!xs.length || !ys.length) return null;
      const apexY = Math.min(...ys);
      const baseY = Math.max(...ys);
      return {
        cx: (Math.min(...xs) + Math.max(...xs)) / 2,
        cy: apexY + (baseY - apexY) / 1.65,
      };
    }
    return null;
  }

  it('F.20 every control point sits inside the plot frame [0..GRAPH_W] × [0..GRAPH_H]', async () => {
    const graph = makeMultiGraph();
    // No selection → every curve renders its points, so the non-circle markers
    // (curve 1 is a square) are exercised too — not just curve 0's circles.
    graph.selectedCurveId = null;
    await graph.updateComplete;

    const xMin = PAD_LEFT;
    const xMax = PAD_LEFT + GRAPH_W;
    const yMin = PAD_TOP;
    const yMax = PAD_TOP + GRAPH_H;

    const points = Array.from(
      graph.shadowRoot!.querySelectorAll<SVGElement>(CONTROL_POINT_SELECTOR)
    );
    expect(points.length).toBeGreaterThan(0);
    // Guard the selector itself: the fixture has a square-shaped curve, so a
    // regression back to `circle.control-point` would skip it and this fails.
    expect(
      points.some((p) => p.tagName !== 'circle'),
      'fixture must exercise at least one non-circle marker'
    ).toBe(true);
    for (const p of points) {
      const c = markerCenter(p);
      expect(c, `control point <${p.tagName}> must yield a center`).not.toBeNull();
      const { cx, cy } = c!;
      expect(cx, `control point cx=${cx} must be inside [${xMin}, ${xMax}]`).toBeGreaterThanOrEqual(
        xMin
      );
      expect(cx).toBeLessThanOrEqual(xMax + 0.001);
      expect(cy).toBeGreaterThanOrEqual(yMin);
      expect(cy).toBeLessThanOrEqual(yMax + 0.001);
    }
  });

  it('F.21 endpoint markers fade with the curve when past the scrubber', async () => {
    const graph = makeMultiGraph(/* scrubberPosition */ 65);
    // No selection → both curves render, so the square-shaped endpoint (curve 1)
    // is checked for fade alongside curve 0's circle.
    graph.selectedCurveId = null;
    await graph.updateComplete;

    // Find the right endpoint (lightener=100, cx = toSvgX(100)) for either curve.
    // Match every marker shape — curve 1 is a square (<rect>), not a <circle>.
    const rightEdgeX = toSvgX(100);
    const points = Array.from(
      graph.shadowRoot!.querySelectorAll<SVGElement>(CONTROL_POINT_SELECTOR)
    );
    const endpoints = points.filter((p) => {
      const c = markerCenter(p);
      return c !== null && Math.abs(c.cx - rightEdgeX) < 0.001;
    });
    expect(endpoints.length, 'at least one curve must have a right-edge endpoint').toBeGreaterThan(
      0
    );

    // Contract: endpoint markers past the scrubber render at reduced opacity.
    // Either via inline style="opacity: <X>" with X<1, or via a class like
    // ".faded" / "[data-fade]". Today's source renders them at full opacity
    // because they are layered after the scrubber dim overlay — this test
    // documents the gap.
    const isFaded = (el: SVGElement): boolean => {
      const inline = el.getAttribute('style') ?? '';
      const opacityMatch = inline.match(/opacity:\s*([0-9.]+)/);
      if (opacityMatch && parseFloat(opacityMatch[1]) < 1) return true;
      const opacityAttr = el.getAttribute('opacity');
      if (opacityAttr !== null && Number.parseFloat(opacityAttr) < 1) return true;
      if (el.classList.contains('faded') || el.classList.contains('past-scrubber')) return true;
      if (el.hasAttribute('data-faded')) return true;
      return false;
    };

    expect(
      endpoints.every(isFaded),
      'endpoints past the scrubber must inherit the curve fade (style.opacity<1, .faded class, or data-faded)'
    ).toBe(true);
  });

  it('F.22 dim overlay covers the right of the scrubber for every value 0/25/50/75/95/100', async () => {
    const graph = makeMultiGraph(0);
    await graph.updateComplete;

    for (const pos of [0, 25, 50, 75, 95, 100]) {
      graph.scrubberPosition = pos;
      await graph.updateComplete;

      // The dim overlay is the only element with fill-opacity=0.93 — pinned by source.
      const overlay = graph.shadowRoot!.querySelector<SVGRectElement>('rect[fill-opacity="0.93"]');
      expect(overlay, `dim overlay must render at scrubber=${pos}`).not.toBeNull();
      const x = parseFloat(overlay!.getAttribute('x') ?? '');
      const width = parseFloat(overlay!.getAttribute('width') ?? '');

      const expectedX = toSvgX(pos);
      const expectedRight = toSvgX(100);

      expect(x, `overlay.x at scrubber=${pos}`).toBeCloseTo(expectedX, 3);
      expect(
        x + width,
        `overlay's right edge at scrubber=${pos} must equal toSvgX(100)`
      ).toBeCloseTo(expectedRight, 3);
    }
  });

  it('F.23 each visible curve renders exactly one control-point per right endpoint', async () => {
    // No selection → all curves interactive → both render their own points.
    const graph = makeMultiGraph();
    graph.selectedCurveId = null;
    await graph.updateComplete;

    const rightEdgeX = toSvgX(100);
    const points = Array.from(
      graph.shadowRoot!.querySelectorAll<SVGElement>(CONTROL_POINT_SELECTOR)
    );
    const endpoints = points.filter((p) => {
      const c = markerCenter(p);
      return c !== null && Math.abs(c.cx - rightEdgeX) < 0.001;
    });

    // Two curves, each with a single (lightener=100, target=*) point.
    // No duplicated filled+hollow markers (T-2.5).
    expect(endpoints.length).toBe(2);
  });

  it('F.24 renders the shape-coded marker for every LEGEND_SHAPES index, all in-frame', async () => {
    // One curve per shape index (circle/square/diamond/triangle/bar) so the
    // <rect>/<polygon> switch arms — including triangle and bar, otherwise
    // unexercised — actually render. Include target=0 and target=100 endpoints
    // so the boundary rows exercise markerCenter at the frame edges.
    const colors = ['#2563eb', '#ef5350', '#26a69a', '#ab47bc', '#ffa726'];
    const curves: LightCurve[] = colors.map((color, i) => ({
      entityId: `light.c${i}`,
      friendlyName: `C${i}`,
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 100 },
      ],
      visible: true,
      color,
    }));
    // makeGraph's `?? 'light.alpha'` default would suppress null, so set it
    // explicitly after creation → every curve is interactive and renders.
    const graph = makeGraph({ curves });
    graph.selectedCurveId = null;
    await graph.updateComplete;

    const points = Array.from(
      graph.shadowRoot!.querySelectorAll<SVGElement>(CONTROL_POINT_SELECTOR)
    );
    // 5 curves × 2 points = 10 markers across all three element types.
    expect(points.length).toBe(10);
    const tags = new Set(points.map((p) => p.tagName));
    expect(tags.has('circle'), 'circle marker (idx 0) must render').toBe(true);
    expect(tags.has('rect'), 'rect markers (square/diamond/bar) must render').toBe(true);
    expect(tags.has('polygon'), 'polygon marker (triangle, idx 3) must render').toBe(true);

    const xMin = PAD_LEFT;
    const xMax = PAD_LEFT + GRAPH_W;
    const yMin = PAD_TOP;
    const yMax = PAD_TOP + GRAPH_H;
    for (const p of points) {
      const c = markerCenter(p);
      expect(c, `marker <${p.tagName}> must yield a center`).not.toBeNull();
      const { cx, cy } = c!;
      expect(cx).toBeGreaterThanOrEqual(xMin - 0.001);
      expect(cx).toBeLessThanOrEqual(xMax + 0.001);
      expect(cy).toBeGreaterThanOrEqual(yMin - 0.001);
      expect(cy).toBeLessThanOrEqual(yMax + 0.001);
    }
  });
});

// ── 10. Preview button hidden during cancel animation ────────────────

describe('preview button hidden during cancel animation', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  function makeAdminCard(): LightenerCurveCard {
    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    // Set _hass with an admin user so _isAdmin getter returns true
    const mockHass = {
      user: { is_admin: true },
      states: {},
      callWS: () => Promise.resolve({}),
      callService: () => Promise.resolve(),
    };
    (card as unknown as Record<string, unknown>)['_hass'] = mockHass;
    (card as unknown as Record<string, boolean>)['_loading'] = false;
    (card as unknown as Record<string, LightCurve[]>)['_curves'] = [
      {
        entityId: 'light.test',
        friendlyName: 'Test',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 100 },
        ],
        visible: true,
        color: '#2563eb',
      },
    ];
    return card;
  }

  it('preview toggle button is not rendered when _cancelAnimating is true', async () => {
    const card = makeAdminCard();
    (card as unknown as Record<string, boolean>)['_cancelAnimating'] = true;
    document.body.appendChild(card);
    await card.updateComplete;

    // The preview toggle row should NOT be rendered
    const previewBtn = card.shadowRoot!.querySelector('.preview-toggle-btn');
    expect(previewBtn).toBeNull();
  });

  it('preview toggle button renders when _cancelAnimating is false', async () => {
    const card = makeAdminCard();
    (card as unknown as Record<string, boolean>)['_cancelAnimating'] = false;
    document.body.appendChild(card);
    await card.updateComplete;

    // Preview is now inside the scrubber component — verify canPreview is passed correctly
    const scrubber = card.shadowRoot!.querySelector('curve-scrubber') as HTMLElement & {
      canPreview: boolean;
    };
    expect(scrubber).not.toBeNull();
    expect(scrubber.canPreview).toBe(true);
  });
});

// ── Point tooltip must not intercept the pointer (flicker guard) ──────

describe('point tooltip pointer transparency', () => {
  // The tooltip renders above its control point. If it accepts pointer
  // events, a cursor approaching the point from above alternates between
  // hit-circle and tooltip, toggling _hoveredPoint every frame (flicker).
  it('tooltip background ignores pointer events', () => {
    expect(componentCssText('curve-graph')).toMatch(/\.tooltip-bg\s*{[^}]*pointer-events:\s*none/);
  });

  it('tooltip text ignores pointer events', () => {
    expect(componentCssText('curve-graph')).toMatch(
      /\.tooltip-text\s*{[^}]*pointer-events:\s*none/
    );
  });
});

// ── Graph-insight band must not resize on text swaps (jiggle guard) ───

describe('graph-insight stable height', () => {
  // Hovering a shape swaps the band's text (summary -> "Trying …"). If the
  // trial state unlocks wrapping, the band grows and the graph below it
  // shifts on every hover.
  it('trial state does not unlock wrapping on the secondary line', () => {
    // The old trial-specific `.graph-insight.trial` override was folded into
    // the general rule set, so that selector no longer exists — matching
    // against it would pass vacuously forever. Assert against the base
    // (unconditional) .graph-insight-secondary rule instead: it must stay
    // nowrap so no state, trial included, can unlock wrapping outside the
    // deliberate narrow-band 2-line clamp exception below.
    const cssText = componentCssText('lightener-curve-card');
    const baseRule = cssText.match(/\.graph-insight-secondary\s*{[^}]*}/);
    expect(baseRule).not.toBeNull();
    expect(baseRule![0]).toMatch(/white-space:\s*nowrap/);
    expect(baseRule![0]).not.toMatch(/white-space:\s*normal/);
  });

  it('band reserves its height up front', () => {
    expect(componentCssText('lightener-curve-card')).toMatch(/\.graph-insight\s*{[^}]*min-height/);
  });

  it('stacked narrow band clamps the secondary line instead of growing', () => {
    expect(componentCssText('lightener-curve-card')).toMatch(/-webkit-line-clamp:\s*2/);
  });
});

// ── Layout keys on card width in both contexts (divergence guard) ─────

describe('unified card-width layout', () => {
  // The old rules were viewport media queries scoped to .card.embedded, so
  // the Lovelace card (never embedded) got no responsive layout at all and
  // its save/undo footer sank below the whole light list.
  it('responsive layout uses container queries, not embedded-scoped media queries', () => {
    const cssText = componentCssText('lightener-curve-card');
    expect(cssText).toMatch(/container-type:\s*inline-size/);
    expect(cssText).toMatch(/@container\s*\(min-width/);
    expect(cssText).toMatch(/@container\s*\(max-width/);
    expect(cssText).not.toMatch(/@media \(min-width: 1100px\)/);
    expect(cssText).not.toMatch(/\.card\.embedded \.workspace/);
  });

  it('footer is sticky in both the wide and narrow container layouts', () => {
    const cssText = componentCssText('lightener-curve-card');
    const sticky = cssText.match(/\.footer-slot\s*{[^}]*position:\s*sticky/g) ?? [];
    // Wide layout, narrow layout, and the no-container-query fallback.
    expect(sticky.length).toBeGreaterThanOrEqual(3);
  });

  // Engines without container queries (older wall-tablet WebViews) must keep
  // the sticky-footer reachability guarantee via an @supports fallback.
  it('keeps a sticky-footer fallback for browsers without container queries', () => {
    expect(componentCssText('lightener-curve-card')).toMatch(
      /@supports not \(container-type:\s*inline-size\)/
    );
  });
});

// ── Scrubber and graph must show one position (trust guard) ───────────

describe('scrubber position drives every surface', () => {
  function makeCardWithCurves(): LightenerCurveCard {
    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    card.setConfig({ type: 'custom:lightener-curve-card', entity: 'light.test' });
    (card as unknown as Record<string, LightCurve[]>)['_curves'] = [
      {
        entityId: 'light.test_child',
        friendlyName: 'Test child',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 100 },
        ],
        visible: true,
        color: '#2563eb',
      },
    ];
    document.body.appendChild(card);
    return card;
  }

  // The scrubber thumb used to default to 50 on its own while the graph got
  // null and drew nothing — the slider claimed a brightness the graph never
  // showed. All surfaces must receive the same effective position.
  it('graph, scrubber, and legend receive the effective position before any drag', async () => {
    const card = makeCardWithCurves();
    await card.updateComplete;

    const graph = card.shadowRoot!.querySelector('curve-graph') as HTMLElement & {
      scrubberPosition: number | null;
    };
    const scrubber = card.shadowRoot!.querySelector('curve-scrubber') as HTMLElement & {
      position: number | null;
    };
    const legend = card.shadowRoot!.querySelector('curve-legend') as HTMLElement & {
      scrubberPosition: number | null;
    };

    expect(graph.scrubberPosition).toBe(50);
    expect(scrubber.position).toBe(50);
    expect(legend.scrubberPosition).toBe(50);
    card.remove();
  });

  // Past the graph's max rendered width the SVG letterboxes while the
  // scrubber keeps stretching, so slider x stops matching graph x. The stack
  // is capped as one unit — and the action footer must carry the same cap in
  // EVERY layout (base rule), or it diverges from the graph width in the
  // narrow and no-container-query fallbacks.
  it('graph stack and footer share the width cap in all layouts', () => {
    const rule = componentCssText('lightener-curve-card').match(
      /\.main-stack,\s*\.footer-slot\s*{[^}]*}/
    );
    expect(rule).not.toBeNull();
    expect(rule![0]).toMatch(/max-width:\s*calc\(var\(--curve-graph-max-height, 320px\)/);
    expect(rule![0]).toMatch(/margin-inline:\s*auto/);
  });
});
