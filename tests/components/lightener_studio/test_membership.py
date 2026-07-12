"""Tests for transactional controlled-light membership."""

import asyncio
from copy import deepcopy
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lightener_studio.config_flow import LightenerConfigFlow
from custom_components.lightener_studio.const import DOMAIN
from custom_components.lightener_studio.membership import (
    MembershipUpdate,
    _membership_lock,
)


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

    with patch.object(
        hass.config_entries,
        "async_reload",
        new_callable=AsyncMock,
        return_value=True,
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
            for _ in range(200):
                if lock._waiters:
                    break
                await asyncio.sleep(0)
            else:  # pragma: no cover - defensive
                pytest.fail("add_light never queued on the membership lock")

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
