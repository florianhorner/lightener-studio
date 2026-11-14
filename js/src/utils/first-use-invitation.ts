import type { CurveFrame, LightCurve } from './types.js';
import { CURVE_PRESETS } from './presets.js';
import {
  DRAW_IN_POP_MS,
  FIRST_USE_TIMING,
  drawnShape,
  prefersReducedMotion,
  rippleDurationMs,
  rippleFrame,
  rippleKnots,
  rippleSpan,
  startFrameLoop,
} from './motion.js';
import {
  addPointEdit,
  applyPresetToCurves,
  movePointOnCurves,
  removePointEdit,
} from './edit-operations.js';
import { easeOutCubic, piecesHeightAt, sampleRenderedCurveAt } from './graph-math.js';
import { prepareBrightnessConfig } from './interpolation.js';

export type InvitationProgress = 'seen' | 'completed' | 'dismissed';
export const INVITATION_ORIENTATION_MS = FIRST_USE_TIMING.orientation;
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

export type InvitationPhase = 'preset' | 'point' | 'room' | 'add' | 'remove' | 'complete';
export type InvitationMessage =
  | 'preset'
  | 'lightBrighter'
  | 'lightDimmer'
  | 'lightRestore'
  | 'roomBrighter'
  | 'roomDimmer'
  | 'roomRestore'
  | 'add'
  | 'remove'
  | 'restore'
  | 'complete';
/** The gesture a step demonstrates; the graph draws its mark beside the pointer. */
export type InvitationGesture = 'double-click' | 'right-click' | 'double-tap' | 'hold' | 'key';
export interface InvitationCue {
  lightener: number;
  target: number;
  pressed: boolean;
  markerOpacity?: number;
  labelAbove?: boolean;
  gesture?: InvitationGesture;
  /** Presses so far in this step: each one sends out its own ring. */
  presses?: number;
  /** How far a touch hold has come, 0 to 1. */
  hold?: number;
  /** The pointer leaves by fading, 1 to 0, instead of vanishing. */
  opacity?: number;
  /** Stays visible between captions, while the pointer travels to its next place. */
  uncaptioned?: boolean;
}

/** Held beats separate the real gestures; all times are milliseconds from Replay. */
export const INVITATION_TIMELINE = {
  presetHighlight: 600,
  presetApply: 1200,
  point: 2200,
  pointGrab: 2800,
  pointUp: 3800,
  pointDown: 5400,
  pointReturn: 6800,
  room: 7400,
  roomGrab: 8000,
  roomLow: 9200,
  roomHigh: 10800,
  roomReturn: 12000,
  add: 12400,
  addFirstPress: 13000,
  addSecondPress: 13280,
  addInsert: 13500,
  remove: 14300,
  removePress: 14900,
  removeDelete: 15600,
  restoreCue: 16100,
  restore: 16500,
  complete: 17000,
} as const;

/** How far above or below the line the demo's double-click lands, in per-light brightness points. */
const ADD_POINT_OFFSET = 22;
/** Where the pointer sits, in per-light brightness points, while it moves Room brightness. */
const ROOM_CUE_TARGET = 8;
/** The pointer travels between steps (to the Room grip, then to where it will click) in this time. */
const CUE_TRAVEL_MS = 450;
/** One click, a key tap or one tap of a double-tap stays down this long. */
const PRESS_MS = 140;
/** The pointer fades out over the example's last moments. */
const CUE_LEAVE_MS = 320;

const cloneCurve = (curve: LightCurve): LightCurve => ({
  ...curve,
  controlPoints: curve.controlPoints.map((point) => ({ ...point })),
});

/** Owns only the temporary drawing. Configuration and edit history stay with the card. */
export class FirstUseInvitation {
  public curve: LightCurve | null = null;
  public phase: InvitationPhase = 'complete';
  public message: InvitationMessage = 'complete';
  public curveFrame: CurveFrame | null = null;
  public presetId = 'dim_accent';
  public cue: InvitationCue | null = null;
  public roomPosition: number | null = null;
  public presetHighlighted = false;
  public frozen = false;
  private _cancelFrame: (() => void) | null = null;
  private _generation = 0;

  public constructor(private readonly changed: () => void) {}

