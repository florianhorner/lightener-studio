"""One-time native-config-flow handoff into Lightener Studio."""

from __future__ import annotations

import asyncio
import logging
import secrets
from copy import deepcopy
from time import time
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

ENTRY_HANDOFF_KEY = "_studio_handoff"
HANDOFF_MAX_AGE_SECONDS = 24 * 60 * 60
_STORE_KEY = f"{DOMAIN}.studio_handoffs"
_STORE_VERSION = 1
_LOCK_KEY = f"{DOMAIN}_handoff_lock"
_STORE_INSTANCE_KEY = f"{DOMAIN}_handoff_store"


class HandoffError(ValueError):
    """A stable handoff resolution failure."""

    def __init__(self, code: str, message: str) -> None:
        """Initialize the error."""
        super().__init__(message)
        self.code = code
        self.message = message


def create_handoff_metadata(user_id: str | None) -> dict[str, Any]:
    """Create config-entry metadata for a new one-time handoff."""
    return {
        "token": secrets.token_urlsafe(24),
        "issued_at": time(),
        "creator_user_id": user_id,
    }


def _lock(hass: HomeAssistant) -> asyncio.Lock:
    return hass.data.setdefault(_LOCK_KEY, asyncio.Lock())


def _store(hass: HomeAssistant) -> Store[dict[str, Any]]:
    store = hass.data.get(_STORE_INSTANCE_KEY)
    if store is None:
        store = Store(hass, _STORE_VERSION, _STORE_KEY, private=True)
        hass.data[_STORE_INSTANCE_KEY] = store
    return store


def _entry_record(entry: ConfigEntry, metadata: dict[str, Any]) -> dict[str, Any]:
    return {
        "config_entry_id": entry.entry_id,
        "issued_at": metadata.get("issued_at"),
        "creator_user_id": metadata.get("creator_user_id"),
    }


def _record_is_expired(record: object) -> bool:
    """Return whether a ledger record is malformed or older than its TTL."""
    if not isinstance(record, dict):
        return True
    issued_at = record.get("issued_at")
    return (
        not isinstance(issued_at, int | float)
        or time() - issued_at > HANDOFF_MAX_AGE_SECONDS
    )


async def async_migrate_entry_handoff(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Move temporary entry metadata to the persistent handoff ledger."""
    metadata = entry.data.get(ENTRY_HANDOFF_KEY)

    async with _lock(hass):
        ledger = await _store(hass).async_load() or {}
        original_ledger = deepcopy(ledger)
        ledger = {
            token: deepcopy(record)
            for token, record in ledger.items()
            if not _record_is_expired(record)
        }
        has_metadata = isinstance(metadata, dict) and isinstance(
            metadata.get("token"), str
        )
        if has_metadata and not _record_is_expired(metadata):
            ledger[metadata["token"]] = _entry_record(entry, metadata)
        if ledger == original_ledger and not has_metadata:
            return
        try:
            await _store(hass).async_save(ledger)
        except Exception:
            # Leave the metadata on the entry. The resolver can still consume it
            # and a later setup retry can migrate it again.
            _LOGGER.exception("Failed to persist Lightener Studio handoff ledger")
            return
        if has_metadata:
            new_data = dict(entry.data)
            new_data.pop(ENTRY_HANDOFF_KEY, None)
            hass.config_entries.async_update_entry(entry, data=new_data)


async def async_resolve_handoff(
    hass: HomeAssistant, token: str, requesting_user_id: str | None
) -> dict[str, Any]:
    """Consume a handoff token and return its exact config-entry target."""
    async with _lock(hass):
        ledger = deepcopy(await _store(hass).async_load() or {})
        record = ledger.get(token)
        source_entry: ConfigEntry | None = None

        if not isinstance(record, dict):
            for entry in hass.config_entries.async_entries(DOMAIN):
                metadata = entry.data.get(ENTRY_HANDOFF_KEY)
                if isinstance(metadata, dict) and metadata.get("token") == token:
                    source_entry = entry
                    record = _entry_record(entry, metadata)
                    break

        if not isinstance(record, dict):
            raise HandoffError("invalid_handoff", "This Studio handoff is not valid")

        issued_at = record.get("issued_at")
        if (
            not isinstance(issued_at, int | float)
            or time() - issued_at > HANDOFF_MAX_AGE_SECONDS
        ):
            ledger.pop(token, None)
            await _store(hass).async_save(ledger)
            if source_entry is not None:
                new_data = dict(source_entry.data)
                new_data.pop(ENTRY_HANDOFF_KEY, None)
                hass.config_entries.async_update_entry(source_entry, data=new_data)
            raise HandoffError("expired_handoff", "This Studio handoff has expired")

        creator_user_id = record.get("creator_user_id")
        if creator_user_id is not None and creator_user_id != requesting_user_id:
            raise HandoffError(
                "forbidden_handoff", "This Studio handoff belongs to another user"
            )

        entry_id = record.get("config_entry_id")
        entry = (
            hass.config_entries.async_get_entry(entry_id)
            if isinstance(entry_id, str)
            else None
        )
        if entry is None or entry.domain != DOMAIN:
            ledger.pop(token, None)
            await _store(hass).async_save(ledger)
            raise HandoffError(
                "invalid_handoff", "The new Lightener group no longer exists"
            )

        ledger.pop(token, None)
        await _store(hass).async_save(ledger)
        if ENTRY_HANDOFF_KEY in entry.data:
            new_data = dict(entry.data)
            new_data.pop(ENTRY_HANDOFF_KEY, None)
            hass.config_entries.async_update_entry(entry, data=new_data)

        return {
            "config_entry_id": entry.entry_id,
            "first_run_eligible": len(hass.config_entries.async_entries(DOMAIN)) == 1,
        }
