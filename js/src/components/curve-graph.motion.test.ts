// @vitest-environment jsdom

/**
 * Joy moments inside the graph. Settle: a released point's marker overshoots
 * 2 SVG units in the direction its brightness changed and is back at rest
 * 250ms after release, while the data, the path, the hit circle and the
 * tooltip stay where the point really is.
 *
 * Frames are stepped by hand: requestAnimationFrame and performance.now are
 * stubbed, so every assertion lands on an exact millisecond.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurveGraph } from './curve-graph.js';
import type { LightCurve } from '../utils/types.js';
import { LEGEND_SHAPES, easeOutCubic, toSvgX, toSvgY } from '../utils/graph-math.js';
import {
  applyPresetToCurves,
  movePointOnCurves,
  removePointEdit,
} from '../utils/edit-operations.js';
import { CURVE_PRESETS } from '../utils/presets.js';
import { JOY_DEFAULTS, REDUCED_MOTION_QUERY, resolveJoyFlags } from '../utils/motion.js';

let reducedMotion = false;

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query === REDUCED_MOTION_QUERY ? reducedMotion : false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
});

type GraphInternals = {
  _settle: { curve: number; point: number; dy: number } | null;
};

let now = 0;
let nextHandle = 1;
let queued = new Map<number, FrameRequestCallback>();
let requested = 0;
let cancelled = 0;

beforeEach(() => {
  document.body.replaceChildren();
  reducedMotion = false;
  now = 1000;
  nextHandle = 1;
  queued = new Map();
  requested = 0;
  cancelled = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    requested++;
    const handle = nextHandle++;
    queued.set(handle, callback);
    return handle;
  });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
    cancelled++;
    queued.delete(handle);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function advance(graph: CurveGraph, ms: number): Promise<void> {
  now += ms;
  const callbacks = [...queued.values()];
  queued.clear();
  for (const callback of callbacks) callback(now);
  await graph.updateComplete;
}

function curve(index: number, points: Array<[number, number]>): LightCurve {
  return {
    entityId: `light.l${index}`,
    friendlyName: `Light ${index}`,
    controlPoints: points.map(([lightener, target]) => ({ lightener, target })),
    visible: true,
    color: '#2563eb',
  };
}

const POINTS: Array<[number, number]> = [
  [0, 0],
  [50, 50],
  [100, 100],
];

/**
 * A graph whose SVG maps client coordinates 1:1 to SVG units, with a parent
 * stand-in that applies each point-move the way the card does.
 */
async function makeGraph(
  options: { curves?: LightCurve[]; joy?: unknown; selectOnMove?: boolean } = {}
): Promise<CurveGraph> {
  const graph = document.createElement('curve-graph') as CurveGraph;
  graph.curves = options.curves ?? [curve(0, POINTS)];
  graph.joy = resolveJoyFlags(options.joy ?? { settle: true });
  graph.addEventListener('point-move', ((event: CustomEvent) => {
    const { curveIndex, pointIndex, lightener, target } = event.detail;
    const next = movePointOnCurves(graph.curves, curveIndex, pointIndex, lightener, target);
    if (next) graph.curves = next;
    if (options.selectOnMove) graph.selectedCurveId = graph.curves[curveIndex].entityId;
  }) as EventListener);
  graph.addEventListener('point-remove', ((event: CustomEvent) => {
    const { curveIndex, pointIndex } = event.detail;
    const next = removePointEdit(graph.curves, curveIndex, pointIndex);
    if (next) graph.curves = next;
  }) as EventListener);
  document.body.appendChild(graph);
  await graph.updateComplete;

  const svg = graph.shadowRoot!.querySelector('svg')!;
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
  (svg as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = vi.fn();
  return graph;
}

function svgOf(graph: CurveGraph): SVGSVGElement {
  return graph.shadowRoot!.querySelector('svg')!;
}

function hitCircle(graph: CurveGraph, ci: number, pi: number): SVGCircleElement {
  return graph.shadowRoot!.querySelector<SVGCircleElement>(
    `.hit-circle[data-curve="${ci}"][data-point="${pi}"]`
  )!;
}

/** The visible marker drawn right after a point's hit circle. */
function marker(graph: CurveGraph, ci: number, pi: number): Element {
  return hitCircle(graph, ci, pi).nextElementSibling!;
}

/** A y value that moves exactly with the marker's centre, for every shape. */
function markerY(el: Element): number {
  const num = (name: string) => Number(el.getAttribute(name));
  if (el.tagName === 'circle') return num('cy');
  if (el.tagName === 'rect') return num('y') + num('height') / 2;
  const ys = (el.getAttribute('points') ?? '')
    .trim()
    .split(/\s+/)
    .map((pair) => Number(pair.split(',')[1]));
  return ys.reduce((sum, y) => sum + y, 0) / ys.length;
}

function pointer(type: string, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    composed: true,
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    ...init,
  });
}

