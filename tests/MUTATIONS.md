# Recorded mutations

Coverage says a line ran. It does not say anything checked what the line did.

`scripts/mutate` turns that check into a command, so a mutation can be recorded
once and re-run whenever the code around it moves.

```sh
scripts/mutate --list          # what is recorded
scripts/mutate --all           # re-run every row
scripts/mutate --id preview-off-point
```

Each run requires a clean tracked tree and holds a per-checkout lock, requires
the command to pass before the mutation and to fail after it, and restores the
file byte-for-byte, mtime included. An interruption restores the file before
exiting; a run that is killed outright leaves a saved copy that the next run
restores, re-running the row's `after` command, before anything else. A mutant
that **survives** means the test named in the row does not hold the behaviour
it claims to.

## Adding a row

Pick the one line that carries the behaviour, and a replacement that removes it
without breaking the build. `replace` must appear exactly once in the file; when
the code moves, the run fails with "the code moved" rather than quietly
checking nothing. Keep `command` as narrow as the behaviour -- a whole-suite
run proves far less about which test is doing the holding.

A row whose command needs the built bundle must build it: Playwright fixtures
load `docs/lightener-curve-card.js`, not the TypeScript source, so use
`npm run test:browser` with `cwd` set to `js`.

## The table

```json
[
  {
    "id": "preview-off-point",
    "why": "The card must not call light.turn_off for a sample the backend keeps on at brightness 1. Rounding to a whole percent before the 0-255 conversion is what put the two off points at different places.",
    "file": "js/src/utils/preview-controller.ts",
    "replace": "const brightness = Math.round((level / 100) * 255);",
    "with": "const brightness = Math.round((Math.round(level) / 100) * 255);",
    "command": ["npx", "vitest", "run", "utils/preview-controller.test.ts"],
    "cwd": "js"
  },
  {
    "id": "control-point-growth",
    "why": "All five marker shapes must grow on hover and focus. Four of them ignored the SVG r property, so only the first light in a group had interaction feedback on its handles.",
    "file": "js/src/components/curve-graph.ts",
    "replace": "      --cp-scale: 1.25;",
    "with": "      --cp-scale: 1;",
    "command": ["npm", "run", "test:browser", "--", "control-point-growth.spec.ts"],
    "after": ["npm", "run", "build"],
    "cwd": "js"
  },
  {
    "id": "origin-dim-floor",
    "why": "An explicit 0 key in a curve is a dim floor and must survive config preparation. Overwriting it instead of defaulting it would silently rewrite every hand-drawn floor to physical zero.",
    "file": "custom_components/lightener_studio/brightness.py",
    "replace": "    config.setdefault(0, 0)",
    "with": "    config[0] = 0",
    "command": ["scripts/test-python", "-q", "tests/components/lightener_studio/test_brightness.py"]
  }
]
```
