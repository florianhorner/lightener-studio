// @vitest-environment jsdom

import { CURVE_PRESETS } from '../utils/presets.js';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurveGraph } from './curve-graph.js';
import {
  DEFAULT_GRAPH_MAX_HEIGHT,
  PAD_BOTTOM,
  PAD_LEFT,
  PAD_RIGHT,
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
    // A last point short of full room brightness stays removable; 100% clamps ArrowUp.
    graph.curves = [
      {
        ...graph.curves[0],
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 50, target: 75 },
          { lightener: 90, target: 100 },
        ],
      },
    ];
    await graph.updateComplete;
    const last = graph.renderRoot.querySelector<SVGCircleElement>('[data-point="2"]')!;
    last.dispatchEvent(pointer('pointerdown', { clientX: toSvgX(90), clientY: toSvgY(100) }));
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    vi.advanceTimersByTime(500);
    expect(remove).toHaveBeenCalledOnce();
    svg.dispatchEvent(pointer('pointerup', { clientX: toSvgX(90), clientY: toSvgY(100) }));
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
      lightener: 97,
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

  it('widens the plot past its height cap and maps ticks onto it', async () => {
    let resized: ResizeObserverCallback | undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resized = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );
    const { graph, svg } = await makeGraph();
    graph.showXAxisLabel = true;
    const realStyle = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) =>
      el === svg ? ({ maxHeight: '520px' } as CSSStyleDeclaration) : realStyle(el, pseudo)
    );
    const plotResize = vi.fn();
    graph.addEventListener('plot-resize', plotResize);
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      width: 1560,
      height: 520,
    } as DOMRect);
    resized!([], {} as ResizeObserver);
    await graph.updateComplete;
    await graph.updateComplete;
    const plotW = 1560 * (VB_H / 520) - PAD_LEFT - PAD_RIGHT;
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${PAD_LEFT + plotW + PAD_RIGHT} ${VB_H}`);
    expect(
      Number(graph.shadowRoot!.querySelector('.plot-frame')!.getAttribute('width'))
    ).toBeCloseTo(plotW);
    // Labels keep their native size: the vertical scale did not change.
    expect(Number(svg.style.getPropertyValue('--graph-label-scale'))).toBeCloseTo(
      DEFAULT_GRAPH_MAX_HEIGHT / 520
    );
    expect(plotResize).toHaveBeenCalledOnce();
    const tick = [...graph.shadowRoot!.querySelectorAll('.tick-label')].find(
      (t) => t.textContent === '75%' && t.getAttribute('text-anchor') === 'middle'
    );
    expect(Number(tick?.getAttribute('x'))).toBeCloseTo(PAD_LEFT + plotW * 0.75);
    // X labels stay at their native distance under the axis, not the grown padding.
    const labelScale = DEFAULT_GRAPH_MAX_HEIGHT / 520;
    expect(Number(tick?.getAttribute('y'))).toBeCloseTo(toSvgY(0) + 16 * labelScale);
    expect(Number(graph.shadowRoot!.querySelector('.x-axis-label')?.getAttribute('y'))).toBeCloseTo(
      toSvgY(0) + 32 * labelScale
    );
  });
});

describe('point reach keeps the starting shapes intact', () => {
  it.each(CURVE_PRESETS.map((preset) => [preset.id, preset] as const))(
    '%s keeps its 1%% anchor on vertical keys and returns to it from the right',
    async (_id, preset) => {
      const graph = document.createElement('curve-graph') as CurveGraph;
      graph.curves = [
        {
          entityId: 'light.alpha',
          friendlyName: 'Alpha',
          controlPoints: preset.controlPoints.map((p) => ({ ...p })),
          color: '#2563eb',
          visible: true,
        },
      ];
      // Apply each move as the card would, so the next key reads the new point.
      const moves: Array<{ lightener: number; target: number }> = [];
      graph.addEventListener('point-move', (e) => {
        const { pointIndex, lightener, target } = (e as CustomEvent).detail;
        moves.push({ lightener, target });
        const controlPoints = [...graph.curves[0].controlPoints];
        controlPoints[pointIndex] = { lightener, target };
        graph.curves = [{ ...graph.curves[0], controlPoints }];
      });
      document.body.append(graph);
      await graph.updateComplete;
      const hit = () =>
        graph.shadowRoot!.querySelector<SVGCircleElement>('.hit-circle[data-point="1"]')!;
      expect(graph.curves[0].controlPoints[1].lightener).toBe(1);
      hit().dispatchEvent(new FocusEvent('focus'));
      for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft']) {
        hit().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        await graph.updateComplete;
      }
      expect(moves.map((move) => move.lightener)).toEqual([1, 1, 1, 2, 1]);
      graph.remove();
    }
  );
});

describe('point reach and hero point visuals', () => {
  async function mount(readOnly = false) {
    const graph = document.createElement('curve-graph') as CurveGraph;
    graph.readOnly = readOnly;
    graph.curves = [
      {
        entityId: 'light.alpha',
        friendlyName: 'Alpha',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 40, target: 60 },
          { lightener: 100, target: 100 },
        ],
        color: '#2563eb',
        visible: true,
      },
    ];
    document.body.append(graph);
    await graph.updateComplete;
    const hit = (point: number) =>
      graph.shadowRoot!.querySelector<SVGCircleElement>(`.hit-circle[data-point="${point}"]`)!;
    return { graph, hit };
  }

  it('shows no reach until a point is focused, then dims outside it and marks the x-axis', async () => {
    const { graph, hit } = await mount();
    expect(graph.shadowRoot!.querySelector('.reach-dim')).toBeNull();
    expect(graph.shadowRoot!.querySelector('.reach-bar')).toBeNull();
    hit(1).dispatchEvent(new FocusEvent('focus'));
    await graph.updateComplete;
    const dim = graph.shadowRoot!.querySelector('.reach-dim')!;
    expect(dim.getAttribute('opacity')).toBe('0.28');
    expect(dim.getAttribute('pointer-events')).toBe('none');
    const bar = graph.shadowRoot!.querySelector('.reach-bar')!;
    expect(Number(bar.getAttribute('x'))).toBeCloseTo(toSvgX(3));
    expect(Number(bar.getAttribute('width'))).toBeCloseTo(toSvgX(97) - toSvgX(3));
    // The axes draw above the dim so they stay visible.
    const svg = graph.shadowRoot!.querySelector('svg')!;
    const order = [...svg.querySelectorAll('.reach-dim, .axis-line, .reach-bar')].map((el) =>
      el.getAttribute('class')
    );
    expect(order[0]).toBe('reach-dim');
    expect(order.at(-1)).toBe('reach-bar');
  });

  it('shows no reach for the first point or a read-only graph', async () => {
    const { graph, hit } = await mount();
    hit(0).dispatchEvent(new FocusEvent('focus'));
    await graph.updateComplete;
    expect(graph.shadowRoot!.querySelector('.reach-dim')).toBeNull();
    graph.remove();
    const readOnly = await mount(true);
    expect(readOnly.graph.shadowRoot!.querySelector('.hit-circle')).toBeNull();
    expect(readOnly.graph.shadowRoot!.querySelector('.reach-dim')).toBeNull();
  });

  it('rings the last point touched and keeps it after blur until another point is touched', async () => {
    const { graph, hit } = await mount();
    expect(graph.shadowRoot!.querySelector('.hero-ring')).toBeNull();
    hit(1).dispatchEvent(new FocusEvent('focus'));
    await graph.updateComplete;
    const ring = () => graph.shadowRoot!.querySelector('.hero-ring');
    expect(Number(ring()!.getAttribute('cx'))).toBeCloseTo(toSvgX(40));
    hit(1).dispatchEvent(new FocusEvent('blur'));
    await graph.updateComplete;
    expect(Number(ring()!.getAttribute('cx'))).toBeCloseTo(toSvgX(40));
    hit(2).dispatchEvent(new FocusEvent('focus'));
    await graph.updateComplete;
    expect(graph.shadowRoot!.querySelectorAll('.hero-ring')).toHaveLength(1);
    expect(Number(ring()!.getAttribute('cx'))).toBeCloseTo(toSvgX(100));
  });

  it('drops the ring when the point count changes under it', async () => {
    const { graph, hit } = await mount();
    hit(1).dispatchEvent(new FocusEvent('focus'));
    hit(1).dispatchEvent(new FocusEvent('blur'));
    await graph.updateComplete;
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
    expect(graph.shadowRoot!.querySelector('.hero-ring')).toBeNull();
  });
});

describe('end points hold at full room brightness', () => {
  async function mountEnd(last: number) {
    const graph = document.createElement('curve-graph') as CurveGraph;
    graph.curves = [
      {
        entityId: 'light.alpha',
        friendlyName: 'Alpha',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 40, target: 60 },
          { lightener: last, target: 80 },
        ],
        color: '#2563eb',
        visible: true,
      },
    ];
    const moves: Array<{ lightener: number; target: number }> = [];
    const removes: unknown[] = [];
    const drops: unknown[] = [];
    // Apply each move as the card would, so the next gesture step reads the new point.
    graph.addEventListener('point-move', (e) => {
      const { pointIndex, lightener, target } = (e as CustomEvent).detail;
      moves.push({ lightener, target });
      const controlPoints = [...graph.curves[0].controlPoints];
      controlPoints[pointIndex] = { lightener, target };
      graph.curves = [{ ...graph.curves[0], controlPoints }];
    });
    graph.addEventListener('point-remove', (e) => removes.push((e as CustomEvent).detail));
    graph.addEventListener('point-drop', (e) => drops.push((e as CustomEvent).detail));
    document.body.append(graph);
    await graph.updateComplete;
    const svg = graph.shadowRoot!.querySelector('svg')!;
    const captures = new Set<number>();
    svg.setPointerCapture = vi.fn((id) => captures.add(id));
    svg.hasPointerCapture = vi.fn((id) => captures.has(id));
    svg.releasePointerCapture = vi.fn((id) => captures.delete(id));
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
    const hit = (point: number) =>
      graph.shadowRoot!.querySelector<SVGCircleElement>(`.hit-circle[data-point="${point}"]`)!;
    const key = async (point: number, k: string, init: KeyboardEventInit = {}) => {
      hit(point).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
      await graph.updateComplete;
    };
    return { graph, svg, hit, key, moves, removes, drops };
  }

  const at = (x: number, y: number) => ({ clientX: toSvgX(x), clientY: toSvgY(y) });

  it('moves a last point already at 100 only vertically', async () => {
    const { graph, svg, hit, moves, removes } = await mountEnd(100);
    hit(2).dispatchEvent(pointer('pointerdown', at(100, 80)));
    svg.dispatchEvent(pointer('pointermove', at(60, 30)));
    svg.dispatchEvent(pointer('pointermove', at(20, 55)));
    svg.dispatchEvent(pointer('pointerup', at(20, 55)));
    expect(moves).toEqual([
      { lightener: 100, target: 30 },
      { lightener: 100, target: 55 },
    ]);
    expect(removes).toEqual([]);
    await graph.updateComplete;
    expect(graph.curves[0].controlPoints[2]).toEqual({ lightener: 100, target: 55 });
  });

  it('lets a gesture that reaches 100 take the point back until it is released', async () => {
    const { graph, svg, hit, moves } = await mountEnd(90);
    hit(2).dispatchEvent(pointer('pointerdown', at(90, 80)));
    svg.dispatchEvent(pointer('pointermove', at(100, 80)));
    await graph.updateComplete;
    svg.dispatchEvent(pointer('pointermove', at(80, 80)));
    expect(moves.map((move) => move.lightener)).toEqual([100, 80]);
    svg.dispatchEvent(pointer('pointerup', at(80, 80)));
    await graph.updateComplete;
    // Released short of 100, it is an ordinary last point again.
    expect(graph.curves[0].controlPoints[2].lightener).toBe(80);
  });

  it('holds a point released at 100 for its next gesture', async () => {
    const { graph, svg, hit, moves } = await mountEnd(90);
    hit(2).dispatchEvent(pointer('pointerdown', at(90, 80)));
    svg.dispatchEvent(pointer('pointermove', at(100, 80)));
    svg.dispatchEvent(pointer('pointerup', at(100, 80)));
    await graph.updateComplete;
    expect(hit(2).getAttribute('aria-label')).toContain('Cannot be moved horizontally');
    moves.length = 0;
    hit(2).dispatchEvent(pointer('pointerdown', { pointerId: 2, ...at(100, 80) }));
    svg.dispatchEvent(pointer('pointermove', { pointerId: 2, ...at(70, 60) }));
    expect(moves).toEqual([{ lightener: 100, target: 60 }]);
  });

  it('moves a last point below 100 across its full reach', async () => {
    const { svg, hit, moves } = await mountEnd(90);
    hit(2).dispatchEvent(pointer('pointerdown', at(90, 80)));
    svg.dispatchEvent(pointer('pointermove', at(60, 80)));
    svg.dispatchEvent(pointer('pointermove', at(10, 80)));
    expect(moves.map((move) => move.lightener)).toEqual([60, 43]);
  });

  it('keeps interior points and the 3% neighbour gap', async () => {
    const { svg, hit, moves } = await mountEnd(100);
    hit(1).dispatchEvent(pointer('pointerdown', at(40, 60)));
    svg.dispatchEvent(pointer('pointermove', at(99, 60)));
    svg.dispatchEvent(pointer('pointermove', at(1, 60)));
    expect(moves.map((move) => move.lightener)).toEqual([97, 3]);
  });

  it('ends a vertical drag of the held point on pointercancel without removing it', async () => {
    vi.useFakeTimers();
    const { graph, svg, hit, moves, removes, drops } = await mountEnd(100);
    hit(2).dispatchEvent(pointer('pointerdown', at(100, 80)));
    svg.dispatchEvent(pointer('pointermove', at(100, 40)));
    svg.dispatchEvent(pointer('pointercancel'));
    await vi.advanceTimersByTimeAsync(700);
    expect(moves).toEqual([{ lightener: 100, target: 40 }]);
    expect(drops).toHaveLength(1);
    expect(removes).toEqual([]);
    expect(graph.interactionActive).toBe(false);
  });

  it.each([' ', 'Delete', 'Backspace'])(
    'refuses %j on a last point at 100 and keeps focus there',
    async (k) => {
      const { graph, hit, key, removes } = await mountEnd(100);
      hit(2).focus();
      await key(2, k);
      expect(removes).toEqual([]);
      expect(graph.shadowRoot!.activeElement).toBe(hit(2));
    }
  );

  it('refuses a long press and the context menu on a last point at 100', async () => {
    vi.useFakeTimers();
    const { hit, removes } = await mountEnd(100);
    hit(2).dispatchEvent(pointer('pointerdown', at(100, 80)));
    await vi.advanceTimersByTimeAsync(700);
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    hit(2).dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
    expect(removes).toEqual([]);
  });

  it('still removes a last point below 100 by long press, context menu and Space', async () => {
    vi.useFakeTimers();
    const { hit, key, removes } = await mountEnd(90);
    hit(2).dispatchEvent(pointer('pointerdown', at(90, 80)));
    await vi.advanceTimersByTimeAsync(700);
    expect(removes).toHaveLength(1);
    hit(2).dispatchEvent(pointer('pointerup'));
    hit(2).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(removes).toHaveLength(2);
    await key(2, ' ');
    expect(removes).toHaveLength(3);
  });

  it('moves a held last point only with Arrow Up/Down', async () => {
    const { hit, key, moves } = await mountEnd(100);
    hit(2).dispatchEvent(new FocusEvent('focus'));
    await key(2, 'ArrowLeft');
    await key(2, 'ArrowRight');
    expect(moves).toEqual([]);
    await key(2, 'ArrowDown');
    expect(moves).toEqual([{ lightener: 100, target: 79 }]);
  });

  it('lets keyboard focus that reaches 100 step back, then holds it after refocus', async () => {
    const { graph, hit, key, moves, removes } = await mountEnd(90);
    hit(2).dispatchEvent(new FocusEvent('focus'));
    await key(2, 'ArrowRight', { shiftKey: true });
    expect(moves).toEqual([{ lightener: 100, target: 80 }]);
    // Reached in this focus: it may go back, but Space still cannot remove it.
    const label = hit(2).getAttribute('aria-label')!;
    expect(label).toContain('Arrow keys move, Enter adds a nearby point.');
    expect(label).not.toContain('Space removes');
    expect(label).not.toContain('Cannot be moved horizontally');
    await key(2, ' ');
    expect(removes).toEqual([]);
    await key(2, 'ArrowLeft');
    expect(moves.at(-1)).toEqual({ lightener: 99, target: 80 });
    expect(hit(2).getAttribute('aria-label')).toContain('Space removes');

    await key(2, 'ArrowRight', { shiftKey: true });
    expect(moves.at(-1)).toEqual({ lightener: 100, target: 80 });
    hit(2).dispatchEvent(new FocusEvent('blur'));
    await graph.updateComplete;
    expect(hit(2).getAttribute('aria-label')).toContain('Cannot be moved horizontally');
    hit(2).dispatchEvent(new FocusEvent('focus'));
    const count = moves.length;
    await key(2, 'ArrowLeft');
    expect(moves).toHaveLength(count);
  });

  it('describes only the actions each point has', async () => {
    const full = await mountEnd(100);
    expect(full.hit(0).getAttribute('aria-label')).toContain('Cannot be moved horizontally');
    expect(full.hit(1).getAttribute('aria-label')).toContain('Space removes');
    const heldLabel = full.hit(2).getAttribute('aria-label')!;
    expect(heldLabel).toContain('Cannot be moved horizontally');
    expect(heldLabel).not.toContain('Space removes');
    full.graph.remove();
    const below = await mountEnd(90);
    expect(below.hit(2).getAttribute('aria-label')).toContain('Space removes');
  });

  it('shows no reach for a held last point but still shows it below 100', async () => {
    const full = await mountEnd(100);
    full.hit(2).dispatchEvent(new FocusEvent('focus'));
    await full.graph.updateComplete;
    expect(full.graph.shadowRoot!.querySelector('.reach-dim')).toBeNull();
    expect(full.graph.shadowRoot!.querySelector('.reach-bar')).toBeNull();
    full.graph.remove();
    const below = await mountEnd(90);
    below.hit(2).dispatchEvent(new FocusEvent('focus'));
    await below.graph.updateComplete;
    expect(below.graph.shadowRoot!.querySelector('.reach-dim')).not.toBeNull();
  });
});

describe('drag readouts', () => {
  it('reads light brightness on a y-axis pill and dims harder while a point is dragged', async () => {
    const { graph, svg, hit, move } = await makeGraph();
    expect(graph.shadowRoot!.querySelector('.y-pill')).toBeNull();
    hit.dispatchEvent(pointer('pointerdown'));
    svg.dispatchEvent(pointer('pointermove', { clientY: toSvgY(75) - 20 }));
    expect(move).toHaveBeenCalled();
    const { target } = move.mock.calls.at(-1)![0].detail;
    graph.curves = [
      {
        ...graph.curves[0],
        controlPoints: graph.curves[0].controlPoints.map((p, i) =>
          i === 1 ? { lightener: 50, target } : p
        ),
      },
    ];
    await graph.updateComplete;
    const pill = graph.shadowRoot!.querySelector('.y-pill')!;
    expect(pill.textContent?.trim()).toBe(`${target}%`);
    expect(Number(pill.querySelector('text')!.getAttribute('y'))).toBeCloseTo(toSvgY(target));
    expect(graph.shadowRoot!.querySelector('.reach-dim')!.getAttribute('opacity')).toBe('0.45');
    svg.dispatchEvent(pointer('pointerup'));
    await graph.updateComplete;
    expect(graph.shadowRoot!.querySelector('.y-pill')).toBeNull();
  });
});
