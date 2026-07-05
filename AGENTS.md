# AGENTS.md

## Cursor Cloud specific instructions

Lightener Studio is a Home Assistant custom integration (Python backend in
`custom_components/lightener_studio/`) plus a TypeScript/Lit frontend card (`js/`).
There are **no external services** (no DB/redis/queue, no docker). Standard
setup/lint/test/build commands are documented in `CONTRIBUTING.md` — prefer those
(`scripts/setup-python`, `scripts/test-fast`, `scripts/preflight`,
`scripts/test-python`, and the `js/` npm scripts). Notes below are only the
non-obvious caveats discovered in this environment.

### Running the app (Home Assistant dev instance)

- Start with `scripts/develop` (serves `http://localhost:8123`). It is fully
  isolated and persists state across runs; pass `--fresh` to wipe local HA state.
  Python/backend changes require restarting the script. Run it under tmux (it is
  a long-running foreground process), not as a one-shot background command.
- A test account already exists in the persisted dev config (snapshot):
  username `test`, password `testpassword123`. If `config/.storage` was wiped
  (e.g. `--fresh`), complete onboarding again to recreate it.
- Hello-world flow: Settings → Devices & Services → Add Integration → "Lightener Studio"
  → name it → select member lights → a Lightener group/light is created, and the
  "Lightener Studio" sidebar panel opens the visual brightness-curve editor. The
  `lightener/*` websocket commands only register once a Lightener config entry
  exists (registered in `async_setup_entry`), so they are absent until you create
  one — that is expected, not a bug.

### Demo HA onboarding QA recipe

Use this when a task asks whether the onboarding/setup flow really works in a
demo Home Assistant environment. Do not stop at tests; exercise the real HA UI
with browser automation and save screenshots/snapshots under `.context/proof/<slug>/`.

1. Start `scripts/develop` and open `http://localhost:8123`.
2. Log in as `test` / `testpassword123`; if storage was wiped, complete HA
   onboarding and recreate that account.
3. Open Settings -> Devices & Services -> Add Integration, search for
   `Lightener Studio`, and select it. From the Lightener editor, the "New group"
   button should navigate to `/config/integrations/dashboard/add?brand=lightener_studio`.
   In HA 2026.2, the older `?domain=lightener_studio` route lands on the dashboard
   instead of opening the provider; use `?brand=` for route checks.
4. Create a group named `Onboarding Proof`. Leave the optional area filter empty
   for the broad-path test. Select at least these seeded template lights from
   `config/configuration.yaml`:
   - `light.living_room_ceiling` (`Living Room Ceiling Lights`)
   - `light.living_room_sofa_lamp` (`Living Room Sofa Lamp`)
5. Finish the HA config flow. The success dialog should include the editor handoff
   link (`/lightener-editor`; German UI text is `Kurven jetzt einstellen`).
6. In the editor, verify `light.onboarding_proof` is selected, both member
   lights are listed, and the Shapes slot is visible without shape buttons until
   a light is selected.
7. Select `Living Room Ceiling Lights`, then click `Dim accent`. It should expose
   Undo / Cancel / Save, keep the edit scoped to the selected light, and show
   points equivalent to a 45% cap.
8. Click Save, then reload `/lightener-editor`. Verify the card is clean
   (`dirty=false`) and the saved curve persisted. A quick backend check is
   `config/.storage/core.config_entries`; the ceiling light should include
   brightness points `1 -> 1`, `25 -> 8`, `50 -> 20`, and `100 -> 45`.

Useful proof artifacts:

- Browser snapshots of provider search, selected member lights, setup success,
  first editor load, after preset click, and after route reload.
- A screenshot of the setup success dialog and editor after the first save.
- The HA log lines for `lightener.ws.list_entities`, `lightener.ws.get_curves`,
  and `lightener.ws.save_curves.success`.

Known traps:

- If the HA UI hangs on "Loading data", do not debug Lightener first. Check the
  extra runtime dependency section below and grep the `scripts/develop` log for
  `ModuleNotFoundError` or `handle_get_services`.
- Before the first Lightener config entry exists, `lightener/*` websocket commands
  are not registered. That absence is expected; create a config entry through HA.
- HA may emit a generic frontend console error while routing. Treat Lightener's
  websocket logs, UI state, and `core.config_entries` persistence as the stronger
  evidence unless the console error names Lightener code.

### Critical: extra runtime deps the dev UI needs (not in requirements.txt)

The HA web UI calls the `get_services` websocket command on load. HA does **not**
auto-install its built-in integrations' Python requirements in this venv, so if a
default integration's module can't be imported, `get_services` crashes and the
**frontend hangs forever on "Loading data"** (backend otherwise looks healthy).
These packages (matching HA 2026.2.x manifests) are installed into `.venv` by the
update script / baked into the snapshot and must remain present:
`PyTurboJPEG==1.8.0`, `hassil`, `home-assistant-intents`, `home-assistant-frontend`,
`mutagen`, `av`, `ha-ffmpeg`, `pycountry`, `radios`, `pymicro-vad`, `pyspeex-noise`.
If the UI ever hangs on "Loading data", grep the `scripts/develop` log for
`ModuleNotFoundError` / `handle_get_services` and install the missing module.

- `PyTurboJPEG` requires the system lib `libturbojpeg` (apt; on Ubuntu Noble the
  package is `libturbojpeg`, not `libturbojpeg0`). It is baked into the snapshot.
  Use `PyTurboJPEG==1.8.0` (2.x needs libjpeg-turbo 3.0+, Noble ships 2.1.x).
- `pymicro-vad` / `pyspeex-noise` are compiled from source and must build with
  gcc/g++ (`CC=gcc CXX=g++`); the default `/usr/bin/c++` is clang++ here and fails
  to find libstdc++ headers (`'cstddef' file not found`).

### mypy caveat

`.venv/bin/mypy custom_components/lightener_studio/` reports one error inside HA's own
`homeassistant/config_entries.py` ("Type parameter defaults are only supported in
Python 3.13 and greater"). This is an environment artifact: HA is installed in the
venv and uses 3.13-only syntax, while the project targets py312. CI runs mypy
**without** HA installed (`ignore_missing_imports`), so it passes. The project's
own code is clean — verify with `.venv/bin/mypy --follow-imports=skip custom_components/lightener_studio/`.

### Misc

- `pre-commit install --install-hooks` fails here ("Cowardly refusing … with
  core.hooksPath set"); pre-commit hooks are not needed for dev/test.
- Use `scripts/test-python` (or `source .env.workspace` for a `pytest` wrapper),
  not a bare global `pytest`.
