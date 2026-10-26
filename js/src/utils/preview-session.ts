import { UI } from './strings.js';
import type { Hass } from './types.js';

export type LightValue = number | 'off' | 'on';
export type PreviewOutcome = keyof typeof UI.restoration.outcomes;
export interface PreviewLight {
  entityId: string;
  name: string;
  before: LightValue;
  target: LightValue;
  acknowledged?: LightValue;
  outcome: PreviewOutcome;
  /** A transport rejection does not close this execution fence. */
  pending: boolean;
  disposition: boolean;
  conflicted: boolean;
  operation: number;
  uncertain?: boolean;
}
export interface PreviewSession {
  id: number;
  principal: string;
  group: string;
  entry: string;
  owner: string;
  generation: number;
  revision: number;
  phase: 'watching' | 'stopping' | 'settled' | 'needs-review';
  automatic: boolean;
  lights: Map<string, PreviewLight>;
}

export function lightValue(hass: Hass | null, entityId: string): LightValue | null {
  const state = hass?.states[entityId];
  if (state?.state === 'off') return 'off';
  if (state?.state !== 'on') return null;
  const brightness = state.attributes.brightness;
  if (brightness === undefined) return 'on';
  return Number.isFinite(brightness) && brightness >= 0 && brightness <= 255 ? brightness : null;
}
export function previewPrincipal(hass: Hass | null): string | null {
  const id = hass?.user?.id?.trim();
  return id ? `${location.origin}/${id}` : null;
}
export function previewUsable(hass: Hass | null): hass is Hass {
  return (
    !!hass &&
    !!previewPrincipal(hass) &&
    hass.user.is_admin &&
    hass.connected !== false &&
    hass.connection?.connected !== false
  );
}

// Verified HA websocket errors originate in correlated result frames. Connection
// loss is numeric/nested, and arbitrary rejections must never release ownership.
const TERMINAL_ERRORS = new Set([
  'not_found',
  'invalid_format',
  'service_validation_error',
  'home_assistant_error',
  'unknown_error',
  'unauthorized',
]);
function terminalError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || Object.getPrototypeOf(error) !== Object.prototype)
    return false;
  const value = error as { code?: unknown; message?: unknown };
  return (
    typeof value.code === 'string' &&
    TERMINAL_ERRORS.has(value.code) &&
    typeof value.message === 'string'
  );
}
function terminalSuccess(result: unknown): boolean {
  const value = result as { context?: { id?: unknown } } | null;
  return typeof value?.context?.id === 'string' && value.context.id.length > 0;
}

