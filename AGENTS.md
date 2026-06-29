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
