// @vitest-environment jsdom

/**
 * Non-mouse point removal and pointer-cancel cleanup.
 *
 * The graph ships into the Home Assistant mobile app, where long-press is the
 * only way to remove a control point — but the long-press timer, the
 * right-click equivalent, and the pointercancel cleanup that interrupts them
 * had no coverage at any level.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurveGraph } from './curve-graph.js';

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

afterEach(() => {
  vi.useRealTimers();
});

function makeGraph(): CurveGraph {
  const graph = document.createElement('curve-graph') as CurveGraph;
  graph.curves = [
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
  graph.selectedCurveId = 'light.alpha';
  document.body.appendChild(graph);
  return graph;
}

function points(graph: CurveGraph): SVGElement[] {
  return Array.from(graph.shadowRoot!.querySelectorAll<SVGElement>('.hit-circle'));
}

function collectRemovals(graph: CurveGraph): Array<Record<string, unknown>> {
  const removed: Array<Record<string, unknown>> = [];
  graph.addEventListener('point-remove', ((event: CustomEvent) => {
    removed.push(event.detail);
  }) as EventListener);
  return removed;
}

function pointerDown(target: Element, pointerId = 4): void {
  const svg = (target.getRootNode() as ShadowRoot).querySelector('svg')!;
  (svg as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = vi.fn();
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      button: 0,
      pointerId,
      pointerType: 'touch',
    })
  );
}

describe('long-press removes a point on touch', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('emits point-remove after the press is held', async () => {
    vi.useFakeTimers();
    const graph = makeGraph();
    await graph.updateComplete;
    const removed = collectRemovals(graph);

    pointerDown(points(graph)[1]);
    expect(removed, 'nothing removed before the hold completes').toHaveLength(0);

    vi.advanceTimersByTime(500);

    expect(removed).toEqual([{ curveIndex: 0, pointIndex: 1 }]);
  });

  it('never removes the origin anchor, however long it is held', async () => {
    vi.useFakeTimers();
    const graph = makeGraph();
    await graph.updateComplete;
    const removed = collectRemovals(graph);

    pointerDown(points(graph)[0]);
    vi.advanceTimersByTime(2000);

    expect(removed).toEqual([]);
  });

  it('cancels the pending removal once the finger moves — that is a drag', async () => {
    vi.useFakeTimers();
    const graph = makeGraph();
    await graph.updateComplete;
    const removed = collectRemovals(graph);
    const svg = graph.shadowRoot!.querySelector<SVGSVGElement>('svg')!;
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1 }) }),
    });
    Object.defineProperty(svg, 'createSVGPoint', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        matrixTransform() {
          return { x: this.x, y: this.y };
        },
      }),
    });

    pointerDown(points(graph)[1]);
    svg.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        composed: true,
        pointerId: 4,
        pointerType: 'touch',
        clientX: 40,
        clientY: 40,
      })
    );
    vi.advanceTimersByTime(2000);

    expect(removed).toEqual([]);
  });

  it('offers nothing to long-press on a read-only graph', async () => {
    vi.useFakeTimers();
    const graph = makeGraph();
    graph.readOnly = true;
    await graph.updateComplete;
    const removed = collectRemovals(graph);

    // A read-only graph renders no control points at all, so long-press has no
    // target — assert that directly rather than pressing a point that is absent.
    expect(points(graph)).toHaveLength(0);

    // Belt and braces: driving the handler anyway must still remove nothing.
    (
      graph as unknown as { _onPointerDown: (e: PointerEvent, c: number, p: number) => void }
    )._onPointerDown(
      new PointerEvent('pointerdown', { button: 0, pointerId: 4, pointerType: 'touch' }),
      0,
      1
    );
    vi.advanceTimersByTime(2000);

    expect(removed).toEqual([]);
  });
});

describe('right-click removes a point on desktop', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  function contextMenu(target: Element): MouseEvent {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
  }

  it('emits point-remove and suppresses the browser menu', async () => {
    const graph = makeGraph();
    await graph.updateComplete;
    const removed = collectRemovals(graph);

    const event = contextMenu(points(graph)[1]);

    expect(removed).toEqual([{ curveIndex: 0, pointIndex: 1 }]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('suppresses the menu on the origin anchor without removing it', async () => {
    const graph = makeGraph();
    await graph.updateComplete;
    const removed = collectRemovals(graph);

    const event = contextMenu(points(graph)[0]);

    expect(removed).toEqual([]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not remove points on a curve that is not selected', async () => {
    const graph = makeGraph();
    graph.curves = [
      ...graph.curves,
      {
        entityId: 'light.beta',
        friendlyName: 'Beta',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 50, target: 20 },
          { lightener: 100, target: 100 },
        ],
        visible: true,
        color: '#dc2626',
      },
    ];
    graph.selectedCurveId = 'light.alpha';
    await graph.updateComplete;
    const removed = collectRemovals(graph);

    // Only the selected curve renders interactive points...
    expect(graph.shadowRoot!.querySelectorAll('.hit-circle[data-curve="1"]')).toHaveLength(0);

    // ...and the handler refuses the unselected curve even when driven directly,
    // so a stale reference cannot edit a curve the user is not working on.
    const event = new MouseEvent('contextmenu', { cancelable: true });
    (
      graph as unknown as { _onPointContextMenu: (e: MouseEvent, c: number, p: number) => void }
    )._onPointContextMenu(event, 1, 1);

    expect(removed).toEqual([]);
  });

  it('suppresses the menu over the graph body without removing anything', async () => {
    const graph = makeGraph();
    await graph.updateComplete;
    const removed = collectRemovals(graph);

    const svg = graph.shadowRoot!.querySelector<SVGSVGElement>('svg')!;
    const event = contextMenu(svg);

    expect(removed).toEqual([]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves the browser menu alone when the graph is read-only', async () => {
    const graph = makeGraph();
    graph.readOnly = true;
    await graph.updateComplete;

    const svg = graph.shadowRoot!.querySelector<SVGSVGElement>('svg')!;
    const event = contextMenu(svg);

    expect(event.defaultPrevented).toBe(false);
  });
});

describe('pointer cancellation cleans up pending interactions', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  async function prepareTouchGraph() {
    const graph = makeGraph();
    await graph.updateComplete;
    const svg = graph.shadowRoot!.querySelector<SVGSVGElement>('svg')!;
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1 }) }),
    });
    Object.defineProperty(svg, 'createSVGPoint', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        matrixTransform() {
          return { x: this.x, y: this.y };
        },
      }),
    });
    const hitArea = graph.shadowRoot!.querySelector<SVGRectElement>('.hit-area')!;
    (hitArea as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = vi.fn();
    return { graph, hitArea };
  }

  function touch(
    target: Element,
    type: 'pointerdown' | 'pointerup' | 'pointercancel',
    pointerId = 9
  ): void {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        pointerId,
        pointerType: 'touch',
        clientX: 120,
        clientY: 120,
      })
    );
  }

  it('an interrupted tap does not count toward a double-tap add', async () => {
    const { graph, hitArea } = await prepareTouchGraph();
    const added: Array<Record<string, unknown>> = [];
    graph.addEventListener('point-add', ((event: CustomEvent) => {
      added.push(event.detail);
    }) as EventListener);

    // A system gesture (scroll, notification) cancels the first tap...
    touch(hitArea, 'pointerdown');
    touch(hitArea, 'pointercancel');
    touch(hitArea, 'pointerup');
    // ...so this second tap is the first *completed* one, not a double-tap.
    touch(hitArea, 'pointerdown');
    touch(hitArea, 'pointerup');

    expect(added).toEqual([]);
  });

  it('ignores a cancel for a different pointer id', async () => {
    const { graph, hitArea } = await prepareTouchGraph();
    const added: Array<Record<string, unknown>> = [];
    graph.addEventListener('point-add', ((event: CustomEvent) => {
      added.push(event.detail);
    }) as EventListener);

    touch(hitArea, 'pointerdown', 9);
    // A second, unrelated finger being cancelled must not drop the live tap.
    touch(hitArea, 'pointercancel', 11);
    touch(hitArea, 'pointerup', 9);
    touch(hitArea, 'pointerdown', 9);
    touch(hitArea, 'pointerup', 9);

    expect(added).toHaveLength(1);
  });

  it('clears the point highlight when the pointer is cancelled over a point', async () => {
    const graph = makeGraph();
    await graph.updateComplete;

    const point = points(graph)[1];
    point.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, composed: true }));
    await graph.updateComplete;
    expect(graph.shadowRoot!.querySelector('.control-point.hovered')).not.toBeNull();

    point.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, composed: true }));
    await graph.updateComplete;

    expect(graph.shadowRoot!.querySelector('.control-point.hovered')).toBeNull();
  });
});

describe('keyboard focus is released on blur', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('drops the focus ring and tooltip when the point loses focus', async () => {
    const graph = makeGraph();
    await graph.updateComplete;

    const point = points(graph)[1];
    point.dispatchEvent(new FocusEvent('focus', { bubbles: false, composed: true }));
    await graph.updateComplete;
    expect(graph.shadowRoot!.querySelector('.control-point.focused')).not.toBeNull();

    point.dispatchEvent(new FocusEvent('blur', { bubbles: false, composed: true }));
    await graph.updateComplete;

    expect(graph.shadowRoot!.querySelector('.control-point.focused')).toBeNull();
  });

  it('leaves another point focused when a stale blur arrives', async () => {
    const graph = makeGraph();
    await graph.updateComplete;

    const [, second, third] = points(graph);
    second.dispatchEvent(new FocusEvent('focus', { bubbles: false, composed: true }));
    await graph.updateComplete;
    third.dispatchEvent(new FocusEvent('focus', { bubbles: false, composed: true }));
    await graph.updateComplete;

    // The blur for the point that already handed focus over must not clear the
    // new focus target.
    second.dispatchEvent(new FocusEvent('blur', { bubbles: false, composed: true }));
    await graph.updateComplete;

    expect(graph.shadowRoot!.querySelector('.control-point.focused')).not.toBeNull();
  });
});
