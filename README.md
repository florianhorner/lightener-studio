<p align="center">
  <img src="https://raw.githubusercontent.com/florianhorner/lightener-studio/master/.github/assets/social-preview.png" alt="Lightener Studio — a visual brightness-curve editor for Home Assistant" width="820" />
</p>

<p align="center">
  Shape how each light in a Home Assistant room responds to brightness — by hand, previewed live on your real lights. Save when it looks right.
</p>

<p align="center">
  <a href="https://florianhorner.github.io/lightener-studio/"><img alt="Try the live demo — no install needed" src="https://img.shields.io/badge/▶%20Try%20the%20live%20demo-no%20install%20needed-2563eb?style=for-the-badge" /></a>
  &nbsp;
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=florianhorner&repository=lightener-studio&category=integration"><img alt="Add to my Home Assistant" src="https://my.home-assistant.io/badges/hacs_repository.svg" /></a>
</p>

<p align="center">
  <sub>Tell us what your lights did when you turned the dial — <a href="https://github.com/florianhorner/lightener-studio/blob/master/docs/OPEN-ROOM-LAB.md"><strong>Open Room Lab</strong></a></sub>
</p>

<p align="center">
  <a href="#what-it-does">What it does</a> ·
  <a href="#highlights">Highlights</a> ·
  <a href="#installing">Install</a> ·
  <a href="#websocket-api">API</a> ·
  <a href="https://github.com/florianhorner/lightener-studio/blob/master/CONTRIBUTING.md">Contribute</a>
</p>

<p align="center">
  <a href="https://github.com/florianhorner/lightener-studio/releases"><img alt="Release" src="https://img.shields.io/github/release/florianhorner/lightener-studio.svg?include_prereleases&color=2563eb" /></a>
  <a href="https://github.com/hacs/integration"><img alt="HACS Custom" src="https://img.shields.io/badge/HACS-Custom-2563eb.svg" /></a>
  <a href="https://github.com/florianhorner/lightener-studio/blob/master/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-64748b.svg" /></a>
</p>

---

## What it does

Lightener lets one control drive many lights at once. Lightener Studio adds the missing piece: a visual editor for *how* each light reacts as you turn the group up and down. Pull the accent lamp down so it stays a soft glow at low levels, let the ceiling lights ramp faster, give the corner lamp a dim floor so it never drops to black. You drag the shape; the room follows. No YAML, no typing number pairs by hand.

<p align="center">
  <img src="https://raw.githubusercontent.com/florianhorner/lightener-studio/master/.github/assets/lightener-curve-editor-demo.gif" alt="The Lightener Studio curve editor in action" width="760" />
</p>

> Built on the [Lightener](https://github.com/fredck/lightener) integration by @fredck, extended for the visual editor (the WebSocket commands the card needs, plus config-flow and state-handling hardening). Upstream MIT license intact.

## Highlights

- **Drag control points** on smooth curves to shape each light's brightness response.
- **Live light preview** — **Watch room react** pushes real brightness to your lights while you shape, and the scrubber pushes live brightness too. Lights ease smoothly between levels where they support transitions, and restore automatically when you stop.
- **Brightness scrubber with graph sync** — drag to preview every light's output at any level; a vertical indicator and per-curve dots track on the graph.
- **One-click presets** — Equal brightness, Dim accent, Late starter, Night mode, applied to one light or all, fully undoable.
- **Sidebar panel** — pick a Lightener group and edit curves without adding a dashboard card first.
- **Colorblind-accessible** — dash patterns and shape markers distinguish curves without relying on color.
- **Keyboard and mobile friendly** — arrow keys on the scrubber, Ctrl+S to save, Ctrl+Z to undo, 44px touch targets, long-press to delete.
- **Scales from 2 to 20+ lights** — legend rows and curve labels truncate cleanly at any width; non-admins see curves read-only.

## Installing

Requires Home Assistant 2024.8.0 or newer.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=florianhorner&repository=lightener-studio&category=integration)

