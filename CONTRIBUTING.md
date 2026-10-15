# Contributing

Contributing to this project should be as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features

## Development workflow

1. Fork the repo and create your branch from `master`.
2. Make your changes (see tooling below).
3. If you changed any `js/src` file, run `cd js && npm run build` and commit the
   regenerated bundles in `custom_components/lightener_studio/frontend/` and `docs/` —
   the version-sync CI job fails if the committed bundle drifts from source.
4. Run `scripts/preflight` (the local preflight subset) and fix what it flags.
   Playwright and the full coverage jobs remain separate CI gates.
5. Update the changelog if the change is user-facing.
6. Open a pull request — every PR needs a `## Proof` block in its body; the
   template fills one in (see [Pull requests](#pull-requests)).

## Attribution

Lightener Studio is a heavily extended fork of
[fredck/lightener](https://github.com/fredck/lightener), not a thin skin.
`custom_components/lightener_studio/light.py` is ~500 lines diverged from upstream, plus
a fork-only `websocket.py` and config-flow / state-handling hardening.

There is one canonical attribution line, in `README.md` (the "Built on the
Lightener integration by @fredck, extended for the visual editor … Upstream MIT
license intact." sentence). Reuse it verbatim on every attribution surface: the
README, the GitHub repo description, release notes, and forum / Discussions posts.

The integration is heavily modified, so never describe it as a plain re-bundle of
upstream or imply Studio ships the original code. That claim is false and has
recurred across the README, the repo description, and release drafts. Examples CI
rejects (shown here, exempted by the trailing marker):

> `everything upstream included, unchanged` / `bundled upstream integration untouched` / `included as-is from upstream` <!-- lint-attribution-ok -->

`scripts/lint-attribution` (the `Quality` CI workflow) flags any tracked `.md` or
`.html` doc that makes the claim. It keys on three things appearing together on a
line: an inclusion verb, an integration noun, and a no-change word. The root
`CHANGELOG.md` is excluded as a historical record. A deliberate example can be
exempted with an HTML-comment marker, `<!-- lint-attribution-ok -->`, on the same
physical line. The GitHub repo **description** is metadata, not a file; CI checks
it separately by piping `gh repo view` through `scripts/lint-attribution --stdin`,
so keep it matching the canonical line.

## Project structure

```
custom_components/lightener_studio/   # Python — HA integration backend
  __init__.py                  # Integration setup, static file serving
  brightness.py                # Pure brightness-map helpers (no HA deps)
  config_flow.py               # Configuration UI flow (name → lights + preset → done)
  const.py                     # Constants, curve presets, domain config
  light.py                     # Virtual light platform (re-exports brightness helpers)
  observability.py             # Structured logging / tracing / metrics
  util.py                      # Small cross-cutting helpers
  websocket.py                 # WebSocket API (curves, candidate lights, batch/legacy membership, handoff)
  translations/                # HA config/options flow + Repair issue strings (en, de, sk, pt-BR)
  frontend/                    # Built JS bundle (committed, do not edit by hand)
  brand/                       # HACS integration icons (icon.png, logo.png)

js/                            # TypeScript — Lit 3.x frontend card
  src/
    lightener-curve-card.ts    # Main card component
    components/                # Sub-components (graph, legend, scrubber, footer)
    utils/                     # Data helpers, curve math, presets, save-lifecycle reducer, types
  playwright/                  # Built-bundle browser, membership, responsive, and skew proof
  scripts/scenecast/           # Demo-capture engine (runner.mjs, capture.html, integration tests)
  scenes/                      # Per-project Scenecast choreography (lightener.scene.mjs)

docs/                          # GitHub Pages demo site (live demo)

.github/assets/                # README screenshots and demo GIF
.config/                       # Commit-message rules consumed by local hooks/CI
config/                        # Minimal Home Assistant dev configuration
images/                        # HACS/Home Assistant brand assets

tests/                         # pytest — backend unit tests
```

## Prerequisites

- Python 3.13 for local backend testing (the repo `.venv` runtime). Ruff and Mypy
  intentionally target py312 for tooling compatibility — that 3.13-vs-3.12 split is
  expected, not a mismatch.
- Node.js 24, version 24.15.0 or newer (Node 26 and later also work). Node 24 is
  the project's baseline: `.nvmrc` names it for CI, the devcontainer and
  `scripts/conductor-setup`, and `js/package.json` declares the range in
  `engines`. On that line `jsdom` 30 needs 24.15.0 or newer, and it no longer runs
  on Node 20. Other versions warn `EBADENGINE` on `npm ci`.
  `scripts/lint-node-baseline` keeps these places in agreement.
- Home Assistant is optional for unit and browser work. Use the isolated
  `scripts/develop` instance only for the explicit live-proof lane.

## Setting up

The easiest way to get started is to open this repository in VS Code with the
[Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
extension. The included `.devcontainer.json` provisions Node 24 and the Python
test environment and installs both backend and frontend dependencies on first
create (via `scripts/setup`).

For a manual setup:

```sh
# Backend
scripts/setup-python
source .env.workspace

# Frontend
cd js
npm ci
```

Do not use bare `pytest` for local backend work. This repository standardizes on
`scripts/test-python`, which always runs the Home Assistant pytest stack inside
the repo-managed Python 3.13 `.venv`. A global `pytest` can resolve to a stale
install and fail before test collection starts. If you `source .env.workspace`
first, the shell also gets a `pytest()` wrapper that routes to the same venv.

## First ten minutes: membership picker

The candidate contract and dialog can be developed without running Home
Assistant. Start with the reproducible install and the smallest red/green loops:

```sh
# Cold bootstrap.
scripts/setup-python
(cd js && npm ci)

# Backend contract, write authority, config-flow errors, and locale parity.
scripts/test-python \
  tests/components/lightener_studio/test_membership.py \
  tests/components/lightener_studio/test_config_flow.py \
  tests/components/lightener_studio/test_translations.py -q

# Dialog normalization, filters, lifecycle, and recovery.
(cd js && npm test -- src/components/light-membership-dialog.test.ts)

# Built-bundle browser contract, including the actual prior-stable skew cell.
(cd js && npx playwright test membership-picker.spec.ts)
```

A successful targeted loop exits zero: pytest and Vitest report their selected
tests as passed, and Playwright reports `membership-picker.spec.ts` with no
failures. The browser command builds the current bundle first; do not treat a
test against an older committed bundle as current-source proof.

For planning and regression reports, record the measured duration rather than
claiming an unmeasured setup time. The working targets are:

| Loop | Target |
|---|---:|
| Clean checkout to first targeted green | p50 ≤ 15 minutes; p90 ≤ 25 minutes |
| Warm backend or frontend edit to relevant result | ≤ 3 minutes |
| Warm checkout to complete isolated #220 live proof | ≤ 20 minutes |

Run `scripts/test-fast` after the targeted loops. Before handoff, also run the
local preflight subset, the browser suite, and the relevant coverage jobs; none
of the targeted commands alone is the full acceptance gate.

### Optional isolated Home Assistant proof

Use this only when the source-level and built-bundle loops are green. It starts
the repository's disposable Home Assistant, not a real installation, and it
does not authorize a restart elsewhere.

`scripts/setup-python` installs the dedicated `requirements-ha-runtime.txt`
pins needed by Home Assistant's web UI. On macOS, install the native
`jpeg-turbo` library with `brew install jpeg-turbo`; `scripts/develop`
automatically exposes its Homebrew library path. On Debian/Ubuntu,
`sudo scripts/setup` selects the available `libturbojpeg` package
(`libturbojpeg` on Ubuntu Noble, `libturbojpeg0` on older releases). If the UI
still hangs on **Loading data**, stop the isolated process and search its log
for `ModuleNotFoundError` or `handle_get_services` before debugging Lightener.

```sh
scripts/develop --fresh
```

`--fresh` clears only this repository's persisted dev configuration. Complete
onboarding if prompted, then create a disposable group named
`Membership Proof` with:

- `light.living_room_ceiling` (`Living Room Ceiling Lights`)
- `light.living_room_sofa_lamp` (`Living Room Sofa Lamp`)

In `/lightener-editor`, open **Edit lights** and record:

1. **Current group only (2)** remains based on the dialog-open membership even
   after one current row is unchecked.
2. **Show hidden & disabled (N)** reveals exceptional rows without making a
   disabled new row selectable.
3. Adding `light.living_room_ceiling_leds`, updating, and reloading preserves
   member order and saved curves.
4. For the race guard, select a new light, disable it from Home Assistant's
   Entities page before Update, and verify `disabled_entity` keeps pending
   selection and filters, focuses the recovery, and offers **Try again**.

Stop the isolated process with Ctrl-C. Stage raw screenshots, logs, payloads,
timings, and the exact integration/Home Assistant/frontend/browser versions
under `.context/proof/` while working. That directory is ignored and is not a
review artifact: sanitize and upload the selected evidence to the pull request
or CI, or commit a purpose-built fixture before asking for review.

## Fast loop

For the normal local inner loop, use:

```sh
scripts/test-fast
```

That runs the fast checks we expect before touching a real Home Assistant box:
backend pytest, frontend vitest, and frontend typecheck.

**Before opening a PR, run `scripts/preflight`.** It is the local preflight
subset: ruff, mypy, pytest, ESLint, Prettier, tsc, Vitest, the frontend build
and demo check, plus repository guards. It deliberately excludes Playwright,
the full coverage jobs, hassfest, and HACS validation, which remain separate CI
gates. (`scripts/test-fast` also skips ESLint, Prettier, and the build.)

If you want to test on a live Home Assistant instance without cutting a release
or waiting for HACS, sync the integration directly over SSH:

```sh
cat > .context/ha-sync.env <<'EOF'
HA_SSH_TARGET=root@your-ha-host
HA_CONFIG_DIR=/config
EOF

scripts/ha-sync --frontend-only
```

Notes:

- `scripts/ha-sync --frontend-only` is the fastest UI loop. It builds the
  frontend bundle and syncs only `custom_components/lightener_studio/frontend/`.
- `scripts/ha-sync` syncs the full integration directory.
- The script never restarts Home Assistant. Frontend-only changes usually just
  need a browser refresh. Python changes still require a manual HA restart or
  equivalent reload on your test box.

## Tooling

### Python (backend)

| Tool   | Purpose             | Command              |
| ------ | ------------------- | -------------------- |
| Ruff   | Linting + formatting | `ruff check . --fix` / `ruff format .` |
| Mypy   | Type checking        | `mypy custom_components/lightener_studio/` |
| Pytest | Unit tests           | `scripts/test-python` |
| Coverage | Coverage check     | `scripts/test-python --cov=custom_components/lightener_studio` |

Configuration lives in `pyproject.toml`. Ruff and Mypy still target `py312` /
Python 3.12 there as tooling compatibility settings. Local backend pytest
runtime is standardized on Python 3.13.

`tests/conftest.py` makes the Home Assistant test plugin's loop-debug and
lingering-task checks run on each test's own event loop. It backports a fix
from pytest-homeassistant-custom-component 0.13.326 to 0.13.316, the last
release that supports Python 3.13, and lets pytest-asyncio 1.4 run at all;
delete it once the plugin is 0.13.326 or newer. `test_harness.py` fails if loop
debug or the cleanup check stops reaching the test, or if the install order
stops `requirements.txt`'s pytest, pytest-asyncio and pytest-cov pins from
winning over the plugin's.

The coverage floor is `fail_under` in `[tool.coverage.report]` and is the
single source of truth. Do not pass `--cov-fail-under` on the command line:
it overrides that value, so a stale number in this file would silently run a
weaker gate locally than CI does.

### TypeScript (frontend)

| Tool     | Purpose     | Command                |
| -------- | ----------- | ---------------------- |
| ESLint   | Linting     | `npm run lint`         |
| Prettier | Formatting  | `npm run format`       |
| tsc      | Type check  | `npx tsc --noEmit`     |
| Vitest   | Unit tests  | `npm test`             |
| Coverage | Coverage check | `npm run test:coverage` |
| Rollup   | Build       | `npm run build`        |
| Playwright | Browser E2E | `npm run test:browser` |
| Scenecast | Demo GIF rot guard (CI gate) | `npm run demo:check` |
| Scenecast | Regenerate the demo GIF locally | `npm run demo:capture` |
| Scenecast | Capture-engine integration tests | `npm run demo:test` |
| Bundle freshness | Warn when uncommitted source edits are missing from the bundles | `scripts/check-bundle-freshness` |
| Mutation | Prove a test is load-bearing | `scripts/mutate --all` |

Fast local loop: `scripts/test-fast frontend`

The demo GIF (`.github/assets/lightener-curve-editor-demo.gif`) is generated by the
**Scenecast** pipeline (`js/scripts/scenecast/`), not hand-shot. Edit the choreography in
`js/scenes/lightener.scene.mjs`. CI runs `demo:check` (asserts the choreography still drives
the real card); the **Demo refresh** workflow regenerates the GIF and opens a bot PR; and
`release.yml` hard-fails a stable feature release if the committed GIF is stale, and only
warns on prereleases and the 2.16 line (see RELEASE_MANAGER.md).

After changing any TypeScript file, run `npm run build` inside `js/` to
regenerate the committed bundles in `custom_components/lightener_studio/frontend/`
and `docs/`. The Home Assistant bundle is committed so that HACS installs work
without a build step, and the docs bundle keeps the GitHub Pages demo in sync
with the shipped card.

Four mechanisms make forgetting that rebuild hard to miss, in rising order of
authority. `scripts/test-fast frontend` ends with a build-free warning
(`scripts/check-bundle-freshness`) when an uncommitted edit to a bundled source
is missing from the bundles. Wherever pre-commit runs, the
`frontend-bundle-build` hook does the real build, so a commit that touches a
non-test `js/src/**/*.ts` or `js/dev/fake-ha.js` stops until the regenerated
files are staged with it. `scripts/preflight` and `lint.yml` both rebuild and
fail on any diff.

### Pre-commit hooks

The repo includes a `.pre-commit-config.yaml` that runs ruff, JS lint-staged,
the vocabulary check, and a frontend rebuild on commit. Install with:

```sh
pip install pre-commit
pre-commit install
```

### Proving a test is load-bearing

Coverage says a line ran, not that anything checked what it did.

`scripts/mutate` makes that check repeatable. It breaks one line, requires the
named test to go from green to red, and restores the file:

```sh
scripts/mutate --list                     # what is recorded
scripts/mutate --all                      # re-run every recorded mutation
scripts/mutate --file custom_components/lightener_studio/brightness.py \
               --replace 'config.setdefault(0, 0)' --with 'config[0] = 0' \
               -- scripts/test-python -q tests/components/lightener_studio/test_brightness.py
```

It runs only on a clean tracked tree and only one run per checkout at a time,
because it rewrites a tracked file and its commands may rebuild tracked
bundles; that way every change left behind is provably its own. An
interruption (Ctrl-C, SIGTERM, SIGHUP) restores the file and stops the
command's processes before exiting. If the process is killed outright, the next
run restores the file and re-runs the row's `after` command first. A file
edited while a mutant runs is never overwritten.

Record the mutations worth keeping in `tests/MUTATIONS.md`, which explains the
row format. Run `scripts/mutate --all` when a PR adds tests that claim to lock
a behaviour; CI only runs the harness's own fixture tests, because the recorded
rows re-run a suite each.

### Browser regression tests (Playwright)

The Playwright suite drives the committed browser bundle. It guards the three
card rendering surfaces and the focused membership-picker contract.

```sh
cd js
npm run test:browser   # builds the bundle, then runs playwright
```

Either entry point is safe. `npm run test:browser` runs `npm run build` first,
and a bare `npx playwright test` builds in `playwright/global-setup.ts`, so
neither can measure a stale bundle. Set `PLAYWRIGHT_SKIP_BUILD=1` to skip that
build when you have just run one yourself (`test:browser` sets it, so rollup
does not run twice); any value other than `1`, `true` or `yes` still builds.

The dev server's port is derived from the checkout path, so parallel worktrees
rarely share one. When two do, `served-bundle-identity.spec.ts` fails, because
it checks that every script the fixtures import is served byte-for-byte from
this checkout. Pick another port with `PLAYWRIGHT_PORT=<port>`; a value that is
not a port number is an error rather than a silent fallback.

The overflow matrix covers 3 surfaces × 4 viewport widths (320 / 500 / 700 /
1100 px):

| Surface | How it renders |
|---|---|
| `standalone` | Card mounted directly at the page root |
| `lovelace` | Card inside a centred Lovelace shell (max-width 520 px) |
| `sidebar` | Card mounted through `lightener-editor-panel` in a sidebar shell |

**Run a single surface** (the global setup builds first):

```sh
npx playwright test --grep "standalone mode"
npx playwright test --grep "lovelace mode"
npx playwright test --grep "sidebar mode"
```

**Run one surface at one width:**

```sh
npx playwright test --grep "sidebar mode does not horizontally overflow at 1100px"
```

The fixture is `playwright/fixtures/long-name-card.html` (relative to `js/`). It accepts a
`?mode=standalone|lovelace|sidebar` query parameter and exposes three globals
that the spec reads after rendering:

| Global | Set by |
|---|---|
| `window.__LIGHTENER_CARD_READY__` | Promise that resolves when the card (or panel-mounted card) finishes its first render |
| `window.__LIGHTENER_CARD_ELEMENT__` | The `lightener-curve-card` element |
| `window.__LIGHTENER_PANEL_ELEMENT__` | The `lightener-editor-panel` element (sidebar mode only) |

The fixture uses 20 lights with 46-character entity IDs and friendly names to
stress-test text truncation and overflow. If you add a new rendering surface,
add a `FixtureMode` variant to the spec and a corresponding branch in the
fixture's `__LIGHTENER_CARD_READY__` setup block.

`playwright/membership-picker.spec.ts` reuses
`playwright/fixtures/selected-light-shapes-card.html` with deterministic
membership scenarios. It covers:

- immutable **Current group only (N)** behavior;
- hidden, disabled, unavailable, missing, and overlapping statuses;
- keyboard focus/escape recovery and 200% zoom reflow;
- fixed 100- and 1,000-candidate scale distributions; and
- the actual `v2.17.2` bundle against a fake current backend that returns
  `disabled_entity`.

The prior-bundle test resolves both the tag commit and bundle SHA-256 from Git.
If a shallow checkout does not contain the tag, fetch tags before claiming
binary-skew proof:

```sh
git fetch --tags
cd js
npx playwright test membership-picker.spec.ts --grep "prior stable"
```

A skipped tag is not a binary-skew pass. Payload-only scenarios are labelled
contract simulation.

The scale test runs three warmups followed by twenty measured samples for
initial render at both 100 and 1,000 candidates, then repeats that protocol for
warmed search/filter work. It attaches machine-readable JSON with the commit,
browser, OS/CPU, deterministic distribution, raw samples, median, p95, and
threshold. CI asserts the protocol and UI result, not a hard wall-clock limit:
shared runners are too noisy for a reliable timing gate. Review the attached
p95 report on a named machine against 250 ms at 100 candidates, 750 ms at
1,000, and 100 ms for warmed search. If a target fails, optimize in the same
membership branch and rerun before considering virtualization.

### HACS brand assets

Home Assistant 2026.3+ and HACS read custom integration brand images directly
from `custom_components/lightener_studio/brand/`. Do not open a new
`home-assistant/brands` `custom_integrations/lightener_studio` PR for this
integration unless the goal is explicitly to create a known auto-close record.

| File | HACS usage | Required dimensions |
|---|---|---|
| `icon.png` | Square catalog/integration icon | 256 × 256 px, transparent RGBA PNG |
| `icon@2x.png` | hDPI square icon | 512 × 512 px, transparent RGBA PNG |
| `dark_icon.png` | Dark-background square icon | 256 × 256 px, transparent RGBA PNG |
| `dark_icon@2x.png` | hDPI dark-background square icon | 512 × 512 px, transparent RGBA PNG |
| `logo.png` | Landscape integration logo | 768 × 256 px, transparent RGBA PNG |
| `logo@2x.png` | hDPI landscape integration logo | 1536 × 512 px, transparent RGBA PNG |
| `dark_logo.png` | Dark-background landscape logo | 768 × 256 px, transparent RGBA PNG |
| `dark_logo@2x.png` | hDPI dark-background landscape logo | 1536 × 512 px, transparent RGBA PNG |

Editable vector sources live in `images/lightener*.svg`; exported PNG copies
also live in `images/` for review. The committed integration files under
`custom_components/lightener_studio/brand/` are the files that ship to users.

Brand art must stay original. Do not reuse, trace, upscale, or adapt Home
Assistant imagery, the upstream Lightener bulb/bolt/crescent artwork, or a
generic bulb/bolt/house icon. The current mark uses abstract
brightness-response curve geometry only.

When changing the brand art, export transparent, trimmed PNGs from the SVG
sources and run `scripts/test-python`. The asset test checks file names,
dimensions, alpha, trimming, hDPI sizing, landscape logos, and accidental
reintroduction of the old upstream-derived image hashes.

## Translations

Lightener Studio ships UI strings for the config/options flow and Repair
issues in `custom_components/lightener_studio/translations/` (`en`, `de`, `sk`,
`pt-BR`). `en.json` is the source of truth. Translation quality may lag by
temporarily carrying an English value, but locale files may not omit keys or
placeholders: repository tests enforce exact structural parity. To add or
update a language:

1. Copy `en.json` to `<lang>.json` (e.g. `fr.json`) and translate only the
   values — keep every key, and leave `{placeholders}` and `**markdown**` intact.
2. Match `en.json`'s structure exactly; `hassfest` (the Validate workflow) fails
   on a malformed or out-of-sync translation file.
3. No code change is needed — Home Assistant loads the file by name.

For membership error changes, both `config.error.disabled_entity` and
`options.error.disabled_entity` must exist in every shipped locale with the
same placeholders. Run:

```sh
scripts/test-python tests/components/lightener_studio/test_translations.py -q
```

Translating is the lowest-friction first contribution, and very welcome.

## Changelog

If your change is user-facing (new feature, bug fix, behaviour change), add an
entry to `CHANGELOG.md` under the `[Unreleased]` section.

## Pull requests

Every pull request runs a CI check (`verify-claims`) that requires a `## Proof`
block at the end of the PR body. The PR template scaffolds one — fill each line
with a real artifact or mark it `n/a — <reason>`:

- Check a box (`- [x]`) and give a reviewer-accessible artifact: a CI/fork
  Actions URL, PR attachment, or tracked repository-relative path, **or**
- leave it unchecked (`- [ ]`) with `n/a — <reason>` when the line doesn't apply.
  A docs-only PR can mark build / tests / lint / runtime / schema `n/a`.

Absolute paths, `file://` links, localhost URLs, and ignored `.context/` paths
are working notes, not proof: another reviewer cannot open them. For a
WebSocket or compatibility change, the schema/runtime evidence should identify
the integration commit, exact frontend tag and commit where relevant, Home
Assistant Core and frontend versions for live proof, browser, skew result, and
the attached deterministic performance report.

**Opening from a fork?** The check runs in strict mode and will not accept `n/a`
on the `runtime:` line. Instead, link the green CI run on your fork (the Actions
tab → the run for your branch) or attach a screenshot for a UI change; everything
else can still be `n/a — <reason>`. (Relaxing this for community fork PRs is
tracked upstream in `florianhorner/gh-workflows`.)

### Escalation and contributor escape hatches

Ask in an issue or draft pull request before changing the candidate capability
semantics, membership write authority, supported Home Assistant floor, or
ownership of a Home Assistant frontend route. Include the exact request and
response payload, versions, stable error code, and reviewer-accessible proof.

No maintainer-only infrastructure is required: fork Actions URLs plus PR
attachments are valid evidence. For route-compatibility investigation,
`unsupported; retain brand` is a successful bounded outcome when an exact
Core/frontend pair does not protect the proposed route. Record the pair and
visible result, keep the supported `?brand=lightener_studio` route, and do not
open a speculative route-change PR.

## Reporting bugs

GitHub issues are used to track bugs. Report a bug by
[opening a new issue](../../issues/new/choose).

Good bug reports include:

- A quick summary and/or background
- Steps to reproduce (be specific, include sample config if relevant)
- What you expected vs. what actually happened
- Home Assistant version and browser/device info
- Backend logs with debug logging enabled (see
  [TROUBLESHOOTING.md → Enable debug logging](docs/TROUBLESHOOTING.md#enable-debug-logging))

If the card UI looks like an older version after an upgrade, see
[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for the diagnostic snippet and
recovery sequence before filing an issue.

## Reporting security vulnerabilities

See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](http://choosealicense.com/licenses/mit/) that covers this project.




<!-- BEGIN: commit-message-standards (do not hand-edit — update .config/commit-rules.json instead) -->
## Commit messages

Use `type(scope): subject`, for example `fix(auth): reject expired sessions`.
Allowed types are `feat fix docs style refactor test chore ci build perf revert`.
Keep the subject at most 72 characters and omit a trailing period. The title of
a pull request opened by a dependency bot (Dependabot, Renovate, pre-commit.ci)
may be longer.

For `feat` commits with >50 lines changed, add a body line beginning with
`Why:` that explains the reason for the change. This is a convention; CI does
not fail without it.

CI checks every commit of a pull request and the pull request title with
`.config/commit-lint/validate-pr.sh`. To check a message before pushing, run
`bash .config/commit-lint/commit-msg <message-file>`. Both files are generated;
do not edit them by hand.

<!-- END: commit-message-standards -->
