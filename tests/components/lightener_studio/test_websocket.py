"""Tests for WebSocket API."""

import asyncio
from copy import deepcopy
from time import time
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.helpers.area_registry import async_get as async_get_areas
from homeassistant.helpers.device_registry import async_get as async_get_devices
from homeassistant.helpers.entity_registry import async_get as async_get_entities
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lightener_studio.config_flow import LightenerConfigFlow
from custom_components.lightener_studio.const import DOMAIN
from custom_components.lightener_studio.editor_revision import editor_revision
from custom_components.lightener_studio.handoff import ENTRY_HANDOFF_KEY, _store
from custom_components.lightener_studio.websocket import (
    _async_apply_config_entry_update,
    _async_restore_config_entry_data,
    _connection_can_read_entity,
    _set_entity_list_cache,
)


def _saved_revision(hass):
    """Current saved group token for pre-existing single-group protocol tests."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        return "v1:" + "0" * 64
    entry = entries[0]
    return editor_revision(entry.entry_id, entry.data.get("entities", {}))


async def _setup_lightener(hass: HomeAssistant, entities: dict | None = None):
    """Create a config entry and set up the integration. Return the config entry."""
    config_entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=str(uuid4()),
        data={
            "friendly_name": "Test",
            "entities": entities
            or {
                "light.test1": {
                    "brightness": {"60": "100", "10": "50"},
                },
            },
        },
    )
    config_entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    return config_entry


def _handoff_entry(token: str, *, creator: str | None) -> MockConfigEntry:
    """A legacy Lightener entry carrying a pending handoff token."""
    return MockConfigEntry(
        domain=DOMAIN,
        version=LightenerConfigFlow.VERSION,
        unique_id=str(uuid4()),
        data={
            "friendly_name": "Handoff",
            "entities": {"light.test1": {"brightness": {"100": "100"}}},
            ENTRY_HANDOFF_KEY: {
                "token": token,
                "creator_user_id": creator,
                "issued_at": time(),
            },
        },
    )


async def _assert_recovered_group_saves_and_reloads(
    hass: HomeAssistant, ws, config_entry
) -> None:
    """Finish recovery through the editor API and verify durable curve data."""
    entries_before = {
        entry.entry_id for entry in hass.config_entries.async_entries(DOMAIN)
    }
    await ws.send_json({"id": 10, "type": "lightener/list_entities"})
    listed = await ws.receive_json()
    assert listed["success"] is True
    matches = [
        item
        for item in listed["result"]["entities"]
        if item["config_entry_id"] == config_entry.entry_id
    ]
    assert len(matches) == 1
    entity_id = matches[0]["entity_id"]

    await ws.send_json(
        {"id": 11, "type": "lightener/get_curves", "entity_id": entity_id}
    )
    loaded = await ws.receive_json()
    assert loaded["success"] is True
    assert list(loaded["result"]["entities"]) == ["light.test1"]

    # The first useful example: cap the overpowering lamp with the Dim shape.
    curves = {
        "light.test1": {"brightness": {"1": "1", "25": "8", "50": "20", "100": "45"}}
    }
    await ws.send_json(
        {
            "id": 12,
            "type": "lightener/save_curves",
            "expected_revision": loaded["result"]["revision"],
            "entity_id": entity_id,
            "curves": curves,
        }
    )
    saved = await ws.receive_json()
    assert saved["success"] is True
    assert config_entry.data["entities"] == curves

    assert await hass.config_entries.async_reload(config_entry.entry_id)
    await hass.async_block_till_done()
    await ws.send_json(
        {"id": 13, "type": "lightener/get_curves", "entity_id": entity_id}
    )
    reloaded = await ws.receive_json()
    assert reloaded["success"] is True
    assert reloaded["result"]["entities"] == curves
    assert {
        entry.entry_id for entry in hass.config_entries.async_entries(DOMAIN)
    } == entries_before


@pytest.mark.parametrize("recovery", ["delayed_setup", "expired_handoff"])
async def test_handoff_recovery_reaches_a_saved_curve(
    hass: HomeAssistant, hass_ws_client, recovery: str
) -> None:
    """A delayed or expired legacy handoff reaches its group and a saved shape."""
    token = "recoverable-token"
    config_entry = _handoff_entry(token, creator=None)
    config_entry.add_to_hass(hass)
    ws = await hass_ws_client(hass)

    if recovery == "delayed_setup":
        await ws.send_json(
            {"id": 1, "type": "lightener/resolve_handoff", "token": token}
        )
        pending = await ws.receive_json()
        assert pending["success"] is False
        assert pending["error"]["code"] == "unknown_command"

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    if recovery == "expired_handoff":
        with patch(
            "custom_components.lightener_studio.handoff.time",
            return_value=time() + 25 * 60 * 60,
        ):
            await ws.send_json(
                {"id": 2, "type": "lightener/resolve_handoff", "token": token}
            )
            expired = await ws.receive_json()
        assert expired["success"] is False
        assert expired["error"]["code"] == "expired_handoff"
        assert token not in (await _store(hass).async_load() or {})
    else:
        await ws.send_json(
            {"id": 2, "type": "lightener/resolve_handoff", "token": token}
        )
        resolved = await ws.receive_json()
        assert resolved["success"] is True
        assert resolved["result"]["config_entry_id"] == config_entry.entry_id

    assert len(hass.config_entries.async_entries(DOMAIN)) == 1
    await _assert_recovered_group_saves_and_reloads(hass, ws, config_entry)


async def test_native_setup_editor_link_reaches_a_saved_curve(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """The device link targets the new group even when another group exists."""
    existing_entry = await _setup_lightener(hass, {"light.test2": {}})
    existing_entities = deepcopy(existing_entry.data["entities"])
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "New group"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"controlled_entities": ["light.test1"]}
    )
    assert result["type"] == "create_entry"
    assert not result.get("description_placeholders")
    config_entry = result["result"]
    assert ENTRY_HANDOFF_KEY not in config_entry.data
    await hass.async_block_till_done()

    device = async_get_devices(hass).async_get_device(
        identifiers={(DOMAIN, config_entry.entry_id)}
    )
    assert device is not None
    assert device.configuration_url == (
        f"homeassistant://lightener-editor?config_entry={config_entry.entry_id}"
    )
    ws = await hass_ws_client(hass)
    await _assert_recovered_group_saves_and_reloads(hass, ws, config_entry)
    assert existing_entry.data["entities"] == existing_entities


async def test_empty_area_recovery_reaches_a_saved_curve(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Correcting an empty area continues setup without creating a second group."""

    def included_lights(form):
        return next(
            selector.config["include_entities"]
            for key, selector in form["data_schema"].schema.items()
            if key == "controlled_entities"
        )

    area = async_get_areas(hass).async_create("First room")
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        user_input={"name": "First room", "area_settings": {"area_id": area.id}},
    )
    assert included_lights(result) == []
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"controlled_entities": []}
    )
    assert result["errors"]["controlled_entities"] == "controlled_entities_empty"
    assert hass.config_entries.async_entries(DOMAIN) == []

    async_get_entities(hass).async_update_entity("light.test1", area_id=area.id)
    result = await hass.config_entries.flow.async_configure(result["flow_id"])
    assert included_lights(result) == ["light.test1"]
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"controlled_entities": ["light.test1"]}
    )
    assert result["type"] == "create_entry"
    assert result["title"] == "First room"
    assert result["description"] == "open_editor"
    config_entry = result["result"]
    await hass.async_block_till_done()
    assert ENTRY_HANDOFF_KEY not in config_entry.data
    device = async_get_devices(hass).async_get_device(
        identifiers={(DOMAIN, config_entry.entry_id)}
    )
    assert device is not None
    assert device.configuration_url == (
        f"homeassistant://lightener-editor?config_entry={config_entry.entry_id}"
    )
    ws = await hass_ws_client(hass)
    assert len(hass.config_entries.async_entries(DOMAIN)) == 1

    await _assert_recovered_group_saves_and_reloads(hass, ws, config_entry)


