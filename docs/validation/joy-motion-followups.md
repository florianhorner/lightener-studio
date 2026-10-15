# Joy motion follow-up validation

Local validation recorded on 2026-10-14. These results cover the editor and its
synthetic browser fixtures. Home Assistant runtime, physical devices and visual
acceptance were not exercised.

## Results

| Check | Result |
|---|---|
| Frontend unit tests and coverage | 1,161 tests passed in 39 files; statements 94.07%, branches 88.68%, functions 95.61%, lines 96.00% |
| Built-bundle browser suite | 103 Chromium tests passed, including 13 draw-in cases and touch double-tap cases on six emulated devices |
| Backend tests | 305 passed |
| ESLint, Prettier, TypeScript | Passed |
| Ruff and project-only mypy | Passed |
| Frontend build and bundle parity | Passed |
| Demo choreography check | Passed |
| Attribution, dependency, release and runtime-pin guards | Passed |

`scripts/preflight` stopped at three backend mypy errors involving the installed
Home Assistant `ColorMode` types in `light.py`. The candidate changes no Python
files. The documented project-only command,
`.venv/bin/mypy --follow-imports=skip custom_components/lightener_studio/`, passed,
and the remaining preflight checks were run separately. This is not a claim that
the unmodified preflight command passed.

The coverage run passed with two workers and the normal five-second timeout.
An earlier run alongside other suites timed out in the existing ripple geometry
stress test; its assertions and timeout were unchanged.

## Regression coverage

- `js/src/components/curve-graph.motion.test.ts` exercises deferred viewport
  intersection after focus restoration, the half-visible threshold, zero-progress
  pending clips, delayed marker pops, viewport exit/re-entry, scrubber-span
  clipping, dim preservation and lifecycle cleanup.
- `js/src/lightener-curve-card.motion.test.ts` exercises deferred cleanup timing,
  touch-scroll input, cleanup from rendered marker indexes, long curves and
  independent hover/focus engagement for resumed or cancelled shape previews.
- `js/playwright/motion-moments.spec.ts` checks painted paths and scrubber dots,
  marker animation and editing interruptions against the built bundle. It also
  exercises the six-light focus-scroll sequence under a fixed Edit lights dialog
  and resumes deferred previews after either blur or pointer leave without re-entry.
- `js/playwright/selected-light-shapes.spec.ts` checks the SVG hit box and touch
  double-tap addition across six emulated devices. Pen input has unit coverage;
  no physical pen or touch device was tested.

## Artifact identity

The browser suite exercised these bundle bytes:

| Bundle | SHA-256 |
|---|---|
| `custom_components/lightener_studio/frontend/lightener-curve-card.js` | `2660df2c98ed41960e8cc084dbdd1ec35188708633d26b7350c54d1000524530` |
| `docs/lightener-curve-card.js` | `2660df2c98ed41960e8cc084dbdd1ec35188708633d26b7350c54d1000524530` |

Source-and-fixture fingerprint: `977b5576d4b069b27544e5e6fe7609a91b6ff40dcfd17069c08a32ffeee7070a`.
Compute SHA-256 over the sorted tracked paths under `js/src/` and
`js/playwright/`, plus both bundles above. For each path append its UTF-8 path,
a NUL byte and its binary SHA-256 digest, then hash the concatenation. This
fingerprint excludes this report and other prose documents.
