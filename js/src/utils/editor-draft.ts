/** Navigation drafts live only in this document. No browser storage or raw HA records. */
import type { ControlPoint, LightCurve } from './types.js';
export type Principal = { origin: string; userId: string; authEpoch: number };
export type Scope = Principal & { configEntryId: string; surface: 'sidebar' | 'dashboard' };
export type Geometry = { entityId: string; points: ControlPoint[] }[];
export type DraftPayload = {
  schema: 1;
  entityId: string;
  baselineRevision: string | null;
  baseline: Geometry;
  local: Geometry;
  undo: Geometry[];
  outcome: 'ordinary' | 'conflict' | 'unknown' | 'reread' | 'runtime' | 'unsupported';
};
export type Claim = { draftId: string; ownerId: string; claimEpoch: number; version: number };
export type ResumeTicket = {
  draftId: string;
  ownerId: string;
  releasedEpoch: number;
  version: number;
};
export type Summary = {
  draftId: string;
  version: number;
  updatedAt: number;
  affectedIds: string[];
  complete: boolean;
};
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'invalid' | 'capacity' | 'stale' | 'busy' | 'lost'; claim?: Claim };
type RecordEntry = {
  scope: Scope;
  payload: DraftPayload;
  draftId: string;
  ownerId: string | null;
  claimEpoch: number;
  version: number;
  createdAt: number;
  updatedAt: number;
  complete: boolean;
  bytes: number;
};
export const DRAFT_LIMITS = {
  records: 32,
  recordBytes: 4 * 1024 * 1024,
  totalBytes: 16 * 1024 * 1024,
};
export function projectGeometry(curves: LightCurve[]): Geometry {
  return curves.map((curve) => ({
    entityId: curve.entityId,
    points: curve.controlPoints.map((point) => ({
      lightener: point.lightener,
      target: point.target,
    })),
  }));
}
export function geometryEqual(a: Geometry, b: Geometry): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
function geometry(value: unknown): Geometry | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>(),
    result: Geometry = [];
  for (const item of value) {
    if (
      !item ||
      typeof item.entityId !== 'string' ||
      !item.entityId ||
      ids.has(item.entityId) ||
      !Array.isArray(item.points)
    )
      return null;
    ids.add(item.entityId);
    const points: ControlPoint[] = [];
    for (const point of item.points) {
      if (
        !point ||
        !Number.isFinite(point.lightener) ||
        !Number.isFinite(point.target) ||
        point.lightener < 0 ||
        point.lightener > 100 ||
        point.target < 0 ||
        point.target > 100
      )
        return null;
      points.push({ lightener: point.lightener, target: point.target });
    }
    result.push({ entityId: item.entityId, points });
  }
  return result;
}
export function projectDraft(value: DraftPayload): DraftPayload | null {
  if (
    !value ||
    value.schema !== 1 ||
    typeof value.entityId !== 'string' ||
    !value.entityId ||
    !(
      value.baselineRevision === null ||
      (typeof value.baselineRevision === 'string' &&
        /^v1:[0-9a-f]{64}$/.test(value.baselineRevision))
    ) ||
    !['ordinary', 'conflict', 'unknown', 'reread', 'runtime', 'unsupported'].includes(
      value.outcome
    ) ||
    !Array.isArray(value.undo) ||
    value.undo.length > 50
  )
    return null;
  const baseline = geometry(value.baseline),
    local = geometry(value.local),
    undo = Array.from(value.undo, geometry);
  if (!baseline || !local || undo.some((item) => !item)) return null;
  return {
    schema: 1,
    entityId: value.entityId,
    baselineRevision: value.baselineRevision,
    baseline,
    local,
    undo: undo as Geometry[],
    outcome: value.outcome,
  };
}
const scopeKey = (scope: Scope) =>
  JSON.stringify([scope.origin, scope.userId, scope.authEpoch, scope.configEntryId, scope.surface]);
const groupKey = (principal: Principal, entry: string) =>
  JSON.stringify([principal.origin, principal.userId, principal.authEpoch, entry]);
