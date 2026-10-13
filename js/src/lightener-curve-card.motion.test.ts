// @vitest-environment jsdom

/**
 * The card's side of the opt-in "joy" moments: the `joy:` config key is read
 * into per-moment flags and handed to the graph, and the card runs the ripple
 * that draws a shape change point by point. Ripple frames come from Vitest's
 * fake requestAnimationFrame and performance.now.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { CurveGraph } from './components/curve-graph.js';
import type { ControlPoint, CurvePiece, DrawIn, Hass, LightCurve } from './utils/types.js';
import { JOY_DEFAULTS, REDUCED_MOTION_QUERY, blendPieces, drawnShape } from './utils/motion.js';
import {
  easeOutCubic,
  piecesHeightAt,
  sampleRenderedCurveAt,
  toSvgX,
  toSvgY,
} from './utils/graph-math.js';
import { CURVE_PRESETS } from './utils/presets.js';

let reducedMotion = false;

beforeAll(async () => {
  (window as unknown as { matchMedia: (q: string) => MediaQueryList }).matchMedia = (
    query: string
  ) =>
    ({
      matches: query === REDUCED_MOTION_QUERY && reducedMotion,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
  await import('./lightener-curve-card.js');
});

afterEach(() => {
  document.body.replaceChildren();
  sessionStorage.clear();
  vi.restoreAllMocks();
  reducedMotion = false;
});

type Entities = Record<string, { brightness: Record<string, string> }>;

function makeHass(entities: Entities = { 'light.a': { brightness: { '100': '100' } } }): Hass {
  return {
    user: { is_admin: true },
    callWS: vi.fn().mockResolvedValue({ entities }),
    callApi: vi.fn().mockResolvedValue(undefined),
    callService: vi.fn().mockResolvedValue(undefined),
    states: {
      'light.lightener': { state: 'on', attributes: { friendly_name: 'Lightener' } },
      'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
      'light.b': { state: 'on', attributes: { friendly_name: 'Bravo' } },
    },
  } as unknown as Hass;
}

async function mountCard(
  config: Record<string, unknown>,
  entities?: Entities
): Promise<LightenerCurveCard> {
  const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
  card.setConfig({ entity: 'light.lightener', ...config });
  card.hass = makeHass(entities);
  document.body.appendChild(card);
  await card.updateComplete;
  await Promise.resolve();
  await card.updateComplete;
  return card;
}

async function graphOf(card: LightenerCurveCard): Promise<CurveGraph> {
  const graph = card.shadowRoot!.querySelector('curve-graph') as CurveGraph;
  expect(graph).not.toBeNull();
  await graph.updateComplete;
  return graph;
}

describe('the joy config key reaches the graph', () => {
  it('keeps every moment off without a joy key', async () => {
    const graph = await graphOf(await mountCard({}));
    expect(graph.joy).toEqual(JOY_DEFAULTS);
  });

  it('turns settle on with joy: { settle: true }', async () => {
    const graph = await graphOf(await mountCard({ joy: { settle: true } }));
    expect(graph.joy.settle).toBe(true);
  });

  it('turns diagonal on with joy: { diagonal: true }, independent of settle', async () => {
    const graph = await graphOf(await mountCard({ joy: { diagonal: true } }));
    expect(graph.joy).toEqual({ ...JOY_DEFAULTS, diagonal: true });
  });

  it.each([[{ settle: 'yes' }], [true], [['settle']], [null]])(
    'keeps every moment off for joy: %j',
    async (joy) => {
      const graph = await graphOf(await mountCard({ joy }));
      expect(graph.joy).toEqual(JOY_DEFAULTS);
    }
  );

  it('follows a config change without reloading the light', async () => {
    const card = await mountCard({ joy: { settle: true } });
    const callWS = (card as unknown as { _hass: { callWS: ReturnType<typeof vi.fn> } })._hass
      .callWS;
    const loadsBefore = callWS.mock.calls.length;
    card.setConfig({ entity: 'light.lightener', joy: { settle: false } });
    await card.updateComplete;
    const graph = await graphOf(card);
    expect(graph.joy.settle).toBe(false);
    expect(callWS.mock.calls.length).toBe(loadsBefore);
  });
});

describe('ripple: a shape change ripples in', () => {
  type CardInternals = {
    _curves: LightCurve[];
    _undoStack: LightCurve[][];
    _selectedCurveId: string | null;
    _cancelRippleLoop: (() => void) | null;
    _ripple: unknown;
    _morphLine: unknown;
    _undo: () => void;
    _onCancel: () => void;
    _onPreviewToggle: () => void;
    _onSave: () => Promise<boolean>;
    _onMembershipApplied: (event: CustomEvent) => void;
    _drawIn: DrawIn | null;
    _drawInTimer: ReturnType<typeof setTimeout> | null;
    _originalCurves: LightCurve[];
    _isDirty: boolean;
    _hass: Hass;
    _cancelJoyEffects: () => void;
  };
  const internals = (card: LightenerCurveCard) => card as unknown as CardInternals;
  const preset = (id: string) => CURVE_PRESETS.find((p) => p.id === id)!.controlPoints;
  const LINEAR = preset('linear');
  const LATE = preset('late_starter');
  const DIM = preset('dim_accent');
  const LINEAR_LIGHT: Entities = { 'light.a': { brightness: { '1': '1', '100': '100' } } };
  const TWO_LIGHTS: Entities = {
    ...LINEAR_LIGHT,
    'light.b': { brightness: { '1': '1', '100': '100' } },
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Largest vertical gap, in SVG units (100% = 200 units), between drawn pieces and a shape. */
  function gapSvg(
    pieces: readonly CurvePiece[],
    other: readonly CurvePiece[] | readonly ControlPoint[]
  ): number {
    const height = (x: number) =>
      'x0' in (other[0] ?? {})
        ? piecesHeightAt(other as CurvePiece[], x)
        : sampleRenderedCurveAt([...(other as ControlPoint[])], x);
    let worst = 0;
    for (let x = 0; x <= 100; x += 0.5) {
      worst = Math.max(worst, Math.abs(piecesHeightAt(pieces, x) - height(x)));
    }
    return worst * 2;
  }

  function fireLegend(card: LightenerCurveCard, type: string, entityId: string): void {
    card
      .shadowRoot!.querySelector('curve-legend')!
      .dispatchEvent(
        new CustomEvent(type, { detail: { entityId }, bubbles: true, composed: true })
      );
  }

  async function settle(card: LightenerCurveCard): Promise<CurveGraph> {
    await card.updateComplete;
    const graph = await graphOf(card);
    await graph.updateComplete;
    return graph;
  }

  async function select(card: LightenerCurveCard, entityId: string): Promise<void> {
    if (internals(card)._selectedCurveId !== entityId) fireLegend(card, 'select-curve', entityId);
    await settle(card);
    expect(internals(card)._selectedCurveId, `${entityId} is selected`).toBe(entityId);
  }

  /** A card with light.a selected, so the shape chips show. */
  async function rippleCard(
    joy: Record<string, unknown> = { ripple: true },
    entities: Entities = LINEAR_LIGHT
  ): Promise<{ card: LightenerCurveCard; graph: CurveGraph }> {
    const card = await mountCard({ joy }, entities);
    await select(card, 'light.a');
    return { card, graph: await settle(card) };
  }

  async function choose(card: LightenerCurveCard, presetId: string): Promise<CurveGraph> {
    card
      .shadowRoot!.querySelector<HTMLButtonElement>(`.preset-option[data-preset="${presetId}"]`)!
      .click();
    return settle(card);
  }

  async function play(card: LightenerCurveCard, ms: number): Promise<CurveGraph> {
    vi.advanceTimersByTime(ms);
    return settle(card);
  }

  const pointsOf = (card: LightenerCurveCard, entityId = 'light.a') =>
    internals(card)._curves.find((c) => c.entityId === entityId)!.controlPoints;

  /** Lets the graph map pointer positions 1:1 to SVG units, as jsdom has no layout. */
  function stubSvg(graph: CurveGraph): SVGSVGElement {
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
    (svg as unknown as { setPointerCapture: () => void }).setPointerCapture = vi.fn();
    return svg;
  }

  const pointer = (type: string, init: PointerEventInit = {}) =>
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      ...init,
    });

  const hitCircle = (graph: CurveGraph, ci: number, pi: number) =>
    graph.shadowRoot!.querySelector(`.hit-circle[data-curve="${ci}"][data-point="${pi}"]`)!;

  it('turns ripple on with joy: { ripple: true }', async () => {
    const { graph } = await rippleCard();
    expect(graph.joy).toEqual({ ...JOY_DEFAULTS, ripple: true });
  });

  it('commits the exact shape at the click and draws the change from the old shape', async () => {
    const { card } = await rippleCard();
    const graph = await choose(card, 'late_starter');
    expect(pointsOf(card)).toEqual(LATE);
    expect(internals(card)._undoStack).toHaveLength(1);
    expect(card.dirty).toBe(true);
    const frame = graph.curveFrame!;
    expect(frame.entityId).toBe('light.a');
    expect(gapSvg(frame.pieces, LINEAR), 'the first frame is the old shape').toBeLessThan(1e-6);
    expect(frame.knots!.map((k) => k.lightener)).toEqual(LATE.map((p) => p.lightener));
    expect(frame.knots![3].target).toBeCloseTo(sampleRenderedCurveAt(LINEAR, 70), 6);
  });

  it('ripples from the left, ends on the new shape, then draws the data', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    const mid = (await play(card, 112)).curveFrame!;
    const progress = (k: number) => {
      const from = sampleRenderedCurveAt(LINEAR, LATE[k].lightener);
      return (mid.knots![k].target - from) / (LATE[k].target - from);
    };
    expect(progress(2)).toBeGreaterThan(progress(3));
    expect(progress(3)).toBeGreaterThan(0);
    expect(progress(2)).toBeLessThan(1);
    for (const k of mid.knots!.slice(1)) {
      expect(piecesHeightAt(mid.pieces, k.lightener)).toBeCloseTo(k.target, 6);
    }

    const last = (await play(card, 256)).curveFrame!;
    expect(gapSvg(last.pieces, LATE), 'the last frame is the new shape').toBeLessThan(0.5);
    const done = await play(card, 32);
    expect(done.curveFrame).toBeNull();
    expect(internals(card)._cancelRippleLoop).toBeNull();
    expect(done.curves[0].controlPoints).toEqual(LATE);
  });

  it('leaves the data, undo, dirty state and live lights exactly as with the flag off', async () => {
    const run = async (joy: Record<string, unknown>) => {
      const { card } = await rippleCard(joy);
      internals(card)._onPreviewToggle();
      await play(card, 16);
      const callService = (card as unknown as { _hass: { callService: ReturnType<typeof vi.fn> } })
        ._hass.callService;
      callService.mockClear();
      await choose(card, 'dim_accent');
      await play(card, 16);
      return { card, calls: callService.mock.calls };
    };
    const on = await run({ ripple: true });
    const off = await run({});
    expect(on.calls.length, 'the lights get the new shape').toBeGreaterThan(0);
    expect(on.calls).toEqual(off.calls);
    expect(internals(on.card)._curves).toEqual(internals(off.card)._curves);
    expect(internals(on.card)._undoStack).toEqual(internals(off.card)._undoStack);
    expect(on.card.dirty).toBe(off.card.dirty);
    expect((await graphOf(off.card)).curveFrame).toBeNull();
  });

  it('a drag mid-ripple lands under the pointer, ends the ripple, and undoes in two steps', async () => {
    const { card } = await rippleCard();
    let graph = await choose(card, 'late_starter');
    graph = await play(card, 64);
    expect(pointsOf(card), 'no in-between value in the data').toEqual(LATE);
    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 3, lightener: 70, target: 60 },
        bubbles: true,
        composed: true,
      })
    );
    graph.dispatchEvent(
      new CustomEvent('point-drop', {
        detail: { curveIndex: 0, pointIndex: 3 },
        bubbles: true,
        composed: true,
      })
    );
    graph = await settle(card);
    expect(pointsOf(card)).toEqual(
      LATE.map((p, i) => (i === 3 ? { lightener: 70, target: 60 } : p))
    );
    expect(graph.curveFrame).toBeNull();

    internals(card)._undo();
    await play(card, 320);
    expect(pointsOf(card)).toEqual(LATE);
    internals(card)._undo();
    await play(card, 320);
    expect(pointsOf(card)).toEqual(LINEAR);
  });

  it('a new shape mid-ripple continues from the frame on screen and keeps going', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    const onScreen = (await play(card, 144)).curveFrame!.pieces;
    let graph = await choose(card, 'dim_accent');
    expect(gapSvg(graph.curveFrame!.pieces, onScreen)).toBeLessThan(1e-9);
    expect(pointsOf(card)).toEqual(DIM);
    expect(internals(card)._undoStack).toHaveLength(2);

    graph = await play(card, 32);
    const f = graph.curveFrame!;
    for (const k of f.knots!.slice(1)) {
      expect(piecesHeightAt(f.pieces, k.lightener)).toBeCloseTo(k.target, 6);
    }
    expect(gapSvg(f.pieces, onScreen), 'moving on from there').toBeGreaterThan(0);
    expect(gapSvg(f.pieces, DIM), 'not there yet').toBeGreaterThan(0.5);
    graph = await play(card, 448);
    expect(graph.curveFrame).toBeNull();
    expect(graph.curves[0].controlPoints).toEqual(DIM);
  });

  it('goes back from the shape on screen when Equal is chosen again mid-ripple', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    const onScreen = (await play(card, 304)).curveFrame!.pieces;
    let graph = await choose(card, 'linear');
    expect(gapSvg(graph.curveFrame!.pieces, onScreen)).toBeLessThan(1e-9);
    expect(gapSvg(onScreen, LINEAR), 'there is a way back to ripple').toBeGreaterThan(5);
    graph = await play(card, 448);
    expect(graph.curveFrame).toBeNull();
    expect(pointsOf(card)).toEqual(LINEAR);
  });

  it('a click on the shape already applied lets the ripple finish', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    const before = (await play(card, 96)).curveFrame!.pieces;
    let graph = await choose(card, 'late_starter');
    expect(graph.curveFrame!.pieces).toEqual(before);
    graph = await play(card, 48);
    expect(gapSvg(graph.curveFrame!.pieces, before)).toBeGreaterThan(0);
    expect(internals(card)._undoStack).toHaveLength(1);
  });

  it.each<[string, (card: LightenerCurveCard) => void]>([
    ['undo', (card) => internals(card)._undo()],
    ['cancel', (card) => internals(card)._onCancel()],
  ])(
    '%s mid-ripple draws on steadily from the frame on screen and lands on the old shape',
    async (_name, act) => {
      const { card } = await rippleCard();
      await choose(card, 'late_starter');
      const onScreen = (await play(card, 144)).curveFrame!.pieces;
      act(card);
      let graph = await settle(card);
      expect(gapSvg(graph.curveFrame!.pieces, onScreen)).toBeLessThan(1e-9);
      expect(graph.readOnly).toBe(true);
      const gaps = [gapSvg(graph.curveFrame!.pieces, LINEAR)];
      for (let i = 0; i < 18; i++) {
        graph = await play(card, 16);
        if (!graph.curveFrame) break;
        gaps.push(gapSvg(graph.curveFrame.pieces, LINEAR));
      }
      for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1] + 1e-9);
      expect(gaps[1], 'it moves from the first frame on').toBeLessThan(gaps[0]);
      expect(gaps[1], 'and eases out instead of jumping').toBeGreaterThan(gaps[0] * 0.3);
      graph = await play(card, 64);
      expect(graph.curveFrame).toBeNull();
      expect(pointsOf(card)).toEqual(LINEAR);
    }
  );

  it('an undo frame stamped before the undo still starts from the frame on screen', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    const onScreen = (await play(card, 144)).curveFrame!.pieces;
    let firstTick = null as FrameRequestCallback | null;
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementationOnce((cb) => {
      firstTick = cb;
      return 0;
    });
    internals(card)._undo();
    raf.mockRestore();
    // Browsers stamp a frame with its start time, which can precede the click.
    firstTick!(performance.now() - 8);
    let graph = await settle(card);
    expect(gapSvg(graph.curveFrame!.pieces, onScreen)).toBeLessThan(1e-9);
    graph = await play(card, 320);
    expect(graph.curveFrame).toBeNull();
    expect(pointsOf(card)).toEqual(LINEAR);
  });

  it('undo with no ripple running starts from the data, as before', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    await play(card, 448);
    internals(card)._undo();
    let graph = await settle(card);
    expect(graph.curveFrame).toBeNull();
    graph = await play(card, 160);
    expect(graph.curveFrame).toBeNull();
    await play(card, 160);
    expect(pointsOf(card)).toEqual(LINEAR);
  });

  it('removing the card mid-undo leaves no frame behind', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    await play(card, 144);
    internals(card)._undo();
    await play(card, 32);
    card.remove();
    expect(internals(card)._morphLine).toBeNull();
    expect((card as unknown as { _curveFrame: unknown })._curveFrame).toBeNull();
  });

  it('ripples the light that is selected, not only the first one', async () => {
    const { card } = await rippleCard(
      { ripple: true },
      { ...TWO_LIGHTS, 'light.a': { brightness: { '1': '1', '50': '20', '100': '45' } } }
    );
    await select(card, 'light.b');
    const aBefore = pointsOf(card, 'light.a');
    let graph = await choose(card, 'late_starter');
    expect(graph.curveFrame?.entityId).toBe('light.b');
    expect(gapSvg(graph.curveFrame!.pieces, LINEAR)).toBeLessThan(1e-6);
    expect(pointsOf(card, 'light.b')).toEqual(LATE);
    expect(pointsOf(card, 'light.a'), 'light.a is left alone').toBe(aBefore);
    graph = await play(card, 112);
    expect(gapSvg(graph.curveFrame!.pieces, LATE)).toBeGreaterThan(0.5);
    internals(card)._undo();
    graph = await settle(card);
    expect(graph.curveFrame?.entityId).toBe('light.b');
    graph = await play(card, 288);
    expect(
      gapSvg(graph.curveFrame!.pieces, LINEAR),
      "heading for light.b's own shape"
    ).toBeLessThan(1);
    await play(card, 112);
    expect(pointsOf(card, 'light.b')).toEqual(LINEAR);
  });

  it("a shape for another light mid-ripple starts from that light's own curve", async () => {
    const { card } = await rippleCard({ ripple: true }, TWO_LIGHTS);
    await choose(card, 'late_starter');
    await play(card, 64);
    await select(card, 'light.b');
    const graph = await choose(card, 'dim_accent');
    expect(graph.curveFrame?.entityId).toBe('light.b');
    expect(gapSvg(graph.curveFrame!.pieces, LINEAR)).toBeLessThan(1e-6);
    expect(graph.curves[0].controlPoints, 'light.a lands on its new shape').toEqual(LATE);
  });

  it('keeps rippling when another light is hidden', async () => {
    const { card } = await rippleCard({ ripple: true }, TWO_LIGHTS);
    await choose(card, 'late_starter');
    await play(card, 48);
    fireLegend(card, 'toggle-curve', 'light.b');
    expect(internals(card)._curves.find((c) => c.entityId === 'light.b')!.visible).toBe(false);
    const graph = await play(card, 48);
    expect(graph.curveFrame?.entityId).toBe('light.a');
  });

  it('keeps rippling when another light is selected', async () => {
    const { card } = await rippleCard({ ripple: true }, TWO_LIGHTS);
    await choose(card, 'late_starter');
    await play(card, 48);
    await select(card, 'light.b');
    const graph = await play(card, 48);
    expect(graph.curveFrame?.entityId).toBe('light.a');
  });

  it.each<[string, (card: LightenerCurveCard, graph: CurveGraph) => void]>([
    [
      'an added point',
      (_card, graph) =>
        graph.dispatchEvent(
          new CustomEvent('point-add', {
            detail: { lightener: 30, target: 30, entityId: 'light.a' },
            bubbles: true,
            composed: true,
          })
        ),
    ],
    [
      'a removed point',
      (_card, graph) =>
        graph.dispatchEvent(
          new CustomEvent('point-remove', {
            detail: { curveIndex: 0, pointIndex: 2 },
            bubbles: true,
            composed: true,
          })
        ),
    ],
    [
      'new lights from the membership editor',
      (card) =>
        internals(card)._onMembershipApplied(
          new CustomEvent('membership-applied', {
            detail: { entities: LINEAR_LIGHT, added_entity_ids: [] },
          })
        ),
    ],
  ])('ends at once on %s for that light', async (_name, act) => {
    const { card } = await rippleCard();
    const graph = await choose(card, 'late_starter');
    act(card, graph);
    expect((await settle(card)).curveFrame).toBeNull();
    await play(card, 16);
    expect(internals(card)._cancelRippleLoop).toBeNull();
  });

  it('keeps rippling when the same config is sent again with the flag on', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    await play(card, 64);
    card.setConfig({ entity: 'light.lightener', joy: { ripple: true }, title: 'Renamed' });
    expect(internals(card)._cancelRippleLoop).not.toBeNull();
    expect((await play(card, 48)).curveFrame?.entityId).toBe('light.a');
  });

  it("a press on one of the light's points ends it, so the drag starts from the real point", async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    let graph = await play(card, 64);
    stubSvg(graph);
    hitCircle(graph, 0, 3).dispatchEvent(pointer('pointerdown'));
    graph = await settle(card);
    expect(graph.curveFrame).toBeNull();
    expect(internals(card)._cancelRippleLoop).toBeNull();
    expect(pointsOf(card), 'a press alone changes no data').toEqual(LATE);
  });

  it('a right-click on one of its points lets it run, as it starts no drag', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    let graph = await play(card, 64);
    stubSvg(graph);
    hitCircle(graph, 0, 3).dispatchEvent(pointer('pointerdown', { button: 2 }));
    graph = await play(card, 32);
    expect(graph.curveFrame?.entityId).toBe('light.a');
    expect(internals(card)._cancelRippleLoop).not.toBeNull();
  });

  it("a press on another light's point lets it run", async () => {
    const { card } = await rippleCard({ ripple: true }, TWO_LIGHTS);
    await choose(card, 'late_starter');
    fireLegend(card, 'select-curve', 'light.a');
    let graph = await play(card, 64);
    expect(internals(card)._selectedCurveId, 'no light selected, so every point shows').toBeNull();
    stubSvg(graph);
    hitCircle(graph, 1, 1).dispatchEvent(pointer('pointerdown'));
    graph = await play(card, 32);
    expect(graph.curveFrame?.entityId).toBe('light.a');
  });

  it('a press elsewhere in the graph lets it run', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    let graph = await play(card, 64);
    const svg = stubSvg(graph);
    svg.dispatchEvent(pointer('pointerdown'));
    graph = await play(card, 32);
    expect(graph.curveFrame?.entityId).toBe('light.a');
  });

  it('a drag that ends a ripple settles on release, like any drag', async () => {
    const { card } = await rippleCard({ ripple: true, settle: true });
    await choose(card, 'late_starter');
    let graph = await play(card, 64);
    const svg = stubSvg(graph);
    hitCircle(graph, 0, 3).dispatchEvent(pointer('pointerdown'));
    svg.dispatchEvent(pointer('pointermove', { clientX: toSvgX(70), clientY: toSvgY(60) }));
    await settle(card);
    svg.dispatchEvent(pointer('pointerup'));
    graph = await settle(card);
    expect(pointsOf(card)[3]).toEqual({ lightener: 70, target: 60 });
    expect(graph.curveFrame).toBeNull();
    await play(card, 32);
    const settleState = (graph as unknown as { _settle: { point: number; dy: number } | null })
      ._settle;
    expect(settleState?.point).toBe(3);
    expect(settleState!.dy, 'up from 45%, so it overshoots up').toBeLessThan(0);
  });

  it('saving mid-ripple saves the exact new shape, as with the flag off', async () => {
    const saved = async (joy: Record<string, unknown>) => {
      const { card } = await rippleCard(joy);
      await choose(card, 'late_starter');
      await play(card, 64);
      await internals(card)._onSave();
      const callWS = (card as unknown as { _hass: { callWS: ReturnType<typeof vi.fn> } })._hass
        .callWS;
      return callWS.mock.calls.find(([msg]) => msg.type === 'lightener/save_curves')?.[0];
    };
    const on = await saved({ ripple: true });
    expect(on, 'a save went out').toBeDefined();
    expect(on).toEqual(await saved({}));
  });

  it.each<[string, (card: LightenerCurveCard) => void]>([
    ['undo', (card) => internals(card)._undo()],
    ['cancel', (card) => internals(card)._onCancel()],
  ])("%s mid-ripple draws the line at the undo animation's own pace", async (_name, act) => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    const onScreen = (await play(card, 144)).curveFrame!.pieces;
    const target = drawnShape(LINEAR).pieces;
    act(card);
    await settle(card);
    let elapsed = 0;
    for (const to of [16, 48, 96, 160, 224]) {
      const graph = await play(card, to - elapsed);
      elapsed = to;
      const expected = blendPieces(onScreen, target, easeOutCubic(elapsed / 300));
      expect(gapSvg(graph.curveFrame!.pieces, expected), `at ${elapsed}ms`).toBeLessThan(1e-9);
    }
  });

  it.each([
    ['the flag off', { ripple: false }, false],
    ['reduced motion', { ripple: true }, true],
  ])('with %s a chip click computes no ripple geometry', async (_name, joy, reduce) => {
    reducedMotion = reduce;
    const { card } = await rippleCard(joy);
    const read = vi.spyOn(card as unknown as { _shownShape: () => unknown }, '_shownShape');
    const graph = await choose(card, 'late_starter');
    expect(read).not.toHaveBeenCalled();
    expect(graph.curveFrame).toBeNull();
    expect(pointsOf(card)).toEqual(LATE);
  });

  it('applies the shape at once under reduced motion', async () => {
    reducedMotion = true;
    const { card } = await rippleCard();
    const graph = await choose(card, 'late_starter');
    expect(graph.curveFrame).toBeNull();
    expect(pointsOf(card)).toEqual(LATE);
  });

  it('stops at the next frame when reduced motion comes on mid-ripple', async () => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    reducedMotion = true;
    const graph = await play(card, 16);
    expect(graph.curveFrame).toBeNull();
    expect(internals(card)._cancelRippleLoop).toBeNull();
  });

  it.each<[string, (card: LightenerCurveCard) => void]>([
    ['the card is removed', (card) => card.remove()],
    [
      'the card switches to another group',
      (card) => card.setConfig({ entity: 'light.other', joy: { ripple: true } }),
    ],
    ['the flag turns off', (card) => card.setConfig({ entity: 'light.lightener', joy: {} })],
  ])('ends when %s', async (_name, act) => {
    const { card } = await rippleCard();
    await choose(card, 'late_starter');
    act(card);
    expect(internals(card)._cancelRippleLoop).toBeNull();
    expect(internals(card)._ripple).toBeNull();
    vi.advanceTimersByTime(500);
    expect(internals(card)._ripple, 'no frame brings it back').toBeNull();
  });

  it('starts the origin marker at its own floor', async () => {
    const { card } = await rippleCard(
      { ripple: true },
      { 'light.a': { brightness: { '0': '12', '100': '100' } } }
    );
    const graph = await choose(card, 'linear');
    expect(graph.curveFrame!.knots![0]).toEqual({ lightener: 0, target: 12 });
  });

  describe('drawIn: added lights draw themselves', () => {
    const THREE_LIGHTS: Entities = {
      ...TWO_LIGHTS,
      'light.c': { brightness: { '1': '1', '100': '100' } },
    };

    beforeEach(() => {
      vi.useFakeTimers({
        toFake: [
          'requestAnimationFrame',
          'cancelAnimationFrame',
          'performance',
          'setTimeout',
          'clearTimeout',
        ],
      });
    });

    async function applyMembers(
      card: LightenerCurveCard,
      entities: Entities,
      added: string[] = []
    ): Promise<CurveGraph> {
      internals(card)._onMembershipApplied(
        new CustomEvent('membership-applied', {
          detail: { entities, added_entity_ids: added },
        })
      );
      return settle(card);
    }

    it('animates only actual additions and keeps membership data committed and clean', async () => {
      const card = await mountCard({ joy: { drawIn: true } }, LINEAR_LIGHT);
      const graph = await applyMembers(card, THREE_LIGHTS, ['light.b', 'light.c']);
      expect(graph.drawIn?.ids).toEqual(new Set(['light.b', 'light.c']));
      expect(graph.selectedCurveId).toBe('light.b');
      expect(internals(card)._curves).toEqual(internals(card)._originalCurves);
      expect(internals(card)._isDirty).toBe(false);
      expect(internals(card)._undoStack).toEqual([]);
      expect(graph.shadowRoot!.querySelectorAll('.marker-pop')).toHaveLength(3);
      expect((internals(card)._hass.callWS as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    });

    it('uses before/after IDs rather than trusting the reported additions', async () => {
      const card = await mountCard({ joy: { drawIn: true } }, LINEAR_LIGHT);
      const graph = await applyMembers(card, TWO_LIGHTS, ['light.a', 'light.missing']);
      expect(graph.drawIn?.ids).toEqual(new Set(['light.b']));
    });

    it.each([
      ['the flag is off', {}, false],
      ['reduced motion is on', { drawIn: true }, true],
    ])('appears immediately when %s', async (_name, joy, reduce) => {
      reducedMotion = reduce;
      const card = await mountCard({ joy }, LINEAR_LIGHT);
      const graph = await applyMembers(card, TWO_LIGHTS, ['light.b']);
      expect(graph.drawIn).toBeNull();
      expect(internals(card)._drawInTimer).toBeNull();
      expect(graph.shadowRoot!.querySelector('.draw-in-clip, .marker-pop')).toBeNull();
    });

    it('does nothing for removed-only and unchanged membership', async () => {
      const card = await mountCard({ joy: { drawIn: true } }, TWO_LIGHTS);
      expect((await applyMembers(card, LINEAR_LIGHT)).drawIn).toBeNull();
      expect((await applyMembers(card, LINEAR_LIGHT)).drawIn).toBeNull();
      expect(internals(card)._drawInTimer).toBeNull();
    });

    it('cleans up at 1200ms even when no animation frame runs', async () => {
      vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1234);
      const card = await mountCard({ joy: { drawIn: true } }, LINEAR_LIGHT);
      await applyMembers(card, TWO_LIGHTS, ['light.b']);
      await play(card, 1199);
      expect(internals(card)._drawIn).not.toBeNull();
      const graph = await play(card, 1);
      expect(graph.drawIn).toBeNull();
      expect(graph.shadowRoot!.querySelector('.draw-in-clip, .marker-pop')).toBeNull();
      expect(internals(card)._drawInTimer).toBeNull();
    });

    it('an older cleanup callback cannot clear a newer membership effect', async () => {
      const timeout = vi.spyOn(window, 'setTimeout');
      const card = await mountCard({ joy: { drawIn: true } }, LINEAR_LIGHT);
      await applyMembers(card, TWO_LIGHTS, ['light.b']);
      const oldCallback = timeout.mock.calls.find(([, delay]) => delay === 1200)![0];
      await play(card, 300);
      const graph = await applyMembers(card, THREE_LIGHTS, ['light.c']);
      const newerToken = graph.drawIn!.token;
      (oldCallback as () => void)();
      expect(internals(card)._drawIn?.token).toBe(newerToken);
      await play(card, 1199);
      expect(internals(card)._drawIn?.token).toBe(newerToken);
      expect((await play(card, 1)).drawIn).toBeNull();
    });

    it.each(['pointerdown', 'keydown'])(
      '%s cancels before descendant handlers without blocking input',
      async (type) => {
        const card = await mountCard({ joy: { drawIn: true } }, LINEAR_LIGHT);
        const graph = await applyMembers(card, TWO_LIGHTS, ['light.b']);
        const event =
          type === 'pointerdown'
            ? pointer(type, { cancelable: true })
            : new KeyboardEvent(type, {
                key: 'Shift',
                bubbles: true,
                composed: true,
                cancelable: true,
              });
        const cancel = vi.spyOn(event, 'preventDefault');
        const stop = vi.spyOn(event, 'stopPropagation');
        // Dispatch from a plain descendant so only the card boundary handles this input.
        const descendant = document.createElement('span');
        graph.shadowRoot!.append(descendant);
        let reached = false;
        descendant.addEventListener(type, () => {
          reached = true;
          expect(internals(card)._drawIn).toBeNull();
        });
        descendant.dispatchEvent(event);
        expect(reached).toBe(true);
        expect(cancel).not.toHaveBeenCalled();
        expect(stop).not.toHaveBeenCalled();
        expect((await settle(card)).drawIn).toBeNull();
      }
    );

    it('a point can be edited while it is still drawing in, using committed values', async () => {
      const card = await mountCard({ joy: { drawIn: true, settle: true } }, LINEAR_LIGHT);
      const graph = await applyMembers(card, TWO_LIGHTS, ['light.b']);
      stubSvg(graph);
      hitCircle(graph, 1, 2).dispatchEvent(
        pointer('pointerdown', { clientX: toSvgX(100), clientY: toSvgY(100) })
      );
      expect(internals(card)._drawIn).toBeNull();
      graph
        .shadowRoot!.querySelector('svg')!
        .dispatchEvent(pointer('pointermove', { clientX: toSvgX(100), clientY: toSvgY(60) }));
      await settle(card);
      expect(pointsOf(card, 'light.b')[2].target).toBe(60);
      expect(internals(card)._undoStack).toHaveLength(1);
      graph.shadowRoot!.querySelector('svg')!.dispatchEvent(pointer('pointerup'));
    });

    it('the shared boundary ends draw-in while a shape starts and continues its own ripple', async () => {
      const card = await mountCard({ joy: { drawIn: true, ripple: true } }, LINEAR_LIGHT);
      await applyMembers(card, TWO_LIGHTS, ['light.b']);
      const button = card.shadowRoot!.querySelector('.preset-option[data-preset="late_starter"]')!;
      button.dispatchEvent(pointer('pointerdown'));
      const graph = await choose(card, 'late_starter');
      expect(graph.drawIn).toBeNull();
      expect(graph.curveFrame?.entityId).toBe('light.b');
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true }));
      await play(card, 64);
      expect((await settle(card)).curveFrame?.entityId).toBe('light.b');
    });

    it('the same config preserves draw-in, and reconnect installs the boundary once', async () => {
      const card = await mountCard({ joy: { drawIn: true } }, LINEAR_LIGHT);
      await applyMembers(card, TWO_LIGHTS, ['light.b']);
      const token = internals(card)._drawIn!.token;
      card.setConfig({ entity: 'light.lightener', joy: { drawIn: true }, title: 'Renamed' });
      expect((await settle(card)).drawIn?.token).toBe(token);
      card.remove();
      document.body.append(card);
      await card.updateComplete;
      await Promise.resolve();
      await settle(card);
      await applyMembers(card, THREE_LIGHTS, ['light.c']);
      const cancel = vi.spyOn(internals(card), '_cancelJoyEffects');
      card.dispatchEvent(pointer('pointerdown'));
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(internals(card)._drawIn).toBeNull();
    });

    it.each<[string, (card: LightenerCurveCard) => void]>([
      ['disconnect', (card) => card.remove()],
      ['entity switch', (card) => card.setConfig({ entity: 'light.other', joy: { drawIn: true } })],
      ['flag disable', (card) => card.setConfig({ entity: 'light.lightener', joy: {} })],
    ])('clears state and the timer on %s without resurrecting the effect', async (_name, act) => {
      const card = await mountCard({ joy: { drawIn: true } }, LINEAR_LIGHT);
      await applyMembers(card, TWO_LIGHTS, ['light.b']);
      act(card);
      expect(internals(card)._drawIn).toBeNull();
      expect(internals(card)._drawInTimer).toBeNull();
      vi.advanceTimersByTime(1500);
      expect(internals(card)._drawIn).toBeNull();
    });
  });
});
