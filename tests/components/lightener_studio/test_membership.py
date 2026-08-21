"""Tests for transactional controlled-light membership."""

import asyncio
import json
from collections.abc import Awaitable, Callable
from copy import deepcopy
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.entity_registry import (
    RegistryEntryDisabler,
    RegistryEntryHider,
)
from homeassistant.helpers.entity_registry import async_get as async_get_entity_registry
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lightener_studio.config_flow import LightenerConfigFlow
from custom_components.lightener_studio.const import (
    DOMAIN,
    MEMBERSHIP_ERROR_DISABLED_ENTITY,
)
from custom_components.lightener_studio.membership import (
    MAX_CONTROLLED_LIGHTS,
    MembershipError,
    MembershipUpdate,
    _membership_lock,
    async_set_controlled_lights,
    validate_membership_selection,
)

CANDIDATE_FIXTURE_PATH = (
    Path(__file__).resolve().parents[2] / "fixtures" / "candidate_lights_v1.json"
)
CANDIDATE_CONTRACT = json.loads(CANDIDATE_FIXTURE_PATH.read_text(encoding="utf-8"))
DISABLED_ENTITY_ERROR = CANDIDATE_CONTRACT["errors"]["disabled_entity"]
DISABLED_ENTITY_MESSAGE = DISABLED_ENTITY_ERROR["message_template"].replace(
    "{entity_id}", "light.test2"
)


def _membership_update_barrier() -> tuple[
    asyncio.Event, Callable[..., Awaitable[MembershipUpdate]]
]:
    """Signal when a websocket handler reaches the membership transaction."""
    entered = asyncio.Event()

    async def instrumented_update(*args: Any, **kwargs: Any) -> MembershipUpdate:
        entered.set()
        return await async_set_controlled_lights(*args, **kwargs)

    return entered, instrumented_update


async def _setup_lightener(hass: HomeAssistant, entities: dict) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        version=LightenerConfigFlow.VERSION,
        unique_id=str(uuid4()),
        data={"friendly_name": "Membership", "entities": entities},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _register_fixture_light(
    hass: HomeAssistant,
    entity_id: str,
    *,
    disabled: bool = False,
    hidden: bool = False,
) -> None:
    """Create one registry-backed light with optional exceptional state."""
    entity_registry = async_get_entity_registry(hass)
    entry = entity_registry.async_get_or_create(
        domain="light",
        platform="candidate_fixture",
        unique_id=entity_id,
        suggested_object_id=entity_id.removeprefix("light."),
    )
    assert entry.entity_id == entity_id
    if disabled or hidden:
        entity_registry.async_update_entity(
            entity_id,
            disabled_by=RegistryEntryDisabler.USER if disabled else None,
            hidden_by=RegistryEntryHider.USER if hidden else None,
        )


async def test_batch_update_preserves_payloads_and_reports_delta(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """One batch commit retains unknown data and adds new lights with Equal."""
    entry = await _setup_lightener(
        hass,
        {
            "light.test1": {
                "brightness": {"20": "30"},
                "future": {"nested": [1, 2, 3]},
            },
            "light.test2": {"brightness": {"100": "80"}},
        },
    )
    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries, "async_reload", new_callable=AsyncMock, return_value=True
    ) as reload_entry:
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test2", "light.test1"],
                "controlled_entity_ids": ["light.test_temp", "light.test1"],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is True
    assert result["result"]["added_entity_ids"] == ["light.test_temp"]
    assert result["result"]["removed_entity_ids"] == ["light.test2"]
    assert result["result"]["entities"] == {
        "light.test1": {
            "brightness": {"20": "30"},
            "future": {"nested": [1, 2, 3]},
        },
        "light.test_temp": {"brightness": {"1": "1", "100": "100"}},
    }
    assert dict(entry.data["entities"]) == result["result"]["entities"]
    reload_entry.assert_awaited_once_with(entry.entry_id)