export class EditorDraftRepository {
  private _principals = new Map<string, Principal>();
  private _epoch = 0;
  private _records = new Map<string, RecordEntry>();
  private _subscribers = new Map<string, Set<() => void>>();
  private _barriers = new Set<string>();
  private _writes = new Map<string, Map<string, 'pending' | 'unknown'>>();
  private _writeGenerations = new Map<string, number>();
  constructor(private readonly _limits = DRAFT_LIMITS) {}
  activatePrincipal(origin: string, userId: string): Principal {
    if (typeof origin !== 'string' || !origin || typeof userId !== 'string' || !userId.trim())
      throw new Error('Authenticated identity required');
    const current = this._principals.get(origin);
    if (current?.userId === userId) return { ...current };
    if (current) {
      this._principals.delete(origin);
      for (const [id, record] of this._records)
        if (record.scope.origin === origin) this._records.delete(id);
      for (const key of this._barriers)
        if (JSON.parse(key)[0] === origin) this._barriers.delete(key);
      for (const key of this._writeGenerations.keys())
        if (JSON.parse(key)[0] === origin) this._writeGenerations.delete(key);
      for (const key of this._writes.keys())
        if (JSON.parse(key)[0] === origin) this._writes.delete(key);
      for (const [key, subscribers] of this._subscribers)
        if (JSON.parse(key)[0] === origin) {
          for (const notify of subscribers) notify();
          this._subscribers.delete(key);
        }
    }
    const principal = { origin, userId, authEpoch: ++this._epoch };
    this._principals.set(origin, principal);
    return { ...principal };
  }
  isCurrent(principal: Principal): boolean {
    const active = this._principals.get(principal.origin);
    return (
      !!active && active.userId === principal.userId && active.authEpoch === principal.authEpoch
    );
  }
  private _validScope(scope: Scope): boolean {
    return (
      this.isCurrent(scope) &&
      typeof scope.configEntryId === 'string' &&
      !!scope.configEntryId &&
      ['sidebar', 'dashboard'].includes(scope.surface)
    );
  }
  private _notify(scope: Scope): void {
    for (const notify of this._subscribers.get(scopeKey(scope)) ?? []) notify();
  }
  private _notifyGroup(principal: Principal, entry: string): void {
    for (const surface of ['sidebar', 'dashboard'] as const)
      this._notify({ ...principal, configEntryId: entry, surface });
  }
  private _matches(scope: Scope, record: RecordEntry | undefined): record is RecordEntry {
    return this._validScope(scope) && !!record && scopeKey(scope) === scopeKey(record.scope);
  }
  private _owned(scope: Scope, claim: Claim): RecordEntry | undefined {
    const record = this._records.get(claim.draftId);
    return this._matches(scope, record) &&
      record.ownerId === claim.ownerId &&
      record.claimEpoch === claim.claimEpoch &&
      record.version === claim.version
      ? record
      : undefined;
  }
  owns(scope: Scope, claim: Claim): boolean {
    return !!this._owned(scope, claim);
  }
  private _claim(record: RecordEntry): Claim {
    return {
      draftId: record.draftId,
      ownerId: record.ownerId!,
      claimEpoch: record.claimEpoch,
      version: record.version,
    };
  }
  private _size(scope: Scope, payload: DraftPayload): number {
    return new TextEncoder().encode(JSON.stringify({ scope, payload })).byteLength;
  }
  private _fits(bytes: number, previous = 0): boolean {
    let total = bytes - previous;
    for (const record of this._records.values()) total += record.bytes;
    return bytes <= this._limits.recordBytes && total <= this._limits.totalBytes;
  }
  create(scope: Scope, ownerId: string, payload: DraftPayload): Result<Claim> {
    const projected = projectDraft(payload);
    if (
      !this._validScope(scope) ||
      typeof ownerId !== 'string' ||
      !ownerId ||
      !projected ||
      geometryEqual(projected.baseline, projected.local)
    )
      return { ok: false, reason: 'invalid' };
    const projectedScope: Scope = {
      origin: scope.origin,
      userId: scope.userId,
      authEpoch: scope.authEpoch,
      configEntryId: scope.configEntryId,
      surface: scope.surface,
    };
    const bytes = this._size(projectedScope, projected);
    if (this._records.size >= this._limits.records || !this._fits(bytes))
      return { ok: false, reason: 'capacity' };
    const record: RecordEntry = {
      scope: projectedScope,
      payload: projected,
      draftId: crypto.randomUUID(),
      ownerId,
      claimEpoch: 1,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      complete: true,
      bytes,
    };
    this._records.set(record.draftId, record);
    const value = this._claim(record);
    this._notify(scope);
    return { ok: true, value };
  }
  update(scope: Scope, claim: Claim, payload: DraftPayload): Result<Claim> {
    const record = this._owned(scope, claim);
    if (!record) return { ok: false, reason: 'stale' };
    const projected = projectDraft(payload),
      bytes = projected ? this._size(record.scope, projected) : Infinity;
    if (!projected || !this._fits(bytes, record.bytes)) {
      record.complete = false;
      record.version++;
      const currentClaim = this._claim(record);
      this._notify(scope);
      return { ok: false, reason: projected ? 'capacity' : 'invalid', claim: currentClaim };
    }
    record.payload = projected;
    record.bytes = bytes;
    record.complete = true;
    record.version++;
    record.updatedAt = Date.now();
    const value = this._claim(record);
    this._notify(scope);
    return { ok: true, value };
  }
  list(scope: Scope): Summary[] {
    if (!this._validScope(scope)) return [];
    return [...this._records.values()]
      .filter((record) => this._matches(scope, record) && !record.ownerId)
      .map((record) => ({
        draftId: record.draftId,
        version: record.version,
        updatedAt: record.updatedAt,
        complete: record.complete,
        affectedIds: record.payload.local
          .filter(
            (local) =>
              !geometryEqual(
                [local],
                record.payload.baseline.filter((old) => old.entityId === local.entityId)
              )
          )
          .map((local) => local.entityId),
      }));
  }
  claim(
    scope: Scope,
    draftId: string,
    displayedVersion: number,
    ownerId: string
  ): Result<{ claim: Claim; payload: DraftPayload }> {
    const record = this._records.get(draftId);
    if (
      !this._matches(scope, record) ||
      typeof ownerId !== 'string' ||
      !ownerId ||
      record.version !== displayedVersion
    )
      return { ok: false, reason: 'stale' };
    if (record.ownerId) return { ok: false, reason: 'busy' };
    record.ownerId = ownerId;
    record.claimEpoch++;
    const value = { claim: this._claim(record), payload: structuredClone(record.payload) };
    this._notify(scope);
    return { ok: true, value };
  }
  release(scope: Scope, claim: Claim): ResumeTicket | null {
    const record = this._owned(scope, claim);
    if (!record) return null;
    record.ownerId = null;
    const ticket = {
      draftId: record.draftId,
      ownerId: claim.ownerId,
      releasedEpoch: record.claimEpoch,
      version: record.version,
    };
    this._notify(scope);
    return ticket;
  }
  resume(scope: Scope, ticket: ResumeTicket): Result<{ claim: Claim; payload: DraftPayload }> {
    const record = this._records.get(ticket.draftId);
    if (
      !this._matches(scope, record) ||
      record.ownerId ||
      record.claimEpoch !== ticket.releasedEpoch ||
      record.version !== ticket.version
    )
      return { ok: false, reason: 'lost' };
    record.ownerId = ticket.ownerId;
    record.claimEpoch++;
    const value = { claim: this._claim(record), payload: structuredClone(record.payload) };
    this._notify(scope);
    return { ok: true, value };
  }
  clear(scope: Scope, claim: Claim): boolean {
    const record = this._owned(scope, claim);
    if (!record) return false;
    this._records.delete(record.draftId);
    this._notify(scope);
    return true;
  }
  subscribe(scope: Scope, notify: () => void): () => void {
    if (!this._validScope(scope)) return () => {};
    const key = scopeKey(scope),
      subscribers = this._subscribers.get(key) ?? new Set();
    subscribers.add(notify);
    this._subscribers.set(key, subscribers);
    return () => {
      subscribers.delete(notify);
      if (!subscribers.size) this._subscribers.delete(key);
    };
  }
  markRuntimeBlocked(principal: Principal, entry: string): void {
    if (!this.isCurrent(principal) || typeof entry !== 'string' || !entry) return;
    this._barriers.add(groupKey(principal, entry));
    this._notifyGroup(principal, entry);
  }
  isRuntimeBlocked(principal: Principal, entry: string): boolean {
    return this.isCurrent(principal) && this._barriers.has(groupKey(principal, entry));
  }
  beginWrite(principal: Principal, entry: string, operationId: string): void {
    if (
      !this.isCurrent(principal) ||
      typeof entry !== 'string' ||
      !entry ||
      typeof operationId !== 'string' ||
      !operationId
    )
      return;
    const key = groupKey(principal, entry),
      writes = this._writes.get(key) ?? new Map();
    if (writes.has(operationId)) return;
    this._writeGenerations.set(key, (this._writeGenerations.get(key) ?? 0) + 1);
    writes.set(operationId, 'pending');
    this._writes.set(key, writes);
    this._notifyGroup(principal, entry);
  }
  settleWrite(
    principal: Principal,
    entry: string,
    operationId: string,
    outcome: 'confirmed' | 'refused' | 'unknown' | 'runtime'
  ): void {
    if (!this.isCurrent(principal)) return;
    const writes = this._writes.get(groupKey(principal, entry));
    if (!writes?.has(operationId)) return;
    if (outcome === 'runtime') this.markRuntimeBlocked(principal, entry);
    if (outcome === 'unknown' || outcome === 'runtime') {
      if (writes.get(operationId) === 'pending') {
        const key = groupKey(principal, entry);
        this._writeGenerations.set(key, (this._writeGenerations.get(key) ?? 0) + 1);
      }
      writes.set(operationId, 'unknown');
    } else writes.delete(operationId);
    if (!writes.size) this._writes.delete(groupKey(principal, entry));
    this._notifyGroup(principal, entry);
  }
  writeGeneration(principal: Principal, entry: string): number {
    return this.isCurrent(principal)
      ? (this._writeGenerations.get(groupKey(principal, entry)) ?? 0)
      : 0;
  }
  hasUnknownWrite(principal: Principal, entry: string): boolean {
    return (
      this.isCurrent(principal) &&
      [...(this._writes.get(groupKey(principal, entry))?.values() ?? [])].includes('unknown')
    );
  }
  hasUnresolvedWrite(principal: Principal, entry: string): boolean {
    return this.isCurrent(principal) && !!this._writes.get(groupKey(principal, entry))?.size;
  }
}
export const editorDrafts = new EditorDraftRepository();
