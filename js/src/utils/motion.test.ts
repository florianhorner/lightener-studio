// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { easeOutCubic, piecesHeightAt, sampleRenderedCurveAt } from './graph-math.js';
import { CURVE_PRESETS } from './presets.js';
import type { ControlPoint, CurvePiece } from './types.js';
import {
  type DiagonalHit,
  JOY_DEFAULTS,
  JOY_MOMENTS,
  SETTLE_OVERSHOOT,
  SETTLE_RISE_MS,
  SETTLE_TOTAL_MS,
  onReducedMotionStart,
  prefersReducedMotion,
  resolveJoyFlags,
  settleOffset,
  startFrameLoop,
  tapOnCoarsePointer,
  trackDiagonalHit,
  RIPPLE_POINT_MS,
  RIPPLE_STAGGER_BUDGET_MS,
  RIPPLE_STAGGER_MS,
  blendPieces,
  drawnShape,
  DRAW_IN_CLEAR_MS,
  DRAW_IN_POP_MS,
  DRAW_IN_REVEAL_MS,
  DRAW_IN_STAGGER_MS,
  drawInClearMs,
  momentPlays,
  rippleDurationMs,
  rippleFrame,
  rippleKnots,
  rippleSpan,
} from './motion.js';

describe('resolveJoyFlags', () => {
  it('turns every moment off by default', () => {
    expect(JOY_MOMENTS).toContain('settle');
    for (const moment of JOY_MOMENTS) expect(JOY_DEFAULTS[moment]).toBe(false);
  });

  it.each([undefined, null, true, false, 'settle', 42, ['settle']])(
    'keeps the defaults for a joy value of %j',
    (raw) => {
      expect(resolveJoyFlags(raw)).toEqual(JOY_DEFAULTS);
    }
  );

  it('turns on a moment set to true', () => {
    expect(resolveJoyFlags({ settle: true }).settle).toBe(true);
    expect(resolveJoyFlags({ diagonal: true })).toEqual({ ...JOY_DEFAULTS, diagonal: true });
    expect(resolveJoyFlags({ ripple: true })).toEqual({ ...JOY_DEFAULTS, ripple: true });
    expect(resolveJoyFlags({ draw_in: true })).toEqual({ ...JOY_DEFAULTS, draw_in: true });
  });

  it('reads an explicit false as off', () => {
    expect(resolveJoyFlags({ settle: false }).settle).toBe(false);
  });

  it('ignores values that are not booleans and moments it does not know', () => {
    const flags = resolveJoyFlags({ settle: 'yes', sparkle: true });
    expect(flags).toEqual(JOY_DEFAULTS);
    expect(flags).not.toHaveProperty('sparkle');
  });

  it('returns a frozen result', () => {
    expect(Object.isFrozen(resolveJoyFlags({ settle: true }))).toBe(true);
    expect(Object.isFrozen(JOY_DEFAULTS)).toBe(true);
  });
});

describe('drawInClearMs', () => {
  it('keeps the default cleanup floor for short curves', () => {
    expect(drawInClearMs(1)).toBe(DRAW_IN_CLEAR_MS);
    expect(drawInClearMs(14)).toBe(DRAW_IN_CLEAR_MS);
  });

  it('waits for the last point pop on long curves', () => {
    const pointCount = 15;
    expect(drawInClearMs(pointCount)).toBe(
      DRAW_IN_REVEAL_MS + (pointCount - 1) * DRAW_IN_STAGGER_MS + DRAW_IN_POP_MS
    );
    expect(drawInClearMs(pointCount)).toBeGreaterThan(DRAW_IN_CLEAR_MS);
  });

  it('handles missing and non-finite point counts safely', () => {
    expect(drawInClearMs(0)).toBe(DRAW_IN_CLEAR_MS);
    expect(drawInClearMs(-2)).toBe(DRAW_IN_CLEAR_MS);
    expect(drawInClearMs(Number.NaN)).toBe(DRAW_IN_CLEAR_MS);
  });
});

