// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { easeOutCubic } from './graph-math.js';
import {
  type DiagonalHit,
  JOY_DEFAULTS,
  JOY_MOMENTS,
  SETTLE_OVERSHOOT,
  SETTLE_RISE_MS,
  SETTLE_TOTAL_MS,
  prefersReducedMotion,
  resolveJoyFlags,
  settleOffset,
  startFrameLoop,
  tapOnCoarsePointer,
  trackDiagonalHit,
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
