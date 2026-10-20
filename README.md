<p align="center">
  <img src="https://raw.githubusercontent.com/florianhorner/lightener-studio/master/.github/assets/social-preview.png" alt="Lightener Studio — a visual brightness-curve editor for Home Assistant" width="820" />
</p>

<p align="center">
  Shape how each light in a Home Assistant room responds to brightness — by hand, previewed live on your real lights. Save when it looks right.
</p>

<p align="center">
  <a href="https://florianhorner.github.io/lightener-studio/"><img alt="Try the live demo — no install needed" src="https://img.shields.io/badge/▶%20Try%20the%20live%20demo-no%20install%20needed-2563eb?style=for-the-badge" /></a>
  &nbsp;
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=florianhorner&repository=lightener-studio&category=integration"><img alt="Open Lightener Studio in HACS" src="https://my.home-assistant.io/badges/hacs_repository.svg" /></a>
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
  <a href="https://github.com/florianhorner/lightener-studio/releases/latest"><img alt="Stable release" src="https://img.shields.io/github/release/florianhorner/lightener-studio.svg?color=2563eb" /></a>
  <a href="https://github.com/hacs/default/pull/8892"><img alt="HACS default repository" src="https://img.shields.io/badge/HACS-Default-2563eb.svg" /></a>
  <a href="https://github.com/florianhorner/lightener-studio/blob/master/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-64748b.svg" /></a>
</p>

---

## What it does

Lightener Studio lets one control drive many lights at once, with a visual editor for how each light responds as you dim the group. Tame an overpowering accent lamp while the ceiling lights brighten, or balance bulbs that respond differently to the same brightness setting. You drag the shape; the room follows. No YAML, no typing number pairs by hand.

<p align="center">
  <img src="https://raw.githubusercontent.com/florianhorner/lightener-studio/master/.github/assets/lightener-curve-editor-demo.gif" alt="The Lightener Studio curve editor in action" width="760" />
</p>

