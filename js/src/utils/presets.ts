import { UI } from './strings.js';

export interface PresetDef {
  id: string;
  name: string;
  description: string;
  controlPoints: Array<{ lightener: number; target: number }>;
}

export const CURVE_PRESETS: PresetDef[] = [
  {
    id: 'linear',
    ...UI.presets.defs.linear,
    controlPoints: [
      { lightener: 0, target: 0 },
      { lightener: 1, target: 1 },
      { lightener: 50, target: 50 },
      { lightener: 100, target: 100 },
    ],
  },
  {
    id: 'dim_accent',
    ...UI.presets.defs.dim_accent,
    controlPoints: [
      { lightener: 0, target: 0 },
      { lightener: 1, target: 1 },
      { lightener: 25, target: 8 },
      { lightener: 50, target: 20 },
      { lightener: 100, target: 45 },
    ],
  },
  {
    id: 'early_starter',
    ...UI.presets.defs.early_starter,
    controlPoints: [
      { lightener: 0, target: 0 },
      { lightener: 1, target: 3 },
      { lightener: 15, target: 36 },
      { lightener: 25, target: 55 },
      { lightener: 50, target: 85 },
      { lightener: 65, target: 93 },
      { lightener: 100, target: 100 },
    ],
  },
  {
    id: 'late_starter',
    ...UI.presets.defs.late_starter,
    controlPoints: [
      { lightener: 0, target: 0 },
      { lightener: 1, target: 0 },
      { lightener: 60, target: 0 },
      { lightener: 70, target: 10 },
      { lightener: 80, target: 35 },
      { lightener: 90, target: 65 },
      { lightener: 100, target: 100 },
    ],
  },
];

export function presetPolylinePoints(preset: PresetDef): string {
  const W = 64;
  const H = 40;
  const pad = 4;
  return preset.controlPoints
    .map((cp) => {
      const x = pad + (cp.lightener / 100) * (W - 2 * pad);
      const y = H - pad - (cp.target / 100) * (H - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