The badge adds the repository in HACS. Then **install Lightener Studio**, **restart Home Assistant**, and open the **Lightener Studio** panel from the sidebar (registered automatically at `/lightener-editor`) — pick a Lightener group and start shaping curves, no dashboard card required.

Or add it manually:

1. In HACS, go to the three-dot menu → **Custom repositories**
2. Add `florianhorner/lightener-studio` as an Integration
3. Search for "Lightener Studio" and install it
4. Restart Home Assistant
5. Open the **Lightener Studio** panel from the Home Assistant sidebar (registered automatically at `/lightener-editor`). Pick a Lightener group and start shaping curves — no dashboard card required.

Prefer editing from a dashboard? The card script loads automatically on every dashboard (storage- and YAML-mode alike — no resource setup needed). On Home Assistant 2026.6+, picking a Lightener light in the card picker suggests Lightener Studio under **Community**. Or add a card manually to any view:

```yaml
type: custom:lightener-curve-card
entity: light.your_lightener_device
```

Optional motion is off by default. Turn it on for one card with a `joy` key:

> **Not yet released:** The `joy` options below are on the development branch, but are not included in the latest published release, v2.17.3. If you installed through HACS, wait for a release that includes them before using this example.

```yaml
type: custom:lightener-curve-card
entity: light.your_lightener_device
joy:
  settle: true # a point you drag and release overshoots slightly, then settles
  diagonal: true # a faint diagonal guide; the diagonal, 0% or 100% line flashes when a dragged point lands on it
  ripple: true # choosing a shape redraws the curve into it point by point, from left to right
  draw_in: true # lights added with Edit lights draw in from left to right, then the selected light's points pop into view
```

This works on dashboard cards; the sidebar panel keeps motion off. Draw-in waits until the graph is visible and reveals the undimmed span; the portion past the scrubber stays dim. Lights that draw in are ready to edit at once, and a press or key press anywhere in the card ends a running draw-in. With reduced motion turned on in your operating system, settle, ripple and draw-in stay off and no line flashes; the diagonal guide stays, and so does the short tap on phones that can vibrate.

> If you previously added `/lightener/lightener-curve-card.js` as a Lovelace resource by hand, remove it (Settings → Dashboards → Resources) — the integration now loads the card itself, and the leftover resource just double-loads the module.

Removing Lightener Studio removes the integration and the grouped Lightener entities it created. Your underlying lights and their devices are untouched, and nothing else in your Home Assistant config is modified. (Dashboard cards you added yourself will show "custom element doesn't exist" after removal, like any uninstalled custom card, so delete them from the dashboard.)

## Updating

Home Assistant keys integrations by domain and runs their Python at startup, so **installing Lightener Studio, and any release that changes backend behavior, still needs a Home Assistant restart.** HACS shows its usual "restart to finish" prompt because Lightener Studio is a HACS integration.

Frontend-only releases (the editor panel and the curve card) are served from stable URLs, so they no longer need a restart: **update in HACS, then refresh the browser.** If the old editor still shows after one refresh, refresh once more — Home Assistant's frontend caches the previous bundle and serves the new one on the following load. "Refresh" means a full page reload, not switching sidebar panels.

## WebSocket API

The card and sidebar panel talk to the integration over these commands. All require an authenticated
Home Assistant connection; write commands additionally require an admin user.

| Command | Params | Auth | Purpose |
|---|---|---|---|
| `lightener/get_curves` | `entity_id` | any user | Read a group's per-light brightness curves. |
| `lightener/list_entities` | — | any user | List available Lightener groups (used by the sidebar panel). |
| `lightener/list_candidate_lights` | `entity_id` | admin | List lights eligible to join the group, plus its current members (used by the Edit lights dialog). |
| `lightener/save_curves` | `entity_id`, `curves` (dict) | admin | Write a group's brightness curves. |
| `lightener/set_controlled_lights` | `entity_id`, `controlled_entity_ids` (list), `observed_controlled_entity_ids` (list) | admin | Replace a group's controlled lights in one optimistic, transactional update. |
| `lightener/add_light` | `entity_id`, `controlled_entity_id`, `preset` (optional) | admin | Legacy single-light add, superseded by `set_controlled_lights` and retained for cached bundles. |
| `lightener/remove_light` | `entity_id`, `controlled_entity_id` | admin | Legacy single-light remove, superseded by `set_controlled_lights`. |
| `lightener/resolve_handoff` | `token` | admin | Exchange a config-flow handoff token for the new group's editor URL. |