> Built on the [Lightener](https://github.com/fredck/lightener) integration by @fredck, extended for the visual editor (the WebSocket commands the card needs, plus config-flow and state-handling hardening). Upstream MIT license intact.

## Highlights

- **Drag points** on the graph to shape each light's brightness response.
- **Watch room react** — let your real lights follow edits and the **Room brightness** slider. With preview off, the slider only explores the graph. Lights ease smoothly where they support transitions and restore when preview ends.
- **Try brightness** — drag the scrubber to see each light's brightness; a vertical indicator and dots track on the graph.
- **Shapes** — Equal brightness, Dim accent, Late starter, Night mode, applied to the selected light. Undo changes before saving.
- **Sidebar panel** — pick a Lightener Studio group and edit its lights' shapes without adding a dashboard card first.
- **Colorblind-accessible** — dash patterns and shape markers distinguish curves without relying on color.
- **Keyboard and mobile friendly** — arrow keys on the scrubber, Ctrl+S to save, Ctrl+Z to undo, 44px touch targets, long-press to delete.
- **Works with one light or a whole room** — legend rows and curve labels truncate cleanly at any width; non-admins see curves read-only.

## Installing

Requires Home Assistant 2024.8.0 or newer, [HACS](https://www.hacs.xyz/docs/use/), and a Home Assistant administrator account. Your lights should already work in Home Assistant. Start with two dimmable lights to compare their response; one light is supported too.

### Find and download Lightener Studio

1. Open HACS and search for **Lightener Studio**. Choose the **Integration** from `florianhorner/lightener-studio`. The original **Lightener** from `fredck/lightener` is a separate listing.
2. Download the latest stable release offered for Lightener Studio, then **restart Home Assistant**.
3. Continue with [Configure your first group](#configure-your-first-group) below. Downloading the files does not create a group.

Lightener Studio was [added to the HACS default list on 18 October 2026](https://github.com/hacs/default/pull/8892). Catalog updates can take time to reach a client; if search does not find it, see [HACS discovery troubleshooting](docs/TROUBLESHOOTING.md#lightener-studio-is-missing-from-hacs-search).

[![Open Lightener Studio in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=florianhorner&repository=lightener-studio&category=integration)

The badge opens the repository in HACS. If HACS does not know it yet, it can offer to add it; downloading and restarting are still separate steps.

**Fallback if the catalog listing is unavailable:** in HACS, open the three-dot menu → **Custom repositories**, add `https://github.com/florianhorner/lightener-studio` as an **Integration**, then download Lightener Studio and restart Home Assistant. This fallback does not require installing the original Lightener integration.

<a id="create-your-first-group"></a>

### Configure your first group

1. Open **Settings → Devices & Services → Add Integration**, search for **Lightener Studio**, and select it. You can also [open the setup flow directly](https://my.home-assistant.io/redirect/config_flow/?domain=lightener_studio).
2. Give the group a recognizable name, such as **Living Room**. Leave **Narrow by area** empty for your first group to see all your lights.
3. Under **Lights to control**, choose the lights that should respond together. When you dim the group, its lights initially follow the group's brightness.
4. In the success dialog, change the device name or area if needed, then choose **Finish**. If you leave them unchanged, the button says **Skip and finish**.
5. Open **Settings > Devices & Services > Lightener Studio** and choose **Configure** beside your group. This opens that group's editor at `/lightener-editor`.

To return later, use **Configure** again or open **Lightener Studio** from the Home Assistant sidebar and select your group by name. **Configure** also works when the sidebar item is hidden. These routes are available in v2.17.3 and v2.18.0-beta.1. No dashboard card or YAML is needed.

### Save your first curve

Try this with a lamp that overpowers the rest of the room:

1. In **Lights**, select that lamp. Under **Shapes**, choose **Dim** (full name **Dim accent**). Its curve now rises gently and caps near 45%; only that lamp's curve changes. You can drag points to fine-tune it, but the starting shape is ready to save as it is.
2. To see the effect on your real lights, explicitly enable **Watch room react**, then move **Room brightness**. Compare the lamp with the other lights. This step is optional; leaving preview off lets you inspect the graph without changing the room.
3. Choose **Save** and wait for the saved confirmation. In v2.17.3 and v2.18.0-beta.1, the button says **Save this room** while preview is active. Saving keeps the brightness curve for future use. If you were watching the room, saving also ends that temporary preview and restores the earlier light levels; it does not hold the room at the preview level.
4. Reload the page, select the same group if needed, and confirm the lamp's curve is still there. Use the new group's normal Home Assistant brightness control in daily use: the member lights now follow their saved curves.

**Restore lights** (**Put it back** in v2.17.3 and v2.18.0-beta.1) ends a live preview without discarding curve edits. **Cancel** discards unsaved edits. Different bulbs can still have different physical brightness ranges; these shapes do not measure or calibrate their minimum brightness.

**Unreleased onboarding changes:** The device page gains a **Visit** action that opens its group's editor. The **?** button beside **Brightness shapes**, labeled **Brightness tips**, opens help when you enter from the sidebar or return later. The save button says **Save** whether preview is on or off. These changes are not in v2.17.3 or v2.18.0-beta.1; use **Configure** or the sidebar with those releases.

Need help? See recovery for [missing lights](docs/TROUBLESHOOTING.md#no-lights-to-select), [a missed or expired editor link](docs/TROUBLESHOOTING.md#the-editor-link-expired-or-opened-the-wrong-group), [a group still starting](docs/TROUBLESHOOTING.md#the-new-group-is-still-starting), or [a failed save](docs/TROUBLESHOOTING.md#saving-did-not-finish).

### Optional dashboard card and beta motion

Prefer editing from a dashboard? The card script loads automatically on every dashboard (storage- and YAML-mode alike — no resource setup needed). On Home Assistant 2026.6+, picking a Lightener Studio group in the card picker suggests Lightener Studio under **Community**. Or add a card manually to any view:

```yaml
type: custom:lightener-curve-card
entity: light.your_lightener_device
```

Optional motion is off by default. Turn it on for one card with a `joy` key:

> **Beta feature:** As of 18 October 2026, the latest stable release is v2.17.3 and the latest prerelease is v2.18.0-beta.1. The `joy` options below require a v2.18.0 beta or a later release containing them; they are absent from v2.17.3. HACS default-list inclusion does not enable beta updates. Check the [releases page](https://github.com/florianhorner/lightener-studio/releases) before choosing a prerelease.

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

Removing Lightener Studio removes the integration and the groups it created. Your underlying lights and their devices are untouched, and nothing else in your Home Assistant config is modified. (Dashboard cards you added yourself will show "custom element doesn't exist" after removal, like any uninstalled custom card, so delete them from the dashboard.)

## Updating

Home Assistant keys integrations by domain and runs their Python at startup, so **installing Lightener Studio, and any release that changes backend behavior, still needs a Home Assistant restart.** HACS shows its usual "restart to finish" prompt because Lightener Studio is a HACS integration.

Frontend-only releases (the editor panel and the curve card) are served from stable URLs, so they do not require a restart: **update in HACS, then refresh the browser.** If the old editor still shows, try another full page reload; switching sidebar panels is not a reload. Cache state and duplicate resources can require further recovery, so there is no guaranteed refresh count. Follow the [version and cache checks](docs/TROUBLESHOOTING.md#diagnostic-check-the-served-bundle-and-active-card) if it still looks old.

HACS can display the README from your installed release, or the latest stable release before installation. Instructions corrected on `master` may therefore differ from those shown inside HACS until a release includes them. Use [these installation instructions](https://github.com/florianhorner/lightener-studio#installing) for the current guide; existing release tags are not rewritten.

## WebSocket API

The card and sidebar panel talk to the integration over these commands. All require an authenticated
Home Assistant connection; write commands additionally require an admin user.

| Command | Params | Auth | Purpose |
|---|---|---|---|
| `lightener/get_curves` | `entity_id` | any user | Read a group's per-light brightness curves. |
| `lightener/list_entities` | — | any user | List available Lightener Studio groups (used by the sidebar panel). |
| `lightener/list_candidate_lights` | `entity_id` | admin | List lights eligible to join the group, plus its current members (used by the Edit lights dialog). |
| `lightener/save_curves` | `entity_id`, `curves` (dict) | admin | Write a group's brightness curves. |
| `lightener/set_controlled_lights` | `entity_id`, `controlled_entity_ids` (list), `observed_controlled_entity_ids` (list) | admin | Replace a group's controlled lights in one optimistic, transactional update. |
| `lightener/add_light` | `entity_id`, `controlled_entity_id`, `preset` (optional) | admin | Legacy single-light add, superseded by `set_controlled_lights` and retained for cached bundles. |
| `lightener/remove_light` | `entity_id`, `controlled_entity_id` | admin | Legacy single-light remove, superseded by `set_controlled_lights`. |
| `lightener/resolve_handoff` | `token` | admin | Resolve a previously issued setup-link token to its exact group. Retained for links from older versions. |

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
| `not_found` | Covers three cases. A submitted member ID no longer resolves, so refresh candidates and correct it. Or the addressed Lightener Studio group is gone, or its config entry is. In the last two the group itself no longer exists, so close the editor. |
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

`entity_id` is the Lightener Studio group; `controlled_entity_id` is a member light.
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
