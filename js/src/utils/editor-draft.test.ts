import { describe, it, expect, vi } from 'vitest';
import {
  EditorDraftRepository,
  DRAFT_LIMITS,
  projectDraft,
  projectGeometry,
  type DraftPayload,
  type Scope,
  type Claim,
} from './editor-draft.js';
const payload = (): DraftPayload => ({
  schema: 1,
  entityId: 'light.group',
  baselineRevision: 'v1:' + 'a'.repeat(64),
  baseline: [
    {
      entityId: 'light.a',
      points: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 100 },
      ],
    },
  ],
  local: [
    {
      entityId: 'light.a',
      points: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 45 },
      ],
    },
  ],
  undo: [
    [
      {
        entityId: 'light.a',
        points: [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 100 },
        ],
      },
    ],
  ],
  outcome: 'ordinary',
});
function setup(limits = DRAFT_LIMITS) {
  const repo = new EditorDraftRepository(limits),
    principal = repo.activatePrincipal('https://example.test', 'user'),
    scope: Scope = { ...principal, configEntryId: 'entry', surface: 'sidebar' };
  return { repo, principal, scope };
}
function create(repo: EditorDraftRepository, scope: Scope): Claim {
  const result = repo.create(scope, 'owner', payload());
  if (!result.ok) throw Error(result.reason);
  return result.value;
}
describe('document navigation draft repository', () => {
  it('projects only permitted geometry and returns defensive copies', () => {
    const { repo, scope } = setup(),
      input = { ...payload(), secret: 'private', hass: { credentials: 'no' } };
    const claim = repo.create(scope, 'owner', input);
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    input.local[0].points[1].target = 22;
    const ticket = repo.release(scope, claim.value)!;
    const recovered = repo.resume(scope, ticket);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(recovered.value.payload.local[0].points[1].target).toBe(45);
    expect(JSON.stringify(recovered.value.payload)).not.toContain('private');
    expect(Object.keys(recovered.value.payload)).not.toContain('hass');
    recovered.value.payload.local[0].points[1].target = 66;
    const next = repo.release(scope, recovered.value.claim)!;
    const read = repo.resume(scope, next);
    if (read.ok) expect(read.value.payload.local[0].points[1].target).toBe(45);
    expect(
      projectGeometry([
        {
          entityId: 'light.a',
          friendlyName: 'private name',
          color: 'red',
          visible: false,
          controlPoints: [{ lightener: 1, target: 2 }],
        },
      ])
    ).toEqual([{ entityId: 'light.a', points: [{ lightener: 1, target: 2 }] }]);
  });
  it.each(['schema', 'NaN', 'range', 'duplicate', 'history', 'revision', 'outcome'] as const)(
    'rejects malformed %s without normalization',
    (kind) => {
      const value = payload();
      if (kind === 'schema') value.schema = 2 as 1;
      if (kind === 'NaN') value.local[0].points[0].target = NaN;
      if (kind === 'range') value.local[0].points[0].target = 101;
      if (kind === 'duplicate') value.local.push(value.local[0]);
      if (kind === 'history') value.undo = Array(51).fill(value.baseline);
      if (kind === 'revision') value.baselineRevision = 'bad';
      if (kind === 'outcome') value.outcome = 'new' as 'ordinary';
      expect(projectDraft(value)).toBeNull();
    }
  );
  it('compares exact checkpoint versions for update, clear and release', () => {
    const { repo, scope } = setup(),
      first = create(repo, scope),
      changed = payload();
    changed.local[0].points[1].target = 55;
    const next = repo.update(scope, first, changed);
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(repo.update(scope, first, payload())).toMatchObject({ ok: false, reason: 'stale' });
    expect(repo.clear(scope, first)).toBe(false);
    expect(repo.release(scope, first)).toBeNull();
    expect(repo.owns(scope, next.value)).toBe(true);
  });
  it('claims exclusively and old owners cannot resume after any intervening claim', () => {
    const { repo, scope } = setup(),
      first = create(repo, scope),
      ticket = repo.release(scope, first)!;
    const summary = repo.list(scope)[0],
      second = repo.claim(scope, summary.draftId, summary.version, 'second');
    expect(second.ok).toBe(true);
    expect(repo.claim(scope, summary.draftId, summary.version, 'third')).toMatchObject({
      ok: false,
      reason: 'busy',
    });
    expect(repo.resume(scope, ticket)).toMatchObject({ ok: false, reason: 'lost' });
    if (second.ok) repo.release(scope, second.value.claim);
    expect(repo.resume(scope, ticket)).toMatchObject({ ok: false, reason: 'lost' });
  });
  it.each(['origin', 'user', 'entry', 'surface'] as const)(
    'isolates %s and never adopts by group',
    (kind) => {
      const { repo, scope } = setup(),
        claim = create(repo, scope);
      repo.release(scope, claim);
      const other =
        kind === 'origin'
          ? {
              ...repo.activatePrincipal('https://other.test', 'user'),
              configEntryId: 'entry',
              surface: 'sidebar' as const,
            }
          : kind === 'user'
            ? { ...scope, userId: 'other' }
            : kind === 'entry'
              ? { ...scope, configEntryId: 'other' }
              : { ...scope, surface: 'dashboard' as const };
      expect(repo.list(other)).toEqual([]);
      expect(repo.claim(other, claim.draftId, claim.version, 'other')).toMatchObject({ ok: false });
      expect(repo.clear(other, claim)).toBe(false);
    }
  );
  it('invalidates identity before callbacks and purges records/barriers/writes/subscriptions', () => {
    const { repo, principal, scope } = setup(),
      claim = create(repo, scope);
    repo.release(scope, claim);
    repo.markRuntimeBlocked(principal, 'entry');
    repo.beginWrite(principal, 'entry', 'op');
    const callback = vi.fn(() => {
      expect(repo.isCurrent(principal)).toBe(false);
      expect(repo.create(scope, 'stale', payload())).toMatchObject({ ok: false });
      repo.beginWrite(principal, 'entry', 'stale');
      repo.markRuntimeBlocked(principal, 'entry');
    });
    repo.subscribe(scope, callback);
    const next = repo.activatePrincipal(scope.origin, 'other');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(repo.list({ ...next, configEntryId: 'entry', surface: 'sidebar' })).toEqual([]);
    expect(repo.hasUnresolvedWrite(principal, 'entry')).toBe(false);
    expect(repo.isRuntimeBlocked(next, 'entry')).toBe(false);
    expect(() => repo.activatePrincipal(scope.origin, '')).toThrow();
    expect(repo.activatePrincipal(scope.origin, 'other')).toEqual(next);
  });
  it('keeps writes independent of discarded geometry and settles only originating operation', () => {
    const { repo, principal, scope } = setup(),
      claim = create(repo, scope);
    repo.beginWrite(principal, 'entry', 'first');
    repo.beginWrite(principal, 'entry', 'second');
    repo.settleWrite(principal, 'entry', 'first', 'unknown');
    repo.clear(scope, claim);
    expect(repo.hasUnresolvedWrite(principal, 'entry')).toBe(true);
    repo.settleWrite(principal, 'entry', 'first', 'confirmed');
    expect(repo.hasUnresolvedWrite(principal, 'entry')).toBe(true);
    repo.settleWrite(principal, 'entry', 'second', 'refused');
    expect(repo.hasUnresolvedWrite(principal, 'entry')).toBe(false);
    repo.beginWrite(principal, 'entry', 'third');
    repo.settleWrite(principal, 'entry', 'third', 'runtime');
    expect(repo.isRuntimeBlocked(principal, 'entry')).toBe(true);
    expect(repo.isRuntimeBlocked(principal, 'other')).toBe(false);
    repo.settleWrite(principal, 'entry', 'third', 'confirmed');
    expect(repo.isRuntimeBlocked(principal, 'entry')).toBe(true);
    expect(new EditorDraftRepository().activatePrincipal(scope.origin, 'user').userId).toBe('user');
  });
  it('enforces all capacity boundaries without eviction or trimming and labels failed updates', () => {
    expect(DRAFT_LIMITS).toEqual({ records: 32, recordBytes: 4194304, totalBytes: 16777216 });
    const { repo, scope } = setup({ records: 2, recordBytes: 900, totalBytes: 1600 });
    const first = create(repo, scope),
      second = create(repo, scope);
    expect(repo.create(scope, 'third', payload())).toMatchObject({ ok: false, reason: 'capacity' });
    const oversized = payload();
    oversized.undo = Array(50).fill(oversized.baseline);
    const rejected = repo.update(scope, first, oversized);
    expect(rejected).toMatchObject({ ok: false, reason: 'capacity' });
    if (rejected.ok || !rejected.claim) return;
    expect(repo.clear(scope, first)).toBe(false);
    repo.release(scope, rejected.claim);
    const summary = repo.list(scope)[0];
    expect(summary.complete).toBe(false);
    const recovered = repo.claim(scope, summary.draftId, summary.version, 'new');
    if (recovered.ok) expect(recovered.value.payload.undo).toHaveLength(1);
    expect(repo.owns(scope, second)).toBe(true);
    const tight = setup({ records: 32, recordBytes: 20, totalBytes: 1000 });
    expect(tight.repo.create(tight.scope, 'owner', payload())).toMatchObject({
      ok: false,
      reason: 'capacity',
    });
    expect(tight.repo.list(tight.scope)).toEqual([]);
    const aggregate = setup({ records: 32, recordBytes: 1000, totalBytes: 700 });
    create(aggregate.repo, aggregate.scope);
    expect(aggregate.repo.create(aggregate.scope, 'second', payload())).toMatchObject({
      ok: false,
      reason: 'capacity',
    });
  });
  it('does not store a clean ordinary draft and unsubscribes without retaining callbacks', () => {
    const { repo, scope } = setup();
    const clean = payload();
    clean.local = clean.baseline;
    expect(repo.create(scope, 'owner', clean)).toMatchObject({ ok: false });
    const notify = vi.fn(),
      unsubscribe = repo.subscribe(scope, notify);
    unsubscribe();
    create(repo, scope);
    expect(notify).not.toHaveBeenCalled();
  });
});