/** Dispatch a pointer event on the graph's SVG and let the graph re-render. */
async function fire(graph: CurveGraph, type: string, init: PointerEventInit = {}): Promise<void> {
  svgOf(graph).dispatchEvent(pointer(type, init));
  await graph.updateComplete;
}

/** Move the pointer that is already down to (lightener, target). */
function moveTo(graph: CurveGraph, lightener: number, target: number): Promise<void> {
  return fire(graph, 'pointermove', { clientX: toSvgX(lightener), clientY: toSvgY(target) });
}

/** Press a point, move it to `target`, and leave the pointer down. */
async function press(graph: CurveGraph, ci: number, pi: number, target: number): Promise<void> {
  hitCircle(graph, ci, pi).dispatchEvent(pointer('pointerdown'));
  await moveTo(graph, graph.curves[ci].controlPoints[pi].lightener, target);
}

/** Drag a point to `target` and release it. */
async function drag(graph: CurveGraph, ci: number, pi: number, target: number): Promise<void> {
  await press(graph, ci, pi, target);
  await fire(graph, 'pointerup');
}

/** A graph mid-settle: point 1 dragged from 50 to 70 and released 35ms ago. */
async function midSettle(): Promise<CurveGraph> {
  const graph = await makeGraph();
  await drag(graph, 0, 1, 70);
  await advance(graph, 35);
  return graph;
}

const settleState = (graph: CurveGraph) => (graph as unknown as GraphInternals)._settle;