describe('prefersReducedMotion', () => {
  const original = window.matchMedia;

  afterEach(() => {
    window.matchMedia = original;
  });

  it('is false when the browser has no matchMedia', () => {
    (window as unknown as { matchMedia: unknown }).matchMedia = undefined;
    expect(prefersReducedMotion()).toBe(false);
  });

  it.each([true, false])('returns the answer of the reduced-motion query (%s)', (matches) => {
    const matchMedia = vi.fn((query: string) => ({ matches, media: query }));
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(matches);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });
});

describe('onReducedMotionStart', () => {
  const original = window.matchMedia;

  afterEach(() => {
    window.matchMedia = original;
  });

  it('does nothing, and unsubscribes safely, when the browser has no matchMedia', () => {
    (window as unknown as { matchMedia: unknown }).matchMedia = undefined;
    const onReduce = vi.fn();
    expect(() => onReducedMotionStart(onReduce)()).not.toThrow();
    expect(onReduce).not.toHaveBeenCalled();
  });

  it('calls back only when reduced motion turns on, until unsubscribed', () => {
    const listeners = new Set<(event: { matches: boolean }) => void>();
    const matchMedia = vi.fn(() => ({
      addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
        listeners.delete(listener),
    }));
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const onReduce = vi.fn();
    const unsubscribe = onReducedMotionStart(onReduce);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    for (const listener of [...listeners]) listener({ matches: false });
    expect(onReduce).not.toHaveBeenCalled();
    for (const listener of [...listeners]) listener({ matches: true });
    expect(onReduce).toHaveBeenCalledOnce();
    unsubscribe();
    expect(listeners.size).toBe(0);
  });

  it("listens for 'change' and removes that same listener", () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    window.matchMedia = vi.fn(() => ({
      addEventListener,
      removeEventListener,
    })) as unknown as typeof window.matchMedia;
    const unsubscribe = onReducedMotionStart(vi.fn());
    expect(addEventListener).toHaveBeenCalledOnce();
    const [type, listener] = addEventListener.mock.calls[0];
    expect(type).toBe('change');
    expect(removeEventListener).not.toHaveBeenCalled();
    unsubscribe();
    expect(removeEventListener).toHaveBeenCalledOnce();
    expect(removeEventListener.mock.calls[0][0]).toBe('change');
    expect(removeEventListener.mock.calls[0][1]).toBe(listener);
  });
});

describe('momentPlays', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });
  const reduced = (matches: boolean) => {
    window.matchMedia = ((query: string) => ({
      matches,
      media: query,
    })) as unknown as typeof window.matchMedia;
  };

  it('plays a moment whose flag is on', () => {
    reduced(false);
    expect(momentPlays({ ...JOY_DEFAULTS, ripple: true }, 'ripple')).toBe(true);
  });

  it('never plays a moment whose flag is off', () => {
    reduced(false);
    expect(momentPlays(JOY_DEFAULTS, 'ripple')).toBe(false);
  });

  it('never plays under reduced motion', () => {
    reduced(true);
    expect(momentPlays({ ...JOY_DEFAULTS, settle: true }, 'settle')).toBe(false);
  });
});