it('rejects object/boxed revisions and sparse Undo instead of retaining arbitrary objects', () => {
  for (const revision of [
    { toString: () => 'v1:' + 'a'.repeat(64), privateMetadata: 'never' },
    new String('v1:' + 'a'.repeat(64)),
  ])
    expect(
      projectDraft({ ...payload(), baselineRevision: revision as unknown as string })
    ).toBeNull();
  expect(projectDraft({ ...payload(), undo: Array(1) })).toBeNull();
});
it('a synchronous notification cannot upgrade an old release ticket to an intervening claim', () => {
  const { repo, scope } = setup(),
    first = create(repo, scope);
  let transferred = false;
  repo.subscribe(scope, () => {
    if (transferred) return;
    const orphan = repo.list(scope)[0];
    if (!orphan) return;
    transferred = true;
    const second = repo.claim(scope, orphan.draftId, orphan.version, 'other');
    if (second.ok) repo.release(scope, second.value.claim);
  });
  const ticket = repo.release(scope, first)!;
  expect(transferred).toBe(true);
  expect(repo.resume(scope, ticket)).toMatchObject({ ok: false, reason: 'lost' });
});

it('measures UTF-8 exactly at and one byte beyond the per-record and aggregate limits', () => {
  const initial = setup(),
    value = payload();
  value.entityId = 'light.☃';
  const bytes = new TextEncoder().encode(
    JSON.stringify({ scope: initial.scope, payload: value })
  ).byteLength;
  const exact = setup({ records: 32, recordBytes: bytes, totalBytes: bytes * 2 });
  expect(exact.repo.create(exact.scope, 'owner', value).ok).toBe(true);
  expect(exact.repo.create(exact.scope, 'second', value).ok).toBe(true);
  expect(exact.repo.create(exact.scope, 'third', value)).toMatchObject({
    ok: false,
    reason: 'capacity',
  });
  const tooSmall = setup({ records: 32, recordBytes: bytes - 1, totalBytes: bytes * 2 });
  expect(tooSmall.repo.create(tooSmall.scope, 'owner', value)).toMatchObject({
    ok: false,
    reason: 'capacity',
  });
  const total = setup({ records: 32, recordBytes: bytes, totalBytes: bytes * 2 - 1 });
  expect(total.repo.create(total.scope, 'owner', value).ok).toBe(true);
  expect(total.repo.create(total.scope, 'second', value)).toMatchObject({
    ok: false,
    reason: 'capacity',
  });
});
it('write registration generations change only for new operations in the same group and current principal', () => {
  const { repo, principal } = setup();
  expect(repo.writeGeneration(principal, 'entry')).toBe(0);
  repo.beginWrite(principal, 'entry', 'first');
  expect(repo.writeGeneration(principal, 'entry')).toBe(1);
  repo.beginWrite(principal, 'entry', 'first');
  expect(repo.writeGeneration(principal, 'entry')).toBe(1);
  repo.beginWrite(principal, 'other', 'second');
  expect(repo.writeGeneration(principal, 'entry')).toBe(1);
  repo.beginWrite(principal, 'entry', 'third');
  expect(repo.writeGeneration(principal, 'entry')).toBe(2);
  repo.activatePrincipal(principal.origin, 'different');
  expect(repo.writeGeneration(principal, 'entry')).toBe(0);
});
it('pending-to-unknown advances registration review generation exactly once', () => {
  const { repo, principal } = setup();
  repo.beginWrite(principal, 'entry', 'request');
  const pending = repo.writeGeneration(principal, 'entry');
  expect(repo.hasUnresolvedWrite(principal, 'entry')).toBe(true);
  expect(repo.hasUnknownWrite(principal, 'entry')).toBe(false);
  repo.settleWrite(principal, 'entry', 'request', 'unknown');
  expect(repo.hasUnknownWrite(principal, 'entry')).toBe(true);
  expect(repo.writeGeneration(principal, 'entry')).toBe(pending + 1);
  repo.settleWrite(principal, 'entry', 'request', 'unknown');
  expect(repo.writeGeneration(principal, 'entry')).toBe(pending + 1);
});
it('duplicate registration cannot downgrade an unknown operation back to pending', () => {
  const { repo, principal } = setup();
  repo.beginWrite(principal, 'entry', 'same');
  repo.settleWrite(principal, 'entry', 'same', 'unknown');
  const generation = repo.writeGeneration(principal, 'entry');
  repo.beginWrite(principal, 'entry', 'same');
  expect(repo.hasUnknownWrite(principal, 'entry')).toBe(true);
  expect(repo.writeGeneration(principal, 'entry')).toBe(generation);
});
