/**
 * Motion helpers for the card's opt-in "joy" moments: the per-moment flags read
 * from the card config's `joy:` key, the reduced-motion check, one shared frame
 * loop, and the pure timing math each moment needs.
 *
 * Every moment is off by default. A dashboard card turns one on with
 * `joy: { settle: true }`. The math lives here, free of Lit and the DOM, so the
 * exact timings can be unit-tested without a browser.
 */
import { easeOutCubic } from './graph-math.js';

/** Every moment the `joy:` config key can switch on. */
export const JOY_MOMENTS = ['settle'] as const;

export type JoyMoment = (typeof JOY_MOMENTS)[number];
export type JoyFlags = Readonly<Record<JoyMoment, boolean>>;

export const JOY_DEFAULTS: JoyFlags = Object.freeze({ settle: false });

/**
 * Read the card config's `joy:` value. Only boolean values for known moments
 * count; a missing key, any other type or an unknown moment keeps the default.
 */
export function resolveJoyFlags(raw: unknown): JoyFlags {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return JOY_DEFAULTS;
  const source = raw as Record<string, unknown>;
  const flags: Record<JoyMoment, boolean> = { ...JOY_DEFAULTS };
  for (const moment of JOY_MOMENTS) {
    const value = source[moment];
    if (typeof value === 'boolean') flags[moment] = value;
  }
  return Object.freeze(flags);
}

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** True when the user asked the OS for reduced motion. Safe without matchMedia. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

/**
 * Run `onFrame(elapsedMs)` on every animation frame for `durationMs`, then call
 * `onDone()` once. Elapsed time is measured from the call, with the same
 * `performance.now()` clock the frame timestamps use. Returns `cancel()`, which
 * stops further frames and skips `onDone`; calling it after the loop finished
 * does nothing.
 *
 *   start ──► frame(e) … frame(e) ──► e >= durationMs ──► onDone()
 *                 ▲ cancel() here: no more frames, no onDone
 */
export function startFrameLoop(
  durationMs: number,
  onFrame: (elapsedMs: number) => void,
  onDone?: () => void
): () => void {
  const start = performance.now();
  let active = true;
  let handle = 0;

  const tick = (now: number): void => {
    if (!active) return;
    const elapsed = Math.max(0, now - start);
    if (elapsed >= durationMs) {
      active = false;
      onDone?.();
      return;
    }
    onFrame(elapsed);
    // onFrame may have cancelled the loop; then no further frame is requested.
    if (active) handle = requestAnimationFrame(tick);
  };

  handle = requestAnimationFrame(tick);
  return () => {
    if (!active) return;
    active = false;
    cancelAnimationFrame(handle);
  };
}

/**
 * Settle: a released point overshoots this many SVG units in the direction of
 * its net brightness change…
 */
export const SETTLE_OVERSHOOT = 2;
/** …over this many ms… */
export const SETTLE_RISE_MS = 70;
/** …and comes back to rest by this many ms after release. */
export const SETTLE_TOTAL_MS = 250;

/**
 * Vertical offset, in SVG units, of a released point's marker `elapsedMs` after
 * release. `dir` is the sign of the net change from press to release: +1 when
 * the point's target went up (SVG y shrinks, so the overshoot is negative), -1
 * when it went down.
 *
 *   0 ──easeOutCubic──► -2·dir at 70ms ──easeOutCubic──► 0 at 250ms
 */
export function settleOffset(elapsedMs: number, dir: number): number {
  if (dir === 0 || elapsedMs <= 0 || elapsedMs >= SETTLE_TOTAL_MS) return 0;
  const peak = -SETTLE_OVERSHOOT * Math.sign(dir);
  if (elapsedMs < SETTLE_RISE_MS) return peak * easeOutCubic(elapsedMs / SETTLE_RISE_MS);
  const back = (elapsedMs - SETTLE_RISE_MS) / (SETTLE_TOTAL_MS - SETTLE_RISE_MS);
  return peak * (1 - easeOutCubic(back));
}
