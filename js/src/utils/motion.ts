/**
 * Motion helpers for the card's opt-in "joy" moments: the per-moment flags read
 * from the card config's `joy:` key, the reduced-motion check, one shared frame
 * loop, the haptic tap, and the pure timing and hit-test math each moment needs.
 *
 * Every moment is off by default. A dashboard card turns one on with
 * `joy: { settle: true }`. The math (`settleOffset`, `trackDiagonalHit`) is
 * free of Lit and the DOM, so the exact timings and hits can be unit-tested
 * without a browser.
 */
import { easeOutCubic } from './graph-math.js';

/** Every moment the `joy:` config key can switch on. */
export const JOY_MOMENTS = ['settle', 'diagonal'] as const;

export type JoyMoment = (typeof JOY_MOMENTS)[number];
export type JoyFlags = Readonly<Record<JoyMoment, boolean>>;

export const JOY_DEFAULTS: JoyFlags = Object.freeze({ settle: false, diagonal: false });

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

/**
 * Diagonal: the reference lines a dragged point can land on, in the order a
 * landing on several at once picks from.
 */
const LINES = ['diag', 'floor', 'ceil'] as const;

export type DiagonalHit = (typeof LINES)[number];

/** How many steps a point at (x, y) sits off each line. */
const STEPS_OFF: Readonly<Record<DiagonalHit, (x: number, y: number) => number>> = {
  diag: (x, y) => Math.abs(y - x),
  floor: (_x, y) => y,
  ceil: (_x, y) => 100 - y,
};

/** A line the point holds is let go once the point is this many steps off it. */
const LET_GO_STEPS = 2;

/** The lines a dragged point holds after a move, and the line it just landed on. */
export type DiagonalTrack = {
  held: readonly DiagonalHit[];
  landed: DiagonalHit | null;
};

/**
 * Track a dragged point across the lines after a move to (x, y), given the
 * lines it held before. It holds every line it sits on exactly (never the
 * diagonal for the origin point) and keeps each line it held until it is
 * LET_GO_STEPS off it: x and y round separately, so a drag along a line, or
 * where two lines meet, wobbles one step off now and then. It lands on a line
 * it sits on exactly and did not hold; a landing on several lines at once picks
 * the diagonal, then the 0% line, then the 100% line.
 */
export function trackDiagonalHit(
  pointIndex: number,
  x: number,
  y: number,
  held: readonly DiagonalHit[]
): DiagonalTrack {
  const isOn = (line: DiagonalHit) =>
    STEPS_OFF[line](x, y) === 0 && (line !== 'diag' || pointIndex > 0);
  return {
    held: LINES.filter(
      (line) => isOn(line) || (held.includes(line) && STEPS_OFF[line](x, y) < LET_GO_STEPS)
    ),
    landed: LINES.find((line) => isOn(line) && !held.includes(line)) ?? null,
  };
}

/** How long a line flashes after a dragged point lands on it. */
export const DIAGONAL_FLASH_MS = 400;

/** How long the tap on touch screens vibrates. */
export const TAP_MS = 5;

export const COARSE_POINTER_QUERY = '(pointer: coarse)';

/** A short tap on touch screens that can vibrate; nothing anywhere else. */
export function tapOnCoarsePointer(): void {
  if (typeof navigator.vibrate !== 'function') return;
  if (!window.matchMedia?.(COARSE_POINTER_QUERY).matches) return;
  navigator.vibrate(TAP_MS);
}