  public start(
    selected: LightCurve,
    animate: boolean,
    roomPosition: number | null = 100,
    input = 'mouse'
  ): void {
    this.clear();
    const generation = this._generation;
    const original = cloneCurve(selected);
    const dim = CURVE_PRESETS.find((preset) => preset.id === 'dim_accent')!;
    const normalized = prepareBrightnessConfig(selected.controlPoints);
    const dimPoints = prepareBrightnessConfig(dim.controlPoints);
    const isDim =
      normalized.length === dimPoints.length &&
      normalized.every(
        (point, index) =>
          point.lightener === dimPoints[index].lightener && point.target === dimPoints[index].target
      );
    const preset = isDim ? CURVE_PRESETS.find((item) => item.id === 'early_starter')! : dim;
    this.presetId = preset.id;
    const shaped = applyPresetToCurves([original], original.entityId, preset.controlPoints)[0];
    const pointIndex = shaped.controlPoints.findIndex((point) => point.lightener === 50);
    const point = shaped.controlPoints[pointIndex];
    const above = Math.min(98, point.target + 25);
    const below = Math.max(2, point.target - 25);
    // Enter inserts at the next segment's midpoint, on the line. A double-click or
    // double-tap inserts where it lands, so the demo clicks clearly above or below
    // the line (toward the side with room) and the curve visibly bends to meet it.
    const nextPoint = shaped.controlPoints[pointIndex + 1];
    const addX = Math.round((point.lightener + nextPoint.lightener) / 2);
    const lineY = sampleRenderedCurveAt(shaped.controlPoints, addX);
    const addY = Math.round(
      input === 'keyboard'
        ? (point.target + nextPoint.target) / 2
        : Math.max(2, Math.min(98, lineY + (lineY <= 50 ? ADD_POINT_OFFSET : -ADD_POINT_OFFSET)))
    );
    const added = addPointEdit([shaped], shaped.entityId, addX, addY)![0];
    const addedIndex = added.controlPoints.findIndex((item) => item.lightener === addX);
    const removed = removePointEdit([added], 0, addedIndex)![0];
    const roomStart = Math.max(0, Math.min(100, roomPosition ?? 100));
    const smooth = animate && !prefersReducedMotion();
    const t = INVITATION_TIMELINE;
    // Start toward the far end, including when the user's Room position is already zero.
    const firstRoomEnd = roomStart <= 50 ? 100 : 0;
    const secondRoomEnd = 100 - firstRoomEnd;
    const transitions = {
      preset: rippleSpan(drawnShape(original.controlPoints), drawnShape(shaped.controlPoints)),
      add: rippleSpan(drawnShape(shaped.controlPoints), drawnShape(added.controlPoints)),
      remove: rippleSpan(drawnShape(added.controlPoints), drawnShape(removed.controlPoints)),
      restore: rippleSpan(drawnShape(removed.controlPoints), drawnShape(original.controlPoints)),
    };
    // Keep the native preset animation separate from editable points. The span's
    // union is drawing geometry only; the graph receives destination handles only.
    const transition = (kind: keyof typeof transitions, elapsed: number): void => {
      if (!smooth || !this.curve || elapsed < 0) return;
      const span = transitions[kind];
      if (elapsed >= rippleDurationMs(span)) return;
      const shown = rippleFrame(span, elapsed);
      this.curveFrame = {
        entityId: selected.entityId,
        pieces: shown.pieces,
        knots: rippleKnots(this.curve.controlPoints, shown),
      };
    };
    const at = (lightener: number): number => {
      const knot = this.curveFrame?.knots?.find((point) => point.lightener === lightener);
      if (knot) return knot.target;
      if (this.curveFrame) return piecesHeightAt(this.curveFrame.pieces, lightener);
      return sampleRenderedCurveAt(this.curve!.controlPoints, lightener);
    };
    // Reduced motion uses the same readable held beats, with no interpolated travel.
    const between = (
      elapsed: number,
      start: number,
      end: number,
      from: number,
      to: number
    ): number => {
      if (elapsed >= end) return to;
      if (elapsed <= start || !smooth) return from;
      const progress = (elapsed - start) / (end - start);
      const eased = progress * progress * (3 - 2 * progress);
      return from + (to - from) * eased;
    };
    // Travel between places: reduced motion is already there, with nothing in between.
    const travel = (elapsed: number, start: number, end: number, from: number, to: number) =>
      smooth ? between(elapsed, start, end, from, to) : to;
    const touch = input === 'touch' || input === 'pen';
    // Held beats repeat the same picture; only hand the card frames that differ.
    let shownKey = '';
    let shownCurve: LightCurve | null = null;
    const frame = (elapsed: number): void => {
      if (generation !== this._generation) return;
      this.cue = null;
      this.curveFrame = null;
      this.roomPosition = null;
      this.presetHighlighted = elapsed >= t.presetHighlight && elapsed < t.restoreCue;
      this.curve = cloneCurve(elapsed < t.presetApply || elapsed >= t.complete ? original : shaped);
      if (elapsed >= t.complete) {
        this.phase = 'complete';
        this.message = 'complete';
      } else if (elapsed >= t.restoreCue) {
        this.phase = 'remove';
        this.message = 'restore';
        this.curve = cloneCurve(elapsed < t.restore ? removed : original);
        transition('restore', elapsed - t.restore);
        // The pointer travels back to the middle point from where it removed the point; the
        // delete ripple above has finished by now, so nothing is cut off or jumps. It then
        // rests on that point while the shape returns, and fades out.
        const glide = between(elapsed, t.restoreCue, t.restore, addX, 50);
        const rest = at(50);
        this.cue = {
          lightener: glide,
          target:
            input === 'keyboard'
              ? at(glide)
              : between(elapsed, t.restoreCue, t.restore, addY, rest),
          pressed: false,
          uncaptioned: true,
          opacity: smooth
            ? 1 - Math.max(0, Math.min(1, (elapsed - (t.complete - CUE_LEAVE_MS)) / CUE_LEAVE_MS))
            : 1,
        };
      } else if (elapsed >= t.remove) {
        this.phase = 'remove';
        this.message = 'remove';
        this.curve = cloneCurve(elapsed < t.removeDelete ? added : removed);
        transition('remove', elapsed - t.removeDelete);
        // A hold lasts from press to removal. A right-click or the Delete key is one short
        // press that ends in the removal. The pointer stays where the point was; only the
        // keyboard's focus follows the shape.
        const pressStart = touch ? t.removePress : t.removeDelete - PRESS_MS;
        const pressed = elapsed >= pressStart && elapsed < t.removeDelete;
        this.cue = {
          lightener: addX,
          target: input === 'keyboard' || elapsed < t.removeDelete ? at(addX) : addY,
          pressed,
          gesture: input === 'keyboard' ? 'key' : touch ? 'hold' : 'right-click',
          // A hold fills the ring instead of sending one out.
          presses: !touch && elapsed >= pressStart ? 1 : 0,
          ...(touch
            ? {
                hold: !pressed
                  ? 0
                  : smooth
                    ? (elapsed - t.removePress) / (t.removeDelete - t.removePress)
                    : 1,
              }
            : {}),
          markerOpacity: smooth
            ? 1 - easeOutCubic(Math.max(0, Math.min(1, (elapsed - t.removeDelete + 180) / 180)))
            : 1,
        };
      } else if (elapsed >= t.add) {
        this.phase = 'add';
        this.message = 'add';
        if (elapsed >= t.addInsert) this.curve = cloneCurve(added);
        transition('add', elapsed - t.addInsert);
        // The pointer travels from the Room grip to where it will click and stays there:
        // the new point appears under it and the shape bends to meet it. The keyboard's
        // focus sits on the existing point, then on the new one.
        const keyboard = input === 'keyboard';
        const cueX = keyboard
          ? elapsed < t.addInsert
            ? point.lightener
            : addX
          : travel(elapsed, t.add, t.add + CUE_TRAVEL_MS, roomStart, addX);
        const cueTarget = keyboard
          ? at(cueX)
          : travel(elapsed, t.add, t.add + CUE_TRAVEL_MS, ROOM_CUE_TARGET, addY);
        // Enter is one short press that ends in the new point; a click or a tap comes twice.
        const keyPress = t.addInsert - PRESS_MS;
        this.cue = {
          lightener: cueX,
          target: cueTarget,
          gesture: keyboard ? 'key' : touch ? 'double-tap' : 'double-click',
          presses: keyboard
            ? elapsed >= keyPress
              ? 1
              : 0
            : (elapsed >= t.addFirstPress ? 1 : 0) + (elapsed >= t.addSecondPress ? 1 : 0),
          pressed: keyboard
            ? elapsed >= keyPress && elapsed < t.addInsert
            : (elapsed >= t.addFirstPress && elapsed < t.addFirstPress + PRESS_MS) ||
              (elapsed >= t.addSecondPress && elapsed < t.addSecondPress + PRESS_MS),
          markerOpacity:
            smooth && elapsed >= t.addInsert
              ? easeOutCubic(Math.min(1, (elapsed - t.addInsert) / DRAW_IN_POP_MS))
              : 1,
        };
      } else if (elapsed >= t.room) {
        this.phase = 'room';
        this.roomPosition =
          elapsed < t.roomLow
            ? between(elapsed, t.roomGrab, t.roomLow, roomStart, firstRoomEnd)
            : elapsed < t.roomHigh
              ? between(elapsed, t.roomLow + 300, t.roomHigh, firstRoomEnd, secondRoomEnd)
              : between(elapsed, t.roomHigh + 300, t.roomReturn, secondRoomEnd, roomStart);
        this.message =
          elapsed < t.roomLow
            ? firstRoomEnd > roomStart
              ? 'roomBrighter'
              : 'roomDimmer'
            : elapsed < t.roomHigh
              ? secondRoomEnd > firstRoomEnd
                ? 'roomBrighter'
                : 'roomDimmer'
              : 'roomRestore';
        // The pointer travels from the point it just moved to the Room grip; the keyboard's
        // focus is simply there.
        const keyboard = input === 'keyboard';
        const arrive = t.room + CUE_TRAVEL_MS;
        this.cue = {
          lightener: keyboard
            ? this.roomPosition
            : travel(elapsed, t.room, arrive, point.lightener, this.roomPosition),
          target: keyboard
            ? ROOM_CUE_TARGET
            : travel(elapsed, t.room, arrive, point.target, ROOM_CUE_TARGET),
          pressed: smooth && elapsed >= t.roomGrab && elapsed < t.roomReturn,
        };
      } else if (elapsed >= t.point) {
        this.phase = 'point';
        const target =
          elapsed < t.pointUp
            ? between(elapsed, t.pointGrab, t.pointUp, point.target, above)
            : elapsed < t.pointDown
              ? between(elapsed, t.pointUp + 400, t.pointDown, above, below)
              : between(elapsed, t.pointDown + 400, t.pointReturn, below, point.target);
        this.message =
          elapsed < t.pointUp
            ? 'lightBrighter'
            : elapsed < t.pointDown
              ? 'lightDimmer'
              : 'lightBrighter';
        this.curve = movePointOnCurves(
          [shaped],
          0,
          pointIndex,
          point.lightener,
          Math.round(target)
        )![0];
        if (smooth) {
          const visual = movePointOnCurves([shaped], 0, pointIndex, point.lightener, target)![0];
          this.curveFrame = {
            entityId: selected.entityId,
            pieces: drawnShape(visual.controlPoints).pieces,
            knots: visual.controlPoints,
          };
        }
        this.cue = {
          lightener: point.lightener,
          target,
          labelAbove: point.target < 70,
          pressed: elapsed >= t.pointGrab && elapsed < t.pointReturn,
        };
      } else {
        this.phase = 'preset';
        this.message = 'preset';
        transition('preset', elapsed - t.presetApply);
        this.cue = {
          lightener: 50,
          target: at(50),
          pressed: false,
        };
      }
      const key = JSON.stringify([
        this.phase,
        this.message,
        this.presetHighlighted,
        this.roomPosition,
        this.cue,
        this.curve.controlPoints,
        this.curveFrame && [this.curveFrame.pieces, this.curveFrame.knots],
      ]);
      if (key === shownKey && shownCurve) {
        this.curve = shownCurve;
        return;
      }
      shownKey = key;
      shownCurve = this.curve;
      this.changed();
    };
    frame(0);
    this._cancelFrame = startFrameLoop(
      t.complete,
      (elapsed) => {
        if (smooth && prefersReducedMotion()) this.freeze();
        else frame(elapsed);
      },
      () => {
        this._cancelFrame = null;
        frame(t.complete);
      }
    );
  }

  public freeze(): void {
    this._generation++;
    this._cancelFrame?.();
    this._cancelFrame = null;
    if (this.curve && this.curveFrame?.knots) {
      this.curve = {
        ...this.curve,
        controlPoints: this.curve.controlPoints.map((point, index) => ({
          lightener: point.lightener,
          target: Math.round(this.curveFrame!.knots![index]?.target ?? point.target),
        })),
      };
    }
    this.curveFrame = null;
    if (this.cue) this.cue = { ...this.cue, pressed: false, hold: undefined };
    this.frozen = true;
    this.changed();
  }

  public clear(): void {
    this._generation++;
    this._cancelFrame?.();
    this._cancelFrame = null;
    this.curve = null;
    this.phase = 'complete';
    this.message = 'complete';
    this.curveFrame = null;
    this.cue = null;
    this.roomPosition = null;
    this.presetHighlighted = false;
    this.frozen = false;
    this.changed();
  }
}