### Candidate metadata v1

`lightener/list_candidate_lights` is the authoritative read for the Edit lights
dialog. From the browser console while logged into Home Assistant:

```js
const hass = document.querySelector("home-assistant").hass;
const candidates = await hass.callWS({
  type: "lightener/list_candidate_lights",
  entity_id: "light.my_lightener_group",
});
console.log(candidates);
```

A version-1 response has this shape:

```json
{
  "capabilities": {
    "candidate_state_metadata": 1
  },
  "observed_controlled_entity_ids": [
    "light.ceiling",
    "light.retired_lamp"
  ],
  "lights": [
    {
      "entity_id": "light.ceiling",
      "name": "Ceiling",
      "available": true,
      "area_id": "living_room",
      "area_name": "Living room",
      "hidden": false,
      "disabled": false,
      "missing": false
    },
    {
      "entity_id": "light.utility_lamp",
      "name": "Utility lamp",
      "available": false,
      "area_id": "garage",
      "area_name": "Garage",
      "hidden": true,
      "disabled": true,
      "missing": false
    },
    {
      "entity_id": "light.retired_lamp",
      "name": "Retired lamp",
      "available": false,
      "area_id": null,
      "area_name": null,
      "hidden": false,
      "disabled": false,
      "missing": true
    }
  ]
}
```

Version 1 is all-or-nothing:

- `capabilities.candidate_state_metadata` is the integer `1`.
- Every light owns boolean `hidden`, `disabled`, and `missing` fields. `false` is
  explicit; omission is not a default.
- `hidden` and `disabled` come from Home Assistant's entity registry.
  `available` reports whether the current state exists and is not
  `unavailable`.
- `missing` is true only for a member that was in the group when the dialog
  opened and now has neither a registry entry nor a state. A registry-only light
  is unavailable, not missing; a state-only light is an ordinary candidate.
- Current and stale members stay in `lights`, even when hidden, disabled,
  unavailable, or missing. Overlapping states are valid and their labels
  combine.

The picker defaults are deliberately conservative:

| Candidate at dialog open | Default visibility | May be selected? |
|---|---|---|
| Ordinary or unavailable | visible | yes |
| Hidden, disabled, or both; not a current member | hidden until **Show hidden & disabled** | hidden: yes; disabled: no |
| Hidden, disabled, unavailable, or missing current member | visible | may be retained, removed, and reselected |

**Current group only (N)** uses the immutable membership snapshot from dialog
open. Unchecking a current member does not make its row disappear, and a newly
checked candidate remains in the All view. Search, area, disclosure, and scope
filters change only what is visible; they never change the submitted member
set.

### Version skew and invalid metadata

| Frontend | Backend response | Behavior |
|---|---|---|
| Current | v1 marker and complete boolean fields | Full exceptional-state filtering and labels |
| Current | Marker absent | Expected legacy mode: all candidates remain visible; no disclosure control or console warning |
| Current | Marker unknown/malformed, or any v1 row incomplete | Whole-response legacy mode; all candidates remain visible and one deduplicated developer-console warning explains the fallback |
| Prior stable | Current v1 backend | Unknown response fields are ignored; existing membership behavior remains |

The fallback is for visibility only. The backend remains authoritative for
writes, including requests from cached or prior frontend bundles. Payload mocks
are contract simulation; a binary-skew claim must name the immutable frontend
tag and commit that were actually loaded.

### Membership writes and stable errors

Use writes only as an administrator and only against a disposable group: the
following call changes that group's controlled lights.