async def test_get_curves_returns_entities(hass: HomeAssistant, hass_ws_client) -> None:
    """Test ws_get_curves returns the entities dict from the config entry."""
    entities = {
        "light.test1": {
            "brightness": {"60": "100", "10": "50"},
        },
    }
    await _setup_lightener(hass, entities)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/get_curves",
            "entity_id": "light.test",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True
    assert result["result"]["entities"] == entities


async def test_list_entities_returns_lightener_entities(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_list_entities returns only Lightener entities."""
    config_entry = await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 100,
            "type": "lightener/list_entities",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True
    assert isinstance(result["result"]["entities"], list)
    assert any(
        item["entity_id"] == "light.test"
        and item["config_entry_id"] == config_entry.entry_id
        for item in result["result"]["entities"]
    )


async def test_get_curves_invalid_entity(hass: HomeAssistant, hass_ws_client) -> None:
    """Test ws_get_curves returns an error for a non-Lightener entity."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/get_curves",
            "entity_id": "light.test1",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_save_curves_updates_config(hass: HomeAssistant, hass_ws_client) -> None:
    """Test ws_save_curves updates the config entry data."""
    config_entry = await _setup_lightener(
        hass,
        {
            "light.test1": {
                "brightness": {"60": "100", "10": "50"},
            },
        },
    )

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {
                "light.test1": {
                    "brightness": {"20": "80", "50": "90"},
                },
            },
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True

    # Verify the config entry was updated
    updated_entry = hass.config_entries.async_get_entry(config_entry.entry_id)
    assert updated_entry.data["entities"]["light.test1"]["brightness"] == {
        "20": "80",
        "50": "90",
    }


async def test_save_curves_refreshes_live_entity_state(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Saving curves should immediately refresh the live Lightener state."""
    config_entry = await _setup_lightener(
        hass,
        {
            "light.test1": {
                "brightness": {"50": "0"},
            },
        },
    )
    lightener = hass.data[DOMAIN][config_entry.entry_id]

    hass.states.async_set(
        "light.test1",
        "on",
        attributes={"brightness": 1},
    )
    lightener.async_update_group_state()
    lightener.async_write_ha_state()
    brightness_before = hass.states.get("light.test").attributes["brightness"]

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 10,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {
                "light.test1": {
                    "brightness": {"1": "1", "100": "100"},
                },
            },
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True

    brightness_after_save = hass.states.get("light.test").attributes["brightness"]
    lightener.async_update_group_state()
    lightener.async_write_ha_state()
    brightness_after_manual_refresh = hass.states.get("light.test").attributes[
        "brightness"
    ]

    assert brightness_before != brightness_after_manual_refresh
    assert brightness_after_save == brightness_after_manual_refresh


async def test_save_curves_rolls_back_on_reload_failure(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A failed save reload must not leave the config entry mutated."""
    original_entities = {
        "light.test1": {
            "brightness": {"60": "100", "10": "50"},
        },
    }
    config_entry = await _setup_lightener(hass, original_entities)
    hass.data.get(DOMAIN, {}).pop(config_entry.entry_id, None)

    ws = await hass_ws_client(hass)
    with patch.object(hass.config_entries, "async_reload", return_value=False):
        await ws.send_json(
            {
                "id": 11,
                "type": "lightener/save_curves",
                "expected_revision": _saved_revision(hass),
                "entity_id": "light.test",
                "curves": {
                    "light.test1": {
                        "brightness": {"20": "80", "50": "90"},
                    },
                },
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "rollback_reload_failed"

    updated_entry = hass.config_entries.async_get_entry(config_entry.entry_id)
    assert dict(updated_entry.data["entities"]) == original_entities


async def test_save_curves_validates_range(hass: HomeAssistant, hass_ws_client) -> None:
    """Test ws_save_curves rejects out-of-range brightness values."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)

    # Key out of range (below minimum of 0)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {
                "light.test1": {
                    "brightness": {"-1": "50"},
                },
            },
        }
    )
    result = await ws.receive_json()
    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"

    # Value out of range (101 is above maximum of 100)
    await ws.send_json(
        {
            "id": 2,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {
                "light.test1": {
                    "brightness": {"50": "101"},
                },
            },
        }
    )
    result = await ws.receive_json()
    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"


async def test_save_curves_rejects_unknown_entities(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_save_curves rejects entity IDs not in the config entry."""
    await _setup_lightener(
        hass,
        {
            "light.test1": {
                "brightness": {"60": "100"},
            },
        },
    )

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {
                "light.unknown_entity": {
                    "brightness": {"50": "80"},
                },
            },
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "unknown_entities"


async def test_save_curves_rejects_non_dict_entity_payload(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_save_curves rejects non-dict entity payloads."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {
                "light.test1": "not_a_dict",
            },
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"


async def test_save_curves_rejects_non_dict_brightness(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_save_curves rejects non-dict brightness payloads."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {
                "light.test1": {
                    "brightness": "not_a_dict",
                },
            },
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"


async def test_save_curves_rejects_non_numeric_values(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_save_curves rejects non-numeric brightness keys/values."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {
                "light.test1": {
                    "brightness": {"abc": "50"},
                },
            },
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"


@pytest.mark.parametrize(
    "curves",
    [
        {"light.test1": {"brightness": {"50": 50.5}}},
        {"light.test1": {"brightness": {"50": True}}},
        {"light.test1": {"brightness": {"50": False}}},
        {"light.test1": {}},
    ],
)
async def test_save_curves_rejects_non_integer_or_missing_brightness(
    hass: HomeAssistant, hass_ws_client, curves: dict
) -> None:
    """Test ws_save_curves rejects ambiguous values that int() would truncate."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 2,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": curves,
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"


async def test_save_curves_preserves_origin_dim_floor(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_save_curves accepts and normalizes an explicit 0% origin target."""
    config_entry = await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 3,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {
                "light.test1": {
                    "brightness": {"0": "12", "100": "85"},
                },
            },
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True
    updated_entry = hass.config_entries.async_get_entry(config_entry.entry_id)
    assert updated_entry.data["entities"]["light.test1"]["brightness"] == {
        "0": "12",
        "100": "85",
    }


async def test_save_curves_requires_admin(
    hass: HomeAssistant, hass_ws_client, hass_admin_user
) -> None:
    """Test ws_save_curves rejects non-admin connections."""
    await _setup_lightener(hass)

    # Remove admin privileges from the test user
    hass_admin_user.groups = []

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {
                "light.test1": {
                    "brightness": {"50": "80"},
                },
            },
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "unauthorized"


async def test_add_light_appends_entity(hass: HomeAssistant, hass_ws_client) -> None:
    """Test ws_add_light adds a new controlled light with a default linear curve."""
    config_entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.test2",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True
    assert "light.test2" in result["result"]["entities"]

    updated_entry = hass.config_entries.async_get_entry(config_entry.entry_id)
    assert "light.test2" in updated_entry.data["entities"]
    # Default Equal includes an editable midpoint and retains the low-end anchor.
    assert updated_entry.data["entities"]["light.test2"]["brightness"] == {
        "1": "1",
        "50": "50",
        "100": "100",
    }
    # Existing light is preserved
    assert updated_entry.data["entities"]["light.test1"]["brightness"] == {"100": "100"}


@pytest.mark.parametrize(
    ("preset", "expected"),
    [
        ("linear", {"1": "1", "50": "50", "100": "100"}),
        ("night_mode", {"1": "1", "20": "3", "50": "10", "100": "25"}),
        (
            "early_starter",
            {"1": "3", "15": "36", "25": "55", "50": "85", "65": "93", "100": "100"},
        ),
    ],
)
async def test_add_light_with_preset(
    hass: HomeAssistant, hass_ws_client, preset: str, expected: dict[str, str]
) -> None:
    """Starting shapes and legacy Night leave existing saved curves untouched."""
    existing = {"1": "1", "45": "1", "70": "45", "100": "100"}
    entry = await _setup_lightener(
        hass, {"light.test1": {"brightness": dict(existing)}}
    )

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.test2",
            "preset": preset,
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True
    assert result["result"]["entities"]["light.test2"]["brightness"] == expected
    assert entry.data["entities"]["light.test1"]["brightness"] == existing


async def test_add_light_empty_preset_uses_default(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """An empty preset string falls back to the default linear curve."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.test2",
            "preset": "",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True
    assert result["result"]["entities"]["light.test2"]["brightness"] == {
        "1": "1",
        "50": "50",
        "100": "100",
    }


async def test_add_light_rejects_duplicate(hass: HomeAssistant, hass_ws_client) -> None:
    """Test ws_add_light rejects a light that is already controlled."""
    await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.test1",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "already_exists"


async def test_add_light_rejects_self_reference(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_add_light rejects adding the lightener to itself."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.test",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"


async def test_add_light_rejects_non_light_entity(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_add_light rejects non-light entity ids."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.test",
            "controlled_entity_id": "switch.something",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"


async def test_add_light_rejects_unknown_light_entity(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_add_light rejects light ids that do not exist."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 12,
            "type": "lightener/add_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.not_real",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_add_light_rejects_unknown_preset(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_add_light rejects unknown preset names."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.new_light",
            "preset": "not_a_real_preset",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"


async def test_add_light_rejects_nested_lightener(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_add_light rejects another Lightener as a controlled light."""
    config_entry_a = MockConfigEntry(
        domain=DOMAIN,
        unique_id=str(uuid4()),
        data={
            "friendly_name": "Group A",
            "entities": {"light.bulb1": {"brightness": {"100": "100"}}},
        },
    )
    config_entry_a.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry_a.entry_id)

    config_entry_b = MockConfigEntry(
        domain=DOMAIN,
        unique_id=str(uuid4()),
        data={
            "friendly_name": "Group B",
            "entities": {"light.bulb2": {"brightness": {"100": "100"}}},
        },
    )
    config_entry_b.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry_b.entry_id)
    await hass.async_block_till_done()

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.group_a",
            "controlled_entity_id": "light.group_b",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "invalid_format"


async def test_add_light_rejects_non_lightener_entity(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_add_light refuses when the target entity is not a Lightener entity."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.not_a_lightener",
            "controlled_entity_id": "light.new_light",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_add_light_requires_admin(
    hass: HomeAssistant, hass_ws_client, hass_admin_user
) -> None:
    """Test ws_add_light rejects non-admin connections."""
    await _setup_lightener(hass)
    hass_admin_user.groups = []

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.new_light",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "unauthorized"


async def test_add_light_reports_reload_failure(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_add_light surfaces reload_failed when async_reload returns False.

    The config entry data has already been updated by the time reload runs;
    if reload fails (unload or setup returns False) the handler must not
    silently report success.
    """
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    with patch.object(hass.config_entries, "async_reload", return_value=False):
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/add_light",
                "entity_id": "light.test",
                "controlled_entity_id": "light.test2",
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "reload_failed"


async def test_add_light_missing_config_entry(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_add_light returns not_found when the config entry no longer exists."""
    config_entry = await _setup_lightener(hass)

    hass.config_entries._entries.pop(config_entry.entry_id)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/add_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.test2",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_remove_light_drops_entity(hass: HomeAssistant, hass_ws_client) -> None:
    """Test ws_remove_light removes a controlled light."""
    config_entry = await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            "light.test2": {"brightness": {"100": "80"}},
        },
    )

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/remove_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.test1",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is True
    assert "light.test1" not in result["result"]["entities"]
    assert "light.test2" in result["result"]["entities"]

    updated_entry = hass.config_entries.async_get_entry(config_entry.entry_id)
    assert "light.test1" not in updated_entry.data["entities"]
    assert "light.test2" in updated_entry.data["entities"]


async def test_light_mutations_roll_back_on_reload_failure(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Remove websocket mutation should roll back if the reload fails."""
    entities = {
        "light.test1": {"brightness": {"100": "100"}},
        "light.test2": {"brightness": {"100": "80"}},
    }
    config_entry = await _setup_lightener(hass, entities)

    ws = await hass_ws_client(hass)
    with patch.object(hass.config_entries, "async_reload", return_value=False):
        await ws.send_json(
            {
                "id": 14,
                "type": "lightener/remove_light",
                "entity_id": "light.test",
                "controlled_entity_id": "light.test1",
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "reload_failed"

    updated_entry = hass.config_entries.async_get_entry(config_entry.entry_id)
    assert dict(updated_entry.data["entities"]) == entities


async def test_remove_light_rejects_last_light(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_remove_light refuses to remove the only remaining controlled light."""
    await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}}},
    )

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/remove_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.test1",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "last_light"


