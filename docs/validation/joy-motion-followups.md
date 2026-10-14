# Joy motion follow-up validation

Local validation recorded on 2026-10-14. These results cover the editor and its
synthetic browser fixtures. Home Assistant runtime, physical devices and visual
acceptance were not exercised.

## Results

| Check | Result |
|---|---|
| Frontend unit tests and coverage | 1,156 tests passed in 39 files; statements 94.06%, branches 88.70%, functions 95.44%, lines 95.93% |
| Built-bundle browser suite | 101 Chromium tests passed, including 11 draw-in cases and touch double-tap cases on six emulated devices |
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

## Regression coverage

- `js/src/components/curve-graph.motion.test.ts` exercises deferred viewport
  intersection, scrubber-span clipping, dim preservation and lifecycle cleanup.
- `js/src/lightener-curve-card.motion.test.ts` exercises deferred cleanup timing,
  touch-scroll input, long curves and resumed or cancelled shape previews.
- `js/playwright/motion-moments.spec.ts` checks painted paths and scrubber dots,
  marker animation and editing interruptions against the built bundle.
- `js/playwright/selected-light-shapes.spec.ts` checks the SVG hit box and touch
  double-tap addition across six emulated devices. Pen input has unit coverage;
  no physical pen or touch device was tested.

## Artifact identity

The browser suite exercised these bundle bytes:

| Bundle | SHA-256 |
|---|---|
| `custom_components/lightener_studio/frontend/lightener-curve-card.js` | `0e398e716e546c4d25a1387ef869bb1c4eeb45aa0ae513103a973ab7fa2ac2ad` |
| `docs/lightener-curve-card.js` | `0e398e716e546c4d25a1387ef869bb1c4eeb45aa0ae513103a973ab7fa2ac2ad` |

Source-and-fixture fingerprint: `777e1acff9977cc74b9c9f5aa9a308abfe3a970c6a467157f31bf20ec917d50c`.
Compute SHA-256 over the sorted tracked paths under `js/src/` and
`js/playwright/`, plus both bundles above. For each path append its UTF-8 path,
a NUL byte and its binary SHA-256 digest, then hash the concatenation. This
fingerprint excludes this report and other prose documents.
