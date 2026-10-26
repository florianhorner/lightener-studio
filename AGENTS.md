# AGENTS.md

## Product naming and wording

- Always write the product name as **Lightener Studio**. Never shorten it to
  "Studio" or "Lightener" in product copy, documentation or publication text.
  This distinguishes the product from the upstream Lightener integration.
- Preserve upstream attribution and exact technical identifiers or quoted log
  messages; those are not alternative product names.
- Check wording against [Voice and vocabulary](DESIGN.md#voice-and-vocabulary)
  and the [attribution rules](CONTRIBUTING.md#attribution). Prefer light, room,
  brightness, shape and group in user-facing prose; retain precise technical
  terms and actual Home Assistant labels where readers need them.

## Starting-shape visual quality

- Built-in brightness shapes must look intentional and attractive, without
  unnecessary zigzags. Add control points only where they materially improve
  the linear response, preserving clean silhouettes and usable mobile handles.
- Keep saved shapes unchanged when revising starting shapes; preserve supported
  legacy preset IDs at the API boundary.
- New Equal shapes should offer a usable midpoint on the straight response.
  Preserve required low-end anchors and existing saved curves.

## Editor controls

- Preserve the current editor layout and visual styling during functional
  follow-up work. Reopen the design direction only on explicit instruction.
- Use screen space sparingly: keep controls compact, avoid repeated labels and
  helper panels, and keep graph labels readable as the plot grows.
- Playable previews must preserve the product's native sizing and font
  inheritance; do not enlarge the default graph to showcase a control change.
- Design previews must use realistic Home Assistant framing and current editor
  components, including crowded groups and long light names. Compare usable
  viewport space and working controls, not just isolated presentation layouts.
  Preserve the graph-left, lights-right wide layout unless a layout change is
  explicitly requested.
  Carry demonstrated interactions forward across visual revisions; compare
  behavior against the previous prototype, including hover, selection clearing,
  name disclosure, help and reduced motion. Test native width bounds on wide
  monitors as well as ordinary desktop and phone sizes.
- Enable Joy animations by default, including the sidebar editor. Preserve
  per-moment opt-outs and operating-system reduced-motion preferences.
- Keep the full Home Assistant light name and the entity-ID reveal on hover,
  keyboard focus, and selection, without changing row height.
- Keep Room brightness visually attached to its graph as the light list grows.
  Graph axes must remain visible when the Room position dims curve content.
  Display the Room value as Off at zero while retaining numeric zero internally.
  Selected-curve visibility at Off is tracked as a deferred presentation
  improvement in TODOS.md. Preserve light commands, saved curves and the
  numeric Room value when addressing it.
- Make selecting and clearing a light discoverable. Temporary mouse-hover
  emphasis must not change the edit target, saved curves, Undo history or lights.
  Horizontal brightness drags work from the first gesture on mouse and touch;
  preserve vertical touch scrolling.
- Use Lightener Studio's own logo in the editor header and Home Assistant
  sidebar entry. The header wordmark uses the established brand typography;
  other editor text retains native Home Assistant font inheritance.

## Canvas help and editor structure

- Keep canvas help on the existing graph and preserve visible entity IDs.
  Replay and Done/dismiss preserve
  shapes, pointer/keyboard editing adopts an unsaved example, and Undo restores
  the prior shape and clean state. Opening, replaying, dismissing or refusing
  help for an existing draft must not save or command lights.
- Keep the editor's change surface small. Reuse existing owning modules, tests
  and fixtures where they fit; reduce duplicate state and logic before adding
  files. Preserve claim epochs, write generations, preview phases and their
  regression guards. File-count reduction must not erase justified ownership
  boundaries or change existing behavior.
- Captured browser logs and local review caches belong under ignored `.context/`,
  not in the editor's source/publication candidate. Preserve them recoverably
  when relocating them.

## Saved-work safety

- Curve saves require a server-checked saved-baseline precondition. Cached
  editors that cannot supply it must refresh before saving with the updated
  backend; never retain an unguarded legacy-write fallback.
- Do not automatically reload an editor with unsaved work or claim that an
  older editor's unsaved drafts survive refresh. Rejecting a stale or unsupported
  save must leave saved group data unchanged.

- Keep the current draft and Undo history intact during save-conflict review.
  Only explicit acceptance may replace the baseline with the latest saved
  shapes and start a fresh Undo history rooted in that saved state; recovery
  itself must not save automatically or recreate removed members.

- Keep navigation-recovery drafts in document memory only. Offer explicit
  recovery after Home Assistant navigation; never autosave or start Watch when
  recovering. Full refresh, tab close and browser/process loss are outside this
  recovery promise. Do not add browser-stored drafts without a separate decision.
- Isolate drafts by authenticated user, group and sidebar/dashboard surface;
  each editor owns its own draft. Recovery must preserve guarded-save conflicts
  and known runtime uncertainty rather than treating a remount as a fresh start.

## Preview restoration safety

- Watch uses cooperative restoration while the editor remains mounted and
  connected. Navigation or connection loss stops new automatic restoration;
  refresh, tab/browser close and process loss can leave preview brightness.
- Keep restoration evidence in document memory, separate from shape drafts.
  Save, Cancel and draft recovery/discard must not erase unresolved light effects.
- Coordinate overlapping lights within the document. Other tabs, automations
  and physical controls remain outside this ownership; restoration may overwrite
  an unobserved concurrent change. Service acknowledgment does not prove physical
  restoration.
- Never automatically retry after uncertainty or lost observation. A timeout or
  transport rejection does not cancel an issued command. Keep conflicting work
  blocked until a correlated terminal HA receipt and explicit restoration
  disposition permit release; preserve authenticated-user isolation.

## Cursor Cloud specific instructions

Lightener Studio is a Home Assistant custom integration (Python backend in
`custom_components/lightener_studio/`) plus a TypeScript/Lit frontend card (`js/`).
There are **no external services** (no DB/redis/queue, no docker). Standard
setup/lint/test/build commands are documented in `CONTRIBUTING.md` — prefer those
(`scripts/setup-python`, `scripts/test-fast`, `scripts/preflight`,
`scripts/test-python`, and the `js/` npm scripts). Notes below are only the
non-obvious caveats discovered in this environment.

### Copy and translation scope

- Review display text against the voice and vocabulary rules in `DESIGN.md`.
- Keep copy corrections aligned across the existing setup locales (`en`, `de`,
  `sk`, `pt-BR`). Do not add languages or introduce editor localization unless
  explicitly requested. The custom editor currently uses English.
- Light labels retain their full Home Assistant names across groups. Preserve
  beta 1 selector behavior: reveal the entity ID on row hover or keyboard focus,
  including the eye control; keep it visible while selected. Hide it once the
  row is unselected, unfocused, and no longer hovered, without shifting the row.

### Running the app (Home Assistant dev instance)

- Start with `scripts/develop` (serves `http://localhost:8123`). It is fully
  isolated and persists state across runs; pass `--fresh` to wipe local HA state.
  Python/backend changes require restarting the script. Run it under tmux (it is
  a long-running foreground process), not as a one-shot background command.
- Complete Home Assistant onboarding with locally chosen disposable credentials.
  Reuse that local account on later runs; after `--fresh`, onboard again.
- Hello-world flow: Settings → Devices & Services → Add Integration → "Lightener Studio"
  → name it → select member lights → finish native setup, including optional
  device-name/area changes. Open the exact group's editor with **Visit** on its
  device page or **Configure** beside the group on the Lightener Studio integration
  page. Native Finish does not automatically open the editor. The sidebar provides
  another route to existing groups. `lightener/*` websocket
  commands register in `async_setup`, before a config entry is required;
  `lightener/list_entities` returns an empty list when no groups exist.

### Demo HA onboarding QA recipe

Use this when a task asks whether the onboarding/setup flow really works in a
demo Home Assistant environment. Do not stop at tests; exercise the real HA UI
with browser automation and save screenshots/snapshots under `.context/proof/<slug>/`.

1. Start `scripts/develop` and open `http://localhost:8123`.
2. Log in with the disposable account chosen during local onboarding. If storage
   was wiped, complete onboarding again with locally chosen credentials.
3. Open Settings -> Devices & Services -> Add Integration, search for
   `Lightener Studio`, and select it. From the Lightener Studio editor, the "New group"
   button should navigate to `/config/integrations/dashboard/add?brand=lightener_studio`.
   In HA 2026.2, the older `?domain=lightener_studio` route lands on the dashboard
   instead of opening the provider; use `?brand=` for route checks.
4. Create a group named `Onboarding Proof`. Leave the optional area filter empty
   for the broad-path test. Select at least these seeded template lights from
   `config/configuration.yaml`:
   - `light.living_room_ceiling` (`Living Room Ceiling Lights`)
   - `light.living_room_sofa_lamp` (`Living Room Sofa Lamp`)
5. Complete the native success dialog with **Finish** or **Skip and finish**;
   it should have no separate editor link. Check both entry paths: the branded
   setup URL may open the new device page, while the generic provider picker may
   return to the integrations dashboard. Choose **Visit** on the group's device
   page, or open the Lightener Studio integration page and choose **Configure**
   beside the group. Both should open `/lightener-editor?config_entry=…` for
   the group just created. In German, these actions are **Besuchen** and
   **Konfigurieren**.
6. In the editor, verify `light.onboarding_proof` is selected and both member
   lights are listed. The **?** button, labeled **Brightness tips**, should open
   guidance without requiring a setup-link token.
7. Select `Living Room Ceiling Lights`, then click
   **Dim** (accessible name **Dim accent**). It should expose
   Undo / Cancel / Save, keep the edit scoped to the selected light, and show
   points equivalent to a 45% cap.
8. Click Save, then reload `/lightener-editor`. Verify the card is clean
   (`dirty=false`) and the saved curve persisted. A quick backend check is
   `config/.storage/core.config_entries`; the ceiling light should include
   brightness points `1 -> 1`, `25 -> 8`, `50 -> 20`, and `100 -> 45`.

Useful proof artifacts:

- Browser snapshots of provider search, selected member lights, native setup
  success, the destination after Finish, first editor load through Visit or
  Configure, after preset click, and after route reload.
- A screenshot of the setup success dialog and editor after the first save.
- The HA log lines for `lightener.ws.list_entities`, `lightener.ws.get_curves`,
  and `lightener.ws.save_curves.success`.

Known traps:

- If the HA UI hangs on "Loading data", do not debug Lightener Studio first. Check the
  isolated-runtime dependency section below, the `scripts/develop` preflight
  output, and its log for `ModuleNotFoundError` or `handle_get_services`.
- An empty `lightener/list_entities` result before creating a group is expected.
  Missing `lightener/*` commands after integration setup are a setup failure,
  not evidence that a first group is required to register them.
- HA may emit a generic frontend console error while routing. Treat Lightener Studio's
  websocket logs, UI state, and `core.config_entries` persistence as the stronger
  evidence unless the console error names Lightener Studio code.

### Critical: isolated HA runtime dependencies

The HA web UI calls the `get_services` websocket command on load. HA does **not**
auto-install its built-in integrations' Python requirements in this venv, so if a
default integration's module can't be imported, `get_services` crashes and the
**frontend hangs forever on "Loading data"** (backend otherwise looks healthy).
The exact HA 2026.2.x-compatible pins live in `requirements-ha-runtime.txt`;
`scripts/setup-python` installs them into `.venv` with the required gcc/g++
compiler settings. `scripts/develop` validates those imports and `TurboJPEG()`
before starting HA, so use its preflight failure as the first recovery signal.

- `PyTurboJPEG` also requires the native jpeg-turbo library. On Debian/Ubuntu,
  `sudo scripts/setup` selects an installable `libturbojpeg` package. On macOS,
  install `jpeg-turbo` with Homebrew; `scripts/develop` exposes its library path.
- If the preflight succeeds but the UI still hangs, grep the `scripts/develop`
  log for `ModuleNotFoundError` or `handle_get_services` before debugging
  Lightener Studio.

### mypy caveat

`.venv/bin/mypy custom_components/lightener_studio/` reports one error inside HA's own
`homeassistant/config_entries.py` ("Type parameter defaults are only supported in
Python 3.13 and greater"). This is an environment artifact: HA is installed in the
venv and uses 3.13-only syntax, while the project targets py312. CI runs mypy
**without** HA installed (`ignore_missing_imports`), so it passes. The project's
own code is clean — verify with `.venv/bin/mypy --follow-imports=skip custom_components/lightener_studio/`.

### Misc

- `pre-commit install --install-hooks` fails here ("Cowardly refusing … with
  core.hooksPath set"); pre-commit hooks are not needed for dev/test. That
  includes the `frontend-bundle-build` hook, so nothing rebuilds the committed
  bundles for you at commit time: after editing `js/src` or `js/dev/fake-ha.js`,
  run `cd js && npm run build` and commit the regenerated files. (A bare
  `npx playwright test` builds on its own.)
- Use `scripts/test-python` (or `source .env.workspace` for a `pytest` wrapper),
  not a bare global `pytest`.
