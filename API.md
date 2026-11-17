# WebSocket API

The card and sidebar panel talk to the integration over these commands. All require an authenticated
Home Assistant connection; write commands additionally require an admin user.

| Command | Params | Auth | Purpose |
|---|---|---|---|
| `lightener/get_curves` | `entity_id` | any user | Read per-light brightness curves. Complete admin reads also return `config_entry_id`, `revision` and `capabilities.guarded_curve_save: 1`. |
| `lightener/list_entities` | — | any user | List available Lightener Studio groups (used by the sidebar panel). |
| `lightener/list_candidate_lights` | `entity_id` | admin | List lights eligible to join the group, plus its current members (used by the Edit lights dialog). |
| `lightener/save_curves` | `entity_id`, `expected_revision`, `curves` (dict of edited members only) | admin | Save against the complete loaded group revision; return a committed `{status, config_entry_id, revision, entities}` snapshot. A stale baseline returns `conflict` without writing. |
| `lightener/set_controlled_lights` | `entity_id`, `controlled_entity_ids` (list), `observed_controlled_entity_ids` (list) | admin | Replace a group's controlled lights in one optimistic, transactional update. |
| `lightener/add_light` | `entity_id`, `controlled_entity_id`, `preset` (optional) | admin | Legacy single-light add, superseded by `set_controlled_lights` and retained for cached bundles. |
| `lightener/remove_light` | `entity_id`, `controlled_entity_id` | admin | Legacy single-light remove, superseded by `set_controlled_lights`. |
| `lightener/resolve_handoff` | `token` | admin | Resolve a previously issued setup-link token to its exact group. Retained for links from older versions. |

## Candidate metadata v1

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

## Version skew and invalid metadata

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

## Membership writes and stable errors

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
queue on one lock. A waiting curve save checks its `expected_revision` against
the complete committed group after that wait. If any saved member or member data
changed, it returns `conflict` without writing, including for an empty patch.
Membership changes retain their existing observation checks. A guarded read waits
for apply or rollback to finish, and each successful curve save returns its own
committed snapshot. Only edited members' brightness fields are patched; untouched
raw shapes and other member fields stay unchanged.

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

## Reading curves

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
