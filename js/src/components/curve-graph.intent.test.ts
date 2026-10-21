// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurveGraph } from './curve-graph.js';
import {
  DEFAULT_GRAPH_MAX_HEIGHT,
  PAD_BOTTOM,
  VB_H,
  VB_W,
  toSvgX,
  toSvgY,
} from '../utils/graph-math.js';
import { UI } from '../utils/strings.js';

beforeAll(async () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
  await import('./curve-graph.js');
});

beforeEach(() => document.body.replaceChildren());
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function makeGraph() {
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
      color: '#2563eb',
      visible: true,
    },
  ];
  document.body.append(graph);
  await graph.updateComplete;
  const svg = graph.shadowRoot!.querySelector('svg')!;
  const captures = new Set<number>();
  svg.setPointerCapture = vi.fn((id) => captures.add(id));
  svg.hasPointerCapture = vi.fn((id) => captures.has(id));
  svg.releasePointerCapture = vi.fn((id) => {
    captures.delete(id);
    // Native capture loss can reenter finalization while the release runs.
    svg.dispatchEvent(pointer('lostpointercapture', { pointerId: id }));
  });
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
  const hit = graph.shadowRoot!.querySelector<SVGCircleElement>(
    '.hit-circle[data-curve="0"][data-point="1"]'
  )!;
  const move = vi.fn();
  const drop = vi.fn();
  const focus = vi.fn();
  const interaction = vi.fn();
  graph.addEventListener('point-move', move);
  graph.addEventListener('point-drop', drop);
  graph.addEventListener('focus-curve', focus);
  graph.addEventListener('graph-interaction', interaction);
  return { graph, svg, hit, move, drop, focus, interaction };
}

function pointer(type: string, init: PointerEventInit = {}) {
  return new PointerEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    clientX: toSvgX(50),
    clientY: toSvgY(75),
    ...init,
  });
}