async def test_remove_light_rejects_unknown_entity(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_remove_light rejects entity ids not in the config entry."""
    await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            "light.test2": {"brightness": {"100": "80"}},
        },
    )

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/remove_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.not_here",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_remove_light_rejects_non_lightener_entity(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Test ws_remove_light refuses when the target entity is not a Lightener."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/remove_light",
            "entity_id": "light.not_a_lightener",
            "controlled_entity_id": "light.test1",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_remove_light_requires_admin(
    hass: HomeAssistant, hass_ws_client, hass_admin_user
) -> None:
    """Test ws_remove_light rejects non-admin connections."""
    await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            "light.test2": {"brightness": {"100": "80"}},
        },
    )
    hass_admin_user.groups = []

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/remove_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.test1",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "unauthorized"


async def test_remove_light_reports_reload_failure(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_remove_light surfaces reload_failed when async_reload returns False."""
    await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            "light.test2": {"brightness": {"100": "80"}},
        },
    )

    ws = await hass_ws_client(hass)
    with patch.object(hass.config_entries, "async_reload", return_value=False):
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/remove_light",
                "entity_id": "light.test",
                "controlled_entity_id": "light.test1",
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "reload_failed"


async def test_save_curves_uses_targeted_refresh_not_reload(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_save_curves updates curves in-place without triggering async_reload."""
    await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"60": "100", "10": "50"}}},
    )

    ws = await hass_ws_client(hass)
    with patch.object(
        hass.config_entries, "async_reload", new_callable=AsyncMock
    ) as mock_reload:
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/save_curves",
                "expected_revision": _saved_revision(hass),
                "entity_id": "light.test",
                "curves": {"light.test1": {"brightness": {"20": "80"}}},
            }
        )
        result = await ws.receive_json()

    assert result["success"] is True
    mock_reload.assert_not_called()


# ---------------------------------------------------------------------------
# _connection_can_read_entity — exception fallback branches
# ---------------------------------------------------------------------------


def _make_connection_with_permission_check(check_fn):
    """Build a fake ActiveConnection whose user has a permissions.check_entity."""
    permissions = MagicMock()
    permissions.check_entity = check_fn
    user = MagicMock()
    user.is_admin = False
    user.permissions = permissions
    connection = MagicMock()
    connection.user = user
    return connection


def test_connection_can_read_entity_check_raises_type_error_then_succeeds():
    """TypeError on (entity_id, "read") falls back to ("read", entity_id)."""
    calls = []

    def check(a, b):
        """Record args; raise TypeError on first order, succeed on reversed."""
        calls.append((a, b))
        if (a, b) == ("light.test", "read"):
            raise TypeError("wrong arg order")
        return True  # reversed order succeeds

    connection = _make_connection_with_permission_check(check)
    assert _connection_can_read_entity(connection, "light.test") is True
    assert ("light.test", "read") in calls
    assert ("read", "light.test") in calls


def test_connection_can_read_entity_both_orders_raise():
    """If both argument orders raise, returns False."""

    def check(a, b):
        """Raise on both arg orders to force the False fallback path."""
        if (a, b) == ("light.test", "read"):
            raise TypeError("wrong arg order")
        raise RuntimeError("still broken")

    connection = _make_connection_with_permission_check(check)
    assert _connection_can_read_entity(connection, "light.test") is False


def test_connection_can_read_entity_non_type_error_returns_false():
    """A non-TypeError exception from check_entity returns False directly."""

    def check(a, b):
        """Raise a non-TypeError to exercise the catch-all False return."""
        raise ValueError("unexpected")

    connection = _make_connection_with_permission_check(check)
    assert _connection_can_read_entity(connection, "light.test") is False


# ---------------------------------------------------------------------------
# Entity list cache — cache-hit path
# ---------------------------------------------------------------------------


async def test_list_entities_cache_hit_does_not_rebuild(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """Second call to ws_list_entities within TTL returns cached results."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)

    await ws.send_json({"id": 1, "type": "lightener/list_entities"})
    first = await ws.receive_json()
    assert first["success"] is True

    # Pre-populate the cache with a sentinel so we can confirm the second call
    # uses the cache rather than rebuilding from the registry.
    sentinel = [
        {
            "entity_id": "light.cached_sentinel",
            "name": "Sentinel",
            "config_entry_id": "x",
        }
    ]
    _set_entity_list_cache(hass, sentinel)

    await ws.send_json({"id": 2, "type": "lightener/list_entities"})
    second = await ws.receive_json()
    assert second["success"] is True
    # The cache was returned as-is (filtered to visible entities; admin sees all).
    assert any(
        e["entity_id"] == "light.cached_sentinel" for e in second["result"]["entities"]
    )


# ---------------------------------------------------------------------------
# _async_apply_config_entry_update — rollback paths
# ---------------------------------------------------------------------------


async def test_async_apply_config_entry_update_rolls_back_on_exception(
    hass: HomeAssistant,
) -> None:
    """apply_change raising an exception triggers a rollback to previous data."""
    config_entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=str(uuid4()),
        data={
            "friendly_name": "Test",
            "entities": {"light.test1": {"brightness": {"100": "100"}}},
        },
    )
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    original_data = dict(config_entry.data)
    new_data = {
        "friendly_name": "Test",
        "entities": {"light.test1": {"brightness": {"50": "50"}}},
    }

    async def boom() -> bool:
        """Raise during apply_change to drive the exception-rollback path."""
        raise RuntimeError("apply failed")

    with patch.object(hass.config_entries, "async_reload", return_value=True):
        result = await _async_apply_config_entry_update(
            hass, config_entry, new_data, boom
        )

    assert result == "reload_failed"
    restored = hass.config_entries.async_get_entry(config_entry.entry_id)
    assert dict(restored.data) == original_data


