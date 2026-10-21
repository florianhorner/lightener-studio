import { addPointToCurves, pushToUndoStack, removePointFromCurves } from './card-logic.js';
import type { LightCurve } from './types.js';
import { clamp, sampleCurveAt } from './graph-math.js';

/** Change one light at one room coordinate; other shapes retain their identity. */
export function setLightLevel(
  curves: LightCurve[],
  entityId: string,
  position: number,
  target: number
): LightCurve[] | null {
  if (!Number.isFinite(position) || !Number.isFinite(target)) return null;
  const index = curves.findIndex((curve) => curve.entityId === entityId && curve.visible);
  if (index < 0) return null;
  const curve = curves[index];
  const lightener = Math.round(clamp(position, 0, 100));
  const value = Math.round(clamp(target, 0, 100));
  const existing = curve.controlPoints.find((point) => point.lightener === lightener);
  if (existing?.target === value) return null;
  if (!existing && sampleCurveAt(curve.controlPoints, lightener) === value) return null;
  const points = curve.controlPoints.map((point) => ({ ...point }));
  if (existing) points.find((point) => point.lightener === lightener)!.target = value;
  else points.push({ lightener, target: value });
  points.sort((a, b) => a.lightener - b.lightener);
  return curves.map((item, i) => (i === index ? { ...curve, controlPoints: points } : item));
}

export function pushEditUndo(stack: LightCurve[][], curves: LightCurve[]): void {
  pushToUndoStack(stack, curves);
}

export function applyPresetToCurves(
  curves: LightCurve[],
  selectedCurveId: string | null,
  controlPoints: LightCurve['controlPoints']
): LightCurve[] {
  // Clone the points PER curve. A shared array reference would alias every
  // curve's controlPoints, so a later in-place edit of one curve would leak
  // into all of them.
  const clonePoints = (): LightCurve['controlPoints'] => controlPoints.map((cp) => ({ ...cp }));
  if (selectedCurveId !== null) {
    return curves.map((curve) =>
      curve.entityId === selectedCurveId ? { ...curve, controlPoints: clonePoints() } : curve
    );
  }
  return curves.map((curve) => ({ ...curve, controlPoints: clonePoints() }));
}

export function movePointOnCurves(
  curves: LightCurve[],
  curveIndex: number,
  pointIndex: number,
  lightener: number,
  target: number
): LightCurve[] | null {
  const next = [...curves];
  const curve = next[curveIndex];
  if (!curve || !curve.controlPoints[pointIndex]) return null;
  const nextCurve = { ...curve };
  const points = [...nextCurve.controlPoints];
  points[pointIndex] = { lightener, target };
  nextCurve.controlPoints = points;
  next[curveIndex] = nextCurve;
  return next;
}

export function addPointEdit(
  curves: LightCurve[],
  entityId: string,
  lightener: number,
  target: number
): LightCurve[] | null {
  return addPointToCurves(curves, entityId, lightener, target);
}

export function removePointEdit(
  curves: LightCurve[],
  curveIndex: number,
  pointIndex: number
): LightCurve[] | null {
  return removePointFromCurves(curves, curveIndex, pointIndex);
}