describe('graph point intent', () => {
  it.each(['cancel', 'disconnect'])(
    'completes a held keyboard edit once when its move listener causes %s',
    async (action) => {
      const { graph, hit, drop } = await makeGraph();
      graph.addEventListener('point-move', () => {
        if (action === 'cancel') graph.cancelInteraction();
        else graph.remove();
      });
      hit.dispatchEvent(pointer('pointerdown'));
      hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(drop).toHaveBeenCalledOnce();
      expect(graph.interactionActive).toBe(false);
    }
  );

  it.each(['pointerup', 'pointercancel', 'lostpointercapture', 'blur'])(
    'finishes a pre-threshold keyboard edit once on %s without allowing long-press removal',
    async (ending) => {
      vi.useFakeTimers();
      const { graph, svg, hit, move, drop, focus } = await makeGraph();
      const remove = vi.fn();
      graph.addEventListener('point-remove', remove);
      hit.dispatchEvent(pointer('pointerdown'));
      hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(move).toHaveBeenCalledOnce();
      expect(drop).not.toHaveBeenCalled();
      focus.mockClear();
      // A keyboard edit must not turn later pointer jitter into a drag.
      svg.dispatchEvent(pointer('pointermove', { clientX: toSvgX(50) + 2 }));
      expect(move).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(550);
      expect(remove).not.toHaveBeenCalled();
      if (ending === 'blur') hit.dispatchEvent(new FocusEvent('blur'));
      else svg.dispatchEvent(pointer(ending));
      expect(drop).toHaveBeenCalledOnce();
      expect(graph.interactionActive).toBe(false);
      expect(focus).not.toHaveBeenCalled();
      svg.dispatchEvent(pointer('pointerup'));
      expect(drop).toHaveBeenCalledOnce();
    }
  );

  it('keeps a clamped keyboard no-op as an unedited press', async () => {
    const { graph, svg, drop } = await makeGraph();
    const last = graph.renderRoot.querySelector<SVGCircleElement>('[data-point="2"]')!;
    last.dispatchEvent(pointer('pointerdown', { clientX: toSvgX(100), clientY: toSvgY(100) }));
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    svg.dispatchEvent(pointer('pointerup', { clientX: toSvgX(100), clientY: toSvgY(100) }));
    expect(drop).not.toHaveBeenCalled();
    expect(graph.interactionActive).toBe(false);
  });

  it('leaves long-press removal armed after a clamped keyboard no-op', async () => {
    vi.useFakeTimers();
    const { graph, svg, drop } = await makeGraph();
    const remove = vi.fn();
    graph.addEventListener('point-remove', remove);
    const last = graph.renderRoot.querySelector<SVGCircleElement>('[data-point="2"]')!;
    last.dispatchEvent(pointer('pointerdown', { clientX: toSvgX(100), clientY: toSvgY(100) }));
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(remove).toHaveBeenCalledOnce();
    svg.dispatchEvent(pointer('pointerup', { clientX: toSvgX(100), clientY: toSvgY(100) }));
    expect(drop).not.toHaveBeenCalled();
    expect(graph.interactionActive).toBe(false);
  });

  it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])(
    'counts a held %s as a keyboard edit that the release closes',
    async (key) => {
      const { graph, svg, hit, move, drop } = await makeGraph();
      hit.dispatchEvent(pointer('pointerdown'));
      hit.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      expect(move).toHaveBeenCalledOnce();
      expect(drop).not.toHaveBeenCalled();
      svg.dispatchEvent(pointer('pointerup'));
      expect(drop).toHaveBeenCalledOnce();
      expect(graph.interactionActive).toBe(false);
    }
  );

  it.each(['Enter', 'Delete'])(
    'swallows a failed refocus after %s so the edit still lands',
    async (key) => {
      const { graph, hit } = await makeGraph();
      const structural = vi.fn();
      graph.addEventListener('point-add', structural);
      graph.addEventListener('point-remove', structural);
      const unhandled: unknown[] = [];
      const record = (reason: unknown) => unhandled.push(reason);
      process.on('unhandledRejection', record);
      try {
        vi.spyOn(graph, 'updateComplete', 'get').mockImplementation(() =>
          Promise.reject(new Error('render failed'))
        );
        hit.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        // Let any unhandled rejection surface before asserting.
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(structural).toHaveBeenCalledOnce();
        expect(unhandled).toEqual([]);
      } finally {
        process.off('unhandledRejection', record);
      }
    }
  );

  it('suppresses the synthetic double-click after a keyboard-edited press', async () => {
    vi.useFakeTimers();
    const { graph, svg, hit } = await makeGraph();
    const add = vi.fn();
    graph.addEventListener('point-add', add);
    hit.dispatchEvent(pointer('pointerdown'));
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    svg.dispatchEvent(pointer('pointerup'));
    const dblclick = () =>
      new MouseEvent('dblclick', { clientX: toSvgX(25), clientY: toSvgY(25), bubbles: true });
    svg.dispatchEvent(dblclick());
    expect(add).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    svg.dispatchEvent(dblclick());
    expect(add).toHaveBeenCalledOnce();
  });

  it('leaves a held press active when Enter has no room to add a point', async () => {
    const { graph, svg, drop, focus } = await makeGraph();
    graph.curves = [
      {
        ...graph.curves[0],
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 1, target: 50 },
          { lightener: 2, target: 100 },
        ],
      },
    ];
    await graph.updateComplete;
    const add = vi.fn();
    graph.addEventListener('point-add', add);
    const point = graph.renderRoot.querySelector<SVGCircleElement>('.hit-circle[data-point="1"]')!;
    point.dispatchEvent(pointer('pointerdown'));
    point.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(add).not.toHaveBeenCalled();
    expect(graph.interactionActive).toBe(true);
    // Still an ordinary tap: the Enter that changed nothing did not end or edit the press.
    focus.mockClear();
    svg.dispatchEvent(pointer('pointerup'));
    expect(focus).toHaveBeenCalledOnce();
    expect(drop).not.toHaveBeenCalled();
    expect(graph.interactionActive).toBe(false);
  });

  it.each(['the origin point', 'a two-point curve'])(
    'leaves a held press active when Delete is refused on %s',
    async (refused) => {
      const { graph, svg, drop, focus } = await makeGraph();
      if (refused === 'a two-point curve') {
        graph.curves = [
          {
            ...graph.curves[0],
            controlPoints: [
              { lightener: 0, target: 0 },
              { lightener: 100, target: 100 },
            ],
          },
        ];
        await graph.updateComplete;
      }
      const remove = vi.fn();
      graph.addEventListener('point-remove', remove);
      const point = graph.renderRoot.querySelector<SVGCircleElement>(
        refused === 'the origin point' ? '.origin-hit' : '.hit-circle[data-point="1"]'
      )!;
      point.dispatchEvent(pointer('pointerdown'));
      point.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
      expect(remove).not.toHaveBeenCalled();
      expect(graph.interactionActive).toBe(true);
      // Still an ordinary tap: the refused Delete did not end or edit the press.
      focus.mockClear();
      svg.dispatchEvent(pointer('pointerup'));
      expect(focus).toHaveBeenCalledOnce();
      expect(drop).not.toHaveBeenCalled();
      expect(graph.interactionActive).toBe(false);
    }
  );

  it.each(['Enter', 'Delete', 'Backspace', ' ', 'contextmenu', 'dblclick'])(
    '%s ends a press that has not started dragging, so later moves edit nothing',
    async (action) => {
      const { graph, svg, hit, move, drop } = await makeGraph();
      const structural = vi.fn();
      graph.addEventListener('point-add', structural);
      graph.addEventListener('point-remove', structural);
      hit.dispatchEvent(pointer('pointerdown'));
      const event = ['contextmenu', 'dblclick'].includes(action)
        ? new MouseEvent(action, {
            bubbles: true,
            composed: true,
            clientX: toSvgX(60),
            clientY: toSvgY(50),
          })
        : new KeyboardEvent('keydown', { key: action, bubbles: true });
      (action === 'dblclick' ? svg : hit).dispatchEvent(event);
      expect(structural).toHaveBeenCalledOnce();
      expect(graph.interactionActive).toBe(false);
      // The held pointer can still move and lift, but the indexes it named are gone.
      svg.dispatchEvent(pointer('pointermove', { clientY: toSvgY(75) - 12 }));
      svg.dispatchEvent(pointer('pointerup', { clientY: toSvgY(75) - 12 }));
      expect(move).not.toHaveBeenCalled();
      expect(drop).not.toHaveBeenCalled();
    }
  );

  it.each(['window blur', 'readOnly', 'entity change', 'hide', 'reorder'])(
    '%s closes a keyboard-edited press with exactly one point-drop',
    async (termination) => {
      const { graph, svg, hit, drop, interaction } = await makeGraph();
      hit.dispatchEvent(pointer('pointerdown'));
      hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(drop).not.toHaveBeenCalled();
      if (termination === 'window blur') window.dispatchEvent(new Event('blur'));
      else if (termination === 'readOnly') graph.readOnly = true;
      else if (termination === 'entity change') graph.entityId = 'light.other_group';
      else if (termination === 'hide')
        graph.curves = graph.curves.map((c) => ({ ...c, visible: false }));
      else graph.curves = [{ ...graph.curves[0], entityId: 'light.beta' }, ...graph.curves];
      await graph.updateComplete;
      // The termination itself closes the edit, before any stray capture event can.
      expect(drop).toHaveBeenCalledOnce();
      expect(graph.interactionActive).toBe(false);
      svg.dispatchEvent(pointer('lostpointercapture'));
      svg.dispatchEvent(pointer('pointerup'));
      expect(drop).toHaveBeenCalledOnce();
      expect((interaction.mock.calls.at(-1)![0] as CustomEvent).detail.phase).toBe('cancel');
    }
  );

  it.each(['mouse', 'touch', 'pen'])(
    '%s tap jitter focuses without editing',
    async (pointerType) => {
      const { graph, svg, hit, move, drop, focus, interaction } = await makeGraph();
      const before = structuredClone(graph.curves);
      hit.dispatchEvent(pointer('pointerdown', { pointerType }));
      await graph.updateComplete;
      expect(graph.shadowRoot!.querySelector('.control-point.dragging')).not.toBeNull();
      expect((interaction.mock.calls[0][0] as CustomEvent).detail).toEqual({
        phase: 'start',
        input: pointerType,
      });
      svg.dispatchEvent(
        pointer('pointermove', {
          pointerType,
          clientX: toSvgX(50) + 2,
          clientY: toSvgY(75) + 1,
        })
      );
      svg.dispatchEvent(
        pointer('pointerup', {
          pointerType,
          clientX: toSvgX(50) + 2,
          clientY: toSvgY(75) + 1,
        })
      );
      expect(move).not.toHaveBeenCalled();
      expect(drop).not.toHaveBeenCalled();
      expect(focus).toHaveBeenCalledOnce();
      expect((focus.mock.calls[0][0] as CustomEvent).detail).toEqual({ entityId: 'light.alpha' });
      expect(graph.curves).toEqual(before);
      expect(graph.interactionActive).toBe(false);
      expect(interaction.mock.calls.map(([e]) => (e as CustomEvent).detail.phase)).toEqual([
        'start',
        'end',
      ]);
    }
  );

  it('uses six client pixels in any direction before entering the existing point drag', async () => {
    const { graph, svg, hit, move, drop, focus } = await makeGraph();
    hit.dispatchEvent(pointer('pointerdown'));
    svg.dispatchEvent(pointer('pointermove', { clientX: toSvgX(50) + 3, clientY: toSvgY(75) + 4 }));
    expect(move).not.toHaveBeenCalled();
    svg.dispatchEvent(pointer('pointermove', { clientY: toSvgY(75) - 6 }));
    expect(move).toHaveBeenCalledOnce();
    expect((move.mock.calls[0][0] as CustomEvent).detail).toEqual({
      curveIndex: 0,
      pointIndex: 1,
      lightener: 50,
      target: 78,
    });
    svg.dispatchEvent(pointer('pointerup', { clientY: toSvgY(75) - 6 }));
    expect(drop).toHaveBeenCalledOnce();
    expect(focus).not.toHaveBeenCalled();
    expect(graph.interactionActive).toBe(false);
  });

  it('keeps origin and neighbor constraints after intent is established', async () => {
    const { graph, svg, hit, move } = await makeGraph();
    hit.dispatchEvent(pointer('pointerdown'));
    svg.dispatchEvent(pointer('pointermove', { clientX: 999, clientY: -999 }));
    expect((move.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      lightener: 99,
      target: 100,
    });
    svg.dispatchEvent(pointer('pointerup'));
    const origin = graph.shadowRoot!.querySelector<SVGCircleElement>('.origin-hit')!;
    origin.dispatchEvent(pointer('pointerdown', { clientX: toSvgX(0), clientY: toSvgY(0) }));
    svg.dispatchEvent(pointer('pointermove', { clientX: toSvgX(50), clientY: -999 }));
    expect((move.mock.calls[1][0] as CustomEvent).detail).toMatchObject({
      lightener: 0,
      target: 100,
    });
  });

  it('ignores other pointers without stealing or ending the owning gesture', async () => {
    const { graph, svg, hit, move, drop } = await makeGraph();
    hit.dispatchEvent(pointer('pointerdown'));
    hit.dispatchEvent(pointer('pointerdown', { pointerId: 2 }));
    svg.dispatchEvent(pointer('pointermove', { pointerId: 2, clientY: 0 }));
    svg.dispatchEvent(pointer('pointerup', { pointerId: 2 }));
    svg.dispatchEvent(pointer('pointercancel', { pointerId: 2 }));
    expect(graph.interactionActive).toBe(true);
    expect(move).not.toHaveBeenCalled();
    expect(drop).not.toHaveBeenCalled();
    svg.dispatchEvent(pointer('pointermove', { clientY: toSvgY(75) - 12 }));
    svg.dispatchEvent(pointer('pointerup'));
    expect(move).toHaveBeenCalledOnce();
    expect(drop).toHaveBeenCalledOnce();
  });

  it('rejects moves synchronously after switching the group, before the render catches up', async () => {
    const { graph, svg, hit, move, drop } = await makeGraph();
    hit.dispatchEvent(pointer('pointerdown'));
    graph.entityId = 'light.other_group';
    svg.dispatchEvent(pointer('pointermove', { clientY: toSvgY(75) - 12 }));
    expect(move).not.toHaveBeenCalled();
    expect(drop).not.toHaveBeenCalled();
    expect(graph.interactionActive).toBe(false);
  });

  it.each([
    'pointercancel',
    'lostpointercapture',
    'point blur',
    'window blur',
    'disconnect',
    'readOnly',
    'entity change',
    'hide',
    'reorder',
    'explicit cancel',
  ])('%s clears pending and applied gestures exactly once', async (termination) => {
    for (const dragging of [false, true]) {
      const { graph, svg, hit, move, drop, focus, interaction } = await makeGraph();
      hit.dispatchEvent(pointer('pointerdown'));
      if (dragging) svg.dispatchEvent(pointer('pointermove', { clientY: toSvgY(75) - 12 }));
      if (termination === 'point blur') hit.dispatchEvent(new FocusEvent('blur'));
      else if (termination === 'window blur') window.dispatchEvent(new Event('blur'));
      else if (termination === 'disconnect') graph.remove();
      else if (termination === 'readOnly') graph.readOnly = true;
      else if (termination === 'entity change') graph.entityId = 'light.other_group';
      else if (termination === 'hide')
        graph.curves = graph.curves.map((c) => ({ ...c, visible: false }));
      else if (termination === 'reorder')
        graph.curves = [{ ...graph.curves[0], entityId: 'light.beta' }, ...graph.curves];
      else if (termination === 'explicit cancel') graph.cancelInteraction();
      else svg.dispatchEvent(pointer(termination));
      await graph.updateComplete;
      svg.dispatchEvent(pointer('lostpointercapture'));
      svg.dispatchEvent(pointer('pointerup'));
      expect(graph.interactionActive).toBe(false);
      expect(move).toHaveBeenCalledTimes(dragging ? 1 : 0);
      expect(drop).toHaveBeenCalledTimes(dragging ? 1 : 0);
      expect(focus).not.toHaveBeenCalled();
      expect(interaction.mock.calls.map(([e]) => (e as CustomEvent).detail.phase)).toEqual([
        'start',
        'cancel',
      ]);
      graph.remove();
    }
  });

  it.each([
    [0, 0],
    [2, 1],
    [3, 4],
  ])('keeps long-press removal within the drag slop (%s, %s)', async (dx, dy) => {
    vi.useFakeTimers();
    const { graph, svg, hit, move, drop, focus } = await makeGraph();
    const remove = vi.fn();
    graph.addEventListener('point-remove', remove);
    hit.dispatchEvent(pointer('pointerdown', { pointerType: 'touch' }));
    svg.dispatchEvent(
      pointer('pointermove', {
        pointerType: 'touch',
        clientX: toSvgX(50) + dx,
        clientY: toSvgY(75) + dy,
      })
    );
    vi.advanceTimersByTime(499);
    expect(remove).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(remove).toHaveBeenCalledOnce();
    svg.dispatchEvent(pointer('pointerup', { pointerType: 'touch' }));
    expect(move).not.toHaveBeenCalled();
    expect(drop).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });

  it.each(['drag', 'cancel'])('cancels long-press removal on %s after jitter', async (end) => {
    vi.useFakeTimers();
    const { graph, svg, hit, move, drop } = await makeGraph();
    const remove = vi.fn();
    graph.addEventListener('point-remove', remove);
    hit.dispatchEvent(pointer('pointerdown', { pointerType: 'touch' }));
    svg.dispatchEvent(
      pointer('pointermove', {
        pointerType: 'touch',
        clientX: toSvgX(50) + 3,
        clientY: toSvgY(75) + 4,
      })
    );
    if (end === 'drag')
      svg.dispatchEvent(pointer('pointermove', { pointerType: 'touch', clientY: toSvgY(75) - 6 }));
    else svg.dispatchEvent(pointer('pointercancel', { pointerType: 'touch' }));
    vi.advanceTimersByTime(600);
    expect(remove).not.toHaveBeenCalled();
    expect(move).toHaveBeenCalledTimes(end === 'drag' ? 1 : 0);
    svg.dispatchEvent(pointer('pointerup', { pointerType: 'touch' }));
    expect(drop).toHaveBeenCalledTimes(end === 'drag' ? 1 : 0);
  });

  it('suppresses double-click only after deliberate dragging', async () => {
    vi.useFakeTimers();
    const { graph, svg, hit } = await makeGraph();
    const add = vi.fn();
    graph.addEventListener('point-add', add);
    hit.dispatchEvent(pointer('pointerdown'));
    svg.dispatchEvent(pointer('pointerup'));
    svg.dispatchEvent(
      new MouseEvent('dblclick', { clientX: toSvgX(25), clientY: toSvgY(25), bubbles: true })
    );
    expect(add).toHaveBeenCalledOnce();
    hit.dispatchEvent(pointer('pointerdown'));
    svg.dispatchEvent(pointer('pointermove', { clientY: toSvgY(75) - 12 }));
    svg.dispatchEvent(pointer('pointerup'));
    svg.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(add).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(400);
    svg.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(add).toHaveBeenCalledTimes(2);
  });
});