async def test_async_apply_config_entry_update_rolls_back_when_apply_returns_false(
    hass: HomeAssistant,
) -> None:
    """apply_change returning False triggers a rollback to previous data."""
    config_entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=str(uuid4()),
        data={
            "friendly_name": "Test",
            "entities": {"light.test1": {"brightness": {"100": "100"}}},
        },
    )
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    original_data = dict(config_entry.data)
    new_data = {
        "friendly_name": "Test",
        "entities": {"light.test1": {"brightness": {"50": "50"}}},
    }

    async def returns_false() -> bool:
        """Return False from apply_change to drive the False-return rollback."""
        return False

    with patch.object(hass.config_entries, "async_reload", return_value=True):
        result = await _async_apply_config_entry_update(
            hass, config_entry, new_data, returns_false
        )

    assert result == "reload_failed"
    restored = hass.config_entries.async_get_entry(config_entry.entry_id)
    assert dict(restored.data) == original_data


async def test_async_restore_config_entry_data_logs_on_reload_exception(
    hass: HomeAssistant,
) -> None:
    """_async_restore_config_entry_data logs and swallows a reload exception."""
    config_entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=str(uuid4()),
        data={"friendly_name": "Test", "entities": {}},
    )
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    previous_data = {
        "friendly_name": "Test",
        "entities": {"light.test1": {"brightness": {"100": "100"}}},
    }

    with (
        patch.object(
            hass.config_entries,
            "async_reload",
            side_effect=RuntimeError("reload blew up"),
        ),
        patch("custom_components.lightener_studio.websocket._LOGGER") as mock_logger,
    ):
        # Should not raise — exception is caught and logged.
        await _async_restore_config_entry_data(hass, config_entry, previous_data)

    restored = hass.config_entries.async_get_entry(config_entry.entry_id)
    assert dict(restored.data) == previous_data
    # The "logs" half of the contract: assert the exception was actually logged.
    assert mock_logger.exception.called or mock_logger.warning.called


