/**
 * Motion helpers for the card's opt-in "joy" moments: the per-moment flags read
 * from the card config's `joy:` key, the reduced-motion check, one shared frame
 * loop, the haptic tap, and the pure timing, hit-test and shape-blend math each
 * moment needs.
 *
 * Every moment is off by default. A dashboard card turns one on with
 * `joy: { settle: true }`. The math (`settleOffset`, `trackDiagonalHit`,
 * `rippleFrame`) is free of Lit and the DOM, so the exact timings and hits can
 * be unit-tested without a browser.
 */
import { clamp, curvePieces, easeOutCubic, piecesHeightAt } from './graph-math.js';
import type { ControlPoint, CurvePiece } from './types.js';

/** Every moment the `joy:` config key can switch on. */
export const JOY_MOMENTS = ['settle', 'diagonal', 'ripple', 'drawIn'] as const;

export type JoyMoment = (typeof JOY_MOMENTS)[number];
export type JoyFlags = Readonly<Record<JoyMoment, boolean>>;

export const JOY_DEFAULTS: JoyFlags = Object.freeze({
  settle: false,
  diagonal: false,
  ripple: false,
  drawIn: false,
});

/** Added curves reveal first, then their rendered markers pop; cleanup also works without rAF. */
export const DRAW_IN_REVEAL_MS = 500;
export const DRAW_IN_POP_MS = 150;
export const DRAW_IN_STAGGER_MS = 40;
export const DRAW_IN_CLEAR_MS = 1200;

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

/** Calls `onReduce` when the OS starts asking for reduced motion. Returns the unsubscribe. */
export function onReducedMotionStart(onReduce: () => void): () => void {
  const mql = window.matchMedia?.(REDUCED_MOTION_QUERY);
  if (!mql) return () => {};
  const listener = (event: MediaQueryListEvent): void => {
    if (event.matches) onReduce();
  };
  mql.addEventListener('change', listener);
  return () => mql.removeEventListener('change', listener);
}

