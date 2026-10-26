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
import { UI } from './strings.js';
import { sampleCurveAt } from './graph-math.js';
import type { Hass, LightCurve } from './types.js';
import {
  lightValue,
  previewPrincipal,
  previewSessions,
  previewUsable,
  type PreviewLight,
  type PreviewSession,
  type PreviewSessionRegistry,
  type LightValue,
} from './preview-session.js';

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
  getConfigEntryId?(): string | undefined;
  persistScrubberPosition(entityId: string, position: number): void;
  setPreviewActive(active: boolean): void;
  canDispatch?(): boolean;
  restorationChanged?(): void;
}

export class PreviewController {
  private _active = false;
  private _rafPending = false;
  private _trailingTimer: ReturnType<typeof setTimeout> | null = null;
  private _session: PreviewSession | null = null;
  private _unsubscribe: (() => void) | null = null;
  private _connection: Hass['connection'];
  private _onConnectionLost = () => this.disconnect();
  private _queued = new Map<string, { curve: LightCurve; position: number; value?: number }>();
  private _advancing = false;
  public admissionIssue: string | null = null;
  private _lastBrightness: Map<string, PreviewBrightness> = new Map();
  private _frameGeneration = 0;
  private _pending: PreviewRequest | null = null;

  public lastPreviewTime = 0;

  public constructor(
    private readonly _host: PreviewControllerHost,
    private readonly _intervalMs = 300,
    private readonly _registry: PreviewSessionRegistry = previewSessions
  ) {}

  public get active(): boolean {
    return this._active;
  }

  public get sessions(): PreviewSession[] {
    const principal = previewPrincipal(this._host.getHass());
    const group = this._host.getStorageEntityId();
    return principal && group ? this._registry.list(principal, group) : [];
  }

  public get reviewSessions(): PreviewSession[] {
    return this.sessions.filter((session) => session.phase !== 'watching');
  }
  public get otherWatching(): boolean {
    return this.sessions.some(
      (session) => session.phase === 'watching' && session !== this._session
    );
  }

  public get mutationBlocked(): boolean {
    return this._registry.mutationBlocked(this._host.getStorageEntityId() ?? '');
  }

  public get blocked(): boolean {
    return (
      this.sessions.some((session) => session.phase !== 'settled') ||
      this._registry.mutationBlocked(this._host.getStorageEntityId() ?? '')
    );
  }

  public connect(): void {
    this.observe();
    this._unsubscribe ??= this._registry.subscribe(() => {
      this._advance();
      this._host.restorationChanged?.();
    });
  }

  /** Called on every HA snapshot; a known gap permanently disables automation. */
  public observe(): void {
    const hass = this._host.getHass();
    if (this._connection !== hass?.connection) {
      if (this._session) this.disconnect();
      this._connection?.removeEventListener('disconnected', this._onConnectionLost);
      this._connection = hass?.connection;
      this._connection?.addEventListener('disconnected', this._onConnectionLost);
    }
    if (this._session && !this._authorized(this._session)) this.disconnect();
    if (this._active && this._session) {
      for (const light of this._session.lights.values()) {
        if (
          !light.pending &&
          light.acknowledged !== undefined &&
          lightValue(hass, light.entityId) !== light.acknowledged
        ) {
          light.conflicted = true;
          light.outcome = 'skipped';
          this._queued.delete(light.entityId);
        }
      }
    }
  }

  private _authorized(session: PreviewSession): boolean {
    const hass = this._host.getHass();
    return (
      previewUsable(hass) &&
      previewPrincipal(hass) === session.principal &&
      this._host.getStorageEntityId() === session.group &&
      (this._host.getConfigEntryId?.() ?? session.group) === session.entry &&
      (this._host.canDispatch?.() ?? true)
    );
  }

  public start(): void {
    this.connect();
    const hass = this._host.getHass(),
      group = this._host.getStorageEntityId();
    if (
      !previewUsable(hass) ||
      !group ||
      this._active ||
      this.blocked ||
      !(this._host.canDispatch?.() ?? true)
    )
      return;
    this.admissionIssue = null;
    this._session = this._registry.create(
      previewPrincipal(hass)!,
      group,
      crypto.randomUUID(),
      this._host.getConfigEntryId?.() ?? group
    );
    if (!this._session) {
      this.admissionIssue = UI.restoration.full;
      this._host.restorationChanged?.();
      return;
    }
    this._active = true;
    this._host.setPreviewActive(true);
    if (this._host.getScrubberPosition() === null) {
      this._host.setScrubberPosition(50);
      this._host.persistScrubberPosition(group, 50);
    }
    this._lastBrightness.clear();
    this.refresh(true);
  }