# ---------------------------------------------------------------------------
# ws_get_curves — unauthorized and missing config entry branches
# ---------------------------------------------------------------------------


async def test_get_curves_unauthorized_non_admin(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_get_curves returns unauthorized when _connection_can_read_entity is False."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    with patch(
        "custom_components.lightener_studio.websocket._connection_can_read_entity",
        return_value=False,
    ):
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/get_curves",
                "entity_id": "light.test",
            }
        )
        result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "unauthorized"


async def test_get_curves_missing_config_entry(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_get_curves returns not_found when config entry has been removed."""
    config_entry = await _setup_lightener(hass)

    # Remove the config entry directly from hass without going through
    # the normal unload path so the entity registry entry still points to it.
    hass.config_entries._entries.pop(config_entry.entry_id)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/get_curves",
            "entity_id": "light.test",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


# ---------------------------------------------------------------------------
# _connection_can_read_entity — check_entity is None branch (line 43)
# ---------------------------------------------------------------------------


def test_connection_can_read_entity_returns_true_when_check_entity_is_none():
    """Non-admin user whose permissions object has no check_entity is allowed through."""
    permissions = MagicMock(spec=[])  # no check_entity attribute
    user = MagicMock()
    user.is_admin = False
    user.permissions = permissions
    connection = MagicMock()
    connection.user = user
    assert _connection_can_read_entity(connection, "light.test") is True


# ---------------------------------------------------------------------------
# _parse_curve_percent — unsupported type branch (lines 65, 77)
# ---------------------------------------------------------------------------


def test_parse_curve_percent_accepts_bare_integer():
    """A bare integer is returned as-is without conversion."""
    from custom_components.lightener_studio.websocket import _parse_curve_percent

    assert _parse_curve_percent(42, "level") == 42


def test_parse_curve_percent_rejects_unsupported_type():
    """A list or other non-scalar type raises CurveValidationError."""
    from custom_components.lightener_studio.websocket import (
        CurveValidationError,
        _parse_curve_percent,
    )

    with pytest.raises(CurveValidationError) as exc_info:
        _parse_curve_percent(["not", "a", "number"], "level")
    assert exc_info.value.metric_code == "non_numeric_curve_value"


# ---------------------------------------------------------------------------
# ws_save_curves — non-Lightener entity and missing config entry (lines 406-432)
# ---------------------------------------------------------------------------


async def test_save_curves_rejects_non_lightener_entity(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_save_curves returns not_found for an entity not owned by Lightener."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    # light.test1 is a controlled light, not a Lightener entity itself.
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test1",
            "curves": {"light.test1": {"brightness": {"50": "50"}}},
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_save_curves_missing_config_entry(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_save_curves returns not_found when the config entry no longer exists."""
    config_entry = await _setup_lightener(hass)

    hass.config_entries._entries.pop(config_entry.entry_id)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/save_curves",
            "expected_revision": _saved_revision(hass),
            "entity_id": "light.test",
            "curves": {"light.test1": {"brightness": {"50": "50"}}},
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_remove_light_missing_config_entry(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_remove_light returns not_found when the config entry no longer exists."""
    config_entry = await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            "light.test2": {"brightness": {"100": "80"}},
        },
    )

    hass.config_entries._entries.pop(config_entry.entry_id)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/remove_light",
            "entity_id": "light.test",
            "controlled_entity_id": "light.test1",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_list_candidate_lights_missing_config_entry(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_list_candidate_lights returns not_found when the entry is gone."""
    config_entry = await _setup_lightener(hass)
    hass.config_entries._entries.pop(config_entry.entry_id)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/list_candidate_lights",
            "entity_id": "light.test",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_list_candidate_lights_unknown_entity(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A non-Lightener entity id is rejected rather than listing candidates."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/list_candidate_lights",
            "entity_id": "light.test1",
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_set_controlled_lights_missing_config_entry(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """ws_set_controlled_lights returns not_found when the entry is gone."""
    config_entry = await _setup_lightener(hass)
    hass.config_entries._entries.pop(config_entry.entry_id)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/set_controlled_lights",
            "entity_id": "light.test",
            "observed_controlled_entity_ids": ["light.test1"],
            "controlled_entity_ids": ["light.test1"],
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_set_controlled_lights_unknown_entity(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A non-Lightener entity id cannot have its membership rewritten."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/set_controlled_lights",
            "entity_id": "light.test1",
            "observed_controlled_entity_ids": ["light.test1"],
            "controlled_entity_ids": ["light.test2"],
        }
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "not_found"


async def test_resolve_handoff_consumes_the_token_once(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """The websocket wrapper resolves a handoff and consumes it exactly once."""
    config_entry = _handoff_entry("ws-token", creator=None)
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {"id": 1, "type": "lightener/resolve_handoff", "token": "ws-token"}
    )
    result = await ws.receive_json()

    assert result["success"] is True
    assert result["result"] == {
        "config_entry_id": config_entry.entry_id,
        "first_run_eligible": True,
    }

    # A handoff is one-time: replaying the same token is rejected.
    await ws.send_json(
        {"id": 2, "type": "lightener/resolve_handoff", "token": "ws-token"}
    )
    replay = await ws.receive_json()

    assert replay["success"] is False
    assert replay["error"]["code"] == "invalid_handoff"


async def test_resolve_handoff_forwards_the_error_code_and_message(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """HandoffError is mapped onto the websocket error envelope, not raised."""
    await _setup_lightener(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {"id": 1, "type": "lightener/resolve_handoff", "token": "never-issued"}
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "invalid_handoff"
    assert result["error"]["message"] == "This Studio handoff is not valid"


async def test_resolve_handoff_scopes_the_token_to_the_connection_user(
    hass: HomeAssistant, hass_ws_client, hass_admin_user
) -> None:
    """A creator-locked handoff resolves for the user who created it.

    Asserting the real identity, rather than that *some* string was forwarded,
    is what pins ``user.id``: forwarding any other attribute of the connection
    user makes the creator check fail and this test go red.
    """
    config_entry = _handoff_entry("owner-token", creator=hass_admin_user.id)
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {"id": 1, "type": "lightener/resolve_handoff", "token": "owner-token"}
    )
    result = await ws.receive_json()

    assert result["success"] is True
    assert result["result"]["config_entry_id"] == config_entry.entry_id


async def test_resolve_handoff_refuses_another_users_token(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """A handoff locked to a different creator is not consumable here, and is
    left intact so its rightful owner can still use it."""
    config_entry = _handoff_entry("someone-elses-token", creator="a-different-user")
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {"id": 1, "type": "lightener/resolve_handoff", "token": "someone-elses-token"}
    )
    result = await ws.receive_json()

    assert result["success"] is False
    assert result["error"]["code"] == "forbidden_handoff"

    # Refusal must not consume the token.
    ledger = await _store(hass).async_load() or {}
    assert "someone-elses-token" in ledger


@pytest.mark.parametrize("second_member", ["light.test1", "light.test2"])
async def test_guarded_sessions_cannot_overwrite_each_other(
    hass, hass_ws_client, second_member
):
    """A second editor must keep the complete saved baseline it loaded."""
    entry = await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            "light.test2": {"brightness": {"100": "100"}},
        },
    )
    a, b = await hass_ws_client(hass), await hass_ws_client(hass)
    await a.send_json(
        {"id": 1, "type": "lightener/get_curves", "entity_id": "light.test"}
    )
    baseline = (await a.receive_json())["result"]
    assert "revision" in baseline
    for ws, level in [(a, "70"), (b, "80")]:
        await ws.send_json(
            {
                "id": 2,
                "type": "lightener/save_curves",
                "entity_id": "light.test",
                "expected_revision": baseline["revision"],
                "curves": {
                    ("light.test1" if ws is a else second_member): {
                        "brightness": {"100": level}
                    }
                },
            }
        )
        result = await ws.receive_json()
        if ws is a:
            assert result["success"] is True
        else:
            assert result["error"]["code"] == "conflict"
    assert entry.data["entities"]["light.test1"]["brightness"] == {"100": "70"}


async def test_guarded_patch_preserves_untouched_raw_member(hass, hass_ws_client):
    """Saving one shape never normalizes a different legacy record."""
    legacy = {"brightness": {"12.5": "3.5", "broken": "bad"}, "future": {"a": [1, 2]}}
    entry = await _setup_lightener(
        hass,
        {
            "light.test1": {"brightness": {"100": "100"}},
            "light.test2": {"brightness": {"100": "100"}},
        },
    )
    hass.config_entries.async_update_entry(
        entry,
        data={
            **entry.data,
            "entities": {**entry.data["entities"], "light.test2": legacy},
        },
    )
    hass.data[DOMAIN].pop(entry.entry_id)
    ws = await hass_ws_client(hass)
    await ws.send_json(
        {"id": 1, "type": "lightener/get_curves", "entity_id": "light.test"}
    )
    baseline = (await ws.receive_json())["result"]
    assert baseline.get("capabilities") == {"guarded_curve_save": 1}
    with patch.object(hass.config_entries, "async_reload", return_value=True):
        await ws.send_json(
            {
                "id": 2,
                "type": "lightener/save_curves",
                "entity_id": "light.test",
                "expected_revision": baseline["revision"],
                "curves": {"light.test1": {"brightness": {"100": "45"}}},
            }
        )
        result = await ws.receive_json()
    assert result["success"] is True
    assert entry.data["entities"]["light.test2"] == legacy
    assert result["result"]["entities"]["light.test2"] == legacy


@pytest.mark.parametrize(
    "patch", [{}, {"light.test1": {"brightness": {"60": "100", "10": "50"}}}]
)
async def test_guarded_noop_is_still_revision_checked(hass, hass_ws_client, patch):
    entry = await _setup_lightener(hass)
    ws = await hass_ws_client(hass)
    revision = _saved_revision(hass)
    with patch_module_update(entry, hass) as update:
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/save_curves",
                "entity_id": "light.test",
                "expected_revision": revision,
                "curves": patch,
            }
        )
        receipt = (await ws.receive_json())["result"]
        assert receipt["status"] == "unchanged"
        assert receipt["revision"] == revision
        update.assert_not_called()
    await ws.send_json(
        {
            "id": 2,
            "type": "lightener/save_curves",
            "entity_id": "light.test",
            "expected_revision": "v1:" + "0" * 64,
            "curves": patch,
        }
    )
    assert (await ws.receive_json())["error"]["code"] == "conflict"


def patch_module_update(entry, hass):
    """Observe no-op persistence without bypassing normal saved data."""
    return patch.object(
        hass.config_entries,
        "async_update_entry",
        wraps=hass.config_entries.async_update_entry,
    )


@pytest.mark.parametrize(
    "guard,code",
    [
        (None, "precondition_required"),
        ("bad", "invalid_format"),
        (3, "invalid_format"),
        ({}, "invalid_format"),
    ],
)
async def test_guarded_missing_or_malformed_precondition(
    hass, hass_ws_client, guard, code
):
    entry = await _setup_lightener(hass)
    before = deepcopy(dict(entry.data))
    ws = await hass_ws_client(hass)
    message = {
        "id": 1,
        "type": "lightener/save_curves",
        "entity_id": "light.test",
        "curves": {},
    }
    if guard is not None:
        message["expected_revision"] = guard
    await ws.send_json(message)
    assert (await ws.receive_json())["error"]["code"] == code
    assert dict(entry.data) == before


@pytest.mark.parametrize(
    "applied,compensated,code",
    [
        (False, True, "reload_failed"),
        (False, False, "rollback_reload_failed"),
        (RuntimeError("apply"), RuntimeError("compensate"), "rollback_reload_failed"),
    ],
)
async def test_guarded_apply_compensation_outcomes(
    hass, hass_ws_client, applied, compensated, code
):
    entry = await _setup_lightener(hass)
    before = deepcopy(dict(entry.data))
    hass.data[DOMAIN].pop(entry.entry_id)
    ws = await hass_ws_client(hass)
    with (
        patch.object(
            hass.config_entries, "async_reload", side_effect=[applied, compensated]
        ),
        patch("custom_components.lightener_studio.websocket.metric") as recorded_metric,
    ):
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/save_curves",
                "entity_id": "light.test",
                "expected_revision": _saved_revision(hass),
                "curves": {"light.test1": {"brightness": {"100": "45"}}},
            }
        )
        assert (await ws.receive_json())["error"]["code"] == code
    failures = [
        call
        for call in recorded_metric.call_args_list
        if call.args[1] == "lightener.ws.save_curves.reload_failures_total"
    ]
    assert len(failures) == 1
    assert failures[0].args[2:] == ("counter", 1)
    assert dict(entry.data) == before


