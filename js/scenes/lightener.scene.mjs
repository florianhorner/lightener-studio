/**
 * Lightener hero demo scene — the ONLY per-project file in the Scenecast
 * pipeline. Pure data: the runner (js/scripts/scenecast/runner.mjs) owns the
 * clock + screenshots; capture.html interprets these beats by writing card
 * model state. To demo a different web project, write a new scene + capture
 * page; the runner stays untouched.
 *
 * The hero loop tells the two things that make Lightener Lightener:
 *   1. No YAML, still tunable — select the LED Strip, drop the "Dim accent"
 *      preset on it (its curve morphs to the capped shape), then drag a point
 *      to make it your own.
 *   2. One slider, different per-light outputs — scrub the group brightness
 *      and watch Ceiling, Sofa, and the (now-dimmed) LED Strip read out
 *      different percentages from the one shared position.
 * The runner appends the frames in reverse for a seamless loop, so the slider
 * sweeps down and back and the preset morph plays both ways.
 */
export default {
  name: 'lightener-hero',
  scenario: 'default', // scenarios.default in js/dev/fake-ha.js (Ceiling/Sofa/LED)
  frame: { w: 760, h: 720 }, // logical px; captured at 2× for retina
  fps: 24,
  gifWidth: 760, // downscale target for the committed GIF (<1.5MB budget)
  output: '.github/assets/lightener-curve-editor-demo.gif',
  beats: [
    { kind: 'rest', ms: 560 },
    { kind: 'select', entityId: 'light.led_strip', ms: 540 },
    // LED default [0,0][8,4][34,32][72,84][100,96] → dim_accent (5→5, clean morph).
    { kind: 'applyPreset', entityId: 'light.led_strip', preset: 'dim_accent', ms: 900 },
    // Make it your own: lift the capped top point from 45% up to 72%.
    { kind: 'drag', entityId: 'light.led_strip', pointIndex: 4, to: [100, 72], ms: 920 },
    // One slider, divergent outputs: the legend + graph reveal each light's own %.
    { kind: 'scrub', from: 50, to: 18, ms: 1340 },
    { kind: 'rest', ms: 640 },
  ],
  /**
   * Per-beat expected end-state, asserted by `runner.mjs --check` (the rot
   * guard). Catches broken visual state, not just "did the step run".
   */
  expect: [
    { selectedCurveId: null },
    { selectedCurveId: 'light.led_strip' },
    {
      selectedCurveId: 'light.led_strip',
      pointCount: { entity: 'light.led_strip', is: 5 },
      point: { entity: 'light.led_strip', index: 4, equals: [100, 45] },
      cursorVisible: true,
    },
    { selectedCurveId: 'light.led_strip', point: { entity: 'light.led_strip', index: 4, equals: [100, 72] } },
    { selectedCurveId: 'light.led_strip', scrubberPosition: 18 },
    { selectedCurveId: 'light.led_strip', scrubberPosition: 18 },
  ],
};