/** Document memory only. No session retains a card, connection, or DOM listener. */
export class PreviewSessionRegistry {
  private _serial = 0;
  private _sessions = new Map<number, PreviewSession>();
  private _reservations = new Map<string, number | string>();
  private _mutations = new Map<string, string>();
  private _listeners = new Set<() => void>();
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
  list(principal: string, group: string): PreviewSession[] {
    return [...this._sessions.values()].filter(
      (s) => s.principal === principal && s.group === group
    );
  }
  create(principal: string, group: string, owner: string, entry = group): PreviewSession | null {
    // Resolved summaries are bounded; unresolved sessions are never evicted.
    const resolved = [...this._sessions.values()].filter((s) => s.phase === 'settled');
    for (const session of resolved.slice(0, Math.max(0, resolved.length - 15)))
      this._sessions.delete(session.id);
    if (this._sessions.size >= 128) return null;
    const session: PreviewSession = {
      id: ++this._serial,
      principal,
      group,
      entry,
      owner,
      generation: 1,
      revision: 0,
      phase: 'watching',
      automatic: true,
      lights: new Map(),
    };
    this._sessions.set(session.id, session);
    return session;
  }
  reserve(session: PreviewSession, ids: string[]): boolean {
    if (this._mutations.has(session.group)) return false;
    if (ids.some((id) => this._reservations.has(id) && this._reservations.get(id) !== session.id))
      return false;
    if (session.lights.size + ids.filter((id) => !session.lights.has(id)).length > 256)
      return false;
    for (const id of ids) this._reservations.set(id, session.id);
    return true;
  }
  /** Reserve mutation inputs atomically, including additions owned by another group. */
  beginMutation(group: string, ids: readonly string[]): (() => void) | null {
    if (
      this._mutations.size >= 128 ||
      this._mutations.has(group) ||
      ids.some((id) => this._reservations.has(id))
    )
      return null;
    const owner = `mutation:${crypto.randomUUID()}`;
    this._mutations.set(group, owner);
    for (const id of ids) this._reservations.set(id, owner);
    for (const listener of this._listeners) listener();
    return () => {
      if (this._mutations.get(group) !== owner) return;
      this._mutations.delete(group);
      for (const id of ids) if (this._reservations.get(id) === owner) this._reservations.delete(id);
      for (const listener of this._listeners) listener();
    };
  }
  mutationBlocked(group: string): boolean {
    return this._mutations.has(group);
  }
  changed(session: PreviewSession): void {
    session.revision++;
    if (session.phase !== 'watching') {
      const unresolved = [...session.lights.values()].some(
        (light) => light.pending || !light.disposition
      );
      session.phase = unresolved ? (session.automatic ? 'stopping' : 'needs-review') : 'settled';
    }
    for (const light of session.lights.values()) {
      if (
        !light.pending &&
        light.disposition &&
        this._reservations.get(light.entityId) === session.id
      )
        this._reservations.delete(light.entityId);
    }
    for (const listener of this._listeners) listener();
  }
  stop(session: PreviewSession, automatic: boolean): void {
    if (session.phase === 'settled') return;
    session.generation++;
    session.automatic &&= automatic;
    if (!automatic)
      for (const light of session.lights.values())
        if (light.pending) {
          light.uncertain = true;
          light.outcome = 'outcome-unknown';
        }
    session.phase = 'stopping';
    this.changed(session);
  }
  abandon(session: PreviewSession): void {
    if (session.phase === 'watching') return;
    this.stop(session, false);
    for (const light of session.lights.values()) light.disposition = true;
    this.changed(session);
  }
  /** HA success means the service handler completed, never physical convergence. */
  issue(
    session: PreviewSession,
    light: PreviewLight,
    target: LightValue,
    restore: boolean,
    hass: Hass
  ): void {
    if (light.pending || (restore && session.phase === 'watching')) return;
    light.pending = true;
    light.uncertain = false;
    light.operation++;
    const operation = light.operation;
    light.target = target;
    light.outcome = restore ? 'restore-pending' : 'preview-pending';
    light.disposition = false;
    this.changed(session);
    const timer = setTimeout(() => {
      if (!light.pending || light.operation !== operation) return;
      light.outcome = 'outcome-unknown';
      this.stop(session, false);
    }, 10_000);
    const complete = (terminal: boolean, success: boolean) => {
      clearTimeout(timer);
      if (light.operation !== operation) return;
      if (!terminal) {
        light.outcome = 'outcome-unknown';
        this.stop(session, false);
        return;
      }
      light.pending = false;
      light.outcome = success
        ? restore
          ? 'restore-acknowledged'
          : 'preview-acknowledged'
        : restore
          ? 'restore-rejected'
          : 'preview-rejected';
      if (success) light.acknowledged = target;
      if (restore && success && !light.uncertain) light.disposition = true;
      if (!success) this.stop(session, false);
      this.changed(session);
    };
    // callService forwards HA's correlated result, with error notifications
    // disabled so translation/loading cannot postpone receipt classification.
    try {
      Promise.resolve(
        hass.callService(
          'light',
          target === 'off' ? 'turn_off' : 'turn_on',
          {
            entity_id: light.entityId,
            ...(typeof target === 'number' ? { brightness: target } : {}),
            transition: 0.25,
          },
          undefined,
          false
        )
      ).then(
        (result) => complete(terminalSuccess(result), true),
        (error: unknown) => complete(terminalError(error), false)
      );
    } catch (error) {
      complete(terminalError(error), false);
    }
  }
}
export const previewSessions = new PreviewSessionRegistry();