@pytest.mark.parametrize("replacement", [False, True])
@pytest.mark.parametrize("applied", [False, True])
async def test_guarded_apply_does_not_certify_or_compensate_stale_entry(
    hass, hass_ws_client, replacement, applied
):
    entry = await _setup_lightener(hass)
    revision = _saved_revision(hass)
    hass.data[DOMAIN].pop(entry.entry_id)
    ws = await hass_ws_client(hass)
    original_get = hass.config_entries.async_get_entry
    gone = False
    replacement_entry = (
        MagicMock(entry_id=entry.entry_id, data={"entities": {}})
        if replacement
        else None
    )

    def get_entry(entry_id):
        return (
            replacement_entry
            if gone and entry_id == entry.entry_id
            else original_get(entry_id)
        )

    async def reload(entry_id):
        nonlocal gone
        gone = True
        return applied

    with (
        patch.object(hass.config_entries, "async_get_entry", side_effect=get_entry),
        patch.object(
            hass.config_entries, "async_reload", side_effect=reload
        ) as reload_mock,
        patch.object(
            hass.config_entries,
            "async_update_entry",
            wraps=hass.config_entries.async_update_entry,
        ) as updates,
    ):
        await ws.send_json(
            {
                "id": 1,
                "type": "lightener/save_curves",
                "entity_id": "light.test",
                "expected_revision": revision,
                "curves": {"light.test1": {"brightness": {"100": "45"}}},
            }
        )
        assert (await ws.receive_json())["error"]["code"] == "not_found"
        assert updates.call_count == 1
        assert reload_mock.call_count == 1


