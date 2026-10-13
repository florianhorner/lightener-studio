// @vitest-environment jsdom

/**
 * Joy moments inside the graph. Settle: a released point's marker overshoots
 * 2 SVG units in the direction its brightness changed and is back at rest
 * 250ms after release, while the data, the path, the hit circle and the
 * tooltip stay where the point really is. Diagonal: a dragged point that lands
 * on the diagonal, the 0% line or the 100% line flashes that line once and
 * taps touch screens. Ripple: the graph draws one curve from a CurveFrame, its
 * line, fill and scrubber dot from the frame's pieces and its markers, hit
 * circles and tooltip at the frame's knots, while labels and tooltip text read
 * the real points (the card's side is in lightener-curve-card.motion.test.ts).
 *
 * Frames are stepped by hand: requestAnimationFrame and performance.now are
 * stubbed, so every assertion lands on an exact millisecond. The flash's
 * lifetime runs on faked timers, the pointer type is a stubbed
 * `(pointer: coarse)` query, and navigator.vibrate is a spy.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurveGraph } from './curve-graph.js';
import type { ControlPoint, CurveFrame, DrawIn, LightCurve } from '../utils/types.js';
import {
  LEGEND_SHAPES,
  GRAPH_W,
  PAD_LEFT,
  PAD_TOP,
  VB_H,
  buildPiecesPath,
  curvePieces,
  easeOutCubic,
  piecesHeightAt,
  toSvgX,
  toSvgY,
} from '../utils/graph-math.js';
import {
  applyPresetToCurves,
  movePointOnCurves,
  removePointEdit,
} from '../utils/edit-operations.js';
import { CURVE_PRESETS } from '../utils/presets.js';
import {
  COARSE_POINTER_QUERY,
  DRAW_IN_POP_MS,
  DRAW_IN_REVEAL_MS,
  DRAW_IN_STAGGER_MS,
  type DiagonalHit,
  JOY_DEFAULTS,
  REDUCED_MOTION_QUERY,
  resolveJoyFlags,
} from '../utils/motion.js';

let reducedMotion = false;
let coarsePointer = false;

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches:
        query === REDUCED_MOTION_QUERY
          ? reducedMotion
          : query === COARSE_POINTER_QUERY
            ? coarsePointer
            : false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
});

type GraphInternals = {
  _settle: { curve: number; point: number; dy: number } | null;
  _flash: { kind: DiagonalHit; token: number } | null;
};

let now = 0;
let nextHandle = 1;
let queued = new Map<number, FrameRequestCallback>();
let requested = 0;
let cancelled = 0;

beforeEach(() => {
  document.body.replaceChildren();
  reducedMotion = false;
  coarsePointer = false;
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
  document.body.replaceChildren();
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
const flashState = (graph: CurveGraph) => (graph as unknown as GraphInternals)._flash;

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

describe('diagonal: the lines catch a dragged point', () => {
  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    // Like the native method: it refuses any receiver but navigator.
    vibrate = vi.fn(function (this: unknown) {
      if (this !== navigator) throw new TypeError('Illegal invocation');
      return true;
    });
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
  });

  afterEach(() => {
    delete (navigator as unknown as { vibrate?: unknown }).vibrate;
  });

  const diagonalGraph = () => makeGraph({ joy: { diagonal: true } });

  /** Point 1 dragged from (50, 70) onto the diagonal at (60, 60), pointer still down. */
  async function midFlash(): Promise<CurveGraph> {
    const graph = await diagonalGraph();
    await press(graph, 0, 1, 70);
    await moveTo(graph, 60, 60);
    return graph;
  }

  function keydown(graph: CurveGraph, ci: number, pi: number, key: string, shiftKey = false) {
    hitCircle(graph, ci, pi).dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, composed: true })
    );
    return graph.updateComplete;
  }
  const flashLine = (graph: CurveGraph) => graph.shadowRoot!.querySelector('.diagonal-flash');
  const coords = (el: Element) =>
    ['x1', 'y1', 'x2', 'y2'].map((name) => Number(el.getAttribute(name)));
  const DIAGONAL = [toSvgX(0), toSvgY(0), toSvgX(100), toSvgY(100)];
  const level = (target: number) => [toSvgX(0), toSvgY(target), toSvgX(100), toSvgY(target)];

  it('draws a faint reference diagonal from 0% to 100% only with the flag', async () => {
    const graph = await diagonalGraph();
    const ref = graph.shadowRoot!.querySelector('.diagonal-ref')!;
    expect(ref.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(coords(ref)).toEqual(DIAGONAL);
    expect(ref.getAttribute('pointer-events')).toBe('none');

    const plain = await makeGraph({ joy: {} });
    expect(plain.shadowRoot!.querySelector('.diagonal-ref')).toBeNull();
  });

  it('flashes the diagonal once per entry and again after the point leaves it', async () => {
    const graph = await diagonalGraph();
    await press(graph, 0, 1, 70);
    expect(flashLine(graph)).toBeNull();

    await moveTo(graph, 60, 60);
    const first = flashLine(graph)!;
    expect(first.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(coords(first)).toEqual(DIAGONAL);

    await moveTo(graph, 61, 61);
    expect(flashLine(graph), 'staying on the line does not fire again').toBe(first);

    await moveTo(graph, 61, 70);
    await moveTo(graph, 62, 62);
    const second = flashLine(graph)!;
    expect(second, 'a new entry restarts the flash').not.toBe(first);
    expect(coords(second)).toEqual(DIAGONAL);
  });

  it('fires again on a new drag that starts on the same line', async () => {
    const graph = await midFlash();
    await fire(graph, 'pointerup');
    vi.advanceTimersByTime(400);
    await graph.updateComplete;
    expect(flashLine(graph)).toBeNull();

    await press(graph, 0, 1, 60);
    expect(coords(flashLine(graph)!)).toEqual(DIAGONAL);
  });

  it('fires again when an arrow key moved the dragged point off the line meanwhile', async () => {
    const graph = await midFlash();
    const first = flashLine(graph);
    await keydown(graph, 0, 1, 'ArrowUp', true);
    expect(graph.curves[0].controlPoints[1]).toEqual({ lightener: 60, target: 70 });
    expect(flashLine(graph), 'the key press ends the flash').toBeNull();

    await moveTo(graph, 60, 60);
    const again = flashLine(graph);
    expect(again).not.toBeNull();
    expect(again).not.toBe(first);
  });

  it('keeps both corner lines held through a one-step arrow key', async () => {
    coarsePointer = true;
    const graph = await diagonalGraph();
    await press(graph, 0, 2, 100);
    await keydown(graph, 0, 2, 'ArrowLeft');
    expect(graph.curves[0].controlPoints[2]).toEqual({ lightener: 99, target: 100 });
    await moveTo(graph, 100, 100);
    expect(flashLine(graph)).toBeNull();
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('keeps the diagonal held when an arrow key steps onto the 0% line next to it', async () => {
    coarsePointer = true;
    const graph = await makeGraph({
      curves: [
        curve(0, [
          [0, 0],
          [1, 1],
          [100, 100],
        ]),
      ],
      joy: { diagonal: true },
    });
    await press(graph, 0, 1, 1);
    await keydown(graph, 0, 1, 'ArrowDown');
    expect(graph.curves[0].controlPoints[1]).toEqual({ lightener: 1, target: 0 });
    await moveTo(graph, 1, 0);
    await moveTo(graph, 1, 1);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('treats a one-step arrow key like a wobble: the point keeps its line', async () => {
    const graph = await midFlash();
    await keydown(graph, 0, 1, 'ArrowUp');
    expect(graph.curves[0].controlPoints[1]).toEqual({ lightener: 60, target: 61 });
    await moveTo(graph, 60, 60);
    expect(flashLine(graph)).toBeNull();
  });

  it.each<[string, number, { lightener: number; target: number }, [number, number]]>([
    ['the diagonal', 51, { lightener: 50, target: 50 }, [51, 51]],
    ['the 0% line', 1, { lightener: 50, target: 0 }, [60, 0]],
  ])(
    'does not flash when an arrow key put the dragged point on %s and the pointer follows',
    async (_line, startY, landed, next) => {
      const graph = await diagonalGraph();
      await press(graph, 0, 1, startY);
      expect(flashLine(graph)).toBeNull();
      await keydown(graph, 0, 1, 'ArrowDown');
      expect(graph.curves[0].controlPoints[1]).toEqual(landed);
      await moveTo(graph, ...next);
      expect(flashLine(graph)).toBeNull();
    }
  );

  it('keeps the dragged point on its line when a key moves another point of the same light', async () => {
    const graph = await midFlash();
    await keydown(graph, 0, 2, 'ArrowDown', true);
    expect(graph.curves[0].controlPoints[2]).toEqual({ lightener: 100, target: 90 });
    await moveTo(graph, 61, 61);
    expect(flashLine(graph)).toBeNull();
  });

  it('keeps the dragged point on its line when a key moves the same point of another light', async () => {
    const graph = await makeGraph({
      curves: [curve(0, POINTS), curve(1, POINTS)],
      joy: { diagonal: true },
    });
    await press(graph, 0, 1, 70);
    await moveTo(graph, 60, 60);
    await keydown(graph, 1, 1, 'ArrowDown', true);
    expect(graph.curves[1].controlPoints[1]).toEqual({ lightener: 50, target: 40 });
    await moveTo(graph, 61, 61);
    expect(flashLine(graph)).toBeNull();
  });

  it.each<[string, [number, number], Array<[number, number]>, [number, number]]>([
    [
      'the diagonal',
      [60, 60],
      [
        [61, 62],
        [63, 62],
        [63, 63],
      ],
      [64, 66],
    ],
    [
      'the 0% line',
      [50, 0],
      [
        [52, 1],
        [55, 0],
      ],
      [55, 2],
    ],
    [
      'the 100% line',
      [50, 100],
      [
        [52, 99],
        [55, 100],
      ],
      [55, 98],
    ],
  ])(
    'holds %s through a one-step wobble and fires again from 2 steps off',
    async (_line, land, wobble, away) => {
      coarsePointer = true;
      const graph = await diagonalGraph();
      await press(graph, 0, 1, 70);
      await moveTo(graph, ...land);
      const first = flashLine(graph);
      expect(first).not.toBeNull();
      for (const [x, y] of wobble) await moveTo(graph, x, y);
      expect(flashLine(graph), 'a one-step wobble does not restart the flash').toBe(first);
      expect(vibrate).toHaveBeenCalledTimes(1);

      await moveTo(graph, ...away);
      await moveTo(graph, ...land);
      expect(flashLine(graph), '2 steps off and back is a new landing').not.toBe(first);
      expect(vibrate).toHaveBeenCalledTimes(2);
    }
  );

  it('flashes the 0% and 100% lines when the pointer overshoots the plot', async () => {
    const graph = await diagonalGraph();
    await press(graph, 0, 1, 70);
    await moveTo(graph, 50, -25);
    expect(graph.curves[0].controlPoints[1]).toEqual({ lightener: 50, target: 0 });
    expect(coords(flashLine(graph)!)).toEqual(level(0));
    await moveTo(graph, 50, 140);
    expect(graph.curves[0].controlPoints[1]).toEqual({ lightener: 50, target: 100 });
    expect(coords(flashLine(graph)!)).toEqual(level(100));
  });

  it('reads the clamped x: a pointer past the right edge lands the endpoint on the corner, once', async () => {
    coarsePointer = true;
    const graph = await diagonalGraph();
    await press(graph, 0, 2, 70);
    await moveTo(graph, 130, 100);
    expect(graph.curves[0].controlPoints[2]).toEqual({ lightener: 100, target: 100 });
    expect(coords(flashLine(graph)!)).toEqual(DIAGONAL);
    await moveTo(graph, 100, 100);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it.each<[string, number, number, number]>([
    ['the next point', 80, 59, 59],
    ['the previous point', -10, 1, 1],
  ])('reads the x clamped against %s', async (_neighbour, pointerX, pointerY, at) => {
    const graph = await makeGraph({
      curves: [
        curve(0, [
          [0, 0],
          [50, 70],
          [60, 90],
        ]),
      ],
      joy: { diagonal: true },
    });
    await press(graph, 0, 1, 70);
    await moveTo(graph, pointerX, pointerY);
    expect(graph.curves[0].controlPoints[1]).toEqual({ lightener: at, target: at });
    expect(coords(flashLine(graph)!)).toEqual(DIAGONAL);
  });

  it('rounds x and y separately: a pointer at (60.6, 61.4) reads as (61, 61)', async () => {
    const graph = await diagonalGraph();
    await press(graph, 0, 1, 70);
    await fire(graph, 'pointermove', { clientX: toSvgX(60.6), clientY: toSvgY(61.4) });
    expect(graph.curves[0].controlPoints[1]).toEqual({ lightener: 61, target: 61 });
    expect(coords(flashLine(graph)!)).toEqual(DIAGONAL);
  });

  it('flashes the 0% and the 100% line', async () => {
    const graph = await diagonalGraph();
    await press(graph, 0, 1, 0);
    expect(coords(flashLine(graph)!)).toEqual(level(0));
    await moveTo(graph, 50, 100);
    expect(coords(flashLine(graph)!)).toEqual(level(100));
  });

  it('never flashes the diagonal for the origin point', async () => {
    const graph = await diagonalGraph();
    await press(graph, 0, 0, 0);
    expect(coords(flashLine(graph)!), 'the origin at 0% hits the 0% line').toEqual(level(0));
  });

  it('fires once while a point wobbles at the top-right corner, where two lines meet', async () => {
    coarsePointer = true;
    const graph = await diagonalGraph();
    await press(graph, 0, 2, 100);
    expect(coords(flashLine(graph)!), 'landing on both picks the diagonal').toEqual(DIAGONAL);
    for (const x of [99, 100, 99, 100]) await moveTo(graph, x, 100);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('lands each line once while a point wobbles between the diagonal and the 0% line', async () => {
    coarsePointer = true;
    const graph = await makeGraph({
      curves: [
        curve(0, [
          [0, 0],
          [1, 1],
          [100, 100],
        ]),
      ],
      joy: { diagonal: true },
    });
    await press(graph, 0, 1, 1);
    expect(coords(flashLine(graph)!)).toEqual(DIAGONAL);
    await moveTo(graph, 1, 0);
    expect(coords(flashLine(graph)!)).toEqual(level(0));
    for (const y of [1, 0, 1, 0]) await moveTo(graph, 1, y);
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('removes the flash after 400ms', async () => {
    const graph = await midFlash();
    vi.advanceTimersByTime(399);
    await graph.updateComplete;
    expect(flashLine(graph)).not.toBeNull();
    vi.advanceTimersByTime(1);
    await graph.updateComplete;
    expect(flashLine(graph)).toBeNull();
  });

  it('lets a flash that restarts early run its full 400ms', async () => {
    const graph = await midFlash();
    vi.advanceTimersByTime(200);
    await moveTo(graph, 60, 70);
    await moveTo(graph, 65, 65);
    vi.advanceTimersByTime(200);
    await graph.updateComplete;
    expect(flashLine(graph), 'the first timer does not clear the second flash').not.toBeNull();
    vi.advanceTimersByTime(200);
    await graph.updateComplete;
    expect(flashLine(graph)).toBeNull();
  });

  it('gives touch screens a 5ms tap once per entry', async () => {
    coarsePointer = true;
    const graph = await midFlash();
    await moveTo(graph, 61, 61);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(5);
  });

  it('still moves the point, and fires once per entry, when the tap throws', async () => {
    coarsePointer = true;
    vibrate.mockImplementation(() => {
      throw new Error('vibrate blocked');
    });
    const swallow = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', swallow);
    try {
      const graph = await midFlash();
      expect(graph.curves[0].controlPoints[1]).toEqual({ lightener: 60, target: 60 });
      const first = flashLine(graph);
      expect(first).not.toBeNull();
      await moveTo(graph, 61, 61);
      expect(flashLine(graph), 'sliding along the line does not restart the flash').toBe(first);
      expect(vibrate).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('error', swallow);
    }
  });

  it('taps once per entry under reduced motion too', async () => {
    reducedMotion = true;
    coarsePointer = true;
    const graph = await midFlash();
    await moveTo(graph, 61, 61);
    expect(vibrate).toHaveBeenCalledTimes(1);
    await moveTo(graph, 61, 70);
    await moveTo(graph, 62, 62);
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('does not vibrate with a mouse', async () => {
    const graph = await midFlash();
    expect(flashLine(graph)).not.toBeNull();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('keeps the tap but drops the flash under reduced motion', async () => {
    reducedMotion = true;
    coarsePointer = true;
    const graph = await midFlash();
    expect(flashLine(graph)).toBeNull();
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('does nothing without the flag', async () => {
    coarsePointer = true;
    const graph = await makeGraph({ joy: { settle: true } });
    await press(graph, 0, 1, 70);
    await moveTo(graph, 60, 60);
    expect(graph.shadowRoot!.querySelector('.diagonal-ref')).toBeNull();
    expect(flashLine(graph)).toBeNull();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('stays quiet while the graph is read-only mid-drag, then fires again', async () => {
    coarsePointer = true;
    const graph = await diagonalGraph();
    await press(graph, 0, 1, 70);
    graph.readOnly = true;
    await graph.updateComplete;
    await moveTo(graph, 60, 60);
    expect(flashLine(graph)).toBeNull();
    expect(vibrate).not.toHaveBeenCalled();

    graph.readOnly = false;
    await graph.updateComplete;
    await moveTo(graph, 61, 61);
    expect(flashLine(graph)).not.toBeNull();
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('a new press anywhere on the graph ends the flash', async () => {
    const graph = await midFlash();
    await fire(graph, 'pointerup');
    expect(flashLine(graph)).not.toBeNull();
    await fire(graph, 'pointerdown');
    expect(flashLine(graph)).toBeNull();
  });

  it('ends the flash when the flag turns off', async () => {
    const graph = await midFlash();
    graph.joy = JOY_DEFAULTS;
    await graph.updateComplete;
    expect(flashLine(graph)).toBeNull();
    expect(graph.shadowRoot!.querySelector('.diagonal-ref')).toBeNull();
  });

  it.each(['pointerdown', 'keydown'])(
    'a %s ends the flash even when a handler on the point stops it bubbling',
    async (type) => {
      const graph = await midFlash();
      await fire(graph, 'pointerup');
      expect(flashLine(graph), 'the release leaves the flash running').not.toBeNull();
      const hit = hitCircle(graph, 0, 1);
      hit.addEventListener(type, (event) => event.stopPropagation());
      hit.dispatchEvent(
        type === 'keydown'
          ? new KeyboardEvent('keydown', { key: 'Shift', bubbles: true, composed: true })
          : pointer('pointerdown')
      );
      await graph.updateComplete;
      expect(flashLine(graph)).toBeNull();
    }
  );

  it('keeps flashing when the flags are replaced but diagonal stays on', async () => {
    const graph = await midFlash();
    const flash = flashLine(graph)!;
    graph.joy = resolveJoyFlags({ diagonal: true, settle: true });
    await graph.updateComplete;
    expect(flashLine(graph)).toBe(flash);
  });

  it('does not settle a released point for the diagonal flag alone', async () => {
    const graph = await diagonalGraph();
    await drag(graph, 0, 1, 70);
    expect(requested).toBe(0);
    expect(markerY(marker(graph, 0, 1))).toBeCloseTo(toSvgY(70), 6);
  });

  it('runs a settle and a flash together, and the release does not end the flash', async () => {
    const graph = await makeGraph({ joy: { settle: true, diagonal: true } });
    await press(graph, 0, 1, 60);
    await moveTo(graph, 60, 60);
    await fire(graph, 'pointerup');
    await advance(graph, 70);
    expect(markerY(marker(graph, 0, 1)) - toSvgY(60)).toBeCloseTo(-2, 6);
    expect(coords(flashLine(graph)!)).toEqual(DIAGONAL);
  });

  it('keeps the flash out of the way: no pointer input, over the curves, under the scrubber dim and the markers', async () => {
    const graph = await midFlash();
    graph.scrubberPosition = 40;
    await graph.updateComplete;
    const root = graph.shadowRoot!;
    const flash = flashLine(graph)!;
    expect(flash.getAttribute('pointer-events')).toBe('none');
    const follows = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const ref = root.querySelector('.diagonal-ref')!;
    const curves = root.querySelector('.curve-line')!;
    // The scrubber draws its dim rect right before its line.
    const dim = root.querySelector('.scrubber-line')!.previousElementSibling!;
    expect(dim.tagName, 'the scrubber dim is drawn').toBe('rect');
    expect(follows(ref, curves), 'the guide is behind the curves').toBe(true);
    expect(follows(curves, flash), 'the flash is over the curves').toBe(true);
    expect(follows(ref, dim), 'the guide is under the scrubber dim').toBe(true);
    expect(follows(flash, dim), 'the flash is under the scrubber dim').toBe(true);
    expect(follows(flash, hitCircle(graph, 0, 1)), 'the flash is under the markers').toBe(true);
  });

  it('clears its timer when the graph is removed', async () => {
    const graph = await midFlash();
    graph.remove();
    expect(vi.getTimerCount()).toBe(0);
    expect(flashState(graph)).toBeNull();
  });
});

describe('ripple: the graph draws a curve from its frame', () => {
  const PIECES = curvePieces([
    { lightener: 0, target: 0 },
    { lightener: 40, target: 10 },
    { lightener: 100, target: 60 },
  ]);
  const KNOTS: ControlPoint[] = [
    { lightener: 0, target: 0 },
    { lightener: 50, target: 30 },
    { lightener: 100, target: 60 },
  ];
  const frame = (entityId = 'light.l0', knots: ControlPoint[] | null = KNOTS): CurveFrame => ({
    entityId,
    pieces: PIECES,
    knots,
  });
  const line = (graph: CurveGraph) =>
    graph.shadowRoot!.querySelector('.curve-line')!.getAttribute('d');
  const tooltipText = (graph: CurveGraph) =>
    graph.shadowRoot!.querySelector('.tooltip-text')!.textContent;
  /** The tooltip box's y for a point drawn at this height (above the point, kept in the plot). */
  const tooltipBoxY = (target: number) => Math.max(PAD_TOP + 4, toSvgY(target) - 16) - 8;
  const tooltipY = (graph: CurveGraph) =>
    Number(graph.shadowRoot!.querySelector('.tooltip-bg')!.getAttribute('y'));

  it("draws the curve's line, fill and scrubber dot from the frame's pieces", async () => {
    const graph = await makeGraph({ joy: { ripple: true } });
    graph.selectedCurveId = 'light.l0';
    graph.scrubberPosition = 30;
    graph.curveFrame = frame();
    await graph.updateComplete;

    expect(line(graph)).toBe(buildPiecesPath(PIECES));
    const fill = graph.shadowRoot!.querySelector('path[fill^="url(#grad-"]')!.getAttribute('d')!;
    expect(fill.startsWith(buildPiecesPath(PIECES))).toBe(true);
    expect(fill.endsWith(`L${toSvgX(100)},${toSvgY(0)} L${toSvgX(0)},${toSvgY(0)} Z`)).toBe(true);
    const dot = graph.shadowRoot!.querySelector('.scrubber-dot')!;
    expect(Number(dot.getAttribute('cy'))).toBeCloseTo(toSvgY(piecesHeightAt(PIECES, 30)), 6);
  });

  it('puts markers and hit circles at the knots, while labels and the tooltip read the real points', async () => {
    const graph = await makeGraph({ joy: { ripple: true } });
    graph.curveFrame = frame();
    await graph.updateComplete;
    for (const [pi, knot] of KNOTS.entries()) {
      const hit = hitCircle(graph, 0, pi);
      expect(Number(hit.getAttribute('cx'))).toBeCloseTo(toSvgX(knot.lightener), 6);
      expect(Number(hit.getAttribute('cy'))).toBeCloseTo(toSvgY(knot.target), 6);
      expect(markerY(marker(graph, 0, pi))).toBeCloseTo(toSvgY(knot.target), 6);
    }
    // The point at 50 is really at 50%: its label and its tooltip say so, not the knot's 30%.
    expect(hitCircle(graph, 0, 1).getAttribute('aria-label')).toContain('to 50% light brightness');
    hitCircle(graph, 0, 1).dispatchEvent(pointer('pointerenter'));
    await graph.updateComplete;
    expect(tooltipText(graph)).toBe('Group 50% -> Light 50%');
    // …and the tooltip sits next to the marker, where the point is drawn.
    expect(tooltipY(graph)).toBeCloseTo(tooltipBoxY(KNOTS[1].target), 6);
  });

  it('keeps the tooltip on a keyboard-focused point at its knot while another is hovered', async () => {
    const graph = await makeGraph({ joy: { ripple: true } });
    graph.curveFrame = frame();
    await graph.updateComplete;
    hitCircle(graph, 0, 1).dispatchEvent(new FocusEvent('focus'));
    hitCircle(graph, 0, 2).dispatchEvent(pointer('pointerenter'));
    await graph.updateComplete;
    expect(tooltipText(graph)).toBe('Group 50% -> Light 50%');
    expect(tooltipY(graph)).toBeCloseTo(tooltipBoxY(KNOTS[1].target), 6);
  });

  it("keeps every other light's scrubber dot on its own curve", async () => {
    const graph = await makeGraph({
      joy: { ripple: true },
      curves: [
        curve(0, POINTS),
        curve(1, [
          [0, 0],
          [60, 10],
          [100, 100],
        ]),
      ],
    });
    graph.scrubberPosition = 30;
    await graph.updateComplete;
    const dotYs = () =>
      [...graph.shadowRoot!.querySelectorAll('.scrubber-dot')].map((d) =>
        Number(d.getAttribute('cy'))
      );
    const plain = dotYs();
    graph.curveFrame = { entityId: 'light.l1', pieces: PIECES, knots: null };
    await graph.updateComplete;
    const [first, second] = dotYs();
    expect(first).toBeCloseTo(plain[0], 6);
    expect(second).toBeCloseTo(toSvgY(piecesHeightAt(PIECES, 30)), 6);
    expect(second).not.toBeCloseTo(plain[1], 3);
  });

  it.each<[string, Array<[number, number]>]>([
    ['with a point at 100%', POINTS],
    [
      'without one',
      [
        [0, 0],
        [50, 60],
      ],
    ],
  ])("closes an ordinary curve's fill at 100%% across, %s", async (_name, points) => {
    const graph = await makeGraph({ curves: [curve(0, points)] });
    graph.selectedCurveId = 'light.l0';
    await graph.updateComplete;
    const fill = graph.shadowRoot!.querySelector('path[fill^="url(#grad-"]')!.getAttribute('d')!;
    expect(fill.endsWith(`L${toSvgX(100)},${toSvgY(0)} L${toSvgX(0)},${toSvgY(0)} Z`)).toBe(true);
  });

  it('keeps the markers on the real points when the frame has no knots', async () => {
    const graph = await makeGraph({ joy: { ripple: true } });
    graph.curveFrame = frame('light.l0', null);
    await graph.updateComplete;
    expect(Number(hitCircle(graph, 0, 1).getAttribute('cy'))).toBeCloseTo(toSvgY(50), 6);
    expect(line(graph)).toBe(buildPiecesPath(PIECES));
  });

  it('leaves a curve alone when the frame belongs to another light', async () => {
    const graph = await makeGraph({ joy: { ripple: true } });
    const plain = line(graph);
    graph.curveFrame = frame('light.other');
    await graph.updateComplete;
    expect(line(graph)).toBe(plain);
    expect(Number(hitCircle(graph, 0, 1).getAttribute('cy'))).toBeCloseTo(toSvgY(50), 6);
  });

  it('draws the real points again once the frame is gone', async () => {
    const graph = await makeGraph({ joy: { ripple: true } });
    const plain = line(graph);
    graph.curveFrame = frame();
    await graph.updateComplete;
    expect(line(graph)).not.toBe(plain);
    graph.curveFrame = null;
    await graph.updateComplete;
    expect(line(graph)).toBe(plain);
  });
});

describe('drawIn: added curves reveal without changing their data or input', () => {
  const effect = (token = 1, ids = ['light.l0']): DrawIn => ({ ids: new Set(ids), token });
  const clips = (graph: CurveGraph) => [
    ...graph.shadowRoot!.querySelectorAll<SVGClipPathElement>('.draw-in-clip'),
  ];
  const pops = (graph: CurveGraph) => [
    ...graph.shadowRoot!.querySelectorAll<SVGGElement>('.marker-pop'),
  ];
  const revealWidth = (graph: CurveGraph) =>
    Number(graph.shadowRoot!.querySelector('.draw-in-reveal')!.getAttribute('width'));
  const markup = (graph: CurveGraph) => svgOf(graph).innerHTML.replace(/<!--[\s\S]*?-->/g, '');
  async function start(graph: CurveGraph, drawIn = effect()): Promise<void> {
    graph.drawIn = drawIn;
    await graph.updateComplete;
  }
  async function revealing(): Promise<CurveGraph> {
    const graph = await makeGraph({ joy: { drawIn: true } });
    graph.selectedCurveId = 'light.l0';
    await start(graph);
    return graph;
  }

  it('renders width 0 before any frame, eases over 500ms and keeps pops after the reveal', async () => {
    const graph = await revealing();
    expect(revealWidth(graph)).toBe(0);
    const rect = graph.shadowRoot!.querySelector('.draw-in-reveal')!;
    expect(rect.getAttribute('x')).toBe(String(PAD_LEFT - 10));
    expect(rect.getAttribute('y')).toBe('0');
    expect(rect.getAttribute('height')).toBe(String(VB_H));
    expect(clips(graph)[0].getAttribute('clipPathUnits')).toBe('userSpaceOnUse');
    await advance(graph, DRAW_IN_REVEAL_MS / 2);
    expect(revealWidth(graph)).toBeCloseTo((GRAPH_W + 20) * easeOutCubic(0.5), 6);
    await advance(graph, DRAW_IN_REVEAL_MS / 2);
    expect(revealWidth(graph)).toBe(GRAPH_W + 20);
    expect(queued.size).toBe(0);
    expect(pops(graph)).toHaveLength(POINTS.length);
  });

  it('clips both added curves, pops only the selected one, and leaves the other line alone', async () => {
    const graph = await makeGraph({
      joy: { drawIn: true },
      curves: [curve(0, POINTS), curve(1, POINTS), curve(2, POINTS)],
    });
    graph.selectedCurveId = 'light.l1';
    await graph.updateComplete;
    const linesBefore = [...graph.shadowRoot!.querySelectorAll('.curve-line')].map((line) => ({
      d: line.getAttribute('d'),
      dash: line.getAttribute('stroke-dasharray'),
    }));
    await start(graph, effect(1, ['light.l1', 'light.l2']));
    expect(clips(graph)).toHaveLength(2);
    const lines = [...graph.shadowRoot!.querySelectorAll('.curve-line')];
    expect(lines.filter((line) => line.hasAttribute('clip-path'))).toHaveLength(2);
    expect(lines[0].hasAttribute('clip-path')).toBe(false);
    expect(
      lines.map((line) => ({
        d: line.getAttribute('d'),
        dash: line.getAttribute('stroke-dasharray'),
      }))
    ).toEqual(linesBefore);
    const fill = graph.shadowRoot!.querySelector('path[fill^="url(#grad-"]')!;
    expect(fill.getAttribute('clip-path')).toBe(lines[2].getAttribute('clip-path'));
    expect(pops(graph)).toHaveLength(POINTS.length);
    pops(graph).forEach((pop, pi) => {
      expect(pop.previousElementSibling).toBe(hitCircle(graph, 1, pi));
      expect(pop.querySelector('.control-point')).not.toBeNull();
      expect(pop.style.animationDelay).toBe(`${DRAW_IN_REVEAL_MS + pi * DRAW_IN_STAGGER_MS}ms`);
    });
  });

  it('leaves hit targets, ARIA, tooltip and data untouched, and restores the settled markup', async () => {
    const graph = await makeGraph({ joy: { drawIn: true } });
    graph.selectedCurveId = 'light.l0';
    graph.scrubberPosition = 60;
    await graph.updateComplete;
    hitCircle(graph, 0, 1).dispatchEvent(pointer('pointerenter'));
    await graph.updateComplete;
    const before = markup(graph);
    const data = JSON.stringify(graph.curves);
    const hit = hitCircle(graph, 0, 1);
    const hitMarkup = hit.outerHTML;
    const tooltip = graph.shadowRoot!.querySelector('.tooltip-text')!.textContent;
    await start(graph);
    expect(hitCircle(graph, 0, 1)).toBe(hit);
    expect(hit.outerHTML).toBe(hitMarkup);
    expect(hit.closest('.marker-pop')).toBeNull();
    expect(hit.closest('[clip-path]')!.getAttribute('clip-path')).toMatch(/^url\(#graph-area-/);
    expect(graph.shadowRoot!.querySelector('.scrubber-dot')!.hasAttribute('clip-path')).toBe(false);
    expect(graph.shadowRoot!.querySelector('.tooltip-text')!.textContent).toBe(tooltip);
    await advance(graph, 250);
    expect(JSON.stringify(graph.curves)).toBe(data);
    graph.drawIn = null;
    await graph.updateComplete;
    expect(clips(graph)).toHaveLength(0);
    expect(pops(graph)).toHaveLength(0);
    expect(markup(graph)).toBe(before);
  });

  it.each(LEGEND_SHAPES.map((shape, index) => [shape, index] as const))(
    'pops the %s marker on a wrapper and preserves its own geometry',
    async (shape, index) => {
      const graph = await makeGraph({
        joy: { drawIn: true },
        curves: Array.from({ length: index + 1 }, (_, i) => curve(i, POINTS)),
      });
      graph.selectedCurveId = `light.l${index}`;
      await graph.updateComplete;
      const before = marker(graph, index, 1).outerHTML;
      await start(graph, effect(1, [`light.l${index}`]));
      const pop = marker(graph, index, 1);
      expect(pop.tagName).toBe('g');
      expect(pop.classList.contains('marker-pop')).toBe(true);
      const child = pop.querySelector('.control-point')!;
      expect(child.outerHTML).toBe(before);
      if (shape === 'diamond') {
        expect(child.getAttribute('transform')).toBe(`rotate(45 ${toSvgX(50)} ${toSvgY(50)})`);
        expect(child.getAttribute('style')).not.toContain('transform');
      }
    }
  );

  it('uses the reference pop easing and keyframes on the wrapper', () => {
    const cssText = CurveGraph.styles.cssText;
    expect(cssText).toContain(
      `animation: marker-pop ${DRAW_IN_POP_MS}ms cubic-bezier(0.33, 1, 0.68, 1) both`
    );
    expect(cssText).toContain('transform-box: fill-box');
    expect(cssText).toContain('transform-origin: center');
    expect(cssText).toMatch(/@keyframes marker-pop\s*\{\s*0%\s*\{\s*transform: scale\(0\)/);
    expect(cssText).toMatch(/70%\s*\{\s*transform: scale\(1\.15\)/);
    expect(cssText).toMatch(/100%\s*\{\s*transform: scale\(1\)/);
    expect(cssText).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.marker-pop\s*\{\s*animation: none/
    );
  });

  it('puts clips, rectangles and marker wrappers in the SVG namespace', async () => {
    const graph = await revealing();
    for (const element of graph.shadowRoot!.querySelectorAll(
      '.draw-in-clip, .draw-in-reveal, .marker-pop'
    )) {
      expect(element.namespaceURI).toBe('http://www.w3.org/2000/svg');
    }
  });

  it('uses unique clip IDs across graphs and across replacement tokens', async () => {
    const first = await revealing();
    const second = await revealing();
    const oldId = clips(first)[0].id;
    expect(clips(second)[0].id).not.toBe(oldId);
    await start(first, effect(2));
    expect(clips(first)[0].id).not.toBe(oldId);
    for (const graph of [first, second]) {
      const id = clips(graph)[0].id;
      expect(graph.shadowRoot!.querySelector('.curve-line')!.getAttribute('clip-path')).toBe(
        `url(#${id})`
      );
    }
  });

  it('cancels the old frame and replaces keyed pops when a newer token arrives', async () => {
    const graph = await revealing();
    await advance(graph, 250);
    const oldPop = pops(graph)[0];
    const oldFrame = [...queued.values()][0];
    const cancelledBefore = cancelled;
    await start(graph, effect(2));
    expect(cancelled).toBe(cancelledBefore + 1);
    expect(revealWidth(graph)).toBe(0);
    expect(pops(graph)[0]).not.toBe(oldPop);
    oldFrame(now + 400);
    await graph.updateComplete;
    expect(revealWidth(graph)).toBe(0);
    await advance(graph, 100);
    expect(revealWidth(graph)).toBeCloseTo((GRAPH_W + 20) * easeOutCubic(0.2), 6);
  });

  it.each(['flag off', 'reduced motion'] as const)('does nothing with %s', async (reason) => {
    reducedMotion = reason === 'reduced motion';
    const graph = await makeGraph({ joy: { drawIn: reason !== 'flag off' } });
    const before = markup(graph);
    await start(graph);
    expect(clips(graph)).toHaveLength(0);
    expect(pops(graph)).toHaveLength(0);
    expect(requested).toBe(0);
    expect(markup(graph)).toBe(before);
  });

  it.each(['clear', 'flag off', 'entity switch', 'disconnect', 'reduced motion'] as const)(
    'cancels all draw-in rendering on %s and never replays the consumed token',
    async (reason) => {
      const graph = await revealing();
      const token = graph.drawIn!;
      await advance(graph, 100);
      if (reason === 'clear') graph.drawIn = null;
      if (reason === 'flag off') graph.joy = JOY_DEFAULTS;
      if (reason === 'entity switch') graph.entityId = 'light.other_group';
      if (reason === 'disconnect') graph.remove();
      if (reason === 'reduced motion') {
        reducedMotion = true;
        await advance(graph, 20);
      }
      await graph.updateComplete;
      expect(clips(graph)).toHaveLength(0);
      expect(pops(graph)).toHaveLength(0);
      expect(queued.size).toBe(0);
      const requestedBefore = requested;
      reducedMotion = false;
      graph.joy = resolveJoyFlags({ drawIn: true });
      graph.drawIn = { ...token };
      if (!graph.isConnected) document.body.appendChild(graph);
      await graph.updateComplete;
      expect(clips(graph)).toHaveLength(0);
      expect(pops(graph)).toHaveLength(0);
      expect(requested).toBe(requestedBefore);
    }
  );

  it('handles a reduced-motion change after rAF ended, while markers are still popping', async () => {
    const graph = await makeGraph({ joy: { drawIn: true } });
    const changes = new Set<EventListener>();
    const add = vi.fn((_type: string, callback: EventListener) => changes.add(callback));
    const remove = vi.fn((_type: string, callback: EventListener) => changes.delete(callback));
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      query === REDUCED_MOTION_QUERY
        ? ({
            matches: false,
            addEventListener: add,
            removeEventListener: remove,
          } as unknown as MediaQueryList)
        : original(query)
    );
    await start(graph);
    await advance(graph, DRAW_IN_REVEAL_MS);
    expect(queued.size).toBe(0);
    expect(pops(graph)).not.toHaveLength(0);
    expect(changes.size).toBe(1);
    const event = { matches: true } as unknown as Event;
    for (const change of [...changes]) change(event);
    await graph.updateComplete;
    expect(clips(graph)).toHaveLength(0);
    expect(pops(graph)).toHaveLength(0);
    expect(remove).toHaveBeenCalledOnce();
    expect(changes.size).toBe(0);
  });

  it('composes the reveal with CurveFrame paths, dots and knots without changing the frame or labels', async () => {
    const graph = await makeGraph({ joy: { drawIn: true, ripple: true } });
    const pieces = curvePieces([
      { lightener: 0, target: 0 },
      { lightener: 50, target: 10 },
      { lightener: 100, target: 45 },
    ]);
    const knots: ControlPoint[] = [
      { lightener: 0, target: 0 },
      { lightener: 50, target: 10 },
      { lightener: 100, target: 45 },
    ];
    const frame: CurveFrame = { entityId: 'light.l0', pieces, knots };
    graph.curveFrame = frame;
    graph.scrubberPosition = 30;
    graph.selectedCurveId = 'light.l0';
    await graph.updateComplete;
    hitCircle(graph, 0, 1).dispatchEvent(pointer('pointerenter'));
    await start(graph);
    expect(graph.shadowRoot!.querySelector('.curve-line')!.getAttribute('d')).toBe(
      buildPiecesPath(pieces)
    );
    expect(
      graph.shadowRoot!.querySelector('path[fill^="url(#grad-"]')!.getAttribute('d')
    ).toContain(buildPiecesPath(pieces));
    const child = pops(graph)[1].querySelector('.control-point')!;
    expect(markerY(child)).toBe(toSvgY(10));
    expect(Number(hitCircle(graph, 0, 1).getAttribute('cy'))).toBe(toSvgY(10));
    expect(hitCircle(graph, 0, 1).getAttribute('aria-label')).toContain('to 50% light brightness');
    expect(graph.shadowRoot!.querySelector('.tooltip-text')!.textContent).toBe(
      'Group 50% -> Light 50%'
    );
    expect(
      Number(graph.shadowRoot!.querySelector('.scrubber-dot')!.getAttribute('cy'))
    ).toBeCloseTo(toSvgY(piecesHeightAt(pieces, 30)), 6);
    await advance(graph, 250);
    expect(graph.curveFrame).toBe(frame);
    graph.drawIn = null;
    await graph.updateComplete;
    expect(graph.shadowRoot!.querySelector('.curve-line')!.getAttribute('d')).toBe(
      buildPiecesPath(pieces)
    );
  });
});