  private _fence(): void {
    this._active = false;
    this._host.setPreviewActive(false);
    this._rafPending = false;
    this._frameGeneration++;
    this._pending = null;
    this._queued.clear();
    this._clearTrailingTimer();
  }

  public stop(automatic = true): Promise<boolean> {
    this._fence();
    const session = this._session;
    if (!session) return Promise.resolve(!this.blocked);
    if (session.phase === 'watching') this._registry.stop(session, automatic);
    else if (!automatic) this._registry.stop(session, false);
    this._advance();
    if (session.phase !== 'stopping') return Promise.resolve(session.phase === 'settled');
    return new Promise((resolve) => {
      const unsubscribe = this._registry.subscribe(() => {
        if (session.phase === 'stopping') return;
        unsubscribe();
        resolve(session.phase === 'settled');
      });
    });
  }

  public disconnect(): void {
    this._fence();
    if (this._session) this._registry.stop(this._session, false);
    this._unsubscribe?.();
    this._unsubscribe = null;
    this._connection?.removeEventListener('disconnected', this._onConnectionLost);
    this._connection = undefined;
    this._session = null;
  }

  private _advance(): void {
    if (this._advancing) return;
    this._advancing = true;
    try {
      const session = this._session;
      if (!session) return;
      if (session.phase !== 'watching' && this._active) this._fence();
      if (!this._authorized(session)) {
        if (session.phase !== 'settled') this._registry.stop(session, false);
        return;
      }
      const hass = this._host.getHass()!;
      for (const light of session.lights.values()) {
        if (light.pending || light.disposition) continue;
        if (this._active && session.phase === 'watching' && !light.conflicted) {
          const queued = this._queued.get(light.entityId);
          if (queued) {
            this._queued.delete(light.entityId);
            const current = this._host
              .getCurves()
              .find((curve) => curve.entityId === light.entityId && curve.visible);
            if (current) this._pushCurve(hass, current, queued.position, queued.value);
          }
        } else if (session.phase === 'stopping' && session.automatic) {
          const member = this._host.getCurves().some((curve) => curve.entityId === light.entityId);
          if (
            !member ||
            light.conflicted ||
            light.acknowledged === undefined ||
            lightValue(hass, light.entityId) !== light.acknowledged
          ) {
            light.conflicted = true;
            light.outcome = 'skipped';
            this._registry.changed(session);
          } else this._registry.issue(session, light, light.before, true, hass);
        }
      }
      if (
        session.phase === 'stopping' &&
        ![...session.lights.values()].some((light) => light.pending)
      ) {
        session.automatic = false;
        this._registry.changed(session);
      }
    } finally {
      this._advancing = false;
    }
  }

  public beginMutation(ids: readonly string[]): (() => void) | null {
    const group = this._host.getStorageEntityId(),
      hass = this._host.getHass();
    if (!group || !previewUsable(hass) || !(this._host.canDispatch?.() ?? true) || this.blocked)
      return null;
    return this._registry.beginMutation(group, [
      ...new Set([...this._host.getCurves().map((curve) => curve.entityId), ...ids]),
    ]);
  }

  /** A review token also binds current reported values and current membership. */
  public reviewToken(): string {
    return JSON.stringify([
      previewUsable(this._host.getHass()),
      this._host.canDispatch?.() ?? true,
      previewPrincipal(this._host.getHass()),
      this._host.getStorageEntityId(),
      this._host.getConfigEntryId?.(),
      this._host
        .getCurves()
        .map((curve) => curve.entityId)
        .sort(),
      this.sessions.map((s) => [
        s.id,
        s.revision,
        [...s.lights.values()].map((light) => [
          light.entityId,
          lightValue(this._host.getHass(), light.entityId),
        ]),
      ]),
    ]);
  }

  public keepCurrent(token: string): boolean {
    if (
      !previewUsable(this._host.getHass()) ||
      !(this._host.canDispatch?.() ?? true) ||
      token !== this.reviewToken()
    )
      return false;
    if (this.otherWatching && !this.reviewSessions.some((session) => session.phase !== 'settled'))
      return false;
    for (const session of this.reviewSessions)
      if (session.phase !== 'settled') this._registry.abandon(session);
    return true;
  }