describe('startFrameLoop', () => {
  let now = 0;
  let nextHandle = 1;
  let queued = new Map<number, FrameRequestCallback>();
  const cancelled: number[] = [];

  beforeEach(() => {
    now = 1000;
    nextHandle = 1;
    queued = new Map();
    cancelled.length = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const handle = nextHandle++;
      queued.set(handle, callback);
      return handle;
    });
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
      cancelled.push(handle);
      queued.delete(handle);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function advance(ms: number, frameTime = now + ms): void {
    now += ms;
    const callbacks = [...queued.values()];
    queued.clear();
    for (const callback of callbacks) callback(frameTime);
  }

  it('reports elapsed time on each frame, then finishes once at the duration', () => {
    const frames: number[] = [];
    const onDone = vi.fn();
    startFrameLoop(100, (elapsed) => frames.push(elapsed), onDone);

    advance(16);
    advance(40);
    expect(frames).toEqual([16, 56]);
    expect(onDone).not.toHaveBeenCalled();

    advance(44);
    expect(frames).toEqual([16, 56]);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(queued.size).toBe(0);
  });

  it('never reports negative time when a frame timestamp predates the start', () => {
    const frames: number[] = [];
    startFrameLoop(100, (elapsed) => frames.push(elapsed));
    advance(0, now - 5);
    expect(frames).toEqual([0]);
  });

  it('cancel() stops further frames and skips onDone', () => {
    const frames: number[] = [];
    const onDone = vi.fn();
    const cancel = startFrameLoop(100, (elapsed) => frames.push(elapsed), onDone);

    advance(16);
    cancel();
    advance(200);

    expect(frames).toEqual([16]);
    expect(onDone).not.toHaveBeenCalled();
    expect(cancelled).toHaveLength(1);
  });

  it('requests no further frame when onFrame cancels the loop', () => {
    let cancel = () => {};
    const onDone = vi.fn();
    cancel = startFrameLoop(100, () => cancel(), onDone);
    advance(16);
    expect(queued.size).toBe(0);
    advance(200);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('ignores a frame that was already dispatched when its loop was cancelled', () => {
    const onFrameB = vi.fn();
    let cancelB = () => {};
    // Loop A cancels loop B from inside the same batch of frame callbacks.
    startFrameLoop(100, () => cancelB());
    cancelB = startFrameLoop(100, onFrameB);
    advance(16);
    expect(onFrameB).not.toHaveBeenCalled();
  });

  it('cancel() after the loop finished does nothing', () => {
    const onDone = vi.fn();
    const cancel = startFrameLoop(10, () => {}, onDone);
    advance(20);
    cancel();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(cancelled).toHaveLength(0);
  });
});

describe('settleOffset', () => {
  const peak = SETTLE_OVERSHOOT;

  it('is at rest at release and from 250ms on', () => {
    expect(settleOffset(0, 1)).toBe(0);
    expect(settleOffset(SETTLE_TOTAL_MS, 1)).toBe(0);
    expect(settleOffset(400, -1)).toBe(0);
  });

  it('is at rest before release (negative time)', () => {
    expect(settleOffset(-10, 1)).toBe(0);
  });

  it('does nothing when the drag did not change the point', () => {
    expect(settleOffset(SETTLE_RISE_MS, 0)).toBe(0);
  });

  it.each([
    [1, -peak],
    [-1, peak],
    [7, -peak],
  ])('peaks at 70ms: direction %d sits at %d SVG units (only the sign counts)', (dir, at) => {
    expect(settleOffset(SETTLE_RISE_MS, dir)).toBeCloseTo(at, 10);
  });

  it('eases out on the way up (35ms) and on the way back (160ms)', () => {
    expect(settleOffset(35, 1)).toBeCloseTo(-peak * easeOutCubic(0.5), 10);
    expect(settleOffset(160, 1)).toBeCloseTo(-peak * (1 - easeOutCubic(0.5)), 10);
  });
});

describe('trackDiagonalHit', () => {
  it.each<[string, number, number, number, DiagonalHit | null]>([
    ['a point on the diagonal', 1, 40, 40, 'diag'],
    ['the diagonal before the 100% line', 2, 100, 100, 'diag'],
    ['the origin point at 0%', 0, 0, 0, 'floor'],
    ['the origin point never on the diagonal', 0, 30, 30, null],
    ['the origin point on the 100% line', 0, 0, 100, 'ceil'],
    ['a point on the 0% line', 2, 60, 0, 'floor'],
    ['a point on the 100% line', 2, 60, 100, 'ceil'],
    ['a point off every line', 1, 40, 41, null],
    ['a point one step above the 0% line', 2, 60, 1, null],
    ['a point one step under the 100% line', 2, 60, 99, null],
  ])('lands from no line: %s', (_label, pointIndex, x, y, landed) => {
    expect(trackDiagonalHit(pointIndex, x, y, []).landed).toBe(landed);
  });

  it.each<[string, number, number, DiagonalHit[], DiagonalHit[], DiagonalHit | null]>([
    ['one step off the diagonal keeps it', 40, 41, ['diag'], ['diag'], null],
    ['one step off the other way keeps it', 41, 40, ['diag'], ['diag'], null],
    ['2 steps off the diagonal lets go', 40, 42, ['diag'], [], null],
    ['2 steps off the other way lets go', 42, 40, ['diag'], [], null],
    ['one step above the 0% line keeps it', 60, 1, ['floor'], ['floor'], null],
    ['2 steps above the 0% line lets go', 60, 2, ['floor'], [], null],
    ['one step under the 100% line keeps it', 60, 99, ['ceil'], ['ceil'], null],
    ['2 steps under the 100% line lets go', 60, 98, ['ceil'], [], null],
    ['a new line lands while the old one is let go', 60, 0, ['diag'], ['floor'], 'floor'],
    ['the corner holds both lines', 100, 100, [], ['diag', 'ceil'], 'diag'],
    ['one step off the corner keeps both', 99, 100, ['diag', 'ceil'], ['diag', 'ceil'], null],
    [
      'a held diagonal at the corner lands on the 100% line',
      100,
      100,
      ['diag'],
      ['diag', 'ceil'],
      'ceil',
    ],
    [
      'the 0% line lands next to the origin, the diagonal stays held',
      1,
      0,
      ['diag'],
      ['diag', 'floor'],
      'floor',
    ],
    ['back on the diagonal, nothing lands', 1, 1, ['diag', 'floor'], ['diag', 'floor'], null],
    ['near a line it never held, nothing is held', 40, 41, [], [], null],
    ['near another line, the held one lets go', 60, 1, ['ceil'], [], null],
  ])('%s', (_label, x, y, held, next, landed) => {
    expect(trackDiagonalHit(1, x, y, held)).toEqual({ held: next, landed });
  });

  it('never gives the origin point the diagonal', () => {
    expect(trackDiagonalHit(0, 30, 30, [])).toEqual({ held: [], landed: null });
  });
});

describe('tapOnCoarsePointer', () => {
  const originalMatchMedia = window.matchMedia;
  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Like the native method: it refuses any receiver but navigator.
    vibrate = vi.fn(function (this: unknown) {
      if (this !== navigator) throw new TypeError('Illegal invocation');
      return true;
    });
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    delete (navigator as unknown as { vibrate?: unknown }).vibrate;
  });

  const pointer = (coarse: boolean) => {
    window.matchMedia = ((query: string) => ({
      matches: coarse && query === '(pointer: coarse)',
      media: query,
    })) as unknown as typeof window.matchMedia;
  };

  it('vibrates 5ms on a coarse pointer', () => {
    pointer(true);
    tapOnCoarsePointer();
    expect(vibrate).toHaveBeenCalledWith(5);
  });

  it('does nothing on a fine pointer', () => {
    pointer(false);
    tapOnCoarsePointer();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('does nothing when the browser has no matchMedia', () => {
    (window as unknown as { matchMedia: unknown }).matchMedia = undefined;
    expect(() => tapOnCoarsePointer()).not.toThrow();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('does nothing when the browser cannot vibrate', () => {
    pointer(true);
    delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    expect(() => tapOnCoarsePointer()).not.toThrow();
  });
});

describe('ripple geometry', () => {
  const pts = (pairs: Array<[number, number]>): ControlPoint[] =>
    pairs.map(([lightener, target]) => ({ lightener, target }));
  /** Largest vertical gap, in SVG units (100% = 200 units), between pieces and a drawn shape. */
  const gapSvg = (pieces: readonly CurvePiece[], other: readonly CurvePiece[] | ControlPoint[]) => {
    const height = (x: number) =>
      'x0' in (other[0] ?? {})
        ? piecesHeightAt(other as CurvePiece[], x)
        : sampleRenderedCurveAt(other as ControlPoint[], x);
    let worst = 0;
    for (let x = 0; x <= 100; x += 0.25) {
      worst = Math.max(worst, Math.abs(piecesHeightAt(pieces, x) - height(x)));
    }
    return worst * 2;
  };
  const LINEAR = CURVE_PRESETS.find((p) => p.id === 'linear')!.controlPoints;
  const LATE = CURVE_PRESETS.find((p) => p.id === 'late_starter')!.controlPoints;
  const DIM = CURVE_PRESETS.find((p) => p.id === 'dim_accent')!.controlPoints;
  /** Steep and wiggly shapes a user can drag into place. */
  const STEEP = [
    pts([
      [0, 0],
      [1, 1],
      [50, 1],
      [52, 100],
      [100, 100],
    ]),
    pts([
      [0, 0],
      [49, 5],
      [51, 80],
      [100, 100],
    ]),
    pts([
      [0, 20],
      [10, 90],
      [20, 5],
      [30, 95],
      [40, 0],
      [100, 60],
    ]),
  ];

  it('moves every x position of both shapes, from each height on the shape on screen', () => {
    const span = rippleSpan(drawnShape(LINEAR), drawnShape(LATE));
    expect(span.xs).toEqual([0, 1, 45, 70, 100]);
    expect(span.to).toEqual([0, 1, 1, 45, 100]);
    // Linear has no point at 45 or 70: those start on its drawn curve.
    expect(span.from[2]).toBeCloseTo(sampleRenderedCurveAt(LINEAR, 45), 10);
    expect(span.from[3]).toBeCloseTo(sampleRenderedCurveAt(LINEAR, 70), 10);
    expect([span.from[0], span.from[1], span.from[4]]).toEqual([0, 1, 100]);
  });

  it("starts a point at the shape's own target where it has one, such as an origin floor", () => {
    const floor = pts([
      [0, 12],
      [100, 100],
    ]);
    // The drawn curve starts at 0, but the origin marker sits at the floor.
    expect(piecesHeightAt(drawnShape(floor).pieces, 0)).toBe(0);
    expect(rippleSpan(drawnShape(floor), drawnShape(LINEAR)).from[0]).toBe(12);
  });

  it('lasts 300ms plus 20ms for every point after the first', () => {
    const span = rippleSpan(drawnShape(LINEAR), drawnShape(LATE));
    expect(rippleDurationMs(span)).toBe(RIPPLE_POINT_MS + RIPPLE_STAGGER_MS * 4);
    expect(rippleDurationMs(span)).toBe(380);
  });

  it('shortens the delay on shapes with many points, so no ripple runs past 440ms', () => {
    const dense = pts(Array.from({ length: 21 }, (_, i): [number, number] => [i * 5, i * 4]));
    const span = rippleSpan(drawnShape(dense), drawnShape(DIM));
    expect(span.xs.length).toBeGreaterThan(8);
    expect(rippleDurationMs(span)).toBe(RIPPLE_POINT_MS + RIPPLE_STAGGER_BUDGET_MS);
    const last = span.xs.length - 1;
    const step = RIPPLE_STAGGER_BUDGET_MS / last;
    expect(rippleFrame(span, last * step).points[last].target).toBe(span.from[last]);
    expect(rippleFrame(span, last * step + 150).points[last].target).not.toBe(span.from[last]);
  });

  it('starts point j at j × 20ms and eases it over 300ms', () => {
    const span = rippleSpan(drawnShape(LINEAR), drawnShape(LATE));
    const j = 3;
    const start = j * RIPPLE_STAGGER_MS;
    expect(rippleFrame(span, start).points[j].target).toBeCloseTo(span.from[j], 10);
    expect(rippleFrame(span, start + 150).points[j].target).toBeCloseTo(
      span.from[j] + (span.to[j] - span.from[j]) * easeOutCubic(0.5),
      10
    );
    expect(rippleFrame(span, start + RIPPLE_POINT_MS).points[j].target).toBe(span.to[j]);
    const mid = rippleFrame(span, 80).points;
    const progress = (k: number) => (mid[k].target - span.from[k]) / (span.to[k] - span.from[k]);
    expect(progress(2)).toBeGreaterThan(progress(3));
  });

  it('blends each piece by the progress at its x, so the curve passes through the moving points', () => {
    const span = rippleSpan(drawnShape(LINEAR), drawnShape(LATE));
    for (const t of [40, 140, 260]) {
      const frame = rippleFrame(span, t);
      for (const p of frame.points.slice(1)) {
        expect(piecesHeightAt(frame.pieces, p.lightener)).toBeCloseTo(p.target, 9);
      }
    }
  });

  it('weighs a piece between two points by the progress interpolated at its x', () => {
    const span = rippleSpan(drawnShape(LINEAR), drawnShape(LATE));
    const at = 140;
    const frame = rippleFrame(span, at);
    const p = (k: number) => easeOutCubic(Math.min(1, Math.max(0, (at - k * 20) / 300)));
    // The piece from 45 to 70 lies between the points at index 2 and 3.
    const i = span.piecesFrom.findIndex((piece) => piece.x0 === 45);
    const [a, b] = [span.piecesFrom[i], span.piecesTo[i]];
    const third = (a.x1 - a.x0) / 3;
    const w = (x: number) => p(2) + ((p(3) - p(2)) * (x - 45)) / (70 - 45);
    expect(frame.pieces[i].y[1]).toBeCloseTo(a.y[1] + (b.y[1] - a.y[1]) * w(a.x0 + third), 9);
    expect(frame.pieces[i].y[2]).toBeCloseTo(a.y[2] + (b.y[2] - a.y[2]) * w(a.x1 - third), 9);
  });

  it('keeps the progress of the last point past it, when neither shape reaches 100%', () => {
    const shown = drawnShape(
      pts([
        [0, 0],
        [50, 80],
      ])
    );
    const next = drawnShape(
      pts([
        [0, 0],
        [60, 30],
      ])
    );
    const span = rippleSpan(shown, next);
    expect(span.xs).toEqual([0, 50, 60]);
    // At 40ms the first point is moving and the last has not started.
    const frame = rippleFrame(span, 40);
    expect(piecesHeightAt(frame.pieces, 80)).toBeCloseTo(piecesHeightAt(shown.pieces, 80), 9);
  });

  it('starts exactly on the shape on screen and ends exactly on the new shape', () => {
    const span = rippleSpan(drawnShape(LINEAR), drawnShape(LATE));
    expect(rippleFrame(span, 0).pieces).toEqual(span.piecesFrom);
    expect(rippleFrame(span, 0).points.map((p) => p.target)).toEqual(span.from);
    const end = rippleFrame(span, rippleDurationMs(span));
    expect(end.pieces).toEqual(span.piecesTo);
    expect(end.points.map((p) => p.target)).toEqual(span.to);
  });

  const STRAIGHT = [
    pts([
      [0, 0],
      [100, 100],
    ]),
    pts([[100, 40]]),
  ];
  const shapes: Array<[string, readonly ControlPoint[]]> = [
    ...CURVE_PRESETS.map((p) => [p.id, p.controlPoints] as [string, readonly ControlPoint[]]),
    ...STEEP.map((s, i) => [`steep ${i + 1}`, s] as [string, readonly ControlPoint[]]),
    ...STRAIGHT.map((s, i) => [`straight ${i + 1}`, s] as [string, readonly ControlPoint[]]),
  ];
  const pairs = shapes.flatMap(([a, from]) =>
    shapes.filter(([b]) => b !== a).map(([b, to]) => [a, b, from, to] as const)
  );

  it.each(pairs)(
    '%s to %s: no jump at either end, points in order, on the curve, under 440ms',
    (_a, _b, from, to) => {
      const span = rippleSpan(drawnShape(from), drawnShape(to));
      const duration = rippleDurationMs(span);
      expect(duration).toBeLessThanOrEqual(440);
      expect(gapSvg(rippleFrame(span, 0).pieces, [...from]), 'first frame').toBeLessThan(1e-6);
      expect(gapSvg(rippleFrame(span, duration).pieces, [...to]), 'last frame').toBeLessThan(1e-6);
      for (const cp of to) {
        expect(
          rippleFrame(span, duration).points.find((p) => p.lightener === cp.lightener)!.target
        ).toBe(cp.target);
      }
      for (let t = 0; t <= duration; t += 40) {
        const frame = rippleFrame(span, t);
        const xs = frame.points.map((p) => p.lightener);
        expect(xs).toEqual([...xs].sort((a, b) => a - b));
        for (const p of frame.points.slice(1)) {
          expect(Math.abs(piecesHeightAt(frame.pieces, p.lightener) - p.target)).toBeLessThan(1e-6);
        }
      }
    }
  );

  it('starts and ends exactly for any shape a user can drag into place', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const shape = (): ControlPoint[] => {
      const xs = new Set<number>();
      const n = 1 + Math.floor(rnd() * 12);
      while (xs.size < n) xs.add(1 + Math.floor(rnd() * 99));
      return [
        { lightener: 0, target: rnd() < 0.3 ? Math.floor(rnd() * 30) : 0 },
        ...[...xs]
          .sort((a, b) => a - b)
          .map((x) => ({ lightener: x, target: Math.floor(rnd() * 101) })),
      ];
    };
    for (let i = 0; i < 150; i++) {
      const [from, to] = [shape(), shape()];
      const span = rippleSpan(drawnShape(from), drawnShape(to));
      expect(gapSvg(rippleFrame(span, 0).pieces, from)).toBeLessThan(1e-6);
      expect(gapSvg(rippleFrame(span, rippleDurationMs(span)).pieces, to)).toBeLessThan(1e-6);
      expect(rippleDurationMs(span)).toBeLessThanOrEqual(440);
    }
  });

  const presetPairs = CURVE_PRESETS.flatMap((a) =>
    CURVE_PRESETS.filter((b) => b !== a).map(
      (b) => [a.id, b.id, a.controlPoints, b.controlPoints] as const
    )
  );
  it.each(presetPairs)(
    '%s to %s: the last frame is the new shape bit for bit',
    (_a, _b, from, to) => {
      const span = rippleSpan(drawnShape(from), drawnShape(to));
      expect(rippleFrame(span, rippleDurationMs(span)).pieces).toEqual(span.piecesTo);
    }
  );

  it("puts each committed point's marker on the frame's height at its x", () => {
    const span = rippleSpan(drawnShape(LINEAR), drawnShape(LATE));
    const frame = rippleFrame(span, 120);
    const knots = rippleKnots(LATE, frame);
    expect(knots.map((k) => k.lightener)).toEqual(LATE.map((p) => p.lightener));
    for (const k of knots) {
      expect(k.target).toBe(frame.points.find((p) => p.lightener === k.lightener)!.target);
    }
    // A point the frame does not carry keeps its own height.
    expect(rippleKnots([{ lightener: 33, target: 7 }], frame)).toEqual([
      { lightener: 33, target: 7 },
    ]);
  });

  it('continues from a frame on screen without a jump', () => {
    const first = rippleSpan(drawnShape(LINEAR), drawnShape(LATE));
    const mid = rippleFrame(first, 150);
    const second = rippleSpan(mid, drawnShape(DIM));
    expect(gapSvg(rippleFrame(second, 0).pieces, mid.pieces)).toBeLessThan(1e-9);
    for (const p of mid.points) {
      expect(rippleFrame(second, 0).points.find((q) => q.lightener === p.lightener)!.target).toBe(
        p.target
      );
    }
    expect(rippleDurationMs(second)).toBeLessThanOrEqual(440);
  });

  it('blends two drawn curves', () => {
    const [a, b] = [drawnShape(LINEAR).pieces, drawnShape(STEEP[2]).pieces];
    expect(gapSvg(blendPieces(a, b, 0), a)).toBeLessThan(1e-9);
    expect(gapSvg(blendPieces(a, b, 1), b)).toBeLessThan(1e-9);
    for (const x of [10, 35, 77]) {
      expect(piecesHeightAt(blendPieces(a, b, 0.5), x)).toBeCloseTo(
        (piecesHeightAt(a, x) + piecesHeightAt(b, x)) / 2,
        6
      );
    }
  });
});
