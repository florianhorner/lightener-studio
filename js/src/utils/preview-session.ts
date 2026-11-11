import type { Hass } from './types.js';
import { randomId } from './editor-draft.js';

export type LightValue = number | 'off' | 'on';
export interface PreviewLight {
  entityId: string;
  /** The light as it was before Watch first changed it. */
  before: LightValue;
  /** A command is on its way to Home Assistant. */
  inFlight: boolean;
  /** Restore once the command in flight has finished. */
  restoreAfter: boolean;
  /** Home Assistant rejected a preview: this Watch sends the light no further previews. */
  rejected?: boolean;
}
export interface PreviewSession {
  id: number;
  principal: string;
  group: string;
  entry: string;
  phase: 'watching' | 'restoring' | 'done';
  lights: Map<string, PreviewLight>;
}

/** Give up waiting on a command after this long, so nothing stays locked. */
export const PREVIEW_COMMAND_TIMEOUT_MS = 10_000;

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

function send(hass: Hass, entityId: string, target: LightValue): Promise<unknown> {
  try {
    return Promise.resolve(
      hass.callService(
        'light',
        target === 'off' ? 'turn_off' : 'turn_on',
        {
          entity_id: entityId,
          ...(typeof target === 'number' ? { brightness: target } : {}),
          transition: 0.25,
        },
        undefined,
        false
      )
    );
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Watch sessions for the whole page, in memory only.
 *
 * Restoration is best-effort and silent: when Watch ends, every light it
 * changed gets one command back to its value from before Watch. A light is
 * only locked while a command to it is in flight, and never longer than
 * PREVIEW_COMMAND_TIMEOUT_MS, so Watch can always start again.
 */
export class PreviewSessionRegistry {
  private _serial = 0;
  private _sessions = new Map<number, PreviewSession>();
  private _reservations = new Map<string, number | string>();
  private _mutations = new Map<string, string>();
  private _listeners = new Set<() => void>();
  /** How a restore that waits on a command in flight finds a usable `hass`, per session. */
  private _deferred = new Map<number, { resolve: () => Hass | null; dispose: () => void }>();
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
  private _notify(): void {
    for (const listener of this._listeners) listener();
  }
  list(principal: string, group: string): PreviewSession[] {
    return [...this._sessions.values()].filter(
      (s) => s.principal === principal && s.group === group
    );
  }
  create(principal: string, group: string, entry = group): PreviewSession {
    const session: PreviewSession = {
      id: ++this._serial,
      principal,
      group,
      entry,
      phase: 'watching',
      lights: new Map(),
    };
    this._sessions.set(session.id, session);
    return session;
  }
  reserve(session: PreviewSession, ids: string[]): boolean {
    if (this._mutations.has(session.group)) return false;
    if (ids.some((id) => this._reservations.has(id) && this._reservations.get(id) !== session.id))
      return false;
    for (const id of ids) this._reservations.set(id, session.id);
    return true;
  }
  /** Reserve mutation inputs atomically, including additions owned by another group. */
  beginMutation(group: string, ids: readonly string[]): (() => void) | null {
    if (this._mutations.has(group) || ids.some((id) => this._reservations.has(id))) return null;
    const owner = `mutation:${randomId()}`;
    this._mutations.set(group, owner);
    for (const id of ids) this._reservations.set(id, owner);
    this._notify();
    return () => {
      if (this._mutations.get(group) !== owner) return;
      this._mutations.delete(group);
      for (const id of ids) if (this._reservations.get(id) === owner) this._reservations.delete(id);
      this._notify();
    };
  }
  mutationBlocked(group: string): boolean {
    return this._mutations.has(group);
  }

  /** Send one preview or restore command; the light stays locked until it finishes or times out. */
  private _issue(
    session: PreviewSession,
    light: PreviewLight,
    target: LightValue,
    hass: Hass,
    restore: boolean
  ): void {
    light.inFlight = true;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      light.inFlight = false;
      if (!restore && light.restoreAfter) {
        light.restoreAfter = false;
        // The `hass` this preview used may be stale by now: ask again, so a lost
        // connection, user or permission sends nothing.
        const live = this._deferred.get(session.id)?.resolve();
        if (live) {
          this._issue(session, light, light.before, live, true);
          return;
        }
      }
      this._settle(session);
    };
    const timer = setTimeout(finish, PREVIEW_COMMAND_TIMEOUT_MS);
    send(hass, light.entityId, target).then(finish, (error: unknown) => {
      // A rejected preview is terminal for this light: later targets are dropped,
      // not sent after it. Ending Watch still sends its one restore.
      if (!restore) light.rejected = true;
      if (
        !restore &&
        session.phase !== 'done' &&
        error !== null &&
        typeof error === 'object' &&
        (error as { code?: unknown }).code === 'unauthorized'
      ) {
        // A correlated denial invalidates queued previews and waiting restores,
        // even if this command already timed out. Do not release a newer
        // command's in-flight lock: finish() still belongs to this command.
        session.phase = 'restoring';
        this.abandon(session);
      }
      finish();
    });
  }

  preview(session: PreviewSession, light: PreviewLight, target: LightValue, hass: Hass): void {
    if (session.phase !== 'watching' || light.inFlight || light.rejected) return;
    this._issue(session, light, target, hass, false);
  }

  /**
   * End Watch. With a usable `hass`, every changed light is sent back to its
   * value from before Watch, once; without one, the lights stay as they are.
   *
   * A light whose preview command is still in flight is restored when that
   * command finishes or times out (a timeout does not cancel the command).
   * `live` is asked again at that moment and must return a usable `hass` for
   * the same user and connection, or nothing is sent. A `disconnected` event
   * on the connection, or `abandon`, drops the waiting restores.
   */
  finish(session: PreviewSession, hass: Hass | null, live: () => Hass | null = () => hass): void {
    if (session.phase !== 'watching') return;
    session.phase = 'restoring';
    if (hass) {
      const waiting = [...session.lights.values()].filter((light) => light.inFlight);
      if (waiting.length) {
        const connection = hass.connection;
        const dispose = () => {
          connection?.removeEventListener('disconnected', lost);
          this._deferred.delete(session.id);
        };
        const lost = () => this.abandon(session);
        connection?.addEventListener('disconnected', lost);
        this._deferred.set(session.id, { resolve: live, dispose });
      }
      for (const light of session.lights.values()) {
        if (light.inFlight) light.restoreAfter = true;
        else this._issue(session, light, light.before, hass, true);
      }
    }
    this._settle(session);
  }

  /** Drop restores still waiting on a command in flight; nothing more is sent for this session. */
  abandon(session: PreviewSession): void {
    for (const light of session.lights.values()) light.restoreAfter = false;
    this._settle(session);
  }

  private _settle(session: PreviewSession): void {
    if (session.phase === 'restoring' && ![...session.lights.values()].some((l) => l.inFlight)) {
      session.phase = 'done';
      this._sessions.delete(session.id);
    }
    if (session.phase === 'done' || ![...session.lights.values()].some((l) => l.restoreAfter))
      this._deferred.get(session.id)?.dispose();
    if (session.phase !== 'watching')
      for (const [id, owner] of this._reservations)
        if (owner === session.id && (session.phase === 'done' || !session.lights.get(id)?.inFlight))
          this._reservations.delete(id);
    this._notify();
  }
}
export const previewSessions = new PreviewSessionRegistry();