/** True when a moment that only moves things should play: its flag is on, reduced motion is off. */
export function momentPlays(flags: JoyFlags, moment: JoyMoment): boolean {
  return flags[moment] && !prefersReducedMotion();
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

/** Ripple: each point of a shape change eases over this many ms… */
export const RIPPLE_POINT_MS = 300;
/** …starting this many ms after the point to its left… */
export const RIPPLE_STAGGER_MS = 20;
/** …or less, so the last point never starts later than this. */
export const RIPPLE_STAGGER_BUDGET_MS = 140;

/**
 * A shape as the graph draws it: its points, and the curve pieces drawn for them.
 * The pieces pass through every point except an origin with a dim floor: the
 * drawn curve starts at 0, while that point's marker sits at the floor.
 */
export type RippleShape = {
  readonly points: readonly ControlPoint[];
  readonly pieces: readonly CurvePiece[];
};

/** The shape the graph draws for these points. */
export function drawnShape(points: readonly ControlPoint[]): RippleShape {
  return { points, pieces: curvePieces([...points]) };
}

/** `t` of the way (0…1) from a to b, landing on b exactly at t = 1. */
function lerp(a: number, b: number, t: number): number {
  return t >= 1 ? b : a + (b - a) * t;
}

/** Where pieces start and end. */
function piecesBreaks(pieces: readonly CurvePiece[]): number[] {
  return pieces.length ? [...pieces.map((p) => p.x0), pieces[pieces.length - 1].x1] : [];
}

/** Split a piece at x, strictly inside it (de Casteljau; the pieces still draw the same curve). */
function splitPiece(piece: CurvePiece, x: number): [CurvePiece, CurvePiece] {
  const s = (x - piece.x0) / (piece.x1 - piece.x0);
  const [a, b, c, d] = piece.y;
  const ab = lerp(a, b, s);
  const bc = lerp(b, c, s);
  const cd = lerp(c, d, s);
  const abc = lerp(ab, bc, s);
  const bcd = lerp(bc, cd, s);
  const mid = lerp(abc, bcd, s);
  return [
    { x0: piece.x0, x1: x, y: [a, ab, abc, mid] },
    { x0: x, x1: piece.x1, y: [mid, bcd, cd, d] },
  ];
}

/** Both curves cut at each other's breaks, so their pieces line up one to one. */
function alignPieces(
  a: readonly CurvePiece[],
  b: readonly CurvePiece[]
): [CurvePiece[], CurvePiece[]] {
  const cuts = [...new Set([...piecesBreaks(a), ...piecesBreaks(b)])].sort((p, q) => p - q);
  const cut = (pieces: readonly CurvePiece[]): CurvePiece[] => {
    const out: CurvePiece[] = [];
    for (const piece of pieces) {
      let rest = piece;
      for (const x of cuts) {
        if (x <= rest.x0 || x >= rest.x1) continue;
        const [left, right] = splitPiece(rest, x);
        out.push(left);
        rest = right;
      }
      out.push(rest);
    }
    return out;
  };
  return [cut(a), cut(b)];
}

/** Blend two aligned pieces, each Bézier height by the weight at its x. */
function blendPiece(a: CurvePiece, b: CurvePiece, weightAt: (x: number) => number): CurvePiece {
  const third = (a.x1 - a.x0) / 3;
  const xs = [a.x0, a.x0 + third, a.x1 - third, a.x1];
  return {
    x0: a.x0,
    x1: a.x1,
    y: a.y.map((y, k) => lerp(y, b.y[k], weightAt(xs[k]))) as CurvePiece['y'],
  };
}

/** A shape's height at x: its own point's target there, else its drawn curve's height. */
function heightAt(shape: RippleShape, x: number): number {
  return shape.points.find((cp) => cp.lightener === x)?.target ?? piecesHeightAt(shape.pieces, x);
}

/**
 * The points a ripple moves: every x position of the shape on screen and of
 * the new shape, each with the height it starts from and ends at, plus both
 * drawn curves cut into matching pieces.
 */
export type RippleSpan = {
  readonly xs: readonly number[];
  readonly from: readonly number[];
  readonly to: readonly number[];
  readonly piecesFrom: readonly CurvePiece[];
  readonly piecesTo: readonly CurvePiece[];
};

export function rippleSpan(shown: RippleShape, next: RippleShape): RippleSpan {
  const xs = [...new Set([...shown.points, ...next.points].map((cp) => cp.lightener))].sort(
    (a, b) => a - b
  );
  const [piecesFrom, piecesTo] = alignPieces(shown.pieces, next.pieces);
  return {
    xs,
    from: xs.map((x) => heightAt(shown, x)),
    to: xs.map((x) => heightAt(next, x)),
    piecesFrom,
    piecesTo,
  };
}

/** The delay between neighbouring points: 20ms, less on shapes with many points. */
function staggerMs(span: RippleSpan): number {
  const gaps = span.xs.length - 1;
  return gaps > 0 ? Math.min(RIPPLE_STAGGER_MS, RIPPLE_STAGGER_BUDGET_MS / gaps) : 0;
}

/** How long a ripple over `span` runs: the last point starts last and eases in full. */
export function rippleDurationMs(span: RippleSpan): number {
  return RIPPLE_POINT_MS + staggerMs(span) * (span.xs.length - 1);
}

/**
 * The shape on screen `elapsedMs` into a ripple. Point j, counted from the
 * left, eases (easeOutCubic) from its start height to its end height over
 * RIPPLE_POINT_MS, starting j stagger steps in. The curve blends the two drawn
 * curves piece by piece, each Bézier height by the progress at its x, so it
 * starts exactly on the shape on screen and ends exactly on the new shape.
 */
export function rippleFrame(span: RippleSpan, elapsedMs: number): RippleShape {
  const stagger = staggerMs(span);
  const progress = span.xs.map((_, j) =>
    easeOutCubic(clamp((elapsedMs - j * stagger) / RIPPLE_POINT_MS, 0, 1))
  );
  const weightAt = (x: number): number => {
    const j = span.xs.findIndex((xj) => xj >= x);
    if (j === -1) return progress[progress.length - 1];
    if (j === 0) return progress[0];
    const [x0, x1] = [span.xs[j - 1], span.xs[j]];
    return progress[j - 1] + ((progress[j] - progress[j - 1]) * (x - x0)) / (x1 - x0);
  };
  return {
    points: span.xs.map((x, j) => ({
      lightener: x,
      target: lerp(span.from[j], span.to[j], progress[j]),
    })),
    pieces: span.piecesFrom.map((a, i) => blendPiece(a, span.piecesTo[i], weightAt)),
  };
}

/** Where each committed point's marker sits on a ripple frame: at its x, at the frame's height there. */
export function rippleKnots(
  committed: readonly ControlPoint[],
  shown: RippleShape
): ControlPoint[] {
  const heights = new Map(shown.points.map((p) => [p.lightener, p.target]));
  return committed.map((cp) => ({
    lightener: cp.lightener,
    target: heights.get(cp.lightener) ?? cp.target,
  }));
}

/** The curve `t` of the way (0…1) from one drawn curve to another. */
export function blendPieces(
  from: readonly CurvePiece[],
  to: readonly CurvePiece[],
  t: number
): CurvePiece[] {
  const [a, b] = alignPieces(from, to);
  return a.map((p, i) => blendPiece(p, b[i], () => t));
}