describe('settle: the released point overshoots and settles', () => {
  it('overshoots 2 units up after an upward drag and is at rest by 250ms', async () => {
    const graph = await makeGraph();
    await drag(graph, 0, 1, 70);
    const rest = toSvgY(70);

    await advance(graph, 35);
    expect(markerY(marker(graph, 0, 1)) - rest).toBeCloseTo(-2 * easeOutCubic(0.5), 6);
    await advance(graph, 35);
    expect(markerY(marker(graph, 0, 1)) - rest).toBeCloseTo(-2, 6);
    await advance(graph, 90);
    expect(markerY(marker(graph, 0, 1)) - rest).toBeCloseTo(-2 * (1 - easeOutCubic(0.5)), 6);
    await advance(graph, 90);
    expect(markerY(marker(graph, 0, 1))).toBeCloseTo(rest, 6);
    expect(settleState(graph)).toBeNull();
    expect(queued.size).toBe(0);
  });

  it('overshoots down after a downward drag', async () => {
    const graph = await makeGraph();
    await drag(graph, 0, 1, 20);
    await advance(graph, 70);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(20)).toBeCloseTo(2, 6);
  });

  it('settles a touch drag whose pointer id is not 1', async () => {
    const graph = await makeGraph();
    const touch = { pointerId: 7, pointerType: 'touch' } as const;
    hitCircle(graph, 0, 1).dispatchEvent(pointer('pointerdown', touch));
    await fire(graph, 'pointermove', { ...touch, clientX: toSvgX(50), clientY: toSvgY(70) });
    await fire(graph, 'pointerup', touch);
    await advance(graph, 70);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(70)).toBeCloseTo(-2, 6);
  });

  it('settles in the direction of the net change, not the last move', async () => {
    const graph = await makeGraph();
    await press(graph, 0, 1, 90);
    await moveTo(graph, 50, 60); // back down, but still a net rise from 50
    await fire(graph, 'pointerup');
    await advance(graph, 70);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(60)).toBeCloseTo(-2, 6);
  });

  it('moves every marker shape, not just circles', async () => {
    const curves = LEGEND_SHAPES.map((_, index) => curve(index, POINTS));
    const graph = await makeGraph({ curves });
    let rotated = 0;
    for (let ci = 0; ci < curves.length; ci++) {
      await drag(graph, ci, 1, 70);
      await advance(graph, 70);
      const settling = marker(graph, ci, 1);
      const overshoot = markerY(settling);
      // The diamond is a square turned about its centre, so the pivot moves too.
      const pivot = /rotate\(45 \S+ (\S+)\)/.exec(settling.getAttribute('transform') ?? '');
      if (pivot) {
        rotated++;
        expect(Number(pivot[1]), `curve ${ci} turns about its centre`).toBeCloseTo(overshoot, 6);
      }
      await advance(graph, 200);
      const rest = markerY(marker(graph, ci, 1));
      expect(overshoot - rest, `curve ${ci}`).toBeCloseTo(-2, 6);
    }
    expect(rotated, 'the diamond was checked').toBe(1);
  });

  it('moves only the marker: the path, the hit circle and the tooltip stay put', async () => {
    const graph = await makeGraph();
    await drag(graph, 0, 1, 70);
    hitCircle(graph, 0, 1).dispatchEvent(pointer('pointerenter'));
    await graph.updateComplete;
    const restPath = graph.shadowRoot!.querySelector('.curve-line')!.getAttribute('d');
    const restTooltip = graph.shadowRoot!.querySelector('.tooltip-bg')!.getAttribute('y');

    await advance(graph, 70);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(70)).toBeCloseTo(-2, 6);
    expect(graph.shadowRoot!.querySelector('.curve-line')!.getAttribute('d')).toBe(restPath);
    expect(Number(hitCircle(graph, 0, 1).getAttribute('cy'))).toBeCloseTo(toSvgY(70), 6);
    expect(graph.shadowRoot!.querySelector('.tooltip-bg')!.getAttribute('y')).toBe(restTooltip);
    expect(graph.curves[0].controlPoints[1]).toEqual({ lightener: 50, target: 70 });
  });

  it('settles the right marker when the drag selects the light and re-orders rendering', async () => {
    // No light selected, so both lights' points are live. Dragging the first
    // light selects it, which moves it from the first to the last render slot:
    // its array index (0) and its render position (1) now differ.
    const curves = [curve(0, POINTS), curve(1, POINTS)];
    const graph = await makeGraph({ curves, selectOnMove: true });

    await drag(graph, 0, 1, 70);
    expect(graph.selectedCurveId).toBe('light.l0');
    const renderOrder = Array.from(graph.shadowRoot!.querySelectorAll('.curve-line'), (line) =>
      line.getAttribute('stroke-dasharray')
    );
    expect(renderOrder.at(-1), 'the selected light is drawn last, without a dash').toBe('');
    await advance(graph, 70);

    expect(settleState(graph)).toMatchObject({ curve: 0, point: 1 });
    expect(markerY(marker(graph, 0, 1)) - toSvgY(70)).toBeCloseTo(-2, 6);
  });

  it('leaves every other marker at rest while one settles', async () => {
    const graph = await makeGraph({ curves: [curve(0, POINTS), curve(1, POINTS)] });
    const others: Array<[number, number]> = [
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ];
    const rest = others.map(([c, p]) => markerY(marker(graph, c, p)));
    await drag(graph, 0, 1, 70);
    await advance(graph, 70);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(70)).toBeCloseTo(-2, 6);
    others.forEach(([c, p], i) =>
      expect(markerY(marker(graph, c, p)), `curve ${c} point ${p}`).toBeCloseTo(rest[i], 6)
    );
  });

  it('keeps running when the flags change but settle stays on', async () => {
    const graph = await midSettle();
    graph.joy = resolveJoyFlags({ settle: true });
    await graph.updateComplete;
    await advance(graph, 35);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(70)).toBeCloseTo(-2, 6);
  });
});

