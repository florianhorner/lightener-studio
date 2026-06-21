/**
 * PreviewController owns the live-preview lifecycle: requestAnimationFrame
 * handles, throttle timers, and a per-light brightness-restore snapshot.
 *
 * It is a stateful class (driven through a host interface), unlike
 * `load-lifecycle.ts` which is a pure reducer the card owns state for. That
 * split is deliberate: load state is plain data and reduces cleanly to a pure
 * function, while preview state is inherently imperative (timers, animation
 * frames) and would just leak back into the card if forced into a reducer
 * shape. Do not "fix" the inconsistency by collapsing both onto one pattern.
 */
import { sampleCurveAt } from './graph-math.js';
import type { Hass, LightCurve } from './types.js';

/**
 * Fixed Home Assistant `transition` (seconds) applied to every preview and
 * restore light call so brightness changes fade instead of snapping. Kept
 * under the 300 ms preview throttle (see `_intervalMs`) so rapid scrub/edit
 * updates don't queue up overlapping long fades. Hardcoded for v1 — no card
 * config option yet (promote to a constructor param if that's ever needed).
 * Devices without native transition support keep their current abrupt
 * behavior; we don't emulate fades with extra frontend calls. On slow Zigbee
 * meshes the ~50 ms margin under the throttle can clip a fade mid-flight, which
 * is acceptable (still smoother than the previous hard snap).
 */
const PREVIEW_TRANSITION_SECONDS = 0.25;

type PreviewBrightness = number | 'off';

/**
 * A queued preview push. `entityId: null` drives every visible curve at
 * `position` (the all-lights scrubber path); a non-null `entityId` drives just
 * that one light (the single-light, point-edit path). Both share one throttle.
 */
interface PreviewRequest {
  position: number;
  entityId: string | null;
  // Single-light point edits set this to the dragged point's exact target so the
  // light is driven to that value directly instead of sampling the curve at
  // `position`. Needed for the origin point: a non-zero dim floor at lightener 0
  // samples to 0 (off), so sampling would turn the light off while the user is
  // dragging its floor up. Undefined on the all-lights path (sample as before).
  value?: number;
}

export interface PreviewControllerHost {
  getHass(): Hass | null;
  getCurves(): LightCurve[];
  getScrubberPosition(): number | null;
  setScrubberPosition(position: number): void;
  getStorageEntityId(): string | undefined;
  persistScrubberPosition(entityId: string, position: number): void;
  setPreviewActive(active: boolean): void;
}

export class PreviewController {
  private _active = false;
  private _rafPending = false;
  private _trailingTimer: ReturnType<typeof setTimeout> | null = null;
  private _restoreBrightness: Map<string, number | null | undefined> = new Map();
  private _lastBrightness: Map<string, PreviewBrightness> = new Map();
  private _frameGeneration = 0;
  private _pending: PreviewRequest | null = null;

  public lastPreviewTime = 0;

  public constructor(
    private readonly _host: PreviewControllerHost,
    private readonly _intervalMs = 300
  ) {}

  public get active(): boolean {
    return this._active;
  }

  public start(): void {
    const hass = this._host.getHass();
    if (!hass || this._active) return;
    this._active = true;
    this._host.setPreviewActive(true);
    if (this._host.getScrubberPosition() === null) {
      this._host.setScrubberPosition(50);
      const entityId = this._host.getStorageEntityId();
      if (entityId) {
        this._host.persistScrubberPosition(entityId, 50);
      }
    }

    this._restoreBrightness.clear();
    this._lastBrightness.clear();
    for (const curve of this._host.getCurves()) {
      if (!curve.visible) continue;
      const state = hass.states[curve.entityId];
      if (state) {
        this._restoreBrightness.set(
          curve.entityId,
          state.state === 'off' ? null : (state.attributes.brightness ?? undefined)
        );
      }
    }
    this.refresh(true);
  }

  public stop(): void {
    if (!this._active) return;
    // Deactivate FIRST. A null-hass disconnect must still leave the controller
    // inactive and restartable — only the brightness-restore service calls
    // below need a live hass; the state reset does not.
    this._active = false;
    this._host.setPreviewActive(false);
    this._rafPending = false;
    this._frameGeneration++;
    this._clearTrailingTimer();

    const hass = this._host.getHass();
    if (hass) {
      for (const [entityId, brightness] of this._restoreBrightness) {
        if (brightness === null) {
          hass
            .callService('light', 'turn_off', {
              entity_id: entityId,
              transition: PREVIEW_TRANSITION_SECONDS,
            })
            .catch(() => {});
        } else if (brightness === undefined) {
          hass
            .callService('light', 'turn_on', {
              entity_id: entityId,
              transition: PREVIEW_TRANSITION_SECONDS,
            })
            .catch(() => {});
        } else {
          hass
            .callService('light', 'turn_on', {
              entity_id: entityId,
              brightness,
              transition: PREVIEW_TRANSITION_SECONDS,
            })
            .catch(() => {});
        }
      }
    }
    this._restoreBrightness.clear();
    this._lastBrightness.clear();
  }

  public disconnect(): void {
    this.stop();
    this._clearTrailingTimer();
    this._rafPending = false;
    this._pending = null;
    this._frameGeneration++;
  }

