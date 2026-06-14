/**
 * Deliberately broken scene — the failure-path fixture. Its `expect` claims a
 * control point moved, but the drag targets an out-of-range pointIndex so the
 * card state never changes. `runner.mjs --check` must FAIL on this (exit≠0),
 * proving the rot guard actually guards.
 */
export default {
  name: 'broken',
  scenario: 'default',
  surface: 'lovelace',
  frame: { w: 760, h: 720 },
  fps: 12,
  output: '.github/assets/__should_never_write__.gif',
  beats: [
    { kind: 'select', entityId: 'light.ceiling_light', ms: 200 },
    // pointIndex 99 does not exist → applyBeat no-ops → expect below cannot hold.
    { kind: 'drag', entityId: 'light.ceiling_light', pointIndex: 99, to: [25, 66], ms: 200 },
  ],
  expect: [
    { selectedCurveId: 'light.ceiling_light' },
    { point: { entity: 'light.ceiling_light', index: 1, equals: [25, 66] } },
  ],
};
