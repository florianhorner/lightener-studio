/**
 * Lightener hero demo scene — the ONLY per-project file in the Scenecast
 * pipeline. Pure data: the runner (js/scripts/scenecast/runner.mjs) owns the
 * clock + screenshots; capture.html interprets these beats by writing card
 * model state. To demo a different web project, write a new scene + capture
 * page; the runner stays untouched.
 *
 * The hero loop: card at rest → select Ceiling Light → drag a control point up
 * (the curve bends) → add a point → switch to Sofa Lamp → settle. The runner
 * appends the frames in reverse for a seamless loop.
 */
export default {
  name: 'lightener-hero',
  scenario: 'default', // scenarios.default in js/dev/fake-ha.js (Ceiling/Sofa/LED)
  surface: 'lovelace',
  frame: { w: 760, h: 720 }, // logical px; captured at 2× for retina
  fps: 24,
  gifWidth: 760, // downscale target for the committed GIF (<1.5MB budget)
  output: '.github/assets/lightener-curve-editor-demo.gif',
  beats: [
    { kind: 'rest', ms: 650 },
    { kind: 'select', entityId: 'light.ceiling_light', ms: 520 },
    // Ceiling default points: [0,0] [25,4] [58,78] [100,100]; drag index 1 up.
    { kind: 'drag', entityId: 'light.ceiling_light', pointIndex: 1, to: [25, 66], ms: 1250 },
    { kind: 'addPoint', entityId: 'light.ceiling_light', at: [78, 92], ms: 900 },
    { kind: 'switch', entityId: 'light.sofa_lamp', ms: 720 },
    { kind: 'rest', ms: 620 },
  ],
  /**
   * Per-beat expected end-state, asserted by `runner.mjs --check` (the rot
   * guard). Catches broken visual state, not just "did the step run".
   */
  expect: [
    { selectedCurveId: null },
    { selectedCurveId: 'light.ceiling_light' },
    { selectedCurveId: 'light.ceiling_light', point: { entity: 'light.ceiling_light', index: 1, equals: [25, 66] } },
    { selectedCurveId: 'light.ceiling_light', pointCount: { entity: 'light.ceiling_light', is: 5 } },
    { selectedCurveId: 'light.sofa_lamp' },
    { selectedCurveId: 'light.sofa_lamp' },
  ],
};
