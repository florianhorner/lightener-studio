import type { LightCurve } from './types.js';
import { CURVE_PRESETS } from './presets.js';
import {
  drawnShape,
  FIRST_USE_TIMING,
  prefersReducedMotion,
  rippleDurationMs,
  rippleFrame,
  rippleSpan,
  startFrameLoop,
} from './motion.js';

export type InvitationProgress = 'seen' | 'completed' | 'dismissed';
export const INVITATION_ORIENTATION_MS = FIRST_USE_TIMING.orientation;
export const INVITATION_CUE_PAUSE_MS = FIRST_USE_TIMING.cuePause;
export const INVITATION_SLOW_FACTOR = FIRST_USE_TIMING.slowFactor;
const remembered = new Set<string>();
const progressKey = (group: string): string => `lightener:first-use:v1:${group}`;

export function hasInvitationProgress(group: string): boolean {
  if (remembered.has(group)) return true;
  try {
    return localStorage.getItem(progressKey(group)) !== null;
  } catch {
    return false;
  }
}

export function recordInvitationProgress(group: string, progress: InvitationProgress): void {
  remembered.add(group);
  try {
    localStorage.setItem(progressKey(group), progress);
  } catch {
    // A blocked store must not replay an invitation during this page's lifetime.
  }
}

export function hasDefaultShapes(curves: readonly LightCurve[]): boolean {
  return (
    curves.length > 0 &&
    curves.every(
      (curve) =>
        curve.controlPoints.length >= 2 &&
        curve.controlPoints.every((p) => p.lightener === p.target)
    )
  );
}

/** Owns only the temporary drawing. Configuration and edit history stay with the card. */
export class FirstUseInvitation {
  public curve: LightCurve | null = null;
  public moving = false;
  public cueAnimating = false;
  public showInstruction = false;
  public presetHighlighted = false;
  private _cancelFrame: (() => void) | null = null;
  private _motionTimer: ReturnType<typeof setTimeout> | null = null;
  private _presetTimer: ReturnType<typeof setTimeout> | null = null;
  private _instructionTimer: ReturnType<typeof setTimeout> | null = null;

  public constructor(private readonly changed: () => void) {}

  public start(selected: LightCurve, animate: boolean): void {
    this.clear();
    const preset = CURVE_PRESETS.find((p) => p.id === 'dim_accent')!;
    const span = rippleSpan(drawnShape(selected.controlPoints), drawnShape(preset.controlPoints));
    const frame = (elapsed: number): void => {
      // Render the same canonical points the native editor will receive. A
      // stationary press cannot become an edit because of frame rounding.
      const points = rippleFrame(span, elapsed).points.map((p) => ({
        lightener: p.lightener,
        target: Math.round(p.target),
      }));
      this.curve = { ...selected, controlPoints: points };
      this.changed();
    };
    this.showInstruction = true;
    const play = animate && !prefersReducedMotion();
    this.cueAnimating = play;
    this.presetHighlighted = !play;
    frame(play ? 0 : rippleDurationMs(span));
    if (play) {
      this._presetTimer = setTimeout(() => {
        this._presetTimer = null;
        this.presetHighlighted = true;
        this.changed();
      }, INVITATION_CUE_PAUSE_MS - FIRST_USE_TIMING.presetLead);
      this._motionTimer = setTimeout(() => {
        this._motionTimer = null;
        if (prefersReducedMotion()) {
          this.freeze();
          return;
        }
        this.moving = true;
        this.changed();
        this._cancelFrame = startFrameLoop(
          Math.round(rippleDurationMs(span) * INVITATION_SLOW_FACTOR),
          (elapsed) => {
            if (prefersReducedMotion()) this.freeze();
            else frame(elapsed / INVITATION_SLOW_FACTOR);
          },
          () => {
            this._cancelFrame = null;
            this.moving = false;
            frame(rippleDurationMs(span));
            this._fadeInstructionLater();
          }
        );
      }, INVITATION_CUE_PAUSE_MS);
    } else this._fadeInstructionLater();
  }

  private _fadeInstructionLater(): void {
    if (!this.showInstruction || this._instructionTimer !== null) return;
    this._instructionTimer = setTimeout(() => {
      this._instructionTimer = null;
      this.showInstruction = false;
      this.cueAnimating = false;
      this.changed();
    }, FIRST_USE_TIMING.context);
  }

  public freeze(): void {
    if (this._presetTimer !== null) clearTimeout(this._presetTimer);
    this._presetTimer = null;
    this.presetHighlighted = false;
    if (this._motionTimer !== null) clearTimeout(this._motionTimer);
    this._motionTimer = null;
    this._cancelFrame?.();
    this._cancelFrame = null;
    this.moving = false;
    this.cueAnimating = false;
    this._fadeInstructionLater();
    this.changed();
  }

  public clear(): void {
    if (this._presetTimer !== null) clearTimeout(this._presetTimer);
    this._presetTimer = null;
    this.presetHighlighted = false;
    if (this._motionTimer !== null) clearTimeout(this._motionTimer);
    this._motionTimer = null;
    this._cancelFrame?.();
    this._cancelFrame = null;
    if (this._instructionTimer !== null) clearTimeout(this._instructionTimer);
    this._instructionTimer = null;
    this.curve = null;
    this.moving = false;
    this.cueAnimating = false;
    this.showInstruction = false;
    this.changed();
  }
}