@pytest.mark.parametrize("applied", [True, False])
async def test_guarded_read_waits_for_apply_and_rollback(hass, hass_ws_client, applied):
    entry = await _setup_lightener(hass)
    original = deepcopy(entry.data["entities"])
    hass.data[DOMAIN].pop(entry.entry_id)
    writer, reader = await hass_ws_client(hass), await hass_ws_client(hass)
    started, release = asyncio.Event(), asyncio.Event()
    calls = 0
    from custom_components.lightener_studio.membership import entry_update_lock

    asked = asyncio.Event()

    def instrumented_lock(hass, entry_id):
        asked.set()
        return entry_update_lock(hass, entry_id)

    async def reload(entry_id):
        nonlocal calls
        calls += 1
        if calls == 1:
            started.set()
            await release.wait()
            return applied
        return True

    with patch.object(hass.config_entries, "async_reload", side_effect=reload):
        await writer.send_json(
            {
                "id": 1,
                "type": "lightener/save_curves",
                "entity_id": "light.test",
                "expected_revision": _saved_revision(hass),
                "curves": {"light.test1": {"brightness": {"100": "45"}}},
            }
        )
        await asyncio.wait_for(started.wait(), 2)
        with patch(
            "custom_components.lightener_studio.websocket.entry_update_lock",
            side_effect=instrumented_lock,
        ):
            await reader.send_json(
                {"id": 1, "type": "lightener/get_curves", "entity_id": "light.test"}
            )
            read = asyncio.create_task(reader.receive_json())
            await asyncio.wait_for(asked.wait(), 2)
            assert not read.done()
            release.set()
        result = await asyncio.wait_for(read, 2)
        saved = await writer.receive_json()
    assert saved["success"] is applied
    assert result["result"]["entities"] == (
        entry.data["entities"] if applied else original
    )
    assert result["result"]["revision"] == editor_revision(
        entry.entry_id, result["result"]["entities"]
    )