  public restoreSelected(token: string, selected: readonly string[]): boolean {
    if (token !== this.reviewToken()) return false;
    const sessions = this.reviewSessions.filter((session) => session.phase === 'needs-review');
    const hass = this._host.getHass();
    if (!previewUsable(hass) || sessions.some((s) => !this._authorized(s))) return false;
    const targets: Array<[PreviewSession, PreviewLight]> = [];
    for (const session of sessions)
      for (const light of session.lights.values()) {
        if (!selected.includes(light.entityId)) continue;
        if (
          light.pending ||
          light.disposition ||
          lightValue(hass, light.entityId) === null ||
          !this._host.getCurves().some((curve) => curve.entityId === light.entityId)
        )
          return false;
        targets.push([session, light]);
      }
    // Validate the entire selection before issuing any command. This is a fresh
    // deliberate action; no restoration is triggered by reconnect or late receipt.
    if (targets.length !== new Set(selected).size) return false;
    for (const [session, light] of targets) {
      session.automatic = false;
      this._registry.issue(session, light, light.before, true, hass);
    }
    return true;
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

      const session = this._session;
      if (!session || !this._authorized(session)) {
        this.disconnect();
        return;
      }
      const targets = this._host
        .getCurves()
        .filter(
          (curve) =>
            curve.visible &&
            (pending.entityId === null || curve.entityId === pending.entityId) &&
            lightValue(frameHass, curve.entityId) !== null
        );
      if (
        !this._registry.reserve(
          session,
          targets.map((curve) => curve.entityId)
        )
      ) {
        this.admissionIssue = UI.restoration.overlap;
        this._registry.stop(session, false);
        this._fence();
        this._host.restorationChanged?.();
        return;
      }
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
    const session = this._session;
    const before = lightValue(hass, curve.entityId);
    if (
      !session ||
      !this._active ||
      !this._authorized(session) ||
      before === null ||
      !this._host
        .getCurves()
        .some((current) => current.entityId === curve.entityId && current.visible)
    )
      return;
    let light = session.lights.get(curve.entityId);
    if (light?.conflicted) return;
    if (light?.pending) {
      this._queued.set(curve.entityId, { curve, position, value });
      return;
    }
    // Drive to the explicit dragged target when given (point-edit path), else
    // sample the curve. Clamp to 0-100 to match sampleCurveAt's range.
    //
    // Deliberately not rounded to a whole percent before the 0-255 conversion.
    // Rounding here first put the point this code calls off at <0.5%, while the
    // 0-255 conversion below only yields 0 under 0.5/255 = 0.196%. A sample
    // between the two made the card call `light.turn_off` on a light the saved
    // curve holds at brightness 1.
    //
    // This narrows the gap rather than closing it. The backend is not a pure
    // 0-255 interpolation: `_percent_to_brightness` quantises each target
    // first, the group level is an integer, and Python's round() goes half to
    // even where Math.round goes half up. Measured over 303k (curve, integer
    // position) pairs against the real `create_brightness_map`, the cases where
    // card and backend disagree about whether the light is off drop from 10,230
    // to 597. What survives sits at targets of 1-2%, within one 0-255 step.
    //
    // The legend displays the curve percentage, not the quantized device step:
    // positive samples that round below 1% read "<1%", and exact zero reads "Off".
    //
    // Cost: `_lastBrightness` now dedupes on up to 256 values instead of 101.
    // The 300ms throttle above caps service calls either way, so this adds at
    // most a few calls during a slow scrub and never raises the ceiling.
    const level = Math.max(0, Math.min(100, value ?? sampleCurveAt(curve.controlPoints, position)));
    const brightness = Math.round((level / 100) * 255);
    const target: LightValue = brightness === 0 ? 'off' : brightness;
    if (this._lastBrightness.get(curve.entityId) === target) return;
    if (!light) {
      light = {
        entityId: curve.entityId,
        name: curve.friendlyName,
        before,
        target,
        outcome: 'preview-pending',
        pending: false,
        disposition: false,
        conflicted: false,
        operation: 0,
      };
      session.lights.set(curve.entityId, light);
    }
    this._lastBrightness.set(curve.entityId, target);
    this._registry.issue(session, light, target, false, hass);
  }

  private _clearTrailingTimer(): void {
    if (this._trailingTimer) {
      clearTimeout(this._trailingTimer);
      this._trailingTimer = null;
    }
  }
}