describe('settle: when it does not run', () => {
  it('stays off without the flag', async () => {
    const graph = await makeGraph({ joy: {} });
    await drag(graph, 0, 1, 70);
    expect(requested).toBe(0);
    expect(markerY(marker(graph, 0, 1))).toBeCloseTo(toSvgY(70), 6);
  });

  it('stays off with reduced motion', async () => {
    reducedMotion = true;
    const graph = await makeGraph();
    await drag(graph, 0, 1, 70);
    expect(requested).toBe(0);
    await advance(graph, 70);
    expect(markerY(marker(graph, 0, 1))).toBeCloseTo(toSvgY(70), 6);
  });

  it('is off on a graph that was never given flags', () => {
    expect(new CurveGraph().joy).toEqual(JOY_DEFAULTS);
  });

  it('does nothing when the release leaves the point where it started', async () => {
    const graph = await makeGraph();
    await drag(graph, 0, 1, 50);
    expect(requested).toBe(0);
  });

  it('does nothing after a round trip back to the start', async () => {
    const graph = await makeGraph();
    await press(graph, 0, 1, 80);
    await moveTo(graph, 50, 50);
    await fire(graph, 'pointerup');
    expect(requested).toBe(0);
  });

  it.each<[string, string, PointerEventInit]>([
    ['another pointer lifts during the drag', 'pointerup', { pointerId: 2, pointerType: 'touch' }],
    ['the gesture is cancelled', 'pointercancel', {}],
    ['pointer capture is lost mid-drag', 'lostpointercapture', {}],
  ])('does not settle when %s', async (_label, type, init) => {
    const graph = await makeGraph();
    await press(graph, 0, 1, 70);
    await fire(graph, type, init);
    expect(requested).toBe(0);
    expect(markerY(marker(graph, 0, 1))).toBeCloseTo(toSvgY(70), 6);
  });

  it('does not restart when lostpointercapture follows the release', async () => {
    const graph = await makeGraph();
    const drops: unknown[] = [];
    graph.addEventListener('point-drop', (event) => drops.push(event));
    await drag(graph, 0, 1, 70);
    await fire(graph, 'lostpointercapture');
    await advance(graph, 70);
    expect(drops).toHaveLength(1);
    expect(requested).toBe(2);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(70)).toBeCloseTo(-2, 6);
  });

  it('does not settle when the released point no longer exists', async () => {
    const graph = await makeGraph();
    await press(graph, 0, 1, 70);
    graph.curves = [curve(0, [[0, 0]])];
    await graph.updateComplete;
    await fire(graph, 'pointerup');
    expect(requested).toBe(0);
  });

  it('never settles a point removed by a long press, and the next drag still settles', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const graph = await makeGraph();
    const removed: unknown[] = [];
    graph.addEventListener('point-remove', (event) => removed.push(event));
    hitCircle(graph, 0, 1).dispatchEvent(pointer('pointerdown', { pointerType: 'touch' }));
    vi.advanceTimersByTime(500);
    expect(removed, 'the long press removed the point').toHaveLength(1);
    await graph.updateComplete;
    await fire(graph, 'pointerup', { pointerType: 'touch' });
    expect(requested).toBe(0);
    expect(graph.curves[0].controlPoints).toHaveLength(2);

    // The removed point's slot is now the 100% endpoint; dragging it down to 70%
    // settles downward.
    await drag(graph, 0, 1, 70);
    await advance(graph, 70);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(70)).toBeCloseTo(2, 6);
  });
});