@pytest.mark.parametrize("partial", [False, True])
async def test_permitted_non_admin_reads_never_expose_group_write_token(hass, partial):
    await _setup_lightener(hass, {"light.test1": {}, "light.test2": {}})
    allowed = (
        {"light.test", "light.test1"}
        if partial
        else {"light.test", "light.test1", "light.test2"}
    )
    from custom_components.lightener_studio.websocket import ws_get_curves

    connection = _make_connection_with_permission_check(
        lambda entity_id, permission: entity_id in allowed
    )
    await ws_get_curves.__wrapped__(
        hass, connection, {"id": 1, "entity_id": "light.test"}
    )
    result = connection.send_result.call_args.args[1]
    assert set(result) == {"entities"}
    assert set(result["entities"]) == allowed - {"light.test"}


async def test_success_receipt_remains_immutable_after_a_later_writer(
    hass, hass_ws_client
):
    entry = await _setup_lightener(hass)
    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": "lightener/save_curves",
            "entity_id": "light.test",
            "expected_revision": _saved_revision(hass),
            "curves": {"light.test1": {"brightness": {"100": "45"}}},
        }
    )
    first = (await ws.receive_json())["result"]
    retained = deepcopy(first)
    await ws.send_json(
        {
            "id": 2,
            "type": "lightener/save_curves",
            "entity_id": "light.test",
            "expected_revision": first["revision"],
            "curves": {"light.test1": {"brightness": {"100": "70"}}},
        }
    )
    second = (await ws.receive_json())["result"]
    assert second["revision"] != first["revision"]
    assert first == retained
    assert first["revision"] == editor_revision(entry.entry_id, first["entities"])


async def test_exact_receipt_is_copied_inside_lock_before_queued_writer(hass):
    """Retain the exact object, yielding on lock exit before first send_result."""
    import inspect

    from custom_components.lightener_studio.membership import entry_update_lock
    from custom_components.lightener_studio.websocket import ws_save_curves

    entry = await _setup_lightener(
        hass,
        {"light.test1": {"brightness": {"100": "100"}, "metadata": {"nested": [1]}}},
    )
    hass.config_entries.async_update_entry(
        entry,
        data={
            **entry.data,
            "entities": {
                "light.test1": {
                    "brightness": {"100": "100"},
                    "metadata": {"nested": [1]},
                }
            },
        },
    )
    first, second = MagicMock(), MagicMock()
    first.user.is_admin = second.user.is_admin = True
    revision = _saved_revision(hass)
    real_lock = entry_update_lock(hass, entry.entry_id)
    yielded = False

    async def later_writer():
        # A subsequent writer may touch nested raw data. A shallow receipt aliases it.
        entry.data["entities"]["light.test1"]["metadata"]["nested"].append(2)
        await inspect.unwrap(ws_save_curves)(
            hass,
            second,
            {
                "id": 2,
                "entity_id": "light.test",
                "expected_revision": _saved_revision(hass),
                "curves": {"light.test1": {"brightness": {"100": "70"}}},
            },
        )

    class YieldOnExit:
        async def __aenter__(self):
            await real_lock.acquire()

        async def __aexit__(self, *args):
            nonlocal yielded
            real_lock.release()
            if not yielded:
                yielded = True
                await later_writer()

    with patch(
        "custom_components.lightener_studio.websocket.entry_update_lock",
        side_effect=lambda *_: YieldOnExit(),
    ):
        await inspect.unwrap(ws_save_curves)(
            hass,
            first,
            {
                "id": 1,
                "entity_id": "light.test",
                "expected_revision": revision,
                "curves": {"light.test1": {"brightness": {"100": "45"}}},
            },
        )
    receipt = first.send_result.call_args.args[1]
    assert receipt["status"] == "saved"
    assert receipt["config_entry_id"] == entry.entry_id
    assert receipt["entities"] == {
        "light.test1": {"brightness": {"100": "45"}, "metadata": {"nested": [1]}}
    }
    assert receipt["revision"] == editor_revision(entry.entry_id, receipt["entities"])
    assert second.send_result.call_args.args[1]["entities"]["light.test1"][
        "brightness"
    ] == {"100": "70"}
