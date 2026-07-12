"""Tests for exact one-time Studio handoffs."""

from time import time
from uuid import uuid4

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lightener_studio.config_flow import LightenerConfigFlow
from custom_components.lightener_studio.const import DOMAIN
from custom_components.lightener_studio.handoff import (
    ENTRY_HANDOFF_KEY,
    HandoffError,
    _store,
    async_resolve_handoff,
)


def _entry(token: str, creator: str | None = None, issued_at: float | None = None):
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
                "issued_at": issued_at if issued_at is not None else time(),
            },
        },
    )


async def test_entry_setup_migrates_and_exactly_resolves_handoff(
    hass: HomeAssistant,
) -> None:
    """Setup strips entry metadata only after the ledger can resolve it."""
    entry = _entry("exact-token", creator="admin-1")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert ENTRY_HANDOFF_KEY not in entry.data
    result = await async_resolve_handoff(hass, "exact-token", "admin-1")
    assert result == {
        "config_entry_id": entry.entry_id,
        "first_run_eligible": True,
    }

    with pytest.raises(HandoffError, match="not valid") as consumed:
        await async_resolve_handoff(hass, "exact-token", "admin-1")
    assert consumed.value.code == "invalid_handoff"


async def test_handoff_is_creator_scoped_and_not_consumed_on_forbidden(
    hass: HomeAssistant,
) -> None:
    """A different admin cannot steal a token from its creating admin."""
    entry = _entry("creator-token", creator="admin-1")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)

    with pytest.raises(HandoffError) as forbidden:
        await async_resolve_handoff(hass, "creator-token", "admin-2")
    assert forbidden.value.code == "forbidden_handoff"

    result = await async_resolve_handoff(hass, "creator-token", "admin-1")
    assert result["config_entry_id"] == entry.entry_id


async def test_first_run_eligibility_uses_current_entry_count(
    hass: HomeAssistant,
) -> None:
    """A handoff is coached only when its group is the sole current entry."""
    first = _entry("old-token")
    first.add_to_hass(hass)
    assert await hass.config_entries.async_setup(first.entry_id)

    second = _entry("second-token")
    second.add_to_hass(hass)
    assert await hass.config_entries.async_setup(second.entry_id)

    result = await async_resolve_handoff(hass, "second-token", None)
    assert result["config_entry_id"] == second.entry_id
    assert result["first_run_eligible"] is False


async def test_expired_handoff_is_rejected(hass: HomeAssistant) -> None:
    """Unmigrated expired tokens are terminal and removed from entry data."""
    entry = _entry("expired-token", issued_at=time() - 25 * 60 * 60)
    entry.add_to_hass(hass)

    with pytest.raises(HandoffError) as expired:
        await async_resolve_handoff(hass, "expired-token", None)
    assert expired.value.code == "expired_handoff"
    assert ENTRY_HANDOFF_KEY not in entry.data


async def test_entry_setup_prunes_expired_handoff_metadata(
    hass: HomeAssistant,
) -> None:
    """Setup does not leave abandoned expired tokens in the private ledger."""
    entry = _entry("abandoned-token", issued_at=time() - 25 * 60 * 60)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)

    assert ENTRY_HANDOFF_KEY not in entry.data
    with pytest.raises(HandoffError) as invalid:
        await async_resolve_handoff(hass, "abandoned-token", None)
    assert invalid.value.code == "invalid_handoff"


async def test_entry_setup_prunes_stale_private_ledger_records(
    hass: HomeAssistant,
) -> None:
    """Any entry setup removes old records abandoned by earlier flows."""
    await _store(hass).async_save(
        {
            "stale-ledger-token": {
                "config_entry_id": "removed-entry",
                "creator_user_id": None,
                "issued_at": time() - 25 * 60 * 60,
            }
        }
    )
    entry = _entry("fresh-token")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)

    ledger = await _store(hass).async_load()
    assert "stale-ledger-token" not in ledger
    assert "fresh-token" in ledger