  public refresh(force = false): void {
    if (!this._active) return;
    if (this._host.getScrubberPosition() === null) {
      this._host.setScrubberPosition(50);
    }
    this.previewLights(this._host.getScrubberPosition() ?? 50, force);
  }

  public previewLights(position: number, force = false): void {
    this._schedule({ position, entityId: null }, force);
  }

  /**
   * Drive a SINGLE light, leaving every other light untouched. Used while
   * editing one curve's control point: the edited light tracks the point under
   * the user's finger, the rest hold their last previewed value. Pass `value`
   * (the dragged point's target) to drive the light to that exact level — the
   * origin point's dim floor would otherwise sample to 0 (off); omit it to
   * sample the curve at `position`. Shares previewLights()'s throttle / RAF /
   * dedupe — a single-light push and an all-lights scrub never run at once
   * (you either drag a point or drag the scrubber), so the shared state is safe.
   */
  public previewSingleLight(
    entityId: string,
    position: number,
    force = false,
    value?: number
  ): void {
    this._schedule({ position, entityId, value }, force);
  }

  private _schedule(request: PreviewRequest, force: boolean): void {
    const hass = this._host.getHass();
    if (!this._active || !hass) return;
    this._pending = request;
    if (force) {
      this.lastPreviewTime = 0;
      this._rafPending = false;
      this._frameGeneration++;
      // A scoped (single-light) force resets only that light's dedupe state so a
      // later all-lights refresh still skips the unchanged lights; an all-lights
      // force clears everything, matching the original previewLights() behavior.
      if (request.entityId === null) {
        this._lastBrightness.clear();
      } else {
        this._lastBrightness.delete(request.entityId);
      }
      this._clearTrailingTimer();
    }

    const now = Date.now();
    const elapsed = now - this.lastPreviewTime;
    if (elapsed < this._intervalMs) {
      if (!this._trailingTimer) {
        this._trailingTimer = setTimeout(() => {
          this._trailingTimer = null;
          if (this._pending !== null) {
            this._schedule(this._pending, false);
          }
        }, this._intervalMs - elapsed);
      }
      return;
    }
    if (this._rafPending) return;
    this._clearTrailingTimer();
    this._rafPending = true;
    const frameGeneration = this._frameGeneration;

    requestAnimationFrame(() => {
      if (frameGeneration !== this._frameGeneration) return;
      this._rafPending = false;
      const frameHass = this._host.getHass();
      if (!this._active || !frameHass) return;
      this.lastPreviewTime = Date.now();
      const pending = this._pending ?? request;

      if (pending.entityId === null) {
        for (const curve of this._host.getCurves()) {
          if (!curve.visible) continue;
          this._pushCurve(frameHass, curve, pending.position);
        }
      } else {
        const curve = this._host.getCurves().find((c) => c.entityId === pending.entityId);
        if (curve && curve.visible) {
          this._pushCurve(frameHass, curve, pending.position, pending.value);
        }
      }
    });
  }

  /**
   * Sample one curve at `position` and issue the matching light service call,
   * deduped against the last brightness pushed for that entity.
   */
  private _pushCurve(hass: Hass, curve: LightCurve, position: number, value?: number): void {
    // Safety net for restore: snapshot this light's pre-preview state the first
    // time we ever drive it, in case it was hidden at start() (and so skipped by
    // the initial snapshot) and later unhidden mid-session. Without this, stop()
    // would leave a newly-unhidden light stuck at its preview value.
    this._ensureRestoreSnapshot(hass, curve.entityId);
    // Drive to the explicit dragged target when given (point-edit path), else
    // sample the curve. Clamp to 0-100 to match sampleCurveAt's range.
    const level = Math.round(
      Math.max(0, Math.min(100, value ?? sampleCurveAt(curve.controlPoints, position)))
    );
    const brightness = Math.round((level / 100) * 255);
    if (brightness === 0) {
      if (this._lastBrightness.get(curve.entityId) === 'off') return;
      this._lastBrightness.set(curve.entityId, 'off');
      hass
        .callService('light', 'turn_off', {
          entity_id: curve.entityId,
          transition: PREVIEW_TRANSITION_SECONDS,
        })
        .catch(() => {});
    } else {
      if (this._lastBrightness.get(curve.entityId) === brightness) return;
      this._lastBrightness.set(curve.entityId, brightness);
      hass
        .callService('light', 'turn_on', {
          entity_id: curve.entityId,
          brightness,
          transition: PREVIEW_TRANSITION_SECONDS,
        })
        .catch(() => {});
    }
  }

  /**
   * Capture an entity's current brightness into the restore snapshot, once.
   * No-op if already snapshotted (the start()-time visible set) or hass lacks
   * the state. Mirrors start()'s snapshot shape: null = was off, undefined =
   * on with no brightness attr, number = exact brightness.
   */
  private _ensureRestoreSnapshot(hass: Hass, entityId: string): void {
    if (this._restoreBrightness.has(entityId)) return;
    const state = hass.states[entityId];
    if (!state) return;
    this._restoreBrightness.set(
      entityId,
      state.state === 'off' ? null : (state.attributes.brightness ?? undefined)
    );
  }

  private _clearTrailingTimer(): void {
    if (this._trailingTimer) {
      clearTimeout(this._trailingTimer);
      this._trailingTimer = null;
    }
  }
}