describe('settle: interruptions and teardown', () => {
  it('a new press anywhere on the graph ends it', async () => {
    const graph = await midSettle();
    await fire(graph, 'pointerdown');
    expect(settleState(graph)).toBeNull();
    expect(markerY(marker(graph, 0, 1))).toBeCloseTo(toSvgY(70), 6);
    expect(cancelled).toBe(1);
  });

  it('a press on the settling point starts a normal drag from where it is', async () => {
    const graph = await midSettle();
    await press(graph, 0, 1, 30);
    expect(settleState(graph)).toBeNull();
    expect(graph.curves[0].controlPoints[1]).toEqual({ lightener: 50, target: 30 });
    await fire(graph, 'pointerup');
    await advance(graph, 70);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(30)).toBeCloseTo(2, 6);
  });

  it('a press on another point puts the settling marker back at rest', async () => {
    const graph = await midSettle();
    await press(graph, 0, 2, 90);
    expect(settleState(graph)).toBeNull();
    expect(markerY(marker(graph, 0, 1))).toBeCloseTo(toSvgY(70), 6);
    expect(graph.curves[0].controlPoints[2]).toEqual({ lightener: 100, target: 90 });
  });

  it('a key press on a point ends it', async () => {
    const graph = await midSettle();
    hitCircle(graph, 0, 1).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Shift', bubbles: true, composed: true })
    );
    await graph.updateComplete;
    expect(settleState(graph)).toBeNull();
  });

  it('a shape applied mid-settle ends it, so no other point bounces', async () => {
    const graph = await makeGraph();
    await drag(graph, 0, 2, 70);
    await advance(graph, 35);
    const dimAccent = CURVE_PRESETS.find((preset) => preset.id === 'dim_accent')!;
    graph.curves = applyPresetToCurves(graph.curves, null, dimAccent.controlPoints);
    await graph.updateComplete;
    expect(settleState(graph)).toBeNull();
    expect(queued.size).toBe(0);
    expect(markerY(marker(graph, 0, 2))).toBeCloseTo(toSvgY(dimAccent.controlPoints[2].target), 6);
  });

  it.each<[string, LightCurve[]]>([
    ['its light is removed from the graph', []],
    ['its point is deleted', [curve(0, [[0, 0]])]],
    ['only its brightness changes (an undo right after release)', [curve(0, POINTS)]],
    [
      'another light lands on the same index',
      [
        {
          ...curve(0, [
            [0, 0],
            [50, 70],
            [100, 100],
          ]),
          entityId: 'light.other',
        },
      ],
    ],
    [
      'only its position on the x axis changes',
      [
        curve(0, [
          [0, 0],
          [40, 70],
          [100, 100],
        ]),
      ],
    ],
  ])('ends when %s', async (_label, curves) => {
    const graph = await midSettle();
    graph.curves = curves;
    await graph.updateComplete;
    expect(settleState(graph)).toBeNull();
    expect(queued.size).toBe(0);
  });

  it.each(['pointerdown', 'keydown'])(
    'ends even when a handler on the point stops the %s from bubbling',
    async (type) => {
      const graph = await midSettle();
      const hit = hitCircle(graph, 0, 1);
      hit.addEventListener(type, (event) => event.stopPropagation());
      hit.dispatchEvent(
        type === 'keydown'
          ? new KeyboardEvent('keydown', { key: 'Shift', bubbles: true, composed: true })
          : pointer('pointerdown')
      );
      await graph.updateComplete;
      expect(settleState(graph)).toBeNull();
    }
  );

  it('keeps running when the curves are redrawn with the released point unchanged', async () => {
    const graph = await midSettle();
    graph.curves = graph.curves.map((c) => ({ ...c }));
    await graph.updateComplete;
    await advance(graph, 35);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(70)).toBeCloseTo(-2, 6);
  });

  it('switching reduced motion on mid-settle ends it at the next frame', async () => {
    const graph = await midSettle();
    reducedMotion = true;
    await advance(graph, 16);
    expect(settleState(graph)).toBeNull();
    expect(queued.size).toBe(0);
    expect(markerY(marker(graph, 0, 1))).toBeCloseTo(toSvgY(70), 6);
  });

  it('turning the flag off ends it', async () => {
    const graph = await midSettle();
    graph.joy = JOY_DEFAULTS;
    await graph.updateComplete;
    expect(settleState(graph)).toBeNull();
    expect(queued.size).toBe(0);
  });

  it('disconnecting the graph ends it', async () => {
    const graph = await midSettle();
    graph.remove();
    expect(settleState(graph)).toBeNull();
    expect(queued.size).toBe(0);
  });
});
