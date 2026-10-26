/** Guarded saved-state protocol and pure, explicit recovery comparisons. */
import type { ControlPoint, LightCurve } from './types.js';
import { cloneCurves, curvesToWsPayload } from './data.js';

export type SavedEntities = Record<
  string,
  { brightness?: Record<string, string>; [key: string]: unknown }
>;
export interface SavedSnapshot {
  config_entry_id: string;
  revision: string;
  entities: SavedEntities;
}
export type RecoveryKind = 'unchanged' | 'already-saved' | 'conflicting' | 'removed';
export interface RecoveryMember {
  entityId: string;
  friendlyName: string;
  kind: RecoveryKind;
  local: LightCurve;
}
export interface SaveReview {
  latest: SavedSnapshot;
  curves: LightCurve[];
  members: RecoveryMember[];
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function validEntities(value: unknown): value is SavedEntities {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (record) =>
        isRecord(record) && (record.brightness === undefined || isRecord(record.brightness))
    )
  );
}
export function guardedSnapshot(value: unknown, receipt = false): SavedSnapshot | null {
  if (
    !isRecord(value) ||
    !validEntities(value.entities) ||
    typeof value.config_entry_id !== 'string' ||
    !value.config_entry_id ||
    typeof value.revision !== 'string' ||
    !/^v1:[0-9a-f]{64}$/.test(value.revision)
  )
    return null;
  if (
    receipt
      ? value.status !== 'saved' && value.status !== 'unchanged'
      : !isRecord(value.capabilities) || value.capabilities.guarded_curve_save !== 1
  )
    return null;
  return structuredClone({
    config_entry_id: value.config_entry_id,
    revision: value.revision,
    entities: value.entities,
  });
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isRecord(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
/** Member order is saved data; nested record key order is not. */
export function savedEntitiesEqual(a: SavedEntities, b: SavedEntities): boolean {
  return (
    JSON.stringify(Object.keys(a)) === JSON.stringify(Object.keys(b)) &&
    canonical(a) === canonical(b)
  );
}
export function sameShape(
  a: { readonly controlPoints: readonly ControlPoint[] },
  b: { readonly controlPoints: readonly ControlPoint[] }
): boolean {
  return (
    a.controlPoints.length === b.controlPoints.length &&
    a.controlPoints.every(
      (point, i) =>
        point.lightener === b.controlPoints[i].lightener &&
        point.target === b.controlPoints[i].target
    )
  );
}
export function editedCurves(baseline: LightCurve[], local: LightCurve[]): LightCurve[] {
  const original = new Map(baseline.map((curve) => [curve.entityId, curve]));
  return local.filter((curve) => {
    const old = original.get(curve.entityId);
    return !old || !sameShape(old, curve);
  });
}
export function intendedEntities(
  baseline: SavedEntities,
  patch: ReturnType<typeof curvesToWsPayload>
): SavedEntities {
  const intended = structuredClone(baseline);
  for (const [id, curve] of Object.entries(patch)) {
    intended[id] = { ...intended[id], brightness: { ...curve.brightness } };
  }
  return intended;
}
export function compareSavedShapes(
  baseline: LightCurve[],
  local: LightCurve[],
  latest: LightCurve[]
): RecoveryMember[] {
  const old = new Map(baseline.map((curve) => [curve.entityId, curve]));
  const saved = new Map(latest.map((curve) => [curve.entityId, curve]));
  return editedCurves(baseline, local).map((curve) => {
    const current = saved.get(curve.entityId);
    return {
      entityId: curve.entityId,
      friendlyName: curve.friendlyName,
      local: curve,
      kind: !current
        ? 'removed'
        : sameShape(current, curve)
          ? 'already-saved'
          : old.has(curve.entityId) && sameShape(current, old.get(curve.entityId)!)
            ? 'unchanged'
            : 'conflicting',
    };
  });
}
/** Only explicit choices reapply divergent shapes; removed members never reappear. */
export function adoptSavedShapes(
  latest: LightCurve[],
  members: RecoveryMember[],
  keep: ReadonlySet<string>
): LightCurve[] {
  const locals = new Map(
    members
      .filter((member) => member.kind !== 'removed' && keep.has(member.entityId))
      .map((member) => [member.entityId, member.local])
  );
  return cloneCurves(latest).map((curve) => ({
    ...curve,
    controlPoints:
      locals.get(curve.entityId)?.controlPoints.map((point) => ({ ...point })) ??
      curve.controlPoints,
  }));
}
