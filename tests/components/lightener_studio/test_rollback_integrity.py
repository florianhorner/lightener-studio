"""Regression coverage for entry lifetime and one-time metadata during rollback."""

import asyncio
from copy import deepcopy
from time import time
from unittest.mock import MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lightener_studio.const import DOMAIN
from custom_components.lightener_studio.handoff import (
    ENTRY_HANDOFF_KEY,
    HandoffError,
    _lock,
    async_migrate_entry_handoff,
    async_resolve_handoff,
)
from custom_components.lightener_studio.membership import (
    MembershipError,
    async_set_controlled_lights,
)
from custom_components.lightener_studio.websocket import (
    _async_apply_config_entry_update,
)


def make_entry(hass, metadata=None):
    data = {"entities": {"light.original": {"brightness": {"100": "100"}}}}
    if metadata is not None:
        data[ENTRY_HANDOFF_KEY] = metadata
    entry = MockConfigEntry(domain=DOMAIN, data=data)
    entry.add_to_hass(hass)
    hass.states.async_set("light.added", "off")
    return entry


async def mutate(hass, entry, route):
    if route == "membership":
        try:
            await async_set_controlled_lights(
                hass,
                entry,
                "light.group",
                ["light.original", "light.added"],
                ["light.original"],
            )
        except MembershipError as err:
            return err.code
        return "saved"
    data = deepcopy(dict(entry.data))
    data["entities"]["light.original"]["brightness"] = {"100": "50"}
    return await _async_apply_config_entry_update(
        hass, entry, data, lambda: hass.config_entries.async_reload(entry.entry_id)
    )


@pytest.mark.parametrize("route", ["membership", "curves"])
@pytest.mark.parametrize("replacement", [False, True])
@pytest.mark.parametrize("applied", [False, True, "exception"])
async def test_rollback_never_uses_stale_entry(hass, route, replacement, applied):
    """A disappeared entry must neither be restored nor reported as saved."""
    entry = make_entry(hass)
    original_get = hass.config_entries.async_get_entry
    gone = False
    successor = (
        MagicMock(entry_id=entry.entry_id, data={"entities": {}})
        if replacement
        else None
    )

    def get_entry(entry_id):
        return (
            successor if gone and entry_id == entry.entry_id else original_get(entry_id)
        )

    async def reload(entry_id):
        nonlocal gone
        gone = True
        if applied == "exception":
            raise RuntimeError("entry removed during first reload")
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
        assert await mutate(hass, entry, route) == "not_found"
        assert updates.call_count == 1
        assert reload_mock.call_count == 1


@pytest.mark.parametrize("route", ["membership", "curves"])
@pytest.mark.parametrize("consumed", [False, True])
async def test_rollback_preserves_handoff_migration(hass, route, consumed):
    """Failed writes must not recreate metadata removed by setup or consumption."""
    token = "rollback-test-token"
    entry = make_entry(
        hass, {"token": token, "issued_at": time(), "creator_user_id": None}
    )
    original_entities = deepcopy(entry.data["entities"])
    calls = 0

    async def reload(entry_id):
        nonlocal calls
        calls += 1
        await async_migrate_entry_handoff(hass, entry)
        if calls == 1:
            if consumed:
                await async_resolve_handoff(hass, token, None)
            return False
        return True

    with patch.object(hass.config_entries, "async_reload", side_effect=reload):
        assert await mutate(hass, entry, route) == "reload_failed"
    assert entry.data["entities"] == original_entities
    assert ENTRY_HANDOFF_KEY not in entry.data
    if not consumed:
        assert (await async_resolve_handoff(hass, token, None))[
            "config_entry_id"
        ] == entry.entry_id
    with pytest.raises(HandoffError, match="not valid"):
        await async_resolve_handoff(hass, token, None)


@pytest.mark.parametrize("route", ["membership", "curves"])
@pytest.mark.parametrize("replacement", [False, True])
@pytest.mark.parametrize("compensation", [True, False, "exception"])
async def test_rollback_checks_lifetime_during_compensation(
    hass, route, replacement, compensation
):
    """The second reload can also lose its entry, including on exception."""
    entry = make_entry(hass)
    original_get = hass.config_entries.async_get_entry
    successor = (
        MagicMock(entry_id=entry.entry_id, data={"entities": {}})
        if replacement
        else None
    )
    gone = False
    calls = 0

    def get_entry(entry_id):
        return (
            successor if gone and entry_id == entry.entry_id else original_get(entry_id)
        )

    async def reload(entry_id):
        nonlocal calls, gone
        calls += 1
        if calls == 1:
            return False
        gone = True
        if compensation == "exception":
            raise RuntimeError("entry removed during compensation")
        return compensation

    with (
        patch.object(hass.config_entries, "async_get_entry", side_effect=get_entry),
        patch.object(hass.config_entries, "async_reload", side_effect=reload),
        patch.object(
            hass.config_entries,
            "async_update_entry",
            wraps=hass.config_entries.async_update_entry,
        ) as updates,
    ):
        assert await mutate(hass, entry, route) == "not_found"
        assert updates.call_count == 2
        assert calls == 2


@pytest.mark.parametrize("route", ["membership", "curves"])
async def test_rollback_retains_pending_handoff(hass, route):
    """Metadata that setup has not migrated remains available exactly once."""
    token = "pending-rollback-token"
    metadata = {"token": token, "issued_at": time(), "creator_user_id": None}
    entry = make_entry(hass, metadata)
    original_entities = deepcopy(entry.data["entities"])
    with patch.object(hass.config_entries, "async_reload", side_effect=[False, True]):
        assert await mutate(hass, entry, route) == "reload_failed"
    assert entry.data["entities"] == original_entities
    assert entry.data[ENTRY_HANDOFF_KEY] == metadata
    assert (await async_resolve_handoff(hass, token, None))[
        "config_entry_id"
    ] == entry.entry_id
    with pytest.raises(HandoffError, match="not valid"):
        await async_resolve_handoff(hass, token, None)


async def test_migrate_does_not_reissue_token_consumed_while_waiting(hass):
    """A migrate queued behind a resolve must not revive the consumed token."""
    token = "queued-migrate-token"
    metadata = {"token": token, "issued_at": time(), "creator_user_id": None}
    entry = make_entry(hass, metadata)
    async with _lock(hass):
        migrate = asyncio.create_task(async_migrate_entry_handoff(hass, entry))
        await asyncio.sleep(0)
        assert not migrate.done()
        # What a resolve holding the lock does: consume the entry metadata.
        consumed = dict(entry.data)
        consumed.pop(ENTRY_HANDOFF_KEY)
        hass.config_entries.async_update_entry(entry, data=consumed)
    await migrate
    with pytest.raises(HandoffError, match="not valid"):
        await async_resolve_handoff(hass, token, None)