describe('graph axis label sizing', () => {
  it('opts into the room title inside reserved bottom padding', async () => {
    const { graph } = await makeGraph();
    expect(graph.shadowRoot!.querySelector('.x-axis-label')).toBeNull();
    graph.showXAxisLabel = true;
    await graph.updateComplete;
    const label = graph.shadowRoot!.querySelector('.x-axis-label')!;
    expect(label.textContent).toBe(UI.scrubber.title);
    expect(Number(label.getAttribute('y'))).toBeGreaterThan(VB_H - PAD_BOTTOM);
    expect(Number(label.getAttribute('y'))).toBeLessThan(VB_H);
    expect(graph.shadowRoot!.querySelector('svg')!.getAttribute('viewBox')).toBe(
      `0 0 ${VB_W} ${VB_H}`
    );
  });

  it('caps only enlarged axis text and disconnects its scale observer', async () => {
    let resized: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resized = callback;
        }
        observe = observe;
        disconnect = disconnect;
      }
    );
    const { graph, svg } = await makeGraph();
    expect(observe).toHaveBeenCalledWith(svg);
    const box = vi.spyOn(svg, 'getBoundingClientRect');
    box.mockReturnValue({ width: VB_W * 2, height: VB_H * 2 } as DOMRect);
    resized!([], {} as ResizeObserver);
    await graph.updateComplete;
    expect(Number(svg.style.getPropertyValue('--graph-label-scale'))).toBeCloseTo(
      DEFAULT_GRAPH_MAX_HEIGHT / VB_H / 2
    );
    // Native sizing keeps the original text-to-marker proportions.
    const nativeScale = DEFAULT_GRAPH_MAX_HEIGHT / VB_H;
    box.mockReturnValue({
      width: VB_W * nativeScale,
      height: DEFAULT_GRAPH_MAX_HEIGHT,
    } as DOMRect);
    resized!([], {} as ResizeObserver);
    await graph.updateComplete;
    expect(svg.style.getPropertyValue('--graph-label-scale')).toBe('1');
    const marker = graph.shadowRoot!.querySelector<SVGCircleElement>('.control-point')!;
    expect(Number(marker.getAttribute('r')) * 2 * nativeScale).toBeLessThanOrEqual(16);
    // Width alone does not reflect a height-capped, letterboxed SVG.
    box.mockReturnValue({ width: VB_W * 3, height: VB_H } as DOMRect);
    resized!([], {} as ResizeObserver);
    await graph.updateComplete;
    expect(svg.style.getPropertyValue('--graph-label-scale')).toBe('1');
    box.mockReturnValue({ width: VB_W / 2, height: VB_H / 2 } as DOMRect);
    resized!([], {} as ResizeObserver);
    await graph.updateComplete;
    expect(svg.style.getPropertyValue('--graph-label-scale')).toBe('1');
    graph.remove();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