```js
const hass = document.querySelector("home-assistant").hass;
const snapshot = await hass.callWS({
  type: "lightener/list_candidate_lights",
  entity_id: "light.membership_proof",
});

await hass.callWS({
  type: "lightener/set_controlled_lights",
  entity_id: "light.membership_proof",
  controlled_entity_ids: [
    ...snapshot.observed_controlled_entity_ids,
    "light.living_room_ceiling_leds",
  ],
  observed_controlled_entity_ids: snapshot.observed_controlled_entity_ids,
});
```

The batch command returns `entities`, `added_entity_ids`, and
`removed_entity_ids`. It preserves retained members before newly added members
and rejects stale observations rather than overwriting a concurrent edit.

Curve saves (`lightener/save_curves`) and membership changes on the same group
queue on one lock. Whichever arrives second waits until the first has written
the group and applied its change, then works from the result, so a rollback on
one side cannot undo the other's write.

| Error code | Meaning and recovery |
|---|---|
| `conflict` | The group changed after the client loaded it. Reopen Edit lights and retry from the new snapshot. |
| `disabled_entity` | A newly added entity is disabled. Enable it under **Settings → Devices & services → Entities**, reopen Edit lights, and retry. |
| `empty_selection` / `duplicate` | The desired member list violates the batch-selection contract. Correct the payload and retry. |
| `not_a_light` / `self_reference` / `recursive_lightener` | A submitted ID is not eligible as a controlled light. Refresh candidates and correct the ID. |
| `not_found` | Covers three cases. A submitted member ID no longer resolves, so refresh candidates and correct it. Or the addressed Lightener entity is gone, or its config entry is. In the last two the group itself no longer exists, so close the editor. |
| `reload_failed` / `rollback_reload_failed` | Home Assistant could not apply or fully restore the runtime. Keep the dialog state, inspect integration logs, and retry only after the runtime is healthy. |

`too_many` is not reachable on this command. The websocket schema bounds
`controlled_entity_ids` at the same 100-entry limit the handler enforces, so
Home Assistant rejects an oversized list with its own generic schema error
before `MAX_CONTROLLED_LIGHTS` is consulted. The code stays live on the two
paths that build the member list server-side, where no schema bound applies:
`lightener/add_light` appending to a group already at the limit, and the
config/options flow.

`disabled_entity` is checked again inside the group's update lock, so a light
disabled after the dialog loaded is still rejected. The exact backend message
is intentionally actionable for cached clients that do not know the new code:

> Could not add `{entity_id}` because it is disabled in Home Assistant. Enable it under Settings → Devices & services → Entities, reopen Edit lights, and try again.

The current frontend presents friendly recovery, preserves pending selection
and filters, focuses the error, and offers **Try again**. Home Assistant's
config/options flow errors are localized separately. A prior stable frontend
displays the raw backend message above.

### Reading curves

For comparison, this authenticated read works for any user:

```js
const hass = document.querySelector("home-assistant").hass;
const curves = await hass.callWS({
  type: "lightener/get_curves",
  entity_id: "light.my_lightener_group",
});
console.log(curves);
```

`entity_id` is the Lightener group; `controlled_entity_id` is a member light.
`controlled_entity_ids` is the full desired member set and `observed_controlled_entity_ids` is the set the client last loaded — the backend rejects the write as a conflict when they diverge, so concurrent edits can't silently clobber each other.

## Documentation

- [docs/OPEN-ROOM-LAB.md](docs/OPEN-ROOM-LAB.md) — where things stand today, and how to report what your room did with a curve
- [CHANGELOG.md](CHANGELOG.md) — release history
- [CONTRIBUTING.md](CONTRIBUTING.md) — local setup, tooling, and workflow
- [SECURITY.md](SECURITY.md) — vulnerability reporting policy
- [DESIGN.md](DESIGN.md) — UI tokens, patterns, and accessibility baseline
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — upgrade and caching recovery guide

## Local Development

```sh
scripts/setup-python   # Python venv + deps
scripts/test-python    # backend pytest
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow including `scripts/ha-sync` for direct deployment to a test HA instance.