async def test_batch_update_rejects_stale_observation_without_reload(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """An editor cannot overwrite a membership change it did not observe."""
    await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            "light.test2": {"brightness": {"100": "80"}},
        },
    )
    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries, "async_reload", new_callable=AsyncMock
    ) as reload_entry:
        await ws.send_json(
            {
                "id": 2,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1"],
                "controlled_entity_ids": ["light.test1", "light.test_temp"],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "conflict"
    reload_entry.assert_not_awaited()


async def test_batch_response_uses_confirmed_post_reload_entry_data(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """The client receives the entry data that exists after reload completes."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )

    async def confirm_reload(_entry_id: str) -> bool:
        confirmed = deepcopy(dict(entry.data))
        confirmed["entities"]["light.test2"]["confirmed"] = True
        hass.config_entries.async_update_entry(entry, data=confirmed)
        return True

    ws = await hass_ws_client(hass)
    with patch.object(hass.config_entries, "async_reload", side_effect=confirm_reload):
        await ws.send_json(
            {
                "id": 20,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1"],
                "controlled_entity_ids": ["light.test1", "light.test2"],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is True
    assert result["result"]["entities"]["light.test2"]["confirmed"] is True


async def test_batch_update_retains_stale_existing_member(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A missing old member remains selectable, while missing new IDs fail."""
    await _setup_lightener(
        hass,
        {"light.retired_but_kept": {"brightness": {"100": "33"}}},
    )
    ws = await hass_ws_client(hass)
    with patch.object(hass.config_entries, "async_reload", return_value=True):
        await ws.send_json(
            {
                "id": 3,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.retired_but_kept"],
                "controlled_entity_ids": ["light.retired_but_kept", "light.test1"],
            }
        )
        retained = await ws.receive_json()

    assert retained["success"] is True

    await ws.send_json(
        {
            "id": 4,
            "type": "lightener/set_controlled_lights",
            "entity_id": "light.membership",
            "observed_controlled_entity_ids": [
                "light.retired_but_kept",
                "light.test1",
            ],
            "controlled_entity_ids": ["light.retired_but_kept", "light.missing"],
        }
    )
    missing = await ws.receive_json()
    assert missing["success"] is False
    assert missing["error"]["code"] == "not_found"


async def test_batch_update_distinguishes_rollback_runtime_failure(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A failed compensating reload reports the degraded-runtime code."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    original = dict(entry.data)
    ws = await hass_ws_client(hass)
    with patch.object(hass.config_entries, "async_reload", side_effect=[False, False]):
        await ws.send_json(
            {
                "id": 5,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1"],
                "controlled_entity_ids": ["light.test1", "light.test2"],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "rollback_reload_failed"
    assert dict(entry.data) == original


async def test_batch_update_reports_reload_failed_and_restores_on_single_failure(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A failed reload with a healthy compensating reload restores data and
    reports the recoverable ``reload_failed`` code (not the degraded one)."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    original = dict(entry.data)
    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries, "async_reload", side_effect=[False, True]
    ) as reload_entry:
        await ws.send_json(
            {
                "id": 7,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1"],
                "controlled_entity_ids": ["light.test1", "light.test2"],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "reload_failed"
    # The membership write was rolled back and the compensating reload ran.
    assert dict(entry.data) == original
    assert reload_entry.call_count == 2


async def test_batch_update_rejects_empty_selection_without_reload(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """An empty membership set is rejected before any reload is attempted."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    original = dict(entry.data)
    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries, "async_reload", new_callable=AsyncMock
    ) as reload_entry:
        await ws.send_json(
            {
                "id": 8,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1"],
                "controlled_entity_ids": [],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "empty_selection"
    reload_entry.assert_not_awaited()
    assert dict(entry.data) == original


async def test_candidate_list_includes_area_and_current_stale_member(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """The dialog gets sortable area metadata and can retain stale members."""
    from homeassistant.helpers.area_registry import async_get as async_get_areas
    from homeassistant.helpers.entity_registry import async_get as async_get_entities

    area = async_get_areas(hass).async_create("Studio")
    async_get_entities(hass).async_update_entity("light.test1", area_id=area.id)
    await _setup_lightener(
        hass,
        {"light.retired_but_kept": {"brightness": {"100": "33"}}},
    )

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 6,
            "type": "lightener/list_candidate_lights",
            "entity_id": "light.membership",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True
    assert result["result"]["observed_controlled_entity_ids"] == [
        "light.retired_but_kept"
    ]
    by_id = {item["entity_id"]: item for item in result["result"]["lights"]}
    assert by_id["light.test1"]["area_name"] == "Studio"
    assert by_id["light.retired_but_kept"]["available"] is False
    assert by_id["light.retired_but_kept"]["missing"] is True


async def test_candidate_list_matches_shared_v1_state_fixture(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """The backend emits the complete, versioned candidate-state contract."""
    expected = CANDIDATE_CONTRACT

    for entity_id in (
        "light.disabled_new",
        "light.disabled_retained",
        "light.hidden",
        "light.hidden_disabled",
        "light.hidden_unavailable",
        "light.ordinary",
        "light.registry_only",
        "light.unavailable",
    ):
        _register_fixture_light(
            hass,
            entity_id,
            disabled=entity_id
            in {
                "light.disabled_new",
                "light.disabled_retained",
                "light.hidden_disabled",
            },
            hidden=entity_id
            in {
                "light.hidden",
                "light.hidden_disabled",
                "light.hidden_unavailable",
            },
        )

    for entity_id, state in (
        ("light.hidden", "on"),
        ("light.hidden_unavailable", STATE_UNAVAILABLE),
        ("light.ordinary", "on"),
        ("light.state_only", "on"),
        ("light.unavailable", STATE_UNAVAILABLE),
    ):
        attributes = {"friendly_name": 42} if entity_id == "light.state_only" else None
        hass.states.async_set(entity_id, state, attributes)

    await _setup_lightener(
        hass,
        {
            entity_id: {"brightness": {"100": "100"}}
            for entity_id in expected["observed_controlled_entity_ids"]
        },
    )

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 60,
            "type": "lightener/list_candidate_lights",
            "entity_id": "light.membership",
        }
    )
    response = await ws.receive_json()

    assert response["success"] is True
    result = response["result"]
    assert result["capabilities"] == expected["capabilities"]
    assert (
        result["observed_controlled_entity_ids"]
        == expected["observed_controlled_entity_ids"]
    )

    expected_by_id = {item["entity_id"]: item for item in expected["lights"]}
    actual_by_id = {item["entity_id"]: item for item in result["lights"]}
    test_harness_ids = {
        "light.test1",
        "light.test2",
        "light.test_onoff",
        "light.test_temp",
    }
    assert set(actual_by_id) == set(expected_by_id) | test_harness_ids
    assert {
        entity_id: actual_by_id[entity_id] for entity_id in expected_by_id
    } == expected_by_id
    assert actual_by_id["light.state_only"]["name"] == "light.state_only"
    assert all(isinstance(item["name"], str) for item in result["lights"])
    assert all(
        type(item[field]) is bool
        for item in result["lights"]
        for field in ("hidden", "disabled", "missing")
    )


async def test_candidate_list_resolves_registries_once_per_request(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Candidate serialization reuses one registry snapshot for every row."""
    await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    ws = await hass_ws_client(hass)

    with (
        patch(
            "custom_components.lightener_studio.websocket.async_get_entity_registry",
            wraps=async_get_entity_registry,
        ) as get_entity_registry,
        patch(
            "custom_components.lightener_studio.websocket.dr.async_get",
            wraps=dr.async_get,
        ) as get_device_registry,
        patch(
            "custom_components.lightener_studio.websocket.ar.async_get",
            wraps=ar.async_get,
        ) as get_area_registry,
    ):
        await ws.send_json(
            {
                "id": 66,
                "type": "lightener/list_candidate_lights",
                "entity_id": "light.membership",
            }
        )
        result = await ws.receive_json()

    assert result["success"] is True
    # One entity-registry resolution identifies the Lightener group; the other
    # serves every candidate row. Device and area registries are each hoisted.
    assert get_entity_registry.call_count == 2
    get_device_registry.assert_called_once_with(hass)
    get_area_registry.assert_called_once_with(hass)


async def test_membership_validation_reads_each_registry_entry_once(
    hass: HomeAssistant,
) -> None:
    """Validation resolves only new members, and each of those exactly once."""
    for entity_id in ("light.lookup_retained", "light.lookup_new"):
        _register_fixture_light(hass, entity_id)

    entity_registry = async_get_entity_registry(hass)
    registry_type = type(entity_registry)
    original_async_get = registry_type.async_get
    with patch.object(
        registry_type,
        "async_get",
        autospec=True,
        side_effect=original_async_get,
    ) as async_get_entry:
        validate_membership_selection(
            hass,
            "light.membership",
            {"light.lookup_retained": {"brightness": {"100": "100"}}},
            ["light.lookup_retained", "light.lookup_new"],
        )

    # A retained member short-circuits before any registry work, and the one new
    # member is resolved once for the recursion, disable, and existence checks.
    assert [call.args[1] for call in async_get_entry.call_args_list] == [
        "light.lookup_new",
    ]


async def test_too_many_is_handler_side_not_reachable_over_the_batch_command(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Pin README's claim about where `too_many` surfaces.

    The batch command's schema bounds the list at the same limit the handler
    enforces, so an oversized payload never reaches `MAX_CONTROLLED_LIGHTS`.
    Home Assistant answers with its own schema error instead. The check stays
    live for the paths that build the member list server-side.
    """
    oversized = [f"light.bulk_{index}" for index in range(MAX_CONTROLLED_LIGHTS + 1)]

    # Handler side: still the code the other paths get.
    with pytest.raises(MembershipError) as excinfo:
        validate_membership_selection(hass, "light.membership", {}, oversized)
    assert excinfo.value.code == "too_many"

    # Wire side: rejected earlier, and NOT as `too_many`.
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 66,
            "type": "lightener/set_controlled_lights",
            "entity_id": "light.membership",
            "observed_controlled_entity_ids": ["light.test1"],
            "controlled_entity_ids": oversized,
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] != "too_many"
    assert list(entry.data["entities"]) == ["light.test1"]


async def test_membership_validation_rejects_a_nested_lightener_group(
    hass: HomeAssistant,
) -> None:
    """A Lightener-platform light is rejected before it can nest a group."""
    entity_registry = async_get_entity_registry(hass)
    nested = entity_registry.async_get_or_create(
        domain="light",
        platform=DOMAIN,
        unique_id="nested-group",
        suggested_object_id="nested_group",
    )
    assert nested.entity_id == "light.nested_group"
    # A same-platform NON-light entity is rejected as not_a_light, not as
    # recursion. Note this does NOT pin the guard's `domain == "light"`
    # conjunct: RegistryEntry.domain is split_entity_id(entity_id)[0], so behind
    # the earlier startswith("light.") check that conjunct is always true.
    # It is harmless defence-in-depth, not a load-bearing condition.
    sibling_sensor = entity_registry.async_get_or_create(
        domain="sensor",
        platform=DOMAIN,
        unique_id="group-diagnostic",
        suggested_object_id="group_diagnostic",
    )
    assert sibling_sensor.entity_id == "sensor.group_diagnostic"

    with pytest.raises(MembershipError) as excinfo:
        validate_membership_selection(
            hass,
            "light.membership",
            {"light.test1": {"brightness": {"100": "100"}}},
            ["light.test1", "light.nested_group"],
        )

    assert excinfo.value.code == "recursive_lightener"

    with pytest.raises(MembershipError) as sensor_excinfo:
        validate_membership_selection(
            hass,
            "light.membership",
            {"light.test1": {"brightness": {"100": "100"}}},
            ["light.test1", "sensor.group_diagnostic"],
        )

    assert sensor_excinfo.value.code == "not_a_light"


async def test_membership_validation_retains_legacy_invalid_members(
    hass: HomeAssistant,
) -> None:
    """Members a v1 YAML group already holds never block an unrelated edit."""
    entity_registry = async_get_entity_registry(hass)
    nested = entity_registry.async_get_or_create(
        domain="light",
        platform=DOMAIN,
        unique_id="nested-group",
        suggested_object_id="nested_group",
    )
    assert nested.entity_id == "light.nested_group"
    _register_fixture_light(hass, "light.newcomer")
    existing = {
        # A v1 YAML migration could persist both a nested Lightener and a
        # non-light member; neither can be granted today.
        "light.nested_group": {"brightness": {"100": "100"}},
        "switch.legacy_relay": {"brightness": {"100": "100"}},
    }

    # Keeping both while adding a light is allowed...
    validate_membership_selection(
        hass,
        "light.membership",
        existing,
        ["light.nested_group", "switch.legacy_relay", "light.newcomer"],
    )
    # ...and so is dropping one of them.
    validate_membership_selection(
        hass,
        "light.membership",
        existing,
        ["light.nested_group"],
    )

    # Granting the same nested group to a Lightener that does not already hold
    # it is still rejected.
    with pytest.raises(MembershipError) as excinfo:
        validate_membership_selection(
            hass,
            "light.membership",
            {"light.newcomer": {"brightness": {"100": "100"}}},
            ["light.newcomer", "light.nested_group"],
        )

    assert excinfo.value.code == "recursive_lightener"


async def test_membership_validation_never_retains_a_self_reference(
    hass: HomeAssistant,
) -> None:
    """Retention cannot smuggle the group itself back into its own members."""
    with pytest.raises(MembershipError) as excinfo:
        validate_membership_selection(
            hass,
            "light.membership",
            {"light.membership": {"brightness": {"100": "100"}}},
            ["light.membership"],
        )

    assert excinfo.value.code == "self_reference"


async def test_legacy_remove_light_works_on_a_group_nesting_a_lightener(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """The legacy per-light path can still edit a v1-migrated nested group."""
    entity_registry = async_get_entity_registry(hass)
    nested = entity_registry.async_get_or_create(
        domain="light",
        platform=DOMAIN,
        unique_id="nested-group",
        suggested_object_id="nested_group",
    )
    entry = await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            nested.entity_id: {"brightness": {"100": "100"}},
        },
    )

    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries, "async_reload", new_callable=AsyncMock, return_value=True
    ):
        await ws.send_json(
            {
                "id": 70,
                "type": "lightener/remove_light",
                "entity_id": "light.membership",
                "controlled_entity_id": "light.test1",
            }
        )
        result = await ws.receive_json()

    assert result["success"] is True
    assert list(entry.data["entities"]) == [nested.entity_id]


async def test_batch_rejects_nested_lightener_group_without_mutation(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """The recursion guard surfaces over the wire and never mutates the entry."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    entity_registry = async_get_entity_registry(hass)
    nested = entity_registry.async_get_or_create(
        domain="light",
        platform=DOMAIN,
        unique_id="nested-group",
        suggested_object_id="nested_group",
    )

    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries, "async_reload", new_callable=AsyncMock
    ) as reload_entry:
        await ws.send_json(
            {
                "id": 64,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1"],
                "controlled_entity_ids": ["light.test1", nested.entity_id],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "recursive_lightener"
    assert list(entry.data["entities"]) == ["light.test1"]
    reload_entry.assert_not_awaited()


async def test_candidate_list_inherits_area_from_device(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A light with no entity-level area reports its device's area."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    area = ar.async_get(hass).async_create("Hallway")
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, "device-area-fixture")},
    )
    dr.async_get(hass).async_update_device(device.id, area_id=area.id)
    entity_registry = async_get_entity_registry(hass)
    inherited = entity_registry.async_get_or_create(
        domain="light",
        platform="candidate_fixture",
        unique_id="device-area-light",
        suggested_object_id="device_area_light",
        device_id=device.id,
    )
    assert inherited.area_id is None

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 65,
            "type": "lightener/list_candidate_lights",
            "entity_id": "light.membership",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True
    by_id = {item["entity_id"]: item for item in result["result"]["lights"]}
    assert by_id[inherited.entity_id]["area_id"] == area.id
    assert by_id[inherited.entity_id]["area_name"] == "Hallway"


async def test_batch_rejects_new_disabled_member_without_mutation(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Batch writes reject a disabled member with stable actionable detail."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    entity_registry = async_get_entity_registry(hass)
    entity_registry.async_update_entity(
        "light.test2", disabled_by=RegistryEntryDisabler.USER
    )

    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries, "async_reload", new_callable=AsyncMock
    ) as reload_entry:
        await ws.send_json(
            {
                "id": 61,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1"],
                "controlled_entity_ids": ["light.test1", "light.test2"],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"] == {
        "code": DISABLED_ENTITY_ERROR["code"],
        "message": DISABLED_ENTITY_MESSAGE,
    }
    assert DISABLED_ENTITY_ERROR["code"] == MEMBERSHIP_ERROR_DISABLED_ENTITY
    assert list(entry.data["entities"]) == ["light.test1"]
    reload_entry.assert_not_awaited()


async def test_initial_disabled_member_is_retainable_and_removable(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Persisted disabled members keep grandfathered retain/remove rights."""
    entry = await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            "light.test2": {"brightness": {"100": "80"}},
        },
    )
    entity_registry = async_get_entity_registry(hass)
    entity_registry.async_update_entity(
        "light.test1", disabled_by=RegistryEntryDisabler.USER
    )

    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries,
        "async_reload",
        new_callable=AsyncMock,
        return_value=True,
    ) as reload_entry:
        await ws.send_json(
            {
                "id": 62,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1", "light.test2"],
                "controlled_entity_ids": ["light.test1", "light.test2"],
            }
        )
        retained = await ws.receive_json()
        await ws.send_json(
            {
                "id": 63,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1", "light.test2"],
                "controlled_entity_ids": ["light.test2"],
            }
        )
        removed = await ws.receive_json()

    assert retained["success"] is True
    assert removed["success"] is True
    assert removed["result"]["removed_entity_ids"] == ["light.test1"]
    assert list(entry.data["entities"]) == ["light.test2"]
    assert reload_entry.await_count == 2


async def test_batch_rechecks_disabled_state_after_waiting_for_lock(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """An enabled-at-load light disabled while queued is rejected atomically."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    ws = await hass_ws_client(hass)
    lock = _membership_lock(hass, entry.entry_id)
    queued, instrumented_update = _membership_update_barrier()

    with (
        patch.object(
            hass.config_entries, "async_reload", new_callable=AsyncMock
        ) as reload_entry,
        patch(
            "custom_components.lightener_studio.websocket.async_set_controlled_lights",
            new=instrumented_update,
        ),
    ):
        await lock.acquire()
        try:
            await ws.send_json(
                {
                    "id": 64,
                    "type": "lightener/set_controlled_lights",
                    "entity_id": "light.membership",
                    "observed_controlled_entity_ids": ["light.test1"],
                    "controlled_entity_ids": ["light.test1", "light.test2"],
                }
            )
            await asyncio.wait_for(queued.wait(), timeout=5)

            async_get_entity_registry(hass).async_update_entity(
                "light.test2", disabled_by=RegistryEntryDisabler.USER
            )
        finally:
            lock.release()

        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == MEMBERSHIP_ERROR_DISABLED_ENTITY
    assert list(entry.data["entities"]) == ["light.test1"]
    reload_entry.assert_not_awaited()


async def test_legacy_add_light_rejects_disabled_member_with_stable_error(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """The compatibility add RPC cannot bypass disabled-member validation."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    async_get_entity_registry(hass).async_update_entity(
        "light.test2", disabled_by=RegistryEntryDisabler.USER
    )

    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries, "async_reload", new_callable=AsyncMock
    ) as reload_entry:
        await ws.send_json(
            {
                "id": 65,
                "type": "lightener/add_light",
                "entity_id": "light.membership",
                "controlled_entity_id": "light.test2",
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"] == {
        "code": DISABLED_ENTITY_ERROR["code"],
        "message": DISABLED_ENTITY_MESSAGE,
    }
    assert DISABLED_ENTITY_ERROR["code"] == MEMBERSHIP_ERROR_DISABLED_ENTITY
    assert list(entry.data["entities"]) == ["light.test1"]
    reload_entry.assert_not_awaited()


async def test_add_light_rejects_membership_that_changed_while_queued(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A legacy add whose membership changed after it snapshotted is rejected
    as a conflict instead of silently clobbering the concurrent write.

    Regression: ``ws_add_light`` used to pass ``observed=None``, which skipped
    the in-lock conflict check and rebuilt membership from the stale snapshot,
    dropping any member committed while the add was queued behind the lock.
    """
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    ws = await hass_ws_client(hass)
    lock = _membership_lock(hass, entry.entry_id)
    queued, instrumented_update = _membership_update_barrier()

    with (
        patch.object(
            hass.config_entries,
            "async_reload",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "custom_components.lightener_studio.websocket.async_set_controlled_lights",
            new=instrumented_update,
        ),
    ):
        # Hold the membership lock so the add handler snapshots current members
        # and then parks on the lock, exactly like a real op queued behind a
        # commit that is still reloading.
        await lock.acquire()
        try:
            await ws.send_json(
                {
                    "id": 1,
                    "type": "lightener/add_light",
                    "entity_id": "light.membership",
                    "controlled_entity_id": "light.new",
                }
            )
            await asyncio.wait_for(queued.wait(), timeout=5)

            # Simulate a concurrent commit landing while the add was queued.
            hass.config_entries.async_update_entry(
                entry,
                data={
                    **entry.data,
                    "entities": {
                        "light.test1": {"brightness": {"100": "100"}},
                        "light.other": {"brightness": {"100": "100"}},
                    },
                },
            )
        finally:
            lock.release()

        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "conflict"
    # The concurrent commit survived; the queued add did not clobber it.
    assert "light.other" in entry.data["entities"]
    assert "light.new" not in entry.data["entities"]


async def test_remove_light_forwards_observed_snapshot(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """remove_light forwards its pre-lock snapshot as the observed set for
    conflict safety, rather than passing ``None`` (regression)."""
    await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            "light.test2": {"brightness": {"100": "80"}},
        },
    )
    ws = await hass_ws_client(hass)
    update = MembershipUpdate(
        entities={"light.test1": {"brightness": {"100": "100"}}},
        added_entity_ids=[],
        removed_entity_ids=["light.test2"],
    )
    with patch(
        "custom_components.lightener_studio.websocket.async_set_controlled_lights",
        new_callable=AsyncMock,
        return_value=update,
    ) as mock_set:
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/remove_light",
                "entity_id": "light.membership",
                "controlled_entity_id": "light.test2",
            }
        )
        result = await ws.receive_json()

    assert result["success"] is True
    args = mock_set.await_args
    observed = (
        args.args[4]
        if len(args.args) > 4
        else args.kwargs.get("observed_controlled_entity_ids")
    )
    assert observed == ["light.test1", "light.test2"]


async def test_batch_update_rolls_back_when_the_reload_raises(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A reload that raises is treated exactly like one returning False: the
    membership write is rolled back and the recoverable code is reported."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    original = dict(entry.data)
    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries,
        "async_reload",
        side_effect=[RuntimeError("platform blew up"), True],
    ) as reload_entry:
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1"],
                "controlled_entity_ids": ["light.test1", "light.test2"],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "reload_failed"
    assert dict(entry.data) == original
    assert reload_entry.call_count == 2


async def test_rollback_reload_that_raises_reports_degraded_runtime(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A compensating reload that raises reports the degraded-runtime code, so
    the editor can tell the user the previous state was not restored."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    original = dict(entry.data)
    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries,
        "async_reload",
        side_effect=[False, RuntimeError("rollback blew up")],
    ):
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1"],
                "controlled_entity_ids": ["light.test1", "light.test2"],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "rollback_reload_failed"
    # The data rollback still happened; only the runtime could not be restored.
    assert dict(entry.data) == original


async def test_validation_rejects_more_lights_than_the_maximum(
    hass: HomeAssistant,
) -> None:
    """The group size cap is enforced before any registry lookup."""
    submitted = [f"light.bulb_{index}" for index in range(MAX_CONTROLLED_LIGHTS + 1)]

    with pytest.raises(MembershipError) as err:
        validate_membership_selection(hass, "light.membership", {}, submitted)

    assert err.value.code == "too_many"
    assert str(MAX_CONTROLLED_LIGHTS) in err.value.message


async def test_validation_accepts_exactly_the_maximum(hass: HomeAssistant) -> None:
    """The cap is inclusive: exactly MAX_CONTROLLED_LIGHTS is not 'too many'."""
    submitted = [f"light.bulb_{index}" for index in range(MAX_CONTROLLED_LIGHTS)]
    for entity_id in submitted:
        _register_fixture_light(hass, entity_id)

    validate_membership_selection(hass, "light.membership", {}, submitted)


async def test_validation_rejects_a_duplicated_light(hass: HomeAssistant) -> None:
    """The same light submitted twice is rejected rather than silently deduped."""
    with pytest.raises(MembershipError) as err:
        validate_membership_selection(
            hass,
            "light.membership",
            {},
            ["light.test1", "light.test2", "light.test1"],
        )

    assert err.value.code == "duplicate"


async def test_batch_update_rejects_a_duplicate_without_reload(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Duplicate rejection happens before the entry is written or reloaded."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    original = dict(entry.data)
    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries, "async_reload", new_callable=AsyncMock
    ) as reload_entry:
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/set_controlled_lights",
                "entity_id": "light.membership",
                "observed_controlled_entity_ids": ["light.test1"],
                "controlled_entity_ids": ["light.test1", "light.test1"],
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "duplicate"
    reload_entry.assert_not_awaited()
    assert dict(entry.data) == original


async def test_transaction_reports_not_found_when_the_entry_is_removed_while_queued(
    hass: HomeAssistant,
) -> None:
    """A caller waiting on the membership lock re-resolves the entry, and fails
    cleanly when a prior transaction removed it."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    lock = _membership_lock(hass, entry.entry_id)

    async with lock:
        queued = hass.async_create_task(
            async_set_controlled_lights(
                hass,
                entry,
                "light.membership",
                ["light.test1", "light.test2"],
                None,
            )
        )
        # Let the transaction reach the lock, then remove the entry underneath it.
        await asyncio.sleep(0)
        await hass.config_entries.async_remove(entry.entry_id)

    with pytest.raises(MembershipError) as err:
        await queued
    assert err.value.code == "not_found"


async def test_transaction_reports_not_found_when_the_entry_vanishes_after_reload(
    hass: HomeAssistant,
) -> None:
    """The post-reload re-resolution guards against an entry removed mid-flight."""
    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )
    real_get_entry = hass.config_entries.async_get_entry
    reloaded = False

    async def reload(entry_id: str) -> bool:
        nonlocal reloaded
        reloaded = True
        return True

    def get_entry(entry_id: str):
        # Only the post-reload confirmation lookup is starved, so the reload
        # itself (which resolves the entry internally) still behaves normally.
        if reloaded and entry_id == entry.entry_id:
            return None
        return real_get_entry(entry_id)

    with (
        patch.object(hass.config_entries, "async_reload", side_effect=reload),
        patch.object(hass.config_entries, "async_get_entry", side_effect=get_entry),
        pytest.raises(MembershipError) as err,
    ):
        await async_set_controlled_lights(
            hass,
            entry,
            "light.membership",
            ["light.test1", "light.test2"],
            None,
        )

    assert err.value.code == "not_found"
    assert "after reload" in err.value.message
