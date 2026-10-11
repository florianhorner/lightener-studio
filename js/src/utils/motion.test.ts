// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { easeOutCubic } from './graph-math.js';
import {
  JOY_DEFAULTS,
  JOY_MOMENTS,
  SETTLE_OVERSHOOT,
  SETTLE_RISE_MS,
  SETTLE_TOTAL_MS,
  prefersReducedMotion,
  resolveJoyFlags,
  settleOffset,
  startFrameLoop,
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
