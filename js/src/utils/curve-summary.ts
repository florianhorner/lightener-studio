import type { ControlPoint, LightCurve } from './types.js';

export interface CurveShapeSummary {
  primary: string;
  secondary: string;
  visibleCount: number;
  totalCount: number;
  shapeCount: number;
  largestShapeCount: number;
}

function lightLabel(count: number): string {
  return `${count} light${count === 1 ? '' : 's'}`;
}

function curveShapeSignature(points: ReadonlyArray<ControlPoint>): string {
  return [...points]
    .sort((a, b) => a.lightener - b.lightener)
    .map((point) => `${point.lightener}:${point.target}`)
    .join('|');
}

function isStraightThrough(points: ReadonlyArray<ControlPoint>): boolean {
  if (!points.length) return false;
  return points.every((point) => point.lightener === point.target);
}

function shapeBuckets(curves: ReadonlyArray<LightCurve>): Map<string, LightCurve[]> {
  const buckets = new Map<string, LightCurve[]>();
  for (const curve of curves) {
    const signature = curveShapeSignature(curve.controlPoints);
    const bucket = buckets.get(signature) ?? [];
    bucket.push(curve);
    buckets.set(signature, bucket);
  }
  return buckets;
}

function largestBucket(buckets: Map<string, LightCurve[]>): LightCurve[] {
  let largest: LightCurve[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.length > largest.length) largest = bucket;
  }
  return largest;
}

export function summarizeCurveShapes(
  curves: ReadonlyArray<LightCurve>,
  selectedCurveId: string | null
): CurveShapeSummary | null {
  if (!curves.length) return null;

  const visible = curves.filter((curve) => curve.visible);
  const totalCount = curves.length;

  if (!visible.length) {
    return {
      primary: 'All lights are hidden',
      secondary: 'Show a light in the list to bring its shape back.',
      visibleCount: 0,
      totalCount,
      shapeCount: 0,
      largestShapeCount: 0,
    };
  }

  const buckets = shapeBuckets(visible);
  const largest = largestBucket(buckets);
  const shapeCount = buckets.size;
  const hiddenCount = totalCount - visible.length;
  const hiddenSuffix =
    hiddenCount > 0 ? ` ${hiddenCount} hidden light${hiddenCount === 1 ? '' : 's'}.` : '';

  if (selectedCurveId) {
    const selected = visible.find((curve) => curve.entityId === selectedCurveId);
    if (selected) {
      const selectedBucket = buckets.get(curveShapeSignature(selected.controlPoints)) ?? [selected];
      const peerCount = Math.max(0, selectedBucket.length - 1);
      return {
        primary: `Shaping ${selected.friendlyName}`,
        secondary:
          peerCount > 0
            ? `${lightLabel(peerCount)} still share${peerCount === 1 ? 's' : ''} this shape.${hiddenSuffix}`
            : `This light has its own shape.${hiddenSuffix}`,
        visibleCount: visible.length,
        totalCount,
        shapeCount,
        largestShapeCount: largest.length,
      };
    }
  }

  if (shapeCount === 1 && visible.length > 1) {
    const straight = isStraightThrough(largest[0]?.controlPoints ?? []);
    return {
      primary: straight
        ? `${lightLabel(visible.length)} match the group brightness`
        : `${lightLabel(visible.length)} share one brightness shape`,
      secondary: `Pick a light to make it dimmer, brighter, or delayed.${hiddenSuffix}`,
      visibleCount: visible.length,
      totalCount,
      shapeCount,
      largestShapeCount: largest.length,
    };
  }

  if (shapeCount === visible.length) {
    return {
      primary: `${lightLabel(visible.length)}, ${shapeCount} separate shapes`,
      secondary: `Pick a light to focus its shape.${hiddenSuffix}`,
      visibleCount: visible.length,
      totalCount,
      shapeCount,
      largestShapeCount: largest.length,
    };
  }

  return {
    primary: `${lightLabel(visible.length)}, ${shapeCount} brightness shapes`,
    secondary: `${lightLabel(largest.length)} share the most common shape.${hiddenSuffix}`,
    visibleCount: visible.length,
    totalCount,
    shapeCount,
    largestShapeCount: largest.length,
  };
}
